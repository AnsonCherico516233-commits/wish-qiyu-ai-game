'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronRight,
  CircleAlert,
  Compass,
  Ellipsis,
  Flame,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MapPinned,
  MessageCircleMore,
  MoonStar,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  UsersRound,
  WandSparkles,
  Waves,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  AppView,
  buildCharacterSystem,
  buildStorySystem,
  CharacterId,
  ChatMessage,
  DEFAULT_CONFIG,
  INITIAL_MESSAGES,
  INITIAL_STORY,
  ModelConfig,
  nowTime,
  PlayerProfile,
  PROVIDER_PRESETS,
  StoryState,
  streamModelReply,
} from '@/lib/game';

const STORAGE = {
  config: 'wish-qiyu:model-config', key: 'wish-qiyu:api-key', profile: 'wish-qiyu:profile',
  messages: 'wish-qiyu:messages', story: 'wish-qiyu:story',
};

const emptyProfile: PlayerProfile = { completed: false, name: '', city: '', identity: '', memory: '' };

const contacts = {
  qiyu: { name: '祁煜', avatar: '祁', subtitle: '此刻在线 · 跨越一场晨雾', tone: 'from-[#78aebd] to-[#8d87ad]' },
  xiaoyu: { name: '小鱼', avatar: '鱼', subtitle: '信号微弱 · 来自另一侧', tone: 'from-[#b69ac5] to-[#7185b2]' },
};

const moments = [
  { name: '祁煜', avatar: '祁', time: '12分钟前', text: '颜料里少了一种只在清晨出现的蓝。好在今天看见了。', art: '被晨光切成两半的调色盘，海蓝与淡金还未干透。', tag: '白沙湾', tone: 'from-[#89b8c5] to-[#8e87ac]', comment: '唐知理：所以画展的那幅完成了吗？' },
  { name: '唐知理', avatar: '唐', time: '1小时前', text: '今日工作提醒：请某位大艺术家不要把“寻找灵感”当成失联的正式理由。', art: '办公桌上的展览清单，末尾压着一枚贝壳。', tag: '工作日常', tone: 'from-[#8f929d] to-[#5f6878]', comment: '祁煜：措辞不够准确，退回重写。' },
  { name: '谭灵', avatar: '灵', time: '昨晚', text: '演出结束时，海边刚好起风。有人答应来看，最后只送来一束嘉兰百合。', art: '后台镜前一束卷瓣花，紫红花影落在节目单上。', tag: '散场之后', tone: 'from-[#a380ad] to-[#d19a9f]', comment: '祁煜：花比迟到的人准时。' },
];

const locations = [
  { name: '你的住处', desc: '门铃响过两遍，秘密仍停在门外。', tag: '主线', icon: '⌂', wash: 'from-[#eadce9] to-[#f6edf0]' },
  { name: '城市美术馆', desc: '新展开幕，人群里也许有熟悉的视线。', tag: '偶遇', icon: '◇', wash: 'from-[#e0e6ef] to-[#f2edf4]' },
  { name: '临海商圈', desc: '玻璃橱窗映着潮湿天光与并肩的人影。', tag: '日常', icon: '○', wash: 'from-[#e1ebea] to-[#f5eee7]' },
  { name: '白沙湾 · Mo Art', desc: '潮声背后的私人画室，尚未向你完全打开。', tag: '深度剧情', icon: '≈', wash: 'from-[#cddfe4] to-[#e9e2eb]' },
];

function storageRead<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function conversationPreview(messages: ChatMessage[]) {
  return messages.at(-1)?.content.replace(/\s+/g, ' ').slice(0, 42) || '还没有消息';
}

