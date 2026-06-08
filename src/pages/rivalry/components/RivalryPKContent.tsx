/**
 * 文件说明：Rivalry PK Content，开撕台对决核心业务实现。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Clock,
  Flame,
  History,
  Lock,
  MessageCircleMore,
  Shield,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { PKPhase, PKRoundResult, PKTopicState, RivalryNewsItem } from './rivalryTypes';
import { RivalryBetModal } from './RivalryBetModal';
import { HeroBattleRail } from './HeroBattleRail';
import {
  HERO_PK_GRID_MIN_HEIGHT,
  HERO_PK_MOBILE_GRID_MIN_HEIGHT,
  HERO_PK_MOBILE_STAGE_MAX_HEIGHT,
  HERO_PK_MOBILE_STAGE_MAX_WIDTH,
} from './heroPkLayout';
import { resolveHeroPkBackground, resolveRivalryMediaUrl } from './rivalryMedia';
import { useRequestPKHistory, useRequestPKSeasons, useRequestPKTopics } from '@/hooks/usePkRequests';
import type { PKRound as ApiPKRound, PKSeason as ApiPKSeason, PKTopicSummary } from '@/hooks/pkTypes';

interface RivalryPKProps {
  hero?: RivalryNewsItem;
  items?: RivalryNewsItem[];
  userVotes?: Record<string, 'A' | 'B'>;
  onBet?: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => Promise<void> | void;
  onEnterBattle?: (item: RivalryNewsItem) => void;
  pendingBetId?: string | null;
}

type RivalryPKState = PKTopicState & {
  apiTopicId?: number | string;
  isApi?: boolean;
  mySide?: 'A' | 'B';
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80',
  'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=900&q=80',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900&q=80',
];

type RivalryVisualTheme = {
  sideA: {
    primary: string;
    accent: string;
    soft: string;
    portrait: string;
  };
  sideB: {
    primary: string;
    accent: string;
    soft: string;
    portrait: string;
  };
};

function buildPortrait({
  label,
  emoji,
  start,
  end,
  glow,
}: {
  label: string;
  emoji: string;
  start: string;
  end: string;
  glow: string;
}) {
  const initial = label.slice(0, 2).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
        <radialGradient id="halo" cx="75%" cy="28%" r="62%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.9" />
          <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="240" rx="34" fill="url(#bg)" />
      <rect x="12" y="12" width="216" height="216" rx="28" fill="none" stroke="rgba(255,255,255,0.24)" />
      <circle cx="182" cy="62" r="74" fill="url(#halo)" />
      <circle cx="66" cy="174" r="54" fill="${glow}" fill-opacity="0.18" />
      <text x="26" y="62" fill="rgba(255,255,255,0.94)" font-size="42" font-family="Arial, sans-serif" font-weight="700">${emoji}</text>
      <text x="24" y="160" fill="rgba(255,255,255,0.98)" font-size="78" font-family="Arial, sans-serif" font-weight="900">${initial}</text>
      <text x="26" y="198" fill="rgba(255,255,255,0.64)" font-size="18" font-family="Arial, sans-serif" letter-spacing="3">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createTheme(
  sideA: { label: string; emoji: string; primary: string; accent: string; end?: string },
  sideB: { label: string; emoji: string; primary: string; accent: string; end?: string },
): RivalryVisualTheme {
  return {
    sideA: {
      primary: sideA.primary,
      accent: sideA.accent,
      soft: `${sideA.primary}22`,
      portrait: buildPortrait({
        label: sideA.label,
        emoji: sideA.emoji,
        start: sideA.primary,
        end: sideA.end ?? '#08111f',
        glow: sideA.accent,
      }),
    },
    sideB: {
      primary: sideB.primary,
      accent: sideB.accent,
      soft: `${sideB.primary}22`,
      portrait: buildPortrait({
        label: sideB.label,
        emoji: sideB.emoji,
        start: sideB.primary,
        end: sideB.end ?? '#08111f',
        glow: sideB.accent,
      }),
    },
  };
}

const defaultRivalryTheme = createTheme(
  { label: 'A', emoji: '⚔️', primary: '#1dbfd0', accent: '#5df3d7', end: '#10273d' },
  { label: 'B', emoji: '🔥', primary: '#A2343B', accent: '#ff6f8f', end: '#35131a' },
);

function getPresetRivalryTheme(item: RivalryNewsItem): RivalryVisualTheme {
  const text = `${item.title} ${item.optionA} ${item.optionB}`.toLowerCase();

  if (item.id === 'pk-hero' || text.includes('梅西') || text.includes('c罗')) {
    return createTheme(
      { label: item.optionA, emoji: '🐐', primary: '#14b8a6', accent: '#67e8f9', end: '#0f2f35' },
      { label: item.optionB, emoji: '👑', primary: '#ef4444', accent: '#fda4af', end: '#3b0f19' },
    );
  }
  if (text.includes('中国') || text.includes('美国')) {
    return createTheme(
      { label: item.optionA, emoji: '🐉', primary: '#dc2626', accent: '#f87171', end: '#4c0519' },
      { label: item.optionB, emoji: '🦅', primary: '#2563eb', accent: '#93c5fd', end: '#172554' },
    );
  }
  if (text.includes('iphone') || text.includes('安卓')) {
    return createTheme(
      { label: item.optionA, emoji: '📱', primary: '#7c3aed', accent: '#c4b5fd', end: '#2e1065' },
      { label: item.optionB, emoji: '🤖', primary: '#16a34a', accent: '#86efac', end: '#052e16' },
    );
  }
  if (text.includes('漫威') || text.includes('dc')) {
    return createTheme(
      { label: item.optionA, emoji: '🦸', primary: '#b91c1c', accent: '#fca5a5', end: '#450a0a' },
      { label: item.optionB, emoji: '🦇', primary: '#1d4ed8', accent: '#93c5fd', end: '#172554' },
    );
  }
  if (text.includes('faker') || text.includes('uzi')) {
    return createTheme(
      { label: item.optionA, emoji: '🎮', primary: '#f97316', accent: '#fdba74', end: '#431407' },
      { label: item.optionB, emoji: '⚡', primary: '#ec4899', accent: '#f9a8d4', end: '#500724' },
    );
  }
  if (text.includes('猫') || text.includes('狗')) {
    return createTheme(
      { label: item.optionA, emoji: '🐱', primary: '#f59e0b', accent: '#fde68a', end: '#451a03' },
      { label: item.optionB, emoji: '🐶', primary: '#0ea5e9', accent: '#7dd3fc', end: '#082f49' },
    );
  }
  if (text.includes('张元英') || text.includes('柳智敏')) {
    return createTheme(
      { label: item.optionA, emoji: '✨', primary: '#f472b6', accent: '#fbcfe8', end: '#831843' },
      { label: item.optionB, emoji: '💿', primary: '#8b5cf6', accent: '#ddd6fe', end: '#4c1d95' },
    );
  }

  return defaultRivalryTheme;
}

function normalizeThemeColor(value?: string) {
  const trimmed = value?.trim();
  return trimmed && /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : undefined;
}

function getRivalryVisualTheme(item: RivalryNewsItem): RivalryVisualTheme {
  const preset = getPresetRivalryTheme(item);
  const sideAColor = normalizeThemeColor(item.sideABgColor);
  const sideBColor = normalizeThemeColor(item.sideBBgColor);

  return {
    sideA: {
      ...preset.sideA,
      primary: sideAColor ?? preset.sideA.primary,
      accent: sideAColor ?? preset.sideA.accent,
      soft: sideAColor ? `${sideAColor}22` : preset.sideA.soft,
      portrait: item.sideABgImage?.trim() || preset.sideA.portrait,
    },
    sideB: {
      ...preset.sideB,
      primary: sideBColor ?? preset.sideB.primary,
      accent: sideBColor ?? preset.sideB.accent,
      soft: sideBColor ? `${sideBColor}22` : preset.sideB.soft,
      portrait: item.sideBBgImage?.trim() || preset.sideB.portrait,
    },
  };
}

function pad(value: number) {
  return String(Math.floor(value)).padStart(2, '0');
}

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

/** 阵营热度合计为 100% 的占比（与对抗条宽度严格一致）。 */
function heatSharePct(heatA: number, heatB: number): { pctA: number; pctB: number } {
  const a = Math.max(0, heatA);
  const b = Math.max(0, heatB);
  const sum = a + b;
  if (sum <= 0) return { pctA: 50, pctB: 50 };
  const pctA = Math.min(100, Math.max(0, Math.round((a / sum) * 100)));
  return { pctA, pctB: 100 - pctA };
}

