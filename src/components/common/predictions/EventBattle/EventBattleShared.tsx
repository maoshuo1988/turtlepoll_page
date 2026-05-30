/**
 * 文件说明：Event Battle，预测市场和撕裂带相关共享组件。
 */
import styles from './index.module.scss';
import { EventBattlePkStrip } from './EventBattlePkStrip';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Send, Flame, Sparkles, Zap, MessageCircleReply } from 'lucide-react';
import CountUp from 'react-countup';
import type { PredictionCardItem } from '../predictionCards';
import { type CommentResponse, useRequestCommentReplies } from '@/hooks/useCommentRequests';
import type { PetSkin } from '@/components/common/pet/petTypes';
export function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}
export function kf(name: string) {
  return styles[name] ?? name;
}
dayjs.extend(relativeTime);
export type CommentSide = 'A' | 'B';
type BattleReply = {
  id: string;
  side: CommentSide;
  author: { name: string; avatar: string };
  content: string;
  time: string;
  likes: number;
};
export type BattleComment = {
  id: string;
  side: CommentSide;
  author: { name: string; avatar: string };
  content: string;
  time: string;
  likes: number;
  dislikes?: number;
  replyCount: number;
  ipLocation?: string;
};
export type LatestReplyEvent = {
  token: number;
  commentId: string;
  reply: CommentResponse;
  side: CommentSide;
};
export interface EventBattleProps {
  news: PredictionCardItem;
  onBack: () => void;
  userSide: 'A' | 'B' | null;
  onBet?: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => void;
  bettingMarketId?: number | null;
  equippedSkin?: PetSkin | null;
}
/* ══════════ Constants ══════════ */
const COMMENT_POWER = 10;
const LIKE_POWER = 2;
const DISLIKE_POWER = 1;
export const LC = '#00D2FF';
export const RC = '#FF0055';
export const randomBattleGain = () => 10 + Math.floor(Math.random() * 91);
export const ENTITY_PREDICT_A = 'predictA';
export const ENTITY_PREDICT_B = 'predictB';
export const card =
  'rounded-none border border-white/18 bg-transparent backdrop-blur-none shadow-none ring-0';
