import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Send, Flame, X, Sparkles, Zap, MessageCircleReply } from 'lucide-react';
import CountUp from 'react-countup';
import type { NewsItem, EventComment, EventReply, CommentSide } from '../../../data/mock_data';
import { mockEventComments } from '../../../data/mock_data';
import { BattleReport } from './BattleReport';

interface EventBattleProps {
  news: NewsItem;
  onBack: () => void;
  userSide: 'A' | 'B' | null;
  onBet?: (newsId: string, option: 'A' | 'B', odds: number) => void;
}

/* ══════════ Constants ══════════ */
const COMMENT_POWER = 10;
const LIKE_POWER = 2;
const DISLIKE_POWER = 1;
const LC = '#00D2FF';
const RC = '#FF0055';
const randomBattleGain = () => 10 + Math.floor(Math.random() * 91);

const card =
  'rounded-none border border-white/18 bg-transparent backdrop-blur-none shadow-none ring-0';

function calcPower(items: EventComment[]) {
  return Math.max(
    1,
    items.reduce(
      (s, c) => s + COMMENT_POWER + c.likes * LIKE_POWER - (c.dislikes ?? 0) * DISLIKE_POWER,
      0,
    ),
  );
}

/* ══════════ CSS Keyframes ══════════ */
const BATTLE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Orbitron:wght@500;700;900&display=swap');
@keyframes breathe-fast {
  0%, 100% { box-shadow: 0 0 4px 2px var(--glow); }
  50%      { box-shadow: 0 0 18px 6px var(--glow); }
}
@keyframes breathe-slow {
  0%, 100% { box-shadow: 0 0 3px 1px var(--glow); }
  50%      { box-shadow: 0 0 8px 3px var(--glow); }
}
@keyframes flame-glow {
  0%, 100% {
    box-shadow: 0 0 3px 1px var(--flame), 0 -2px 6px 0 var(--flame);
  }
  33% {
    box-shadow: 0 0 6px 2px var(--flame), 0 -4px 10px 1px var(--flame);
  }
  66% {
    box-shadow: 0 0 4px 1px var(--flame), 0 -3px 8px 0 var(--flame);
  }
}
.battle-scroll::-webkit-scrollbar { width: 4px; }
.battle-scroll::-webkit-scrollbar-track { background: transparent; }
.battle-scroll::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); border-radius: 4px; }
.battle-scroll::-webkit-scrollbar-thumb:hover { background: rgba(150,150,150,0.5); }
.battle-scroll { scrollbar-width: thin; scrollbar-color: rgba(150,150,150,0.3) transparent; }

