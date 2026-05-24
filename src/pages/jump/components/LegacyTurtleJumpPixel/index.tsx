/**
 * 文件说明：Legacy Turtle Jump Pixel，实验室小游戏页面组件。
 */
import styles from './index.module.scss';
import React, { useEffect, useMemo, useRef, useState } from 'react';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

type Phase = 'idle' | 'playing' | 'paused' | 'gameover';
type Ability = 'none' | 'shield' | 'shrink';

interface PetDef {
  id: string;
  name: string;
  emoji: string;
  img: string;
  rarity: string;
  ability: Ability;
  abilityName: string;
  glowColor: string;
}

interface FrameDef {
  id: string;
  name: string;
  emoji: string;
  borderColor: string | null;
  trailColor: string | null;
}

interface RuntimeObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  emoji: string;
  speed: number;
}

interface RuntimeBubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
}

interface RuntimeTrail {
  x: number;
  y: number;
  r: number;
  life: number;
  color: string;
  dy: number;
}

interface RuntimeLaser {
  x: number;
  w: number;
  warn: number;
  active: number;
  phase: 'warn' | 'active';
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

interface PetStateEntry {
  id: string;
  owned?: boolean;
  equipped?: boolean;
}

interface PetStorageState {
  pets?: PetStateEntry[];
  frames?: PetStateEntry[];
}

interface HudState {
  score: number;
  depth: number;
  speedMul: number;
  maxSpeed: number;
  shieldCount: number;
  coinsGain: number;
}

const DAILY_BONUS_DIVISOR = 15;
const LEADERBOARD_KEY = 'turtleJumpLB';
const PET_STATE_KEY = 'petState';
const BEST_KEY = 'turtleGameBest';
const LAST_DAY_KEY = 'turtleGameLastDay';

const ALL_PETS: PetDef[] = [
  { id: 'basic', name: '小龟', emoji: '🐢', img: '/turtle-dive-assets/基础小龟.png', rarity: 'C', ability: 'none', abilityName: '无', glowColor: '#06d6a0' },
  { id: 'stone', name: '石头龟', emoji: '🪨🐢', img: '/turtle-dive-assets/石头龟.png', rarity: 'C', ability: 'none', abilityName: '无', glowColor: '#78716c' },
  { id: 'bamboo', name: '竹叶龟', emoji: '🎋🐢', img: '/turtle-dive-assets/竹叶龟.png', rarity: 'C', ability: 'none', abilityName: '无', glowColor: '#06d6a0' },
  { id: 'angel', name: '天使龟', emoji: '😇🐢', img: '/turtle-dive-assets/天使龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#06d6a0' },
  { id: 'ice', name: '寒冰龟', emoji: '❄️🐢', img: '/turtle-dive-assets/寒冰龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#4cc9f0' },
  { id: 'ninja', name: '忍者龟', emoji: '🥷🐢', img: '/turtle-dive-assets/忍者龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#6b6880' },
  { id: 'two_head', name: '双头龟', emoji: '🐢🐢', img: '/turtle-dive-assets/双头龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#06d6a0' },
  { id: 'ghost', name: '幽灵龟', emoji: '👻🐢', img: '/turtle-dive-assets/幽灵龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#8b5cf6' },
  { id: 'diamond', name: '钻石龟', emoji: '💎🐢', img: '/turtle-dive-assets/钻石龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#4cc9f0' },
  { id: 'fortune', name: '财神龟', emoji: '🧧🐢', img: '/turtle-dive-assets/财神龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#ff6b6b' },
  { id: 'dice', name: '骰子龟', emoji: '🎲🐢', img: '/turtle-dive-assets/骰子龟.png', rarity: 'B', ability: 'none', abilityName: '无', glowColor: '#ffd93d' },
  { id: 'rainbow', name: '彩虹龟', emoji: '🌈🐢', img: '/turtle-dive-assets/彩虹龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#ff9f43' },
  { id: 'gambler', name: '赌神龟', emoji: '🃏🐢', img: '/turtle-dive-assets/赌神龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#c77dff' },
  { id: 'hunter', name: '猎人龟', emoji: '🏹🐢', img: '/turtle-dive-assets/猎人龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#06d6a0' },
  { id: 'pirate', name: '海盗龟', emoji: '🏴‍☠️🐢', img: '/turtle-dive-assets/海盗龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#6b6880' },
  { id: 'candy', name: '糖果龟', emoji: '🍬🐢', img: '/turtle-dive-assets/糖果龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#ff9f43' },
  { id: 'bubble', name: '气泡龟', emoji: '🫧🐢', img: '/turtle-dive-assets/气泡龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#4cc9f0' },
  { id: 'line', name: '线条龟', emoji: '✏️🐢', img: '/turtle-dive-assets/线条龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#78716c' },
  { id: 'lightning', name: '闪电龟', emoji: '⚡🐢', img: '/turtle-dive-assets/闪电龟.png', rarity: 'A', ability: 'none', abilityName: '无', glowColor: '#ffd93d' },
  { id: 'phoenix', name: '凤凰龟', emoji: '🔥🐢', img: '/turtle-dive-assets/凤凰龟.png', rarity: 'S', ability: 'shield', abilityName: '🛡️ 护盾×1', glowColor: '#ff6b6b' },
  { id: 'lava', name: '熔岩龟', emoji: '🌋🐢', img: '/turtle-dive-assets/熔岩龟.png', rarity: 'S', ability: 'shield', abilityName: '🛡️ 护盾×1', glowColor: '#ff6b6b' },
  { id: 'cyber', name: '赛博龟', emoji: '🤖🐢', img: '/turtle-dive-assets/赛博龟.png', rarity: 'S', ability: 'shield', abilityName: '🛡️ 护盾×1', glowColor: '#ffd93d' },
  { id: 'crystal', name: '水晶龟', emoji: '🔮🐢', img: '/turtle-dive-assets/水晶龟.png', rarity: 'S', ability: 'shield', abilityName: '🛡️ 护盾×1', glowColor: '#c77dff' },
  { id: 'chest', name: '宝箱龟', emoji: '📦🐢', img: '/turtle-dive-assets/宝箱龟.png', rarity: 'S', ability: 'shield', abilityName: '🛡️ 护盾×1', glowColor: '#ffd93d' },
  { id: 'space', name: '星际龟', emoji: '🚀🐢', img: '/turtle-dive-assets/星际龟.png', rarity: 'S', ability: 'shield', abilityName: '🛡️ 护盾×1', glowColor: '#c77dff' },
  { id: 'hiding', name: '缩头乌龟', emoji: '🫣🐢', img: '/turtle-dive-assets/缩头乌龟.png', rarity: 'SS', ability: 'shrink', abilityName: '🔬 缩小30%', glowColor: '#78716c' },
  { id: 'headless', name: '无头龟', emoji: '💀🐢', img: '/turtle-dive-assets/无头龟.png', rarity: 'SS', ability: 'shrink', abilityName: '🔬 缩小30%', glowColor: '#8b5cf6' },
  { id: 'shell', name: '龟壳', emoji: '🐚', img: '/turtle-dive-assets/龟壳.png', rarity: 'SSS', ability: 'shrink', abilityName: '🔬 缩小30%', glowColor: '#ff4444' },
];

const ALL_FRAMES: FrameDef[] = [
  { id: 'basic_frame', name: '基础框', emoji: '🟢', borderColor: '#06d6a0', trailColor: '#06d6a0' },
  { id: 'none', name: '无头像框', emoji: '❌', borderColor: null, trailColor: null },
  { id: 'lava_frame', name: '熔岩框', emoji: '🔥', borderColor: '#ff4500', trailColor: '#ff4500' },
  { id: 'dark_frame', name: '暗黑框', emoji: '🌑', borderColor: '#6b6880', trailColor: '#6b6880' },
  { id: 'moon_frame', name: '月牙框', emoji: '🌙', borderColor: '#ffd93d', trailColor: '#ffd93d' },
  { id: 'sakura_frame', name: '樱花框', emoji: '🌸', borderColor: '#ff9ff3', trailColor: '#ff9ff3' },
  { id: 'upset_frame', name: '爆冷框', emoji: '💥', borderColor: '#ff6b6b', trailColor: '#ff6b6b' },
  { id: 'galaxy_frame', name: '星河框', emoji: '⭐', borderColor: '#ffd93d', trailColor: '#ffd93d' },
  { id: 'phantom_frame', name: '幽冥框', emoji: '👻', borderColor: '#8b5cf6', trailColor: '#8b5cf6' },
  { id: 'aurora_frame', name: '极光框', emoji: '🌌', borderColor: '#06d6a0', trailColor: '#06d6a0' },
  { id: 'koi_frame', name: '锦鲤框', emoji: '🐟', borderColor: '#ff9f43', trailColor: '#ff9f43' },
];

const OBSTACLE_TYPES = [
  { emoji: '🪸', w: 50, h: 40 },
  { emoji: '🦈', w: 55, h: 35 },
  { emoji: '🪼', w: 40, h: 45 },
  { emoji: '⚓', w: 40, h: 50 },
  { emoji: '🧊', w: 55, h: 40 },
  { emoji: '🐙', w: 50, h: 45 },
  { emoji: '💣', w: 35, h: 35 },
  { emoji: '🌊', w: 60, h: 30 },
];

const DEFAULT_LB: LeaderboardEntry[] = [
  { name: 'LionMaster 🦁', score: 3280 },
  { name: 'DragonSeer 🐉', score: 2750 },
  { name: 'EagleEye 🦅', score: 2140 },
  { name: 'PandaPredict 🐼', score: 1620 },
  { name: 'CryptoWolf 🐺', score: 980 },
];

const INITIAL_HUD: HudState = {
  score: 0,
  depth: 0,
  speedMul: 1,
  maxSpeed: 1,
  shieldCount: 0,
  coinsGain: 2480,
};


function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function sameDayIso() {
  return new Date().toISOString().slice(0, 10);
}

function updateOwnedFromStorage(storage: PetStorageState | null) {
  let ownedPetIds = ['basic'];
  let activePetId = 'basic';
  let ownedFrameIds = ['basic_frame', 'none'];
  let activeFrameId: string | null = null;

  if (storage?.pets) {
    ownedPetIds = storage.pets.filter((pet) => pet.owned).map((pet) => pet.id);
    const equippedPet = storage.pets.find((pet) => pet.equipped);
    if (equippedPet?.id) activePetId = equippedPet.id;
  }

  if (storage?.frames) {
    ownedFrameIds = storage.frames.filter((frame) => frame.owned).map((frame) => frame.id);
    const equippedFrame = storage.frames.find((frame) => frame.equipped);
    if (equippedFrame?.id && equippedFrame.id !== 'none') activeFrameId = equippedFrame.id;
  }

  return { ownedPetIds, activePetId, ownedFrameIds, activeFrameId };
}

export const TurtleDivePixel: React.FC<{ onBack: () => void; mobileMode?: boolean }> = ({ onBack, mobileMode = false }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [activePetId, setActivePetId] = useState('basic');
  const [ownedPetIds, setOwnedPetIds] = useState<string[]>(['basic']);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(DEFAULT_LB);
  const [bonusText, setBonusText] = useState('');
  const [toastText, setToastText] = useState('');

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const toastTimerRef = useRef<number | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchXRef = useRef<number | null>(null);
  const petImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const emojiCacheRef = useRef<Record<string, HTMLCanvasElement>>({});

  const turtleRef = useRef({ x: 0, y: 120, w: 36, h: 36, vx: 0 });
  const obstaclesRef = useRef<RuntimeObstacle[]>([]);
  const bubblesRef = useRef<RuntimeBubble[]>([]);
  const trailRef = useRef<RuntimeTrail[]>([]);
  const laserRef = useRef<RuntimeLaser[]>([]);
  const depthRef = useRef(0);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const speedMulRef = useRef(1);
  const maxSpeedRef = useRef(1);
  const shieldRef = useRef(0);
  const coralWallRef = useRef(0);

  const activePet = useMemo(
    () => ALL_PETS.find((pet) => pet.id === activePetId) ?? ALL_PETS[0],
    [activePetId],
  );
  const activeFrame = useMemo(
    () => ALL_FRAMES.find((frame) => frame.id === activeFrameId) ?? null,
    [activeFrameId],
  );

  const activeInfo = useMemo(() => {
    const tags = [];
    if (activePet.ability !== 'none') tags.push({ type: 'ability', text: activePet.abilityName });
    if (activeFrame) tags.push({ type: 'frame', text: `${activeFrame.emoji} ${activeFrame.name}` });
    return tags;
  }, [activeFrame, activePet]);

  const pauseInfo = `得分: ${hud.score} · 深度: ${Math.floor(hud.depth)}m · 速度: ${hud.speedMul.toFixed(1)}x`;

  const showToast = (text: string) => {
    setToastText(text);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastText(''), 2000);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  };

