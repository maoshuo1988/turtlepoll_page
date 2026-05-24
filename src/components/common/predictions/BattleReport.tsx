/**
 * 文件说明：Battle Report，预测市场和撕裂带相关共享组件。
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Shield, Zap, Trophy, TrendingUp, AlertTriangle, Coins, ThumbsUp, MessageSquare, Sparkles, Bot, Heart, Anchor } from 'lucide-react';
import type { EventComment } from './EventBattle/eventBattleTypes';
import { getBattlePetSkillsForSkin } from '@/components/common/pet/battlePetSkills';

/* ══════════ Types ══════════ */
type ReportType = 'fire' | 'defense' | 'turtle' | 'alert' | 'gold';
type TriggerCategory = 'invasion' | 'firepower' | 'odds';

interface BattleMessage {
  id: string;
  type: ReportType;
  category: TriggerCategory;
  text: string;
  timestamp: number;
  commentId?: string; // links to a specific comment for click-to-highlight
  likes?: number;     // report likes count
}

interface WhaleAlert {
  id: string;
  userName: string;
  side: string;
  amount: number;
  timestamp: number;
}

interface MvpUser {
  name: string;
  avatar: string;
  score: number;
  badge: string;
  badgeLabel: string;
}

interface BattleReportProps {
  commentsA: EventComment[];
  commentsB: EventComment[];
  leftPower: number;
  rightPower: number;
  splitPct: number;
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  userSide: 'A' | 'B' | null;
  equippedSkinId?: string;
  onHighlightComment?: (commentId: string) => void;
}

/* ══════════ Constants ══════════ */
const LC = '#00D2FF';
const RC = '#FF0055';
const TICKER_DISPLAY_MS = 6000; // each report stays 6s
const MAX_QUEUE = 12;           // max queue size
const PIVOT_THRESHOLD = 3;      // splitPct within ±3% of 50 triggers pivot mode
const WHALE_DISPLAY_MS = 5000;  // whale broadcast stays 5s

const TYPE_CONFIG: Record<ReportType, { icon: React.ReactNode; glow: string; bg: string; border: string }> = {
  fire:    { icon: <Flame size={15} />,         glow: '#ff6600', bg: 'rgba(255,102,0,0.12)',  border: 'rgba(255,102,0,0.3)' },
  defense: { icon: <Shield size={15} />,        glow: '#00D2FF', bg: 'rgba(0,210,255,0.12)',  border: 'rgba(0,210,255,0.3)' },
  turtle:  { icon: <span className="text-sm">🐢</span>, glow: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)' },
  alert:   { icon: <AlertTriangle size={15} />, glow: '#ff0055', bg: 'rgba(255,0,85,0.15)',   border: 'rgba(255,0,85,0.4)' },
  gold:    { icon: <Coins size={15} />,         glow: '#ffd700', bg: 'rgba(255,215,0,0.15)',  border: 'rgba(255,215,0,0.4)' },
};

/* ══════════════════════════════════════════════════
   一、 战报模板系统 (Report Template System)
   ══════════════════════════════════════════════════ */

interface ReportTemplate {
  type: ReportType;
  category: TriggerCategory;
  text: string; // supports [阵营名] [对手阵营] [百分比] [用户名] [火力值] [数字] [赔率]
}