/* ── Real flame effect ── */
@keyframes flame-rise {
  0%   { transform: translateY(0) scaleY(1) scaleX(1); opacity: 1; }
  50%  { transform: translateY(-18px) scaleY(1.4) scaleX(0.8); opacity: 0.6; }
  100% { transform: translateY(-36px) scaleY(1.8) scaleX(0.5); opacity: 0; }
}
@keyframes flame-flicker {
  0%, 100% { transform: scaleX(1) scaleY(1); }
  25%      { transform: scaleX(1.05) scaleY(0.95); }
  50%      { transform: scaleX(0.96) scaleY(1.06); }
  75%      { transform: scaleX(1.03) scaleY(0.97); }
}
@keyframes ember-float {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  30%  { opacity: 0.8; }
  100% { transform: translate(var(--ex), -40px) scale(0); opacity: 0; }
}
@keyframes flame-text-glow {
  0%, 100% {
    text-shadow: 0 0 6px #ff4500, 0 0 20px #ff6600, 0 0 40px #ff8c00, 0 -4px 30px rgba(255,69,0,0.5);
  }
  50% {
    text-shadow: 0 0 10px #ff6600, 0 0 30px #ff4500, 0 0 50px #ff8c00, 0 -8px 40px rgba(255,140,0,0.6);
  }
}
@keyframes neon-sweep {
  0% { transform: translateX(-130%); opacity: 0; }
  25%, 65% { opacity: 1; }
  100% { transform: translateX(130%); opacity: 0; }
}
@keyframes text-shine {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes neon-border-pulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 10px var(--line-glow); }
  50% { box-shadow: 0 0 0 1px rgba(255,255,255,0.22), 0 0 18px var(--line-glow), 0 0 28px var(--line-glow); }
}
@keyframes hot-icon-spin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(-8deg) scale(1.12); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes barrage-flow {
  0% { transform: translateX(106%); opacity: 0; }
  10%, 85% { opacity: 0.92; }
  100% { transform: translateX(-118%); opacity: 0; }
}
@keyframes pulse-ring {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes bg-drift {
  0% { transform: translate3d(-2%, 0, 0) scale(1); }
  50% { transform: translate3d(2%, -1%, 0) scale(1.04); }
  100% { transform: translate3d(-2%, 0, 0) scale(1); }
}
@keyframes orb-float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-16px) scale(1.08); }
}
@keyframes divider-shock {
  0%, 100% { opacity: 0.45; transform: scaleY(0.9); }
  50% { opacity: 1; transform: scaleY(1.06); }
}
@keyframes combo-pop {
  0% { transform: scale(0.7); opacity: 0; }
  35% { transform: scale(1.14); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ticker-shift {
  0% { transform: translateX(105%); }
  100% { transform: translateX(-110%); }
}
@keyframes ko-flash {
  0% { opacity: 0; transform: scale(1.3); }
  20% { opacity: 0.95; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.92); }
}
@keyframes idle-sweep {
  0% { transform: translateX(-120%); opacity: 0; }
  35% { opacity: 0.8; }
  100% { transform: translateX(120%); opacity: 0; }
}
@keyframes idle-float {
  0%, 100% { transform: translateY(0px) scale(1); opacity: 0.4; }
  50% { transform: translateY(-18px) scale(1.15); opacity: 1; }
}
@keyframes title-neon-breathe {
  0%, 100% { text-shadow: 0 0 12px rgba(255,255,255,0.55), 0 0 28px rgba(0,210,255,0.3), 0 0 38px rgba(255,0,85,0.28); }
  50% { text-shadow: 0 0 18px rgba(255,255,255,0.8), 0 0 42px rgba(0,210,255,0.45), 0 0 52px rgba(255,0,85,0.4); }
}
@keyframes title-sweep {
  0% { transform: translateX(-120%); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translateX(130%); opacity: 0; }
}
@keyframes power-jolt {
  0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 6px currentColor); }
  50% { transform: translateY(-1px) scale(1.06); filter: drop-shadow(0 0 12px currentColor); }
}
@keyframes bar-energy-flow {
  0% { transform: translateX(-110%); opacity: 0; }
  30%, 70% { opacity: 0.9; }
  100% { transform: translateX(120%); opacity: 0; }
}
@keyframes hud-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.04); }
}
@keyframes title-glitch-a {
  0%, 100% { transform: translate(0, 0); opacity: 0.45; }
  20% { transform: translate(2px, -1px); opacity: 0.7; }
  40% { transform: translate(-1px, 1px); opacity: 0.55; }
  60% { transform: translate(1px, 0); opacity: 0.75; }
  80% { transform: translate(-2px, 1px); opacity: 0.5; }
}
@keyframes title-glitch-b {
  0%, 100% { transform: translate(0, 0); opacity: 0.35; }
  25% { transform: translate(-2px, 1px); opacity: 0.6; }
  45% { transform: translate(1px, -1px); opacity: 0.5; }
  65% { transform: translate(-1px, 0); opacity: 0.65; }
  85% { transform: translate(2px, -1px); opacity: 0.45; }
}
@keyframes bar-tick-move {
  0% { background-position-x: 0; }
  100% { background-position-x: 120px; }
}
@keyframes bar-wave-left {
  0% { transform: translateX(-100%); opacity: 0; }
  30%, 70% { opacity: 0.85; }
  100% { transform: translateX(160%); opacity: 0; }
}
@keyframes bar-wave-right {
  0% { transform: translateX(100%); opacity: 0; }
  30%, 70% { opacity: 0.85; }
  100% { transform: translateX(-160%); opacity: 0; }
}
@keyframes vs-ring-burst {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes stat-num-blast {
  0% { transform: scale(0.6) translateY(10px); opacity: 0; filter: blur(1px); }
  45% { transform: scale(1.2) translateY(-2px); opacity: 1; filter: blur(0); }
  100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
}
@keyframes stat-num-glow {
  0%, 100% { text-shadow: 0 0 8px currentColor, 0 0 20px currentColor; }
  50% { text-shadow: 0 0 14px currentColor, 0 0 30px currentColor, 0 0 42px currentColor; }
}
@keyframes stat-card-sweep {
  0% { transform: translateX(-130%); opacity: 0; }
  20%, 65% { opacity: 0.9; }
  100% { transform: translateX(130%); opacity: 0; }
}
@keyframes mvp-orbit-spin {
  0% { transform: rotate(0deg); opacity: 0.55; }
  100% { transform: rotate(360deg); opacity: 0.55; }
}
@keyframes bar-overdrive-left {
  0% { transform: translateX(-120%); opacity: 0; }
  22%, 62% { opacity: 0.95; }
  100% { transform: translateX(135%); opacity: 0; }
}
@keyframes bar-overdrive-right {
  0% { transform: translateX(120%); opacity: 0; }
  22%, 62% { opacity: 0.95; }
  100% { transform: translateX(-135%); opacity: 0; }
}
@keyframes bar-core-breathe {
  0%, 100% { opacity: 0.35; transform: scaleX(0.9); }
  50% { opacity: 0.9; transform: scaleX(1.08); }
}
@keyframes progress-glow-scan-left {
  0% { transform: translateX(-120%); opacity: 0; }
  25%, 70% { opacity: 0.95; }
  100% { transform: translateX(145%); opacity: 0; }
}
@keyframes progress-glow-scan-right {
  0% { transform: translateX(120%); opacity: 0; }
  25%, 70% { opacity: 0.95; }
  100% { transform: translateX(-145%); opacity: 0; }
}
@keyframes pk-flow-left {
  0% { background-position-x: -120px; opacity: 0.55; }
  50% { opacity: 1; }
  100% { background-position-x: 180px; opacity: 0.55; }
}
@keyframes pk-flow-right {
  0% { background-position-x: 120px; opacity: 0.55; }
  50% { opacity: 1; }
  100% { background-position-x: -180px; opacity: 0.55; }
}
@keyframes pk-runner-left {
  0% { transform: translateX(-140%); opacity: 0; }
  20%, 75% { opacity: 0.95; }
  100% { transform: translateX(80%); opacity: 0; }
}
@keyframes pk-runner-right {
  0% { transform: translateX(140%); opacity: 0; }
  20%, 75% { opacity: 0.95; }
  100% { transform: translateX(-80%); opacity: 0; }
}
.flame-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.flame-tongue {
  position: absolute;
  bottom: 40%;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  filter: blur(3px);
  animation: flame-rise linear infinite;
  pointer-events: none;
}
.flame-base {
  position: absolute;
  inset: -6px -10px;
  border-radius: 8px;
  background: radial-gradient(ellipse at center bottom, rgba(255,100,0,0.35) 0%, rgba(255,60,0,0.15) 40%, transparent 70%);
  animation: flame-flicker 0.8s ease-in-out infinite;
  filter: blur(6px);
  pointer-events: none;
}
.ember {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  bottom: 60%;
  animation: ember-float 1.4s ease-out infinite;
  pointer-events: none;
}
.pk-text {
  position: relative;
  z-index: 2;
  color: #fff;
  animation: flame-text-glow 1.6s ease-in-out infinite;
  background: linear-gradient(180deg, #fff8e1 0%, #ffd54f 25%, #ff9800 55%, #ff5722 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.battle-danmu {
  position: absolute;
  left: 0;
  right: 0;
  white-space: nowrap;
  animation: barrage-flow linear forwards;
}
.battle-hot-text {
  background-image: linear-gradient(100deg, #ffffff 10%, #8be9ff 35%, #ffffff 50%, #ff8ab2 75%, #ffffff 100%);
  background-size: 200% 100%;
  animation: text-shine 2.4s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.battle-shell {
  position: relative;
  border-radius: 0;
  overflow: hidden;
  background: radial-gradient(120% 160% at 50% -30%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 45%, rgba(5,8,15,0.95) 100%);
}
.battle-shell::before {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 15% 20%, rgba(0,210,255,0.2) 0%, transparent 40%),
    radial-gradient(circle at 85% 30%, rgba(255,0,85,0.24) 0%, transparent 42%),
    radial-gradient(circle at 50% 120%, rgba(16,185,129,0.16) 0%, transparent 50%);
  animation: bg-drift 12s ease-in-out infinite;
  pointer-events: none;
}
.battle-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(1px);
  pointer-events: none;
  animation: orb-float 4.2s ease-in-out infinite;
}
.battle-arena-grid {
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.18;
}
.battle-ticker {
  white-space: nowrap;
  animation: ticker-shift 24s linear infinite;
}
.combo-badge {
  animation: combo-pop 0.35s ease-out;
}
.idle-spark {
  position: absolute;
  border-radius: 999px;
  animation: idle-float 2.6s ease-in-out infinite;
}
.battle-title {
  position: relative;
  animation: title-neon-breathe 1.8s ease-in-out infinite;
}
.battle-title-glitch-a,
.battle-title-glitch-b {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.battle-title-glitch-a {
  color: rgba(0,210,255,0.7);
  animation: title-glitch-a 0.9s steps(2, end) infinite;
}
.battle-title-glitch-b {
  color: rgba(255,0,85,0.6);
  animation: title-glitch-b 1.1s steps(2, end) infinite;
}
.battle-title::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 -40%;
  width: 35%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
  mix-blend-mode: screen;
  animation: title-sweep 2.6s linear infinite;
  pointer-events: none;
}
.power-hud {
  position: relative;
  overflow: hidden;
}
.power-hud::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255,255,255,0.15);
  animation: hud-pulse 1.6s ease-in-out infinite;
  pointer-events: none;
}
.bar-sheen {
  position: absolute;
  inset-y: 0;
  width: 20%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
  animation: bar-energy-flow 1.8s linear infinite;
  pointer-events: none;
}
.bar-ticks {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    rgba(255,255,255,0.22) 0,
    rgba(255,255,255,0.22) 1px,
    transparent 1px,
    transparent 10px
  );
  animation: bar-tick-move 2.2s linear infinite;
  mix-blend-mode: screen;
  pointer-events: none;
}
.bar-wave-left,
.bar-wave-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 24%;
  pointer-events: none;
  mix-blend-mode: screen;
}
.bar-wave-left {
  left: 0;
  background: linear-gradient(90deg, transparent, rgba(0,210,255,0.65), transparent);
  animation: bar-wave-left 1.6s ease-out infinite;
}
.bar-wave-right {
  right: 0;
  background: linear-gradient(90deg, transparent, rgba(255,0,85,0.65), transparent);
  animation: bar-wave-right 1.8s ease-out infinite;
}
.vs-ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255,255,255,0.7);
  animation: vs-ring-burst 1s ease-out infinite;
  pointer-events: none;
}
.battle-stat-card {
  position: relative;
  overflow: hidden;
}
.battle-stat-card::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 -30%;
  width: 34%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
  mix-blend-mode: screen;
  animation: stat-card-sweep 2.3s linear infinite;
  pointer-events: none;
}
.battle-stat-num {
  display: inline-block;
  line-height: 1;
  font-weight: 900;
  animation: stat-num-blast 0.46s cubic-bezier(.2,.8,.2,1), stat-num-glow 1.15s ease-in-out infinite;
}
.mvp-orbit-ring {
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  border: 1px dashed rgba(255,255,255,0.65);
  animation: mvp-orbit-spin 1.8s linear infinite;
  pointer-events: none;
}
.bar-overdrive-left,
.bar-overdrive-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 34%;
  pointer-events: none;
  mix-blend-mode: screen;
}
.bar-overdrive-left {
  left: -10%;
  background: linear-gradient(90deg, transparent, rgba(0,210,255,0.9), rgba(0,210,255,0.28), transparent);
  animation: bar-overdrive-left 1.05s linear infinite;
}
.bar-overdrive-right {
  right: -10%;
  background: linear-gradient(90deg, transparent, rgba(255,0,85,0.28), rgba(255,0,85,0.9), transparent);
  animation: bar-overdrive-right 1.1s linear infinite;
}
.bar-core-breathe {
  position: absolute;
  top: 50%;
  height: 60%;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent);
  animation: bar-core-breathe 0.9s ease-in-out infinite;
  pointer-events: none;
}
.progress-glow-left,
.progress-glow-right {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
}
.progress-glow-left::before,
.progress-glow-right::before {
  content: '';
  position: absolute;
  inset: 0;
  width: 40%;
  filter: blur(1px);
}
.progress-glow-left::before {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.92), rgba(0,210,255,0.95), transparent);
  animation: progress-glow-scan-left 1.05s linear infinite;
}
.progress-glow-right::before {
  right: 0;
  background: linear-gradient(90deg, transparent, rgba(255,0,85,0.95), rgba(255,255,255,0.92), transparent);
  animation: progress-glow-scan-right 1.05s linear infinite;
}
.pk-flow-left,
.pk-flow-right {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
}
.pk-flow-left {
  background-image:
    repeating-linear-gradient(115deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 10px),
    linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.85), rgba(255,255,255,0.08));
  animation: pk-flow-left 0.58s linear infinite;
}
.pk-flow-right {
  background-image:
    repeating-linear-gradient(65deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 10px),
    linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.85), rgba(255,255,255,0.08));
  animation: pk-flow-right 0.58s linear infinite;
}
.pk-flow-soft {
  position: absolute;
  inset: 0;
  pointer-events: none;
  filter: blur(5px);
  opacity: 0.7;
}
.pk-runner-left,
.pk-runner-right {
  position: absolute;
  top: 50%;
  width: 36%;
  height: 56%;
  transform: translateY(-50%);
  pointer-events: none;
  mix-blend-mode: screen;
}
.pk-runner-left {
  left: -18%;
  background: linear-gradient(90deg, transparent, rgba(0,210,255,0.95), rgba(255,255,255,0.95), transparent);
  clip-path: polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%, 12% 50%);
  animation: pk-runner-left 0.72s linear infinite;
}
.pk-runner-right {
  right: -18%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), rgba(255,0,85,0.95), transparent);
  clip-path: polygon(20% 0, 100% 0, 88% 50%, 100% 100%, 20% 100%, 0 50%);
  animation: pk-runner-right 0.72s linear infinite;
}
.battle-shell {
  background:
    linear-gradient(180deg, rgba(5,8,18,0.72), rgba(5,8,18,0.8)),
    radial-gradient(1400px 700px at 50% -25%, rgba(108,72,255,0.2), transparent 58%),
    radial-gradient(1200px 700px at 15% 100%, rgba(0,210,255,0.18), transparent 62%),
    radial-gradient(1200px 700px at 85% 100%, rgba(255,0,85,0.16), transparent 62%),
    url('/bg.png') center/cover no-repeat,
    #050812;
}
.battle-outer-frame {
  border: 1px solid rgba(255,255,255,0.16);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06), 0 16px 80px rgba(0,0,0,0.55);
}
.battle-header-strip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(255,255,255,0.16);
  background: linear-gradient(90deg, rgba(8,15,32,0.95), rgba(16,27,50,0.84), rgba(36,12,42,0.8));
  color: rgba(235,241,255,0.9);
  font-size: 12px;
  letter-spacing: 0.08em;
}
.battle-header-strip::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0,210,255,0.12), transparent 30%, transparent 70%, rgba(255,0,85,0.12));
  pointer-events: none;
}
.battle-main-panel {
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: none;
}
.battle-vs-cross-x,
.battle-vs-cross-y {
  position: absolute;
  pointer-events: none;
  z-index: 6;
}
.battle-vs-cross-x {
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: linear-gradient(90deg, rgba(0,210,255,0.5), rgba(255,255,255,0.78), rgba(255,0,85,0.5));
  box-shadow: 0 0 16px rgba(255,255,255,0.45);
}
.battle-vs-cross-y {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.86), rgba(255,255,255,0.08));
  box-shadow: 0 0 16px rgba(255,255,255,0.45);
}
.battle-vs-core {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 7;
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #fff4d0;
  text-shadow: 0 0 20px rgba(255,185,72,0.9), 0 0 54px rgba(255,100,16,0.9);
  pointer-events: none;
}
.battle-right-panel {
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: none;
  background: transparent;
}
.battle-odds-btn {
  min-height: 86px;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 0.02em;
}

