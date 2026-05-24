/**
 * 文件说明：Battle Stage Page，独立撕裂带主战场页面。
 */
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  Bomb,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  Heart,
  Rocket,
  Sparkles,
  Sun,
  Sword,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

export interface BattleSide {
  name: string;
  shortName: string;
  ctaLabel: string;
  ctaSubLabel: string;
  emoji: string;
  imageUrl?: string;
  primaryColor: string;
  accentColor: string;
  heroBgGradient: string;
  buttonGradient: string;
  heatValue: number;
  multiplier: number;
  contribution: number;
  supporters: number;
  contributorAvatars: string[];
}

export interface BattleTheme {
  id: string;
  topicLabel: string;
  topicTitle: string;
  topicQuestion: string;
  countdown: string;
  totalCoins: number;
  sideA: BattleSide;
  sideB: BattleSide;
}

const buildSideImage = ({
  emoji,
  title,
  bgA,
  bgB,
  accent,
}: {
  emoji: string;
  title: string;
  bgA: string;
  bgB: string;
  accent: string;
}) => {
  const initials = title.slice(0, 2).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgA}" />
          <stop offset="100%" stop-color="${bgB}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="240" rx="36" fill="url(#bg)" />
      <rect x="14" y="14" width="212" height="212" rx="28" fill="none" stroke="rgba(255,255,255,0.22)" />
      <circle cx="172" cy="72" r="76" fill="url(#glow)" />
      <circle cx="76" cy="166" r="52" fill="${accent}" fill-opacity="0.18" />
      <text x="28" y="62" fill="rgba(255,255,255,0.92)" font-size="44" font-family="Arial, sans-serif" font-weight="700">${emoji}</text>
      <text x="28" y="162" fill="rgba(255,255,255,0.96)" font-size="74" font-family="Arial, sans-serif" font-weight="800">${initials}</text>
      <text x="30" y="198" fill="rgba(255,255,255,0.6)" font-size="18" font-family="Arial, sans-serif" letter-spacing="3">${title}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const THEMES: BattleTheme[] = [
  {
    id: 'dragon-vs-eagle',
    topicLabel: '全球主场争夺',
    topicTitle: '巨龙 vs 苍鹰',
    topicQuestion: '谁才是这个时代更能拉满声量的终极阵营?',
    countdown: '02:15:36',
    totalCoins: 4202400,
    sideA: {
      name: '巨龙阵营',
      shortName: '巨龙',
      ctaLabel: '支持巨龙',
      ctaSubLabel: '投币助威',
      emoji: '🐉',
      imageUrl: buildSideImage({
        emoji: '🐉',
        title: 'DRAGON',
        bgA: '#7f1d1d',
        bgB: '#dc2626',
        accent: '#f87171',
      }),
      primaryColor: '#dc2626',
      accentColor: '#f87171',
      heroBgGradient:
        'radial-gradient(circle at 50% 40%, rgba(239,68,68,0.45) 0%, rgba(127,29,29,0.15) 55%, transparent 80%)',
      buttonGradient: 'linear-gradient(135deg,#dc2626,#7f1d1d)',
      heatValue: 2356800,
      multiplier: 1.58,
      contribution: 21345,
      supporters: 9932,
      contributorAvatars: ['🐉', '🔥', '🛡️'],
    },
    sideB: {
      name: '苍鹰阵营',
      shortName: '苍鹰',
      ctaLabel: '支持苍鹰',
      ctaSubLabel: '投币反击',
      emoji: '🦅',
      imageUrl: buildSideImage({
        emoji: '🦅',
        title: 'EAGLE',
        bgA: '#1e3a8a',
        bgB: '#2563eb',
        accent: '#60a5fa',
      }),
      primaryColor: '#2563eb',
      accentColor: '#60a5fa',
      heroBgGradient:
        'radial-gradient(circle at 50% 40%, rgba(96,165,250,0.45) 0%, rgba(30,58,138,0.15) 55%, transparent 80%)',
      buttonGradient: 'linear-gradient(135deg,#2563eb,#1e3a8a)',
      heatValue: 1845600,
      multiplier: 1.42,
      contribution: 17932,
      supporters: 6132,
      contributorAvatars: ['🦅', '⚡', '🎯'],
    },
  },
  {
    id: 'sun-vs-moon',
    topicLabel: '昼夜美学大战',
    topicTitle: '太阳 vs 月亮',
    topicQuestion: '谁更适合做这场撕裂带的主场视觉?',
    countdown: '01:48:12',
    totalCoins: 3534900,
    sideA: {
      name: '太阳阵营',
      shortName: '太阳',
      ctaLabel: '支持太阳',
      ctaSubLabel: '投币助威',
      emoji: '☀️',
      imageUrl: buildSideImage({
        emoji: '☀️',
        title: 'SUN',
        bgA: '#78350f',
        bgB: '#f59e0b',
        accent: '#fbbf24',
      }),
      primaryColor: '#f59e0b',
      accentColor: '#fbbf24',
      heroBgGradient:
        'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.50) 0%, rgba(120,53,15,0.18) 55%, transparent 80%)',
      buttonGradient: 'linear-gradient(135deg,#f59e0b,#78350f)',
      heatValue: 2128600,
      multiplier: 1.53,
      contribution: 18765,
      supporters: 7123,
      contributorAvatars: ['☀️', '🌅', '🔥'],
    },
    sideB: {
      name: '月亮阵营',
      shortName: '月亮',
      ctaLabel: '支持月亮',
      ctaSubLabel: '投币反击',
      emoji: '🌙',
      imageUrl: buildSideImage({
        emoji: '🌙',
        title: 'MOON',
        bgA: '#312e81',
        bgB: '#7c3aed',
        accent: '#c4b5fd',
      }),
      primaryColor: '#7c3aed',
      accentColor: '#c4b5fd',
      heroBgGradient:
        'radial-gradient(circle at 50% 40%, rgba(196,181,253,0.45) 0%, rgba(49,46,129,0.18) 55%, transparent 80%)',
      buttonGradient: 'linear-gradient(135deg,#7c3aed,#312e81)',
      heatValue: 1406300,
      multiplier: 1.33,
      contribution: 14321,
      supporters: 5632,
      contributorAvatars: ['🌙', '✨', '🌌'],
    },
  },
  {
    id: 'coffee-vs-milktea',
    topicLabel: '饮品主场之争',
    topicTitle: '咖啡 vs 奶茶',
    topicQuestion: '谁才是年轻人的全天候能量来源?',
    countdown: '03:05:28',
    totalCoins: 3658300,
    sideA: {
      name: '咖啡阵营',
      shortName: '咖啡',
      ctaLabel: '支持咖啡',
      ctaSubLabel: '投币助威',
      emoji: '☕',
      imageUrl: buildSideImage({
        emoji: '☕',
        title: 'COFFEE',
        bgA: '#451a03',
        bgB: '#92400e',
        accent: '#d97706',
      }),
      primaryColor: '#92400e',
      accentColor: '#d97706',
      heroBgGradient:
        'radial-gradient(circle at 50% 40%, rgba(217,119,6,0.5) 0%, rgba(67,20,7,0.15) 55%, transparent 80%)',
      buttonGradient: 'linear-gradient(135deg,#92400e,#451a03)',
      heatValue: 1982400,
      multiplier: 1.49,
      contribution: 16789,
      supporters: 6152,
      contributorAvatars: ['☕', '🫘', '🥐'],
    },
    sideB: {
      name: '奶茶阵营',
      shortName: '奶茶',
      ctaLabel: '支持奶茶',
      ctaSubLabel: '投币反击',
      emoji: '🧋',
      imageUrl: buildSideImage({
        emoji: '🧋',
        title: 'MILKTEA',
        bgA: '#831843',
        bgB: '#ec4899',
        accent: '#f472b6',
      }),
      primaryColor: '#ec4899',
      accentColor: '#f472b6',
      heroBgGradient:
        'radial-gradient(circle at 50% 40%, rgba(244,114,182,0.5) 0%, rgba(131,24,67,0.15) 55%, transparent 80%)',
      buttonGradient: 'linear-gradient(135deg,#ec4899,#831843)',
      heatValue: 1675900,
      multiplier: 1.41,
      contribution: 15876,
      supporters: 5992,
      contributorAvatars: ['🧋', '🍡', '🌸'],
    },
  },
];

interface BattleComment {
  id: string;
  user: string;
  avatar: string;
  content: string;
  heat: number;
  likes: number;
}

const COMMENTS_A: BattleComment[] = [
  { id: 'a1', user: '东方智者鱼', avatar: '🐉', content: 'AI、5G、基建、制造链全都在起势,左侧必须赢。', heat: 56, likes: 1234 },
  { id: 'a2', user: '战神弱三', avatar: '🐯', content: '这边气势已经拉满了,中路节奏完全压过去。', heat: 28, likes: 856 },
  { id: 'a3', user: '爱国青年', avatar: '🐼', content: '看热度曲线就知道,支持面已经稳住了。', heat: 22, likes: 389 },
  { id: 'a4', user: '科技改变生活', avatar: '⚡', content: '左侧阵营从视觉到话题都更有记忆点。', heat: 18, likes: 256 },
];

const COMMENTS_B: BattleComment[] = [
  { id: 'b1', user: 'FreedomMan', avatar: '🦅', content: '右侧的爆发感更强,开场气氛一下就点燃了。', heat: 50, likes: 1132 },
  { id: 'b2', user: 'UncleSam', avatar: '🎩', content: '讲究的就是高对比和强反击,右边这波视觉更狠。', heat: 30, likes: 765 },
  { id: 'b3', user: '英利富之光', avatar: '🗽', content: '右路这张图一放出来,压迫感和识别度都够。', heat: 23, likes: 512 },
  { id: 'b4', user: '星辰大海', avatar: '🚀', content: '不是我说,这边的 glow 和按钮过渡就是更能打。', heat: 15, likes: 214 },
];

interface Contributor {
  rank: number;
  name: string;
  avatar: string;
  coins: number;
}

const CONTRIBUTORS: Contributor[] = [
  { rank: 1, name: '东方智者鱼', avatar: '🐉', coins: 56232 },
  { rank: 2, name: 'FreedomMan', avatar: '🦅', coins: 45678 },
  { rank: 3, name: '战神弱三', avatar: '🐯', coins: 28901 },
  { rank: 4, name: 'UncleSam', avatar: '🎩', coins: 23456 },
  { rank: 5, name: '英利富之光', avatar: '🗽', coins: 18765 },
  { rank: 6, name: '星辰大海', avatar: '🚀', coins: 15422 },
  { rank: 7, name: '爱国青年', avatar: '🐼', coins: 12345 },
  { rank: 8, name: '科技改变生活', avatar: '⚡', coins: 11234 },
];

interface BattleItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  cost: number;
  glow: string;
}

