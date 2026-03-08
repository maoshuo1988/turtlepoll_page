import React, { useReducer, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */
const CW = 400; // canvas width
const CH = 700; // canvas height
const VY = 2.5;   // constant vertical fall speed
const VX_INIT = 3; // horizontal speed magnitude
const TURTLE_R = 14; // turtle collision radius
const POOL_SIZE = 60;
const COMBO_TARGET = 5;
const COMBO_DURATION = 120; // 2s at 60fps
const COMBO_MAGNET = 50; // px attract radius
const DAILY_COIN_CAP = 200;

const card = 'rounded-xl border border-slate-200 bg-white/95 dark:border-white/10 dark:bg-[#0c1a28]';

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */
type Phase = 'START' | 'PLAYING' | 'GAMEOVER';
type ObKind = 'spike_l' | 'spike_r' | 'jelly' | 'coin';

interface Ob {
  active: boolean;
  kind: ObKind;
  x: number; y: number; w: number; h: number;
}

interface GameState {
  phase: Phase;
  depth: number;
  score: number;
  coins: number;
  combo: number;      // consecutive safe jumps with coin
  comboTimer: number;  // frames left of combo rush
  frameCount: number;
  vx: number;
  sessionId: string;
  startTime: number;
  shakeTimer: number;
}

type Action =
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'FLIP' }
  | { type: 'COIN' }
  | { type: 'COMBO_TICK' }
  | { type: 'GAMEOVER' }
  | { type: 'SHAKE' };

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mockSign(score: number, sid: string, dur: number): string {
  const raw = `${score}:${sid}:${dur}:turtle_dash_2026`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

const init: GameState = {
  phase: 'START', depth: 0, score: 0, coins: 0,
  combo: 0, comboTimer: 0, frameCount: 0,
  vx: VX_INIT, sessionId: '', startTime: 0, shakeTimer: 0,
};

function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'START':
      return { ...init, phase: 'PLAYING', vx: VX_INIT, sessionId: genId(), startTime: Date.now() };
    case 'TICK': {
      if (s.phase !== 'PLAYING') return s;
      const fc = s.frameCount + 1;
      const nd = s.depth + VY;
      const ns = Math.floor(nd / 10);
      return {
        ...s, frameCount: fc, depth: nd, score: ns,
        comboTimer: Math.max(0, s.comboTimer - 1),
        shakeTimer: Math.max(0, s.shakeTimer - 1),
      };
    }
    case 'FLIP':
      return s.phase === 'PLAYING' ? { ...s, vx: -s.vx } : s;
    case 'COIN': {
      const nc = Math.min(s.coins + 1, DAILY_COIN_CAP);
      const newCombo = s.combo + 1;
      if (newCombo >= COMBO_TARGET) {
        return { ...s, coins: nc, combo: 0, comboTimer: COMBO_DURATION };
      }
      return { ...s, coins: nc, combo: newCombo };
    }
    case 'GAMEOVER':
      return { ...s, phase: 'GAMEOVER' };
    case 'SHAKE':
      return { ...s, shakeTimer: 15 };
    default:
      return s;
  }
}

/* ═══════════════════════════════════════
   Object Pool
   ═══════════════════════════════════════ */
function createPool(): Ob[] {
  return Array.from({ length: POOL_SIZE }, () => ({
    active: false, kind: 'spike_l' as ObKind, x: 0, y: 0, w: 0, h: 0,
  }));
}

function spawn(pool: Ob[], kind: ObKind, x: number, y: number, w: number, h: number) {
  const slot = pool.find((o) => !o.active);
  if (!slot) return;
  slot.active = true; slot.kind = kind;
  slot.x = x; slot.y = y; slot.w = w; slot.h = h;
}

/* ═══════════════════════════════════════
   Draw helpers
   ═══════════════════════════════════════ */
