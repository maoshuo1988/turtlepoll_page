/** 文件说明：撕裂带 PK 条（龟势PK + MVP + 对抗条），与 EventBattle BattleHeader 内实现一致。 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import CountUp from 'react-countup';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './index.module.scss';

export const LC = '#00D2FF';
export const RC = '#FF0055';

export type EventBattlePkComment = {
  id: string;
  likes: number;
  author: { avatar: string };
};

type ClashPulse = {
  id: string;
  side: 'left' | 'right';
  strength: number;
};

export interface EventBattlePkStripProps {
  splitPct: number;
  shakeKey?: number;
  leftPower?: number;
  rightPower?: number;
  leftSuccess?: number;
  leftFail?: number;
  rightSuccess?: number;
  rightFail?: number;
  commentsA?: EventBattlePkComment[];
  commentsB?: EventBattlePkComment[];
  pkAnchorRef?: React.RefObject<HTMLDivElement | null>;
}

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function kf(name: string) {
  return styles[name] ?? name;
}

const AnimatedCount: React.FC<{
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

const MvpAvatar = React.memo(({
  avatar,
  likes,
  leading,
  color,
}: {
  avatar: string;
  likes: number;
  leading: boolean;
  color: string;
}) => (
  <motion.div
    className={css('relative w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0')}
    style={{
      border: `2.5px solid ${color}`,
      '--glow': color,
      animation: leading
        ? `${kf('breathe-fast')} 0.8s ease-in-out infinite`
        : `${kf('breathe-slow')} 2s ease-in-out infinite`,
    } as React.CSSProperties}
    animate={leading ? { scale: [1, 1.08, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
    transition={leading ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
  >
    <span className={css('mvp-orbit-ring')} style={{ borderColor: `${color}cc` }} />
    <motion.span
      key={`mvp-burst-${likes}`}
      initial={{ scale: 0.35, opacity: 0.85 }}
      animate={{ scale: 1.65, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={css('absolute inset-[-2px] rounded-full pointer-events-none')}
      style={{ border: `1px solid ${color}`, boxShadow: `0 0 12px ${color}` }}
    />
    {avatar}
    <span
      className={css('absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-white rounded-full px-1 min-w-[14px] text-center leading-[14px]')}
      style={{ backgroundColor: color }}
    >
      <AnimatedCount value={likes} duration={0.45} />
    </span>
  </motion.div>
));

export function EventBattlePkStrip({
  splitPct,
  shakeKey = 0,
  leftPower = 50,
  rightPower = 50,
  leftSuccess = 0,
  leftFail = 0,
  rightSuccess = 0,
  rightFail = 0,
  commentsA = [],
  commentsB = [],
  pkAnchorRef,
}: EventBattlePkStripProps) {
  const leftLeading = leftPower >= rightPower;
  const [barHeat, setBarHeat] = useState(0.22);
  const [clashPulses, setClashPulses] = useState<ClashPulse[]>([]);
  const prevMetricRef = useRef({
    lp: leftPower,
    rp: rightPower,
    ls: leftSuccess,
    rs: rightSuccess,
    lf: leftFail,
    rf: rightFail,
  });

  useEffect(() => {
    const prev = prevMetricRef.current;
    const dLp = Math.max(0, leftPower - prev.lp);
    const dRp = Math.max(0, rightPower - prev.rp);
    const dLs = Math.max(0, leftSuccess - prev.ls);
    const dRs = Math.max(0, rightSuccess - prev.rs);
    const dLf = Math.max(0, leftFail - prev.lf);
    const dRf = Math.max(0, rightFail - prev.rf);
    const impulse = dLp * 0.01 + dRp * 0.01 + dLs * 0.08 + dRs * 0.08 + dLf * 0.05 + dRf * 0.05;
    if (impulse > 0) setBarHeat((value) => Math.min(1, value + impulse));
    prevMetricRef.current = {
      lp: leftPower,
      rp: rightPower,
      ls: leftSuccess,
      rs: rightSuccess,
      lf: leftFail,
      rf: rightFail,
    };
  }, [leftPower, rightPower, leftSuccess, rightSuccess, leftFail, rightFail]);

  useEffect(() => {
    const spawnPush = (side: 'left' | 'right', strength: number) => {
      const id = `push-${side}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setClashPulses((prevPulses) => [...prevPulses.slice(-8), { id, side, strength }]);
      window.setTimeout(() => {
        setClashPulses((prevPulses) => prevPulses.filter((pulse) => pulse.id !== id));
      }, 650);
    };
    const intervalId = window.setInterval(() => {
      const side: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
      const strength = 0.6 + Math.random() * 0.4;
      spawnPush(side, strength);
    }, 520);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBarHeat((value) => Math.max(0.2, value * 0.94));
    }, 80);
    return () => window.clearInterval(intervalId);
  }, []);

  const clashStrength = Math.min(1, 0.25 + barHeat * 0.9);
  const clashPx = 26 + Math.round(clashStrength * 30);
  const mvpA = useMemo(
    () => [...commentsA].sort((a, b) => b.likes - a.likes).slice(0, 2),
    [commentsA],
  );
  const mvpB = useMemo(
    () => [...commentsB].sort((a, b) => b.likes - a.likes).slice(0, 2),
    [commentsB],
  );

  return (
    <div className={css('space-y-2')}>
      <div ref={pkAnchorRef} className={css('flex justify-center relative')} style={{ marginBottom: -2 }}>
        <div className={css('flame-wrap px-5 py-1')}>
          <div className={css('flame-base')} />
          {[
            { left: '8%', w: 10, h: 22, bg: '#ff6600', dur: '0.7s', delay: '0s' },
            { left: '18%', w: 8, h: 18, bg: '#ff8c00', dur: '0.9s', delay: '0.2s' },
            { left: '30%', w: 12, h: 26, bg: '#ff4500', dur: '0.6s', delay: '0.1s' },
            { left: '45%', w: 14, h: 30, bg: '#ff6600', dur: '0.8s', delay: '0.05s' },
            { left: '55%', w: 10, h: 24, bg: '#ffaa00', dur: '0.65s', delay: '0.3s' },
            { left: '68%', w: 12, h: 28, bg: '#ff4500', dur: '0.75s', delay: '0.15s' },
            { left: '80%', w: 9, h: 20, bg: '#ff8c00', dur: '0.85s', delay: '0.25s' },
            { left: '90%', w: 7, h: 16, bg: '#ff6600', dur: '0.7s', delay: '0.35s' },
          ].map((flame, index) => (
            <div
              key={index}
              className={css('flame-tongue')}
              style={{
                left: flame.left,
                width: flame.w,
                height: flame.h,
                background: `radial-gradient(ellipse at center bottom, ${flame.bg} 0%, rgba(255,69,0,0.3) 60%, transparent 100%)`,
                animationDuration: flame.dur,
                animationDelay: flame.delay,
              }}
            />
          ))}
          {[
            { left: '12%', bg: '#ffd54f', dur: '1.2s', delay: '0s', ex: '8px' },
            { left: '30%', bg: '#ff9800', dur: '1.0s', delay: '0.4s', ex: '-6px' },
            { left: '50%', bg: '#ffeb3b', dur: '1.4s', delay: '0.2s', ex: '4px' },
            { left: '65%', bg: '#ff5722', dur: '1.1s', delay: '0.6s', ex: '-10px' },
            { left: '82%', bg: '#ffc107', dur: '1.3s', delay: '0.15s', ex: '6px' },
            { left: '22%', bg: '#ffab40', dur: '1.5s', delay: '0.5s', ex: '-4px' },
            { left: '72%', bg: '#ffe082', dur: '1.0s', delay: '0.35s', ex: '10px' },
          ].map((ember, index) => (
            <span
              key={index}
              className={css('ember')}
              style={{
                left: ember.left,
                background: ember.bg,
                animationDuration: ember.dur,
                animationDelay: ember.delay,
                '--ex': ember.ex,
                boxShadow: `0 0 4px ${ember.bg}`,
              } as React.CSSProperties}
            />
          ))}
          <span className={css('pk-text text-4xl md:text-5xl tracking-[0.22em] select-none')} style={{ fontFamily: "'Ma Shan Zheng', cursive" }}>
            龟势PK
          </span>
        </div>
      </div>

      <div className={css('flex items-center gap-3')}>
        <motion.div
          className={css('flex items-center gap-1.5 shrink-0')}
          animate={leftLeading ? { x: [0, -3, 0], scale: [1, 1.04, 1] } : { x: 0, scale: 1 }}
          transition={leftLeading ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          {mvpA.length > 0
            ? mvpA.slice(0, 1).map((comment) => (
              <MvpAvatar
                key={comment.id}
                avatar={comment.author.avatar}
                likes={comment.likes}
                leading={leftLeading}
                color={LC}
              />
            ))
            : <div className={css('w-10 h-10 rounded-full border-2 border-dashed border-white/20')} />}
        </motion.div>

        <div className={css('flex-1 relative h-10 rounded-none overflow-hidden bg-transparent border border-white/24 backdrop-blur-none')}>
          <span className={css('bar-ticks')} style={{ opacity: 0.22 }} />
          <span className={css('absolute inset-0 pointer-events-none')} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 40%, rgba(255,255,255,0.06))' }} />
          <motion.div
            className={css('absolute inset-y-0 left-0')}
            style={{
              background: `linear-gradient(90deg, ${LC}B8, ${LC}EE)`,
              boxShadow: `inset 0 0 14px ${LC}66`,
              filter: `drop-shadow(0 0 ${leftLeading ? 16 : 10}px ${LC}AA)`,
            }}
            initial={false}
            animate={{ width: `${splitPct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <motion.span
              className={css('absolute inset-0')}
              style={{
                backgroundImage:
                  'repeating-linear-gradient(115deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 10px)',
              }}
              animate={{ backgroundPositionX: ['0px', '110px'] }}
              transition={{ duration: 0.58, repeat: Infinity, ease: 'linear' }}
            />
            <motion.span
              className={css('absolute top-0 bottom-0 right-[-6%] w-[42%]')}
              style={{
                background: `linear-gradient(90deg, transparent, ${LC}, rgba(255,255,255,0.95))`,
                filter: 'blur(1px)',
              }}
              animate={{ x: [-6, 6, -6], opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 0.52, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
          <motion.div
            className={css('absolute inset-y-0 right-0')}
            style={{
              background: `linear-gradient(90deg, ${RC}EE, ${RC}B8)`,
              boxShadow: `inset 0 0 14px ${RC}66`,
              filter: `drop-shadow(0 0 ${!leftLeading ? 16 : 10}px ${RC}AA)`,
            }}
            initial={false}
            animate={{ width: `${100 - splitPct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <motion.span
              className={css('absolute inset-0')}
              style={{
                backgroundImage:
                  'repeating-linear-gradient(65deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 10px)',
              }}
              animate={{ backgroundPositionX: ['0px', '-110px'] }}
              transition={{ duration: 0.58, repeat: Infinity, ease: 'linear' }}
            />
            <motion.span
              className={css('absolute top-0 bottom-0 left-[-6%] w-[42%]')}
              style={{
                background: `linear-gradient(90deg, rgba(255,255,255,0.95), ${RC}, transparent)`,
                filter: 'blur(1px)',
              }}
              animate={{ x: [6, -6, 6], opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 0.52, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
          <motion.div
            className={css('absolute top-1/2 z-[8] pointer-events-none')}
            style={{ left: `${splitPct}%`, x: '-50%', y: '-50%' }}
            initial={false}
            animate={{ width: `${18 + clashStrength * 24}px`, opacity: [0.4, 0.95, 0.4] }}
            transition={{ duration: 0.78, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className={css('h-6')}
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.28) 38%, transparent 75%)',
                filter: 'blur(2px)',
              }}
            />
          </motion.div>
          <motion.div
            className={css('absolute top-1/2 z-[7] h-[58%] pointer-events-none')}
            style={{ left: `${splitPct}%`, x: '-112%', y: '-50%' }}
            animate={{ width: `${14 + clashStrength * 18}px`, opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 0.42, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className={css('h-full')}
              style={{
                background: `linear-gradient(90deg, transparent, ${LC}, rgba(255,255,255,0.95))`,
                clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%, 16% 50%)',
                filter: `drop-shadow(0 0 8px ${LC})`,
              }}
            />
          </motion.div>
          <motion.div
            className={css('absolute top-1/2 z-[7] h-[58%] pointer-events-none')}
            style={{ left: `${splitPct}%`, x: '12%', y: '-50%' }}
            animate={{ width: `${14 + clashStrength * 18}px`, opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 0.42, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
          >
            <div
              className={css('h-full')}
              style={{
                background: `linear-gradient(90deg, rgba(255,255,255,0.95), ${RC}, transparent)`,
                clipPath: 'polygon(15% 0, 100% 0, 84% 50%, 100% 100%, 15% 100%, 0 50%)',
                filter: `drop-shadow(0 0 8px ${RC})`,
              }}
            />
          </motion.div>
          <motion.div
            className={css('absolute top-1/2 z-[8] h-[90%] pointer-events-none')}
            style={{ x: '-50%', y: '-50%' }}
            initial={false}
            animate={{ left: `${splitPct}%`, width: `${10 + clashStrength * 14}px` }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <div
              className={css('absolute inset-0')}
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.08), rgba(255,255,255,0.95))',
                boxShadow: `0 0 ${10 + clashStrength * 18}px rgba(255,255,255,0.9)`,
              }}
            />
          </motion.div>
          <motion.div
            className={css('absolute top-1/2 z-[7] pointer-events-none')}
            style={{ x: '-50%', y: '-50%' }}
            initial={false}
            animate={{ left: `${splitPct}%`, width: `${clashPx * 1.4}px`, opacity: 0.35 + clashStrength * 0.45 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <div
              className={css('h-5')}
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.24) 35%, transparent 75%)',
                filter: `blur(${2 + clashStrength * 4}px)`,
              }}
            />
          </motion.div>
          {[...Array(14)].map((_, index) => (
            <motion.span
              key={`bar-clash-${shakeKey}-${index}`}
              className={css('absolute top-1/2 z-[9] h-[2px] w-6 pointer-events-none')}
              style={{
                left: `${splitPct}%`,
                background: index % 2 === 0
                  ? 'linear-gradient(90deg, transparent, rgba(0,210,255,1), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255,0,85,1), transparent)',
              }}
              initial={{ opacity: 1, x: '-50%', y: '-50%', scaleX: 0.2, scaleY: 0.2 }}
              animate={{
                opacity: 0,
                x: `calc(-50% + ${(index % 2 === 0 ? -1 : 1) * (18 + index * 4)}px)`,
                y: `calc(-50% + ${(index - 5.5) * 3}px)`,
                scaleX: 1.35,
                scaleY: 1.2,
                rotate: (index - 5.5) * 10,
              }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.015 }}
            />
          ))}
          <AnimatePresence>
            {clashPulses.map((pulse) => {
              const color = pulse.side === 'left' ? LC : RC;
              const fromLeft = pulse.side === 'left';
              const zoneWidth = fromLeft ? splitPct : 100 - splitPct;
              return (
                <motion.div
                  key={pulse.id}
                  className={css('absolute inset-y-0 z-[9] pointer-events-none overflow-hidden')}
                  style={
                    fromLeft
                      ? { left: 0, width: `${zoneWidth}%` }
                      : { right: 0, width: `${zoneWidth}%` }
                  }
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.2] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.62, ease: 'easeOut' }}
                >
                  <motion.div
                    className={css('absolute inset-y-0 w-[48%]')}
                    style={{
                      background: fromLeft
                        ? `linear-gradient(90deg, transparent, ${color}, rgba(255,255,255,0.98), transparent)`
                        : `linear-gradient(90deg, transparent, rgba(255,255,255,0.98), ${color}, transparent)`,
                      filter: `drop-shadow(0 0 ${18 + pulse.strength * 20}px ${color})`,
                    }}
                    initial={{ x: fromLeft ? '-120%' : '120%' }}
                    animate={{ x: fromLeft ? '150%' : '-150%' }}
                    transition={{ duration: 0.52, ease: 'easeOut' }}
                  />
                  <motion.div
                    className={css('absolute inset-y-0 w-[28%]')}
                    style={{
                      background: fromLeft
                        ? `linear-gradient(90deg, transparent, rgba(255,255,255,0.95), ${color}, transparent)`
                        : `linear-gradient(90deg, transparent, ${color}, rgba(255,255,255,0.95), transparent)`,
                      filter: 'blur(2px)',
                      opacity: 0.9,
                    }}
                    initial={{ x: fromLeft ? '-150%' : '150%' }}
                    animate={{ x: fromLeft ? '190%' : '-190%' }}
                    transition={{ duration: 0.52, ease: 'easeOut', delay: 0.03 }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
          <motion.div
            className={css('absolute top-1/2 z-10')}
            style={{ y: '-50%', x: '-50%' }}
            initial={false}
            animate={{ left: `${splitPct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <motion.div
              key={shakeKey}
              initial={{ scale: 1.8, rotate: -10 }}
              animate={{
                scale: 1 + clashStrength * 0.14,
                rotate: 0,
                boxShadow: `0 0 ${10 + clashStrength * 14}px rgba(255,255,255,${0.35 + clashStrength * 0.28})`,
              }}
              transition={{ type: 'spring', stiffness: 440, damping: 13 }}
              className={css('min-w-[42px] h-7 px-2 rounded-full bg-[linear-gradient(90deg,rgba(0,210,255,0.28),rgba(255,255,255,0.92),rgba(255,0,85,0.28))] border border-white/70 flex items-center justify-center relative overflow-visible')}
            >
              <span className={css('absolute inset-0 rounded-full opacity-60')} style={{ background: 'linear-gradient(90deg, rgba(0,210,255,0.25), transparent 35%, transparent 65%, rgba(255,0,85,0.25))', animation: `${kf('neon-sweep')} 1.8s linear infinite` }} />
              <span className={css('text-sm font-black text-slate-900 tracking-tight')}>VS</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className={css('flex items-center gap-1.5 shrink-0')}
          animate={!leftLeading ? { x: [0, 3, 0], scale: [1, 1.04, 1] } : { x: 0, scale: 1 }}
          transition={!leftLeading ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          {mvpB.length > 0
            ? mvpB.slice(0, 1).map((comment) => (
              <MvpAvatar
                key={comment.id}
                avatar={comment.author.avatar}
                likes={comment.likes}
                leading={!leftLeading}
                color={RC}
              />
            ))
            : <div className={css('w-10 h-10 rounded-full border-2 border-dashed border-white/20')} />}
        </motion.div>
      </div>
    </div>
  );
}