const ITEMS: BattleItem[] = [
  { id: 'rocket', name: '火箭炸弹', icon: <Rocket size={20} className="text-orange-400" />, cost: 999, glow: 'rgba(251,146,60,0.45)' },
  { id: 'moon', name: '月光炸弹', icon: <Sparkles size={20} className="text-cyan-300" />, cost: 520, glow: 'rgba(34,211,238,0.45)' },
  { id: 'fullbomb', name: '全屏蹦炸', icon: <Bomb size={20} className="text-rose-400" />, cost: 1399, glow: 'rgba(244,63,94,0.45)' },
];

interface TickerEntry {
  time: string;
  text: string;
}

const TICKER: TickerEntry[] = [
  { time: '23:25', text: '右侧阵营投入 10,000 🪙' },
  { time: '23:24', text: 'FreedomMan 触发 10000 积分大礼包,大礼!' },
  { time: '23:23', text: '战神弱三 投入 5,000 🪙' },
  { time: '23:23', text: '爆膛颗粒火药 发起了「引战 8」' },
];

function HeroPK({ theme }: { theme: BattleTheme }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/8 bg-[#0a111f] shadow-[0_18px_44px_rgba(0,0,0,0.36)]">
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <div className="relative px-6 py-7" style={{ background: theme.sideA.heroBgGradient }}>
          <div className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: theme.sideA.accentColor }}>
            {theme.sideA.name}
          </div>
          <div
            className="my-3 grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border shadow-[0_0_40px_var(--glow)]"
            style={{
              borderColor: `${theme.sideA.primaryColor}55`,
              background: `${theme.sideA.primaryColor}22`,
              ['--glow' as never]: `${theme.sideA.accentColor}55`,
            }}
          >
            {theme.sideA.imageUrl ? (
              <img src={theme.sideA.imageUrl} alt={theme.sideA.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[64px]">{theme.sideA.emoji}</span>
            )}
          </div>
          <div className="font-sans text-[28px] font-black tabular-nums tracking-tight text-white">
            {theme.sideA.heatValue.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-white/55">热度值</div>
          <span
            className="mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-black"
            style={{ borderColor: `${theme.sideA.accentColor}55`, background: `${theme.sideA.primaryColor}33`, color: theme.sideA.accentColor }}
          >
            ×{theme.sideA.multiplier} 倍
          </span>
        </div>

        <div className="flex min-w-[280px] flex-col items-center justify-center px-4 py-7 text-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-amber-200">
            <Flame size={11} />
            {theme.topicLabel}
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-white">
            <span style={{ color: theme.sideA.accentColor }}>{theme.sideA.shortName}</span>
            <span className="mx-2 text-white/40">vs</span>
            <span style={{ color: theme.sideB.accentColor }}>{theme.sideB.shortName}</span>
          </h1>
          <p className="mt-2 max-w-[260px] text-[12px] leading-5 text-white/55">{theme.topicQuestion}</p>
        </div>

        <div className="relative px-6 py-7 text-right" style={{ background: theme.sideB.heroBgGradient }}>
          <div className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: theme.sideB.accentColor }}>
            {theme.sideB.name}
          </div>
          <div
            className="my-3 ml-auto grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border shadow-[0_0_40px_var(--glow)]"
            style={{
              borderColor: `${theme.sideB.primaryColor}55`,
              background: `${theme.sideB.primaryColor}22`,
              ['--glow' as never]: `${theme.sideB.accentColor}55`,
            }}
          >
            {theme.sideB.imageUrl ? (
              <img src={theme.sideB.imageUrl} alt={theme.sideB.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[64px]">{theme.sideB.emoji}</span>
            )}
          </div>
          <div className="font-sans text-[28px] font-black tabular-nums tracking-tight text-white">
            {theme.sideB.heatValue.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-white/55">热度值</div>
          <span
            className="mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-black"
            style={{ borderColor: `${theme.sideB.accentColor}55`, background: `${theme.sideB.primaryColor}33`, color: theme.sideB.accentColor }}
          >
            ×{theme.sideB.multiplier} 倍
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 border-t border-white/6 bg-black/35 px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-white/55">我方贡献</div>
          <div className="font-sans text-[18px] font-black tabular-nums text-white">
            {theme.sideA.contribution.toLocaleString()}
          </div>
          <div className="ml-2 flex -space-x-2">
            {theme.sideA.contributorAvatars.slice(0, 3).map((avatar, index) => (
              <span
                key={index}
                className="grid h-7 w-7 place-items-center rounded-full border-2 text-[16px]"
                style={{ borderColor: theme.sideA.primaryColor, background: '#0a111f' }}
              >
                {avatar}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1">
          <Timer size={13} className="text-amber-200" />
          <span className="font-sans text-[14px] font-black tabular-nums text-amber-200">{theme.countdown}</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <div className="mr-2 flex -space-x-2">
            {theme.sideB.contributorAvatars.slice(0, 3).map((avatar, index) => (
              <span
                key={index}
                className="grid h-7 w-7 place-items-center rounded-full border-2 text-[16px]"
                style={{ borderColor: theme.sideB.primaryColor, background: '#0a111f' }}
              >
                {avatar}
              </span>
            ))}
          </div>
          <div className="font-sans text-[18px] font-black tabular-nums text-white">
            {theme.sideB.contribution.toLocaleString()}
          </div>
          <div className="text-[11px] text-white/55">对方贡献</div>
        </div>
      </div>

      <CoinTrail theme={theme} />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 pb-6 pt-4">
        <button
          className="group relative flex h-[56px] items-center justify-center gap-3 overflow-hidden rounded-2xl text-left text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"
          style={{ background: theme.sideA.buttonGradient }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-[20px]">
            {theme.sideA.emoji}
          </span>
          <div>
            <div className="text-[15px] font-black leading-none">{theme.sideA.ctaLabel}</div>
            <div className="mt-1 text-[10.5px] font-bold opacity-85">{theme.sideA.ctaSubLabel}</div>
          </div>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>

        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-white/70">
          <Sword size={18} />
        </div>

        <button
          className="group relative flex h-[56px] items-center justify-center gap-3 overflow-hidden rounded-2xl text-right text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"
          style={{ background: theme.sideB.buttonGradient }}
        >
          <div>
            <div className="text-[15px] font-black leading-none">{theme.sideB.ctaLabel}</div>
            <div className="mt-1 text-[10.5px] font-bold opacity-85">{theme.sideB.ctaSubLabel}</div>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-[20px]">
            {theme.sideB.emoji}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </div>
    </div>
  );
}

function CoinTrail({ theme }: { theme: BattleTheme }) {
  return (
    <div className="relative h-12 overflow-hidden bg-gradient-to-r from-transparent via-amber-400/8 to-transparent">
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className="flex flex-1 items-center gap-1">
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.span
              key={`l-${index}`}
              className="text-[14px]"
              animate={{ x: [0, 12, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
            >
              🪙
            </motion.span>
          ))}
        </div>
        <span
          className="px-3 text-[28px] font-black italic tracking-wide text-amber-200 [text-shadow:0_0_18px_rgba(251,191,36,0.55)]"
          style={{ textShadow: `0 0 18px ${theme.sideA.accentColor}66, 0 0 24px ${theme.sideB.accentColor}66` }}
        >
          PK
        </span>
        <div className="flex flex-1 items-center justify-end gap-1">
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.span
              key={`r-${index}`}
              className="text-[14px]"
              animate={{ x: [0, -12, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
            >
              🪙
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentsArea({ theme }: { theme: BattleTheme }) {
  const [tab, setTab] = useState<'all' | 'hot' | 'a' | 'b' | 'highlight'>('all');
  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'hot', label: '热门' },
    { id: 'a', label: `只看${theme.sideA.shortName}` },
    { id: 'b', label: `只看${theme.sideB.shortName}` },
    { id: 'highlight', label: '精彩' },
  ] as const;

  return (
    <div className="rounded-[16px] border border-white/8 bg-[#0c121d] p-3 shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-1 border-b border-white/6 pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
              tab === item.id ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <CommentColumn side={theme.sideA} comments={COMMENTS_A} />
        <CommentColumn side={theme.sideB} comments={COMMENTS_B} />
      </div>
    </div>
  );
}

function CommentColumn({ side, comments }: { side: BattleSide; comments: BattleComment[] }) {
  return (
    <div
      className="flex h-[420px] min-h-0 flex-col overflow-hidden rounded-[14px] border bg-black/40"
      style={{ borderColor: `${side.primaryColor}45` }}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/6 px-3 py-2" style={{ background: `${side.primaryColor}22` }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[16px]">{side.emoji}</span>
          <span className="text-[13px] font-black text-white">{side.name}</span>
        </div>
        <span className="text-[10.5px] font-bold text-white/55">(支持数: {side.supporters.toLocaleString()}人)</span>
      </header>
      <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15">
        {comments.map((comment) => (
          <li key={comment.id} className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[14px]"
                style={{ borderColor: `${side.accentColor}55`, background: '#0a111f' }}
              >
                {comment.avatar}
              </span>
              <span className="truncate text-[12.5px] font-bold" style={{ color: side.accentColor }}>
                {comment.user}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9.5px] font-black text-rose-300">
                <Flame size={9} />
                热{comment.heat}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 pl-9 text-[12px] leading-5 text-white/80">{comment.content}</p>
            <div className="mt-1 flex items-center justify-end gap-3 text-[10.5px] text-white/45">
              <span className="inline-flex items-center gap-0.5">
                <Heart size={10} />
                {comment.likes.toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex shrink-0 items-center gap-2 border-t border-white/6 bg-black/40 px-3 py-2">
        <input
          placeholder={`为${side.shortName}阵营发声...`}
          className="flex-1 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11.5px] text-white outline-none placeholder:text-white/35 focus:border-white/20"
        />
        <button className="rounded-full px-3 py-1 text-[11.5px] font-bold text-white" style={{ background: side.buttonGradient }}>
          发送
        </button>
        <button className="text-[11px] text-white/55">送礼物</button>
      </div>
    </div>
  );
}

function LiveTicker() {
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#0c121d] px-4 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-amber-200">
        <Zap size={11} />
        实时战报
      </span>
      <div className="flex flex-1 items-center gap-6 overflow-hidden whitespace-nowrap">
        {TICKER.map((item, index) => (
          <span key={index} className="inline-flex items-center gap-1.5 text-[11.5px] text-white/70">
            <span className="font-bold text-white/45">{item.time}</span>
            <span>{item.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ContributorsLeaderboard() {
  const medalColor = (rank: number) => (rank === 1 ? '#fbbf24' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#d97706' : '#475569');

  return (
    <section className="overflow-hidden rounded-[16px] border border-white/8 bg-[#0c121d] shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
      <header className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
        <Trophy size={16} className="text-amber-300" />
        <span className="text-[13px] font-black text-white">热度贡献榜</span>
      </header>
      <ul className="divide-y divide-white/5">
        {CONTRIBUTORS.map((user) => (
          <li key={user.rank} className="flex items-center gap-3 px-3 py-2">
            <span className="w-5 text-center text-[12px] font-black tabular-nums" style={{ color: medalColor(user.rank) }}>
              {user.rank}
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/40 text-[14px]">
              {user.avatar}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-white">{user.name}</span>
            <span className="text-[11.5px] font-black tabular-nums text-amber-200">{user.coins.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BattleItems({ theme }: { theme: BattleTheme }) {
  return (
    <section className="rounded-[16px] border border-white/8 bg-[#0c121d] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
      <header className="mb-3 flex items-center gap-2 border-b border-white/6 pb-2">
        <Award size={16} className="text-cyan-300" />
        <span className="text-[13px] font-black text-white">战场道具</span>
      </header>
      <div className="grid grid-cols-3 gap-2">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-black/35 px-2 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-white/18"
            style={{ boxShadow: `0 0 0 0 ${item.glow}` }}
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `radial-gradient(circle, ${item.glow}, transparent 70%)` }}>
              {item.icon}
            </div>
            <div className="text-[10.5px] font-bold text-white/80">{item.name}</div>
            <div className="text-[10.5px] font-black tabular-nums text-amber-200">{item.cost.toLocaleString()}</div>
          </button>
        ))}
      </div>

      <div
        className="mt-3 rounded-xl border p-3"
        style={{
          borderColor: `${theme.sideA.accentColor}33`,
          background: `linear-gradient(135deg, ${theme.sideA.primaryColor}22, ${theme.sideB.primaryColor}22)`,
        }}
      >
        <div className="flex items-center gap-2">
          <Gift size={14} className="text-amber-200" />
          <span className="text-[12px] font-black text-white">礼物特效</span>
        </div>
        <div className="mt-2 grid place-items-center">
          <div
            className="grid h-16 w-16 place-items-center rounded-full text-[36px] shadow-[0_0_30px_var(--g)]"
            style={{ background: `${theme.sideA.primaryColor}22`, ['--g' as never]: `${theme.sideA.accentColor}55` }}
          >
            🎆
          </div>
          <div className="mt-2 text-[10.5px] text-white/55">最贡献小爱投入 10,000 🪙</div>
          <button
            className="mt-2 w-full rounded-full px-3 py-2 text-[13px] font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
            style={{ background: `linear-gradient(135deg, ${theme.sideA.primaryColor}, ${theme.sideB.primaryColor})` }}
          >
            热度 +50,000
          </button>
        </div>
      </div>
    </section>
  );
}

export const BattleStagePage: React.FC = () => {
  const [themeIdx, setThemeIdx] = useState(0);
  const theme = useMemo(() => THEMES[themeIdx], [themeIdx]);

  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-3 pb-8 view-battle-stage">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/22 bg-amber-400/[0.05] px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] text-amber-200/85">
          <Crown size={14} />
          <span className="font-black uppercase tracking-wider">Battle Stage 模板预览</span>
          <span className="text-amber-200/55">· 当前主题 #{themeIdx + 1} / {THEMES.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setThemeIdx(index)}
              className={`rounded-full border px-3 py-1 text-[11.5px] font-black transition-all ${
                themeIdx === index
                  ? 'border-amber-300/60 bg-amber-300/20 text-amber-100'
                  : 'border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]'
              }`}
            >
              {item.sideA.emoji} {item.sideA.shortName} vs {item.sideB.shortName} {item.sideB.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <HeroPK theme={theme} />
          <CommentsArea theme={theme} />
          <LiveTicker />
        </div>

        <aside className="space-y-3">
          <div className="rounded-[16px] border border-white/8 bg-[#0c121d] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
            <header className="mb-2 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-black text-white">
                <BarChart3 size={14} className="text-cyan-300" />
                今日战场数据
              </span>
            </header>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-black/35 p-2 text-center">
                <div className="font-sans text-[15px] font-black text-white">128 场</div>
                <div className="text-[9.5px] text-white/55">总场次</div>
              </div>
              <div className="rounded-lg bg-black/35 p-2 text-center">
                <div className="font-sans text-[15px] font-black text-amber-200">{theme.totalCoins.toLocaleString()}</div>
                <div className="text-[9.5px] text-white/55">累计奖池</div>
              </div>
              <div className="rounded-lg bg-black/35 p-2 text-center">
                <div className="font-sans text-[15px] font-black text-emerald-300">156,234</div>
                <div className="text-[9.5px] text-white/55">总贡献</div>
              </div>
            </div>
          </div>

          <ContributorsLeaderboard />
          <BattleItems theme={theme} />

          <div className="flex items-center gap-2 rounded-[14px] border border-white/8 bg-[#0c121d] px-3 py-2 text-[11px] text-white/65 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
            <Sun size={14} className="text-amber-200" />
            <span>9°C Clear</span>
            <Coins size={12} className="ml-auto text-amber-200" />
            <span className="font-black tabular-nums">{theme.totalCoins.toLocaleString()}</span>
          </div>
        </aside>
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => setThemeIdx((index) => (index + 1) % THEMES.length)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
        >
          切换下一个主题
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
};
