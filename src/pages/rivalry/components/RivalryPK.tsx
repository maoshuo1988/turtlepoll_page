/**
 * 文件说明：Rivalry PK，开撕台页面组件和数据。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Clock,
  Crown,
  Flame,
  History,
  Lock,
  MessageCircleMore,
  Shield,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { PKPhase, PKRoundResult, PKTopicState, RivalryNewsItem } from './rivalryMockData';
import { mockPKStates, mockRivalryHero, mockRivalryItems } from './rivalryMockData';
import { RivalryBetModal } from './RivalryBetModal';
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

function getRivalryVisualTheme(item: RivalryNewsItem): RivalryVisualTheme {
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

  return {
    id: String(topic.id),
    apiTopicId: topic.id,
    isApi: true,
    newsItem: {
      id: String(topic.id),
      title,
      summary: summary.streakStatus || '接口话题已接入，历史战绩会从开撕台接口实时读取。',
      image: fallbackImages[index % fallbackImages.length],
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
  const heatTotal = pk.currentHeatA + pk.currentHeatB;
  const heatLabel =
    heatTotal >= 100 || Number.isInteger(heatTotal)
      ? heatTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : heatTotal.toFixed(1);
  const leading = pk.currentHeatA > pk.currentHeatB ? 'A' : pk.currentHeatB > pk.currentHeatA ? 'B' : null;
  const theme = getRivalryVisualTheme(item);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="legacy-hero-card legacy-pred-hero relative overflow-hidden rounded-[24px] border border-slate-700/60 bg-[#0a111f] shadow-[0_18px_44px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="absolute inset-0">
        <img src={item.image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#091121]/95 via-[#0b1426]/84 to-[#0f1a2a]/42" />
        <div className="absolute inset-y-0 left-0 w-[42%] overflow-hidden">
          <img src={theme.sideA.portrait} alt="" className="h-full w-full object-cover opacity-[0.34] mix-blend-screen" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.sideA.primary}66 0%, transparent 100%)` }} />
        </div>
        <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
          <img src={theme.sideB.portrait} alt="" className="h-full w-full object-cover opacity-[0.34] mix-blend-screen" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(270deg, ${theme.sideB.primary}66 0%, transparent 100%)` }} />
        </div>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 14% 88%, ${theme.sideA.accent}44, transparent 42%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 88% 18%, ${theme.sideB.accent}36, transparent 30%)` }} />
      </div>

      <div className="relative p-5 md:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-[#ffb45f]/18 bg-[#ffb45f]/8 px-3 py-1 text-xs font-bold text-[#eab268]"><Flame size={14} className="text-[#ff9f43]" />开撕台</span>
          <PhaseTag phase={pk.phase} />
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/80 backdrop-blur-sm">
            第{pk.currentRound}局 · 赛季{pk.season.season}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/80 backdrop-blur-sm" title={betTotal > 0 ? `本局累计热度 ${heatLabel}` : '阵营热度之和'}>
            <Users size={12} />
            {betTotal > 0 ? `${betTotal.toLocaleString()} 人次下注` : `热度合计 ${heatLabel}`}
          </span>
          {pk.lastRoundWinner && leading ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pk.lastRoundWinner === leading ? 'bg-[#123a3d]/82 text-[#9affec]' : 'bg-[#4a1824]/82 text-[#ffb9c6]'}`}>
              {pk.lastRoundWinner === 'A' ? item.optionA : item.optionB}
              {pk.lastRoundWinner === leading ? ' 守擂中' : ' 被翻盘'}
            </span>
          ) : null}
        </div>

        <h1 className="mb-1 text-xl font-extrabold leading-tight text-white md:text-2xl">{item.title}</h1>
        <p className="mb-4 max-w-xl text-sm text-white/50">{item.summary}</p>

        <div className="mb-4 rounded-2xl border border-white/[0.1] bg-black/25 px-4 py-3 backdrop-blur-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
              <span className="grid h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-black/30">
                <img src={theme.sideA.portrait} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-white">{item.optionA}</div>
                <div className="mt-0.5 text-xl font-black tabular-nums leading-none" style={{ color: theme.sideA.accent }}>
                  {formatPkHeatValue(pk.currentHeatA)}
                  <span className="ml-1 text-[11px] font-semibold text-white/45">热度</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-center px-2 sm:flex-col sm:pb-8">
              <span className="rounded-full border border-white/14 bg-white/[0.08] px-3 py-1 text-[11px] font-black tracking-[0.25em] text-white/55">VS</span>
            </div>
            <div className="flex min-w-0 flex-1 items-start gap-2.5 text-right sm:items-center sm:flex-row-reverse">
              <span className="grid h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-black/30">
                <img src={theme.sideB.portrait} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="min-w-0 flex-1 sm:flex-initial">
                <div className="truncate text-[13px] font-bold text-white">{item.optionB}</div>
                <div className="mt-0.5 text-xl font-black tabular-nums leading-none sm:text-right" style={{ color: theme.sideB.accent }}>
                  {formatPkHeatValue(pk.currentHeatB)}
                  <span className="ml-1 text-[11px] font-semibold text-white/45">热度</span>
                </div>
              </div>
            </div>
          </div>
          <RivalryHeatMeter heatA={pk.currentHeatA} heatB={pk.currentHeatB} theme={theme} variant="hero" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          {pk.phase === 'betting' ? (
            <>
              <Countdown target={pk.lockTime} label="下注截止" color="text-amber-300" />
              <Countdown target={pk.roundEndTime} label="本局结束" color="text-white/50" />
            </>
          ) : null}
          {pk.phase === 'locked' ? <Countdown target={pk.roundEndTime} label="本局结束" color="text-amber-300" /> : null}
          {pk.phase === 'cooldown' && pk.nextRoundTime ? <Countdown target={pk.nextRoundTime} label="下一局开始" color="text-[#40ead0]" /> : null}
        </div>

        {/* 顶部 Hero：赛季战绩块（日期 + N胜 + 细条 + 局点）先隐藏，可从历史战绩查看 */}
        {/* <div className="mb-4 rounded-[20px] border border-white/16 bg-[#071127]/28 p-3 shadow-[0_12px_34px_rgba(3,10,24,0.35)] backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">赛季{pk.season.season} 战绩</span>
            <span className="text-[10px] text-white/40">{pk.season.startDate} ~ {pk.season.endDate}</span>
          </div>
          <SeasonBar winsA={pk.season.winsA} winsB={pk.season.winsB} nameA={item.optionA} nameB={item.optionB} />
          <div className="mt-2 flex gap-1">
            <RoundDots rounds={pk.roundHistory} nameA={item.optionA} />
          </div>
        </div> */}

        <div className="mb-3 flex gap-3">
          <button
            onClick={() => onOpenBet(item, 'A')}
            disabled={isBetting || !!voted || pk.phase !== 'betting'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-bold ${
              voted === 'A'
                ? 'text-[#dcfff8] shadow-[0_0_20px_rgba(45,207,178,0.22)]'
                : isBetting || pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-white/5 text-white/30'
                  : 'text-[#dcfff8] shadow-[0_0_20px_rgba(45,207,178,0.16)]'
            }`}
            style={
              voted === 'A'
                ? { border: `1px solid ${theme.sideA.accent}93`, background: `${theme.sideA.primary}40`, color: '#ecfeff' }
                : isBetting || pk.phase !== 'betting'
                  ? undefined
                  : { border: `1px solid ${theme.sideA.accent}66`, background: `${theme.sideA.primary}33`, color: '#ecfeff' }
            }
          >
            <Crown size={16} />
            {isBetting ? '下注中...' : item.optionA}
          </button>
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Swords size={18} className="text-white/80" />
            </div>
          </div>
          <button
            onClick={() => onOpenBet(item, 'B')}
            disabled={isBetting || !!voted || pk.phase !== 'betting'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-bold ${
              voted === 'B'
                ? 'text-[#ffd7de] shadow-[0_14px_28px_rgba(255,79,117,0.16)]'
                : isBetting || pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-white/5 text-white/30'
                  : 'text-[#ffd7de] shadow-[0_14px_28px_rgba(255,79,117,0.12)]'
            }`}
            style={
              voted === 'B'
                ? { border: `1px solid ${theme.sideB.accent}73`, background: `${theme.sideB.primary}40`, color: '#fff1f2' }
                : isBetting || pk.phase !== 'betting'
                  ? undefined
                  : { border: `1px solid ${theme.sideB.accent}55`, background: `${theme.sideB.primary}30`, color: '#fff1f2' }
            }
          >
            <Crown size={16} />
            {isBetting ? '下注中...' : item.optionB}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <Trophy size={12} />
            <span>每局 3 天 · 热度高者胜 · 赛季持续累计</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onHistory(pk.id)} className="flex cursor-pointer items-center gap-1 rounded-lg border-0 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-white/20">
              <History size={12} />
              历史战绩
            </button>
            {onEnterBattle ? (
              <button onClick={() => onEnterBattle(item)} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#4f6489]/45 bg-[#10273d]/30 px-3 py-1.5 text-xs font-bold text-[#ffd7de] transition-colors hover:bg-[#163252]">
                <MessageCircleMore size={12} className="text-[#5df3d7]" />
                进入撕裂带
              </button>
            ) : null}
          </div>
        </div>
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
      className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1118] shadow-[0_14px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#3ad9be]/24 hover:shadow-[0_20px_44px_rgba(0,0,0,0.34)]"
    >
      <div className="relative h-32 overflow-hidden">
        <img src={item.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-72" loading="lazy" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,30,0.18),rgba(5,10,20,0.2))]" />
        <div className="absolute inset-y-0 left-0 w-[34%] overflow-hidden">
          <img src={theme.sideA.portrait} alt="" className="h-full w-full object-cover opacity-[0.36] mix-blend-screen" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.sideA.primary}7a, transparent 100%)` }} />
        </div>
        <div className="absolute inset-y-0 right-0 w-[34%] overflow-hidden">
          <img src={theme.sideB.portrait} alt="" className="h-full w-full object-cover opacity-[0.36] mix-blend-screen" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(270deg, ${theme.sideB.primary}7a, transparent 100%)` }} />
        </div>
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

      <div className="p-3.5">
        <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-white">{item.title}</h3>

        <div className="mb-2">
          <div className="mb-1 flex justify-between gap-2 text-[10px]">
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

        <div className="mb-2">
          {pk.phase === 'betting' ? <Countdown target={pk.lockTime} label="下注截止" color="text-amber-500" /> : null}
          {pk.phase === 'locked' ? <Countdown target={pk.roundEndTime} label="本局结束" color="text-amber-500" /> : null}
          {pk.phase === 'cooldown' && pk.nextRoundTime ? <Countdown target={pk.nextRoundTime} label="下一局" color="text-[#40ead0]" /> : null}
        </div>

        <div className="mb-2 flex gap-2">
          <button
            onClick={() => onOpenBet(item, 'A')}
            disabled={isBetting || !!voted || pk.phase !== 'betting'}
            className={`flex-1 rounded-xl border-0 py-2 text-xs font-bold ${
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
            className={`flex-1 rounded-xl border-0 py-2 text-xs font-bold ${
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
          <button onClick={() => onHistory(pk.id)} className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[10px] text-white/46 transition-colors hover:text-[#40ead0]">
            <History size={10} />
            历史战绩
          </button>
          {onEnterBattle ? (
            <button onClick={() => onEnterBattle(item)} className="flex cursor-pointer items-center gap-1 rounded-full border border-[#4f6489]/36 bg-[#10273d]/24 px-2 py-1 text-[10px] font-bold text-[#ffd7de] transition-colors hover:bg-[#163252]">
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
  hero = mockRivalryHero,
  items = mockRivalryItems,
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
  const mockPKs = useMemo(
    () => mockPKStates.filter((pk) => [hero.id, ...items.map((item) => item.id)].includes(pk.id)) as RivalryPKState[],
    [hero.id, items],
  );
  const allPKs = apiPKs.length > 0 ? apiPKs : mockPKs;
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
    <section className="view-shell view-rhythm mx-0 grid w-full max-w-none gap-6">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#27d8cf] to-[#ff4f75]" />
        <h2 className="text-base font-bold text-slate-100">开撕台</h2>
        <span className="text-xs text-white/48">
          身份对立 · 回合制 · 热度决胜
          {topicsQuery.isLoading ? ' · 接口加载中' : apiPKs.length > 0 ? ' · 已接入接口' : ' · 本地预览'}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1118] shadow-[0_14px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <img src={heroPK?.newsItem.image ?? hero.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.14]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#091121]/92 via-[#0b1426]/86 to-[#0f1a2a]/72" />
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#48ddc2]/28 bg-[#10273d]/70">
            <Swords size={20} className="text-white" />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-bold text-[#40ead0]">开撕台回合制玩法</h3>
            <p className="text-xs leading-relaxed text-white/68">
              每个对立话题会持续存在，按局循环。前 2 天可下注，第 3 天锁局，按双方热度判定胜负，并持续累计赛季战绩。
            </p>
          </div>
          </div>
          {heroPK && onEnterBattle ? (
            <button
              onClick={() => onEnterBattle(heroPK.newsItem)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-[#4f6489]/45 bg-[#10273d]/34 px-4 text-xs font-bold text-[#ffd7de] transition-colors hover:bg-[#163252]"
            >
              <MessageCircleMore size={14} className="text-[#5df3d7]" />
              进入撕裂带
            </button>
          ) : null}
        </div>
      </div>

      {heroPK ? (
        <HeroPK
          pk={heroPK}
          onEnterBattle={onEnterBattle}
          onHistory={setHistoryId}
          onOpenBet={(item, option) => setBetModal({ item, option })}
          voted={userVotes[heroPK.newsItem.id] ?? heroPK.mySide}
          isBetting={pendingBetId === heroPK.newsItem.id}
        />
      ) : null}

      {allPKs.filter((pk) => pk.id !== heroPK?.id).length > 0 ? (
        <div className="relative">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-100">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#27d8cf] to-[#ff4f75]" />
            全部对决
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