function formatPkHeatValue(n: number): string {
  if (Number.isFinite(n) && (n >= 100 || Number.isInteger(n))) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return Number.isFinite(n) ? n.toFixed(1) : '0';
}

function formatShortDate(value?: number) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizePhase(phase?: string): PKPhase {
  if (phase === 'betting' || phase === 'locked' || phase === 'cooldown') return phase;
  return 'cooldown';
}

function mapRound(round: ApiPKRound): PKRoundResult {
  const heatA = asNumber(round.heatA);
  const heatB = asNumber(round.heatB);
  return {
    round: asNumber(round.roundNo, 0),
    heatA,
    heatB,
    winner: round.winner === 'A' ? 'A' : 'B',
    betCountA: asNumber(round?.betCountA),
    betCountB: asNumber(round?.betCountB),
    commentCount: 0,
    likeCount: 0,
  };
}

function calcRoundStats(rounds: PKRoundResult[]) {
  let longestA = 0;
  let longestB = 0;
  let currentA = 0;
  let currentB = 0;
  let winsA = 0;
  let winsB = 0;

  rounds.forEach((round) => {
    if (round.winner === 'A') {
      winsA += 1;
      currentA += 1;
      currentB = 0;
      longestA = Math.max(longestA, currentA);
    } else {
      winsB += 1;
      currentB += 1;
      currentA = 0;
      longestB = Math.max(longestB, currentB);
    }
  });

  const last = rounds[rounds.length - 1];
  return {
    winsA,
    winsB,
    longestA,
    longestB,
    currentStreakSide: last?.winner ?? 'A',
    currentStreak: last?.winner === 'B' ? currentB : currentA,
  };
}

function mapSeason(season: ApiPKSeason | undefined, rounds: PKRoundResult[]) {
  const stats = calcRoundStats(rounds);
  const champion: 'A' | 'B' | null = season?.champion === 'A' || season?.champion === 'B' ? season.champion : null;
  return {
    season: asNumber(season?.seasonNo, 1),
    startDate: formatShortDate(season?.startTime),
    endDate: formatShortDate(season?.endTime),
    totalRounds: rounds.length || asNumber(season?.winsA) + asNumber(season?.winsB),
    winsA: asNumber(season?.winsA, stats.winsA),
    winsB: asNumber(season?.winsB, stats.winsB),
    champion,
  };
}

function mapTopicSummaryToPK(summary: PKTopicSummary, index: number): RivalryPKState | null {
  const topic = summary.topic;
  if (!topic?.id) return null;

  const round = summary.round;
  const season = summary.season;
  const now = Date.now();
  const countdownMs = asNumber(summary.countdownSeconds) * 1000;
  const roundHistory: PKRoundResult[] = [];
  const mappedSeason = mapSeason(season, roundHistory);
  const title = topic.title || `开撕话题 ${topic.id}`;
  const sideA = topic.sideAName || '正方';
  const sideB = topic.sideBName || '反方';
  const heatA = asNumber(round?.heatA);
  const heatB = asNumber(round?.heatB);
  const topicExtra = topic as typeof topic & Record<string, unknown>;
  const coverUrl = [topic.cover, topicExtra.coverUrl, topicExtra.cover_image]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?.trim();
  const listUrl = [topic.listImage, topicExtra?.list_image]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?.trim();
  const displayImage =
    resolveRivalryMediaUrl(coverUrl) ||
    resolveRivalryMediaUrl(listUrl) ||
    fallbackImages[index % fallbackImages.length];

  return {
    id: String(topic.id),
    apiTopicId: topic.id,
    isApi: true,
    newsItem: {
      id: String(topic.id),
      marketId: Number(topic.id),
      title,
      summary: summary.streakStatus || '',
      image: displayImage,
      coverImage: coverUrl || undefined,
      listImage: listUrl || coverUrl || undefined,
      sideABgImage: topic.sideABgImage?.trim(),
      sideBBgImage: topic.sideBBgImage?.trim(),
      sideABgColor: topic.sideABgColor?.trim(),
      sideBBgColor: topic.sideBBgColor?.trim(),
      type: 'rivalry',
      votes: { A: Math.round(heatA), B: Math.round(heatB) },
      optionA: sideA,
      optionB: sideB,
      oddsA: summary.oddsA ?? 1,
      oddsB: summary.oddsB ?? 1,
      status: round?.phase === 'betting' ? 'open' : 'closed',
    },
    currentRound: asNumber(round?.roundNo, 1),
    phase: normalizePhase(round?.phase),
    roundStartTime: round?.startTime ?? now,
    roundEndTime: round?.endTime ?? (countdownMs ? now + countdownMs : now),
    lockTime: round?.lockTime ?? (countdownMs ? now + countdownMs : now),
    nextRoundTime: round?.nextRoundTime,
    currentHeatA: heatA,
    currentHeatB: heatB,
    betCountA: asNumber(round?.betCountA),
    betCountB: asNumber(round?.betCountB),
    roundHistory,
    season: mappedSeason,
    history: {
      totalRounds: mappedSeason.totalRounds,
      totalWinsA: mappedSeason.winsA,
      totalWinsB: mappedSeason.winsB,
      longestStreakA: 0,
      longestStreakB: 0,
      currentStreakSide: summary.leader === 'B' ? 'B' : 'A',
      currentStreak: 0,
      seasons: [mappedSeason],
    },
    lastRoundWinner: undefined,
    mySide: summary.mySide,
  };
}

function Countdown({ target, label, color }: { target: number; label: string; color: string }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const updateLeft = () => setLeft(Math.max(0, target - Date.now()));
    updateLeft();
    const timer = setInterval(updateLeft, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      <Clock size={12} className={color} />
      <span className={`font-semibold ${color}`}>{label}</span>
      <span className={`${color} font-bold`}>{pad(h)}:{pad(m)}:{pad(s)}</span>
    </div>
  );
}

function PhaseTag({ phase }: { phase: PKPhase }) {
  if (phase === 'betting') {
    return <span className="flex items-center gap-1 rounded-full border border-[#39e8c8]/26 bg-[#123a3d]/82 px-2 py-0.5 text-[10px] font-bold text-[#9affec]"><Zap size={10} />下注中</span>;
  }
  if (phase === 'locked') {
    return <span className="flex items-center gap-1 rounded-full border border-[#ff5f7e]/25 bg-[#4a1824]/82 px-2 py-0.5 text-[10px] font-bold text-[#ffb9c6]"><Lock size={10} />锁局中</span>;
  }
  return <span className="flex items-center gap-1 rounded-full border border-[#f1c27d]/25 bg-[#463420]/82 px-2 py-0.5 text-[10px] font-bold text-[#f1c27d]"><Clock size={10} />冷却中</span>;
}