  const getEmojiCanvas = (emoji: string, size: number) => {
    const key = `${emoji}|${size}`;
    const cached = emojiCacheRef.current[key];
    if (cached) return cached;
    const surface = document.createElement('canvas');
    const canvasSize = Math.ceil(size * 1.3);
    surface.width = canvasSize;
    surface.height = canvasSize;
    const ctx = surface.getContext('2d');
    if (ctx) {
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, canvasSize / 2, canvasSize / 2);
    }
    emojiCacheRef.current[key] = surface;
    return surface;
  };

  const renderLeaderboard = (score: number) =>
    leaderboard.map((entry, index) => ({
      ...entry,
      score: entry.name.startsWith('你') ? score : entry.score,
      rankClass: index === 0 ? 'r1' : index === 1 ? 'r2' : index === 2 ? 'r3' : '',
    }));

  const resetRuntime = () => {
    const canvas = canvasRef.current;
    const width = canvas?.width ?? 900;
    const hitSize = activePet.ability === 'shrink' ? Math.round(36 * 0.7) : 36;

    turtleRef.current = { x: width / 2, y: 120, w: hitSize, h: hitSize, vx: 0 };
    obstaclesRef.current = [];
    bubblesRef.current = [];
    trailRef.current = [];
    laserRef.current = [];
    depthRef.current = 0;
    scoreRef.current = 0;
    frameCountRef.current = 0;
    speedMulRef.current = 1;
    maxSpeedRef.current = 1;
    shieldRef.current = activePet.ability === 'shield' ? 1 : 0;
    coralWallRef.current = 0;

    setHud((prev) => ({
      ...prev,
      score: 0,
      depth: 0,
      speedMul: 1,
      maxSpeed: 1,
      shieldCount: shieldRef.current,
    }));
  };

  const saveBest = (score: number) => {
    const best = Number(localStorage.getItem(BEST_KEY) ?? '0');
    if (score > best) localStorage.setItem(BEST_KEY, String(score));
  };

  const finishGame = () => {
    const score = scoreRef.current;
    const firstGameToday = localStorage.getItem(LAST_DAY_KEY) !== sameDayIso();
    localStorage.setItem(LAST_DAY_KEY, sameDayIso());

    const reward = firstGameToday ? Math.floor(score / DAILY_BONUS_DIVISOR) : 0;
    saveBest(score);

    const nextCoins = firstGameToday ? hud.coinsGain + reward : hud.coinsGain;
    setHud((prev) => ({
      ...prev,
      score,
      depth: depthRef.current,
      speedMul: speedMulRef.current,
      maxSpeed: maxSpeedRef.current,
      coinsGain: nextCoins,
      shieldCount: shieldRef.current,
    }));

    setBonusText(firstGameToday ? '🎁 今日首局龟币奖励已发放！' : '每天第一局可获得龟币奖励，明天再来吧！');
    setPhase('gameover');

    const updated = [...leaderboard, { name: '你 🦊', score }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const frameCount = frameCountRef.current;
    const turtle = turtleRef.current;
    const depth = depthRef.current;
    const depthRatio = Math.min(depth / 500, 1);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(${6 - depthRatio * 6}, ${30 - depthRatio * 20}, ${60 - depthRatio * 40}, 1)`);
    gradient.addColorStop(1, `rgba(3, ${12 - depthRatio * 8}, ${30 - depthRatio * 18}, 1)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.03 - depthRatio * 0.02;
    for (let i = 0; i < 5; i += 1) {
      const rayX = width * 0.15 + i * width * 0.18;
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.moveTo(rayX - 15, 0);
      ctx.lineTo(rayX + 15, 0);
      ctx.lineTo(rayX + 40 + Math.sin(frameCount * 0.01 + i) * 20, height);
      ctx.lineTo(rayX - 40 + Math.sin(frameCount * 0.01 + i) * 20, height);
      ctx.fill();
    }
    ctx.restore();

    bubblesRef.current.forEach((bubble) => {
      ctx.globalAlpha = bubble.alpha;
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const coralWallWidth = coralWallRef.current;
    if (coralWallWidth > 2) {
      ctx.fillStyle = 'rgba(255,80,80,.25)';
      ctx.fillRect(0, 0, coralWallWidth, height);
      ctx.fillRect(width - coralWallWidth, 0, coralWallWidth, height);
      ctx.fillStyle = 'rgba(255,80,80,.5)';
      ctx.fillRect(coralWallWidth - 2, 0, 2, height);
      ctx.fillRect(width - coralWallWidth, 0, 2, height);

      if (coralWallWidth > 15) {
        ctx.globalAlpha = 0.5;
        const coralEmojis = ['🪸', '🌿', '🪨'];
        const spacing = 60;
        const offsetY = (depth * 2) % spacing;
        for (let y = -spacing + offsetY; y < height + spacing; y += spacing) {
          const leftEmoji = getEmojiCanvas(coralEmojis[Math.abs(Math.floor(y / spacing)) % coralEmojis.length], 16);
          const rightEmoji = getEmojiCanvas(coralEmojis[(Math.abs(Math.floor(y / spacing)) + 1) % coralEmojis.length], 16);
          ctx.drawImage(leftEmoji, coralWallWidth / 2 - leftEmoji.width / 2, y - leftEmoji.height / 2);
          ctx.drawImage(rightEmoji, width - coralWallWidth / 2 - rightEmoji.width / 2, y - rightEmoji.height / 2);
        }
        ctx.globalAlpha = 1;
      }
    }

    laserRef.current.forEach((beam) => {
      if (beam.phase === 'warn') {
        let alpha = 0.04;
        if (
          (beam.warn > 45 && beam.warn <= 60) ||
          (beam.warn > 15 && beam.warn <= 30)
        ) {
          alpha = 0.15;
        }
        ctx.fillStyle = `rgba(255,60,60,${alpha})`;
        ctx.fillRect(beam.x - beam.w / 2, 0, beam.w, height);
        ctx.fillStyle = `rgba(255,60,60,${alpha + 0.1})`;
        ctx.fillRect(beam.x - beam.w / 2, 0, 2, height);
        ctx.fillRect(beam.x + beam.w / 2 - 2, 0, 2, height);
      } else {
        ctx.fillStyle = 'rgba(255,60,60,.55)';
        ctx.fillRect(beam.x - beam.w / 2, 0, beam.w, height);
        ctx.fillStyle = 'rgba(255,255,200,.6)';
        ctx.fillRect(beam.x - 1.5, 0, 3, height);
      }
    });

    obstaclesRef.current.forEach((obstacle) => {
      const obstacleCanvas = getEmojiCanvas(obstacle.emoji, Math.floor(Math.max(obstacle.w, obstacle.h) * 0.7));
      ctx.drawImage(obstacleCanvas, obstacle.x - obstacleCanvas.width / 2, obstacle.y - obstacleCanvas.height / 2);
    });

    trailRef.current.forEach((trail) => {
      ctx.globalAlpha = trail.life * 0.6;
      ctx.fillStyle = trail.color;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.r * trail.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (shieldRef.current > 0) {
      ctx.save();
      ctx.translate(turtle.x, turtle.y);
      ctx.strokeStyle = `rgba(76,201,240,${0.2 + Math.sin(frameCount * 0.1) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, turtle.w * 0.7 + Math.sin(frameCount * 0.08) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(turtle.x, turtle.y);
    ctx.rotate(turtle.vx * 0.02);
    ctx.shadowColor = activePet.glowColor;
    ctx.shadowBlur = 16;
    const drawSize = activePet.ability === 'shrink' ? 28 : 40;
    const wobble = Math.sin(frameCount * 0.15) * 3;
    const petImg = petImagesRef.current[activePet.id];
    if (petImg?.complete && petImg.naturalWidth > 0) {
      ctx.drawImage(petImg, -drawSize / 2, -drawSize / 2 + wobble, drawSize, drawSize);
    } else {
      ctx.font = `${activePet.ability === 'shrink' ? 22 : 32}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(activePet.emoji, 0, wobble);
    }
    ctx.shadowBlur = 0;
    if (activeFrame?.borderColor) {
      ctx.globalAlpha = 0.35 + Math.sin(frameCount * 0.08) * 0.15;
      ctx.strokeStyle = activeFrame.borderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, drawSize * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (Math.floor(depth) % 50 < 2) {
      ctx.fillStyle = 'rgba(76,201,240,.15)';
      ctx.font = '11px Fredoka';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(depth)}m`, width - 12, height - 12);
    }
  };

  useEffect(() => {
    const storage = readJson<PetStorageState | null>(PET_STATE_KEY, null);
    const loaded = updateOwnedFromStorage(storage);
    setOwnedPetIds(loaded.ownedPetIds);
    setActivePetId(loaded.activePetId);
    setActiveFrameId(loaded.activeFrameId);
    setLeaderboard(readJson<LeaderboardEntry[]>(LEADERBOARD_KEY, DEFAULT_LB));
  }, []);

  useEffect(() => {
    const imageMap: Record<string, HTMLImageElement> = {};
    ALL_PETS.forEach((pet) => {
      const image = new Image();
      image.src = pet.img;
      imageMap[pet.id] = image;
    });
    petImagesRef.current = imageMap;
  }, []);

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        if (phase === 'playing') {
          setPhase('paused');
          return;
        }
        if (phase === 'paused') {
          setPhase('playing');
          return;
        }
      }
      keysRef.current[event.key] = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key] = false;
    };
    const canvas = canvasRef.current;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 0) touchXRef.current = event.touches[0].clientX;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchXRef.current == null || phase !== 'playing') return;
      const turtle = turtleRef.current;
      turtle.vx = (event.touches[0].clientX - touchXRef.current) * 0.15;
      touchXRef.current = event.touches[0].clientX;
    };
    const onTouchEnd = () => {
      touchXRef.current = null;
      turtleRef.current.vx = 0;
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas?.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas?.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas?.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      canvas?.removeEventListener('touchstart', onTouchStart);
      canvas?.removeEventListener('touchmove', onTouchMove);
      canvas?.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(rafRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      const turtle = turtleRef.current;

      frameCountRef.current += 1;
      const frameCount = frameCountRef.current;

      speedMulRef.current = 1 + depthRef.current / 3000;
      maxSpeedRef.current = Math.max(maxSpeedRef.current, speedMulRef.current);
      const baseSpeed = 1 + speedMulRef.current * 0.4;

      const moveSpeed = 2.5 + speedMulRef.current * 0.25;
      if (keysRef.current.ArrowLeft || keysRef.current.a || keysRef.current.A) {
        turtle.vx += (-moveSpeed - turtle.vx) * 0.15;
      } else if (keysRef.current.ArrowRight || keysRef.current.d || keysRef.current.D) {
        turtle.vx += (moveSpeed - turtle.vx) * 0.15;
      } else if (touchXRef.current == null) {
        turtle.vx *= 0.9;
      }

      turtle.x += turtle.vx;
      turtle.x = Math.max(turtle.w / 2, Math.min(width - turtle.w / 2, turtle.x));

      depthRef.current += baseSpeed * 0.15;
      scoreRef.current = Math.floor(depthRef.current * 2);

      const spawnRate = Math.max(40, 80 - Math.floor(speedMulRef.current * 4));
      if (frameCount % spawnRate === 0) {
        const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        const cols = Math.max(1, Math.floor(speedMulRef.current / 3));
        for (let i = 0; i < 1 + Math.floor(Math.random() * cols); i += 1) {
          const minX = 30 + coralWallRef.current;
          const maxX = width - 30 - coralWallRef.current;
          obstaclesRef.current.push({
            x: minX + Math.random() * (maxX - minX),
            y: height + 20 + i * 80,
            w: type.w,
            h: type.h,
            emoji: type.emoji,
            speed: baseSpeed * (0.6 + Math.random() * 0.35),
          });
        }
      }

      if (scoreRef.current >= 3000) {
        const laserRate = Math.max(210, 480 - Math.floor((scoreRef.current - 3000) / 120));
        const maxLasers = Math.min(3, 1 + Math.floor((scoreRef.current - 3000) / 5000));
        if (frameCount % laserRate === 0 && laserRef.current.length < maxLasers) {
          const toSpawn = maxLasers - laserRef.current.length;
          for (let i = 0; i < toSpawn; i += 1) {
            const beamWidth = 50 + Math.random() * 40 + Math.min((scoreRef.current - 3000) / 200, 30);
            const safeLeft = coralWallRef.current + beamWidth / 2 + 10;
            const safeRight = width - coralWallRef.current - beamWidth / 2 - 10;
            if (safeRight <= safeLeft) continue;
            laserRef.current.push({
              x: safeLeft + Math.random() * (safeRight - safeLeft),
              w: beamWidth,
              warn: 250,
              active: 50,
              phase: 'warn',
            });
          }
        }
      }

      for (let i = laserRef.current.length - 1; i >= 0; i -= 1) {
        const beam = laserRef.current[i];
        if (beam.phase === 'warn') {
          beam.warn -= 1;
          if (beam.warn <= 0) beam.phase = 'active';
        } else {
          beam.active -= 1;
          if (beam.active <= 0) laserRef.current.splice(i, 1);
        }
      }

      if (scoreRef.current >= 6000) {
        const maxWall = (width * 3) / 10;
        const progress = Math.min(1, (scoreRef.current - 6000) / 11000);
        const targetWall = 15 + progress * (maxWall - 15);
        coralWallRef.current += (targetWall - coralWallRef.current) * 0.008;
      } else {
        coralWallRef.current *= 0.98;
      }

      if (frameCount % 8 === 0) {
        bubblesRef.current.push({
          x: Math.random() * width,
          y: height + 10,
          r: 1 + Math.random() * 3,
          speed: 1 + Math.random() * 2,
          alpha: 0.15 + Math.random() * 0.2,
        });
      }

      for (let i = obstaclesRef.current.length - 1; i >= 0; i -= 1) {
        obstaclesRef.current[i].y -= obstaclesRef.current[i].speed;
        if (obstaclesRef.current[i].y < -60) obstaclesRef.current.splice(i, 1);
      }

      for (let i = bubblesRef.current.length - 1; i >= 0; i -= 1) {
        bubblesRef.current[i].y -= bubblesRef.current[i].speed;
        bubblesRef.current[i].x += Math.sin(bubblesRef.current[i].y * 0.02) * 0.3;
        if (bubblesRef.current[i].y < -10) bubblesRef.current.splice(i, 1);
      }

      if (activeFrame?.trailColor && frameCount % 3 === 0) {
        const color = activeFrame.trailColor === 'rainbow'
          ? `hsl(${(frameCount * 3) % 360},80%,65%)`
          : activeFrame.trailColor;
        trailRef.current.push({
          x: turtle.x + (Math.random() - 0.5) * 10,
          y: turtle.y + 16,
          r: 2 + Math.random() * 2,
          life: 1,
          color,
          dy: 0.5 + Math.random(),
        });
      }

      for (let i = trailRef.current.length - 1; i >= 0; i -= 1) {
        const particle = trailRef.current[i];
        particle.y += particle.dy;
        particle.x += (Math.random() - 0.5) * 0.5;
        particle.life -= 0.025;
        if (particle.life <= 0) trailRef.current.splice(i, 1);
      }

      const hitRadius = turtle.w * 0.4;
      for (let i = obstaclesRef.current.length - 1; i >= 0; i -= 1) {
        const obstacle = obstaclesRef.current[i];
        const clampX = Math.max(obstacle.x - obstacle.w / 2, Math.min(turtle.x, obstacle.x + obstacle.w / 2));
        const clampY = Math.max(obstacle.y - obstacle.h / 2, Math.min(turtle.y, obstacle.y + obstacle.h / 2));
        const distance = Math.sqrt((turtle.x - clampX) ** 2 + (turtle.y - clampY) ** 2);
        if (distance < hitRadius) {
          if (shieldRef.current > 0) {
            shieldRef.current -= 1;
            obstaclesRef.current.splice(i, 1);
            showToast(`🛡️ 护盾抵消！剩余 ${shieldRef.current}`);
            break;
          }
          finishGame();
          return;
        }
      }

      for (let i = 0; i < laserRef.current.length; i += 1) {
        const beam = laserRef.current[i];
        if (beam.phase !== 'active') continue;
        if (turtle.x > beam.x - beam.w / 2 && turtle.x < beam.x + beam.w / 2) {
          if (shieldRef.current > 0) {
            shieldRef.current -= 1;
            laserRef.current.splice(i, 1);
            showToast(`🛡️ 护盾抵消激光！剩余 ${shieldRef.current}`);
            break;
          }
          finishGame();
          return;
        }
      }

      if (coralWallRef.current > 5) {
        turtle.x = Math.max(coralWallRef.current + turtle.w / 2, Math.min(width - coralWallRef.current - turtle.w / 2, turtle.x));
      }

      if (Math.floor(depthRef.current) % 100 === 0 && Math.floor(depthRef.current) > 0 && frameCount % 60 < 2) {
        showToast(`🌊 ${Math.floor(depthRef.current)}m! 速度 ${speedMulRef.current.toFixed(1)}x`);
      }
      if (scoreRef.current >= 3000 && scoreRef.current < 3020 && frameCount % 60 < 2) showToast('⚡ 激光来袭！注意预警区域！');
      if (scoreRef.current >= 6000 && scoreRef.current < 6020 && frameCount % 60 < 2) showToast('🪸 珊瑚墙逼近！通道变窄！');

      setHud((prev) => ({
        ...prev,
        score: scoreRef.current,
        depth: depthRef.current,
        speedMul: speedMulRef.current,
        maxSpeed: maxSpeedRef.current,
        shieldCount: shieldRef.current,
      }));

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeFrame, activePet, draw, phase]); 

  const startGame = () => {
    resetRuntime();
    setBonusText('');
    setPhase('playing');
  };

  const backToSelect = () => {
    setPhase('idle');
    setBonusText('');
  };

  const togglePause = () => {
    setPhase((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  };

  const quitGame = () => {
    setPhase('idle');
    setBonusText('');
    setHud((prev) => ({ ...prev, score: 0, depth: 0, speedMul: 1, maxSpeed: 1, shieldCount: 0 }));
  };

  return (
    <div className={css(`ttd-root ${mobileMode ? 'ttd-root-mobile' : ''}`)}>

      <div className={css("ttd-nav")}>
        <button className={css("ttd-nav-back")} onClick={onBack}>← 返回龟投</button>
        <div className={css("ttd-nav-title")}>🐢 龟龟跳海</div>
        <div className={css("ttd-nav-coins")}>🪙 {hud.coinsGain.toLocaleString('zh-CN')}</div>
      </div>

      <div className={css("ttd-game-wrap")} ref={wrapRef}>
        <canvas className={css("ttd-canvas")} ref={canvasRef} />

        {phase === 'playing' && (
          <button className={css("ttd-pause-btn")} onClick={togglePause}>⏸ 暂停</button>
        )}

        <div className={css(`ttd-pause-overlay ${phase === 'paused' ? 'show' : ''}`)}>
          <div className={css("ttd-pause-title")}>⏸ 已暂停</div>
          <div className={css("ttd-pause-info")}>{pauseInfo}</div>
          <div className={css("ttd-pause-btns")}>
            <button className={css("ttd-resume")} onClick={togglePause}>▶ 继续</button>
            <button className={css("ttd-quit")} onClick={quitGame}>🚪 退出</button>
          </div>
        </div>

        {phase === 'playing' && (
          <div className={css("ttd-hud")}>
            <div className={css("ttd-hud-item")}>
              <div className={css("ttd-hud-label")}>得分</div>
              <div className={css("ttd-hud-val score")}>{hud.score}</div>
            </div>
            <div className={css("ttd-hud-item")}>
              <div className={css("ttd-hud-label")}>深度</div>
              <div className={css("ttd-hud-val depth")}>{Math.floor(hud.depth)}m</div>
            </div>
            <div className={css("ttd-hud-item")}>
              <div className={css("ttd-hud-label")}>速度</div>
              <div className={css("ttd-hud-val speed")}>{hud.speedMul.toFixed(1)}x</div>
            </div>
            {hud.shieldCount > 0 && (
              <div className={css("ttd-hud-item")}>
                <div className={css("ttd-hud-label")}>护盾</div>
                <div className={css("ttd-hud-val ttd-hud-shield")}>{'🛡️'.repeat(hud.shieldCount)}</div>
              </div>
            )}
          </div>
        )}

        <div className={css("ttd-lb")}>
          <div className={css("ttd-lb-title")}>🏆 排行榜</div>
          {renderLeaderboard(hud.score).slice(0, 6).map((entry, index) => (
            <div className={css("ttd-lb-row")} key={`${entry.name}-${index}`}>
              <div className={css(`ttd-lb-rank ${entry.rankClass}`)}>{index + 1}</div>
              <div className={css(`ttd-lb-name ${entry.name.startsWith('你') ? 'me' : ''}`)}>{entry.name}</div>
              <div className={css("ttd-lb-score")}>{entry.score.toLocaleString('zh-CN')}</div>
            </div>
          ))}
        </div>

        <div className={css(`ttd-overlay ${phase === 'idle' ? '' : 'hidden'}`)}>
          <div className={css("ttd-go-icon")}>
            <img src={activePet.img} alt={activePet.name} />
          </div>
          <div className={css("ttd-go-title")}>龟龟跳海</div>
          <div className={css("ttd-go-sub")}>
            小龟龟正在跳入深海！
            <br />
            左右躲避障碍物，越深分越高
            <br />
            速度会越来越快，你能坚持多久？
          </div>

          <div className={css("ttd-skin-section")}>
            <div className={css("ttd-skin-section-title")}>选择宠物</div>
            <div className={css("ttd-skin-bar")}>
              {ALL_PETS.map((pet) => {
                const owned = ownedPetIds.includes(pet.id);
                return (
                  <div
                    key={pet.id}
                    className={css(`ttd-skin-slot ${activePet.id === pet.id ? 'on' : ''} ${owned ? '' : 'locked'}`)}
                    onClick={() => owned && setActivePetId(pet.id)}
                  >
                    <div className={css("ttd-skin-emoji")}>
                      <img src={pet.img} alt={pet.name} />
                    </div>
                    <div className={css("ttd-skin-name")}>{pet.name}</div>
                    <div className={css("ttd-skin-ability")}>{pet.ability !== 'none' ? pet.abilityName : pet.rarity}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={css("ttd-active-skin")}>
            {activePet.name}
            {activeInfo.map((tag) => (
              <span key={`${tag.type}-${tag.text}`} className={css(`ttd-tag ${tag.type}`)}>
                {tag.text}
              </span>
            ))}
          </div>

          <button className={css("ttd-go-btn")} onClick={startGame}>开始跳海!</button>
          <div className={css("ttd-go-hint")}>← → 或 A/D 移动 · 触屏左右滑动 · `P`/`Esc` 暂停</div>
        </div>

        <div className={css(`ttd-overlay ${phase === 'gameover' ? '' : 'hidden'}`)}>
          <div className={css("ttd-go-icon")}>💀</div>
          <div className={css("ttd-go-title")}>撞上了!</div>
          <div className={css("ttd-go-stats")}>
            <div className={css("ttd-go-stat")}>
              <div className={css("ttd-go-stat-val")}>{hud.score.toLocaleString('zh-CN')}</div>
              <div className={css("ttd-go-stat-label")}>得分</div>
            </div>
            <div className={css("ttd-go-stat")}>
              <div className={css("ttd-go-stat-val")}>{Math.floor(hud.depth)}m</div>
              <div className={css("ttd-go-stat-label")}>深度</div>
            </div>
            <div className={css("ttd-go-stat")}>
              <div className={css("ttd-go-stat-val")}>{hud.maxSpeed.toFixed(1)}x</div>
              <div className={css("ttd-go-stat-label")}>最大速度</div>
            </div>
          </div>
          <div className={css("ttd-go-reward")}>
            {bonusText.includes('已发放') ? `🪙 +${Math.floor(hud.score / DAILY_BONUS_DIVISOR)} 龟币已入账` : '今日龟币已领取'}
          </div>
          {bonusText ? <div className={css("ttd-go-reward ttd-go-bonus")}>{bonusText}</div> : null}
          <button className={css("ttd-go-btn")} onClick={startGame}>再来一次!</button>
          <button className={css("ttd-go-btn")} onClick={backToSelect} style={{ padding: '10px 28px', fontSize: 15 }}>
            返回选择
          </button>
        </div>
      </div>

      <div className={css(`ttd-toast ${toastText ? 'show' : ''}`)}>{toastText}</div>
    </div>
  );
};
