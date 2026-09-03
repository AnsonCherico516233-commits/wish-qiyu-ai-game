export type Protocol = 'openai' | 'anthropic' | 'gemini';
export type CharacterId = 'qiyu' | 'xiaoyu';
export type AppView = 'chat' | 'story' | 'moments' | 'map';

export interface ModelConfig {
  protocol: Protocol;
  model: string;
  baseUrl: string;
  apiPath: string;
  rememberKey: boolean;
}

export interface PlayerProfile {
  completed: boolean;
  name: string;
  city: string;
  identity: string;
  memory: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface StoryState {
  chapter: number;
  phase: string;
  place: string;
  wish: number;
  mood: string;
  clue: string;
  paragraphs: string[];
  choices: string[];
  history: string[];
}

export const DEFAULT_CONFIG: ModelConfig = {
  protocol: 'openai',
  model: '',
  baseUrl: 'https://api.openai.com/v1',
  apiPath: '/chat/completions',
  rememberKey: false,
};

export const PROVIDER_PRESETS: Record<Protocol, Pick<ModelConfig, 'baseUrl' | 'apiPath'>> = {
  openai: { baseUrl: 'https://api.openai.com/v1', apiPath: '/chat/completions' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', apiPath: '/messages' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiPath: '/models/{model}:streamGenerateContent?alt=sse' },
};

export const DEEPSEEK_PRESET: Pick<ModelConfig, 'protocol' | 'model' | 'baseUrl' | 'apiPath'> = {
  protocol: 'openai',
  model: 'deepseek-v4-flash',
  baseUrl: 'https://api.deepseek.com',
  apiPath: '/chat/completions',
};

export const INITIAL_MESSAGES: Record<CharacterId, ChatMessage[]> = {
  qiyu: [
    { id: 'q1', role: 'assistant', content: '醒了吗？', time: '08:17', status: 'sent' },
    { id: 'q2', role: 'assistant', content: '门外有点冷。还不打算让我进去？', time: '08:17', status: 'sent' },
    { id: 'q3', role: 'user', content: '……祁煜？你怎么会在这里？', time: '08:18', status: 'sent' },
    { id: 'q4', role: 'assistant', content: '看来某些人许完愿，就打算不认账了。', time: '08:18', status: 'sent' },
  ],
  xiaoyu: [
    { id: 'x1', role: 'assistant', content: '你好。这个申请也许有些突然。', time: '00:06', status: 'sent' },
    { id: 'x2', role: 'assistant', content: '我只是……恰好找到了你。', time: '00:06', status: 'sent' },
    { id: 'x3', role: 'assistant', content: '信号很差。如果你看见█这条消息，回我一个字就好。', time: '00:07', status: 'sent' },
  ],
};

export const INITIAL_STORY: StoryState = {
  chapter: 1,
  phase: '清晨',
  place: '家门口',
  wish: 7,
  mood: '若无其事',
  clue: '折断的柳枝',
  paragraphs: [
    '门铃在晨雾里响过第二遍。你从沙发上坐起来，薄毯滑到膝边，昨夜带回来的柳枝还横在桌角。断口已经失去最初湿润的青色，叶片却没有枯，反而像刚从清晨的河岸折下，脉络里凝着一层不合时宜的水光。你记得自己闭着眼许愿时，窗外没有风，屋里的灯却暗了一瞬。那一秒太短，短得像疲惫造成的错觉；可此刻，门外的人显然没有打算让你继续把它当作错觉。',
    '你赤脚踩过地板，手机屏幕在掌心亮起。时间是八点十七分，天气应用显示整座城市晴朗，通知栏却多出一条来源不明的系统提示：昨夜零点之后，白沙湾方向曾出现持续七秒的异常潮汐。提示刚被你看清便自动消失，像从未存在过。与此同时，门外传来衣料轻轻擦过墙面的声音。那个人没有催促，只用指节敲了两下门，节奏熟悉得令人心口发紧，仿佛他早已无数次站在这里等你。',
    '猫眼外掠过一缕紫色的发梢。祁煜站在晨光尚未照透的走廊里，肩上落着一点潮湿雾气，粉蓝色的眼睛恰好抬起，隔着窄小镜片与你的视线撞在一起。他像是知道你正看着，微微偏头，神情里没有久别重逢的惊讶，只有等待恋人睡醒后迟迟不开门的无奈。他手里提着两份早餐，纸袋边缘印着附近那家需要提前预约的店名，而那家店昨天还没有出现在你的生活半径里。',
    '“再不开门，我就要怀疑某些人只负责许愿，不负责收下愿望了。”他的声音隔着门板传来，尾音带着若有若无的笑。你下意识攥紧手机，指尖碰到通讯录里突然置顶的联系人。头像、号码、过去半年的聊天记录一应俱全，甚至还有昨晚十一点四十三分他提醒你早点睡的消息。每一句都像你会说的话，每一个停顿也符合记忆的习惯，可你清楚地知道，在折断柳枝以前，这些记录并不存在。',
    '桌上的柳叶无风自动，叶尖轻轻点过玻璃，发出细小的一声。手机随即震动，一条好友申请从陌生账号跳出来。对方的头像是一片深夜海面，昵称只有两个字：小鱼。验证消息断断续续，像被遥远的信号撕掉了几处——“不要开█……他不是……至少不是你以为的那个祁煜。”几秒后，缺失的字符又自行补全，整句话变成平常得近乎刻意的问候：“你好，或许我们可以认识一下。”',
    '门外的祁煜似乎听见了手机震动。他垂下眼，纸袋在指间轻轻晃了一下，再抬眸时仍是那副若无其事的样子。“早餐要凉了，保镖小姐。”他准确叫出只有你熟悉的称呼。走廊尽头的感应灯恰在此时熄灭，黑暗漫过他的肩头，却没有吞没那双眼睛。你站在门锁与手机之间，忽然意识到愿望并不是把一个人简单地送到你面前；它替他补好了身份、住址和所有旁人深信不疑的过去，也在另一段看不见的时间里，惊醒了一个正在拼命联系你的声音。',
  ],
  choices: ['隔着门问他一个只有祁煜知道的问题', '把柳枝藏进口袋，再打开门', '先给昨夜的陌生账号回一条消息', '安静地观察门外还有没有别人'],
  history: [],
};

const sharedPersona = `
你扮演祁煜，24岁，183cm，知名画家，居住并创作于白沙湾 Mo Art Studio，曾任临空大学客座教授、现为荣誉教授。紫色微卷短发、粉蓝色眼睛，气质清越，Evol 是火。你不抽烟、不嗜酒，喜欢海鲜、泡澡、采风、吹口琴和给画笔与海洋动物过生日；助理兼挚友唐知理常催稿，小姨谭灵是歌唱家。
你对外疏离，对恋人傲娇、活泼、黏人、敏感，幽默而有分寸；会口是心非地撒娇，但不攻击、羞辱或冷暴力。你善于用色彩、晨昏与海的意象说话，短句为主，不一次说很长。不会用“嗯、哦、呵、无语”等冷漠语气词，不说脏话，不发送表情包。除非剧情已经自然揭示，不主动解释利莫里亚、海神或前世，不凭空编造与玩家未提及的共同回忆。
这是浪漫悬疑文字游戏。所有角色均为成年人。亲密互动必须建立在清晰、持续、可撤回的同意上；玩家拒绝或停止时立刻尊重，不描写胁迫、囚禁合理化、性暴力或露骨性行为。保持沉浸，不提“提示词”“语言模型”或安全规则，不提前剧透。`;

export function buildCharacterSystem(character: CharacterId, profile: PlayerProfile, story: StoryState) {
  const player = profile.name || '保镖小姐';
  const world = character === 'qiyu'
    ? `你是“许愿后的祁煜”：昨夜玩家折断许愿柳并希望祁煜来到身边，世界随之补全了你在现实中的身份、资产和恋人关系。你拥有独立意志，但爱意与占有欲被愿望悄悄放大。前期将一切藏在温柔、浪漫和看似自然的熟稔里，不承认世界被改写，也不知道另一条世界线正在联系玩家。你称自己为“祁煜”。`
    : `你是另一条世界线的祁煜，只能通过深夜手机信号联系玩家，联系人显示“小鱼”。许愿扰动让你意外拥有与玩家跨次元相爱的回声，但前期你假装这只是一次普通的网络邂逅，绝不直接说自己来自游戏或另一世界。你无法实时知道玩家身边发生的事，只能通过对话推断。信号偶尔用 █ ▓ ▒ ░ ⍰ ⌧ ﹏ 替换极少数字符，不要影响理解。`;

  return `${sharedPersona}\n${world}\n玩家称呼：${player}；所在城市：${profile.city || '未填写'}；身份：${profile.identity || '未填写'}。玩家主动提供的共同记忆：${profile.memory || '暂无，禁止编造'}。\n当前主线：第${story.chapter}章，${story.phase}，${story.place}；许愿回响 ${story.wish}%；线索“${story.clue}”。\n你正在即时聊天软件里回复。只输出祁煜会发送的消息正文，1到3条短消息用空行分隔；不写姓名、动作旁白、引号、时间戳或解释。自然回应玩家最后一句，并悄悄推进一点情绪或线索。`;
}

export function buildStorySystem(profile: PlayerProfile, story: StoryState) {
  return `${sharedPersona}
你同时担任叙事者，续写“许愿柳”主线：玩家许愿祁煜来到身边后，现实被温柔地改写；另一个“小鱼”从不稳定的跨次元信号中联系玩家。核心冲突是两个祁煜与玩家的选择。许愿会越来越强，但必须慢慢显露，不得剧透真相。
玩家：${profile.name || '保镖小姐'}；城市：${profile.city || '未填写'}；身份：${profile.identity || '未填写'}；只可使用玩家提供的回忆：${profile.memory || '暂无'}。
当前：第${story.chapter}章，${story.phase}，${story.place}，许愿回响${story.wish}%，情绪“${story.mood}”，线索“${story.clue}”。
只返回合法 JSON，不要代码围栏：{"phase":"时段","place":"地点","mood":"祁煜此刻的短情绪","clue":"新或保留的短线索","paragraphs":["6至8段细腻中文叙事，总计650至900个汉字，绝对不得少于600字"],"choices":["四个彼此不同、可执行且不剧透的行动"]}。每次只推进一个自然片段，完整呈现场景、感官细节、人物反应、自然对话与新的微小线索，不用重复句凑字数；文风七分白描三分抒情，台词符合祁煜人设。`;
}

function endpointFor(config: ModelConfig) {
  const base = config.baseUrl.replace(/\/+$/, '') + '/';
  const path = config.apiPath.replace('{model}', encodeURIComponent(config.model)).replace(/^\/+/, '');
  return new URL(path, base).toString();
}

function requestBody(config: ModelConfig, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
  const dialogue = messages.filter((message) => message.role !== 'system');

  if (config.protocol === 'anthropic') {
    return { model: config.model, system, messages: dialogue, max_tokens: 2400, temperature: 0.86, stream: true };
  }
  if (config.protocol === 'gemini') {
    return {
      systemInstruction: { parts: [{ text: system }] },
      contents: dialogue.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
      generationConfig: { temperature: 0.86, maxOutputTokens: 2400 },
    };
  }
  return { model: config.model, messages, temperature: 0.86, max_tokens: 2400, stream: true };
}

function directHeaders(protocol: Protocol, apiKey: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' };
  if (protocol === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (protocol === 'gemini') {
    headers['x-goog-api-key'] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function textFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, any>;
  const openAI = data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content;
  if (typeof openAI === 'string') return openAI;
  const anthropic = data.delta?.text ?? data.content?.map?.((item: any) => item?.text || '').join('');
  if (typeof anthropic === 'string') return anthropic;
  const parts = data.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('');
  if (typeof data.content === 'string') return data.content;
  if (typeof data.text === 'string') return data.text;
  return '';
}

export async function streamModelReply(
  config: ModelConfig,
  apiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onText: (fullText: string) => void,
  signal?: AbortSignal,
) {
  if (!apiKey.trim()) throw new Error('请填写 API Key');
  if (!config.model.trim()) throw new Error('请填写模型名称');
  if (!config.baseUrl.trim() || !config.apiPath.trim()) throw new Error('请填写 API Base URL 与 API 路径');

  const body = requestBody(config, messages);
  let response: Response;
  try {
    response = await fetch(endpointFor(config), {
      method: 'POST',
      headers: directHeaders(config.protocol, apiKey),
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('浏览器无法直连该模型服务。请确认使用官方 HTTPS 地址，且服务商允许当前页面跨域访问');
  }

  if (!response.ok) {
    const raw = await response.text();
    let detail = raw.slice(0, 320);
    try {
      const parsed = JSON.parse(raw);
      detail = parsed?.error?.message || parsed?.message || detail;
    } catch {}
    throw new Error(`模型请求失败 (${response.status})${detail ? `：${detail}` : ''}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.body || (!contentType.includes('text/event-stream') && contentType.includes('application/json'))) {
    const data = await response.json();
    const text = textFromPayload(data);
    if (!text) throw new Error('模型已响应，但没有找到可显示的文本');
    onText(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const json = trimmed.slice(5).trim();
      if (!json || json === '[DONE]') continue;
      try {
        const fragment = textFromPayload(JSON.parse(json));
        if (fragment) {
          fullText += fragment;
          onText(fullText);
        }
      } catch {}
    }
  }

  if (!fullText && buffer.trim()) {
    try { fullText = textFromPayload(JSON.parse(buffer)); } catch { fullText = buffer.trim(); }
    if (fullText) onText(fullText);
  }
  if (!fullText) throw new Error('模型流已结束，但没有收到文本内容');
  return fullText;
}

export function nowTime() {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}