function RivalryHeatMeter({
  heatA,
  heatB,
  theme,
  variant,
}: {
  heatA: number;
  heatB: number;
  theme: RivalryVisualTheme;
  variant: 'hero' | 'compact';
}) {
  const { pctA, pctB } = heatSharePct(heatA, heatB);
  const splitStyle = pctA > 0 && pctB > 0 ? ({ left: `${pctA}%` } as React.CSSProperties) : undefined;

  return (
    <div className={variant === 'hero' ? 'space-y-2' : ''}>
      {variant === 'hero' ? (
        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold tabular-nums tracking-tight">
          <span style={{ color: theme.sideA.accent }}>{pctA}%</span>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">阵营热度</span>
          <span style={{ color: theme.sideB.accent }}>{pctB}%</span>
        </div>
      ) : null}
      <div
        className={
          variant === 'hero'
            ? 'relative h-4 w-full overflow-hidden rounded-full bg-black/35 p-[3px] ring-1 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/12'
        }
      >
        <div className={variant === 'hero' ? 'relative h-full w-full overflow-hidden rounded-full bg-white/[0.05]' : 'relative h-full w-full overflow-hidden rounded-full'}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-l-full shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)]"
            style={{ background: `linear-gradient(90deg, ${theme.sideA.primary}, ${theme.sideA.accent})` }}
            initial={false}
            animate={{ width: `${pctA}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 24 }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 rounded-r-full shadow-[inset_0_-1px_0_rgba(0,0,0,0.22)]"
            style={{ background: `linear-gradient(270deg, ${theme.sideB.primary}, ${theme.sideB.accent})` }}
            initial={false}
            animate={{ width: `${pctB}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 24 }}
          />
          {splitStyle ? (
            <div
              className="pointer-events-none absolute top-1/2 z-[1] h-[70%] w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
              style={splitStyle}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

const heroParticles = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  side: index % 2 === 0 ? 'A' : 'B',
  x: 4 + ((index * 31) % 92),
  y: 7 + ((index * 19) % 82),
  size: 2 + (index % 5),
  delay: (index % 9) * 0.22,
  duration: 2.4 + (index % 6) * 0.38,
}));

function HeroCountdown({ target, label, color = 'text-[#f8d6a0]' }: { target: number; label: string; color?: string }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const updateLeft = () => setLeft(Math.max(0, target - Date.now()));
    updateLeft();
    const timer = setInterval(updateLeft, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const days = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);

  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-full bg-black/26 px-4 py-2 font-mono text-[13px] font-black text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] max-lg:gap-1 max-lg:px-2 max-lg:py-0.5 max-lg:text-[10px]">
      <span className="font-sans text-white/42">{label}</span>
      <span className={color}>
        {pad(days)}天 {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}

