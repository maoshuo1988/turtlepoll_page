/**
 * 文件说明：龟战 Arena - 对战大厅。
 * 完全按概念图重做：pixel arena hero + 双 CTA + 我的阵容 + 排行榜 +
 * 右侧（限时活动 / 公告 / 精彩对战 / 自定义对战）+ 底部赛季奖励条。
 *
 * 触发：快速匹配 → 深海闯关 iframe（游戏本体已有，复用 qb-dungeon 自动点击）。
 *      排位赛 → 在线模式占位，暂未开放。
 */
import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ChevronRight,
  Crown,
  Maximize2,
  Megaphone,
  Play,
  PlusCircle,
  Settings2,
  Sparkles,
  Star,
  Sword,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { ARENA_SEASON, mockArenaTurtles, type ArenaTurtle } from '../../data/arenaMockData';

// ============================================================================
// 资源 / 常量
// ============================================================================

const TURTLE_BATTLE_GAME_URL = '/games/turtle-arena-game/index.html';

interface LineupSlot {
  turtleId: string;
  role: '防御型' | '均衡型' | '输出型' | '辅助型' | '控制型';
  isLeader?: boolean;
}

interface Lineup {
  name: string;
  slots: LineupSlot[];
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  rating: number;
  isMe?: boolean;
  turtleId?: string;
}

interface TimedEvent {
  id: string;
  title: string;
  subtitle: string;
  highlight: string;
  endsAt: number;
  thumbnail: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
}

interface FeaturedMatchup {
  left: { name: string; turtleId: string };
  right: { name: string; turtleId: string };
}

interface SeasonRewardTier {
  name: string;
  rating: number;
  emblem: string;
  tone: 'gold' | 'platinum' | 'diamond';
}

// ============================================================================
// Mock 数据
// ============================================================================

const LINEUPS: Lineup[] = [
  {
    name: '主力阵容',
    slots: [
      { turtleId: 'ice',     role: '防御型' },
      { turtleId: 'bamboo',  role: '均衡型', isLeader: true },
      { turtleId: 'lava',    role: '输出型' },
    ],
  },
  {
    name: '突击阵容',
    slots: [
      { turtleId: 'ninja',   role: '输出型', isLeader: true },
      { turtleId: 'lightning', role: '输出型' },
      { turtleId: 'angel',   role: '辅助型' },
    ],
  },
  {
    name: '坚守阵容',
    slots: [
      { turtleId: 'stone',   role: '防御型', isLeader: true },
      { turtleId: 'diamond', role: '防御型' },
      { turtleId: 'fortune', role: '辅助型' },
    ],
  },
];

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: '龟霸天',    rating: 2120, turtleId: 'phoenix' },
  { rank: 2, name: '海龟王',    rating: 2089, turtleId: 'shell' },
  { rank: 3, name: 'TurtleKing', rating: 2056, turtleId: 'cyber' },
  { rank: 4, name: '龟仙人',    rating: 1860, isMe: true, turtleId: 'rainbow' },
];

const TIMED_EVENT: TimedEvent = {
  id: 'deep-sea-explore',
  title: '深海探险',
  subtitle: '限时活动进行中',
  highlight: '赢取稀有皮肤！',
  endsAt: Date.now() + (2 * 24 * 60 * 60 + 14 * 60 * 60 + 23 * 60 + 8) * 1000,
  thumbnail: '/games/turtle-battle/assets/avatars/crystal.png',
};

const ANNOUNCEMENTS: AnnouncementItem[] = [
  { id: 'a1', title: '赛季更新公告',  date: '06/20' },
  { id: 'a2', title: '全新技能上线',  date: '06/18' },
  { id: 'a3', title: '平衡性调整说明', date: '06/15' },
];

const FEATURED_MATCHUP: FeaturedMatchup = {
  left:  { name: '冰甲龟', turtleId: 'ice' },
  right: { name: '熔岩龟', turtleId: 'lava' },
};