html:not(.dark) .battle-shell {
  background:
    linear-gradient(180deg, rgba(245,249,255,0.92), rgba(239,246,255,0.95)),
    radial-gradient(1200px 700px at 15% 100%, rgba(0,210,255,0.12), transparent 62%),
    radial-gradient(1200px 700px at 85% 100%, rgba(255,0,85,0.1), transparent 62%),
    #f5f9ff;
}
html:not(.dark) .battle-shell::before {
  background:
    radial-gradient(circle at 15% 20%, rgba(0,210,255,0.08) 0%, transparent 40%),
    radial-gradient(circle at 85% 30%, rgba(255,0,85,0.1) 0%, transparent 42%),
    radial-gradient(circle at 50% 120%, rgba(16,185,129,0.08) 0%, transparent 50%);
}
html:not(.dark) .battle-outer-frame {
  border-color: rgba(15,23,42,0.14);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 10px 40px rgba(15,23,42,0.08);
}
html:not(.dark) .battle-header-strip {
  border-color: rgba(15,23,42,0.14);
  background: linear-gradient(90deg, rgba(255,255,255,0.94), rgba(241,249,255,0.9), rgba(255,241,247,0.9));
  color: rgba(15,23,42,0.88);
}
html:not(.dark) .battle-header-strip::before {
  background: linear-gradient(90deg, rgba(0,210,255,0.08), transparent 30%, transparent 70%, rgba(255,0,85,0.08));
}
html:not(.dark) .battle-main-panel,
html:not(.dark) .battle-right-panel {
  border-color: rgba(15,23,42,0.14);
  background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.48));
  backdrop-filter: blur(4px);
}
html:not(.dark) .battle-arena-grid {
  background-image:
    linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px);
}
html:not(.dark) .battle-hero-img {
  filter: brightness(0.65) contrast(1.03);
}
html:not(.dark) .battle-shell [class*="text-white"] {
  color: rgba(15,23,42,0.9) !important;
}
html:not(.dark) .battle-shell [class*="text-cyan-100"],
html:not(.dark) .battle-shell [class*="text-cyan-200"] {
  color: rgba(8,145,178,0.95) !important;
}
html:not(.dark) .battle-shell [class*="text-rose-100"],
html:not(.dark) .battle-shell [class*="text-rose-200"] {
  color: rgba(225,29,72,0.9) !important;
}
html:not(.dark) .battle-shell [class*="border-white"] {
  border-color: rgba(15,23,42,0.16) !important;
}
html:not(.dark) .battle-shell [class*="bg-white"] {
  background-color: rgba(255,255,255,0.7) !important;
}
html:not(.dark) .battle-title {
  color: #0f172a;
  text-shadow: 0 0 10px rgba(255,255,255,0.75), 0 0 18px rgba(14,165,233,0.25), 0 0 18px rgba(244,63,94,0.18);
}
html:not(.dark) .battle-title-glitch-a { color: rgba(8,145,178,0.55); }
html:not(.dark) .battle-title-glitch-b { color: rgba(225,29,72,0.5); }
html:not(.dark) .battle-hot-text {
  background-image: linear-gradient(100deg, #0f172a 10%, #0891b2 35%, #0f172a 50%, #e11d48 75%, #0f172a 100%);
}
html:not(.dark) .battle-vs-cross-x {
  background: linear-gradient(90deg, rgba(0,210,255,0.35), rgba(255,255,255,0.95), rgba(255,0,85,0.35));
}
html:not(.dark) .battle-vs-cross-y {
  background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.95), rgba(255,255,255,0.15));
}
html:not(.dark) .battle-vs-core {
  color: #f59e0b;
  text-shadow: 0 0 14px rgba(245,158,11,0.45), 0 0 28px rgba(245,158,11,0.24);
}
html:not(.dark) .battle-shell .battle-odds-btn .text-lg {
  color: #0f172a !important;
}
html:not(.dark) .battle-shell input::placeholder {
  color: rgba(71,85,105,0.7) !important;
}
}`;

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

interface BattleFx {
  id: string;
  side: CommentSide;
  type: 'like' | 'reply' | 'send';
}

interface KoFx {
  id: string;
  text: string;
  color: string;
}

interface ClashPulse {
  id: string;
  side: 'left' | 'right';
  strength: number;
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

const FlipNumber: React.FC<{
  value: number;
  className?: string;
}> = ({ value, className }) => (
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

const ReelPowerNumber: React.FC<{
  value: number;
  color: string;
  align: 'left' | 'right';
  leading: boolean;
  idPrefix: string;
}> = ({ value, color, align, leading, idPrefix }) => {
  const text = value.toLocaleString();
  return (
    <div className={`relative min-w-[90px] ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <motion.div
        key={`${idPrefix}-ring-${value}`}
        initial={{ scale: 0.25, opacity: 0.95 }}
        animate={{ scale: 2.1, opacity: 0 }}
        transition={{ duration: 0.62, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none"
        style={{ border: `1px solid ${color}`, boxShadow: `0 0 18px ${color}` }}
      />
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={`${idPrefix}-ray-${value}-${i}`}
          initial={{ opacity: 1, scaleX: 0.32, scaleY: 0.32 }}
          animate={{ opacity: 0, scaleX: 1.24, scaleY: 1.24 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.02 }}
          className="absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
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
        className="relative text-[28px] font-black tabular-nums leading-none"
        style={{
          color,
          textShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
          filter: leading ? `drop-shadow(0 0 14px ${color})` : `drop-shadow(0 0 8px ${color}aa)`,
        }}
      >
        <span className="absolute inset-0 opacity-35 blur-[1px] pointer-events-none" style={{ color }}>
          {text}
        </span>
        <span className="relative inline-flex items-center gap-[1px]" style={{ perspective: '700px' }}>
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
              <span key={`${idPrefix}-sep-${idx}-${value}`} className="inline-block opacity-85">
                {ch}
              </span>
            )
          ))}
        </span>
      </motion.div>
    </div>
  );
};

const IDLE_LINES = [
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

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />;
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
      className={`relative rounded-full flex items-center justify-center shrink-0 ${compact ? 'w-5 h-5 text-xs' : 'w-7 h-7 text-base'
        }`}
      style={{
        '--flame': color,
        border: `${compact ? '1.5px' : '2px'} solid ${color}`,
        animation: 'flame-glow 1.5s ease-in-out infinite',
      } as React.CSSProperties}
    >
      {emoji}
    </div>
  );
});