export const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';
function formatBattleTime(timestamp?: number) {
  if (!timestamp) return '刚刚';
  const value = String(timestamp).length <= 10 ? timestamp * 1000 : timestamp;
  return dayjs(value).fromNow();
}
function getBattleUserName(comment?: CommentResponse | null) {
  return comment?.user?.nickname || comment?.user?.username || `用户${comment?.user?.id ?? ''}` || '匿名用户';
}
function getBattleAvatarSeed(comment?: CommentResponse | null) {
  const name = getBattleUserName(comment).trim();
  return name ? name.slice(0, 1).toUpperCase() : '•';
}
export function mapCommentToBattleComment(comment: CommentResponse, side: CommentSide): BattleComment {
  return {
    id: String(comment.id),
    side,
    author: {
      name: getBattleUserName(comment),
      avatar: getBattleAvatarSeed(comment),
    },
    content: comment.content || '',
    time: formatBattleTime(comment.createTime),
    likes: comment.likeCount ?? 0,
    dislikes: 0,
    replyCount: comment.replyCount ?? 0,
    ipLocation: comment.ipLocation,
  };
}
function mapReplyToBattleReply(reply: CommentResponse, side: CommentSide): BattleReply {
  return {
    id: String(reply.id),
    side,
    author: {
      name: getBattleUserName(reply),
      avatar: getBattleAvatarSeed(reply),
    },
    content: reply.content || '',
    time: formatBattleTime(reply.createTime),
    likes: reply.likeCount ?? 0,
  };
}
export function calcPower(items: BattleComment[]) {
  return Math.max(
    1,
    items.reduce(
      (s, c) => s + COMMENT_POWER + c.likes * LIKE_POWER + c.replyCount * 2 - (c.dislikes ?? 0) * DISLIKE_POWER,
      0,
    ),
  );
}
export function getEventBattleStatusMeta(item: PredictionCardItem) {
  if (item.status === 'open') {
    return item.hasBet
      ? {
          badgeLabel: '已参与',
          badgeTone: 'border-[#8fb8a5]/22 bg-[#8fb8a5]/10 text-[#c6ddd2]',
          hint: '你已经参与本场预测，可以直接加入撕裂带。',
          hintTone: 'text-[#c6ddd2]',
          stateLabel: '已下注',
        }
      : {
          badgeLabel: '开放下注',
          badgeTone: 'border-[#8ea8c4]/22 bg-[#8ea8c4]/10 text-[#cad7e6]',
          hint: '先选择立场下注，再进入对应阵营评论。',
          hintTone: 'text-[#cad7e6]',
          stateLabel: '未下注',
        };
  }
  if (item.status === 'closed') {
    return {
      badgeLabel: '封盘中',
      badgeTone: 'border-[#bfa57f]/22 bg-[#bfa57f]/10 text-[#dec9ad]',
      hint: item.hasBet ? '下注已锁定，等待赛果出炉。' : '本场已停止下注，只能围观战况。',
      hintTone: 'text-[#dec9ad]',
      stateLabel: '封闭',
    };
  }
  if (item.hasBet && item.betSettleResult === 'WIN') {
    return {
      badgeLabel: '已结算',
      badgeTone: 'border-[#8fb8a5]/22 bg-[#8fb8a5]/10 text-[#c6ddd2]',
      hint: '本场已结算，你已命中结果。',
      hintTone: 'text-[#c6ddd2]',
      stateLabel: '结算胜',
    };
  }
  if (item.hasBet && item.betSettleResult === 'LOSE') {
    return {
      badgeLabel: '已结算',
      badgeTone: 'border-[#bd8f97]/22 bg-[#bd8f97]/10 text-[#e0c5ca]',
      hint: '本场已结算，结果未命中。',
      hintTone: 'text-[#e0c5ca]',
      stateLabel: '结算负',
    };
  }
  if (item.hasBet) {
    return {
      badgeLabel: '待结算',
      badgeTone: 'border-[#c4ad86]/22 bg-[#c4ad86]/10 text-[#e3d3ba]',
      hint: '赛果已出，等待你完成结算。',
      hintTone: 'text-[#e3d3ba]',
      stateLabel: '待结算',
    };
  }
  return {
    badgeLabel: '未参与',
    badgeTone: 'border-white/12 bg-white/6 text-white/70',
    hint: '本场预测已结束，可以查看最终战况。',
    hintTone: 'text-white/64',
    stateLabel: '未下注',
  };
}
/* ══════════ CSS Keyframes ══════════ */
/* ══════════ Particle System ══════════ */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  life: number;
  color: string;
  size: number;
  drag: number;
  glow: number;
}
interface StarDust {
  x: number;
  y: number;
  r: number;
  a: number;
  phase: number;
  color: string;
}
export interface BattleFx {
  id: string;
  side: CommentSide;
  type: 'like' | 'reply' | 'send';
}
export interface KoFx {
  id: string;
  text: string;
  color: string;
}
export const AnimatedCount: React.FC<{
  value: number;
  className?: string;
  duration?: number;
}> = ({ value, className, duration = 0.6 }) => {
  const prevRef = useRef(value);
  const start = prevRef.current;
  useEffect(() => {
    prevRef.current = value;
  }, [value]);
  return (
    <CountUp
      key={`${start}-${value}`}
      start={start}
      end={value}
      duration={duration}
      useEasing
      separator=","
      className={className}
    />
  );
};
export function renderFlipNumber(value: number, className?: string) {
  return (
    <span
      className={className}
      style={{ display: 'inline-block', perspective: '560px', transformStyle: 'preserve-3d' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={value}
          initial={{ rotateX: -92, y: 14, opacity: 0 }}
          animate={{ rotateX: 0, y: 0, opacity: 1 }}
          exit={{ rotateX: 92, y: -14, opacity: 0 }}
          transition={{ duration: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
          style={{
            display: 'inline-block',
            transformOrigin: '50% 50% -8px',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
void renderFlipNumber;
const BattleReplies: React.FC<{
  commentId: string;
  side: CommentSide;
  authorName: string;
  pushFx: (side: CommentSide, type: BattleFx['type']) => void;
  latestReplyEvent?: LatestReplyEvent | null;
}> = ({ commentId, side, authorName, pushFx, latestReplyEvent }) => {
  const [cursor, setCursor] = useState<number | string>(0);
  const [replies, setReplies] = useState<BattleReply[]>([]);
  const repliesQuery = useRequestCommentReplies({ commentId, cursor, enabled: true });
  useEffect(() => {
    setCursor(0);
    setReplies([]);
  }, [commentId]);
  useEffect(() => {
    const results = repliesQuery.data?.results ?? [];
    const mapped = results.map((item) => mapReplyToBattleReply(item, side));
    if (mapped.length === 0) {
      if (cursor === 0) setReplies([]);
      return;
    }
    setReplies((prev) => {
      const map = new Map<string, BattleReply>();
      (cursor === 0 ? mapped : [...prev, ...mapped]).forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
  }, [cursor, repliesQuery.data, side]);
  useEffect(() => {
    if (!latestReplyEvent || latestReplyEvent.commentId !== commentId) return;
    const mapped = mapReplyToBattleReply(latestReplyEvent.reply, side);
    setReplies((prev) => {
      const exists = prev.some((item) => item.id === mapped.id);
      if (exists) return prev;
      return [...prev, mapped];
    });
  }, [commentId, latestReplyEvent, side]);
  if (replies.length === 0 && !repliesQuery.isLoading) return null;
  return (
    <div className={css("mt-2 ml-0.5 pl-2.5 border-l-2 border-slate-100 dark:border-rdark-border space-y-2")}>
      {replies.map((r) => (
        <div key={r.id} className={css("flex items-start gap-1.5")}>
          <FlameAvatar emoji={r.author.avatar} side={side} compact />
          <div className={css("flex-1 min-w-0")}>
            <div className={css("flex items-center gap-1 mb-0.5")}>
              <span className={css("text-[10px] font-semibold text-slate-700 dark:text-rdark-text")}>
                {r.author.name}
              </span>
              <span className={css("text-[8px] text-slate-400 dark:text-rdark-text2")}>{r.time}</span>
            </div>
            <p className={css("text-[10px] text-slate-600 dark:text-rdark-text leading-relaxed battle-hot-text")}>
              <span className={css("font-medium")} style={{ color: side === 'A' ? LC : RC }}>
                @{authorName}
              </span>{' '}
              {r.content}
            </p>
            <button
              onClick={() => {
                setReplies((prev) => prev.map((item) => (item.id === r.id ? { ...item, likes: item.likes + randomBattleGain() } : item)));
                pushFx(side, 'like');
              }}
              className={css("flex items-center gap-1 text-[9px] mt-0.5 px-1 py-0.5 rounded border-0 bg-transparent cursor-pointer text-slate-400 dark:text-rdark-text2 hover:opacity-80 transition-colors")}
            >
              <ThumbsUp size={8} /> <AnimatedCount value={r.likes} duration={0.45} />
            </button>
          </div>
        </div>
      ))}
      {repliesQuery.data?.hasMore && (
        <button
          type="button"
          onClick={() => setCursor(repliesQuery.data?.cursor ?? 0)}
          disabled={repliesQuery.isFetching}
          className={css("text-[10px] font-semibold border-0 bg-transparent cursor-pointer transition-colors hover:opacity-80")}
          style={{ color: side === 'A' ? LC : RC }}
        >
          {repliesQuery.isFetching ? '加载中...' : '更多回复'}
        </button>
      )}
    </div>
  );
};
const ReelPowerNumber: React.FC<{
  value: number;
  color: string;
  align: 'left' | 'right';
  leading: boolean;
  idPrefix: string;
}> = ({ value, color, align, leading, idPrefix }) => {
  const text = value.toLocaleString();
  return (
    <div className={css(`relative min-w-[90px] ${align === 'left' ? 'text-left' : 'text-right'}`)}>
      <motion.div
        key={`${idPrefix}-ring-${value}`}
        initial={{ scale: 0.25, opacity: 0.95 }}
        animate={{ scale: 2.1, opacity: 0 }}
        transition={{ duration: 0.62, ease: 'easeOut' }}
        className={css("absolute inset-0 pointer-events-none")}
        style={{ border: `1px solid ${color}`, boxShadow: `0 0 18px ${color}` }}
      />
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={`${idPrefix}-ray-${value}-${i}`}
          initial={{ opacity: 1, scaleX: 0.32, scaleY: 0.32 }}
          animate={{ opacity: 0, scaleX: 1.24, scaleY: 1.24 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.02 }}
          className={css("absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 pointer-events-none")}
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            transform: `translate(-50%, -50%) rotate(${i * 22.5}deg)`,
          }}
        />
      ))}
      <motion.div
        key={`${idPrefix}-shake-${value}`}
        initial={{ scale: 0.42, y: 18, opacity: 0, rotate: -10, filter: 'blur(2px)' }}
        animate={{
          scale: [0.42, 1.58, 1.08, 1],
          y: [18, -8, 1, 0],
          rotate: [-10, 7, -2, 0],
          x: [0, -3, 3, -1, 0],
          opacity: [0, 1, 1, 1],
          filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
        }}
        transition={{ duration: 0.72, ease: 'easeOut' }}
        className={css("relative text-[28px] font-black tabular-nums leading-none")}
        style={{
          color,
          textShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
          filter: leading ? `drop-shadow(0 0 14px ${color})` : `drop-shadow(0 0 8px ${color}aa)`,
        }}
      >
        <span className={css("absolute inset-0 opacity-35 blur-[1px] pointer-events-none")} style={{ color }}>
          {text}
        </span>
        <span className={css("relative inline-flex items-center gap-[1px]")} style={{ perspective: '700px' }}>
          {text.split('').map((ch, idx) => (
            /\d/.test(ch) ? (
              <motion.span
                key={`${idPrefix}-digit-${idx}-${ch}-${value}`}
                initial={{ y: '125%', rotateX: -88, opacity: 0 }}
                animate={{ y: '0%', rotateX: 0, opacity: 1 }}
                transition={{ duration: 0.42, ease: [0.2, 0.72, 0.2, 1], delay: idx * 0.035 }}
                style={{
                  display: 'inline-block',
                  minWidth: '0.62em',
                  textAlign: 'center',
                  transformOrigin: '50% 50% -8px',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                {ch}
              </motion.span>
            ) : (
              <span key={`${idPrefix}-sep-${idx}-${value}`} className={css("inline-block opacity-85")}>
                {ch}
              </span>
            )
          ))}
        </span>
      </motion.div>
    </div>
  );
};
export const IDLE_LINES = [
  '战场蓄能中',
  '火力即将爆发',
  '弹幕预热完成',
  '高能连击准备',
  '主播战术切换',
];
const ParticleCanvas: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  leftPower: number;
  rightPower: number;
  leftSuccess: number;
  leftFail: number;
  rightSuccess: number;
  rightFail: number;
  convergeX: number;
  convergeY: number;
}> = ({
  containerRef,
  leftPower,
  rightPower,
  leftSuccess,
  leftFail,
  rightSuccess,
  rightFail,
  convergeX,
  convergeY,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const stars = useRef<StarDust[]>([]);
    const raf = useRef(0);
    const lastTs = useRef(0);
    const dprRef = useRef(1);
    const perfMode = useRef<'high' | 'mid' | 'low'>('mid');
    const gradientsRef = useRef<{
      width: number;
      height: number;
      hazeL: CanvasGradient | null;
      hazeR: CanvasGradient | null;
    }>({ width: 0, height: 0, hazeL: null, hazeR: null });
    const prevL = useRef(leftPower);
    const prevR = useRef(rightPower);
    const prevLs = useRef(leftSuccess);
    const prevLf = useRef(leftFail);
    const prevRs = useRef(rightSuccess);
    const prevRf = useRef(rightFail);
    const heatL = useRef(0);
    const heatR = useRef(0);
    const setupCanvas = useCallback(() => {
      const cvs = canvasRef.current;
      const el = containerRef.current;
      if (!cvs || !el) return null;
      const logicalW = Math.max(1, el.offsetWidth);
      const logicalH = Math.max(1, el.offsetHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      dprRef.current = dpr;
      cvs.width = Math.floor(logicalW * dpr);
      cvs.height = Math.floor(logicalH * dpr);
      cvs.style.width = `${logicalW}px`;
      cvs.style.height = `${logicalH}px`;
      const ctx = cvs.getContext('2d');
      if (!ctx) return null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = logicalW * logicalH;
      const cores = navigator.hardwareConcurrency || 4;
      perfMode.current = area > 850_000 || cores <= 4 ? 'low' : area > 520_000 || cores <= 6 ? 'mid' : 'high';
      const starBase = perfMode.current === 'low' ? 46 : perfMode.current === 'mid' ? 68 : 92;
      stars.current = Array.from({ length: starBase }, () => {
        const isLeft = Math.random() > 0.5;
        return {
          x: Math.random() * logicalW,
          y: Math.random() * logicalH,
          r: 0.5 + Math.random() * (perfMode.current === 'high' ? 2.1 : 1.6),
          a: 0.2 + Math.random() * 0.55,
          phase: Math.random() * Math.PI * 2,
          color: isLeft ? 'rgba(0,210,255,0.95)' : 'rgba(255,0,85,0.95)',
        };
      });
      const hazeL = ctx.createRadialGradient(logicalW * 0.2, logicalH * 0.65, 10, logicalW * 0.2, logicalH * 0.65, logicalW * 0.65);
      hazeL.addColorStop(0, 'rgba(0,210,255,0.32)');
      hazeL.addColorStop(1, 'rgba(0,210,255,0)');
      const hazeR = ctx.createRadialGradient(logicalW * 0.8, logicalH * 0.65, 10, logicalW * 0.8, logicalH * 0.65, logicalW * 0.65);
      hazeR.addColorStop(0, 'rgba(255,0,85,0.32)');
      hazeR.addColorStop(1, 'rgba(255,0,85,0)');
      gradientsRef.current = { width: logicalW, height: logicalH, hazeL, hazeR };
      return { ctx, logicalW, logicalH };
    }, [containerRef]);
    useEffect(() => {
      setupCanvas();
    }, [setupCanvas]);
    const startLoop = useCallback(() => {
      if (raf.current) return;
      const tick = (ts: number) => {
        const cvs = canvasRef.current;
        if (!cvs) { raf.current = 0; return; }
        const ctx = cvs.getContext('2d');
        if (!ctx) { raf.current = 0; return; }
        const minStep = perfMode.current === 'low' ? 34 : perfMode.current === 'mid' ? 24 : 16;
        if (ts - lastTs.current < minStep) {
          raf.current = requestAnimationFrame(tick);
          return;
        }
        lastTs.current = ts;
        const el = containerRef.current;
        const dpr = dprRef.current || 1;
        if (el) {
          const w = Math.max(1, el.offsetWidth);
          const h = Math.max(1, el.offsetHeight);
          if (Math.floor(cvs.width / dpr) !== w || Math.floor(cvs.height / dpr) !== h) {
            setupCanvas();
          }
        }
        const width = Math.max(1, Math.floor(cvs.width / dpr));
        const height = Math.max(1, Math.floor(cvs.height / dpr));
        ctx.clearRect(0, 0, width, height);
        const ps = particles.current;
        const centerX = Math.min(width * 0.88, Math.max(width * 0.12, width * convergeX));
        const centerY = Math.min(height * 0.92, Math.max(height * 0.12, height * convergeY));
        const halfH = height * 0.5;
        const quality = perfMode.current === 'low' ? 0.68 : perfMode.current === 'mid' ? 0.86 : 1;
        // base star dust + left/right energy haze
        ctx.globalCompositeOperation = 'lighter';
        const hL = Math.min(1, heatL.current / 18);
        const hR = Math.min(1, heatR.current / 18);
        for (let i = 0; i < stars.current.length; i++) {
          const s = stars.current[i];
          const pulse = 0.45 + 0.55 * Math.sin(ts * 0.0012 + s.phase);
          ctx.globalAlpha = s.a * pulse * 0.55;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 0.22 + hL * 0.35;
        const cachedGrad = gradientsRef.current;
        if (cachedGrad.width !== width || cachedGrad.height !== height || !cachedGrad.hazeL || !cachedGrad.hazeR) {
          setupCanvas();
        }
        ctx.fillStyle = gradientsRef.current.hazeL ?? 'rgba(0,210,255,0.06)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 0.22 + hR * 0.35;
        ctx.fillStyle = gradientsRef.current.hazeR ?? 'rgba(255,0,85,0.06)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        const streamBase = perfMode.current === 'low' ? 1.3 : 2.1;
        const leftStream = (streamBase + Math.min(8, heatL.current * 0.26)) * quality;
        const rightStream = (streamBase + Math.min(8, heatR.current * 0.26)) * quality;
        const spawnStream = (side: 'left' | 'right', amount: number) => {
          const color = side === 'left' ? LC : RC;
          const fromLeft = side === 'left';
          for (let i = 0; i < Math.floor(amount); i++) {
            const sx = fromLeft ? Math.random() * (width * 0.46) : width * 0.54 + Math.random() * (width * 0.46);
            const sy = halfH + (Math.random() - 0.5) * (height * 0.62);
            const dx = centerX - sx;
            const dy = centerY - sy;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const speed = 1 + Math.random() * 2 + (side === 'left' ? heatL.current : heatR.current) * 0.08;
            ps.push({
              x: sx,
              y: sy,
              vx: (dx / dist) * speed + (Math.random() - 0.5) * 0.9,
              vy: (dy / dist) * speed + (Math.random() - 0.5) * 0.7,
              tx: centerX + (Math.random() - 0.5) * 10,
              ty: centerY + (Math.random() - 0.5) * 8,
              life: 0.45 + Math.random() * 0.34,
              color,
              size: 0.8 + Math.random() * 1.7,
              drag: 0.988,
              glow: 6 + Math.random() * 8,
            });
          }
        };
        const maxParticles = perfMode.current === 'low' ? 260 : perfMode.current === 'mid' ? 380 : 520;
        if (ps.length < maxParticles * 0.92) {
          spawnStream('left', leftStream);
          spawnStream('right', rightStream);
        }
        if (Math.random() < 0.38 * quality && ps.length < maxParticles) {
          for (let i = 0; i < 2; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            ps.push({
              x: centerX + (Math.random() - 0.5) * 12,
              y: centerY + (Math.random() - 0.5) * 26,
              vx: side * (0.4 + Math.random() * 2.1),
              vy: -0.2 + (Math.random() - 0.5) * 1.6,
              tx: centerX + (Math.random() - 0.5) * 8,
              ty: centerY + (Math.random() - 0.5) * 6,
              life: 0.38 + Math.random() * 0.25,
              color: '#ffffff',
              size: 0.9 + Math.random() * 1.4,
              drag: 0.984,
              glow: 10 + Math.random() * 8,
            });
          }
        }
        if (ps.length > maxParticles) ps.splice(0, ps.length - maxParticles);
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const dist = Math.hypot(dx, dy);
          // Keep particles converging toward PK anchor so they vanish at the target zone.
          p.vx += dx * 0.0016;
          p.vy += dy * 0.0016;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= p.drag;
          p.vy *= p.drag;
          // Fade slower globally; fade fast only near target.
          p.life -= dist < 14 ? 0.075 : 0.0075;
          if (dist < 10) {
            p.x = p.tx;
            p.y = p.ty;
          }
          if (p.life <= 0) { ps.splice(i, 1); continue; }
          ctx.globalAlpha = p.life;
          const heavyGlow = perfMode.current === 'high' && ps.length < 320 && i % 2 === 0;
          ctx.shadowBlur = heavyGlow ? p.glow : 0;
          ctx.shadowColor = heavyGlow ? p.color : 'transparent';
          ctx.fillStyle = p.color;
          const radius = p.size * p.life;
          if (radius < 1.1) {
            ctx.fillRect(p.x, p.y, 1.2, 1.2);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        heatL.current = Math.max(0, heatL.current * 0.94 - 0.04);
        heatR.current = Math.max(0, heatR.current * 0.94 - 0.04);
        // side push beams into center (cheap but strong visual)
        const beamW = Math.max(24, 58 + Math.max(heatL.current, heatR.current) * 2.2);
        ctx.globalAlpha = 0.32 + Math.min(0.4, (heatL.current + heatR.current) * 0.01);
        ctx.fillStyle = 'rgba(0,210,255,0.65)';
        ctx.fillRect(Math.max(0, centerX - beamW - 12), centerY - 10, beamW, 20);
        ctx.fillStyle = 'rgba(255,0,85,0.65)';
        ctx.fillRect(centerX + 12, centerY - 10, beamW, 20);
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        raf.current = ps.length > 0 ? requestAnimationFrame(tick) : 0;
      };
      raf.current = requestAnimationFrame(tick);
    }, [containerRef, convergeX, convergeY, setupCanvas]);
    const spawnBurst = useCallback(
      (side: 'left' | 'right', intensity: number) => {
        const el = containerRef.current;
        const w = el?.offsetWidth ?? 600;
        const h = el?.offsetHeight ?? 120;
        const color = side === 'left' ? LC : RC;
        const sx = side === 'left' ? w * 0.04 : w * 0.96;
        const dir = side === 'left' ? 1 : -1;
        const quality = perfMode.current === 'low' ? 0.6 : perfMode.current === 'mid' ? 0.82 : 1;
        const count = Math.max(8, Math.round((12 + intensity * 16) * quality));
        const tx = Math.min(w * 0.88, Math.max(w * 0.12, w * convergeX));
        const ty = Math.min(h * 0.92, Math.max(h * 0.12, h * convergeY));
        for (let i = 0; i < count; i++) {
          const sy = h * (0.25 + Math.random() * 0.5);
          const dx = tx - sx;
          const dy = ty - sy;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const speed = 2.1 + Math.random() * (2 + intensity * 1.5);
          particles.current.push({
            x: sx + (Math.random() - 0.5) * 14,
            y: sy,
            vx: (dx / dist) * speed + dir * (0.2 + Math.random() * 0.8),
            vy: (dy / dist) * speed + (Math.random() - 0.5) * 0.8,
            tx: tx + (Math.random() - 0.5) * 10,
            ty: ty + (Math.random() - 0.5) * 8,
            life: 0.52 + Math.random() * 0.36,
            color,
            size: 1 + Math.random() * (1.4 + intensity * 0.85),
            drag: 0.986,
            glow: 8 + Math.random() * 10,
          });
        }
        startLoop();
      },
      [containerRef, convergeX, convergeY, startLoop],
    );
    useEffect(() => {
      const dLp = Math.max(0, leftPower - prevL.current);
      const dRp = Math.max(0, rightPower - prevR.current);
      const dLs = Math.max(0, leftSuccess - prevLs.current);
      const dLf = Math.max(0, leftFail - prevLf.current);
      const dRs = Math.max(0, rightSuccess - prevRs.current);
      const dRf = Math.max(0, rightFail - prevRf.current);
      if (dLp > 0 || dLs > 0 || dLf > 0) {
        const gain = dLs + dLf;
        const impulse = dLp * 0.08 + gain * 0.22;
        heatL.current = Math.min(36, heatL.current + impulse);
        const burstIntensity = Math.min(5.2, 0.5 + gain / 24 + dLp / 80);
        spawnBurst('left', burstIntensity);
      }
      if (dRp > 0 || dRs > 0 || dRf > 0) {
        const gain = dRs + dRf;
        const impulse = dRp * 0.08 + gain * 0.22;
        heatR.current = Math.min(36, heatR.current + impulse);
        const burstIntensity = Math.min(5.2, 0.5 + gain / 24 + dRp / 80);
        spawnBurst('right', burstIntensity);
      }
      prevL.current = leftPower;
      prevR.current = rightPower;
      prevLs.current = leftSuccess;
      prevLf.current = leftFail;
      prevRs.current = rightSuccess;
      prevRf.current = rightFail;
      if (particles.current.length) startLoop();
    }, [leftPower, rightPower, leftSuccess, leftFail, rightSuccess, rightFail, spawnBurst, startLoop]);
    useEffect(() => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    }, []);
    useEffect(() => {
      const onVisibility = () => {
        if (document.hidden) {
          if (raf.current) cancelAnimationFrame(raf.current);
          raf.current = 0;
        } else if (particles.current.length) {
          startLoop();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [startLoop]);
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setupCanvas());
      ro.observe(el);
      return () => ro.disconnect();
    }, [containerRef, setupCanvas]);
    return <canvas ref={canvasRef} className={css("absolute inset-0 pointer-events-none z-20")} />;
  };
/* ══════════ FlameAvatar ══════════ */
const FlameAvatar = React.memo(({
  emoji, side, compact,
}: {
  emoji: string;
  side: CommentSide;
  compact?: boolean;
}) => {
  const color = side === 'A' ? LC : RC;
  return (
    <div
      className={css(`relative rounded-full flex items-center justify-center shrink-0 ${compact ? 'w-5 h-5 text-xs' : 'w-7 h-7 text-base'
        }`)}
      style={{
        '--flame': color,
        border: `${compact ? '1.5px' : '2px'} solid ${color}`,
        animation: `${kf('flame-glow')} 1.5s ease-in-out infinite`,
      } as React.CSSProperties}
    >
      {emoji}
    </div>
  );
});
/* ══════════ BattleHeader (hero image + PK bar merged) ══════════ */
export const BattleHeader: React.FC<{
  news: PredictionCardItem;
  leftPower: number;
  rightPower: number;
  leftSuccess: number;
  leftFail: number;
  rightSuccess: number;
  rightFail: number;
  splitPct: number;
  commentsA: BattleComment[];
  commentsB: BattleComment[];
  comboA: number;
  comboB: number;
  shakeKey: number;
}> = ({
  news,
  leftPower,
  rightPower,
  leftSuccess,
  leftFail,
  rightSuccess,
  rightFail,
  splitPct,
  commentsA,
  commentsB,
  comboA,
  comboB,
  shakeKey,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pkAnchorRef = useRef<HTMLDivElement>(null);
    const leftLeading = leftPower >= rightPower;
    const [convergePoint, setConvergePoint] = useState({ x: 0.5, y: 0.72 });
    useEffect(() => {
      const syncAnchor = () => {
        const containerEl = containerRef.current;
        const anchorEl = pkAnchorRef.current;
        if (!containerEl || !anchorEl) return;
        const cRect = containerEl.getBoundingClientRect();
        const aRect = anchorEl.getBoundingClientRect();
        if (!cRect.width || !cRect.height) return;
        const x = (aRect.left + aRect.width / 2 - cRect.left) / cRect.width;
        const y = (aRect.top - cRect.top - 8) / cRect.height;
        setConvergePoint({
          x: Math.min(0.88, Math.max(0.12, x)),
          y: Math.min(0.9, Math.max(0.12, y)),
        });
      };
      syncAnchor();
      const ro = new ResizeObserver(syncAnchor);
      if (containerRef.current) ro.observe(containerRef.current);
      if (pkAnchorRef.current) ro.observe(pkAnchorRef.current);
      window.addEventListener('resize', syncAnchor);
      return () => {
        window.removeEventListener('resize', syncAnchor);
        ro.disconnect();
      };
    }, []);
    return (
      <div ref={containerRef} className={css("relative rounded-none overflow-hidden border border-white/14 shadow-[0_26px_90px_rgba(0,0,0,0.6)]")}>
        <span
          className={css("absolute top-0 left-0 right-0 h-[2px] pointer-events-none")}
          style={{ background: `linear-gradient(90deg, ${LC}, rgba(255,255,255,0.75), ${RC})`, animation: `${kf('idle-sweep')} 2.8s linear infinite` }}
        />
        {/* Image with brightness filter + edge vignette */}
        <img src={news.image} alt="" className={css("battle-hero-img absolute inset-0 w-full h-full object-cover brightness-[0.45] contrast-[1.1]")} />
        <div
          className={css("absolute inset-0 pointer-events-none")}
          style={{
            boxShadow: 'inset 0 0 60px 30px rgba(0,0,0,0.55), inset 0 0 120px 60px rgba(0,0,0,0.25)',
          }}
        />
        {/* Particle layer */}
        <ParticleCanvas
          containerRef={containerRef}
          leftPower={leftPower}
          rightPower={rightPower}
          leftSuccess={leftSuccess}
          leftFail={leftFail}
          rightSuccess={rightSuccess}
          rightFail={rightFail}
          convergeX={convergePoint.x}
          convergeY={convergePoint.y}
        />
        {/* Content overlay */}
        <div className={css("relative z-10 flex flex-col justify-end px-5 py-3 md:px-10 md:py-6 lg:px-14 lg:py-8 min-h-[320px] md:min-h-[380px]")}>
          {/* Center — title + summary */}
          <div className={css("pointer-events-none absolute left-1/2 top-[24%] z-20 w-[calc(100%-56px)] md:w-[calc(100%-120px)] lg:w-[calc(100%-180px)] max-w-4xl -translate-x-1/2 -translate-y-1/2 px-4 md:px-8 relative")}>
            <h2
              className={css("battle-title text-[42px] md:text-[54px] font-black text-white leading-tight tracking-tight text-center px-2 overflow-hidden")}
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              <span className={css("battle-title-glitch-a")}>{news.title}</span>
              <span className={css("battle-title-glitch-b")}>{news.title}</span>
              <span className={css("relative z-10")}>{news.title}</span>
            </h2>
            <p
              className={css("absolute left-0 right-0 text-[14px] md:text-[18px] text-white/90 leading-[1.6] text-center drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] battle-hot-text")}
              style={{ fontFamily: "'Orbitron', sans-serif", top: 'calc(100% + 14px)' }}
            >
              {news.summary}
            </p>
          </div>
          {/* Bottom section — power numbers + PK bar */}
          <div className={css("space-y-2 pt-24")}>
            <div className={css("flex items-end justify-center gap-x-20 md:gap-x-40")}>
              <div className={css("flex items-center gap-3 min-w-0")}>
                <div className={css("w-14 h-14 rounded-full border-2 border-cyan-300/55 bg-transparent p-1 shadow-[0_0_22px_rgba(0,210,255,0.65)]")}>
                  <div className={css("w-full h-full rounded-full bg-cyan-500/20 border border-cyan-200/45 flex items-center justify-center")}>
                    <Zap size={20} className={css("text-cyan-100")} />
                  </div>
                </div>
                <div className={css("min-w-0")}>
                  <div className={css("text-[13px] font-semibold tracking-wide text-cyan-100/90 truncate")}>{news.optionA}</div>
                  <div className={css("flex items-end gap-2")}>
                    <ReelPowerNumber value={leftPower} color={LC} align="right" leading={leftLeading} idPrefix="hero-lp" />
                  </div>
                  <div className={css("text-[11px] font-bold text-cyan-100/75")}>COMBO x<AnimatedCount value={Math.max(1, comboA)} duration={0.4} /></div>
                </div>
              </div>
              <div className={css("flex items-center gap-3 min-w-0")}>
                <div className={css("min-w-0 text-right")}>
                  <div className={css("text-[13px] font-semibold tracking-wide text-rose-100/90 truncate")}>{news.optionB}</div>
                  <div className={css("flex items-end justify-end gap-2")}>
                    <ReelPowerNumber value={rightPower} color={RC} align="left" leading={!leftLeading} idPrefix="hero-rp" />
                  </div>
                  <div className={css("text-[11px] font-bold text-rose-100/75")}>COMBO x<AnimatedCount value={Math.max(1, comboB)} duration={0.4} /></div>
                </div>
                <div className={css("w-14 h-14 rounded-full border-2 border-rose-300/55 bg-transparent p-1 shadow-[0_0_22px_rgba(255,0,85,0.65)]")}>
                  <div className={css("w-full h-full rounded-full bg-rose-500/20 border border-rose-200/45 flex items-center justify-center")}>
                    <Zap size={20} className={css("text-rose-100")} />
                  </div>
                </div>
              </div>
            </div>
            <EventBattlePkStrip
              pkAnchorRef={pkAnchorRef}
              splitPct={splitPct}
              shakeKey={shakeKey}
              leftPower={leftPower}
              rightPower={rightPower}
              leftSuccess={leftSuccess}
              leftFail={leftFail}
              rightSuccess={rightSuccess}
              rightFail={rightFail}
              commentsA={commentsA}
              commentsB={commentsB}
            />
          </div>
        </div>
      </div>
    );
  };
/* ══════════ DynamicDivider ══════════ */
export const DynamicDivider: React.FC<{
  splitRatio: number;
  pulse: boolean;
  leftPower: number;
  rightPower: number;
}> = ({ splitRatio, pulse, leftPower, rightPower }) => {
  const diff = Math.abs(leftPower - rightPower);
  const heat = Math.min(1, Math.abs(0.5 - splitRatio) * 2);
  return (
    <div className={css("relative w-0 shrink-0 self-stretch z-20")}>
      <div className={css("absolute inset-y-0 left-0 w-px bg-white/20")} />
      <motion.div
        className={css("absolute inset-y-0 left-0 w-[5px]")}
        style={{
          background: `linear-gradient(180deg, rgba(0,210,255,0.0), rgba(0,210,255,0.7), rgba(255,255,255,0.95), rgba(255,0,85,0.7), rgba(255,0,85,0.0))`,
          filter: 'blur(0.2px)',
          mixBlendMode: 'screen',
        }}
        animate={pulse ? { opacity: [0.35, 0.9, 0.35] } : { opacity: 0.55 + heat * 0.25 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      />
      <motion.div
        key={`arena-vs-${diff}`}
        className={css("absolute left-0 top-[62%] -translate-x-1/2 -translate-y-1/2 pointer-events-none")}
        initial={{ opacity: 0, scale: 0.55, y: 26, rotate: -22, filter: 'blur(3px)' }}
        animate={{ opacity: 1, scale: [0.55, 1.16, 1], y: [26, -8, 0], rotate: [-22, 8, 0], filter: ['blur(3px)', 'blur(0px)', 'blur(0px)'] }}
        transition={{ duration: 0.72, ease: 'easeOut' }}
      >
        {/* <motion.div
          animate={{
            scale: pulse ? [1, 1.1, 1] : [1, 1.05, 1],
            boxShadow: ['0 0 8px rgba(255,255,255,0.35)', '0 0 18px rgba(255,255,255,0.62)', '0 0 8px rgba(255,255,255,0.35)'],
          }}
          transition={{ duration: pulse ? 0.75 : 1.3, repeat: Infinity, ease: 'easeInOut' }}
          className={css("relative min-w-[38px] h-6 px-2 rounded-full bg-[linear-gradient(90deg,rgba(0,210,255,0.26),rgba(255,255,255,0.92),rgba(255,0,85,0.26))] border border-white/75 flex items-center justify-center overflow-hidden")}
        >
          <span className={css("absolute inset-0 opacity-65")} style={{ background: 'linear-gradient(90deg, rgba(0,210,255,0.22), transparent 34%, transparent 66%, rgba(255,0,85,0.22))', animation: `${kf('neon-sweep')} 2s linear infinite` }} />
          <span className={css("text-[10px] font-black text-slate-900 tracking-tight")}>VS</span>
          {[...Array(10)].map((_, i) => (
            <motion.span
              key={`vs-spark-${diff}-${i}`}
              className={css("absolute left-1/2 top-1/2 h-[2px] w-7")}
              style={{
                background: i % 2 === 0
                  ? 'linear-gradient(90deg, transparent, rgba(0,210,255,1), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255,0,85,1), transparent)',
                transform: `translate(-50%, -50%) rotate(${i * 18}deg)`,
              }}
              initial={{ opacity: 0.95, scaleX: 0.2, scaleY: 0.2 }}
              animate={{ opacity: 0, scaleX: 1.35, scaleY: 1.2 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.02 }}
            />
          ))}
        </motion.div> */}
      </motion.div>
    </div>
  );
};
/* ══════════ PoopBurst — 丢大便特效 ══════════ */
const PoopBurst: React.FC = () => (
  <div className={css("absolute inset-0 pointer-events-none z-30 overflow-hidden")}>
    {[...Array(5)].map((_, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 1, y: 0, x: 0, scale: 0.6, rotate: 0 }}
        animate={{
          opacity: [1, 1, 0],
          y: [0, -20 - Math.random() * 30, 40 + Math.random() * 20],
          x: [-10 + Math.random() * 60, -20 + Math.random() * 80],
          scale: [0.6, 1.2, 0.4],
          rotate: [0, -30 + Math.random() * 60],
        }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: i * 0.05 }}
        className={css("absolute text-sm")}
        style={{ left: `${30 + Math.random() * 40}%`, top: '40%' }}
      >
        💩
      </motion.span>
    ))}
  </div>
);
export const ActionFxBurst: React.FC<{ fxList: BattleFx[] }> = ({ fxList }) => (
  <div className={css("absolute inset-0 pointer-events-none z-40 overflow-hidden")}>
    <AnimatePresence>
      {fxList.map((fx) => {
        const color = fx.side === 'A' ? LC : RC;
        const icon = fx.type === 'like' ? <ThumbsUp size={16} /> : fx.type === 'reply' ? <MessageCircleReply size={16} /> : <Send size={16} />;
        return (
          <motion.div
            key={fx.id}
            initial={{ opacity: 0, scale: 0.6, y: 24, x: fx.side === 'A' ? -80 : 80 }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 0.75], y: [24, -30, -70], rotate: fx.side === 'A' ? -10 : 10 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.95, ease: 'easeOut' }}
            className={css("absolute top-1/2")}
            style={{
              left: fx.side === 'A' ? '24%' : '76%',
              color,
              filter: `drop-shadow(0 0 10px ${color})`,
            }}
          >
            {icon}
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);
export const BattleDanmu: React.FC<{ messages: { id: string; side: CommentSide; text: string; row: number; duration: number }[] }> = ({ messages }) => (
  <div className={css("absolute inset-x-0 top-1 pointer-events-none z-30 h-20 overflow-hidden")}>
    <AnimatePresence>
      {messages.map((item) => (
        <motion.div
          key={item.id}
          className={css("battle-danmu")}
          style={{
            top: `${item.row * 22}px`,
            animationDuration: `${item.duration}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <span
            className={css("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg")}
            style={{
              background: item.side === 'A' ? 'linear-gradient(90deg, rgba(0,210,255,0.28), rgba(0,210,255,0.1))' : 'linear-gradient(90deg, rgba(255,0,85,0.28), rgba(255,0,85,0.1))',
              border: `1px solid ${item.side === 'A' ? `${LC}90` : `${RC}90`}`,
              color: '#fff',
              textShadow: '0 0 8px rgba(0,0,0,0.8)',
            }}
          >
            <Sparkles size={10} /> {item.text}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
const ComboBadge: React.FC<{ side: CommentSide; count: number }> = ({ side, count }) => {
  if (count < 2) return null;
  const color = side === 'A' ? LC : RC;
  return (
    <motion.div
      key={`${side}-${count}`}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={css("combo-badge px-2 py-0.5 rounded-full text-[10px] font-black text-white border")}
      style={{
        borderColor: `${color}CC`,
        background: `linear-gradient(90deg, ${color}80, ${color}45)`,
        boxShadow: `0 0 14px ${color}88`,
      }}
    >
      COMBO x{count}
    </motion.div>
  );
};
export const BattleTicker: React.FC<{
  optionA: string;
  optionB: string;
  leftPower: number;
  rightPower: number;
}> = ({ optionA, optionB, leftPower, rightPower }) => {
  const lead = leftPower === rightPower ? '势均力敌' : leftPower > rightPower ? `${optionA} 领先` : `${optionB} 领先`;
  const diff = Math.abs(leftPower - rightPower);
  return (
    <div className={css("relative h-7 rounded-none border border-white/18 bg-transparent overflow-hidden")}>
      <div className={css("absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-cyan-400/20 to-transparent pointer-events-none")} />
      <div className={css("absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-rose-500/20 to-transparent pointer-events-none")} />
      <div className={css("battle-ticker h-full flex items-center")}>
        <span className={css("text-[11px] font-bold text-white/90 px-5")}>
          [战报] {lead} {diff > 0 ? `· 优势 +${diff}` : '· 双方火力拉满'} · 点赞/回复都会叠加连击 · 高连击触发 KO 冲击
        </span>
      </div>
    </div>
  );
};
export const KoFlash: React.FC<{ fx: KoFx | null }> = ({ fx }) => (
  <AnimatePresence>
    {fx && (
      <motion.div
        key={fx.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={css("fixed inset-0 pointer-events-none z-[70] flex items-center justify-center")}
      >
        <div
          className={css("absolute inset-0")}
          style={{
            background: `radial-gradient(circle at center, ${fx.color}40 0%, ${fx.color}14 32%, rgba(255,255,255,0.04) 52%, transparent 76%)`,
            animation: `${kf('ko-flash')} 0.95s ease-out forwards`,
          }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.08, 0.95], opacity: [0, 1, 0.92] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={css("relative text-center px-6 py-4 rounded-none border border-white/30 bg-transparent")}
          style={{ boxShadow: `0 0 40px ${fx.color}99` }}
        >
          <div className={css("text-4xl font-black tracking-[0.2em] text-white")} style={{ fontFamily: "'Orbitron', sans-serif", textShadow: `0 0 16px ${fx.color}` }}>
            KO
          </div>
          <div className={css("text-xs font-bold text-white/90 mt-1")}>{fx.text}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
export const IdleArenaFx: React.FC<{ active: boolean }> = ({ active }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={css("absolute inset-0 pointer-events-none z-[25] overflow-hidden")}
      >
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className={css("idle-spark w-1.5 h-1.5")}
            style={{
              left: `${6 + i * 8}%`,
              top: `${20 + (i % 4) * 18}%`,
              background: i % 2 === 0 ? '#7ee7ff' : '#ff7aa8',
              boxShadow: i % 2 === 0 ? '0 0 8px #7ee7ff' : '0 0 8px #ff7aa8',
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);
/* ══════════ ArgumentCard ══════════ */
const ArgumentCard = React.memo(({
  comment, side, compact, onLike, onStomp, stomped, showPoop, onReply, accent, pushFx, latestReplyEvent, isReplying, replyDraft, onReplyDraftChange, onSubmitReply, onCancelReply, replySubmitting,
}: {
  comment: BattleComment;
  side: CommentSide;
  compact: boolean;
  onLike: (id: string) => void;
  onStomp: (id: string) => void;
  stomped: boolean;
  showPoop: boolean;
  onReply: (commentId: string, authorName: string) => void;
  accent: string;
  pushFx: (side: CommentSide, type: BattleFx['type']) => void;
  latestReplyEvent?: LatestReplyEvent | null;
  isReplying?: boolean;
  replyDraft?: string;
  onReplyDraftChange?: (value: string) => void;
  onSubmitReply?: () => void;
  onCancelReply?: () => void;
  replySubmitting?: boolean;
}) => {
  const [likedPulse, setLikedPulse] = useState(false);
  const [replyPulse, setReplyPulse] = useState(false);
  const hoverBg = side === 'A' ? 'rgba(0,210,255,0.1)' : 'rgba(255,0,85,0.1)';
  const hoverBorder = side === 'A' ? 'rgba(0,210,255,0.6)' : 'rgba(255,0,85,0.6)';
  const hoverGlow = side === 'A' ? 'rgba(0,210,255,0.25)' : 'rgba(255,0,85,0.25)';
  const triggerPulse = (kind: 'like' | 'reply') => {
    if (kind === 'like') {
      setLikedPulse(true);
      setTimeout(() => setLikedPulse(false), 420);
    } else {
      setReplyPulse(true);
      setTimeout(() => setReplyPulse(false), 420);
    }
  };
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{
          borderColor: hoverBorder,
          backgroundColor: hoverBg,
          boxShadow: `inset 0 0 0 1px ${hoverBorder}, 0 0 20px ${hoverGlow}`,
        }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={css("flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent transition-colors")}
      >
        <FlameAvatar emoji={comment.author.avatar} side={side} compact />
        <span className={css("text-[10px] truncate flex-1 min-w-0 battle-hot-text")}>
          {comment.content}
        </span>
        <button
          onClick={() => {
            onLike(comment.id);
            triggerPulse('like');
            pushFx(side, 'like');
          }}
          className={css("shrink-0 text-[9px] font-bold border-0 bg-transparent cursor-pointer px-0.5")}
          style={{ color: accent }}
        >
          +<AnimatedCount value={comment.likes} duration={0.45} />
        </button>
      </motion.div>
    );
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        borderColor: hoverBorder,
        backgroundColor: hoverBg,
        boxShadow: `inset 0 0 0 1px ${hoverBorder}, 0 0 20px ${hoverGlow}`,
      }}
      className={css("px-3 py-2.5 rounded-none border border-transparent transition-colors relative overflow-hidden")}
    >
      {showPoop && <PoopBurst />}
      <div className={css("flex items-start gap-2")}>
        <FlameAvatar emoji={comment.author.avatar} side={side} />
        <div className={css("flex-1 min-w-0")}>
          <div className={css("flex items-center gap-1.5 mb-0.5")}>
            <span className={css("text-[11px] font-semibold text-slate-700 dark:text-rdark-text")}>
              {comment.author.name}
            </span>
            <span className={css("text-[9px] text-slate-400 dark:text-rdark-text2")}>{comment.time}</span>
          </div>
          <p className={css("text-xs text-slate-600 dark:text-rdark-text leading-relaxed mb-1.5 battle-hot-text")}>
            {comment.content}
          </p>
          {/* Actions */}
          <div className={css("flex items-center gap-2")}>
            <div className={css("relative")}>
              <button
                onClick={() => {
                  onLike(comment.id);
                  triggerPulse('like');
                  pushFx(side, 'like');
                }}
                className={css("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-none border-0 bg-transparent cursor-pointer transition-colors hover:opacity-80")}
                style={{ color: accent }}
              >
                <ThumbsUp size={10} style={{ animation: likedPulse ? `${kf('hot-icon-spin')} 0.35s ease` : undefined }} /> <AnimatedCount value={comment.likes} duration={0.45} />
              </button>
              {likedPulse && (
                <span
                  className={css("absolute inset-0 rounded-none pointer-events-none")}
                  style={{ border: `1px solid ${accent}`, animation: `${kf('pulse-ring')} 0.45s ease-out` }}
                />
              )}
            </div>
            <button
              onClick={() => onStomp(comment.id)}
              disabled={stomped}
              className={css(`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-none border-0 bg-transparent cursor-pointer transition-colors ${stomped
                ? 'text-amber-600 dark:text-amber-400 cursor-default opacity-70'
                : 'text-slate-400 dark:text-rdark-text2 hover:text-amber-500'
                }`)}
            >
              💩 <AnimatedCount value={comment.dislikes ?? 0} duration={0.45} />
            </button>
            <div className={css("relative")}>
              <button
                onClick={() => {
                  onReply(comment.id, comment.author.name);
                }}
                className={css("text-[10px] px-1.5 py-0.5 rounded-none border-0 bg-transparent cursor-pointer transition-colors text-slate-400 dark:text-rdark-text2 hover:text-emerald-500 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1")}
              >
                <MessageCircleReply size={10} style={{ animation: replyPulse ? `${kf('hot-icon-spin')} 0.35s ease` : undefined }} />
                回复
              </button>
              {replyPulse && (
                <span
                  className={css("absolute inset-0 rounded-none pointer-events-none border border-emerald-400")}
                  style={{ animation: `${kf('pulse-ring')} 0.45s ease-out` }}
                />
              )}
            </div>
          </div>
          {/* Nested replies */}
          <AnimatePresence initial={false}>
            {isReplying && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={css("mt-2 rounded-none border border-white/12 bg-black/18 p-2.5")}
              >
              <div className={css("mb-2 flex items-center justify-between gap-2 text-[10px] text-white/64")}>
                <span>回复 @{comment.author.name}</span>
                <button
                  type="button"
                  onClick={onCancelReply}
                  className={css("border-0 bg-transparent text-white/50 cursor-pointer hover:text-white")}
                >
                  取消
                </button>
              </div>
              <div className={css("flex items-center gap-2")}>
                <input
                  value={replyDraft ?? ''}
                  onChange={(e) => onReplyDraftChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void onSubmitReply?.();
                    }
                  }}
                  placeholder={`回复 ${comment.author.name}...`}
                  className={css("flex-1 bg-transparent border border-white/14 px-3 py-2 outline-none text-[11px] text-white placeholder:text-white/38")}
                  disabled={replySubmitting}
                />
                <button
                  type="button"
                  onClick={() => void onSubmitReply?.()}
                  disabled={!replyDraft?.trim() || replySubmitting}
                  className={css("px-3 py-2 text-[11px] font-bold border border-emerald-400/22 bg-emerald-500/12 text-emerald-100 disabled:opacity-45 disabled:cursor-not-allowed")}
                >
                  {replySubmitting ? '发送中...' : '回复'}
                </button>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
          <BattleReplies
            commentId={comment.id}
            side={side}
            authorName={comment.author.name}
            pushFx={pushFx}
            latestReplyEvent={latestReplyEvent}
          />
        </div>
      </div>
    </motion.div>
  );
});
/* ══════════ SideColumn ══════════ */
interface SideColumnProps {
  side: CommentSide;
  label: string;
  power: number;
  comments: BattleComment[];
  compact: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onLike: (id: string) => void;
  onStomp: (id: string) => void;
  stompedSet: Set<string>;
  poopAnims: { id: string; commentId: string }[];
  onReply: (commentId: string, authorName: string) => void;
  dotColor: string;
  textColor: string;
  pushFx: (side: CommentSide, type: BattleFx['type']) => void;
  comboCount: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  latestReplyEvent?: LatestReplyEvent | null;
  replyingTo?: { commentId: string; authorName: string; side: CommentSide } | null;
  replyDraft?: string;
  onReplyDraftChange?: (value: string) => void;
  onSubmitReply?: () => void;
  onCancelReply?: () => void;
  replySubmitting?: boolean;
}
export const SideColumn = React.memo(({
  side,
  label,
  power,
  comments,
  compact,
  scrollRef,
  onLike,
  onStomp,
  stompedSet,
  poopAnims,
  onReply,
  dotColor,
  textColor,
  pushFx,
  comboCount,
  hasMore,
  loadingMore,
  onLoadMore,
  latestReplyEvent,
  replyingTo,
  replyDraft,
  onReplyDraftChange,
  onSubmitReply,
  onCancelReply,
  replySubmitting,
}: SideColumnProps) => {
  const poopCommentIds = useMemo(() => new Set(poopAnims.map((a) => a.commentId)), [poopAnims]);
  return (
    <>
      <div
        className={css("px-3 py-2 border-b border-white/10 flex items-center gap-2 shrink-0 relative overflow-hidden")}
        style={{ background: `linear-gradient(90deg, ${dotColor}18, rgba(255,255,255,0.02))` }}
      >
        <span className={css("absolute inset-y-0 left-0 w-1")} style={{ background: dotColor }} />
        <span className={css("w-2 h-2 rounded-full shrink-0")} style={{ backgroundColor: dotColor, boxShadow: `0 0 10px ${dotColor}` }} />
        {!compact ? (
          <>
            <span className={css("text-xs font-bold battle-hot-text")}>{label}</span>
            <span className={css("text-[10px] text-white/70 ml-auto flex items-center gap-1")}>
              <Flame size={10} /> <AnimatedCount value={power} duration={0.5} />
            </span>
            <ComboBadge side={side} count={comboCount} />
          </>
        ) : (
          <span className={css("text-[10px] font-bold truncate battle-hot-text")}>{label}</span>
        )}
      </div>
      <div
        ref={scrollRef}
        className={css("flex-1 overflow-visible py-1 pr-1 space-y-0.5 relative z-10")}
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.004) 42%, rgba(0,0,0,0.03))' }}
      >
        {comments.map((c) => (
          <ArgumentCard
            key={c.id}
            comment={c}
            side={side}
            compact={compact}
            onLike={onLike}
            onStomp={onStomp}
            stomped={stompedSet.has(c.id)}
            showPoop={poopCommentIds.has(c.id)}
            onReply={onReply}
            accent={textColor}
            pushFx={pushFx}
            latestReplyEvent={latestReplyEvent}
            isReplying={replyingTo?.commentId === c.id}
            replyDraft={replyDraft}
            onReplyDraftChange={onReplyDraftChange}
            onSubmitReply={onSubmitReply}
            onCancelReply={onCancelReply}
            replySubmitting={replySubmitting}
          />
        ))}
        {comments.length === 0 && (
          <div className={css("text-center text-xs text-white/55 py-8")}>暂无评论</div>
        )}
        {hasMore && onLoadMore && (
          <div className={css("px-3 pb-3")}>
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className={css("w-full text-center text-[11px] font-semibold border border-white/12 bg-white/5 px-3 py-2 cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed")}
              style={{ color: textColor }}
            >
              {loadingMore ? '加载中...' : `加载更多${label}评论`}
            </button>
          </div>
        )}
      </div>
    </>
  );
});