const SEASON_TIERS: SeasonRewardTier[] = [
  { name: '黄金 III', rating: 2800, emblem: '🥇', tone: 'gold' },
  { name: '黄金 II',  rating: 3200, emblem: '🥇', tone: 'gold' },
  { name: '黄金 I',   rating: 3600, emblem: '🥇', tone: 'gold' },
  { name: '铂金 V',   rating: 4400, emblem: '💎', tone: 'platinum' },
  { name: '铂金 V',   rating: 4800, emblem: '💎', tone: 'platinum' },
];

// ============================================================================
// 工具
// ============================================================================

type BattleMode = '快速匹配' | '排位赛';

const turtleById = (id: string): ArenaTurtle | undefined => mockArenaTurtles.find((t) => t.id === id);

const ROLE_TONE: Record<LineupSlot['role'], string> = {
  防御型: 'text-sky-300',
  均衡型: 'text-emerald-300',
  输出型: 'text-rose-300',
  辅助型: 'text-violet-300',
  控制型: 'text-amber-300',
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return d > 0 ? `${d}天 ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ============================================================================
// 主组件
// ============================================================================

export function BattleLobbySection() {
  const [activeLineup, setActiveLineup] = useState(0);
  const [playingMode, setPlayingMode] = useState<BattleMode | null>(null);
  const [rankedToast, setRankedToast] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 快速匹配：自动点击游戏内深海闯关入口
  useEffect(() => {
    if (playingMode !== '快速匹配') return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;
    let attempts = 0;

    const tick = () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const splash = doc.getElementById('splash');
          const splashGone = !splash || splash.classList.contains('hide') ||
            parseFloat((doc.defaultView ?? window).getComputedStyle(splash).opacity || '1') < 0.05;
          if (splashGone) {
            const btn = doc.querySelector<HTMLElement>('[data-action="qb-dungeon"]');
            if (btn) {
              const win = doc.defaultView ?? window;
              const opts: MouseEventInit = { bubbles: true, cancelable: true, composed: true, view: win };
              btn.dispatchEvent(new MouseEvent('pointerdown', opts));
              btn.dispatchEvent(new MouseEvent('mousedown', opts));
              btn.dispatchEvent(new MouseEvent('pointerup', opts));
              btn.dispatchEvent(new MouseEvent('mouseup', opts));
              btn.dispatchEvent(new MouseEvent('click', opts));
              (btn as HTMLButtonElement).click?.();
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[arena] quick-match auto enter failed:', err);
      }
      if (attempts < 240) window.setTimeout(tick, 250);
    };

    const onLoad = () => window.setTimeout(tick, 300);
    iframe.addEventListener('load', onLoad);
    window.setTimeout(tick, 250);
    return () => {
      cancelled = true;
      iframe.removeEventListener('load', onLoad);
    };
  }, [playingMode]);

  // 排位赛点击：弹"未开放"提示后自动消失
  useEffect(() => {
    if (!rankedToast) return;
    const id = window.setTimeout(() => setRankedToast(false), 2800);
    return () => window.clearTimeout(id);
  }, [rankedToast]);

  // 对战中：iframe 全屏面板
  if (playingMode === '快速匹配') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/14 via-emerald-500/8 to-transparent px-4 py-2.5">
          <div className="flex items-center gap-2 text-[12px] text-emerald-100">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-emerald-300/40 bg-emerald-500/22">
              <Swords size={14} />
            </span>
            <span className="font-bold">快速匹配 · 深海闯关</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => iframeRef.current?.requestFullscreen?.()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/75 hover:bg-white/12"
            >
              <Maximize2 size={12} /> 全屏
            </button>
            <button
              type="button"
              onClick={() => setPlayingMode(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/14 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/24"
            >
              <X size={12} /> 退出对战
            </button>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#02040a] shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
          style={{ height: 'min(calc(100vh - 200px), 900px)', minHeight: 520 }}
        >
          <iframe
            ref={iframeRef}
            title="龟龟对战 · 深海闯关"
            src={TURTLE_BATTLE_GAME_URL}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; gamepad *"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // ============= 大厅主视图 =============
  return (
    <div className="space-y-4">
      {/* Toast：排位赛未开放 */}
      {rankedToast ? (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2">
          <div className="rounded-2xl border border-amber-400/45 bg-gradient-to-r from-amber-500/30 to-orange-500/30 px-5 py-3 text-[13px] font-bold text-amber-50 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_22px_rgba(251,191,36,0.4)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-200" />
              <span>排位赛 · 在线模式</span>
              <span className="text-amber-200/85">即将开放</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Section title */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">
          龟战竞技场 <span className="text-amber-300">{ARENA_SEASON.name}</span>
        </h2>
        <span className="text-[12px] text-white/55">赛季时间：{ARENA_SEASON.range}</span>
      </div>

      {/* 主体两栏：左 Hero + 右栏 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* 左主列 */}
        <div className="space-y-4">
          <ArenaHero
            onQuickMatch={() => setPlayingMode('快速匹配')}
            onRanked={() => setRankedToast(true)}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MyLineupCard
              lineups={LINEUPS}
              activeIndex={activeLineup}
              onSelect={setActiveLineup}
            />
            <LeaderboardCard entries={LEADERBOARD} />
          </div>
        </div>

        {/* 右栏 */}
        <div className="space-y-3">
          <TimedEventCard event={TIMED_EVENT} />
          <AnnouncementsCard items={ANNOUNCEMENTS} />
          <FeaturedBattleCard matchup={FEATURED_MATCHUP} />
          <CustomBattleCard />
        </div>
      </div>

      {/* 底部：赛季奖励条 */}
      <SeasonRewardsBar tiers={SEASON_TIERS} currentRating={ARENA_SEASON.myPoints} />
    </div>
  );
}

// ============================================================================
// Hero：pixel arena 舞台
// ============================================================================

function ArenaHero({ onQuickMatch, onRanked }: { onQuickMatch: () => void; onRanked: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/40 shadow-[0_20px_44px_rgba(0,0,0,0.55),0_0_22px_rgba(251,191,36,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]">
      {/* 像素艺术背景图 */}
      <div className="relative" style={{ aspectRatio: '1620 / 880' }}>
        <img
          src="/assets/arena/lobby-bg.png"
          alt="龟战 ARENA"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] }}
        />

        {/* 底部柔和 vignette，让下方 CTA 条衔接自然 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent"
        />

        {/* 热区：左侧 快速匹配 红旗 */}
        <button
          type="button"
          onClick={onQuickMatch}
          aria-label="快速匹配"
          className="group absolute focus:outline-none"
          style={{ left: '11.5%', top: '43%', width: '14%', height: '25%' }}
        >
          {/* hover 高光 */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg ring-2 ring-amber-300/0 transition-all duration-200 group-hover:bg-amber-400/12 group-hover:ring-amber-300/55 group-hover:shadow-[0_0_28px_rgba(251,191,36,0.5)] group-focus:bg-amber-400/12 group-focus:ring-amber-300/55"
          />
          {/* hover 提示徽章 */}
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/55 bg-black/85 px-2.5 py-0.5 text-[11px] font-bold text-amber-100 opacity-0 shadow-[0_4px_14px_rgba(0,0,0,0.55)] transition-opacity group-hover:opacity-100"
          >
            点击进入 · 深海闯关
          </span>
        </button>

        {/* 热区：右侧 排位赛 紫旗 */}
        <button
          type="button"
          onClick={onRanked}
          aria-label="排位赛"
          className="group absolute focus:outline-none"
          style={{ left: '74%', top: '43%', width: '14%', height: '25%' }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg ring-2 ring-violet-300/0 transition-all duration-200 group-hover:bg-violet-400/12 group-hover:ring-violet-300/55 group-hover:shadow-[0_0_28px_rgba(167,139,250,0.5)] group-focus:bg-violet-400/12 group-focus:ring-violet-300/55"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-violet-300/55 bg-black/85 px-2.5 py-0.5 text-[11px] font-bold text-violet-100 opacity-0 shadow-[0_4px_14px_rgba(0,0,0,0.55)] transition-opacity group-hover:opacity-100"
          >
            排位赛 · 即将开放
          </span>
        </button>

        {/* 顶部状态条 · 浮在右上角 */}
        <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-1.5 rounded-full border border-emerald-400/45 bg-black/55 px-2.5 py-1 text-[10px] font-bold text-emerald-200 backdrop-blur-sm md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: 'arena-pulse 1.8s ease-in-out infinite' }} />
          赛季进行中 · {ARENA_SEASON.name}
        </div>
      </div>

      {/* 底部小提示：移动端没法看清旗帜热区时给个补充 */}
      <div className="grid grid-cols-2 gap-2 border-t-2 border-amber-500/30 bg-gradient-to-r from-black/50 via-black/40 to-black/50 px-3 py-2.5 sm:hidden">
        <button
          type="button"
          onClick={onQuickMatch}
          className="rounded-lg border-2 border-amber-300/55 bg-gradient-to-b from-[#f59e0b] via-[#b45309] to-[#7c2d12] py-2 text-[13px] font-black text-amber-50 shadow-[0_4px_10px_rgba(251,191,36,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]"
        >
          快速匹配
        </button>
        <button
          type="button"
          onClick={onRanked}
          className="rounded-lg border-2 border-violet-300/55 bg-gradient-to-b from-[#a855f7] via-[#7e22ce] to-[#4c1d95] py-2 text-[13px] font-black text-violet-50 shadow-[0_4px_10px_rgba(167,139,250,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]"
        >
          排位赛
        </button>
      </div>

      {/* 桌面端：图下方加一条说明带 */}
      <div className="hidden items-center justify-between border-t-2 border-amber-500/30 bg-black/45 px-5 py-2.5 text-[12px] backdrop-blur-sm sm:flex">
        <span className="inline-flex items-center gap-1.5 text-amber-100/85">
          <Sparkles size={12} className="text-amber-300" />
          点击 <span className="font-bold text-amber-200">左侧旗帜</span> 进入快速匹配
        </span>
        <span className="inline-flex items-center gap-1.5 text-violet-100/85">
          <Crown size={12} className="text-violet-300" />
          <span className="font-bold text-violet-200">右侧旗帜</span> · 排位赛即将开放
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 我的阵容
// ============================================================================

function MyLineupCard({
  lineups,
  activeIndex,
  onSelect,
}: {
  lineups: Lineup[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const lineup = lineups[activeIndex];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1218] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sword size={14} className="text-amber-300" />
          <h3 className="text-[14px] font-bold text-white">我的阵容</h3>
        </div>
        <div className="flex gap-1">
          {lineups.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`grid h-7 w-7 place-items-center rounded-md text-[12px] font-bold transition-colors ${
                i === activeIndex
                  ? 'border border-emerald-400/55 bg-emerald-500/22 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                  : 'border border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/10'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {lineup.slots.map((slot) => {
          const turtle = turtleById(slot.turtleId);
          if (!turtle) return null;
          return (
            <div
              key={slot.turtleId}
              className={`relative overflow-hidden rounded-xl border ${slot.isLeader ? 'border-amber-400/55 shadow-[0_0_14px_rgba(251,191,36,0.32)]' : 'border-white/10'} bg-black/35 p-2`}
            >
              {slot.isLeader ? (
                <Crown size={11} className="absolute right-1.5 top-1.5 text-amber-300" />
              ) : null}
              <div className="grid h-16 place-items-center">
                <img
                  src={turtle.avatar}
                  alt={turtle.name}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] }}
                />
              </div>
              <div className="mt-1 text-center">
                <div className="text-[11px] font-bold text-white">{turtle.name}</div>
                <div className="text-[10px] text-amber-300 font-mono">Lv.{turtle.level}</div>
                <div className={`text-[10px] font-bold ${ROLE_TONE[slot.role]}`}>{slot.role}</div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] py-2 text-[12px] font-semibold text-white/75 transition-colors hover:bg-white/10"
      >
        <Settings2 size={12} />
        调整阵容
      </button>
    </div>
  );
}