function parseStory(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('模型没有返回可解析的剧情结构');
  const data = JSON.parse(cleaned.slice(start, end + 1));
  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs.filter((item: unknown) => typeof item === 'string').slice(0, 6) : [];
  const choices = Array.isArray(data.choices) ? data.choices.filter((item: unknown) => typeof item === 'string').slice(0, 4) : [];
  if (!paragraphs.length || choices.length < 2) throw new Error('剧情结构不完整');
  return {
    phase: typeof data.phase === 'string' ? data.phase.slice(0, 12) : '此刻',
    place: typeof data.place === 'string' ? data.place.slice(0, 24) : '未知地点',
    mood: typeof data.mood === 'string' ? data.mood.slice(0, 24) : '若有所思',
    clue: typeof data.clue === 'string' ? data.clue.slice(0, 36) : '尚未命名的线索',
    paragraphs,
    choices,
  };
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<AppView>('chat');
  const [activeCharacter, setActiveCharacter] = useState<CharacterId>('qiyu');
  const [profile, setProfile] = useState<PlayerProfile>(emptyProfile);
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Record<CharacterId, ChatMessage[]>>(INITIAL_MESSAGES);
  const [story, setStory] = useState<StoryState>(INITIAL_STORY);
  const [draft, setDraft] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storyBusy, setStoryBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setConfig(storageRead(STORAGE.config, DEFAULT_CONFIG));
    setProfile(storageRead(STORAGE.profile, emptyProfile));
    setMessages(storageRead(STORAGE.messages, INITIAL_MESSAGES));
    setStory(storageRead(STORAGE.story, INITIAL_STORY));
    setApiKey(localStorage.getItem(STORAGE.key) || '');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE.config, JSON.stringify(config));
    localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    localStorage.setItem(STORAGE.messages, JSON.stringify(messages));
    localStorage.setItem(STORAGE.story, JSON.stringify(story));
    if (config.rememberKey && apiKey) localStorage.setItem(STORAGE.key, apiKey);
    else localStorage.removeItem(STORAGE.key);
  }, [ready, config, profile, messages, story, apiKey]);

  useEffect(() => {
    if (view === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeCharacter, view]);

  const active = contacts[activeCharacter];
  const activeMessages = messages[activeCharacter];
  const connected = Boolean(config.model.trim() && apiKey.trim() && config.baseUrl.trim() && config.apiPath.trim());

  const header = useMemo(() => {
    if (view === 'story') return { title: `第 ${story.chapter} 章 · ${story.place}`, subtitle: `${story.phase} · 世界线仍在轻轻偏移` };
    if (view === 'moments') return { title: '朋友圈', subtitle: '现实被改写后，所有人都记得他' };
    if (view === 'map') return { title: '邀约地图', subtitle: `${profile.city || '你的城市'} · 选择一个要去的地方` };
    return { title: active.name, subtitle: active.subtitle };
  }, [view, story, profile.city, active]);

  function requireConnection() {
    if (connected) return true;
    setNotice('先填写模型名称、API Key、Base URL 与 API 路径，再继续故事。');
    setConfigOpen(true);
    return false;
  }

  async function sendMessage(text = draft) {
    const content = text.trim();
    if (!content || busy || !requireConnection()) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, time: nowTime(), status: 'sent' };
    const assistantId = crypto.randomUUID();
    const pending: ChatMessage = { id: assistantId, role: 'assistant', content: '', time: nowTime(), status: 'sending' };
    const history = [...activeMessages, userMessage].slice(-24);
    setMessages((current) => ({ ...current, [activeCharacter]: [...current[activeCharacter], userMessage, pending] }));
    setDraft('');
    setNotice('');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamModelReply(
        config,
        apiKey,
        [
          { role: 'system', content: buildCharacterSystem(activeCharacter, profile, story) },
          ...history.map((message) => ({ role: message.role, content: message.content })),
        ],
        (fullText) => setMessages((current) => ({
          ...current,
          [activeCharacter]: current[activeCharacter].map((message) => message.id === assistantId ? { ...message, content: fullText, status: 'sending' } : message),
        })),
        controller.signal,
      );
      setMessages((current) => ({ ...current, [activeCharacter]: current[activeCharacter].map((message) => message.id === assistantId ? { ...message, status: 'sent' } : message) }));
      setStory((current) => ({ ...current, wish: Math.min(100, current.wish + 1) }));
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      const detail = aborted ? '已停止生成' : error instanceof Error ? error.message : '生成失败，请检查模型设置';
      setMessages((current) => ({
        ...current,
        [activeCharacter]: current[activeCharacter].map((message) => message.id === assistantId ? { ...message, content: message.content || `连接中断：${detail}`, status: aborted ? 'sent' : 'error' } : message),
      }));
      if (!aborted) setNotice(detail);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function advanceStory(choice: string) {
    if (storyBusy || !requireConnection()) return;
    setView('story');
    setStoryBusy(true);
    setNotice('');
    let raw = '';
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamModelReply(
        config,
        apiKey,
        [
          { role: 'system', content: buildStorySystem(profile, story) },
          ...story.history.slice(-5).map((item) => ({ role: 'assistant' as const, content: item })),
          { role: 'user', content: `玩家选择：${choice}\n请从当前片段自然继续，不要总结旧剧情。` },
        ],
        (text) => { raw = text; },
        controller.signal,
      );
      const next = parseStory(raw);
      setStory((current) => ({
        ...current,
        ...next,
        chapter: current.chapter + ((current.history.length + 1) % 4 === 0 ? 1 : 0),
        wish: Math.min(100, current.wish + 2),
        history: [...current.history, `选择：${choice}\n${next.paragraphs.join('\n')}`].slice(-12),
      }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : '剧情生成失败';
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice(detail);
    } finally {
      setStoryBusy(false);
      abortRef.current = null;
    }
  }

  async function testConnection() {
    if (!config.model.trim() || !apiKey.trim() || !config.baseUrl.trim() || !config.apiPath.trim()) {
      setTestState('error'); setNotice('请先完整填写四项连接信息。'); return;
    }
    setTestState('testing');
    setNotice('');
    try {
      let reply = '';
      await streamModelReply(config, apiKey, [
        { role: 'system', content: '你正在测试 API 连接。只回复四个字：连接成功' },
        { role: 'user', content: '测试连接' },
      ], (text) => { reply = text; });
      if (!reply) throw new Error('未收到文本');
      setTestState('success');
      setNotice('连接成功，祁煜已经能听见你了。');
    } catch (error) {
      setTestState('error');
      setNotice(error instanceof Error ? error.message : '连接测试失败');
    }
  }

  function changeProtocol(protocol: ModelConfig['protocol']) {
    setConfig((current) => ({ ...current, protocol, ...PROVIDER_PRESETS[protocol] }));
    setTestState('idle');
  }

  function resetGame() {
    if (!window.confirm('确认清除本设备上的剧情、聊天、玩家资料与模型设置吗？')) return;
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    setProfile(emptyProfile); setConfig(DEFAULT_CONFIG); setApiKey(''); setMessages(INITIAL_MESSAGES); setStory(INITIAL_STORY);
    setActiveCharacter('qiyu'); setView('chat'); setConfigOpen(false); setNotice('');
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.name.trim()) return;
    setProfile((current) => ({ ...current, completed: true }));
    setConfigOpen(true);
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const navItems: Array<{ id: AppView; label: string; icon: typeof Sparkles }> = [
    { id: 'chat', label: '私信', icon: MessageCircleMore }, { id: 'story', label: '此刻', icon: Sparkles },
    { id: 'moments', label: '朋友圈', icon: UsersRound }, { id: 'map', label: '邀约', icon: MapPinned },
  ];

  return (
    <main className="min-h-dvh overflow-hidden p-0 text-foreground md:p-5">
      <div className="tide-glow" aria-hidden="true" />
      <section className="mx-auto grid h-dvh max-w-[1480px] grid-cols-1 overflow-hidden border-white/70 bg-card/88 shadow-[0_30px_90px_rgba(71,58,96,.14)] backdrop-blur-xl md:h-[calc(100dvh-40px)] md:grid-cols-[76px_300px_minmax(0,1fr)] md:rounded-[26px] md:border xl:grid-cols-[76px_300px_minmax(0,1fr)_292px]">
        <nav className="hidden flex-col items-center border-r border-border/80 bg-sidebar/75 py-5 md:flex" aria-label="主导航">
          <button onClick={() => setView('chat')} className="mb-8 grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(120,107,160,.28)]" aria-label="如你所愿首页"><Waves className="size-5" /></button>
          <div className="flex flex-1 flex-col gap-3">
            {navItems.map((item) => { const Icon = item.icon; return <Button key={item.id} size="icon-lg" variant={view === item.id ? 'default' : 'ghost'} className={`rounded-2xl ${view !== item.id ? 'text-muted-foreground' : ''}`} onClick={() => setView(item.id)} aria-label={item.label}><Icon /></Button>; })}
          </div>
          <Button size="icon-lg" variant="ghost" className="rounded-2xl text-muted-foreground" onClick={() => setConfigOpen(true)} aria-label="模型设置"><Settings2 /></Button>
        </nav>

        <aside className="hidden border-r border-border/80 bg-card/45 md:block">
          <div className="border-b border-border/70 px-5 pb-4 pt-6">
            <div className="mb-5 flex items-end justify-between">
              <div><p className="font-serif text-[11px] uppercase tracking-[.24em] text-muted-foreground">Love across tides</p><h1 className="mt-1 font-serif text-2xl">如你所愿</h1></div>
              <span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${connected ? 'bg-[#eaf3f4] text-[#537985]' : 'bg-[#f4eceb] text-[#9a6f67]'}`}><span className={`size-1.5 rounded-full ${connected ? 'bg-[#73a492]' : 'bg-[#c5897e]'}`} />{connected ? 'AI 已连接' : '尚未连接'}</span>
            </div>
            {view === 'chat' ? <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 rounded-xl border-transparent bg-muted/70 pl-9 shadow-none" placeholder="搜索私信" aria-label="搜索私信" /></label> : <p className="rounded-xl bg-muted/55 px-3 py-2.5 text-xs leading-5 text-muted-foreground">一场愿望正在改变你熟悉的世界。每一次选择都会留下回声。</p>}
          </div>
          {view === 'chat' ? (
            <div className="p-2.5">
              <p className="px-3 py-2 text-[11px] font-medium tracking-[.12em] text-muted-foreground">最近联系</p>
              {(Object.keys(contacts) as CharacterId[]).map((id) => {
                const item = contacts[id];
                return <button key={id} onClick={() => setActiveCharacter(id)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${activeCharacter === id ? 'bg-primary/10 shadow-[inset_0_0_0_1px_rgba(126,113,164,.08)]' : 'hover:bg-muted/60'}`}>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br ${item.tone} text-sm font-semibold text-white shadow-sm`}>{item.avatar}</span>
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="text-sm font-medium">{item.name}</b><span className="text-[10px] text-muted-foreground">{messages[id].at(-1)?.time}</span></span><span className={`mt-1 block truncate text-xs ${id === 'xiaoyu' ? 'text-[#8b7092]' : 'text-muted-foreground'}`}>{conversationPreview(messages[id])}</span></span>
                </button>;
              })}
              <div className="mx-3 mt-5 rounded-2xl border border-dashed border-border p-3 text-[11px] leading-5 text-muted-foreground"><LockKeyhole className="mb-2 size-4 text-primary" />小鱼的频道只在夜深时最稳定。消息里的缺口，可能来自另一段时间。</div>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {navItems.filter((item) => item.id !== 'chat').map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${view === item.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}><span className="grid size-9 place-items-center rounded-xl bg-card shadow-sm"><Icon className="size-4" /></span><span className="flex-1">{item.label}</span><ChevronRight className="size-4 opacity-45" /></button>; })}
              <button onClick={() => { setView('chat'); setActiveCharacter('xiaoyu'); }} className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-[#eee8f4] to-[#e3edf1] px-4 py-4 text-left"><MoonStar className="size-5 text-[#7a7194]" /><span className="text-xs leading-5"><b className="block text-foreground">深夜频道</b><span className="text-muted-foreground">查看小鱼的未读信号</span></span></button>
            </div>
          )}
        </aside>

        <section className="relative flex min-w-0 flex-col bg-[#faf8fc]/55">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-border/70 bg-card/66 px-4 backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {view === 'chat' ? <span className={`grid size-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br ${active.tone} text-sm font-semibold text-white`}>{active.avatar}</span> : <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-primary/10 text-primary">{view === 'story' ? <Sparkles className="size-4" /> : view === 'moments' ? <UsersRound className="size-4" /> : <MapPinned className="size-4" />}</span>}
              <div className="min-w-0"><h2 className="truncate text-[15px] font-semibold">{header.title}</h2><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{header.subtitle}</p></div>
            </div>
            <div className="flex gap-1">
              {view === 'chat' && <Button size="icon" variant="ghost" className="rounded-xl" aria-label="语音通话"><Phone /></Button>}
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => setConfigOpen(true)} aria-label="模型设置"><Settings2 /></Button>
              <Button size="icon" variant="ghost" className="hidden rounded-xl sm:inline-flex" aria-label="更多"><Ellipsis /></Button>
            </div>
          </header>

          {notice && <div role="status" className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-[#e7cbc4] bg-[#fff4f0] px-3 py-2.5 text-xs leading-5 text-[#8c574d] sm:mx-6"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{notice}</span><button onClick={() => setNotice('')} className="text-[#8c574d] underline underline-offset-2">关闭</button></div>}

          {view === 'chat' && <ChatView activeCharacter={activeCharacter} active={active} messages={activeMessages} busy={busy} endRef={messagesEndRef} onSwitch={setActiveCharacter} />}
          {view === 'story' && <StoryView story={story} loading={storyBusy} onChoice={(choice) => void advanceStory(choice)} />}
          {view === 'moments' && <MomentsView />}
          {view === 'map' && <MapView city={profile.city} onVisit={(place) => void advanceStory(`前往${place}，触发一段与当前线索相连的线下剧情`)} />}

          {view === 'chat' && (
            <footer className="shrink-0 border-t border-border/70 bg-card/72 p-3 backdrop-blur-md sm:p-4">
              <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[20px] border border-border bg-card p-2 shadow-[0_10px_28px_rgba(86,72,111,.08)]">
                <button className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="添加内容"><Paperclip className="size-4" /></button>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={composerKeyDown} rows={1} className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground" placeholder={connected ? `给${active.name}发消息，或描述你的行动…` : '先连接你的 AI 模型…'} aria-label="消息内容" />
                {busy ? <Button size="icon-lg" variant="outline" className="rounded-[14px]" onClick={() => abortRef.current?.abort()} aria-label="停止生成"><Square className="size-3.5 fill-current" /></Button> : <Button size="icon-lg" className="rounded-[14px]" onClick={() => void sendMessage()} disabled={!draft.trim()} aria-label="发送消息"><Send /></Button>}
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">Enter 发送 · Shift + Enter 换行 · AI 文本始终按纯文本展示</p>
            </footer>
          )}

          <nav className="grid h-[60px] shrink-0 grid-cols-4 border-t border-border/75 bg-card/90 px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="移动端主导航">
            {navItems.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${view === item.id ? 'text-primary' : 'text-muted-foreground'}`}><Icon className="size-4" /><span>{item.label}</span></button>; })}
          </nav>
        </section>

        <RightPanel story={story} profile={profile} connected={connected} protocol={config.protocol} onSettings={() => setConfigOpen(true)} />
      </section>

      <ModelSettings open={configOpen} onOpenChange={setConfigOpen} config={config} setConfig={setConfig} apiKey={apiKey} setApiKey={setApiKey} changeProtocol={changeProtocol} testState={testState} onTest={() => void testConnection()} onReset={resetGame} />

      <Dialog open={ready && !profile.completed}>
        <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[26px] border border-white/80 bg-[#fbf8fc] p-0 shadow-[0_30px_100px_rgba(69,54,92,.24)] sm:max-w-[540px]">
          <div className="relative overflow-hidden rounded-t-[26px] bg-gradient-to-br from-[#7388a7] via-[#9ab9c2] to-[#d8a58f] px-7 py-8 text-white">
            <div className="resonance-rings" aria-hidden="true" />
            <div className="relative"><span className="grid size-11 place-items-center rounded-2xl bg-white/14 ring-1 ring-white/25"><WandSparkles className="size-5" /></span><p className="mt-8 font-serif text-xs uppercase tracking-[.28em] text-white/70">A wish finds its shore</p><h2 className="mt-2 font-serif text-3xl leading-tight">许愿让祁煜<br />来到你的身边</h2><p className="mt-3 max-w-sm text-xs leading-6 text-white/78">柳枝折断的那一刻，世界安静了一秒。告诉故事，该怎样称呼你。</p></div>
          </div>
          <form onSubmit={submitProfile} className="space-y-4 px-6 py-6 sm:px-7">
            <DialogHeader className="sr-only"><DialogTitle>开始游戏</DialogTitle><DialogDescription>填写玩家资料</DialogDescription></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="你的称呼 *"><Input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="例如：小月" className="h-10 rounded-xl bg-card" /></Field>
              <Field label="所在城市"><Input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} placeholder="现实中的城市" className="h-10 rounded-xl bg-card" /></Field>
            </div>
            <Field label="身份 / 日常"><Input value={profile.identity} onChange={(event) => setProfile({ ...profile, identity: event.target.value })} placeholder="例如：大学生、设计师、自由职业" className="h-10 rounded-xl bg-card" /></Field>
            <Field label="你与祁煜的一件小事"><Textarea value={profile.memory} onChange={(event) => setProfile({ ...profile, memory: event.target.value })} placeholder="只写你愿意让 AI 记住的内容；留空时，AI 不会擅自编造共同回忆。" className="min-h-24 rounded-xl bg-card leading-6" /></Field>
            <p className="rounded-xl bg-[#edf3f4] px-3 py-2.5 text-[11px] leading-5 text-[#58727a]"><ShieldCheck className="mr-1.5 inline size-4" />资料仅保存在此设备浏览器中，你可以随时在设置里清除。</p>
            <Button type="submit" className="h-11 w-full rounded-xl text-sm">折下柳枝，开始故事 <Sparkles /></Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>{children}</label>;
}

