import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';

type Phase = 'idle' | 'playing' | 'gameover';
type ObKind = 'reef' | 'shark' | 'jelly' | 'anchor' | 'mine';

type Ability = 'none' | 'slow' | 'small' | 'shield' | 'score';

interface Ob {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObKind;
  speed: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
}

interface PetSkin {
  id: string;
  name: string;
  emoji: string;
  img?: string;
  ability: Ability;
  abilityName: string;
  owned: boolean;
}

interface GameState {
  phase: Phase;
  score: number;
  depth: number;
  speedMul: number;
  maxSpeed: number;
  coinsGain: number;
  shield: number;
}

type Action =
  | { type: 'START'; shield: number }
  | { type: 'TICK'; score: number; depth: number; speedMul: number }
  | { type: 'HIT_SHIELD'; shield: number }
  | { type: 'GAMEOVER' }
  | { type: 'RESET' };

const INIT: GameState = {
  phase: 'idle',
  score: 0,
  depth: 0,
  speedMul: 1,
  maxSpeed: 1,
  coinsGain: 0,
  shield: 0,
};

const PETS: PetSkin[] = [
  { id: 'turtle', name: '基础小龟', emoji: '🐢', img: '/legacy/jichuxiaogui.png', ability: 'none', abilityName: '无', owned: true },
  { id: 'fire', name: '熔岩龟', emoji: '🔥🐢', img: '/legacy/rongyangui.png', ability: 'slow', abilityName: '🐌 减速10%', owned: true },
  { id: 'ice', name: '寒冰龟', emoji: '❄️🐢', img: '/legacy/hanbinggui.png', ability: 'small', abilityName: '🔬 体积-20%', owned: true },
  { id: 'mecha', name: '赛博龟', emoji: '🤖🐢', img: '/legacy/saibogui.png', ability: 'shield', abilityName: '🛡️ 护盾×1', owned: true },
  { id: 'golden', name: '宝箱龟', emoji: '✨🐢', img: '/legacy/baoxianggui.png', ability: 'score', abilityName: '💰 得分+25%', owned: true },
  { id: 'ninja', name: '忍者龟', emoji: '🥷🐢', img: '/legacy/renzhegui.png', ability: 'small', abilityName: '🔬 体积-25%', owned: true },
  { id: 'shadow', name: '海盗龟', emoji: '🏴‍☠️🐢', img: '/legacy/haidaogui.png', ability: 'none', abilityName: '无', owned: true },
];

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
.ttd-root{--bg:#e9f6ff;--surface:#ffffff;--surface2:#e9f6ff;--g:#06d6a0;--b:#1495d2;--y:#b78600;--r:#ff6b6b;--ink:#123;--muted:#55768a;background:var(--bg);color:var(--ink);font-family:'Noto Sans SC','Fredoka',sans-serif;height:calc(100vh - 56px);overflow:hidden;border-radius:14px;}
html.dark .ttd-root{--bg:#06111a;--surface:#0c1a28;--surface2:#122436;--g:#06d6a0;--b:#4cc9f0;--y:#ffd93d;--r:#ff6b6b;--ink:#e8e6f0;--muted:#5b7a8a;}
.ttd-root *, .ttd-root *::before, .ttd-root *::after{box-sizing:border-box}
.nav{display:flex;align-items:center;gap:14px;padding:11px 22px;background:linear-gradient(140deg,color-mix(in srgb, var(--surface) 92%, transparent),color-mix(in srgb, var(--surface2) 76%, transparent));border-bottom:1px solid color-mix(in srgb, var(--ink) 14%, transparent);box-shadow:0 8px 24px color-mix(in srgb, var(--b) 12%, transparent);position:relative;z-index:10;}
.nav-back{text-decoration:none;color:var(--muted);font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px;transition:.15s;cursor:pointer;background:transparent;border:0}
.nav-back:hover{color:var(--ink)}
.nav-title{font-family:'Fredoka';font-size:19px;font-weight:700;color:var(--b);flex:1;letter-spacing:.01em}
.nav-coins{font-family:'Fredoka';font-size:14px;font-weight:700;color:var(--y);background:color-mix(in srgb, var(--y) 18%, transparent);padding:5px 12px;border-radius:16px;border:1px solid color-mix(in srgb, var(--y) 24%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--y) 20%, transparent)}
.game-wrap{position:relative;width:100%;height:calc(100vh - 103px);overflow:hidden}
.game-wrap::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background-image:linear-gradient(transparent 0,transparent calc(100% - 1px),rgba(128,182,255,.08) calc(100% - 1px)),linear-gradient(90deg,transparent 0,transparent calc(100% - 1px),rgba(128,182,255,.06) calc(100% - 1px));background-size:100% 38px,38px 100%}
canvas{display:block;width:100%;height:100%}
.game-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:color-mix(in srgb, var(--bg) 88%, transparent);backdrop-filter:blur(12px);z-index:10;gap:14px;transition:opacity .3s}
.game-overlay.hidden{opacity:0;pointer-events:none}
.go-icon{font-size:64px;animation:bob 2s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.go-title{font-family:'Fredoka';font-size:32px;font-weight:700;color:var(--b)}
.go-sub{font-size:14px;color:var(--muted);text-align:center;line-height:1.7;max-width:340px}
.go-btn{padding:12px 40px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--g),var(--b));color:var(--bg);font-family:'Fredoka';font-size:18px;font-weight:700;cursor:pointer;transition:.15s;box-shadow:0 4px 20px color-mix(in srgb, var(--g) 42%, transparent)}
.go-btn:hover{transform:translateY(-2px);box-shadow:0 6px 28px color-mix(in srgb, var(--g) 52%, transparent)}
.go-hint{font-size:11px;color:var(--muted)}
.hud{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:24px;background:linear-gradient(140deg,color-mix(in srgb, var(--surface) 88%, transparent),color-mix(in srgb, var(--surface2) 72%, transparent));backdrop-filter:blur(8px);border:1px solid color-mix(in srgb, var(--ink) 12%, transparent);border-radius:14px;padding:9px 24px;z-index:5;box-shadow:0 10px 24px color-mix(in srgb, var(--b) 10%, transparent)}
.hud-item{text-align:center}.hud-label{font-size:9px;color:var(--muted);letter-spacing:.8px;text-transform:uppercase}.hud-val{font-family:'Fredoka';font-size:20px;font-weight:700}
.hud-val.score{color:var(--g)}.hud-val.depth{color:var(--b)}.hud-val.speed{color:var(--y)}
.lb-panel{position:absolute;top:12px;right:16px;background:linear-gradient(150deg,color-mix(in srgb, var(--surface) 90%, transparent),color-mix(in srgb, var(--surface2) 74%, transparent));backdrop-filter:blur(8px);border:1px solid color-mix(in srgb, var(--ink) 12%, transparent);border-radius:14px;padding:10px 14px;z-index:5;min-width:188px;box-shadow:0 10px 22px color-mix(in srgb, var(--b) 9%, transparent)}
.lb-title{font-family:'Fredoka';font-size:12px;color:var(--y);margin-bottom:6px;text-align:center}
.lb-row{display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px}
.lb-rank{width:16px;font-family:'Fredoka';font-weight:700;color:var(--muted);text-align:center}.lb-rank.r1{color:var(--y)}.lb-rank.r2{color:#9ca3af}.lb-rank.r3{color:#cd7c3e}
.lb-name{flex:1;font-weight:600;color:var(--ink)}.lb-name.me{color:var(--g)}.lb-sc{font-family:'Fredoka';font-weight:700;color:var(--b)}
.go-stats{display:flex;gap:16px;margin:4px 0}.go-stat{text-align:center;background:color-mix(in srgb, var(--surface) 35%, transparent);border:1px solid color-mix(in srgb, var(--ink) 10%, transparent);border-radius:10px;padding:8px 16px}
.go-stat-val{font-family:'Fredoka';font-size:20px;font-weight:700;color:var(--b)}.go-stat-label{font-size:10px;color:var(--muted)}
.go-reward{font-size:13px;color:var(--y);background:color-mix(in srgb, var(--y) 16%, transparent);padding:6px 16px;border-radius:10px;border:1px solid color-mix(in srgb, var(--y) 22%, transparent)}
.skin-section{text-align:center;margin-bottom:4px}.skin-section-title{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.skin-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:420px}
.skin-slot{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 10px;border-radius:10px;border:2px solid color-mix(in srgb, var(--ink) 12%, transparent);background:color-mix(in srgb, var(--surface) 40%, transparent);cursor:pointer;transition:.15s;min-width:62px}
.skin-slot:hover{border-color:color-mix(in srgb, var(--b) 35%, transparent)}
.skin-slot.on{border-color:var(--g);background:color-mix(in srgb, var(--g) 12%, transparent)}
.skin-slot.locked{opacity:.35;cursor:not-allowed}
.skin-emoji{font-size:22px;line-height:1}.skin-emoji img{width:28px;height:28px;object-fit:contain;display:block}
.skin-name{font-size:9px;color:var(--muted);font-weight:600;white-space:nowrap}
.skin-ability{font-size:8px;color:var(--b);font-weight:700}
.active-skin{display:flex;align-items:center;gap:8px;justify-content:center;font-size:12px;color:var(--muted);margin-top:2px}
.active-skin .ability-tag{color:var(--g);font-weight:700;background:color-mix(in srgb, var(--g) 14%, transparent);padding:2px 8px;border-radius:6px;font-size:10px}
.g-toast{position:fixed;top:52px;left:50%;transform:translateX(-50%) translateY(-60px);background:var(--surface2);color:var(--ink);border:1px solid color-mix(in srgb, var(--ink) 10%, transparent);border-radius:12px;padding:8px 18px;font-size:13px;font-weight:700;z-index:20;opacity:0;transition:.3s cubic-bezier(.34,1.4,.64,1);pointer-events:none}
.g-toast.show{transform:translateX(-50%) translateY(0);opacity:1}
`;

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return { ...INIT, phase: 'playing', shield: action.shield };
    case 'TICK':
      return {
        ...state,
        score: action.score,
        depth: action.depth,
        speedMul: action.speedMul,
        maxSpeed: Math.max(state.maxSpeed, action.speedMul),
      };
    case 'HIT_SHIELD':
      return { ...state, shield: action.shield };
    case 'GAMEOVER':
      return {
        ...state,
        phase: 'gameover',
        coinsGain: Math.max(8, Math.floor(state.score / 18)),
      };
    case 'RESET':
      return INIT;
    default:
      return state;
  }
}

const OTYPE: Array<{ kind: ObKind; emoji: string; w: number; h: number }> = [
  { kind: 'reef', emoji: '🪸', w: 50, h: 40 },
  { kind: 'shark', emoji: '🦈', w: 56, h: 34 },
  { kind: 'jelly', emoji: '🪼', w: 42, h: 42 },
  { kind: 'anchor', emoji: '⚓', w: 40, h: 50 },
  { kind: 'mine', emoji: '💣', w: 35, h: 35 },
];

export const TurtleDivePixel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [state, dispatch] = useReducer(reducer, INIT);
  const [activePetId, setActivePetId] = useState('turtle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const turtleRef = useRef({ x: 0, y: 120, w: 34, h: 34, vx: 0 });
  const obstaclesRef = useRef<Ob[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const depthRef = useRef(0);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchXRef = useRef<number | null>(null);
  const petImgMapRef = useRef<Record<string, HTMLImageElement>>({});
  const shieldRef = useRef(0);

  const activePet = useMemo(() => PETS.find((p) => p.id === activePetId) ?? PETS[0], [activePetId]);

  const leaderboard = useMemo(
    () => [
      { name: 'LionMaster 🦁', score: 3280 },
      { name: 'DragonSeer 🐉', score: 2750 },
      { name: 'EagleEye 🦅', score: 2140 },
      { name: '你 🦊', score: 0 },
    ],
    [],
  );

  const gToast = (msg: string) => {
    const el = toastRef.current;
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    window.setTimeout(() => el.classList.remove('show'), 1200);
  };

  const resize = () => {
    const cvs = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cvs || !wrap) return;
    cvs.width = wrap.clientWidth;
    cvs.height = wrap.clientHeight;
  };

  const resetRuntime = () => {
    obstaclesRef.current = [];
    bubblesRef.current = [];
    depthRef.current = 0;
    scoreRef.current = 0;
    frameRef.current = 0;
    const w = canvasRef.current?.width ?? 900;

    let size = 34;
    if (activePet.ability === 'small') size = activePet.id === 'ninja' ? 26 : 28;

    shieldRef.current = activePet.ability === 'shield' ? 1 : 0;
    turtleRef.current = { x: w / 2, y: 120, w: size, h: size, vx: 0 };
  };

  const startGame = () => {
    resetRuntime();
    dispatch({ type: 'START', shield: shieldRef.current });
  };

  useEffect(() => {
    const map: Record<string, HTMLImageElement> = {};
    PETS.forEach((p) => {
      if (!p.img) return;
      const im = new Image();
      im.src = p.img;
      map[p.id] = im;
    });
    petImgMapRef.current = map;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);

    const kd = (e: KeyboardEvent) => (keysRef.current[e.key] = true);
    const ku = (e: KeyboardEvent) => (keysRef.current[e.key] = false);

    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const canvas = canvasRef.current;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) touchXRef.current = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchXRef.current == null || state.phase !== 'playing') return;
      const x = e.touches[0].clientX;
      const dx = x - touchXRef.current;
      turtleRef.current.vx += dx * 0.02;
      touchXRef.current = x;
    };
    const onTouchEnd = () => {
      touchXRef.current = null;
    };

    canvas?.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas?.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas?.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas?.removeEventListener('touchstart', onTouchStart);
      canvas?.removeEventListener('touchmove', onTouchMove);
      canvas?.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(rafRef.current);
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'playing') return;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      frameRef.current += 1;
      const frame = frameRef.current;

      const speedMul = 1 + depthRef.current / 2000;
      let baseSpeed = 1 + speedMul * 0.62;
      if (activePet.ability === 'slow') baseSpeed *= 0.9;

      const t = turtleRef.current;
      const moveSpeed = 2.6 + speedMul * 0.25;
      if (keysRef.current.ArrowLeft || keysRef.current.a || keysRef.current.A) t.vx += (-moveSpeed - t.vx) * 0.16;
      else if (keysRef.current.ArrowRight || keysRef.current.d || keysRef.current.D) t.vx += (moveSpeed - t.vx) * 0.16;
      else t.vx *= 0.9;

      t.x += t.vx;
      t.x = Math.max(t.w / 2, Math.min(W - t.w / 2, t.x));

      depthRef.current += baseSpeed * 0.15;
      const scoreMul = activePet.ability === 'score' ? 1.25 : 1;
      scoreRef.current = Math.floor(depthRef.current * 2 * scoreMul);

      const spawnRate = Math.max(34, 70 - Math.floor(speedMul * 5));
      if (frame % spawnRate === 0) {
        const ot = OTYPE[Math.floor(Math.random() * OTYPE.length)];
        obstaclesRef.current.push({
          x: 30 + Math.random() * (W - 60),
          y: H + 30,
          w: ot.w,
          h: ot.h,
          kind: ot.kind,
          speed: baseSpeed * (0.82 + Math.random() * 0.35),
        });
      }

      if (frame % 8 === 0) {
        bubblesRef.current.push({
          x: Math.random() * W,
          y: H + 10,
          r: 1 + Math.random() * 3,
          speed: 1 + Math.random() * 2,
          alpha: 0.15 + Math.random() * 0.2,
        });
      }

      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        obstaclesRef.current[i].y -= obstaclesRef.current[i].speed;
        if (obstaclesRef.current[i].y < -80) obstaclesRef.current.splice(i, 1);
      }

      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i];
        b.y -= b.speed;
        b.x += Math.sin(b.y * 0.02) * 0.3;
        if (b.y < -20) bubblesRef.current.splice(i, 1);
      }

      const hitR = t.w * 0.4;
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const o = obstaclesRef.current[i];
        const cx = Math.max(o.x - o.w / 2, Math.min(t.x, o.x + o.w / 2));
        const cy = Math.max(o.y - o.h / 2, Math.min(t.y, o.y + o.h / 2));
        const dist = Math.sqrt((t.x - cx) ** 2 + (t.y - cy) ** 2);
        if (dist < hitR) {
          if (shieldRef.current > 0) {
            shieldRef.current -= 1;
            dispatch({ type: 'HIT_SHIELD', shield: shieldRef.current });
            obstaclesRef.current.splice(i, 1);
            gToast('🛡️ 护盾抵消！');
            break;
          }
          dispatch({ type: 'GAMEOVER' });
          gToast('撞上了!');
          return;
        }
      }

      const depthRatio = Math.min(depthRef.current / 500, 1);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgba(${6 - depthRatio * 6}, ${30 - depthRatio * 20}, ${60 - depthRatio * 40}, 1)`);
      grad.addColorStop(1, `rgba(3, ${12 - depthRatio * 8}, ${30 - depthRatio * 18}, 1)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.03 - depthRatio * 0.02;
      for (let i = 0; i < 5; i++) {
        const rx = W * 0.15 + i * W * 0.18;
        ctx.fillStyle = '#4cc9f0';
        ctx.beginPath();
        ctx.moveTo(rx - 15, 0);
        ctx.lineTo(rx + 15, 0);
        ctx.lineTo(rx + 40 + Math.sin(frame * 0.01 + i) * 20, H);
        ctx.lineTo(rx - 40 + Math.sin(frame * 0.01 + i) * 20, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      bubblesRef.current.forEach((b) => {
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = '#4cc9f0';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      obstaclesRef.current.forEach((o) => {
        const emoji = o.kind === 'reef' ? '🪸' : o.kind === 'shark' ? '🦈' : o.kind === 'jelly' ? '🪼' : o.kind === 'anchor' ? '⚓' : '💣';
        ctx.font = `${Math.max(o.w, o.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, o.x, o.y);
      });

      const petImg = petImgMapRef.current[activePet.id];
      if (petImg?.complete) {
        ctx.drawImage(petImg, t.x - t.w * 0.8, t.y - t.h * 0.8, t.w * 1.6, t.h * 1.6);
      } else {
        ctx.font = `${t.w * 1.7}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activePet.emoji, t.x, t.y);
      }

      if (shieldRef.current > 0) {
        ctx.strokeStyle = 'rgba(76,201,240,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.w * 0.85 + Math.sin(frame * 0.08) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      dispatch({ type: 'TICK', score: scoreRef.current, depth: depthRef.current, speedMul });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.phase, activePet]);

  return (
    <div className="ttd-root">
      <style>{STYLE}</style>

      <div className="nav">
        <button className="nav-back" onClick={onBack}>← 返回龟投</button>
        <div className="nav-title">🐢 龟龟跳海</div>
        <div className="nav-coins">🪙 {state.coinsGain.toLocaleString('zh')}</div>
      </div>

      <div className="game-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />

        <div className="hud" style={{ display: state.phase === 'playing' ? 'flex' : 'none' }}>
          <div className="hud-item"><div className="hud-label">得分</div><div className="hud-val score">{state.score}</div></div>
          <div className="hud-item"><div className="hud-label">深度</div><div className="hud-val depth">{Math.floor(state.depth)}m</div></div>
          <div className="hud-item"><div className="hud-label">速度</div><div className="hud-val speed">{state.speedMul.toFixed(1)}x</div></div>
          {state.shield > 0 && <div className="hud-item"><div className="hud-label">护盾</div><div className="hud-val depth">{'🛡️'.repeat(state.shield)}</div></div>}
        </div>

        <div className="lb-panel">
          <div className="lb-title">🏆 排行榜</div>
          {leaderboard.map((e, i) => {
            const cls = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
            const sc = e.name.startsWith('你') ? state.score : e.score;
            return (
              <div className="lb-row" key={e.name}>
                <div className={`lb-rank ${cls}`}>{i + 1}</div>
                <div className={`lb-name ${e.name.startsWith('你') ? 'me' : ''}`}>{e.name}</div>
                <div className="lb-sc">{sc.toLocaleString('zh')}</div>
              </div>
            );
          })}
        </div>

        <div className={`game-overlay ${state.phase === 'idle' ? '' : 'hidden'}`}>
          <div className="go-icon">
            {activePet.img ? <img src={activePet.img} alt={activePet.name} style={{ width: 56, height: 56, objectFit: 'contain' }} /> : activePet.emoji}
          </div>
          <div className="go-title">龟龟跳海</div>
          <div className="go-sub">小龟龟正在跳入深海！<br />左右躲避障碍物，越深分越高<br />速度会越来越快，你能坚持多久？</div>

          <div className="skin-section">
            <div className="skin-section-title">选择宠物</div>
            <div className="skin-bar">
              {PETS.map((p) => (
                <div key={p.id} className={`skin-slot ${p.id === activePet.id ? 'on' : ''} ${p.owned ? '' : 'locked'}`} onClick={() => p.owned && setActivePetId(p.id)}>
                  <div className="skin-emoji">
                    {p.img ? <img src={p.img} alt={p.name} /> : p.emoji}
                  </div>
                  <div className="skin-name">{p.name}</div>
                  <div className="skin-ability">{p.ability !== 'none' ? p.abilityName : ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="active-skin">
            {activePet.name}
            {activePet.ability !== 'none' && <span className="ability-tag">{activePet.abilityName}</span>}
          </div>

          <button className="go-btn" onClick={startGame}>开始跳海!</button>
          <div className="go-hint">← → 或 A/D 移动 · 触屏左右滑动</div>
        </div>

        <div className={`game-overlay ${state.phase === 'gameover' ? '' : 'hidden'}`}>
          <div className="go-icon">💀</div>
          <div className="go-title">撞上了!</div>
          <div className="go-stats">
            <div className="go-stat"><div className="go-stat-val">{state.score}</div><div className="go-stat-label">得分</div></div>
            <div className="go-stat"><div className="go-stat-val">{Math.floor(state.depth)}m</div><div className="go-stat-label">深度</div></div>
            <div className="go-stat"><div className="go-stat-val">{state.maxSpeed.toFixed(1)}x</div><div className="go-stat-label">最大速度</div></div>
          </div>
          <div className="go-reward">🪙 +{state.coinsGain} 龟币</div>
          <button className="go-btn" onClick={startGame}>再来一次!</button>
        </div>
      </div>

      <div className="g-toast" ref={toastRef} />
    </div>
  );
};