// ============================================================================
// 排行榜
// ============================================================================

function LeaderboardCard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1218] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={14} className="text-amber-300" />
        <h3 className="text-[14px] font-bold text-white">排行榜</h3>
      </div>

      <div className="space-y-1.5">
        {entries.map((row) => {
          const t = row.turtleId ? turtleById(row.turtleId) : undefined;
          const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : '';
          return (
            <div
              key={row.rank}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
                row.isMe
                  ? 'border-emerald-400/55 bg-emerald-500/12 shadow-[inset_0_0_18px_rgba(16,185,129,0.18)]'
                  : 'border-white/8 bg-white/[0.025]'
              }`}
            >
              <span className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold ${
                row.rank <= 3 ? '' : 'bg-white/8 text-white/65'
              }`}>
                {medal || row.rank}
              </span>
              {t ? (
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="h-7 w-7 object-contain"
                  style={{ imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] }}
                />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-md bg-white/8 text-[12px]">🐢</span>
              )}
              <span className={`flex-1 truncate text-[12px] font-semibold ${row.isMe ? 'text-emerald-100' : 'text-white/85'}`}>
                {row.name}
              </span>
              <span className={`tabular-nums text-[12px] font-bold ${row.isMe ? 'text-emerald-200' : 'text-amber-200'}`}>
                {row.rating}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/12 py-2 text-[12px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/22"
      >
        查看完整排行榜
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

// ============================================================================
// 右栏：限时活动
// ============================================================================

function TimedEventCard({ event }: { event: TimedEvent }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = event.endsAt - now;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#0a2333] via-[#091a26] to-[#06101a] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.32)]">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-cyan-200">
        <Sparkles size={11} />
        限时活动
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-black text-cyan-100">{event.title}</h4>
          <p className="mt-0.5 text-[11px] font-bold text-amber-300">{event.highlight}</p>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-cyan-200/65">剩余时间</div>
          <div className="font-mono text-[14px] font-black tabular-nums text-cyan-100">{formatCountdown(left)}</div>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-cyan-400/35 bg-black/40">
          <img
            src={event.thumbnail}
            alt={event.title}
            className="h-full w-full object-contain"
            style={{ imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] }}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-cyan-400/85" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/22" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/22" />
      </div>
    </div>
  );
}