function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number, depth: number) {
  const t = Math.min(depth / 8000, 1);
  const r1 = Math.round(100 - 85 * t), g1 = Math.round(180 - 160 * t), b1 = Math.round(230 - 180 * t);
  const r2 = Math.round(15 - 10 * t), g2 = Math.round(30 - 20 * t), b2 = Math.round(80 - 50 * t);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // ambient bubbles
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 15; i++) {
    const bx = (i * 97.3 + depth * 0.2) % w;
    const by = h - ((depth * (0.6 + i * 0.08) + i * 60) % (h + 30));
    ctx.beginPath(); ctx.arc(bx, by, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}

function drawTurtle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  vx: number, combo: boolean, hurt: boolean, frame: number,
) {
  ctx.save();
  ctx.translate(x, y);

  // combo glow
  if (combo) {
    ctx.beginPath();
    ctx.arc(0, 0, TURTLE_R + 8 + Math.sin(frame * 0.2) * 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // facing direction
  ctx.save();
  if (vx < 0) ctx.scale(-1, 1);
  ctx.font = `${TURTLE_R * 2}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (hurt) {
    ctx.fillText('💥', 0, 0);
  } else {
    const bob = Math.sin(frame * 0.12) * 2;
    ctx.translate(0, bob);
    ctx.fillText('🐢', 0, 0);
  }
  ctx.restore();

  ctx.restore();
}

function drawSpike(ctx: CanvasRenderingContext2D, o: Ob) {
  ctx.fillStyle = '#3a3a5c';
  ctx.strokeStyle = '#5a5a8c';
  ctx.lineWidth = 1;
  const { x, y, w, h } = o;
  if (o.kind === 'spike_l') {
    // triangles pointing right from left wall
    const teeth = Math.floor(h / 20);
    for (let i = 0; i < teeth; i++) {
      const ty = y + i * 20;
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty + 10);
      ctx.lineTo(x, ty + 20);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  } else {
    // triangles pointing left from right wall
    const teeth = Math.floor(h / 20);
    for (let i = 0; i < teeth; i++) {
      const ty = y + i * 20;
      ctx.beginPath();
      ctx.moveTo(x + w, ty);
      ctx.lineTo(x, ty + 10);
      ctx.lineTo(x + w, ty + 20);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }
}

function drawJelly(ctx: CanvasRenderingContext2D, o: Ob, frame: number) {
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const pulse = 1 + Math.sin(frame * 0.08) * 0.08;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, 1 / pulse);
  ctx.font = `${o.w}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🪼', 0, 0);
  ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D, o: Ob, frame: number) {
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const glow = 0.3 + Math.sin(frame * 0.1) * 0.15;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, o.w * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,215,0,${glow})`;
  ctx.fill();
  ctx.font = `${o.w}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🪙', cx, cy);
  ctx.restore();
}

/* ═══════════════════════════════════════
   Float text (score popups)
   ═══════════════════════════════════════ */
interface FloatText { x: number; y: number; text: string; life: number; }

function drawFloat(ctx: CanvasRenderingContext2D, f: FloatText) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, f.life / 12);
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeText(f.text, f.x, f.y);
  ctx.fillText(f.text, f.x, f.y);
  ctx.restore();
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */
export const Lab: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [state, dispatch] = useReducer(reducer, init);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<Ob[]>(createPool());
  const turtleRef = useRef({ x: CW / 2, y: 120 });
  const floatsRef = useRef<FloatText[]>([]);
  const rafRef = useRef(0);
  const stateRef = useRef(state);
  const spawnAccRef = useRef(0);
  const cwRef = useRef(CW);
  const lastFlipDepthRef = useRef(0);
  const flipCoinRef = useRef(false); // did we collect a coin since last flip?

  stateRef.current = state;

  // Resize
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.clientWidth, CW);
        cwRef.current = w;
        if (canvasRef.current) {
          canvasRef.current.width = w;
          canvasRef.current.height = CH;
        }
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Input: space / touch = flip direction
  const flip = useCallback(() => {
    if (stateRef.current.phase === 'START') {
      dispatch({ type: 'START' });
      return;
    }
    if (stateRef.current.phase === 'PLAYING') {
      dispatch({ type: 'FLIP' });
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); flip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip]);

  const handleTap = useCallback(() => flip(), [flip]);

  // Game loop
  useEffect(() => {
    if (state.phase !== 'PLAYING') return;

    const pool = poolRef.current;
    const turtle = turtleRef.current;
    turtle.x = cwRef.current / 2;
    turtle.y = 120;
    pool.forEach((o) => (o.active = false));
    floatsRef.current = [];
    spawnAccRef.current = 0;
    lastFlipDepthRef.current = 0;
    flipCoinRef.current = false;

    // Camera: turtle stays at y=120, world scrolls up via depth offset
    let scrollY = 0;

    const loop = () => {
      const s = stateRef.current;
      if (s.phase !== 'PLAYING') return;
      const cw = cwRef.current;

      dispatch({ type: 'TICK' });

      // Difficulty ramp
      const speedMult = 1 + s.frameCount * 0.00015;
      const vy = VY * speedMult;
      const vxMag = Math.abs(s.vx) * speedMult;
      const vxDir = s.vx > 0 ? 1 : -1;

      // Move turtle
      turtle.x += vxDir * vxMag;
      scrollY += vy;

      // Wall bounce (auto flip if hitting edges)
      if (turtle.x < TURTLE_R + 5) {
        turtle.x = TURTLE_R + 5;
        if (s.vx < 0) dispatch({ type: 'FLIP' });
      }
      if (turtle.x > cw - TURTLE_R - 5) {
        turtle.x = cw - TURTLE_R - 5;
        if (s.vx > 0) dispatch({ type: 'FLIP' });
      }

      // Spawn obstacles
      spawnAccRef.current += vy;
      const spawnGap = Math.max(90, 200 - s.frameCount * 0.025);

      while (spawnAccRef.current >= spawnGap) {
        spawnAccRef.current -= spawnGap;
        const worldY = scrollY + CH + 20;
        const r = Math.random();

        if (r < 0.3) {
          // Left spike
          const sw = 30 + Math.random() * 40;
          const sh = 40 + Math.random() * 60;
          spawn(pool, 'spike_l', 0, worldY, sw, sh);
        } else if (r < 0.6) {
          // Right spike
          const sw = 30 + Math.random() * 40;
          const sh = 40 + Math.random() * 60;
          spawn(pool, 'spike_r', cw - sw, worldY, sw, sh);
        } else if (r < 0.82) {
          // Jellyfish in center
          const jx = 60 + Math.random() * (cw - 120);
          spawn(pool, 'jelly', jx - 15, worldY, 30, 30);
        } else {
          // Coin
          const cx = 40 + Math.random() * (cw - 80);
          spawn(pool, 'coin', cx - 12, worldY, 24, 24);
        }
      }

      // Collision detection
      const tx = turtle.x;
      const ty = turtle.y;
      const isCombo = s.comboTimer > 0;

      for (const o of pool) {
        if (!o.active) continue;
        // Convert world Y to screen Y
        const screenY = o.y - scrollY;
        if (screenY > CH + 60 || screenY < -80) {
          if (screenY < -80) o.active = false;
          continue;
        }

        const isHazard = o.kind === 'spike_l' || o.kind === 'spike_r' || o.kind === 'jelly';

        // AABB vs circle collision
        const closestX = Math.max(o.x, Math.min(tx, o.x + o.w));
        const closestY = Math.max(screenY, Math.min(ty, screenY + o.h));
        const dx = tx - closestX;
        const dy = ty - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Combo magnet for coins
        if (o.kind === 'coin' && isCombo && dist < COMBO_MAGNET) {
          // attract
          o.x += (tx - (o.x + o.w / 2)) * 0.15;
          o.y += ((ty + scrollY) - (o.y + o.h / 2)) * 0.15;
        }

        if (dist < TURTLE_R) {
          if (isHazard) {
            if (isCombo) {
              // combo invincible — destroy
              o.active = false;
              floatsRef.current.push({ x: closestX, y: screenY, text: '💥', life: 30 });
            } else {
              dispatch({ type: 'SHAKE' });
              setTimeout(() => dispatch({ type: 'GAMEOVER' }), 250);
              return;
            }
          } else if (o.kind === 'coin') {
            o.active = false;
            dispatch({ type: 'COIN' });
            flipCoinRef.current = true;
            floatsRef.current.push({ x: tx, y: ty - 20, text: '+1 🪙', life: 35 });
          }
        }
      }

      // Update floats
      floatsRef.current = floatsRef.current
        .map((f) => ({ ...f, y: f.y - 1.5, life: f.life - 1 }))
        .filter((f) => f.life > 0);

      // Draw
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      ctx.save();
      if (s.shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      }

      drawBg(ctx, cw, CH, s.depth);

      // Draw canyon walls (subtle gradient edges)
      const wallGrad = ctx.createLinearGradient(0, 0, 30, 0);
      wallGrad.addColorStop(0, 'rgba(20,20,50,0.4)');
      wallGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, 30, CH);
      const wallGrad2 = ctx.createLinearGradient(cw, 0, cw - 30, 0);
      wallGrad2.addColorStop(0, 'rgba(20,20,50,0.4)');
      wallGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = wallGrad2;
      ctx.fillRect(cw - 30, 0, 30, CH);

      // Draw objects
      for (const o of pool) {
        if (!o.active) continue;
        const sy = o.y - scrollY;
        if (sy > CH + 40 || sy < -60) continue;
        const screenOb = { ...o, y: sy };
        if (o.kind === 'spike_l' || o.kind === 'spike_r') drawSpike(ctx, screenOb);
        else if (o.kind === 'jelly') drawJelly(ctx, screenOb, s.frameCount);
        else if (o.kind === 'coin') drawCoin(ctx, screenOb, s.frameCount);
      }

      // Draw turtle
      drawTurtle(ctx, tx, ty, s.vx, isCombo, s.shakeTimer > 0, s.frameCount);

      // Draw floats
      for (const f of floatsRef.current) drawFloat(ctx, f);

      // HUD
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'left';
      ctx.fillText(`🌊 ${Math.floor(s.depth / 10)} 米`, 12, 26);
      ctx.textAlign = 'right';
      ctx.fillText(`🪙 ${s.coins}`, cw - 12, 26);

      // Combo meter
      if (s.combo > 0 && !isCombo) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = 'rgba(255,215,0,0.8)';
        ctx.fillText(`Combo ${s.combo}/${COMBO_TARGET}`, cw / 2, 26);
      }
      if (isCombo) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = 'rgba(255,215,0,1)';
        const secs = Math.ceil(s.comboTimer / 60);
        ctx.fillText(`⚡ 冲刺模式 ${secs}s ⚡`, cw / 2, 26);
      }

      // Bottom hint
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px sans-serif';
      ctx.fillText('点击屏幕 或 空格键 切换方向', cw / 2, CH - 14);

      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase === 'PLAYING']);

  const duration = state.phase === 'GAMEOVER' ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const depthM = Math.floor(state.depth / 10);
  const sign = state.phase === 'GAMEOVER' ? mockSign(state.score, state.sessionId, duration) : '';

  return (
    <div className="flex flex-col gap-3">
      <div className={`${card} px-4 py-2.5 flex items-center gap-3`}>
        <button
          onClick={onBack}
          className="text-slate-500 dark:text-[#5b7a8a] hover:text-slate-800 dark:hover:text-[#e8e6f0] transition-colors border-0 bg-transparent cursor-pointer inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} />
          返回龟投
        </button>
        <div className="text-sky-600 dark:text-[#4cc9f0] font-bold text-[18px]">🐢 龟龟跳海</div>
        <div className="ml-auto text-amber-500 dark:text-[#ffd93d] text-sm font-bold">🪙 {state.coins.toLocaleString()}</div>
      </div>

      <div ref={containerRef} className={`${card} overflow-hidden relative flex justify-center`}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onPointerDown={handleTap}
          className="block cursor-pointer touch-none select-none"
          style={{ maxWidth: '100%' }}
        />

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[6] px-4 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-[#0c1a28cc] backdrop-blur-sm flex items-center gap-5 text-xs">
          <div className="text-center">
            <div className="text-slate-500 dark:text-[#5b7a8a] text-[9px] uppercase tracking-wider">得分</div>
            <div className="text-emerald-500 dark:text-[#06d6a0] text-lg font-bold leading-none">{state.score}</div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 dark:text-[#5b7a8a] text-[9px] uppercase tracking-wider">深度</div>
            <div className="text-sky-500 dark:text-[#4cc9f0] text-lg font-bold leading-none">{depthM}m</div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 dark:text-[#5b7a8a] text-[9px] uppercase tracking-wider">速度</div>
            <div className="text-amber-500 dark:text-[#ffd93d] text-lg font-bold leading-none">{(1 + state.frameCount * 0.00015).toFixed(1)}x</div>
          </div>
        </div>

        <div className="absolute top-3 right-3 z-[6] w-[170px] rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1a28d9] px-3 py-2 text-[11px]">
          <div className="text-amber-500 dark:text-[#ffd93d] font-bold text-center mb-1">🏆 排行榜</div>
          <div className="space-y-1 text-slate-700 dark:text-[#e8e6f0]">
            <div className="flex items-center gap-2"><span className="w-4 text-center text-amber-500 dark:text-[#ffd93d]">1</span><span className="flex-1">LionMaster</span><span className="text-sky-500 dark:text-[#4cc9f0] font-bold">3280</span></div>
            <div className="flex items-center gap-2"><span className="w-4 text-center text-slate-300">2</span><span className="flex-1">DragonSeer</span><span className="text-sky-500 dark:text-[#4cc9f0] font-bold">2750</span></div>
            <div className="flex items-center gap-2"><span className="w-4 text-center text-amber-700">3</span><span className="flex-1">EagleEye</span><span className="text-sky-500 dark:text-[#4cc9f0] font-bold">2140</span></div>
          </div>
        </div>

        {/* Start overlay */}
        {state.phase === 'START' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#06111ae0] backdrop-blur-sm z-10">
            <div className="text-6xl mb-3" style={{ animation: 'bounce 1s infinite' }}>🐢</div>
            <h2 className="text-3xl font-black text-sky-600 dark:text-[#4cc9f0] mb-2">龟龟跳海</h2>
            <div className="text-sm text-slate-500 dark:text-[#5b7a8a] space-y-1 text-center mb-5 px-6">
              <p>小龟龟正在跳入深海！</p>
              <p>左右躲避障碍物，越深分越高</p>
              <p>速度会越来越快，你能坚持多久？</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'START' })}
              className="px-10 py-3 rounded-xl border-0 bg-gradient-to-r from-[#06d6a0] to-[#4cc9f0] text-[#06111a] font-black text-lg cursor-pointer"
            >
              开始跳海!
            </button>
            <p className="text-[11px] text-slate-500 dark:text-[#5b7a8a] mt-3">← → 或 A/D 移动 · 空格键切换方向</p>
          </div>
        )}

        {/* Game Over — 号外新闻报纸风格 */}
        {state.phase === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <div className="bg-amber-50 dark:bg-amber-950/90 border-2 border-amber-800/60 dark:border-amber-600/40 rounded-lg p-5 max-w-sm w-full mx-4 shadow-2xl" style={{ fontFamily: 'serif' }}>
              {/* Newspaper header */}
              <div className="text-center border-b-2 border-double border-amber-800/50 dark:border-amber-600/40 pb-2 mb-3">
                <div className="text-[10px] text-amber-700/60 dark:text-amber-400/50 tracking-[0.3em] uppercase font-bold">
                  路边社 · 号外
                </div>
                <div className="text-[8px] text-amber-700/40 dark:text-amber-400/30 mt-0.5">
                  TURTLE TIMES · BREAKING NEWS
                </div>
              </div>

              {/* Headline */}
              <h3 className="text-base font-black text-amber-900 dark:text-amber-200 leading-snug text-center mb-3">
                震惊！某情报员深入海底 {depthM} 米，<br/>带回一手猛料！
              </h3>

              {/* Illustration */}
              <div className="text-center text-4xl mb-3">🐢💀🌊</div>

              {/* Stats as "news report" */}
              <div className="border-t border-b border-amber-800/20 dark:border-amber-600/20 py-2.5 mb-3 space-y-1.5">
                <div className="flex justify-between text-sm text-amber-900 dark:text-amber-200">
                  <span>📍 探险深度</span>
                  <b>{depthM} 米</b>
                </div>
                <div className="flex justify-between text-sm text-amber-900 dark:text-amber-200">
                  <span>🪙 收集情报（龟币）</span>
                  <b className="text-amber-700 dark:text-amber-400">+{state.coins} 币</b>
                </div>
                <div className="flex justify-between text-sm text-amber-900 dark:text-amber-200">
                  <span>⏱️ 潜水时长</span>
                  <b>{duration} 秒</b>
                </div>
              </div>

              {/* Fine print */}
              <p className="text-[9px] text-amber-700/40 dark:text-amber-400/30 text-center mb-3 italic">
                sig: #{state.sessionId.slice(0, 8)} · {sign}
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => dispatch({ type: 'START' })}
                  className="w-full py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold text-sm border-0 cursor-pointer transition-colors"
                >
                  再潜一次
                </button>
                <button
                  onClick={onBack}
                  className="w-full py-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 font-medium text-sm border border-amber-300/50 dark:border-amber-700/50 cursor-pointer transition-colors"
                >
                  返回龟投首页
                </button>
              </div>

              {/* Share line */}
              <p className="text-[10px] text-amber-700/50 dark:text-amber-400/40 text-center mt-3 leading-relaxed">
                「我的小龟深潜了 {depthM} 米，击败了 {Math.min(99, Math.floor(depthM / 5))}% 的情报员，快来挑战我！」
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={`${card} px-4 py-2.5`}>
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-[#5b7a8a] flex-wrap">
          <span>▲ 崖壁刺 <b className="text-red-500 dark:text-[#ff6b6b]">致命</b></span>
          <span>🪼 水母 <b className="text-red-500 dark:text-[#ff6b6b]">致命</b></span>
          <span>🪙 龟币 <b className="text-amber-500 dark:text-[#ffd93d]">+1币</b></span>
          <span>⚡ 连击×{COMBO_TARGET} <b className="text-emerald-500 dark:text-[#06d6a0]">冲刺!</b></span>
        </div>
      </div>
    </div>
  );
};