const reportTemplates: Record<TriggerCategory, ReportTemplate[]> = {
  /* ── 1. 领地拉锯类 (Invasion) ── */
  invasion: [
    { type: 'alert',   category: 'invasion', text: '🚨 警报！[阵营名] 正在大举入侵，防线告急！' },
    { type: 'defense', category: 'invasion', text: '⚡ 反击！[阵营名] 夺回了丢失的 [百分比]% 领地，气势如虹！' },
    { type: 'turtle',  category: 'invasion', text: '📉 胶着：双方在中轴线附近展开激战，火药味十足。' },
    { type: 'alert',   category: 'invasion', text: '🚨 阵营沦陷警报：[对手阵营] 方阵地告急！防线即将崩溃！' },
    { type: 'defense', category: 'invasion', text: '🛡️ 坚固防线：[阵营名] 成功顶住了言论攻势，领地收复 [百分比]%！' },
    { type: 'alert',   category: 'invasion', text: '⚠️ 战局反转！[阵营名] 在最后时刻发起猛攻，局势大变！' },
  ],

  /* ── 2. 火力爆发类 (Firepower) ── */
  firepower: [
    { type: 'fire',   category: 'firepower', text: '🔥 火力全开：[阵营名] 阵营爆出神评，瞬间点燃全场！' },
    { type: 'fire',   category: 'firepower', text: '🗣️ 情报狂潮：大量情报员涌入，讨论热度爆表！当前 [数字] 条评论。' },
    { type: 'fire',   category: 'firepower', text: '💎 精选打击：[用户名] 发出硬核分析，对方阵营陷入沉默。' },
    { type: 'fire',   category: 'firepower', text: '🔥 热度爆发：[阵营名] 阵营 [用户名] 发出了神评，瞬间收割 [火力值] 赞！' },
    { type: 'turtle', category: 'firepower', text: '🐢 小龟提醒：检测到大量新用户加入，战场正变得拥挤！' },
    { type: 'fire',   category: 'firepower', text: '⚡ 实时战况：双方总火力已达 [火力值] 点，战斗白热化！' },
  ],

  /* ── 3. 利益变动类 (Odds) ── */
  odds: [
    { type: 'gold',   category: 'odds', text: '💰 赔率大震荡：局势反转！现在加入 [阵营名] 收益翻倍！' },
    { type: 'gold',   category: 'odds', text: '⏳ 最后机会：预测窗口即将关闭，已有大量龟币入场！' },
    { type: 'gold',   category: 'odds', text: '📊 赔率波动：[阵营名] 方逻辑出现漏洞，赔率正在剧烈变化！立即下注！' },
    { type: 'gold',   category: 'odds', text: '💰 行情速报：[阵营名] 赔率升至 [赔率]x，抄底的好时机？' },
  ],
};