// ============================================================================
// 右栏：公告
// ============================================================================

function AnnouncementsCard({ items }: { items: AnnouncementItem[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1218] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-white/75">
        <Megaphone size={11} className="text-amber-300" />
        公告
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-white/85">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="truncate">{it.title}</span>
            </span>
            <span className="font-mono text-[10px] text-white/45">{it.date}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/12 py-1.5 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/22"
      >
        查看更多
      </button>
    </div>
  );
}

// ============================================================================
// 右栏：精彩对战
// ============================================================================

function FeaturedBattleCard({ matchup }: { matchup: FeaturedMatchup }) {
  const left = turtleById(matchup.left.turtleId);
  const right = turtleById(matchup.right.turtleId);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1218] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-bold text-white/75">
          <Star size={11} className="text-amber-300" />
          精彩对战
        </span>
        <button className="inline-flex items-center gap-0.5 text-emerald-300 hover:text-emerald-200">
          更多 <ChevronRight size={11} />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <div className="grid h-14 w-14 place-items-center rounded-xl border border-sky-400/35 bg-sky-500/12">
            {left ? (
              <img src={left.avatar} alt={left.name} className="h-12 w-12 object-contain" style={{ imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] }} />
            ) : null}
          </div>
          <span className="text-[10px] font-bold text-sky-200">{matchup.left.name}</span>
        </div>
        <div className="text-center">
          <span className="font-mono text-[14px] font-black tracking-wider text-amber-300">VS</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="grid h-14 w-14 place-items-center rounded-xl border border-rose-400/35 bg-rose-500/12">
            {right ? (
              <img src={right.avatar} alt={right.name} className="h-12 w-12 object-contain" style={{ imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] }} />
            ) : null}
          </div>
          <span className="text-[10px] font-bold text-rose-200">{matchup.right.name}</span>
        </div>
      </div>
      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/12 py-1.5 text-[11px] font-bold text-amber-100 transition-colors hover:bg-amber-500/22"
      >
        <Play size={11} className="fill-current" />
        观看回放
      </button>
    </div>
  );
}