/* ══════════ MVP Avatar ══════════ */
const MvpAvatar = React.memo(({
  avatar, likes, leading, color,
}: {
  avatar: string;
  likes: number;
  leading: boolean;
  color: string;
}) => (
  <motion.div
    className="relative w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
    style={{
      border: `2.5px solid ${color}`,
      '--glow': color,
      animation: leading
        ? 'breathe-fast 0.8s ease-in-out infinite'
        : 'breathe-slow 2s ease-in-out infinite',
    } as React.CSSProperties}
    animate={leading ? { scale: [1, 1.08, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
    transition={leading ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
  >
    <span className="mvp-orbit-ring" style={{ borderColor: `${color}cc` }} />
    <motion.span
      key={`mvp-burst-${likes}`}
      initial={{ scale: 0.35, opacity: 0.85 }}
      animate={{ scale: 1.65, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute inset-[-2px] rounded-full pointer-events-none"
      style={{ border: `1px solid ${color}`, boxShadow: `0 0 12px ${color}` }}
    />
    {avatar}
    <span
      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-white rounded-full px-1 min-w-[14px] text-center leading-[14px]"
      style={{ backgroundColor: color }}
    >
      <AnimatedCount value={likes} duration={0.45} />
    </span>
  </motion.div>
));

/* ══════════ BattleHeader (hero image + PK bar merged) ══════════ */
const BattleHeader: React.FC<{
  news: NewsItem;
  leftPower: number;
  rightPower: number;
  leftSuccess: number;
  leftFail: number;
  rightSuccess: number;
  rightFail: number;
  splitPct: number;
  commentsA: EventComment[];
  commentsB: EventComment[];
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
      if (impulse > 0) setBarHeat((v) => Math.min(1, v + impulse));

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
          setClashPulses((prevPulses) => prevPulses.filter((p) => p.id !== id));
        }, 650);
      };
      const iv = window.setInterval(() => {
        const side: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
        const strength = 0.6 + Math.random() * 0.4;
        spawnPush(side, strength);
      }, 520);
      return () => window.clearInterval(iv);
    }, []);

    useEffect(() => {
      const t = window.setInterval(() => {
        setBarHeat((v) => Math.max(0.2, v * 0.94));
      }, 80);
      return () => window.clearInterval(t);
    }, []);

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
      <div ref={containerRef} className="relative rounded-none overflow-hidden border border-white/14 shadow-[0_26px_90px_rgba(0,0,0,0.6)]">
        <span
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: `linear-gradient(90deg, ${LC}, rgba(255,255,255,0.75), ${RC})`, animation: 'idle-sweep 2.8s linear infinite' }}
        />
        {/* Image with brightness filter + edge vignette */}
        <img src={news.image} alt="" className="battle-hero-img absolute inset-0 w-full h-full object-cover brightness-[0.45] contrast-[1.1]" />
        <div
          className="absolute inset-0 pointer-events-none"
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
        <div className="relative z-10 flex flex-col justify-end px-5 py-3 md:px-10 md:py-6 lg:px-14 lg:py-8 min-h-[320px] md:min-h-[380px]">
          {/* Center — title + summary */}
          <div className="pointer-events-none absolute left-1/2 top-[24%] z-20 w-[calc(100%-56px)] md:w-[calc(100%-120px)] lg:w-[calc(100%-180px)] max-w-4xl -translate-x-1/2 -translate-y-1/2 px-4 md:px-8 relative">
            <h2
              className="battle-title text-[42px] md:text-[54px] font-black text-white leading-tight tracking-tight text-center px-2 overflow-hidden"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              <span className="battle-title-glitch-a">{news.title}</span>
              <span className="battle-title-glitch-b">{news.title}</span>
              <span className="relative z-10">{news.title}</span>
            </h2>
            <p
              className="absolute left-0 right-0 text-[14px] md:text-[18px] text-white/90 leading-[1.6] text-center drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] battle-hot-text"
              style={{ fontFamily: "'Orbitron', sans-serif", top: 'calc(100% + 14px)' }}
            >
              {news.summary}
            </p>
          </div>
          {/* Bottom section — power numbers + PK bar */}
          <div className="space-y-2 pt-24">
            <div className="flex items-end justify-center gap-x-20 md:gap-x-40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full border-2 border-cyan-300/55 bg-transparent p-1 shadow-[0_0_22px_rgba(0,210,255,0.65)]">
                  <div className="w-full h-full rounded-full bg-cyan-500/20 border border-cyan-200/45 flex items-center justify-center">
                    <Zap size={20} className="text-cyan-100" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold tracking-wide text-cyan-100/90 truncate">{news.optionA}</div>
                  <div className="flex items-end gap-2">
                    <ReelPowerNumber value={leftPower} color={LC} align="right" leading={leftLeading} idPrefix="hero-lp" />
                  </div>
                  <div className="text-[11px] font-bold text-cyan-100/75">COMBO x<AnimatedCount value={Math.max(1, comboA)} duration={0.4} /></div>
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0 text-right">
                  <div className="text-[13px] font-semibold tracking-wide text-rose-100/90 truncate">{news.optionB}</div>
                  <div className="flex items-end justify-end gap-2">
                    <ReelPowerNumber value={rightPower} color={RC} align="left" leading={!leftLeading} idPrefix="hero-rp" />
                  </div>
                  <div className="text-[11px] font-bold text-rose-100/75">COMBO x<AnimatedCount value={Math.max(1, comboB)} duration={0.4} /></div>
                </div>
                <div className="w-14 h-14 rounded-full border-2 border-rose-300/55 bg-transparent p-1 shadow-[0_0_22px_rgba(255,0,85,0.65)]">
                  <div className="w-full h-full rounded-full bg-rose-500/20 border border-rose-200/45 flex items-center justify-center">
                    <Zap size={20} className="text-rose-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* 🔥 龟势PK — real flame */}
            <div ref={pkAnchorRef} className="flex justify-center relative" style={{ marginBottom: -2 }}>
              <div className="flame-wrap px-5 py-1">
                {/* Radial glow base */}
                <div className="flame-base" />

                {/* Flame tongues — different sizes, speeds, positions */}
                {[
                  { left: '8%', w: 10, h: 22, bg: '#ff6600', dur: '0.7s', delay: '0s' },
                  { left: '18%', w: 8, h: 18, bg: '#ff8c00', dur: '0.9s', delay: '0.2s' },
                  { left: '30%', w: 12, h: 26, bg: '#ff4500', dur: '0.6s', delay: '0.1s' },
                  { left: '45%', w: 14, h: 30, bg: '#ff6600', dur: '0.8s', delay: '0.05s' },
                  { left: '55%', w: 10, h: 24, bg: '#ffaa00', dur: '0.65s', delay: '0.3s' },
                  { left: '68%', w: 12, h: 28, bg: '#ff4500', dur: '0.75s', delay: '0.15s' },
                  { left: '80%', w: 9, h: 20, bg: '#ff8c00', dur: '0.85s', delay: '0.25s' },
                  { left: '90%', w: 7, h: 16, bg: '#ff6600', dur: '0.7s', delay: '0.35s' },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="flame-tongue"
                    style={{
                      left: f.left,
                      width: f.w,
                      height: f.h,
                      background: `radial-gradient(ellipse at center bottom, ${f.bg} 0%, rgba(255,69,0,0.3) 60%, transparent 100%)`,
                      animationDuration: f.dur,
                      animationDelay: f.delay,
                    }}
                  />
                ))}

                {/* Embers — tiny bright dots floating up */}
                {[
                  { left: '12%', bg: '#ffd54f', dur: '1.2s', delay: '0s', ex: '8px' },
                  { left: '30%', bg: '#ff9800', dur: '1.0s', delay: '0.4s', ex: '-6px' },
                  { left: '50%', bg: '#ffeb3b', dur: '1.4s', delay: '0.2s', ex: '4px' },
                  { left: '65%', bg: '#ff5722', dur: '1.1s', delay: '0.6s', ex: '-10px' },
                  { left: '82%', bg: '#ffc107', dur: '1.3s', delay: '0.15s', ex: '6px' },
                  { left: '22%', bg: '#ffab40', dur: '1.5s', delay: '0.5s', ex: '-4px' },
                  { left: '72%', bg: '#ffe082', dur: '1.0s', delay: '0.35s', ex: '10px' },
                ].map((e, i) => (
                  <span
                    key={i}
                    className="ember"
                    style={{
                      left: e.left,
                      background: e.bg,
                      animationDuration: e.dur,
                      animationDelay: e.delay,
                      '--ex': e.ex,
                      boxShadow: `0 0 4px ${e.bg}`,
                    } as React.CSSProperties}
                  />
                ))}

                {/* Text */}
                <span className="pk-text text-4xl md:text-5xl tracking-[0.22em] select-none" style={{ fontFamily: "'Ma Shan Zheng', cursive" }}>
                  龟势PK
                </span>
              </div>
            </div>

            {/* MVP + Bar */}
            <div className="flex items-center gap-3">
              <motion.div
                className="flex items-center gap-1.5 shrink-0"
                animate={leftLeading ? { x: [0, -3, 0], scale: [1, 1.04, 1] } : { x: 0, scale: 1 }}
                transition={leftLeading ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
              >
                {mvpA.length > 0
                  ? mvpA.slice(0, 1).map((c) => <MvpAvatar key={c.id} avatar={c.author.avatar} likes={c.likes} leading={leftLeading} color={LC} />)
                  : <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20" />}
              </motion.div>
              <div className="flex-1 relative h-10 rounded-none overflow-hidden bg-transparent border border-white/24 backdrop-blur-none">
                <span className="bar-ticks" style={{ opacity: 0.22 }} />
                <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 40%, rgba(255,255,255,0.06))' }} />
                <motion.div
                  className="absolute inset-y-0 left-0"
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
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(115deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 10px)',
                    }}
                    animate={{ backgroundPositionX: ['0px', '110px'] }}
                    transition={{ duration: 0.58, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.span
                    className="absolute top-0 bottom-0 right-[-6%] w-[42%]"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${LC}, rgba(255,255,255,0.95))`,
                      filter: 'blur(1px)',
                    }}
                    animate={{ x: [-6, 6, -6], opacity: [0.45, 0.95, 0.45] }}
                    transition={{ duration: 0.52, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
                <motion.div
                  className="absolute inset-y-0 right-0"
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
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(65deg, rgba(255,255,255,0.42) 0 2px, transparent 2px 10px)',
                    }}
                    animate={{ backgroundPositionX: ['0px', '-110px'] }}
                    transition={{ duration: 0.58, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.span
                    className="absolute top-0 bottom-0 left-[-6%] w-[42%]"
                    style={{
                      background: `linear-gradient(90deg, rgba(255,255,255,0.95), ${RC}, transparent)`,
                      filter: 'blur(1px)',
                    }}
                    animate={{ x: [6, -6, 6], opacity: [0.45, 0.95, 0.45] }}
                    transition={{ duration: 0.52, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
                <motion.div
                  className="absolute top-1/2 z-[8] pointer-events-none"
                  style={{ left: `${splitPct}%`, x: '-50%', y: '-50%' }}
                  initial={false}
                  animate={{ width: `${18 + clashStrength * 24}px`, opacity: [0.4, 0.95, 0.4] }}
                  transition={{ duration: 0.78, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div
                    className="h-6"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.28) 38%, transparent 75%)',
                      filter: 'blur(2px)',
                    }}
                  />
                </motion.div>
                <motion.div
                  className="absolute top-1/2 z-[7] h-[58%] pointer-events-none"
                  style={{ left: `${splitPct}%`, x: '-112%', y: '-50%' }}
                  animate={{ width: `${14 + clashStrength * 18}px`, opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 0.42, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div
                    className="h-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${LC}, rgba(255,255,255,0.95))`,
                      clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%, 16% 50%)',
                      filter: `drop-shadow(0 0 8px ${LC})`,
                    }}
                  />
                </motion.div>
                <motion.div
                  className="absolute top-1/2 z-[7] h-[58%] pointer-events-none"
                  style={{ left: `${splitPct}%`, x: '12%', y: '-50%' }}
                  animate={{ width: `${14 + clashStrength * 18}px`, opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 0.42, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
                >
                  <div
                    className="h-full"
                    style={{
                      background: `linear-gradient(90deg, rgba(255,255,255,0.95), ${RC}, transparent)`,
                      clipPath: 'polygon(15% 0, 100% 0, 84% 50%, 100% 100%, 15% 100%, 0 50%)',
                      filter: `drop-shadow(0 0 8px ${RC})`,
                    }}
                  />
                </motion.div>
                <motion.div
                  className="absolute top-1/2 z-[8] h-[90%] pointer-events-none"
                  style={{ x: '-50%', y: '-50%' }}
                  initial={false}
                  animate={{ left: `${splitPct}%`, width: `${10 + clashStrength * 14}px` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.08), rgba(255,255,255,0.95))',
                      boxShadow: `0 0 ${10 + clashStrength * 18}px rgba(255,255,255,0.9)`,
                    }}
                  />
                </motion.div>
                <motion.div
                  className="absolute top-1/2 z-[7] pointer-events-none"
                  style={{ x: '-50%', y: '-50%' }}
                  initial={false}
                  animate={{ left: `${splitPct}%`, width: `${clashPx * 1.4}px`, opacity: 0.35 + clashStrength * 0.45 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                >
                  <div
                    className="h-5"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.24) 35%, transparent 75%)',
                      filter: `blur(${2 + clashStrength * 4}px)`,
                    }}
                  />
                </motion.div>
                {[...Array(14)].map((_, i) => (
                  <motion.span
                    key={`bar-clash-${shakeKey}-${i}`}
                    className="absolute top-1/2 z-[9] h-[2px] w-6 pointer-events-none"
                    style={{
                      left: `${splitPct}%`,
                      background: i % 2 === 0
                        ? 'linear-gradient(90deg, transparent, rgba(0,210,255,1), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255,0,85,1), transparent)',
                    }}
                    initial={{ opacity: 1, x: '-50%', y: '-50%', scaleX: 0.2, scaleY: 0.2 }}
                    animate={{
                      opacity: 0,
                      x: `calc(-50% + ${(i % 2 === 0 ? -1 : 1) * (18 + i * 4)}px)`,
                      y: `calc(-50% + ${(i - 5.5) * 3}px)`,
                      scaleX: 1.35,
                      scaleY: 1.2,
                      rotate: (i - 5.5) * 10,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.015 }}
                  />
                ))}
                <AnimatePresence>
                  {clashPulses.map((pulse) => {
                    const c = pulse.side === 'left' ? LC : RC;
                    const fromLeft = pulse.side === 'left';
                    const zoneWidth = fromLeft ? splitPct : 100 - splitPct;
                    return (
                      <motion.div
                        key={pulse.id}
                        className="absolute inset-y-0 z-[9] pointer-events-none overflow-hidden"
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
                          className="absolute inset-y-0 w-[48%]"
                          style={{
                            background: fromLeft
                              ? `linear-gradient(90deg, transparent, ${c}, rgba(255,255,255,0.98), transparent)`
                              : `linear-gradient(90deg, transparent, rgba(255,255,255,0.98), ${c}, transparent)`,
                            filter: `drop-shadow(0 0 ${18 + pulse.strength * 20}px ${c})`,
                          }}
                          initial={{ x: fromLeft ? '-120%' : '120%' }}
                          animate={{ x: fromLeft ? '150%' : '-150%' }}
                          transition={{ duration: 0.52, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute inset-y-0 w-[28%]"
                          style={{
                            background: fromLeft
                              ? `linear-gradient(90deg, transparent, rgba(255,255,255,0.95), ${c}, transparent)`
                              : `linear-gradient(90deg, transparent, ${c}, rgba(255,255,255,0.95), transparent)`,
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
                  className="absolute top-1/2 z-10"
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
                    className="min-w-[42px] h-7 px-2 rounded-full bg-[linear-gradient(90deg,rgba(0,210,255,0.28),rgba(255,255,255,0.92),rgba(255,0,85,0.28))] border border-white/70 flex items-center justify-center relative overflow-visible"
                  >
                    <span className="absolute inset-0 rounded-full opacity-60" style={{ background: 'linear-gradient(90deg, rgba(0,210,255,0.25), transparent 35%, transparent 65%, rgba(255,0,85,0.25))', animation: 'neon-sweep 1.8s linear infinite' }} />
                    <span className="text-sm font-black text-slate-900 tracking-tight">VS</span>
                  </motion.div>
                </motion.div>
              </div>
              <motion.div
                className="flex items-center gap-1.5 shrink-0"
                animate={!leftLeading ? { x: [0, 3, 0], scale: [1, 1.04, 1] } : { x: 0, scale: 1 }}
                transition={!leftLeading ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
              >
                {mvpB.length > 0
                  ? mvpB.slice(0, 1).map((c) => <MvpAvatar key={c.id} avatar={c.author.avatar} likes={c.likes} leading={!leftLeading} color={RC} />)
                  : <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20" />}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  };

/* ══════════ DynamicDivider ══════════ */
const DynamicDivider: React.FC<{
  splitRatio: number;
  pulse: boolean;
  leftPower: number;
  rightPower: number;
}> = ({ splitRatio, pulse, leftPower, rightPower }) => {
  const diff = Math.abs(leftPower - rightPower);
  const heat = Math.min(1, Math.abs(0.5 - splitRatio) * 2);
  return (
    <div className="relative w-0 shrink-0 self-stretch z-20">
      <div className="absolute inset-y-0 left-0 w-px bg-white/20" />
      <motion.div
        className="absolute inset-y-0 left-0 w-[5px]"
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
        className="absolute left-0 top-[62%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
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
          className="relative min-w-[38px] h-6 px-2 rounded-full bg-[linear-gradient(90deg,rgba(0,210,255,0.26),rgba(255,255,255,0.92),rgba(255,0,85,0.26))] border border-white/75 flex items-center justify-center overflow-hidden"
        >
          <span className="absolute inset-0 opacity-65" style={{ background: 'linear-gradient(90deg, rgba(0,210,255,0.22), transparent 34%, transparent 66%, rgba(255,0,85,0.22))', animation: 'neon-sweep 2s linear infinite' }} />
          <span className="text-[10px] font-black text-slate-900 tracking-tight">VS</span>
          {[...Array(10)].map((_, i) => (
            <motion.span
              key={`vs-spark-${diff}-${i}`}
              className="absolute left-1/2 top-1/2 h-[2px] w-7"
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
  <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
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
        className="absolute text-sm"
        style={{ left: `${30 + Math.random() * 40}%`, top: '40%' }}
      >
        💩
      </motion.span>
    ))}
  </div>
);

const ActionFxBurst: React.FC<{ fxList: BattleFx[] }> = ({ fxList }) => (
  <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
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
            className="absolute top-1/2"
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

const BattleDanmu: React.FC<{ messages: { id: string; side: CommentSide; text: string; row: number; duration: number }[] }> = ({ messages }) => (
  <div className="absolute inset-x-0 top-1 pointer-events-none z-30 h-20 overflow-hidden">
    <AnimatePresence>
      {messages.map((item) => (
        <motion.div
          key={item.id}
          className="battle-danmu"
          style={{
            top: `${item.row * 22}px`,
            animationDuration: `${item.duration}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg"
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
      className="combo-badge px-2 py-0.5 rounded-full text-[10px] font-black text-white border"
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

const BattleTicker: React.FC<{
  optionA: string;
  optionB: string;
  leftPower: number;
  rightPower: number;
}> = ({ optionA, optionB, leftPower, rightPower }) => {
  const lead = leftPower === rightPower ? '势均力敌' : leftPower > rightPower ? `${optionA} 领先` : `${optionB} 领先`;
  const diff = Math.abs(leftPower - rightPower);
  return (
    <div className="relative h-7 rounded-none border border-white/18 bg-transparent overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-cyan-400/20 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-rose-500/20 to-transparent pointer-events-none" />
      <div className="battle-ticker h-full flex items-center">
        <span className="text-[11px] font-bold text-white/90 px-5">
          [战报] {lead} {diff > 0 ? `· 优势 +${diff}` : '· 双方火力拉满'} · 点赞/回复都会叠加连击 · 高连击触发 KO 冲击
        </span>
      </div>
    </div>
  );
};

const KoFlash: React.FC<{ fx: KoFx | null }> = ({ fx }) => (
  <AnimatePresence>
    {fx && (
      <motion.div
        key={fx.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${fx.color}40 0%, ${fx.color}14 32%, rgba(255,255,255,0.04) 52%, transparent 76%)`,
            animation: 'ko-flash 0.95s ease-out forwards',
          }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.08, 0.95], opacity: [0, 1, 0.92] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative text-center px-6 py-4 rounded-none border border-white/30 bg-transparent"
          style={{ boxShadow: `0 0 40px ${fx.color}99` }}
        >
          <div className="text-4xl font-black tracking-[0.2em] text-white" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: `0 0 16px ${fx.color}` }}>
            KO
          </div>
          <div className="text-xs font-bold text-white/90 mt-1">{fx.text}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const IdleArenaFx: React.FC<{ active: boolean }> = ({ active }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none z-[25] overflow-hidden"
      >
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="idle-spark w-1.5 h-1.5"
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
  comment, side, compact, onLike, onStomp, stomped, showPoop, onReply, onLikeReply, accent, pushFx,
}: {
  comment: EventComment;
  side: CommentSide;
  compact: boolean;
  onLike: (id: string) => void;
  onStomp: (id: string) => void;
  stomped: boolean;
  showPoop: boolean;
  onReply: (commentId: string, authorName: string) => void;
  onLikeReply: (commentId: string, replyId: string) => void;
  accent: string;
  pushFx: (side: CommentSide, type: BattleFx['type']) => void;
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
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent transition-colors"
      >
        <FlameAvatar emoji={comment.author.avatar} side={side} compact />
        <span className="text-[10px] truncate flex-1 min-w-0 battle-hot-text">
          {comment.content}
        </span>
        <button
          onClick={() => {
            onLike(comment.id);
            triggerPulse('like');
            pushFx(side, 'like');
          }}
          className="shrink-0 text-[9px] font-bold border-0 bg-transparent cursor-pointer px-0.5"
          style={{ color: accent }}
        >
          +<AnimatedCount value={comment.likes} duration={0.45} />
        </button>
      </motion.div>
    );
  }

  const replies = comment.replies ?? [];

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
      className="px-3 py-2.5 rounded-none border border-transparent transition-colors relative overflow-hidden"
    >
      {showPoop && <PoopBurst />}
      <div className="flex items-start gap-2">
        <FlameAvatar emoji={comment.author.avatar} side={side} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-rdark-text">
              {comment.author.name}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-rdark-text2">{comment.time}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-rdark-text leading-relaxed mb-1.5 battle-hot-text">
            {comment.content}
          </p>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  onLike(comment.id);
                  triggerPulse('like');
                  pushFx(side, 'like');
                }}
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-none border-0 bg-transparent cursor-pointer transition-colors hover:opacity-80"
                style={{ color: accent }}
              >
                <ThumbsUp size={10} style={{ animation: likedPulse ? 'hot-icon-spin 0.35s ease' : undefined }} /> <AnimatedCount value={comment.likes} duration={0.45} />
              </button>
              {likedPulse && (
                <span
                  className="absolute inset-0 rounded-none pointer-events-none"
                  style={{ border: `1px solid ${accent}`, animation: 'pulse-ring 0.45s ease-out' }}
                />
              )}
            </div>
            <button
              onClick={() => onStomp(comment.id)}
              disabled={stomped}
              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-none border-0 bg-transparent cursor-pointer transition-colors ${stomped
                ? 'text-amber-600 dark:text-amber-400 cursor-default opacity-70'
                : 'text-slate-400 dark:text-rdark-text2 hover:text-amber-500'
                }`}
            >
              💩 <AnimatedCount value={comment.dislikes ?? 0} duration={0.45} />
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  onReply(comment.id, comment.author.name);
                  triggerPulse('reply');
                  pushFx(side, 'reply');
                }}
                className="text-[10px] px-1.5 py-0.5 rounded-none border-0 bg-transparent cursor-pointer transition-colors text-slate-400 dark:text-rdark-text2 hover:text-emerald-500 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1"
              >
                <MessageCircleReply size={10} style={{ animation: replyPulse ? 'hot-icon-spin 0.35s ease' : undefined }} />
                回复
              </button>
              {replyPulse && (
                <span
                  className="absolute inset-0 rounded-none pointer-events-none border border-emerald-400"
                  style={{ animation: 'pulse-ring 0.45s ease-out' }}
                />
              )}
            </div>
          </div>

          {/* Nested replies */}
          {replies.length > 0 && (
            <div className="mt-2 ml-0.5 pl-2.5 border-l-2 border-slate-100 dark:border-rdark-border space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="flex items-start gap-1.5">
                  <FlameAvatar emoji={r.author.avatar} side={r.side} compact />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-rdark-text">
                        {r.author.name}
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-rdark-text2">{r.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-rdark-text leading-relaxed battle-hot-text">
                      <span className="font-medium" style={{ color: side === 'A' ? LC : RC }}>
                        @{comment.author.name}
                      </span>{' '}
                      {r.content}
                    </p>
                    <button
                      onClick={() => {
                        onLikeReply(comment.id, r.id);
                        pushFx(r.side, 'like');
                      }}
                      className="flex items-center gap-1 text-[9px] mt-0.5 px-1 py-0.5 rounded border-0 bg-transparent cursor-pointer text-slate-400 dark:text-rdark-text2 hover:opacity-80 transition-colors"
                    >
                      <ThumbsUp size={8} /> <AnimatedCount value={r.likes} duration={0.45} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  comments: EventComment[];
  compact: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onLike: (id: string) => void;
  onStomp: (id: string) => void;
  stompedSet: Set<string>;
  poopAnims: { id: string; commentId: string }[];
  onReply: (commentId: string, authorName: string) => void;
  onLikeReply: (commentId: string, replyId: string) => void;
  dotColor: string;
  textColor: string;
  pushFx: (side: CommentSide, type: BattleFx['type']) => void;
  comboCount: number;
}

const SideColumn = React.memo(({
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
  onLikeReply,
  dotColor,
  textColor,
  pushFx,
  comboCount,
}: SideColumnProps) => {
  const poopCommentIds = useMemo(() => new Set(poopAnims.map((a) => a.commentId)), [poopAnims]);
  return (
    <>
      <div
        className="px-3 py-2 border-b border-white/10 flex items-center gap-2 shrink-0 relative overflow-hidden"
        style={{ background: `linear-gradient(90deg, ${dotColor}18, rgba(255,255,255,0.02))` }}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: dotColor }} />
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor, boxShadow: `0 0 10px ${dotColor}` }} />
        {!compact ? (
          <>
            <span className="text-xs font-bold battle-hot-text">{label}</span>
            <span className="text-[10px] text-white/70 ml-auto flex items-center gap-1">
              <Flame size={10} /> <AnimatedCount value={power} duration={0.5} />
            </span>
            <ComboBadge side={side} count={comboCount} />
          </>
        ) : (
          <span className="text-[10px] font-bold truncate battle-hot-text">{label}</span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-1 space-y-0.5 relative z-10 battle-scroll"
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
            onLikeReply={onLikeReply}
            accent={textColor}
            pushFx={pushFx}
          />
        ))}
        {comments.length === 0 && (
          <div className="text-center text-xs text-white/55 py-8">暂无评论</div>
        )}
      </div>
    </>
  );
});

/* ═══════════════════ Main EventBattle ═══════════════════ */
export const EventBattle: React.FC<EventBattleProps> = ({ news, onBack, userSide, onBet }) => {
  const [comments, setComments] = useState<EventComment[]>(() =>
    mockEventComments.filter((c) => c.newsId === news.id),
  );
  const selectedSide: CommentSide = userSide ?? 'A';
  const [inputText, setInputText] = useState('');
  const [pulse, setPulse] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [stompedSet, setStompedSet] = useState<Set<string>>(new Set());
  const [poopAnims, setPoopAnims] = useState<{ id: string; commentId: string }[]>([]);
  const [battleFx, setBattleFx] = useState<BattleFx[]>([]);
  const [danmu, setDanmu] = useState<{ id: string; side: CommentSide; text: string; row: number; duration: number }[]>([]);
  const [comboA, setComboA] = useState(0);
  const [comboB, setComboB] = useState(0);
  const [koFx, setKoFx] = useState<KoFx | null>(null);
  const [isIdle, setIsIdle] = useState(false);

  const scrollA = useRef<HTMLDivElement>(null);
  const scrollB = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const comboTimerA = useRef<number | null>(null);
  const comboTimerB = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const commentsA = useMemo(() => comments.filter((c) => c.side === 'A'), [comments]);
  const commentsB = useMemo(() => comments.filter((c) => c.side === 'B'), [comments]);
  const leftPower = useMemo(() => calcPower(commentsA), [commentsA]);
  const rightPower = useMemo(() => calcPower(commentsB), [commentsB]);
  const leftSuccess = useMemo(
    () => commentsA.reduce((sum, c) => sum + c.likes + (c.replies ?? []).reduce((r, rr) => r + rr.likes, 0), 0),
    [commentsA],
  );
  const rightSuccess = useMemo(
    () => commentsB.reduce((sum, c) => sum + c.likes + (c.replies ?? []).reduce((r, rr) => r + rr.likes, 0), 0),
    [commentsB],
  );
  const leftFail = useMemo(
    () => commentsA.reduce((sum, c) => sum + (c.dislikes ?? 0), 0),
    [commentsA],
  );
  const rightFail = useMemo(
    () => commentsB.reduce((sum, c) => sum + (c.dislikes ?? 0), 0),
    [commentsB],
  );

  const totalPower = leftPower + rightPower;
  const splitPct = totalPower > 0 ? (leftPower / totalPower) * 100 : 50;

  const firePulse = useCallback(() => {
    setPulse(true);
    setShakeKey((k) => k + 1);
    const t = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(t);
  }, []);

  const scheduleIdle = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setIsIdle(true), 4500);
  }, []);

  const markAction = useCallback(() => {
    setIsIdle(false);
    scheduleIdle();
  }, [scheduleIdle]);

  const triggerCombo = useCallback(
    (side: CommentSide) => {
      const timerRef = side === 'A' ? comboTimerA : comboTimerB;
      const setter = side === 'A' ? setComboA : setComboB;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setter((prev) => {
        const next = Math.min(prev + 1, 12);
        if (next >= 5) {
          const color = side === 'A' ? LC : RC;
          const sideName = side === 'A' ? news.optionA : news.optionB;
          const koId = `ko-${Date.now()}-${side}`;
          setKoFx({ id: koId, color, text: `${sideName} ${next} 连击暴走` });
          window.setTimeout(() => setKoFx((f) => (f?.id === koId ? null : f)), 950);
        }
        return next;
      });
      timerRef.current = window.setTimeout(() => setter(0), 2600);
    },
    [news.optionA, news.optionB],
  );

  const pushFx = useCallback((side: CommentSide, type: BattleFx['type'], trigger = true) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBattleFx((prev) => [...prev.slice(-7), { id, side, type }]);
    if (trigger) triggerCombo(side);
    setTimeout(() => {
      setBattleFx((prev) => prev.filter((f) => f.id !== id));
    }, 1000);
  }, [triggerCombo]);

  const pushDanmu = useCallback((side: CommentSide, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const id = `danmu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = 72 + Math.random() * 24;
    setDanmu((prev) => [...prev.slice(-8), { id, side, text: clean.slice(0, 24), row: Math.floor(Math.random() * 3), duration }]);
    setTimeout(() => {
      setDanmu((prev) => prev.filter((d) => d.id !== id));
    }, duration * 1000 + 1200);
  }, []);

  useEffect(
    () => () => {
      if (comboTimerA.current) window.clearTimeout(comboTimerA.current);
      if (comboTimerB.current) window.clearTimeout(comboTimerB.current);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    scheduleIdle();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [scheduleIdle]);

  useEffect(() => {
    if (!isIdle) return;
    const idleIv = window.setInterval(() => {
      const side: CommentSide = Math.random() > 0.5 ? 'A' : 'B';
      const line = IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)];
      pushFx(side, Math.random() > 0.5 ? 'like' : 'reply', false);
      pushDanmu(side, `${line} · ${side === 'A' ? news.optionA : news.optionB}`);
      firePulse();
    }, 2200);
    return () => window.clearInterval(idleIv);
  }, [isIdle, news.optionA, news.optionB, pushFx, pushDanmu, firePulse]);

  /* Auto-demo */
  useEffect(() => {
    const iv = setInterval(() => {
      setComments((prev) => {
        const side: CommentSide = Math.random() > 0.5 ? 'A' : 'B';
        const pool = prev.filter((c) => c.side === side);
        if (!pool.length) return prev;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const gain = randomBattleGain();
        pushFx(side, 'like');
        pushDanmu(side, `@${pick.author.name}: +${gain} 火力`);
        return prev.map((c) => (c.id === pick.id ? { ...c, likes: c.likes + gain } : c));
      });
      firePulse();
    }, 3000);
    return () => clearInterval(iv);
  }, [firePulse, pushDanmu, pushFx]);

  const handleLike = useCallback(
    (id: string) => {
      markAction();
      const gain = randomBattleGain();
      setComments((p) => p.map((c) => (c.id === id ? { ...c, likes: c.likes + gain } : c)));
      firePulse();
    },
    [firePulse, markAction],
  );

  const handleStomp = useCallback(
    (id: string) => {
      if (stompedSet.has(id)) return;
      markAction();
      const gain = randomBattleGain();
      setStompedSet((prev) => new Set(prev).add(id));
      setComments((p) =>
        p.map((c) => (c.id === id ? { ...c, dislikes: (c.dislikes ?? 0) + gain } : c)),
      );
      const animId = `poop-${Date.now()}`;
      setPoopAnims((prev) => [...prev, { id: animId, commentId: id }]);
      setTimeout(() => setPoopAnims((prev) => prev.filter((a) => a.id !== animId)), 1200);
      firePulse();
    },
    [firePulse, stompedSet, markAction],
  );

  const handleReply = useCallback((commentId: string, authorName: string) => {
    markAction();
    setReplyingTo({ commentId, authorName });
    pushFx(selectedSide, 'reply');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [pushFx, selectedSide, markAction]);

  const handleLikeReply = useCallback((commentId: string, replyId: string) => {
    markAction();
    const gain = randomBattleGain();
    setComments((p) =>
      p.map((c) =>
        c.id === commentId
          ? { ...c, replies: (c.replies ?? []).map((r) => (r.id === replyId ? { ...r, likes: r.likes + gain } : r)) }
          : c,
      ),
    );
  }, [markAction]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    markAction();

    if (replyingTo) {
      const newReply: EventReply = {
        id: `er-${Date.now()}`,
        author: { name: '你', avatar: '🦊' },
        side: selectedSide,
        content: text,
        time: '刚刚',
        likes: 0,
      };
      setComments((p) =>
        p.map((c) =>
          c.id === replyingTo.commentId
            ? { ...c, replies: [...(c.replies ?? []), newReply] }
            : c,
        ),
      );
      setReplyingTo(null);
      pushDanmu(selectedSide, `回复 @${replyingTo.authorName}: ${text}`);
    } else {
      const nc: EventComment = {
        id: `ec-${Date.now()}`,
        newsId: news.id,
        side: selectedSide,
        author: { name: '你', avatar: '🦊' },
        content: text,
        time: '刚刚',
        likes: 0,
        dislikes: 0,
        eggStatus: 'egg',
        posX: 0,
        posY: 0,
      };
      setComments((p) => [...p, nc]);
      pushDanmu(selectedSide, text);
    }

    setInputText('');
    pushFx(selectedSide, 'send');
    firePulse();
    setTimeout(() => {
      const ref = selectedSide === 'A' ? scrollA : scrollB;
      ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [inputText, selectedSide, news.id, firePulse, replyingTo, pushDanmu, pushFx, markAction]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="battle-shell px-2 md:px-3 py-2 h-full min-h-[calc(100vh-56px)]">
      <style>{BATTLE_CSS}</style>
      <div className="battle-outer-frame relative overflow-hidden">
        <span className="battle-orb w-36 h-36 -left-10 -top-8 bg-cyan-400/20" />
        <span className="battle-orb w-44 h-44 -right-14 top-16 bg-rose-500/20" style={{ animationDelay: '0.6s' }} />
        <span className="battle-orb w-32 h-32 left-1/3 -bottom-12 bg-emerald-400/15" style={{ animationDelay: '1.1s' }} />
        <div className="battle-header-strip">
          <button
            onClick={onBack}
            className="relative z-10 inline-flex items-center gap-2 text-white/90 text-xs font-semibold bg-transparent border-0 cursor-pointer"
          >
            <span className="text-cyan-300">☰</span>
            返回
          </button>
          <span className="relative z-10 text-white/75 text-xs font-semibold tracking-[0.2em]">LIVE BATTLE</span>
        </div>
        <div className="relative z-10 w-full h-full min-h-[calc(100vh-56px)] flex flex-col gap-4 md:gap-5 overflow-hidden px-2 md:px-3 py-3">
          <KoFlash fx={koFx} />

          <BattleHeader
            news={news}
            leftPower={leftPower}
            rightPower={rightPower}
            leftSuccess={leftSuccess}
            leftFail={leftFail}
            rightSuccess={rightSuccess}
            rightFail={rightFail}
            splitPct={splitPct}
            commentsA={commentsA}
            commentsB={commentsB}
            comboA={comboA}
            comboB={comboB}
            shakeKey={shakeKey}
          />

          {false && <>
            <BattleTicker
              optionA={news.optionA}
              optionB={news.optionB}
              leftPower={leftPower}
              rightPower={rightPower}
            />

            <div className="relative -mt-3">
              <BattleDanmu messages={danmu} />
            </div>
          </>}

          <div className="grid grid-cols-1  gap-5 md:gap-6 items-start flex-1 min-h-0">
            <div className={`${card} battle-main-panel overflow-hidden relative h-full min-h-0`}>
              <div className="battle-arena-grid absolute inset-0 pointer-events-none opacity-[0.07]" />
              {/* <span className="battle-vs-cross-y" /> */}
              <IdleArenaFx active={isIdle} />
              <ActionFxBurst fxList={battleFx} />
              <div className="xl:hidden px-2 pt-2 pb-1">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 scroll-smooth">
                  <div className="snap-start shrink-0 w-full min-w-full h-[56vh] border border-cyan-300/20 bg-black/10 overflow-hidden relative">
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(900px 520px at 16% 18%, rgba(0,210,255,0.22), transparent 55%), radial-gradient(700px 420px at 60% 80%, rgba(0,210,255,0.12), transparent 58%), linear-gradient(180deg, rgba(0,210,255,0.06), transparent 55%, rgba(0,0,0,0.25))',
                      }}
                    />
                    <div className="h-full min-h-0 flex flex-col">
                      <SideColumn
                        side="A"
                        label={news.optionA}
                        power={leftPower}
                        comments={commentsA}
                        compact={false}
                        scrollRef={scrollA}
                        onLike={handleLike}
                        onStomp={handleStomp}
                        stompedSet={stompedSet}
                        poopAnims={poopAnims}
                        onReply={handleReply}
                        onLikeReply={handleLikeReply}
                        dotColor={LC}
                        textColor={LC}
                        pushFx={pushFx}
                        comboCount={comboA}
                      />
                    </div>
                  </div>
                  <div className="snap-start shrink-0 w-full min-w-full h-[56vh] border border-rose-300/20 bg-black/10 overflow-hidden relative">
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(900px 520px at 84% 18%, rgba(255,0,85,0.22), transparent 55%), radial-gradient(700px 420px at 40% 80%, rgba(255,0,85,0.12), transparent 58%), linear-gradient(180deg, rgba(255,0,85,0.06), transparent 55%, rgba(0,0,0,0.25))',
                      }}
                    />
                    <div className="h-full min-h-0 flex flex-col">
                      <SideColumn
                        side="B"
                        label={news.optionB}
                        power={rightPower}
                        comments={commentsB}
                        compact={false}
                        scrollRef={scrollB}
                        onLike={handleLike}
                        onStomp={handleStomp}
                        stompedSet={stompedSet}
                        poopAnims={poopAnims}
                        onReply={handleReply}
                        onLikeReply={handleLikeReply}
                        dotColor={RC}
                        textColor={RC}
                        pushFx={pushFx}
                        comboCount={comboB}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row h-full min-h-[68vh] xl:min-h-0">
                <div className="hidden xl:flex flex-col overflow-hidden relative flex-1 min-w-0 min-h-0">
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(900px 520px at 16% 18%, rgba(0,210,255,0.22), transparent 55%), radial-gradient(700px 420px at 60% 80%, rgba(0,210,255,0.12), transparent 58%), linear-gradient(180deg, rgba(0,210,255,0.06), transparent 55%, rgba(0,0,0,0.25))',
                    }}
                  />
                  <SideColumn
                    side="A"
                    label={news.optionA}
                    power={leftPower}
                    comments={commentsA}
                    compact={false}
                    scrollRef={scrollA}
                    onLike={handleLike}
                    onStomp={handleStomp}
                    stompedSet={stompedSet}
                    poopAnims={poopAnims}
                    onReply={handleReply}
                    onLikeReply={handleLikeReply}
                    dotColor={LC}
                    textColor={LC}
                    pushFx={pushFx}
                    comboCount={comboA}
                  />
                </div>

                <div className="hidden xl:block">
                  <DynamicDivider
                    splitRatio={splitPct / 100}
                    pulse={pulse}
                    leftPower={leftPower}
                    rightPower={rightPower}
                  />
                </div>
                {/* <aside className="battle-right-stack flex flex-col gap-3 md:gap-5 xl:sticky xl:top-4 h-full min-h-0 w-full xl:w-[420px] 2xl:w-[500px] shrink-0 ml-0 xl:ml-6">
                  <div className={`${card} battle-right-panel battle-live-board p-4 space-y-3`}>
                    <div className="battle-live-head flex items-center justify-between text-[11px]">
                      <span className="battle-live-title text-white/75">实时战况</span>
                      <span className="battle-live-diff text-white/50">优势差值 {Math.abs(leftPower - rightPower)}</span>
                    </div>
                    <div className="battle-live-grid grid grid-cols-2 gap-2">
                      <div className="battle-live-side battle-live-left rounded-none border border-cyan-300/30 bg-transparent p-2">
                        <div className="text-[10px] text-cyan-200/80">{news.optionA}</div>
                        <div className="text-lg font-black text-cyan-100">
                          <AnimatedCount value={leftPower} duration={0.55} />
                        </div>
                        <div className="text-[10px] text-cyan-100/80">
                          COMBO <AnimatedCount value={comboA} duration={0.45} />
                        </div>
                        <div className="battle-live-breakdown mt-2 grid grid-cols-2 gap-1.5">
                          <div className="battle-stat-card battle-stat-success rounded-none border border-emerald-300/40 bg-emerald-400/10 px-1.5 py-1">
                            <div className="text-[10px] text-emerald-200/85">会成功</div>
                            <motion.div
                              key={`ls-fx-ring-${leftSuccess}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className="absolute inset-0 pointer-events-none"
                              style={{ border: '1px solid rgba(110,231,183,0.9)', boxShadow: '0 0 20px rgba(16,185,129,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`ls-fx-ray-${leftSuccess}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`ls-${leftSuccess}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className="battle-stat-num text-[26px] text-emerald-100 tabular-nums"
                              style={{ textShadow: '0 0 18px rgba(110,231,183,0.95), 0 0 34px rgba(52,211,153,0.75)' }}
                            >
                              <FlipNumber value={leftSuccess} className="tabular-nums" />
                            </motion.div>
                          </div>
                          <div className="battle-stat-card battle-stat-fail rounded-none border border-amber-300/40 bg-amber-400/10 px-1.5 py-1">
                            <div className="text-[10px] text-amber-100/90">会失败</div>
                            <motion.div
                              key={`lf-fx-ring-${leftFail}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className="absolute inset-0 pointer-events-none"
                              style={{ border: '1px solid rgba(252,211,77,0.9)', boxShadow: '0 0 20px rgba(245,158,11,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`lf-fx-ray-${leftFail}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(252,211,77,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`lf-${leftFail}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className="battle-stat-num text-[26px] text-amber-100 tabular-nums"
                              style={{ textShadow: '0 0 18px rgba(252,211,77,0.95), 0 0 34px rgba(245,158,11,0.75)' }}
                            >
                              <FlipNumber value={leftFail} className="tabular-nums" />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                      <div className="battle-live-side battle-live-right rounded-none border border-rose-300/30 bg-transparent p-2">
                        <div className="text-[10px] text-rose-200/80">{news.optionB}</div>
                        <div className="text-lg font-black text-rose-100">
                          <AnimatedCount value={rightPower} duration={0.55} />
                        </div>
                        <div className="text-[10px] text-rose-100/80">
                          COMBO <AnimatedCount value={comboB} duration={0.45} />
                        </div>
                        <div className="battle-live-breakdown mt-2 grid grid-cols-2 gap-1.5">
                          <div className="battle-stat-card battle-stat-success rounded-none border border-emerald-300/40 bg-emerald-400/10 px-1.5 py-1">
                            <div className="text-[10px] text-emerald-200/85">会成功</div>
                            <motion.div
                              key={`rs-fx-ring-${rightSuccess}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className="absolute inset-0 pointer-events-none"
                              style={{ border: '1px solid rgba(110,231,183,0.9)', boxShadow: '0 0 20px rgba(16,185,129,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`rs-fx-ray-${rightSuccess}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`rs-${rightSuccess}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className="battle-stat-num text-[26px] text-emerald-100 tabular-nums"
                              style={{ textShadow: '0 0 18px rgba(110,231,183,0.95), 0 0 34px rgba(52,211,153,0.75)' }}
                            >
                              <FlipNumber value={rightSuccess} className="tabular-nums" />
                            </motion.div>
                          </div>
                          <div className="battle-stat-card battle-stat-fail rounded-none border border-amber-300/40 bg-amber-400/10 px-1.5 py-1">
                            <div className="text-[10px] text-amber-100/90">会失败</div>
                            <motion.div
                              key={`rf-fx-ring-${rightFail}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className="absolute inset-0 pointer-events-none"
                              style={{ border: '1px solid rgba(252,211,77,0.9)', boxShadow: '0 0 20px rgba(245,158,11,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`rf-fx-ray-${rightFail}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(252,211,77,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`rf-${rightFail}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className="battle-stat-num text-[26px] text-amber-100 tabular-nums"
                              style={{ textShadow: '0 0 18px rgba(252,211,77,0.95), 0 0 34px rgba(245,158,11,0.75)' }}
                            >
                              <FlipNumber value={rightFail} className="tabular-nums" />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`${card} battle-right-panel px-4 py-3 relative overflow-hidden`}>
                    <span
                      className="absolute inset-y-0 w-24 pointer-events-none"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)', animation: 'neon-sweep 2.9s linear infinite' }}
                    />
                    <AnimatePresence>
                      {replyingTo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 mb-2 pb-2 border-b border-white/15"
                        >
                          <span className="text-[10px] text-white/70">
                            回复 <span className="font-semibold text-white">@{replyingTo.authorName}</span>
                          </span>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="ml-auto p-0.5 rounded-none border-0 bg-transparent cursor-pointer text-white/60 hover:text-white transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-2.5">
                      {userSide ? (
                        <span
                          className="shrink-0 px-2.5 py-1.5 rounded-none text-[11px] font-bold text-white inline-flex items-center gap-1"
                          style={{ backgroundColor: userSide === 'A' ? LC : RC, boxShadow: `0 0 16px ${userSide === 'A' ? LC : RC}88` }}
                        >
                          <Zap size={11} /> {userSide === 'A' ? news.optionA : news.optionB}
                        </span>
                      ) : (
                        <span className="shrink-0 px-2.5 py-1.5 rounded-none text-[11px] font-bold bg-transparent border border-white/20 text-white/55">
                          未投票
                        </span>
                      )}
                      <div className="flex-1 flex items-center gap-2 rounded-none px-3 py-2 border border-white/20 bg-transparent focus-within:border-emerald-300/70 transition-colors relative overflow-hidden">
                        <span
                          className="absolute inset-y-0 w-14 pointer-events-none"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'neon-sweep 2.4s linear infinite' }}
                        />
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={onKey}
                          placeholder={
                            replyingTo
                              ? `回复 @${replyingTo.authorName}...`
                              : userSide
                                ? '发表火力评论...'
                                : '请先投票后发言'
                          }
                          className="flex-1 bg-transparent border-0 outline-none text-xs text-white placeholder:text-white/45"
                        />
                        <motion.button
                          onClick={handleSend}
                          disabled={!inputText.trim() || !userSide}
                          whileTap={inputText.trim() && userSide ? { scale: 0.92 } : {}}
                          whileHover={inputText.trim() && userSide ? { scale: 1.06 } : {}}
                          className={`p-1.5 rounded-none border-0 cursor-pointer transition-colors ${inputText.trim() && userSide
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-transparent border border-white/20 text-white/45 cursor-not-allowed'
                            }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Send size={12} style={{ animation: inputText.trim() && userSide ? 'hot-icon-spin 0.9s ease-in-out infinite' : undefined }} />
                            {inputText.trim() && userSide && <Sparkles size={10} />}
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {onBet && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5 md:gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${LC}35, inset 0 1px 0 rgba(255,255,255,0.2)` }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onBet(news.id, 'A', news.oddsA)}
                        className={`${card} battle-right-panel battle-odds-btn relative py-3.5 px-3 border-2 cursor-pointer overflow-hidden transition-shadow`}
                        style={{ borderColor: LC, boxShadow: `0 0 20px ${LC}18, inset 0 1px 0 rgba(255,255,255,0.12)` }}
                      >
                        <div className="absolute inset-0 opacity-[0.07]" style={{ background: `linear-gradient(135deg, ${LC}, transparent 60%)` }} />
                        <div className="relative text-center">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: LC }}>{news.optionA}</div>
                          <div className="text-lg font-black text-white">{news.oddsA.toFixed(1)}x</div>
                          <div className="text-[9px] text-white/55">点击下注</div>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${RC}35, inset 0 1px 0 rgba(255,255,255,0.2)` }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onBet(news.id, 'B', news.oddsB)}
                        className={`${card} battle-right-panel battle-odds-btn relative py-3.5 px-3 border-2 cursor-pointer overflow-hidden transition-shadow`}
                        style={{ borderColor: RC, boxShadow: `0 0 20px ${RC}18, inset 0 1px 0 rgba(255,255,255,0.12)` }}
                      >
                        <div className="absolute inset-0 opacity-[0.07]" style={{ background: `linear-gradient(135deg, transparent 40%, ${RC})` }} />
                        <div className="relative text-center">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: RC }}>{news.optionB}</div>
                          <div className="text-lg font-black text-white">{news.oddsB.toFixed(1)}x</div>
                          <div className="text-[9px] text-white/55">点击下注</div>
                        </div>
                      </motion.button>
                    </div>
                  )}
                </aside> */}
                <div
            className="shrink-0 overflow-hidden rounded-xl"
            style={{
              width: 260,
              background: 'linear-gradient(180deg, rgba(8,8,14,0.95) 0%, rgba(12,12,20,0.92) 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <BattleReport
              commentsA={commentsA}
              commentsB={commentsB}
              leftPower={leftPower}
              rightPower={rightPower}
              splitPct={splitPct}
              optionA={news.optionA}
              optionB={news.optionB}
              oddsA={news.oddsA}
              oddsB={news.oddsB}
              userSide={userSide}
            />
          </div>
                <div className="hidden xl:block">
                  <DynamicDivider
                    splitRatio={splitPct / 100}
                    pulse={pulse}
                    leftPower={leftPower}
                    rightPower={rightPower}
                  />
                </div>

                <div className="hidden xl:flex flex-col overflow-hidden relative flex-1 min-w-0 min-h-0">
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(900px 520px at 84% 18%, rgba(255,0,85,0.22), transparent 55%), radial-gradient(700px 420px at 40% 80%, rgba(255,0,85,0.12), transparent 58%), linear-gradient(180deg, rgba(255,0,85,0.06), transparent 55%, rgba(0,0,0,0.25))',
                    }}
                  />
                  <SideColumn
                    side="B"
                    label={news.optionB}
                    power={rightPower}
                    comments={commentsB}
                    compact={false}
                    scrollRef={scrollB}
                    onLike={handleLike}
                    onStomp={handleStomp}
                    stompedSet={stompedSet}
                    poopAnims={poopAnims}
                    onReply={handleReply}
                    onLikeReply={handleLikeReply}
                    dotColor={RC}
                    textColor={RC}
                    pushFx={pushFx}
                    comboCount={comboB}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