function ChatView({ activeCharacter, active, messages, busy, endRef, onSwitch }: {
  activeCharacter: CharacterId; active: typeof contacts.qiyu; messages: ChatMessage[]; busy: boolean;
  endRef: React.RefObject<HTMLDivElement | null>; onSwitch: (id: CharacterId) => void;
}) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6">
    <div className="mx-auto mb-4 flex max-w-3xl gap-2 md:hidden">
      {(Object.keys(contacts) as CharacterId[]).map((id) => <button key={id} onClick={() => onSwitch(id)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs ${activeCharacter === id ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border bg-card'}`}><span className={`size-2 rounded-full ${id === 'qiyu' ? 'bg-[#75a692]' : 'bg-[#a289b4]'}`} />{contacts[id].name}</button>)}
    </div>
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="text-center text-[10px] tracking-[.12em] text-muted-foreground">今天 · {activeCharacter === 'xiaoyu' ? '信号不稳定' : '清晨信号稳定'}</div>
      {messages.map((message) => <div key={message.id} className={`max-w-[84%] ${message.role === 'user' ? 'self-end' : 'self-start'}`}>
        <div className={`whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[14px] leading-7 ${message.role === 'user' ? 'rounded-tr-[5px] bg-[#dacbdc] text-[#473d53]' : `rounded-tl-[5px] bg-card shadow-[0_8px_24px_rgba(91,77,116,.08)] ring-1 ${message.status === 'error' ? 'ring-[#dcaaa0]' : 'ring-border/60'} ${activeCharacter === 'xiaoyu' ? 'glitch-text' : ''}`}`}>
          {message.content || <span className="inline-flex items-center gap-2 text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" />正在输入</span>}
        </div>
        <p className={`mt-1.5 text-[10px] text-muted-foreground ${message.role === 'user' ? 'pr-1 text-right' : 'pl-1'}`}>{message.role === 'assistant' ? active.name : '你'} · {message.time}{message.status === 'sending' && message.content ? ' · 生成中' : ''}{message.status === 'error' ? ' · 发送失败' : ''}</p>
      </div>)}
      {busy && !messages.at(-1)?.content && <span className="sr-only" aria-live="polite">{active.name}正在输入</span>}
      <div ref={endRef} />
    </div>
  </div>;
}

function StoryView({ story, loading, onChoice }: { story: StoryState; loading: boolean; onChoice: (choice: string) => void }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
    <article className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#7487a6] via-[#98b9c1] to-[#dfa991] p-6 text-white shadow-[0_18px_40px_rgba(103,110,145,.2)] sm:p-8">
        <div className="resonance-rings smaller" aria-hidden="true" /><p className="relative text-[10px] uppercase tracking-[.24em] text-white/70">Chapter {String(story.chapter).padStart(2, '0')} · Wish echo</p><h3 className="relative mt-8 font-serif text-2xl">{story.place}</h3><div className="relative mt-3 flex flex-wrap gap-2 text-[10px]"><span className="rounded-full bg-white/14 px-2.5 py-1 ring-1 ring-white/20">{story.phase}</span><span className="rounded-full bg-white/14 px-2.5 py-1 ring-1 ring-white/20">情绪 · {story.mood}</span><span className="rounded-full bg-white/14 px-2.5 py-1 ring-1 ring-white/20">回响 · {story.wish}%</span></div>
      </div>
      <div className="mx-auto max-w-2xl px-1 py-7 sm:px-5">
        {loading ? <div className="space-y-4"><p className="flex items-center gap-2 font-serif text-sm text-primary"><LoaderCircle className="size-4 animate-spin" />潮声正在续写下一页</p>{[92, 100, 78, 96].map((width) => <div key={width} className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${width}%` }} />)}</div> : <div className="story-copy space-y-5">{story.paragraphs.map((paragraph, index) => <p key={`${paragraph.slice(0, 12)}-${index}`}>{paragraph}</p>)}</div>}
        <div className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="flex items-center gap-1.5 text-[10px] tracking-[.16em] text-muted-foreground"><Bookmark className="size-3.5" />线索 · {story.clue}</span><span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-2.5"><p className="mb-3 text-[11px] font-medium tracking-[.12em] text-muted-foreground">你的选择</p>{story.choices.map((choice, index) => <button key={choice} disabled={loading} onClick={() => onChoice(choice)} className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left text-sm leading-6 shadow-[0_4px_18px_rgba(78,65,101,.05)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_22px_rgba(78,65,101,.09)] disabled:opacity-50"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-serif text-xs text-primary">{String.fromCharCode(65 + index)}</span><span className="flex-1">{choice}</span><ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></button>)}</div>
      </div>
    </article>
  </div>;
}

function MomentsView() {
  const [liked, setLiked] = useState<number[]>([]);
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7"><div className="mx-auto max-w-2xl space-y-4">{moments.map((moment, index) => <article key={moment.name + moment.time} className="rounded-[22px] border border-border/75 bg-card/88 p-5 shadow-[0_8px_30px_rgba(76,62,95,.06)]">
    <header className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-[14px] bg-gradient-to-br ${moment.tone} text-sm font-semibold text-white`}>{moment.avatar}</span><div><h3 className="text-sm font-medium">{moment.name}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{moment.time}</p></div></header>
    <p className="mt-4 text-sm leading-7">{moment.text}</p><div className={`mt-3 flex aspect-[16/7] items-end overflow-hidden rounded-2xl bg-gradient-to-br ${index === 0 ? 'from-[#bfd6dc] via-[#dad9df] to-[#e8bfa7]' : index === 1 ? 'from-[#d6d2d9] via-[#ece7e8] to-[#c8d8d7]' : 'from-[#d6c2d7] via-[#f0d8d4] to-[#cfb5c5]'} p-4`}><p className="max-w-xs rounded-xl bg-white/62 px-3 py-2 text-[11px] leading-5 text-[#62566b] backdrop-blur-sm">{moment.art}</p></div>
    <div className="mt-3 flex items-center justify-between text-[11px]"><span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{moment.tag}</span><button onClick={() => setLiked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} className={`transition ${liked.includes(index) ? 'text-[#c87882]' : 'text-muted-foreground hover:text-[#c87882]'}`}>♡ {liked.includes(index) ? '已喜欢' : '喜欢'}</button></div>
    <p className="mt-3 rounded-xl bg-muted/55 px-3 py-2 text-[11px] leading-5 text-muted-foreground">{moment.comment}</p>
  </article>)}</div></div>;
}

function MapView({ city, onVisit }: { city: string; onVisit: (place: string) => void }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7"><div className="mx-auto max-w-3xl">
    <div className="mb-5 rounded-[22px] border border-border/70 bg-card/82 p-5"><p className="font-serif text-xs uppercase tracking-[.18em] text-muted-foreground">Where the tide leads</p><h3 className="mt-2 font-serif text-2xl">{city || '你的城市'}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">世界线已经把祁煜嵌进这座城市。选一个地点，AI 会结合当前线索续写新的线下片段。</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{locations.map((location) => <button key={location.name} onClick={() => onVisit(location.name)} className={`group relative min-h-44 overflow-hidden rounded-[22px] bg-gradient-to-br ${location.wash} p-5 text-left shadow-[0_8px_26px_rgba(82,70,104,.07)] ring-1 ring-border/60 transition hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(82,70,104,.12)]`}><span className="absolute -right-5 -top-7 font-serif text-[88px] font-light text-white/45">{location.icon}</span><span className="relative rounded-full bg-white/60 px-2.5 py-1 text-[10px] text-muted-foreground">{location.tag}</span><div className="relative mt-14"><h4 className="font-serif text-lg">{location.name}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{location.desc}</p></div></button>)}</div>
  </div></div>;
}

function RightPanel({ story, profile, connected, protocol, onSettings }: { story: StoryState; profile: PlayerProfile; connected: boolean; protocol: ModelConfig['protocol']; onSettings: () => void }) {
  return <aside className="hidden border-l border-border/80 bg-card/42 p-5 xl:block">
    <div className="mb-5 flex items-center justify-between"><p className="font-serif text-sm tracking-[.08em]">此刻 · {story.place}</p><span className="rounded-full bg-[#fff0e7] px-2.5 py-1 text-[10px] text-[#a36854]">第 {story.chapter} 章</span></div>
    <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7688a8] via-[#9bbac2] to-[#dfa891] p-5 text-white shadow-[0_18px_34px_rgba(104,116,151,.20)]"><div className="resonance-rings smaller" aria-hidden="true" /><p className="relative text-[10px] uppercase tracking-[.22em] text-white/75">Wish resonance</p><p className="relative mt-8 font-serif text-xl leading-8">{story.paragraphs[0]?.slice(0, 42)}{(story.paragraphs[0]?.length || 0) > 42 ? '……' : ''}</p><div className="relative mt-6 flex items-center gap-2 text-[11px] text-white/80"><Waves className="size-4" />世界线轻微偏移</div></div>
    <div className="mt-5 space-y-3 rounded-[20px] border border-border/70 bg-card/75 p-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">许愿回响</span><b className="text-primary">{story.wish}%</b></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-[#a19abb] to-[#dc9e88] transition-[width] duration-700" style={{ width: `${story.wish}%` }} /></div><div className="grid grid-cols-2 gap-2 pt-1 text-[11px]"><span className="rounded-xl bg-muted/60 p-2.5"><Flame className="mb-2 size-4 text-[#d6876f]" />情绪<b className="mt-1 block truncate text-foreground">{story.mood}</b></span><span className="rounded-xl bg-muted/60 p-2.5"><Sparkles className="mb-2 size-4 text-primary" />线索<b className="mt-1 block truncate text-foreground">{story.clue}</b></span></div></div>
    <div className="mt-4 rounded-[20px] border border-border/70 bg-card/75 p-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-primary/10 font-serif text-primary">{profile.name?.slice(0, 1) || '你'}</span><div><p className="text-xs font-medium">{profile.name || '未命名玩家'}</p><p className="text-[10px] text-muted-foreground">{profile.city || '城市未填写'}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[10px]"><span className="text-muted-foreground">模型协议</span><span className={`inline-flex items-center gap-1 ${connected ? 'text-[#5d8578]' : 'text-[#a16f66]'}`}><Wifi className="size-3" />{connected ? protocol.toUpperCase() : '未连接'}</span></div></div>
    <Button variant="outline" className="mt-4 h-10 w-full rounded-xl bg-card/70" onClick={onSettings}><Settings2 />连接你的 AI 模型</Button>
  </aside>;
}

function ModelSettings({ open, onOpenChange, config, setConfig, apiKey, setApiKey, changeProtocol, testState, onTest, onReset }: {
  open: boolean; onOpenChange: (open: boolean) => void; config: ModelConfig; setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  apiKey: string; setApiKey: (value: string) => void; changeProtocol: (value: ModelConfig['protocol']) => void;
  testState: 'idle' | 'testing' | 'success' | 'error'; onTest: () => void; onReset: () => void;
}) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[min(440px,94vw)] overflow-y-auto border-l border-border bg-[#fbf9fc] p-0 sm:max-w-[440px]">
    <SheetHeader className="border-b border-border/70 px-6 py-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-4" /></span><div><SheetTitle>连接 AI 模型</SheetTitle><SheetDescription className="mt-1 text-xs">由每位玩家填写自己的模型服务</SheetDescription></div></div></SheetHeader>
    <div className="space-y-6 px-6 pb-8 pt-5">
      <section><p className="mb-3 text-[11px] font-medium uppercase tracking-[.14em] text-muted-foreground">接口协议</p><div className="grid grid-cols-3 gap-2">{(['openai', 'anthropic', 'gemini'] as const).map((value) => <button key={value} onClick={() => changeProtocol(value)} className={`rounded-xl border px-2 py-2.5 text-xs transition ${config.protocol === value ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-card hover:border-primary/20'}`}>{value === 'openai' ? 'OpenAI 兼容' : value === 'anthropic' ? 'Claude' : 'Gemini'}</button>)}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">OpenAI 兼容适用于 OpenAI、DeepSeek、OpenRouter、硅基流动及多数中转站。</p></section>
      <section className="space-y-4"><Field label="模型名称"><Input value={config.model} onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))} placeholder="例如：gpt-4.1-mini" className="h-10 rounded-xl bg-card" autoComplete="off" /></Field><Field label="API Key"><Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" className="h-10 rounded-xl bg-card" autoComplete="off" /></Field><Field label="API Base URL"><Input value={config.baseUrl} onChange={(event) => setConfig((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://api.example.com/v1" className="h-10 rounded-xl bg-card" autoComplete="url" /></Field><Field label="API 路径"><Input value={config.apiPath} onChange={(event) => setConfig((current) => ({ ...current, apiPath: event.target.value }))} placeholder="/chat/completions" className="h-10 rounded-xl bg-card font-mono text-xs" autoComplete="off" /><p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">Gemini 路径可使用 {'{model}'} 占位符。</p></Field></section>
      <section><p className="mb-3 text-[11px] font-medium uppercase tracking-[.14em] text-muted-foreground">连接方式</p><NativeSelect value={config.transport} onChange={(event) => setConfig((current) => ({ ...current, transport: event.target.value as ModelConfig['transport'] }))} className="w-full"><NativeSelectOption value="relay">本站安全中转（解决 CORS）</NativeSelectOption><NativeSelectOption value="direct">浏览器直连（服务需允许 CORS）</NativeSelectOption></NativeSelect><div className="mt-3 rounded-xl bg-[#eef3f4] px-3 py-2.5 text-[11px] leading-5 text-[#58727a]"><ShieldCheck className="mr-1.5 inline size-4" />{config.transport === 'relay' ? 'Key 仅随当前请求转发，不写入服务器日志或数据库；中转拒绝内网地址、重定向和非 HTTPS 目标。' : '请求从浏览器直接发往模型服务，本站不经过 Key；如果遇到 CORS 报错，请切换到安全中转。'}</div></section>
      <section className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3"><div><p className="text-xs font-medium">在此设备记住 Key</p><p className="mt-1 text-[10px] text-muted-foreground">关闭时只保留在当前页面内存</p></div><Switch checked={config.rememberKey} onCheckedChange={(checked) => setConfig((current) => ({ ...current, rememberKey: checked }))} aria-label="在此设备记住 API Key" /></section>
      <div className="flex gap-2"><Button className="h-10 flex-1 rounded-xl" onClick={onTest} disabled={testState === 'testing'}>{testState === 'testing' ? <LoaderCircle className="animate-spin" /> : testState === 'success' ? <Check /> : <RefreshCw />}{testState === 'testing' ? '正在测试' : testState === 'success' ? '再次测试' : '测试连接'}</Button><Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>保存设置</Button></div>
      <div className="border-t border-border pt-5"><button onClick={onReset} className="flex items-center gap-2 text-xs text-[#a15f59] hover:underline"><Trash2 className="size-4" />清除本设备全部数据并重新开始</button></div>
    </div>
  </SheetContent></Sheet>;
}