/* ── Placeholder Replacement ── */
function fillTemplate(
  template: ReportTemplate,
  ctx: {
    leadingSide: string;
    losingSide: string;
    shiftPct: number;
    topUserName: string;
    totalComments: number;
    totalPower: number;
    currentOdds: string;
  },
): BattleMessage {
  let text = template.text;
  text = text.replace(/\[阵营名\]/g, ctx.leadingSide);
  text = text.replace(/\[对手阵营\]/g, ctx.losingSide);
  text = text.replace(/\[百分比\]/g, String(ctx.shiftPct));
  text = text.replace(/\[用户名\]/g, ctx.topUserName);
  text = text.replace(/\[数字\]/g, String(ctx.totalComments));
  text = text.replace(/\[火力值\]/g, String(ctx.totalPower));
  text = text.replace(/\[赔率\]/g, ctx.currentOdds);
  return {
    id: `${template.category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: template.type,
    category: template.category,
    text,
    timestamp: Date.now(),
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ══════════ CountUp Hook ══════════ */
function useCountUp(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

/* ══════════ Ticker Line ══════════ */
const TickerLine: React.FC<{
  message: BattleMessage;
  onClickReport?: () => void;
  onLikeReport?: () => void;
  isPivotMode?: boolean;
}> = ({ message, onClickReport, onLikeReport, isPivotMode }) => {
  const cfg = TYPE_CONFIG[message.type];
  const [floatingHearts, setFloatingHearts] = useState<string[]>([]);
  const isClickable = !!message.commentId;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeReport?.();
    const hid = `h-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
    setFloatingHearts(prev => [...prev, hid]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex items-start gap-2.5 px-4 py-2 w-full relative ${isClickable ? 'cursor-pointer hover:bg-white/[0.03]' : ''}`}
      onClick={isClickable ? onClickReport : undefined}
      style={isPivotMode ? { background: 'rgba(255,200,0,0.06)' } : undefined}
    >
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
        style={{
          background: isPivotMode ? 'rgba(255,200,0,0.2)' : cfg.bg,
          color: isPivotMode ? '#ffd700' : cfg.glow,
          border: `1px solid ${isPivotMode ? 'rgba(255,200,0,0.5)' : cfg.border}`,
        }}
      >
        {isPivotMode ? <Anchor size={15} /> : cfg.icon}
      </span>
      <span className={`text-[11px] leading-relaxed flex-1 ${isPivotMode ? 'text-yellow-200 font-bold' : 'text-slate-200'}`} style={{ wordBreak: 'break-all' }}>
        {message.text}
        {isClickable && <span className="text-[9px] text-cyan-400/60 ml-1">点击查看 &gt;</span>}
      </span>
      {/* Report like button */}
      <button
        onClick={handleLike}
        className="shrink-0 flex items-center gap-0.5 mt-0.5 opacity-50 hover:opacity-100 transition-opacity relative"
      >
        <Heart size={10} className={`${(message.likes ?? 0) > 0 ? 'text-pink-400 fill-pink-400' : 'text-slate-500'}`} />
        {(message.likes ?? 0) > 0 && (
          <span className="text-[8px] text-pink-400 tabular-nums">{message.likes}</span>
        )}
        <AnimatePresence>
          {floatingHearts.map(hid => (
            <FloatingHeart key={hid} id={hid} onDone={() => setFloatingHearts(prev => prev.filter(h => h !== hid))} />
          ))}
        </AnimatePresence>
      </button>
    </motion.div>
  );
};

/* ══════════ Gold Barrage ══════════ */
const GoldBarrage: React.FC<{ text: string; onDone: () => void }> = ({ text, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ x: '110%' }}
      animate={{ x: '-110%' }}
      transition={{ duration: 4, ease: 'linear' }}
      className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap z-50 pointer-events-none"
    >
      <span
        className="px-5 py-2 rounded-full text-sm font-bold"
        style={{
          background: 'linear-gradient(90deg, #ffd700, #ffaa00)',
          color: '#1a0a00',
          textShadow: '0 0 8px rgba(255,215,0,0.6)',
          boxShadow: '0 0 24px rgba(255,215,0,0.4), 0 0 48px rgba(255,215,0,0.2)',
        }}
      >
        ✨ {text} ✨
      </span>
    </motion.div>
  );
};

/* ══════════ Whale Broadcast (Full-width) ══════════ */
const WhaleBroadcast: React.FC<{ alert: WhaleAlert; onDone: () => void }> = ({ alert, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, WHALE_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotateX: 90 }}
      animate={{ scale: 1, opacity: 1, rotateX: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: -40 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="absolute inset-x-2 top-1/3 -translate-y-1/2 z-50 pointer-events-none"
    >
      <div
        className="rounded-xl px-4 py-3 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,170,0,0.2) 50%, rgba(255,215,0,0.25) 100%)',
          border: '2px solid rgba(255,215,0,0.6)',
          boxShadow: '0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.2), inset 0 0 30px rgba(255,215,0,0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.6, repeat: 3 }}
          className="text-lg mb-1"
        >
          🐋
        </motion.div>
        <div className="text-[11px] font-black text-yellow-200 mb-1" style={{ textShadow: '0 0 8px rgba(255,215,0,0.8)' }}>
          巨鳄入场！
        </div>
        <div className="text-[10px] text-yellow-100/90">
          情报员 <span className="font-bold text-yellow-300">{alert.userName}</span> 梭哈{' '}
          <span className="font-black text-yellow-200">{alert.amount.toLocaleString()}</span> 龟币支持{' '}
          <span className="font-bold text-yellow-300">{alert.side}</span>！
        </div>
      </div>
    </motion.div>
  );
};

/* ══════════ Floating Hearts (Report Likes) ══════════ */
const FloatingHeart: React.FC<{ id: string; onDone: () => void }> = ({ onDone }) => {
  const x = useMemo(() => Math.random() * 20 - 10, []);
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -35, x, scale: 1.2 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="absolute -top-1 right-2 pointer-events-none text-pink-400 z-20"
    >
      <Heart size={10} fill="currentColor" />
    </motion.div>
  );
};

/* ══════════ Radar Chart (SVG) ══════════ */
const PredictionRadar: React.FC<{
  leftPower: number;
  rightPower: number;
  commentsA: EventComment[];
  commentsB: EventComment[];
  oddsA: number;
  oddsB: number;
}> = ({ leftPower, rightPower, commentsA, commentsB, oddsA, oddsB }) => {
  const total = leftPower + rightPower || 1;
  const suppressA = leftPower / total;
  const suppressB = rightPower / total;
  const activeA = commentsA.length / (commentsA.length + commentsB.length || 1);
  const activeB = commentsB.length / (commentsA.length + commentsB.length || 1);
  const oddsNormA = oddsB / (oddsA + oddsB);
  const oddsNormB = oddsA / (oddsA + oddsB);

  const cx = 85, cy = 78, r = 58;
  const angles = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];
  const labels = ['压制力', '活跃度', '赔率'];

  const toPoint = (angle: number, val: number) => ({
    x: cx + Math.cos(angle) * r * val,
    y: cy + Math.sin(angle) * r * val,
  });

  const pathA = angles.map((a, i) => {
    const vals = [suppressA, activeA, oddsNormA];
    const p = toPoint(a, vals[i]);
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
  }).join(' ') + ' Z';

  const pathB = angles.map((a, i) => {
    const vals = [suppressB, activeB, oddsNormB];
    const p = toPoint(a, vals[i]);
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
  }).join(' ') + ' Z';

  return (
    <svg width="170" height="160" viewBox="0 0 170 160" className="shrink-0">
      {[0.33, 0.66, 1].map((s) => (
        <polygon
          key={s}
          points={angles.map((a) => `${toPoint(a, s).x},${toPoint(a, s).y}`).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
      ))}
      {angles.map((a, i) => {
        const p = toPoint(a, 1);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <text
              x={toPoint(a, 1.2).x}
              y={toPoint(a, 1.2).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.45)"
              fontSize={9}
              fontWeight="bold"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
      <motion.path d={pathA} fill={`${LC}25`} stroke={LC} strokeWidth={2} initial={{ opacity: 0 }} animate={{ opacity: 1, d: pathA }} transition={{ duration: 0.8 }} />
      <motion.path d={pathB} fill={`${RC}25`} stroke={RC} strokeWidth={2} initial={{ opacity: 0 }} animate={{ opacity: 1, d: pathB }} transition={{ duration: 0.8 }} />
      <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.2)" />
    </svg>
  );
};

/* ══════════ MVP Hero Spotlight ══════════ */
const HeroSpotlight: React.FC<{
  mvpA: MvpUser | null;
  mvpB: MvpUser | null;
}> = ({ mvpA, mvpB }) => (
  <div className="flex items-center justify-center gap-4 py-3 px-2">
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      {mvpA ? (
        <>
          <motion.div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl relative"
            style={{ border: `2.5px solid ${LC}`, boxShadow: `0 0 16px ${LC}50` }}
            animate={{ boxShadow: [`0 0 10px ${LC}30`, `0 0 22px ${LC}60`, `0 0 10px ${LC}30`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {mvpA.avatar}
            <span className="absolute -top-1.5 -right-1.5 text-sm">{mvpA.badge}</span>
          </motion.div>
          <span className="text-[10px] text-cyan-300 font-bold truncate max-w-[80px]">{mvpA.name}</span>
          <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{mvpA.badgeLabel}</span>
          <span className="text-xs font-bold" style={{ color: LC }}>{mvpA.score}</span>
        </>
      ) : (
        <div className="w-12 h-12 rounded-full border border-dashed border-white/20" />
      )}
    </div>
    <motion.div className="text-base font-black text-white/60 select-none shrink-0" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>VS</motion.div>
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      {mvpB ? (
        <>
          <motion.div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl relative"
            style={{ border: `2.5px solid ${RC}`, boxShadow: `0 0 16px ${RC}50` }}
            animate={{ boxShadow: [`0 0 10px ${RC}30`, `0 0 22px ${RC}60`, `0 0 10px ${RC}30`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {mvpB.avatar}
            <span className="absolute -top-1.5 -right-1.5 text-sm">{mvpB.badge}</span>
          </motion.div>
          <span className="text-[10px] text-pink-300 font-bold truncate max-w-[80px]">{mvpB.name}</span>
          <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{mvpB.badgeLabel}</span>
          <span className="text-xs font-bold" style={{ color: RC }}>{mvpB.score}</span>
        </>
      ) : (
        <div className="w-12 h-12 rounded-full border border-dashed border-white/20" />
      )}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════
   二、 Main BattleReport Component
   ══════════════════════════════════════════════════ */
export const BattleReport: React.FC<BattleReportProps> = ({
  commentsA,
  commentsB,
  leftPower,
  rightPower,
  splitPct,
  optionA,
  optionB,
  oddsA,
  oddsB,
  userSide,
  equippedSkinId,
  onHighlightComment,
}) => {
  /* ── Display Queue (the core of the new system) ── */
  const [displayQueue, setDisplayQueue] = useState<BattleMessage[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [goldBarrages, setGoldBarrages] = useState<{ id: string; text: string }[]>([]);
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [isPivotMode, setIsPivotMode] = useState(false);
  const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([]);

  const displayPowerA = useCountUp(leftPower);
  const displayPowerB = useCountUp(rightPower);

  /* ── Tracking refs for trigger detection ── */
  const prevSplitPct = useRef(splitPct);
  const prevTotalLikes = useRef(0);
  const prevTotalComments = useRef(commentsA.length + commentsB.length);
  const prevOddsA = useRef(oddsA);
  const prevOddsB = useRef(oddsB);

  /* ── Helper: build context for placeholder filling ── */
  const buildCtx = useCallback(() => {
    const leftLeading = leftPower >= rightPower;
    const topA = commentsA.length > 0 ? [...commentsA].sort((a, b) => b.likes - a.likes)[0] : null;
    const topB = commentsB.length > 0 ? [...commentsB].sort((a, b) => b.likes - a.likes)[0] : null;
    const topUser = leftLeading ? topA : topB;
    return {
      leadingSide: leftLeading ? optionA : optionB,
      losingSide: leftLeading ? optionB : optionA,
      shiftPct: Math.round(Math.abs(splitPct - 50)),
      topUserName: topUser?.author.name ?? '匿名龟友',
      totalComments: commentsA.length + commentsB.length,
      totalPower: leftPower + rightPower,
      currentOdds: leftLeading ? oddsA.toFixed(1) : oddsB.toFixed(1),
    };
  }, [leftPower, rightPower, splitPct, commentsA, commentsB, optionA, optionB, oddsA, oddsB]);

  /* ── Helper: push message to queue ── */
  const pushReport = useCallback((msg: BattleMessage) => {
    setDisplayQueue((prev) => {
      const next = [...prev, msg];
      return next.length > MAX_QUEUE ? next.slice(-MAX_QUEUE) : next;
    });
  }, []);

  /* ══════════ Trigger 1: 领地拉锯 (Invasion) — based on splitPct shift ══════════ */
  useEffect(() => {
    const shift = Math.abs(splitPct - prevSplitPct.current);
    if (shift >= 5) {
      const ctx = buildCtx();
      const template = pickRandom(reportTemplates.invasion);
      pushReport(fillTemplate(template, ctx));

      // Alert mode for big shifts
      if (shift >= 8) {
        setIsAlertMode(true);
        const t = setTimeout(() => setIsAlertMode(false), 3000);
        prevSplitPct.current = splitPct;
        return () => clearTimeout(t);
      }
    }
    prevSplitPct.current = splitPct;
  }, [splitPct, buildCtx, pushReport]);

  /* ══════════ Trigger 2: 火力爆发 (Firepower) — based on like/comment density ══════════ */
  useEffect(() => {
    const totalLikes = [...commentsA, ...commentsB].reduce((s, c) => s + c.likes, 0);
    const totalComments = commentsA.length + commentsB.length;
    const likeDelta = totalLikes - prevTotalLikes.current;
    const commentDelta = totalComments - prevTotalComments.current;

    // Trigger on like burst (>= 3 new likes in one tick) or new comment burst (>= 2)
    if (likeDelta >= 3 || commentDelta >= 2) {
      const ctx = buildCtx();
      const template = pickRandom(reportTemplates.firepower);
      const msg = fillTemplate(template, ctx);
      // Attach commentId for "神评" reports so user can click to highlight
      const allCmts = [...commentsA, ...commentsB];
      const topComment = allCmts.length > 0 ? [...allCmts].sort((a, b) => b.likes - a.likes)[0] : null;
      if (topComment && template.text.includes('神评')) {
        msg.commentId = topComment.id;
      }
      pushReport(msg);
    }

    prevTotalLikes.current = totalLikes;
    prevTotalComments.current = totalComments;
  }, [commentsA, commentsB, buildCtx, pushReport]);

  /* ══════════ Trigger 3: 利益变动 (Odds) — based on odds fluctuation ══════════ */
  useEffect(() => {
    const oddsShiftA = Math.abs(oddsA - prevOddsA.current);
    const oddsShiftB = Math.abs(oddsB - prevOddsB.current);

    if (oddsShiftA >= 0.5 || oddsShiftB >= 0.5) {
      const ctx = buildCtx();
      const template = pickRandom(reportTemplates.odds);
      pushReport(fillTemplate(template, ctx));
    }

    prevOddsA.current = oddsA;
    prevOddsB.current = oddsB;
  }, [oddsA, oddsB, buildCtx, pushReport]);

  /* ══════════ Trigger 4: 决战模式 (Pivot Point) — splitPct near 50:50 ══════════ */
  useEffect(() => {
    const nearCenter = Math.abs(splitPct - 50) < PIVOT_THRESHOLD;
    if (nearCenter && !isPivotMode) {
      setIsPivotMode(true);
      pushReport({
        id: `pivot-${Date.now()}`,
        type: 'alert',
        category: 'invasion',
        text: '⚔️ 双方势均力敌！下一条神评将决定领地归属！',
        timestamp: Date.now(),
      });
    } else if (!nearCenter && isPivotMode) {
      setIsPivotMode(false);
      // Announce who broke the deadlock
      const { leadingSide } = buildCtx();
      pushReport({
        id: `pivot-break-${Date.now()}`,
        type: 'fire',
        category: 'invasion',
        text: `🔥 僵局打破！${leadingSide} 成功突围，局势正在倾斜！`,
        timestamp: Date.now(),
      });
    }
  }, [splitPct, isPivotMode, buildCtx, pushReport]);

  /* ══════════ Trigger 5: 巨鳄入场 (Whale Activity) — simulated whale bets ══════════ */
  useEffect(() => {
    const whaleNames = ['大白鲨', '深海巨鳄', '黄金猎手', '龟王', '隐形富豪'];
    const iv = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 20s
        const side = Math.random() > 0.5 ? optionA : optionB;
        const amount = [5000, 8000, 10000, 15000, 20000][Math.floor(Math.random() * 5)];
        const userName = whaleNames[Math.floor(Math.random() * whaleNames.length)];
        const alert: WhaleAlert = {
          id: `whale-${Date.now()}`,
          userName,
          side,
          amount,
          timestamp: Date.now(),
        };
        setWhaleAlerts(prev => [...prev, alert]);
        // Also push a gold report
        pushReport({
          id: `whale-report-${Date.now()}`,
          type: 'gold',
          category: 'odds',
          text: `💰 巨鳄入场！${userName} 梭哈 ${amount.toLocaleString()} 龟币支持 ${side}！`,
          timestamp: Date.now(),
        });
      }
    }, 20000);
    return () => clearInterval(iv);
  }, [optionA, optionB, pushReport]);

  const removeWhaleAlert = useCallback((id: string) => {
    setWhaleAlerts(prev => prev.filter(w => w.id !== id));
  }, []);

  /* ── Report Like handler ── */
  const handleReportLike = useCallback((msgId: string) => {
    setDisplayQueue(prev => prev.map(m =>
      m.id === msgId ? { ...m, likes: (m.likes ?? 0) + 1 } : m
    ));
  }, []);

  /* ── Click report to highlight comment ── */
  const handleClickReport = useCallback((msg: BattleMessage) => {
    if (msg.commentId && onHighlightComment) {
      onHighlightComment(msg.commentId);
    }
  }, [onHighlightComment]);

  /* ══════════ Ambient ticker: periodic filler when queue runs low ══════════ */
  useEffect(() => {
    const iv = setInterval(() => {
      const ctx = buildCtx();
      // Pick from any category weighted by activity
      const shift = Math.abs(splitPct - 50);
      let category: TriggerCategory;
      if (shift > 12) category = 'invasion';
      else if (leftPower + rightPower > 100) category = 'firepower';
      else category = pickRandom(['firepower', 'odds', 'invasion'] as TriggerCategory[]);

      const template = pickRandom(reportTemplates[category]);
      pushReport(fillTemplate(template, ctx));
    }, 8000); // ambient report every 8s
    return () => clearInterval(iv);
  }, [buildCtx, pushReport, splitPct, leftPower, rightPower]);

  /* ══════════ Auto-rotate display every TICKER_DISPLAY_MS ══════════ */
  useEffect(() => {
    if (displayQueue.length === 0) return;
    const iv = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % displayQueue.length);
    }, TICKER_DISPLAY_MS);
    return () => clearInterval(iv);
  }, [displayQueue.length]);

  // Keep currentIdx in bounds when queue changes
  useEffect(() => {
    if (displayQueue.length > 0 && currentIdx >= displayQueue.length) {
      setCurrentIdx(displayQueue.length - 1);
    }
    // Auto-jump to newest report when a new one arrives
    if (displayQueue.length > 0) {
      setCurrentIdx(displayQueue.length - 1);
    }
  }, [displayQueue.length, currentIdx]);

  /* ══════════ Gold Barrages ══════════ */
  useEffect(() => {
    const barrageTexts = [
      `${optionB}别得意，我们的主力部队还没下班！`,
      `冲啊！为了${optionA}的荣耀！`,
      `${optionB}必胜！这波赢麻了！`,
      `大家快来支援，前线告急！`,
      `我赌100龟币，${optionA}绝对翻盘！`,
    ];
    const iv = setInterval(() => {
      if (Math.random() > 0.5) {
        const text = barrageTexts[Math.floor(Math.random() * barrageTexts.length)];
        const id = `barrage-${Date.now()}`;
        setGoldBarrages((prev) => [...prev, { id, text }]);
      }
    }, 15000);
    return () => clearInterval(iv);
  }, [optionA, optionB]);

  const removeBarrage = useCallback((id: string) => {
    setGoldBarrages((prev) => prev.filter((b) => b.id !== id));
  }, []);

  /* ══════════ MVP ══════════ */
  const mvpA: MvpUser | null = useMemo(() => {
    if (commentsA.length === 0) return null;
    const top = [...commentsA].sort((a, b) => b.likes - a.likes)[0];
    return { name: top.author.name, avatar: top.author.avatar, score: top.likes * 10 + 50, badge: '👑', badgeLabel: '意见领袖' };
  }, [commentsA]);

  const mvpB: MvpUser | null = useMemo(() => {
    if (commentsB.length === 0) return null;
    const top = [...commentsB].sort((a, b) => b.likes - a.likes)[0];
    return { name: top.author.name, avatar: top.author.avatar, score: top.likes * 10 + 50, badge: '💀', badgeLabel: '破壳杀手' };
  }, [commentsB]);

  const currentMsg = displayQueue[currentIdx] ?? null;

  /* ── Personal stats ── */
  const allComments = useMemo(() => [...commentsA, ...commentsB], [commentsA, commentsB]);
  const myComments = useMemo(() => allComments.filter(c => c.author.name === '你'), [allComments]);
  const myLikes = useMemo(() => myComments.reduce((s, c) => s + c.likes, 0), [myComments]);
  const myReplies = useMemo(() => myComments.reduce((s, c) => s + (c.replies?.filter(r => r.author.name === '你').length ?? 0), 0), [myComments]);
  const myCommentCount = myComments.length + myReplies;
  const myContribution = useMemo(() => myComments.reduce((s, c) => s + 10 + c.likes * 2 - (c.dislikes ?? 0), 0), [myComments]);
  const myOdds = userSide === 'A' ? oddsA : userSide === 'B' ? oddsB : 0;
  const myPotentialWin = Math.round(myContribution * myOdds * 1.5);

  const petSkills = useMemo(() => {
    return getBattlePetSkillsForSkin(equippedSkinId).map((skill) => {
      const metric =
        skill.activation === 'comments'
          ? myCommentCount
          : skill.activation === 'likes'
            ? myLikes
            : myContribution;

      const active = metric >= skill.threshold;

      return {
        name: skill.name,
        icon: skill.icon,
        desc: active ? skill.activeDesc : skill.inactiveDesc,
        active,
      };
    });
  }, [equippedSkinId, myCommentCount, myContribution, myLikes]);

  /* ══════════ Render ══════════ */
  return (
    <div className="flex flex-col relative overflow-hidden">
      {/* ── Alert mode full flash ── */}
      <AnimatePresence>
        {isAlertMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0, 0.25, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-40 pointer-events-none rounded-xl"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,0,50,0.5) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Gold Barrages ── */}
      <AnimatePresence>
        {goldBarrages.map((b) => (
          <GoldBarrage key={b.id} text={b.text} onDone={() => removeBarrage(b.id)} />
        ))}
      </AnimatePresence>

      {/* ── Whale Broadcast ── */}
      <AnimatePresence>
        {whaleAlerts.map((w) => (
          <WhaleBroadcast key={w.id} alert={w} onDone={() => removeWhaleAlert(w.id)} />
        ))}
      </AnimatePresence>

      {/* ── Ticker Bar ── */}
      <div
        className="shrink-0 overflow-hidden relative"
        style={{
          minHeight: 52,
          background: isPivotMode ? 'rgba(40,30,0,0.85)' : 'rgba(10,10,15,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${isPivotMode ? 'rgba(255,200,0,0.15)' : 'rgba(255,255,255,0.06)'}`,
          transition: 'background 0.5s ease',
        }}
      >
        {/* LIVE / PIVOT indicator */}
        <div className="absolute top-2 right-3 flex items-center gap-1 z-10">
          {isPivotMode ? (
            <>
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-yellow-400"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <span className="text-[7px] font-black text-yellow-400 tracking-wider">决战</span>
            </>
          ) : (
            <>
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-[7px] font-bold text-red-400/80 tracking-wider">LIVE</span>
            </>
          )}
        </div>

        {/* Neon breathing edge — yellow in pivot mode */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          animate={{
            boxShadow: [
              `0 0 6px 2px ${isPivotMode ? '#ffd700' : isAlertMode ? RC : '#4ade80'}40`,
              `0 0 16px 4px ${isPivotMode ? '#ffd700' : isAlertMode ? RC : '#4ade80'}70`,
              `0 0 6px 2px ${isPivotMode ? '#ffd700' : isAlertMode ? RC : '#4ade80'}40`,
            ],
            background: [
              `${isPivotMode ? '#ffd700' : isAlertMode ? RC : '#4ade80'}30`,
              `${isPivotMode ? '#ffd700' : isAlertMode ? RC : '#4ade80'}60`,
              `${isPivotMode ? '#ffd700' : isAlertMode ? RC : '#4ade80'}30`,
            ],
          }}
          transition={{ duration: isPivotMode ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Pivot mode side glow */}
        {isPivotMode && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.4) 0%, transparent 70%)' }}
          />
        )}

        <AnimatePresence mode="wait">
          {currentMsg && (
            <TickerLine
              key={currentMsg.id}
              message={currentMsg}
              isPivotMode={isPivotMode && currentMsg.text.includes('势均力敌')}
              onClickReport={() => handleClickReport(currentMsg)}
              onLikeReport={() => handleReportLike(currentMsg.id)}
            />
          )}
        </AnimatePresence>

        {/* Queue indicator dots */}
        {displayQueue.length > 1 && (
          <div className="flex items-center justify-center gap-0.5 pb-1">
            {displayQueue.slice(-6).map((m, i, arr) => (
              <div
                key={m.id}
                className="w-1 h-1 rounded-full transition-colors"
                style={{
                  backgroundColor: (currentIdx % arr.length) === i
                    ? (isPivotMode ? '#ffd700' : '#4ade80')
                    : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Power Display ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: 'rgba(10,10,15,0.5)' }}>
        <div className="flex items-center gap-1.5">
          <Flame size={14} style={{ color: LC }} />
          <motion.span className="text-lg font-black tabular-nums" style={{ color: LC, textShadow: `0 0 12px ${LC}60` }} key={`dp-a-${displayPowerA}`}>
            {displayPowerA}
          </motion.span>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
            <Zap size={13} className="text-yellow-400" />
          </motion.div>
          <span className="text-[9px] text-slate-400 font-bold tracking-wider">LIVE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span className="text-lg font-black tabular-nums" style={{ color: RC, textShadow: `0 0 12px ${RC}60` }} key={`dp-b-${displayPowerB}`}>
            {displayPowerB}
          </motion.span>
          <Flame size={14} style={{ color: RC }} />
        </div>
      </div>

      {/* ── Prediction Radar ── */}
      <div className="flex justify-center shrink-0 py-2" style={{ background: 'rgba(10,10,15,0.4)' }}>
        <PredictionRadar leftPower={leftPower} rightPower={rightPower} commentsA={commentsA} commentsB={commentsB} oddsA={oddsA} oddsB={oddsB} />
      </div>

      {/* ── Odds Display ── */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ background: 'rgba(10,10,15,0.5)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-xs font-bold" style={{ color: LC }}>{oddsA.toFixed(1)}x</span>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} className="text-emerald-400" />
          <span className="text-[10px] text-slate-500 font-medium">赔率</span>
        </div>
        <span className="text-xs font-bold" style={{ color: RC }}>{oddsB.toFixed(1)}x</span>
      </div>

      {/* ── MVP Hero Spotlight ── */}
      <div className="shrink-0" style={{ background: 'rgba(10,10,15,0.45)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-center gap-1.5 pt-2.5">
          <Trophy size={13} className="text-yellow-400" />
          <span className="text-[10px] font-bold text-yellow-400/80 tracking-wider">MVP 英雄榜</span>
        </div>
        <HeroSpotlight mvpA={mvpA} mvpB={mvpB} />
      </div>

      {/* ── Personal Battle Report ── */}
      <div
        className="shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.5) 0%, rgba(16,16,28,0.8) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
          <span className="text-sm">🦊</span>
          <span className="text-[10px] font-bold text-white/70 tracking-wider">我的战报</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-3 pb-2">
          <div className="rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <ThumbsUp size={12} className="text-pink-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[8px] text-slate-500 leading-none mb-0.5">获赞</div>
              <div className="text-sm font-black text-white tabular-nums">{myLikes}</div>
            </div>
          </div>
          <div className="rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <MessageSquare size={12} className="text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[8px] text-slate-500 leading-none mb-0.5">评论</div>
              <div className="text-sm font-black text-white tabular-nums">{myCommentCount}</div>
            </div>
          </div>
          <div className="rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Sparkles size={12} className="text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[8px] text-slate-500 leading-none mb-0.5">贡献</div>
              <motion.div className="text-sm font-black tabular-nums" style={{ color: userSide === 'A' ? LC : userSide === 'B' ? RC : '#fff' }} key={`contrib-${myContribution}`}>
                {myContribution}
              </motion.div>
            </div>
          </div>
          <div className="rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ background: 'rgba(255,215,0,0.06)' }}>
            <Coins size={12} className="text-yellow-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[8px] text-slate-500 leading-none mb-0.5">可赢</div>
              <div className="text-sm font-black text-yellow-300 tabular-nums">{myPotentialWin}</div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bot size={11} className="text-purple-400" />
            <span className="text-[9px] font-bold text-purple-300/80 tracking-wider">宠物技能</span>
          </div>
          <div className="space-y-1">
            {petSkills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={{
                  background: skill.active ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${skill.active ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                <span className="text-xs shrink-0">{skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[9px] font-bold leading-none mb-0.5 ${skill.active ? 'text-purple-200' : 'text-slate-500'}`}>{skill.name}</div>
                  <div className={`text-[8px] leading-none ${skill.active ? 'text-purple-300/60' : 'text-slate-600'}`}>{skill.desc}</div>
                </div>
                {skill.active ? (
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