function HeroSidePanel({
  side,
  label,
  pct,
  supportText,
  odds,
  theme,
  voted,
  disabled,
  isBetting,
  onClick,
}: {
  side: 'A' | 'B';
  label: string;
  pct: number;
  supportText: string;
  odds: number;
  theme: RivalryVisualTheme['sideA'];
  voted?: 'A' | 'B';
  disabled: boolean;
  isBetting?: boolean;
  onClick: () => void;
}) {
  const isA = side === 'A';
  const active = voted === side;
  const railItems = [`${odds.toFixed(2)} × 赔率`, `${label}阵营`, active ? '已站队' : '等待站队'];

  return (
    <div
      className={`relative w-full min-h-[390px] overflow-hidden rounded-[26px] bg-transparent px-5 py-6 max-lg:min-h-0 max-lg:rounded-[18px] max-lg:px-3 max-lg:py-3 max-md:rounded-[14px] max-md:px-2 max-md:py-2 ${
        isA
          ? 'text-left shadow-[0_0_48px_rgba(255,70,16,0.2),inset_26px_0_42px_rgba(255,90,22,0.16)]'
          : 'ml-auto max-w-full text-right shadow-[0_0_48px_rgba(24,187,255,0.2),inset_-26px_0_42px_rgba(40,199,255,0.14)]'
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-10 rounded-[26px] backdrop-blur-[1.5px] ${
          isA
            ? 'bg-[linear-gradient(90deg,rgba(28,8,4,0.18)_0%,rgba(10,10,15,0.1)_54%,rgba(5,7,13,0.015)_100%)]'
            : 'bg-[linear-gradient(270deg,rgba(3,23,42,0.18)_0%,rgba(8,12,20,0.1)_54%,rgba(5,7,13,0.015)_100%)]'
        }`}
      />
      <motion.span
        className="pointer-events-none absolute top-0 z-20 h-[2px] rounded-full max-lg:hidden"
        style={{
          left: isA ? 0 : '18%',
          right: isA ? '18%' : 0,
          background: isA
            ? `linear-gradient(90deg, ${theme.accent}, ${theme.primary} 48%, transparent)`
            : `linear-gradient(90deg, transparent, ${theme.primary} 52%, ${theme.accent})`,
          boxShadow: `0 0 18px ${theme.accent}, 0 0 42px ${theme.primary}`,
        }}
        animate={{ opacity: [0.66, 1, 0.72], scaleX: [0.96, 1.02, 0.98] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="pointer-events-none absolute bottom-0 z-20 h-[2px] rounded-full max-lg:hidden"
        style={{
          left: isA ? 0 : '18%',
          right: isA ? '18%' : 0,
          background: isA
            ? `linear-gradient(90deg, ${theme.accent}, ${theme.primary} 48%, transparent)`
            : `linear-gradient(90deg, transparent, ${theme.primary} 52%, ${theme.accent})`,
          boxShadow: `0 0 18px ${theme.accent}, 0 0 42px ${theme.primary}`,
        }}
        animate={{ opacity: [0.5, 0.95, 0.6], scaleX: [1, 0.96, 1.02] }}
        transition={{ duration: 2.15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className={`pointer-events-none absolute top-4 bottom-4 z-20 w-[2px] rounded-full max-lg:hidden ${isA ? 'left-0' : 'right-0'}`}
        style={{
          background: `linear-gradient(180deg, transparent, ${theme.accent} 18%, ${theme.primary} 52%, ${theme.accent} 82%, transparent)`,
          boxShadow: `0 0 18px ${theme.accent}, 0 0 34px ${theme.primary}`,
        }}
        animate={{ opacity: [0.54, 1, 0.68], scaleY: [0.9, 1.04, 0.94] }}
        transition={{ duration: 1.55, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className={`pointer-events-none absolute top-0 z-[21] h-[2px] w-24 rounded-full bg-white/80 blur-[1px] max-lg:hidden ${isA ? 'left-0' : 'right-0'}`}
        animate={{ x: isA ? ['-70%', '250%'] : ['70%', '-250%'], opacity: [0, 1, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className={`pointer-events-none absolute bottom-0 z-[21] h-[2px] w-20 rounded-full bg-white/70 blur-[1px] max-lg:hidden ${isA ? 'left-0' : 'right-0'}`}
        animate={{ x: isA ? ['-40%', '220%'] : ['40%', '-220%'], opacity: [0, 0.86, 0] }}
        transition={{ duration: 2.75, repeat: Infinity, ease: 'easeInOut', delay: 0.45 }}
      />
      <div className="pointer-events-none absolute inset-x-5 top-[72px] z-20 h-px bg-white/8 max-lg:hidden" />
      <div className={`relative z-30 flex w-full flex-col ${isA ? 'items-start' : 'items-end'}`}>
        <div
          className={`mb-8 flex w-full items-center gap-2 ${isA ? '' : 'justify-end'} max-lg:mb-2 max-lg:gap-1.5 max-md:mb-1 ${isA ? 'max-lg:flex-row max-lg:justify-between' : 'max-lg:flex-row max-lg:justify-end'}`}
        >
          <div className={`flex min-w-0 items-center gap-2 ${isA ? '' : 'flex-row-reverse max-lg:flex-row'}`}>
            <Zap size={24} className="max-lg:h-4 max-lg:w-4 max-md:h-3 max-md:w-3" style={{ color: theme.accent, filter: `drop-shadow(0 0 12px ${theme.accent})` }} />
            <span className="max-w-full truncate text-[25px] font-black italic tracking-[-0.05em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.16)] max-xl:text-[21px] max-lg:text-[13px] max-lg:not-italic max-md:text-[11px]">
              <span className="max-lg:hidden">{label}更强</span>
              <span className="hidden max-lg:inline">{label}</span>
            </span>
          </div>
          <div
            className="hidden shrink-0 font-black leading-none tracking-[-0.06em] max-lg:block max-lg:text-[28px] max-md:text-[22px]"
            style={{ color: theme.accent, textShadow: `0 0 16px ${theme.primary}` }}
          >
            {pct}
            <span className="ml-0.5 text-[14px] max-md:text-[11px]">%</span>
          </div>
        </div>

        <div className="mb-2 text-[14px] font-bold text-white/68 max-lg:hidden">支持率</div>
        <div
          className="mb-1 text-[64px] font-black leading-none tracking-[-0.09em] max-xl:text-[52px] max-lg:hidden"
          style={{ color: theme.accent, textShadow: `0 0 28px ${theme.primary}` }}
        >
          {pct}
          <span className="ml-1 text-[28px] tracking-[-0.04em]">%</span>
        </div>
        <div
          className={`mb-8 w-full text-[18px] font-black tabular-nums text-white/88 max-lg:mb-2 max-lg:text-[11px] max-lg:leading-tight max-md:mb-1 max-md:text-[10px] ${isA ? '' : 'text-right'}`}
        >
          {supportText}
        </div>

        <div className={`mb-8 flex flex-col gap-2 max-lg:hidden ${isA ? 'items-start' : 'items-end'}`}>
          {railItems.map((text) => (
            <span
              key={text}
              className="max-w-full truncate rounded-full border border-white/10 bg-black/22 px-4 py-1.5 text-[12px] font-black text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              title={text}
            >
              {text}
            </span>
          ))}
        </div>

        <p className={`mb-2 hidden text-[10px] font-bold text-white/50 max-lg:block max-md:mb-1 max-md:text-[9px] ${isA ? 'text-left' : 'text-right'}`}>
          {odds.toFixed(2)} × 赔率 · {active ? '已站队' : '等待站队'}
        </p>

        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`inline-flex h-[52px] min-w-[176px] items-center justify-center rounded-[17px] border px-6 text-[16px] font-black text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 max-lg:h-9 max-lg:min-w-[7.5rem] max-lg:rounded-[14px] max-lg:px-2 max-lg:text-[12px] max-md:h-8 max-md:text-[11px] ${
            isA
              ? 'max-lg:w-full max-lg:min-w-0 shadow-[0_0_30px_rgba(255,77,22,0.34)]'
              : 'max-lg:w-auto max-lg:max-w-full shadow-[0_0_30px_rgba(28,190,255,0.32)]'
          }`}
          style={{
            borderColor: `${theme.accent}66`,
            background: active
              ? `linear-gradient(180deg, ${theme.primary}dd, ${theme.primary}8a)`
              : `linear-gradient(180deg, ${theme.primary}b8, rgba(8,13,22,0.56))`,
          }}
        >
          {isBetting ? '下注中...' : `支持${label} >`}
        </button>
      </div>
    </div>
  );
}

function HeroBottomCard({
  tone,
  icon,
  title,
  children,
  className = '',
}: {
  tone: 'orange' | 'gold' | 'cyan';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const toneClass = {
    orange: 'border-[#ff7633]/18 bg-[linear-gradient(135deg,rgba(62,22,9,0.86),rgba(8,11,16,0.82))] text-[#ffd18a]',
    gold: 'border-[#f5c65a]/18 bg-[linear-gradient(135deg,rgba(35,28,13,0.88),rgba(8,11,16,0.82))] text-[#ffe08a]',
    cyan: 'border-[#31cfff]/18 bg-[linear-gradient(135deg,rgba(5,32,57,0.88),rgba(8,11,16,0.82))] text-[#a9efff]',
  }[tone];

  return (
    <div
      className={`relative flex h-full min-h-[184px] flex-col overflow-hidden rounded-[22px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.24)] max-lg:min-h-0 max-lg:p-3 ${toneClass} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_48%)]" />
      <div className="relative mb-4 flex items-center gap-2 text-[15px] font-black max-lg:mb-2 max-lg:text-[13px]">
        {icon}
        {title}
      </div>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function SeasonBar({ winsA, winsB, nameA, nameB }: { winsA: number; winsB: number; nameA: string; nameB: string }) {
  const total = winsA + winsB || 1;
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="font-bold text-[#40ead0]">
          {nameA} {winsA}胜
        </span>
        <span className="font-bold text-[#ff6f8f]">
          {nameB} {winsB}胜
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-l-full bg-gradient-to-r from-[#1dbfd0] via-[#27d8cf] to-[#38f0d1]"
          style={{ width: `${(winsA / total) * 100}%` }}
        />
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-[#ff4f75] to-[#A2343B]"
          style={{ width: `${(winsB / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function HeroPK({
  pk,
  onEnterBattle,
  onHistory,
  onOpenBet,
  voted,
  isBetting,
}: {
  pk: PKTopicState;
  onEnterBattle?: (item: RivalryNewsItem) => void;
  onHistory: (id: string) => void;
  onOpenBet: (item: RivalryNewsItem, option: 'A' | 'B') => void;
  voted?: 'A' | 'B';
  isBetting?: boolean;
}) {
  const item = pk.newsItem;
  const betTotal = asNumber(pk.betCountA) + asNumber(pk.betCountB);
  const { pctA, pctB } = heatSharePct(pk.currentHeatA, pk.currentHeatB);
  const heatTotal = pk.currentHeatA + pk.currentHeatB;
  const heatLabel =
    heatTotal >= 100 || Number.isInteger(heatTotal)
      ? heatTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : heatTotal.toFixed(1);
  const leading = pk.currentHeatA > pk.currentHeatB ? 'A' : pk.currentHeatB > pk.currentHeatA ? 'B' : null;
  const theme = getRivalryVisualTheme(item);
  const heroBackground = resolveHeroPkBackground(item, theme.sideA.portrait, theme.sideB.portrait);
  const useCoverBackground = heroBackground.mode === 'cover';
  const heroTheme = {
    sideA: { ...theme.sideA, primary: '#f04a1f', accent: '#ffc15d' },
    sideB: { ...theme.sideB, primary: '#0789ff', accent: '#62efff' },
  };
  const supportA = Math.round(asNumber(pk.betCountA) || pk.currentHeatA);
  const supportB = Math.round(asNumber(pk.betCountB) || pk.currentHeatB);
  const participantCount = Math.round(betTotal || heatTotal);
  const supportTextA = betTotal > 0 ? `${supportA.toLocaleString()} 人支持` : `${formatPkHeatValue(pk.currentHeatA)} 热度`;
  const supportTextB = betTotal > 0 ? `${supportB.toLocaleString()} 人支持` : `${formatPkHeatValue(pk.currentHeatB)} 热度`;
  const leadingLabel = leading === 'B' ? item.optionB : item.optionA;
  const liveMetricLabel = betTotal > 0 ? `${participantCount.toLocaleString()} 人正在参与` : `${heatLabel} 热度正在对抗`;
  const latestHotText = item.summary || `${leadingLabel} 的支持者正在升温！`;
  const phaseText =
    pk.phase === 'betting'
      ? '下注进行中'
      : pk.phase === 'locked'
        ? '本局已锁定'
        : '等待下一局';
  const sideAOpinion = `${item.optionA} 当前支持率 ${pctA}%，热度 ${formatPkHeatValue(pk.currentHeatA)}。`;
  const sideBOpinion = `${item.optionB} 当前支持率 ${pctB}%，热度 ${formatPkHeatValue(pk.currentHeatB)}。`;
  const supportDisabled = isBetting || !!voted || pk.phase !== 'betting';
  const countdownTarget =
    pk.phase === 'betting'
      ? pk.lockTime
      : pk.phase === 'locked'
        ? pk.roundEndTime
        : pk.nextRoundTime ?? pk.roundEndTime;
  const countdownLabel =
    pk.phase === 'betting'
      ? '活动倒计时'
      : pk.phase === 'locked'
        ? '锁局倒计时'
        : '下一局开始';
  const dataRows = [
    ['热度', pk.currentHeatA, pk.currentHeatB],
    ['下注', asNumber(pk.betCountA), asNumber(pk.betCountB)],
    ['胜场', pk.season.winsA, pk.season.winsB],
  ];
  /** 底部卡片区暂注释，保留变量与组件供恢复 */
  void [
    HeroBottomCard,
    onHistory,
    latestHotText,
    phaseText,
    sideAOpinion,
    sideBOpinion,
    dataRows,
  ];
  const handleJoinBattle = () => {
    if (onEnterBattle) {
      onEnterBattle(item);
      return;
    }
    onOpenBet(item, leading === 'B' ? 'B' : 'A');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="legacy-hero-card legacy-pred-hero relative overflow-hidden rounded-[30px] border border-white/10 bg-[#04070d] text-white shadow-[0_24px_78px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.08)] max-lg:rounded-[20px] max-md:rounded-[16px]"
    >
      <div className="absolute inset-0">
        {heroBackground.mode === 'cover' ? (
          <>
            <img
              src={heroBackground.coverSrc}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[#04070d]" />
            <img
              src={heroBackground.sideASrc}
              alt=""
              className="pointer-events-none absolute left-0 top-0 h-full w-[48%] object-cover object-left-top saturate-125 opacity-90 [mask-image:linear-gradient(90deg,black_0%,black_42%,rgba(0,0,0,0.65)_62%,transparent_100%)] max-lg:w-[50%] max-lg:opacity-85"
            />
            <img
              src={heroBackground.sideBSrc}
              alt=""
              className="pointer-events-none absolute right-0 top-0 h-full w-[48%] object-cover object-right-top saturate-125 opacity-90 [mask-image:linear-gradient(270deg,black_0%,black_42%,rgba(0,0,0,0.65)_62%,transparent_100%)] max-lg:w-[50%] max-lg:opacity-85"
            />
          </>
        )}
        <div
          className={`absolute inset-0 ${
            useCoverBackground
              ? 'bg-[radial-gradient(circle_at_50%_8%,rgba(255,242,189,0.12),transparent_32%),linear-gradient(90deg,rgba(78,13,4,0.55)_0%,rgba(37,10,8,0.45)_32%,rgba(5,8,15,0.42)_50%,rgba(4,32,70,0.48)_68%,rgba(3,11,28,0.62)_100%)]'
              : 'bg-[radial-gradient(circle_at_50%_8%,rgba(255,242,189,0.16),transparent_28%),linear-gradient(90deg,rgba(78,13,4,0.98)_0%,rgba(37,10,8,0.82)_32%,rgba(5,8,15,0.86)_50%,rgba(4,32,70,0.9)_68%,rgba(3,11,28,0.98)_100%)]'
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[58%] bg-[radial-gradient(circle_at_24%_45%,rgba(255,85,20,0.58),transparent_34%),linear-gradient(90deg,rgba(255,42,16,0.24),transparent_76%)] ${useCoverBackground ? 'opacity-45' : 'opacity-95'}`}
        />
        <div
          className={`absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_76%_45%,rgba(21,180,255,0.56),transparent_36%),linear-gradient(270deg,rgba(13,151,255,0.26),transparent_76%)] ${useCoverBackground ? 'opacity-45' : 'opacity-95'}`}
        />
        <div
          className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.04)_56%,rgba(0,0,0,0.5)_100%)] ${useCoverBackground ? 'opacity-90' : ''}`}
        />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_96px)] opacity-35" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden max-lg:hidden">
        {heroParticles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              background: particle.side === 'A' ? '#ffbd52' : '#50e8ff',
              boxShadow: particle.side === 'A' ? '0 0 14px rgba(255,114,34,0.92)' : '0 0 14px rgba(59,220,255,0.92)',
            }}
            animate={{
              y: [0, particle.side === 'A' ? -32 : 32, 0],
              x: [0, particle.side === 'A' ? 18 : -18, 0],
              opacity: [0, 0.9, 0],
              scale: [0.65, 1.55, 0.55],
            }}
            transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div
        className="relative grid min-h-[var(--hero-pk-grid-min-h)] auto-rows-min grid-cols-[282px_minmax(0,1fr)_282px] gap-5 px-8 py-8 max-xl:grid-cols-[238px_minmax(0,1fr)_238px] max-lg:min-h-[var(--hero-pk-grid-min-h-mobile)] max-lg:grid-cols-2 max-lg:gap-2 max-lg:px-3 max-lg:py-3 max-md:gap-1.5 max-md:px-2.5 max-md:py-2.5"
        style={{
          ['--hero-pk-grid-min-h' as string]: HERO_PK_GRID_MIN_HEIGHT,
          ['--hero-pk-grid-min-h-mobile' as string]: HERO_PK_MOBILE_GRID_MIN_HEIGHT,
        }}
      >
        <div className="col-start-1 row-start-1 flex w-full items-center justify-start max-lg:col-start-1 max-lg:row-start-2">
          <HeroSidePanel
            side="A"
            label={item.optionA}
            pct={pctA}
            supportText={supportTextA}
            odds={item.oddsA}
            theme={heroTheme.sideA}
            voted={voted}
            disabled={supportDisabled}
            isBetting={isBetting}
            onClick={() => onOpenBet(item, 'A')}
          />
        </div>

        <div
          className="col-start-2 row-start-1 flex min-w-0 w-full flex-col items-center justify-center pt-2 text-center max-lg:col-span-2 max-lg:col-start-1 max-lg:row-start-1 max-lg:mx-auto max-lg:max-h-[var(--hero-pk-mobile-stage-max-h)] max-lg:max-w-[min(100%,var(--hero-pk-mobile-stage-max))] max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:pt-0 max-lg:pb-0 max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden"
          style={{
            ['--hero-pk-mobile-stage-max' as string]: HERO_PK_MOBILE_STAGE_MAX_WIDTH,
            ['--hero-pk-mobile-stage-max-h' as string]: HERO_PK_MOBILE_STAGE_MAX_HEIGHT,
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 max-lg:mb-1.5 max-lg:gap-1 max-md:mb-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ffb15a]/40 bg-[#b91c1c]/78 px-6 py-2 text-[20px] font-black italic text-[#fff7d6] shadow-[0_0_22px_rgba(255,78,41,0.34)] max-lg:px-2.5 max-lg:py-1 max-lg:text-[11px] max-md:px-2 max-md:py-0.5 max-md:text-[10px]">
              <Flame size={20} className="max-lg:h-3.5 max-lg:w-3.5 max-md:h-3 max-md:w-3" />
              全网热议 TOP1
            </span>
            <PhaseTag phase={pk.phase} />
          </div>

          <h1
            className="mb-3 max-w-[760px] line-clamp-2 text-[82px] font-black leading-[0.92] tracking-[-0.09em] text-[#fff3dd] max-xl:text-[60px] max-lg:mb-1.5 max-lg:text-[26px] max-lg:leading-[1.02] max-md:text-[21px]"
            style={{ textShadow: '0 4px 0 rgba(116,38,8,0.58), 0 0 30px rgba(255,119,45,0.4), 0 0 38px rgba(76,220,255,0.18)' }}
          >
            {item.title}
          </h1>

          <p className="mb-5 max-w-[660px] text-[23px] font-black italic tracking-[-0.045em] text-[#f8d3a3] drop-shadow-[0_2px_10px_rgba(0,0,0,0.68)] max-lg:mb-1.5 max-lg:line-clamp-1 max-lg:text-[12px] max-lg:leading-snug max-lg:not-italic max-md:text-[10px]">
            {item.summary || `${item.optionA} vs ${item.optionB}，谁才是最强阵营？`}
          </p>

          <div className="mb-5 inline-flex max-w-full flex-wrap items-center justify-center gap-4 rounded-full border border-white/10 bg-black/44 px-6 py-3 text-[17px] font-black text-white/88 shadow-[0_0_30px_rgba(0,0,0,0.42)] backdrop-blur-md max-lg:mb-1.5 max-lg:gap-1.5 max-lg:px-2.5 max-lg:py-1 max-lg:text-[11px] max-md:text-[10px]">
            <span className="inline-flex items-center gap-1.5">
              <Flame size={18} className="text-[#ffb15a] max-lg:h-3 max-lg:w-3" />
              <span className="max-lg:truncate">{liveMetricLabel}</span>
            </span>
            <span className="h-5 w-px bg-white/16 max-lg:hidden" />
            <span className="hidden items-center gap-2 text-[#ffd28a] max-lg:inline-flex">
              <Users size={18} className="text-[#6cecff] max-lg:h-3 max-lg:w-3" />
              {betTotal > 0 ? `${betTotal.toLocaleString()} 次` : `${heatLabel}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleJoinBattle}
            className="group relative mb-4 inline-flex border-0 bg-transparent p-0 drop-shadow-[0_10px_28px_rgba(255,72,24,0.42)] transition-transform hover:-translate-y-0.5 max-lg:mb-1.5"
          >
            <img
              src="/image/btn-bg.png"
              alt=""
              aria-hidden
              className="block h-auto w-[280px] max-lg:w-[min(100%,170px)] max-md:w-[min(100%,142px)]"
            />
            <span className="absolute inset-0 flex items-center justify-center text-[24px] font-black tracking-[-0.04em] text-white drop-shadow-[0_2px_6px_rgba(120,20,0,0.55)] max-lg:text-[13px] max-md:text-[11px]">
              立即加入对立
            </span>
          </button>

          <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-[15px] font-black text-white/70 max-lg:mb-1.5 max-lg:gap-1.5 max-lg:text-[10px]">
            <HeroCountdown target={countdownTarget} label={countdownLabel} />
            <span className="rounded-full bg-black/24 px-3 py-2 max-lg:px-2 max-lg:py-0.5 max-lg:text-[10px] max-md:hidden">第{pk.currentRound}局</span>
          </div>

          <div className="w-full max-lg:-mx-0.5 max-lg:origin-center max-md:scale-[0.82]">
            <HeroBattleRail pctA={pctA} pctB={pctB} />
          </div>
        </div>

        <div className="col-start-3 row-start-1 flex w-full items-center justify-end max-lg:col-start-2 max-lg:row-start-2">
          <HeroSidePanel
            side="B"
            label={item.optionB}
            pct={pctB}
            supportText={supportTextB}
            odds={item.oddsB}
            theme={heroTheme.sideB}
            voted={voted}
            disabled={supportDisabled}
            isBetting={isBetting}
            onClick={() => onOpenBet(item, 'B')}
          />
        </div>

        {/* <div className="col-span-3 col-start-1 row-start-2 grid auto-rows-fr grid-cols-[1fr_1.55fr_1.55fr_2.3fr] items-stretch gap-3 pt-2 max-lg:col-span-2 max-lg:col-start-1 max-lg:row-start-3 max-lg:flex max-lg:gap-2 max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:pt-0 max-lg:[scrollbar-width:none] max-lg:snap-x max-lg:snap-mandatory max-lg:[&>*]:w-[min(82vw,300px)] max-lg:[&>*]:shrink-0 max-lg:[&>*]:snap-center max-lg:[&::-webkit-scrollbar]:hidden">
          <HeroBottomCard tone="orange" icon={<Flame size={18} />} title="实时战况">
            <div className="flex flex-1 flex-col justify-between gap-4 max-lg:gap-2">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-[33px] font-black leading-none tabular-nums text-[#ffd067] max-lg:text-[24px]">{formatPkHeatValue(heatTotal)}</span>
                  <span className="pb-1 text-[11px] font-black text-white/38">总量</span>
                </div>
              </div>
            </div>
          </HeroBottomCard>

          <button type="button" onClick={() => onHistory(pk.id)} className="h-full w-full text-left">
            <HeroBottomCard tone="orange" icon={<Zap size={18} />} title="最新热评" className="cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ffb35c]/36 hover:shadow-[0_18px_44px_rgba(255,91,28,0.16)]">
              <div className="flex flex-1 flex-col justify-between gap-4 max-lg:gap-2">
                <div>
                  <div className="mb-3 line-clamp-2 text-[17px] font-black leading-snug text-white max-lg:mb-1 max-lg:text-[14px]">{latestHotText}</div>
                </div>
              </div>
            </HeroBottomCard>
          </button>

          <HeroBottomCard tone="gold" icon={<Trophy size={18} />} title="核心数据对比">
            <div className="flex flex-1 flex-col justify-between gap-3">
              <div className="flex items-center justify-between rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-black text-white/50">
                <span className="max-w-[42%] truncate text-[#ff9a66]">{item.optionA}</span>
                <span>{phaseText}</span>
                <span className="max-w-[42%] truncate text-right text-[#60e8ff]">{item.optionB}</span>
              </div>
              {dataRows.map(([label, valueA, valueB]) => {
                const total = Number(valueA) + Number(valueB);
                const widthA = total > 0 ? Math.round((Number(valueA) / total) * 100) : 50;
                const widthB = 100 - widthA;
                return (
                  <div key={label} className="grid grid-cols-[48px_48px_1fr_48px] items-center gap-2 text-[13px] font-black">
                    <span className="text-white/56">{label}</span>
                    <span className="text-right tabular-nums text-[#ff8054]">{formatPkHeatValue(Number(valueA))}</span>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]">
                      <span className="h-full bg-[linear-gradient(90deg,#f44b2c,#ffd05e)]" style={{ width: `${widthA}%` }} />
                      <span className="h-full bg-[linear-gradient(90deg,#38d7ff,#1777ff)]" style={{ width: `${widthB}%` }} />
                    </div>
                    <span className="tabular-nums text-[#55dfff]">{formatPkHeatValue(Number(valueB))}</span>
                  </div>
                );
              })}
            </div>
          </HeroBottomCard>

          <HeroBottomCard tone="cyan" icon={<MessageCircleMore size={18} />} title="热门观点">
            <div className="grid flex-1 grid-cols-2 gap-3 max-lg:gap-2">
              <div className="flex min-w-0 flex-col justify-between rounded-[18px] border border-[#ff8b4a]/14 bg-[#ff6a2a]/8 p-3">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-white/72">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ff7942]/18 text-[#ffd28c]">A</span>
                  <span className="min-w-0 truncate">{item.optionA}阵营</span>
                </div>
                <p className="line-clamp-2 text-[14px] font-semibold text-white/86">{sideAOpinion}</p>
              </div>
              <div className="flex min-w-0 flex-col justify-between rounded-[18px] border border-[#35d6ff]/14 bg-[#1ba8ff]/8 p-3">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-white/72">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2ccfff]/18 text-[#a9efff]">B</span>
                  <span className="min-w-0 truncate">{item.optionB}阵营</span>
                </div>
                <p className="line-clamp-2 text-[14px] font-semibold text-white/86">{sideBOpinion}</p>
              </div>
            </div>
          </HeroBottomCard>
        </div> */}
      </div>
    </motion.div>
  );
}

function PKCard({
  pk,
  index,
  onEnterBattle,
  onHistory,
  onOpenBet,
  voted,
  isBetting,
}: {
  pk: PKTopicState;
  index: number;
  onEnterBattle?: (item: RivalryNewsItem) => void;
  onHistory: (id: string) => void;
  onOpenBet: (item: RivalryNewsItem, option: 'A' | 'B') => void;
  voted?: 'A' | 'B';
  isBetting?: boolean;
}) {
  const item = pk.newsItem;
  const { pctA, pctB } = heatSharePct(pk.currentHeatA, pk.currentHeatB);
  const leading = pk.currentHeatA > pk.currentHeatB ? 'A' : pk.currentHeatB > pk.currentHeatA ? 'B' : null;
  const theme = getRivalryVisualTheme(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group relative overflow-hidden rounded-[16px] border border-white/10 bg-[#0d1118] shadow-[0_10px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#3ad9be]/24 hover:shadow-[0_20px_44px_rgba(0,0,0,0.34)] md:block md:rounded-[22px] md:shadow-[0_14px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="absolute inset-0 md:hidden">
        <img
          src={item.listImage || item.image}
          alt=""
          className="h-full w-full object-cover opacity-74 saturate-125 contrast-105 transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,18,0.62)_0%,rgba(8,13,22,0.42)_46%,rgba(8,13,22,0.68)_100%),linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.22))]" />
      </div>

      <div className="relative hidden overflow-hidden bg-[#070b12] md:block md:h-32">
        <img src={item.listImage || item.image} alt="" className="h-full w-full object-cover opacity-72 transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,30,0.18),rgba(5,10,20,0.2))]" />
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <PhaseTag phase={pk.phase} />
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">第{pk.currentRound}局</span>
        </div>
        {pk.lastRoundWinner && leading ? (
          <div className="absolute right-2 top-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pk.lastRoundWinner === leading ? 'bg-[#123a3d]/90 text-[#9affec]' : 'bg-[#4a1824]/90 text-[#ffb9c6]'}`}>
              {pk.lastRoundWinner === leading ? '守擂' : '翻盘'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 min-w-0 p-3 md:p-3.5">
        <div className="mb-2 flex items-center gap-1 md:hidden">
          <PhaseTag phase={pk.phase} />
          <span className="rounded-full bg-black/34 px-1.5 py-0.5 text-[9px] font-bold text-white/80 backdrop-blur-sm">第{pk.currentRound}局</span>
        </div>
        <h3 className="mb-1.5 line-clamp-2 text-[13px] font-bold leading-snug text-white md:mb-2 md:text-sm">{item.title}</h3>

        <div className="mb-2">
          <div className="mb-1 flex justify-between gap-2 text-[9px] md:text-[10px]">
            <span className="max-w-[46%] truncate font-semibold" style={{ color: theme.sideA.accent }} title={`${item.optionA} · 热度 ${formatPkHeatValue(pk.currentHeatA)}`}>
              {item.optionA} <span className="tabular-nums text-white/80">{formatPkHeatValue(pk.currentHeatA)}</span> · {pctA}%
            </span>
            <span className="shrink-0 font-bold uppercase tracking-wider text-white/35">阵营</span>
            <span className="max-w-[46%] truncate text-right font-semibold" style={{ color: theme.sideB.accent }} title={`${item.optionB} · 热度 ${formatPkHeatValue(pk.currentHeatB)}`}>
              {pctB}% · <span className="tabular-nums text-white/80">{formatPkHeatValue(pk.currentHeatB)}</span> {item.optionB}
            </span>
          </div>
          <RivalryHeatMeter heatA={pk.currentHeatA} heatB={pk.currentHeatB} theme={theme} variant="compact" />
        </div>

        <div className="mb-2 hidden md:block">
          {pk.phase === 'betting' ? <Countdown target={pk.lockTime} label="下注截止" color="text-amber-500" /> : null}
          {pk.phase === 'locked' ? <Countdown target={pk.roundEndTime} label="本局结束" color="text-amber-500" /> : null}
          {pk.phase === 'cooldown' && pk.nextRoundTime ? <Countdown target={pk.nextRoundTime} label="下一局" color="text-[#40ead0]" /> : null}
        </div>

        <div className="mb-2 flex gap-1.5 md:gap-2">
          <button
            onClick={() => onOpenBet(item, 'A')}
            disabled={isBetting || !!voted || pk.phase !== 'betting'}
            className={`flex-1 rounded-[10px] border-0 py-1.5 text-[10px] font-bold md:rounded-xl md:py-2 md:text-xs ${
              voted === 'A'
                ? 'text-[#dcfff8]'
                : isBetting || pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-white/5 text-white/30'
                  : 'text-[#dcfff8]'
            }`}
            style={
              voted === 'A'
                ? { border: `1px solid ${theme.sideA.accent}66`, background: `${theme.sideA.primary}33`, color: '#ecfeff' }
                : isBetting || pk.phase !== 'betting'
                  ? undefined
                  : { border: `1px solid ${theme.sideA.accent}55`, background: `${theme.sideA.primary}26`, color: '#ecfeff' }
            }
          >
            {isBetting ? '下注中...' : item.optionA}
          </button>
          <button
            onClick={() => onOpenBet(item, 'B')}
            disabled={isBetting || !!voted || pk.phase !== 'betting'}
            className={`flex-1 rounded-[10px] border-0 py-1.5 text-[10px] font-bold md:rounded-xl md:py-2 md:text-xs ${
              voted === 'B'
                ? 'text-[#ffd7de]'
                : isBetting || pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-white/5 text-white/30'
                  : 'text-[#ffd7de]'
            }`}
            style={
              voted === 'B'
                ? { border: `1px solid ${theme.sideB.accent}55`, background: `${theme.sideB.primary}30`, color: '#fff1f2' }
                : isBetting || pk.phase !== 'betting'
                  ? undefined
                  : { border: `1px solid ${theme.sideB.accent}48`, background: `${theme.sideB.primary}22`, color: '#fff1f2' }
            }
          >
            {isBetting ? '下注中...' : item.optionB}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => onHistory(pk.id)} className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[9px] text-white/46 transition-colors hover:text-[#40ead0] md:text-[10px]">
            <History size={10} />
            历史战绩
          </button>
          {onEnterBattle ? (
            <button onClick={() => onEnterBattle(item)} className="flex cursor-pointer items-center gap-1 rounded-full border border-[#4f6489]/36 bg-[#10273d]/24 px-1.5 py-0.5 text-[9px] font-bold text-[#ffd7de] transition-colors hover:bg-[#163252] md:px-2 md:py-1 md:text-[10px]">
              <MessageCircleMore size={10} className="text-[#5df3d7]" />
              进入撕裂带
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function HistoryPage({ pk, onBack }: { pk: RivalryPKState; onBack: () => void }) {
  const item = pk.newsItem;
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [roundOpen, setRoundOpen] = useState(false);
  const topicId = pk.apiTopicId;
  const historyQuery = useRequestPKHistory({ topicId, page: 1, pageSize: 100, enabled: Boolean(topicId) });
  const seasonsQuery = useRequestPKSeasons({ topicId, page: 1, pageSize: 20, enabled: Boolean(topicId) });
  const apiRounds = useMemo(
    () => (historyQuery.data?.list ?? []).map(mapRound).filter((round) => round.round > 0),
    [historyQuery.data?.list],
  );
  const displayRounds = apiRounds.length > 0 ? apiRounds : pk.roundHistory;
  const roundStats = calcRoundStats(displayRounds);
  const apiSeasons = useMemo(
    () => (seasonsQuery.data?.list ?? []).map((season) => mapSeason(season, displayRounds)),
    [displayRounds, seasonsQuery.data?.list],
  );
  const displaySeasons = apiSeasons.length > 0 ? apiSeasons : pk.history.seasons;
  const history = {
    totalRounds: historyQuery.data?.count ?? (displayRounds.length || pk.history.totalRounds),
    totalWinsA: roundStats.winsA || pk.history.totalWinsA,
    totalWinsB: roundStats.winsB || pk.history.totalWinsB,
    longestStreakA: roundStats.longestA || pk.history.longestStreakA,
    longestStreakB: roundStats.longestB || pk.history.longestStreakB,
    currentStreakSide: roundStats.currentStreakSide || pk.history.currentStreakSide,
    currentStreak: roundStats.currentStreak || pk.history.currentStreak,
    seasons: displaySeasons,
  };
  const loadingHistory = historyQuery.isLoading || seasonsQuery.isLoading;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 border-0 bg-transparent text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-rdark-text2">
        <ArrowLeft size={16} />
        返回开撕台
      </button>

      <div className="rounded-[24px] border border-[#9a73ff]/30 bg-[linear-gradient(135deg,rgba(18,12,48,0.46)_0%,rgba(76,42,150,0.38)_30%,rgba(32,74,150,0.34)_58%,rgba(18,120,118,0.22)_78%,rgba(10,18,48,0.48)_100%)] p-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(210,188,255,0.16)]">
        <h2 className="mb-1 text-lg font-extrabold">{item.title}</h2>
        <p className="mb-3 text-xs text-white/70">
          {pk.apiTopicId ? `接口历史战绩 · topicId ${pk.apiTopicId}` : '全部历史战绩 · 本地预览'}
          {loadingHistory ? ' · 加载中' : ''}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black">{history.totalRounds}</div>
            <div className="text-[10px] text-white/60">总局数</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black text-emerald-300">{history.totalWinsA}</div>
            <div className="text-[10px] text-white/60">{item.optionA} 胜</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black text-red-300">{history.totalWinsB}</div>
            <div className="text-[10px] text-white/60">{item.optionB} 胜</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black">{history.currentStreak}🔥</div>
            <div className="text-[10px] text-white/60">{history.currentStreakSide === 'A' ? item.optionA : item.optionB} 连胜</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,44,0.96),rgba(10,14,30,0.98))] p-4 text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={16} className="text-fuchsia-300" />
            <span className="text-sm font-bold text-white">{item.optionA}</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-rdark-text2">
            <div className="flex justify-between"><span>总胜场</span><span className="font-bold text-fuchsia-300">{history.totalWinsA}</span></div>
            <div className="flex justify-between"><span>胜率</span><span className="font-bold text-white/88">{history.totalRounds > 0 ? ((history.totalWinsA / history.totalRounds) * 100).toFixed(1) : '0'}%</span></div>
            <div className="flex justify-between"><span>最高连胜</span><span className="font-bold text-fuchsia-300">{history.longestStreakA} 🔥</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={16} className="text-sky-300" />
            <span className="text-sm font-bold text-white">{item.optionB}</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-rdark-text2">
            <div className="flex justify-between"><span>总胜场</span><span className="font-bold text-sky-300">{history.totalWinsB}</span></div>
            <div className="flex justify-between"><span>胜率</span><span className="font-bold text-white/88">{history.totalRounds > 0 ? ((history.totalWinsB / history.totalRounds) * 100).toFixed(1) : '0'}%</span></div>
            <div className="flex justify-between"><span>最高连胜</span><span className="font-bold text-sky-300">{history.longestStreakB} 🔥</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
        <button
          type="button"
          onClick={() => setSeasonOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-rdark-text">
            <Trophy size={16} className="text-amber-500" />
            赛季记录
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-rdark-input dark:text-rdark-text2">
              {history.seasons.length}
            </span>
          </h3>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${seasonOpen ? 'rotate-180' : ''}`} />
        </button>
        {seasonOpen ? (
          <div className="mt-3 space-y-3">
            {history.seasons.map((season) => (
              <div key={season.season} className={`rounded-lg p-3 ${season.champion ? 'bg-slate-50 dark:bg-rdark-hover' : 'border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10'}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-rdark-text">赛季 {season.season}</span>
                    <span className="text-[10px] text-slate-400">{season.startDate} ~ {season.endDate}</span>
                  </div>
                  {season.champion ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${season.champion === 'A' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {season.champion === 'A' ? item.optionA : item.optionB} 冠军
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">进行中</span>
                  )}
                </div>
                <SeasonBar winsA={season.winsA} winsB={season.winsB} nameA={item.optionA} nameB={item.optionB} />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
        <button
          type="button"
          onClick={() => setRoundOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-rdark-text">
            <BarChart3 size={16} className="text-slate-400" />
            当前赛季对局记录
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-rdark-input dark:text-rdark-text2">
              {displayRounds.length}
            </span>
          </h3>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${roundOpen ? 'rotate-180' : ''}`} />
        </button>
        {roundOpen ? (
          <div className="mt-3 space-y-1.5">
            {displayRounds.map((round) => (
              <div key={round.round} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-rdark-hover">
                <span className="w-12 font-mono text-slate-400">第{round.round}局</span>
                <span className={`font-bold ${round.winner === 'A' ? 'text-orange-500' : 'text-blue-500'}`}>
                  {round.winner === 'A' ? item.optionA : item.optionB} 胜
                </span>
                <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-rdark-border">
                  <div className="h-full bg-orange-400" style={{ width: `${(round.heatA / Math.max(1, round.heatA + round.heatB)) * 100}%` }} />
                  <div className="h-full bg-blue-400" style={{ width: `${(round.heatB / Math.max(1, round.heatA + round.heatB)) * 100}%` }} />
                </div>
                <span className="w-12 text-right text-orange-400">{round.heatA.toFixed(0)}</span>
                <span className="text-slate-300">vs</span>
                <span className="w-12 text-blue-400">{round.heatB.toFixed(0)}</span>
              </div>
            ))}
            {displayRounds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500 dark:text-rdark-text2">
                暂无历史对局记录
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const RivalryPK: React.FC<RivalryPKProps> = ({
  userVotes = {},
  onBet,
  onEnterBattle,
  pendingBetId,
}) => {
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [betModal, setBetModal] = useState<{ item: RivalryNewsItem; option: 'A' | 'B' } | null>(null);
  const topicsQuery = useRequestPKTopics({ page: 1, pageSize: 20 });
  const apiPKs = useMemo(
    () => (topicsQuery.data?.list ?? []).map(mapTopicSummaryToPK).filter((pk): pk is RivalryPKState => Boolean(pk)),
    [topicsQuery.data?.list],
  );
  const allPKs = apiPKs;
  const heroPK = allPKs[0];

  if (historyId) {
    const target = allPKs.find((pk) => pk.id === historyId);
    if (target) return <HistoryPage pk={target} onBack={() => setHistoryId(null)} />;
  }

  const handleConfirmBet = async (item: RivalryNewsItem, option: 'A' | 'B', amount: number) => {
    const odds = option === 'A' ? item.oddsA : item.oddsB;
    await onBet?.(item.id, option, odds, amount);
  };

  return (
    <section className="mx-0 grid w-full max-w-none gap-6 max-lg:gap-3 max-md:gap-2.5">
      {heroPK ? (
        <HeroPK
          pk={heroPK}
          onEnterBattle={onEnterBattle}
          onHistory={setHistoryId}
          onOpenBet={(item, option) => setBetModal({ item, option })}
          voted={userVotes[heroPK.newsItem.id] ?? heroPK.mySide}
          isBetting={pendingBetId === heroPK.newsItem.id}
        />
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center text-sm text-white/50">
          暂无开撕台数据
        </div>
      )}

      {allPKs.filter((pk) => pk.id !== heroPK?.id).length > 0 ? (
        <div className="relative">
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-100 md:mb-4 md:text-base">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#27d8cf] to-[#ff4f75] md:h-5" />
            全部对决
          </h2>
          <div className="grid grid-cols-1 gap-2.5 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allPKs.filter((pk) => pk.id !== heroPK?.id).map((pk, index) => (
              <PKCard
                key={pk.id}
                pk={pk}
                index={index}
                onEnterBattle={onEnterBattle}
                onHistory={setHistoryId}
                onOpenBet={(item, option) => setBetModal({ item, option })}
                voted={userVotes[pk.newsItem.id] ?? pk.mySide}
                isBetting={pendingBetId === pk.newsItem.id}
              />
            ))}
          </div>
        </div>
      ) : null}

      <RivalryBetModal
        open={Boolean(betModal)}
        item={betModal?.item ?? null}
        option={betModal?.option ?? null}
        submitting={Boolean(betModal && pendingBetId === betModal.item.id)}
        onClose={() => setBetModal(null)}
        onConfirm={handleConfirmBet}
      />
    </section>
  );
};
