export const runtime = 'edge';

type Protocol = 'openai' | 'anthropic' | 'gemini';

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUEST_BYTES = 64_000;

function jsonError(message: string, status: number) {
  return Response.json({ error: { message } }, { status });
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
}

function safeUpstream(baseUrl: unknown, apiPath: unknown) {
  if (typeof baseUrl !== 'string' || typeof apiPath !== 'string' || baseUrl.length > 500 || apiPath.length > 500) return null;
  if (!apiPath.startsWith('/') || apiPath.includes('\\')) return null;
  try {
    const base = new URL(baseUrl);
    if (base.protocol !== 'https:' || base.username || base.password || (base.port && !['443', '8443'].includes(base.port))) return null;
    const host = base.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '::' || host === '::1' || host.endsWith('.local') || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.lan')) return null;
    if (host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host) || isPrivateIpv4(host)) return null;
    const upstream = new URL(apiPath.replace(/^\/+/, ''), base.toString().replace(/\/+$/, '') + '/');
    if (upstream.origin !== base.origin) return null;
    return upstream;
  } catch {
    return null;
  }
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin) return false;
  return origin === new URL(request.url).origin && (!fetchSite || fetchSite === 'same-origin');
}

function rateLimited(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > 24;
}

function bodyLooksSafe(body: unknown) {
  if (!body || typeof body !== 'object') return false;
  const data = body as Record<string, any>;
  const messages = data.messages ?? data.contents;
  if (!Array.isArray(messages) || messages.length > 80) return false;
  return JSON.stringify(body).length <= MAX_REQUEST_BYTES;
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return jsonError('仅允许从本站发起中转请求', 403);
  if (rateLimited(request)) return jsonError('请求过于频繁，请稍后再试', 429);

  const apiKey = request.headers.get('x-user-api-key')?.trim();
  if (!apiKey || apiKey.length > 500) return jsonError('缺少有效的 API Key', 400);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) return jsonError('请求内容过大', 413);

  let payload: { protocol?: Protocol; baseUrl?: unknown; apiPath?: unknown; body?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) return jsonError('请求内容过大', 413);
    payload = JSON.parse(raw);
  } catch {
    return jsonError('请求格式不是有效 JSON', 400);
  }

  if (!['openai', 'anthropic', 'gemini'].includes(payload.protocol || '')) return jsonError('不支持的接口协议', 400);
  if (!bodyLooksSafe(payload.body)) return jsonError('消息格式无效或上下文过长', 400);
  const upstream = safeUpstream(payload.baseUrl, payload.apiPath);
  if (!upstream) return jsonError('中转仅允许公开 HTTPS 地址与安全路径', 400);

  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' });
  if (payload.protocol === 'anthropic') {
    headers.set('x-api-key', apiKey);
    headers.set('anthropic-version', '2023-06-01');
  } else if (payload.protocol === 'gemini') {
    headers.set('x-goog-api-key', apiKey);
  } else {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, { method: 'POST', headers, body: JSON.stringify(payload.body), redirect: 'manual' });
  } catch {
    return jsonError('无法连接模型服务，请检查 Base URL、路径或改用直连模式', 502);
  }
  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) return jsonError('为安全起见，中转不跟随模型服务重定向', 502);

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
}