// ============================================================================
// 右栏：自定义对战
// ============================================================================

function CustomBattleCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/35 bg-gradient-to-br from-[#1c0d35] via-[#150826] to-[#0a0414] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.32)]">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/45 bg-violet-500/15 text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          <Swords size={18} />
        </span>
        <div>
          <h4 className="text-[14px] font-black text-violet-100">自定义对战</h4>
          <p className="text-[10.5px] text-violet-200/65">创建房间 / 好友对战</p>
        </div>
      </div>
      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-violet-300/55 bg-gradient-to-r from-violet-600 to-purple-700 py-2 text-[12px] font-black tracking-tight text-violet-50 shadow-[0_8px_22px_rgba(167,139,250,0.32),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform hover:scale-[1.01]"
      >
        <PlusCircle size={12} />
        创建房间
      </button>
    </div>
  );
}

// ============================================================================
// 底部：赛季奖励条
// ============================================================================

function SeasonRewardsBar({ tiers, currentRating }: { tiers: SeasonRewardTier[]; currentRating: number }) {
  const maxRating = tiers[tiers.length - 1]?.rating ?? currentRating;
  const minRating = (tiers[0]?.rating ?? 200) - 200;
  const progress = Math.min(100, Math.max(0, ((currentRating - minRating) / (maxRating - minRating)) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[linear-gradient(180deg,#241608_0%,#150c04_100%)] p-4 shadow-[0_14px_28px_rgba(0,0,0,0.4)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-amber-300" />
          <h3 className="text-[13px] font-bold text-amber-100">赛季奖励</h3>
          <span className="font-mono text-[10px] text-white/45">
            赛季结束倒计时：<span className="text-amber-200">58天</span>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-1.5">
          <span className="text-[20px]">🏆</span>
          <div className="leading-tight">
            <div className="text-[10px] text-amber-200/75">赛季终极奖励</div>
            <div className="text-[12px] font-black text-amber-100">传奇龟皮肤</div>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* 进度条 */}
        <div className="absolute left-0 right-0 top-[26px] h-1.5 rounded-full bg-black/45">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* 段位徽章 */}
        <div className="relative grid grid-cols-5 gap-2">
          {tiers.map((tier, i) => {
            const reached = currentRating >= tier.rating;
            return (
              <div key={i} className="flex flex-col items-center">
                <div className={`grid h-12 w-12 place-items-center rounded-xl border-2 ${
                  reached ? 'border-amber-400/55 bg-amber-500/14 shadow-[0_0_14px_rgba(251,191,36,0.4)]' : 'border-white/12 bg-white/[0.025]'
                }`}>
                  <span className={`text-[22px] ${reached ? '' : 'opacity-45 grayscale'}`}>{tier.emblem}</span>
                </div>
                <div className={`mt-1 text-[10px] font-bold ${reached ? 'text-amber-200' : 'text-white/50'}`}>{tier.name}</div>
                <div className={`font-mono text-[10px] ${reached ? 'text-amber-200/75' : 'text-white/40'}`}>{tier.rating}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
