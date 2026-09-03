import type { StoryState } from './game';

export type StoryDraft = Pick<StoryState, 'phase' | 'place' | 'mood' | 'clue' | 'paragraphs' | 'choices'>;

const DEFAULT_CHOICES = [
  '继续观察祁煜的反应',
  '追问刚才出现的线索',
  '靠近他，确认此刻的真实',
  '暂时查看周围有没有异常',
];

function cleanReply(raw: string) {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json|javascript|text)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function balancedObject(text: string) {
  const start = text.indexOf('{');
  if (start < 0) return '';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  return text.slice(start);
}

function tryJson(text: string): Record<string, unknown> | null {
  const candidates = [text, balancedObject(text)].filter(Boolean);
  for (const candidate of candidates) {
    for (const version of [candidate, candidate.replace(/,\s*([}\]])/g, '$1')]) {
      try {
        let parsed: unknown = JSON.parse(version);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const record = parsed as Record<string, unknown>;
          const nested = record.story;
          return nested && typeof nested === 'object' && !Array.isArray(nested)
            ? nested as Record<string, unknown>
            : record;
        }
      } catch {}
    }
  }
  return null;
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n{2,}|\n(?=\s*(?:[-*]|[A-D1-4][.、)）]))/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function decodeQuoted(token: string) {
  try { return JSON.parse(token) as string; }
  catch { return token.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
}

function extractArrayStrings(text: string, key: string) {
  const keyMatch = new RegExp(`["']?${key}["']?\\s*[:：]\\s*\\[`, 'i').exec(text);
  if (!keyMatch) return [];
  const start = (keyMatch.index || 0) + keyMatch[0].length;
  const remainder = text.slice(start);
  const end = remainder.search(/\]\s*(?:,|})/);
  const body = end >= 0 ? remainder.slice(0, end) : remainder;
  return [...body.matchAll(/"(?:\\.|[^"\\])*"/g)].map((match) => decodeQuoted(match[0])).filter(Boolean);
}

function sentenceChunks(text: string) {
  const sentences = text.match(/[^。！？!?…]+[。！？!?…]+|[^。！？!?…]+$/g)?.map((item) => item.trim()).filter(Boolean) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > 220) {
      chunks.push(current);
      current = sentence;
    } else current += sentence;
  }
  if (current) chunks.push(current);
  return chunks;
}

function plainChoices(text: string) {
  const choices: string[] = [];
  const explicit = /^\s*(?:[-*]\s*)?(?:[A-Da-d]|[1-4]|选择[一二三四]?)\s*[.、:：)）-]\s*(.+)$/gm;
  for (const match of text.matchAll(explicit)) if (match[1]?.trim()) choices.push(match[1].trim());
  const heading = text.search(/(?:^|\n)\s*#{0,6}\s*(?:你的选择|可选行动|选择|choices)\s*[:：]?\s*(?:\n|$)/i);
  if (choices.length < 2 && heading >= 0) {
    for (const line of text.slice(heading).split('\n')) {
      const value = line.replace(/^\s*[-*•]\s*/, '').trim();
      if (value.length >= 4 && !/^(?:你的选择|可选行动|选择|choices)/i.test(value)) choices.push(value);
    }
  }
  return [...new Set(choices)].slice(0, 4);
}

function plainParagraphs(text: string) {
  const fromArray = extractArrayStrings(text, 'paragraphs').filter((item) => storyCharacterCount([item]) >= 12);
  if (fromArray.length) return fromArray.slice(0, 8);

  const quotedNarrative = [...text.matchAll(/"(?:\\.|[^"\\])*"/g)]
    .map((match) => decodeQuoted(match[0]))
    .filter((item) => storyCharacterCount([item]) >= 28);
  if (quotedNarrative.length) return quotedNarrative.slice(0, 8);

  const choiceHeading = text.search(/(?:^|\n)\s*#{0,6}\s*(?:你的选择|可选行动|选择|choices)\s*[:：]?\s*(?:\n|$)/i);
  const narrative = (choiceHeading >= 0 ? text.slice(0, choiceHeading) : text)
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*(?:phase|place|mood|clue|时段|地点|情绪|线索)\s*[:：].*$/gim, '')
    .replace(/^\s*(?:[-*]\s*)?(?:[A-Da-d]|[1-4]|选择[一二三四]?)\s*[.、:：)）-].*$/gm, '')
    .trim();
  const blocks = narrative.split(/\n\s*\n+/).map((item) => item.replace(/^\s*[-*]\s*/, '').replace(/\s+/g, ' ').trim()).filter((item) => storyCharacterCount([item]) >= 12);
  return blocks.flatMap((block) => block.length > 280 ? sentenceChunks(block) : [block]).slice(0, 8);
}

function field(text: string, names: string[], fallback: string, maxLength: number) {
  const pattern = new RegExp(`["']?(?:${names.join('|')})["']?\\s*[:：]\\s*["“]?([^"”\\n,}]+)`, 'i');
  return pattern.exec(text)?.[1]?.trim().slice(0, maxLength) || fallback;
}

export function storyCharacterCount(paragraphs: string[]) {
  return paragraphs.join('').match(/[\u3400-\u9fff]/g)?.length || 0;
}

export function parseStoryReply(raw: string, fallback: StoryState): StoryDraft {
  const cleaned = cleanReply(raw);
  if (!cleaned) throw new Error('模型没有返回剧情文本');
  const data = tryJson(cleaned);
  const paragraphs = data ? stringList(data.paragraphs ?? data.content ?? data.text) : plainParagraphs(cleaned);
  const extractedChoices = data ? stringList(data.choices ?? data.options) : extractArrayStrings(cleaned, 'choices').concat(plainChoices(cleaned));
  const choices = [...new Set(extractedChoices)].slice(0, 4);

  return {
    phase: data && typeof data.phase === 'string' ? data.phase.slice(0, 12) : field(cleaned, ['phase', '时段'], fallback.phase, 12),
    place: data && typeof data.place === 'string' ? data.place.slice(0, 24) : field(cleaned, ['place', '地点'], fallback.place, 24),
    mood: data && typeof data.mood === 'string' ? data.mood.slice(0, 24) : field(cleaned, ['mood', '情绪'], fallback.mood, 24),
    clue: data && typeof data.clue === 'string' ? data.clue.slice(0, 36) : field(cleaned, ['clue', '线索'], fallback.clue, 36),
    paragraphs: (paragraphs.length ? paragraphs : plainParagraphs(cleaned)).slice(0, 8),
    choices: [...choices, ...DEFAULT_CHOICES.filter((choice) => !choices.includes(choice))].slice(0, 4),
  };
}

export function parseContinuation(raw: string) {
  const cleaned = cleanReply(raw);
  if (!cleaned) return [];
  const data = tryJson(cleaned);
  const paragraphs = data ? stringList(data.paragraphs ?? data.content ?? data.text) : plainParagraphs(cleaned);
  return (paragraphs.length ? paragraphs : sentenceChunks(cleaned)).map((item) => item.trim()).filter(Boolean).slice(0, 4);
}
