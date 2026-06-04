// ══════════════════════════════════════════════════════════
// scene-turtle-dom.ts — DOM overlay per fighter, 1:1 复刻 JS .scene-turtle 结构
// ══════════════════════════════════════════════════════════
// JS ui.js:178-206 + scene.css + base.css:55 + battle.css 全字段对照.
//
// JS HTML 结构:
//   .scene-turtle (绝对定位, scale(var(--base-scale)) bottom-anchored)
//     .st-hp-row
//       .st-level-badge (10px bold 金色 #ffd93d)
//       .st-hp-wrap (width 88px)
//         .st-hp-bar (10px height, 渐变背景, border 1px)
//           .st-hp-delay  (受击红条 trail)
//           .st-hp-fill   (HP 主条, 渐变 #3deb9e→#1fb57f 我方 / #c084fc→#9d5be8 敌方)
//           .st-shield-fill (白盾)
//           .st-bubble-shield (青泡盾)
//           .st-hp-ticks (50/500 刻度)
//         .st-bubble-store-bar (条件: bubbleStore 龟)
//         .st-rage-bar         (条件: lavaRage 龟)
//         .st-energy-bar       (条件: starEnergy / auraAwaken 龟)
//     .st-body (sprite + shadow 由 Phaser 渲染, DOM 不管)
//     .st-chest-pile (条件: chestTreasure 龟, 龟身侧)
//     .st-status     (左外侧, 竖排 burn/poison/curse/stun 等)
//     .st-equips     (右外侧, 竖排装备 icons)
//
// 注: sprite (.st-body) 仍由 Phaser 绘制. DOM 只画 UI chrome (HP/status/equips/level/chest).
// DOM 绝对定位在 sprite home 处 (anchor = sprite center bottom).
//
// 位置同步: makeView 创建时设 DOM left/top from sprite.homeX/homeY.
// Phaser canvas 是 1280×720 但实际 viewport scale 可能不同 → 用 game.scale.canvasBounds
// 转换 game-coord → screen-coord.
//
// JS .scene-turtle 是 absolute relative to #battleScene container. Phaser 端我们让
// DOM 相对于 Phaser canvas 元素定位.
import Phaser from 'phaser';
import type { Fighter } from '../types';
import { getEquipStatLine } from './equip-stats';

const RARITY_COLOR_STR: Record<string, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

const STATUS_ICON_MAP: Record<string, string> = {
  burn: 'status/burn-icon.png',
  poison: 'status/poison-icon.png',
  bleed: 'status/bleed-icon.png',
  curse: 'status/curse-debuff-icon.png',
  stun: 'status/stun-icon.png',
  chilled: 'status/chilled-icon.png',
  shield: 'status/shield-icon.png',
  dodge: 'status/dodge-icon.png',
  taunt: 'status/taunt-icon.png',
  fear: 'status/fear-icon.png',
  reflect: 'status/reflect-icon.png',
  stealth: 'status/stealth-icon.png',
  healReduce: 'status/heal-reduce-icon.png',
};

const CHIP_LABEL: Record<string, { txt: string; color: string }> = {
  atkUp:     { txt: '⚔↑', color: '#ff9f43' },
  atkDown:   { txt: '⚔↓', color: '#888' },
  defUp:     { txt: '🛡↑', color: '#ffd93d' },
  defDown:   { txt: '🛡↓', color: '#888' },
  armorBreak:{ txt: '🛡↓', color: '#ef4444' },
  mrUp:      { txt: '🔮↑', color: '#4dabf7' },
  mrDown:    { txt: '🔮↓', color: '#888' },
  critUp:    { txt: '💥↑', color: '#ffd93d' },
  lifesteal: { txt: '❤吸', color: '#06d6a0' },
  armorPen:  { txt: '⚔穿', color: '#ff9f43' },
  physImmune:{ txt: '虚化', color: '#c77dff' },
  redirectAll: { txt: '🛡嘲', color: '#ef4444' },
  // P154 1:1 JS ui.js:1245 — 龟派气波蓄力: 单个 💥 图标代表 +暴击/爆伤/生命偷取/穿甲 (非 4 个分开)
  chiWaveActive: { txt: '💥', color: '#78c8ff' },
};

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* JS scene.css + base.css + battle.css 1:1 — 所有 .scene-turtle 内尺寸 */
    /* P26 CRITICAL: z-index 50 → 5 (JS scene.css:6 是 2, poc 用 5 留点 buffer)
       z=50 时 DOM 龟身 HP bar/装备/状态浮在 BattleStatsRail(44/45) / dmg-stats-panel / BattleLog 上,
       用户报"随便点面板甚至有血条字体浮在面板上"根因. JS 把所有 panel z 都设 30-300, sprite z=2/10
       一定在下. 现 z=5, .targetable=10 (JS scene.css:77 同款). */
    .poc-scene-turtle {
      position: absolute; z-index: 5;
      display: flex; flex-direction: column; align-items: center;
      pointer-events: none;
      font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
      transform-origin: bottom center;
    }
    .poc-scene-turtle.targetable { z-index: 10; }
    /* JS .st-hp-row */
    .poc-scene-turtle .st-hp-row {
      display: flex; align-items: center; gap: 0;
      margin-bottom: 2px;
    }
    /* P23 boss override (JS scene.css:10-12 1:1):
       - HP wrap 88 → 160
       - HP bar height 10 → 16, border 1px → 2px
       - level-badge font-size 10 → 13, padding 1×4 → 2×6
       - body 113×113 → 215×215 (boss --base-scale 1.91 倍) */
    .poc-scene-turtle.is-boss .st-hp-wrap { width: 160px; }
    .poc-scene-turtle.is-boss .st-hp-bar { height: 16px; border-width: 2px; }
    .poc-scene-turtle.is-boss .st-level-badge { font-size: 13px; padding: 2px 6px; }
    .poc-scene-turtle.is-boss .st-body { width: 153px; height: 153px; }
    /* P69 FIX: phantom .st-body 占位 — sprite 在 Phaser canvas 独立渲染, 这里仅留布局空间.
       JS ui.js:154 spriteSize = 80 (NOT 113). 让 .st-status/.st-equips top:50% / right:100% / left:100%
       锚到 body 中心 + body 宽边 (跟 JS scene.css:233 一致, body 80 后是 JS native size).
       旧 P21 用 113 错 → PoC 龟比 JS 大 41% */
    .poc-scene-turtle .st-body {
      width: 80px; height: 80px;
      pointer-events: none;
    }
    /* JS base.css:55 .st-level-badge 1:1 */
    .poc-scene-turtle .st-level-badge {
      font-size: 10px; font-weight: 800;
      color: #ffd93d;
      background: linear-gradient(135deg, #4a3520, #2a1d12);
      border: 1px solid #ffd93d80;
      border-radius: 3px;
      padding: 1px 4px;
      line-height: 1;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0,0,0,.5);
      margin-right: 2px;
    }
    /* JS scene.css:197 .st-hp-wrap */
    .poc-scene-turtle .st-hp-wrap {
      width: 88px;
      display: flex; flex-direction: column; align-items: center;
    }
    /* JS scene.css:198 .st-hp-bar */
    .poc-scene-turtle .st-hp-bar {
      position: relative; width: 100%; height: 10px;
      background: linear-gradient(180deg, rgba(20,8,8,.7) 0%, rgba(40,15,15,.9) 100%);
      border-radius: 2px;
      overflow: hidden;
      border: 1px solid rgba(80,80,80,.6);
      box-shadow: inset 0 1px 2px rgba(0,0,0,.5);
      image-rendering: pixelated;
    }
    /* P17 JS ui.js:506-516 .st-hp-delay damage trail
       受击: oldPct → 等 200ms → 500ms shrink + 400ms fade
       回血: 绿底 0.7→0 fade over 400ms */
    .poc-scene-turtle .st-hp-delay {
      position: absolute; left: 0; top: 0; height: 100%; z-index: 0;
      pointer-events: none;
      opacity: 0;
    }
    .poc-scene-turtle .st-hp-fill {
      position: absolute; left: 0; top: 0; height: 100%;
      transition: width .15s ease-out;
      z-index: 1;
    }
    /* P17 JS scene.css:201 .hp-flash — 受击 60ms 高亮 (brightness×2 + saturate×.5) */
    .poc-scene-turtle .st-hp-fill.hp-flash {
      filter: brightness(2) saturate(0.5);
      transition: filter 0s;
    }
    .poc-scene-turtle .st-shield-fill {
      position: absolute; top: 0; height: 100%;
      background: linear-gradient(180deg, rgba(255,255,255,.55) 40%, rgba(200,200,220,.35) 60%);
      transition: width .35s, left .35s;
      z-index: 2;
    }
    /* P17 JS scene.css:205 .st-aura-shield — 金色气场盾 (龟壳 auraAwaken) bubbleShimmer 1.6s */
    .poc-scene-turtle .st-aura-shield {
      position: absolute; top: 0; height: 100%;
      background: linear-gradient(90deg, rgba(255,217,102,.45), rgba(255,217,102,.7), rgba(255,217,102,.45));
      transition: width .35s, left .35s;
      z-index: 2;
      animation: poc-bubbleShimmer 1.6s ease-in-out infinite;
    }
    .poc-scene-turtle .st-bubble-shield {
      position: absolute; top: 0; height: 100%;
      background: linear-gradient(90deg, rgba(76,201,240,.4), rgba(76,201,240,.6), rgba(76,201,240,.4));
      transition: width .35s, left .35s;
      z-index: 3;
      animation: poc-bubbleShimmer 1.6s ease-in-out infinite;
    }
    @keyframes poc-bubbleShimmer {
      0%, 100% { filter: brightness(1); }
      50%      { filter: brightness(1.35); }
    }
    /* P17 JS scene.css:210-214 .st-hp-ticks — 50/500 刻度线 (repeating-linear-gradient) */
    .poc-scene-turtle .st-hp-ticks {
      position: absolute; left: 0; top: 0; height: 100%; width: 100%;
      pointer-events: none;
      z-index: 4;
    }
    /* P17 JS scene.css:215 .st-hp-text — HP 数字 (bar 下方 9px) */
    .poc-scene-turtle .st-hp-text {
      font-size: 9px; line-height: 1.1;
      color: #ddd; text-shadow: 0 1px 2px rgba(0,0,0,.8);
      white-space: nowrap; margin-top: 1px;
      display: flex; align-items: center; gap: 3px;
    }
    .poc-scene-turtle .st-hp-text .sh-ico  { color: #c0c0c0 }
    .poc-scene-turtle .st-hp-text .bub-ico { color: #4cc9f0 }
    .poc-scene-turtle .st-hp-text .aura-ico{ color: #ffd966 }
    /* JS scene.css:218 specialty bars */
    .poc-scene-turtle .st-bubble-store-bar,
    .poc-scene-turtle .st-rage-bar,
    .poc-scene-turtle .st-wall-bar,
    .poc-scene-turtle .st-drone-bar,
    .poc-scene-turtle .st-energy-bar {
      position: relative; width: 100%; height: 4px;
      border-radius: 2px; overflow: hidden;
      margin-top: 1px;
    }
    .poc-scene-turtle .st-bubble-store-bar { background: rgba(76,201,240,.1); border: 1px solid rgba(76,201,240,.2); }
    .poc-scene-turtle .st-rage-bar         { background: rgba(255,100,0,.1); border: 1px solid rgba(255,100,0,.25); }
    .poc-scene-turtle .st-energy-bar       { background: rgba(255,165,0,.1); border: 1px solid rgba(255,165,0,.25); }
    .poc-scene-turtle .st-wall-bar         { background: rgba(255,200,80,.12); border: 1px solid rgba(255,200,80,.3); }
    .poc-scene-turtle .st-drone-bar        { background: rgba(88,166,255,.12); border: 1px solid rgba(88,166,255,.3); }
    .poc-scene-turtle .st-bubble-store-fill { height: 100%; background: linear-gradient(90deg, rgba(76,201,240,.3), rgba(76,201,240,.6)); transition: width .4s ease; }
    .poc-scene-turtle .st-rage-fill         { height: 100%; background: linear-gradient(90deg, #ff6600, #ff3300); transition: width .4s ease; }
    .poc-scene-turtle .st-energy-fill       { height: 100%; background: linear-gradient(90deg, #ffa500, #ffcc00); transition: width .4s ease; }
    .poc-scene-turtle .st-wall-fill         { height: 100%; background: linear-gradient(90deg, #d8a13a, #ffd45c); transition: width .4s ease; }
    .poc-scene-turtle .st-drone-fill        { height: 100%; background: linear-gradient(90deg, #4cc9f0, #58a6ff); transition: width .4s ease; }
    /* JS scene.css:233-243 + base.css:1028 @media min-width:801px desktop override 1:1
       默认 font-size:8 gap:3, desktop 桌面 12/5 (用户报"图标大小不对", 走 desktop 值) */
    .poc-scene-turtle .st-status,
    .poc-scene-turtle .st-equips {
      position: absolute; top: 50%;
      transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 5px;
      font-size: 12px; align-items: center;
      pointer-events: none; z-index: 3;
    }
    .poc-scene-turtle.side-left .st-status  { right: 100%; margin-right: 4px; }
    .poc-scene-turtle.side-left .st-equips  { left:  100%; margin-left: 4px;  }
    .poc-scene-turtle.side-right .st-status { left:  100%; margin-left: 4px;  }
    .poc-scene-turtle.side-right .st-equips { right: 100%; margin-right: 4px; }
    /* JS ui.js:321 wrap chip: 20×20 box bg rgba(8,12,20,.78) border rgba(255,255,255,.18) + 内 14×14 img */
    .poc-scene-turtle .st-status > *,
    .poc-scene-turtle .st-equips > * {
      position: relative;
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px;
      background: rgba(8,12,20,.78);
      border: 1px solid rgba(255,255,255,.18);
      box-sizing: border-box;
      backdrop-filter: blur(3px);
    }
    .poc-scene-turtle .st-status img,
    .poc-scene-turtle .st-equips img {
      width: 14px; height: 14px;
      image-rendering: pixelated;
      vertical-align: middle;
    }
    .poc-scene-turtle .st-chip {
      font-size: 9px; font-weight: 700;
      padding: 1px 3px; border-radius: 3px;
      background: rgba(0,0,0,.65); white-space: nowrap;
    }
    /* P119b 装备 sub-progress (e.g. 孵化器进度条) — 装备 icon 下方 2px 高条 */
    .poc-scene-turtle .st-equip-wrap {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
    }
    .poc-scene-turtle .st-equip-progress {
      width: 18px; height: 3px;
      background: rgba(255,255,255,.12);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 1px;
    }
    .poc-scene-turtle .st-equip-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffd86b, #ff9f43);
      transition: width .3s ease;
    }
    .poc-scene-turtle .st-equip-temp-level {
      position: absolute;
      bottom: -2px; right: -3px;
      font-size: 8px; font-weight: 700;
      color: #ffd86b;
      text-shadow: 0 0 2px #000, 0 1px 1px #000;
      pointer-events: none;
    }
    /* JS scene.css:186 .st-chest-pile */
    .poc-scene-turtle.side-left  .st-chest-pile {
      position: absolute; left: -6px; top: 48%;
      transform: translate(-100%, -50%);
      color: #ffd93d; font-weight: 700; font-size: 12px;
      text-shadow: 0 1px 2px rgba(0,0,0,.85), 0 0 4px rgba(0,0,0,.6);
      white-space: nowrap; pointer-events: none;
    }
    .poc-scene-turtle.side-right .st-chest-pile {
      position: absolute; right: -6px; top: 48%;
      transform: translate(100%, -50%);
      color: #ffd93d; font-weight: 700; font-size: 12px;
      text-shadow: 0 1px 2px rgba(0,0,0,.85);
      white-space: nowrap; pointer-events: none;
    }
  `;
  document.head.appendChild(st);
}

export interface SceneTurtleDomBindings {
  fighter: Fighter;
  side: 'left' | 'right';
  spriteX: number;     // Phaser canvas-local x (sprite home)
  spriteY: number;     // Phaser canvas-local y (sprite home)
  isAlly: boolean;
}

// ── 共享画布矩形缓存 (PERF P0) ──
//   旧: 每帧每龟各调 canvas.getBoundingClientRect() = 6×/帧强制 reflow, 且紧跟 style 写入 →
//   读-写-读-写交错 = 布局抖动(layout thrashing), 战斗内严重掉帧/延时的根因之一。
//   现: 缓存 canvas rect 200ms (per-frame 命中, 不再每帧 reflow); resize/scroll 立即作废,
//   各实例 _resizeHandler 会重应用; applyPosition 另加"最终位置未变则跳过 DOM 写入"。
interface CanvasRect { left: number; top: number; sx: number; sy: number; }
let _canvasRectCache: CanvasRect | null = null;
let _canvasRectAt = 0;
function getCanvasRect(scene: Phaser.Scene): CanvasRect | null {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (_canvasRectCache && now - _canvasRectAt < 200) return _canvasRectCache;
  const game = scene.game;
  const canvas = game.canvas;
  if (!canvas) return _canvasRectCache;
  const r = canvas.getBoundingClientRect();
  _canvasRectCache = {
    left: r.left, top: r.top,
    sx: r.width / game.scale.gameSize.width,
    sy: r.height / game.scale.gameSize.height,
  };
  _canvasRectAt = now;
  return _canvasRectCache;
}
if (typeof window !== 'undefined') {
  const _inval = () => { _canvasRectCache = null; };
  window.addEventListener('resize', _inval);
  window.addEventListener('scroll', _inval, true);
}

export class SceneTurtleDom {
  private root: HTMLDivElement;
  private hpFill: HTMLDivElement;
  private hpDelay: HTMLDivElement;
  private shieldFill: HTMLDivElement;
  private auraShield: HTMLDivElement;     // P17: 金色气场盾 layer
  private bubbleShield: HTMLDivElement;
  private hpTicks: HTMLDivElement;        // P17: 50/500 刻度
  private hpText: HTMLDivElement | null = null;   // P25: JS 不渲染, 留 null 兼容
  private levelBadge: HTMLSpanElement | null = null;
  private statusEl: HTMLDivElement;
  private equipsEl: HTMLDivElement;
  private bubbleStoreBar: HTMLDivElement | null = null;
  private bubbleStoreFill: HTMLDivElement | null = null;
  private rageBar: HTMLDivElement | null = null;
  private rageFill: HTMLDivElement | null = null;
  private energyBar: HTMLDivElement | null = null;
  private energyFill: HTMLDivElement | null = null;
  private wallBar: HTMLDivElement | null = null;     // 石头龟 坚壁 护甲叠层进度
  private wallFill: HTMLDivElement | null = null;
  private droneFill: HTMLDivElement | null = null;   // 赛博龟 浮游炮数 科技蓝条
  private chestPile: HTMLDivElement | null = null;
  private fighter: Fighter;
  private scene: Phaser.Scene;
  // P17 HP 动画状态
  private _lastHp: number = -1;          // 上次 update 的 hp, 用于触发 delay/flash
  private _lastBarMax: number = -1;      // barMax 改变时重建 ticks
  private _lastMaxHp: number = -1;       // body-scale 用
  // P70: 上次 applyPosition 的 canvas 坐标 (用于 resize 重新算)
  private _lastCanvasX: number = 0;
  private _lastCanvasY: number = 0;
  // PERF: 上次实际写入 DOM 的最终位置, 未变则跳过写入 (per-frame 用 homeX/homeY 恒定 → 全跳过)
  private _lastLeft = NaN;
  private _lastTop = NaN;
  private _lastScale = NaN;
  private _resizeHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene, b: SceneTurtleDomBindings) {
    installCss();
    this.scene = scene;
    this.fighter = b.fighter;
    const root = document.createElement('div');
    // P23: boss 标记 (JS scene.css:7 .is-boss CSS variable 触发 HP/badge/body 加宽)
    const isBoss = !!(b.fighter as Fighter & { _isBoss?: boolean })._isBoss;
    root.className = `poc-scene-turtle side-${b.side}${isBoss ? ' is-boss' : ''}`;
    this.root = root;
    // 位置: 锚定 sprite 中心 (Phaser sprite origin 0.5,0.5 默认). DOM 用 bottom-anchored
    // 让 .scene-turtle 像 JS 一样 transform-origin:bottom center. HP bar 在 sprite 上方约 60px.
    this.applyPosition(b.spriteX, b.spriteY);

    // 内部结构 1:1 JS
    const f = b.fighter;
    const hasBubbleStore = (f.passive as { type?: string } | null)?.type === 'bubbleStore';
    const hasLavaRage   = (f.passive as { type?: string } | null)?.type === 'lavaRage';
    const hasStarEnergy = (f.passive as { type?: string } | null)?.type === 'starEnergy';
    const hasAuraAwaken = ((f.passive as { type?: string; energyStore?: unknown } | null)?.type === 'auraAwaken'
      && !!(f.passive as { energyStore?: unknown })?.energyStore);
    const hasStoneWall  = (f.passive as { type?: string } | null)?.type === 'stoneWall';   // 坚壁 护甲叠层
    const hasChestPile  = (f.passive as { type?: string } | null)?.type === 'chestTreasure';
    const hasCyberDrone = (f.passive as { type?: string } | null)?.type === 'cyberDrone';   // 浮游炮数科技蓝条
    const lv = (f as Fighter & { _level?: number })._level;

    // P25: 血条下不再渲染 .st-hp-text — JS 实际不显示这个元素 (scene.css:215 CSS 有但 ui.js
    // HTML 从不插入). HP 数字只在 fighter detail modal 里 (.fdp-hp-line). P17 自创已删.
    // .st-body 113×113 占位 (P22) 保留 — 让 .st-status/.st-equips top:50%/right:100% 锚 body.
    root.innerHTML = `
      <div class="st-hp-row">
        ${lv ? `<span class="st-level-badge">${lv}</span>` : ''}
        <div class="st-hp-wrap">
          <div class="st-hp-bar">
            <div class="st-hp-delay"></div>
            <div class="st-hp-fill"></div>
            <div class="st-shield-fill" style="display:none"></div>
            <div class="st-aura-shield" style="display:none"></div>
            <div class="st-bubble-shield" style="display:none"></div>
            <div class="st-hp-ticks"></div>
          </div>
          ${hasBubbleStore ? `<div class="st-bubble-store-bar"><div class="st-bubble-store-fill" style="width:0%"></div></div>` : ''}
          ${hasLavaRage   ? `<div class="st-rage-bar"><div class="st-rage-fill" style="width:0%"></div></div>` : ''}
          ${(hasStarEnergy || hasAuraAwaken) ? `<div class="st-energy-bar"><div class="st-energy-fill" style="width:0%"></div></div>` : ''}
          ${hasStoneWall  ? `<div class="st-wall-bar"><div class="st-wall-fill" style="width:0%"></div></div>` : ''}
          ${hasCyberDrone ? `<div class="st-drone-bar"><div class="st-drone-fill" style="width:0%"></div></div>` : ''}
        </div>
      </div>
      <div class="st-body" aria-hidden="true"></div>
      ${hasChestPile ? `<div class="st-chest-pile">0</div>` : ''}
      <div class="st-status"></div>
      <div class="st-equips"></div>
    `;
    this.hpDelay = root.querySelector('.st-hp-delay') as HTMLDivElement;
    this.hpFill = root.querySelector('.st-hp-fill') as HTMLDivElement;
    this.shieldFill = root.querySelector('.st-shield-fill') as HTMLDivElement;
    this.auraShield = root.querySelector('.st-aura-shield') as HTMLDivElement;
    this.bubbleShield = root.querySelector('.st-bubble-shield') as HTMLDivElement;
    this.hpTicks = root.querySelector('.st-hp-ticks') as HTMLDivElement;
    // P25: hpText 不再渲染, querySelector 返回 null OK
    this.hpText = root.querySelector('.st-hp-text');
    this.levelBadge = root.querySelector('.st-level-badge');
    this.statusEl = root.querySelector('.st-status') as HTMLDivElement;
    this.equipsEl = root.querySelector('.st-equips') as HTMLDivElement;
    if (hasBubbleStore) {
      this.bubbleStoreBar = root.querySelector('.st-bubble-store-bar');
      this.bubbleStoreFill = root.querySelector('.st-bubble-store-fill');
    }
    if (hasLavaRage) {
      this.rageBar = root.querySelector('.st-rage-bar');
      this.rageFill = root.querySelector('.st-rage-fill');
    }
    if (hasStarEnergy || hasAuraAwaken) {
      this.energyBar = root.querySelector('.st-energy-bar');
      this.energyFill = root.querySelector('.st-energy-fill');
    }
    if (hasStoneWall) {
      this.wallBar = root.querySelector('.st-wall-bar');
      this.wallFill = root.querySelector('.st-wall-fill');
    }
    if (hasCyberDrone) {
      this.droneFill = root.querySelector('.st-drone-fill');
    }
    if (hasChestPile) {
      this.chestPile = root.querySelector('.st-chest-pile');
    }

    // 双色 HP gradient (JS ui-anim.js:567-571 1:1)
    const gradient = b.isAlly
      ? 'linear-gradient(180deg, #3deb9e 38%, #1fb57f 42%)'
      : 'linear-gradient(180deg, #c084fc 38%, #9d5be8 42%)';
    this.hpFill.style.background = gradient;

    document.body.appendChild(root);
    this.update();

    // P70: 监听 window resize — viewport 变了重算 applyPosition
    this._resizeHandler = () => this.applyPosition(this._lastCanvasX, this._lastCanvasY);
    window.addEventListener('resize', this._resizeHandler);
    scene.events.once('shutdown', () => {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      // P169: 必须移除 DOM root — 否则 BattleScene 退出后血条仍挂在 document.body 上,
      //   回主菜单还浮在屏幕上 (用户报). 之前 shutdown 只解了 resize listener, 漏了 destroy.
      this.destroy();
    });
  }

  /** P94 public: BattleScene resize hook 主动重设 canvas 坐标 (sprite 移位后兜底). */
  setCanvasPos(canvasX: number, canvasY: number): void {
    this.applyPosition(canvasX, canvasY);
  }
  /** 应用位置: spriteX/Y 是 Phaser canvas-local 坐标 (1280×720). 转 screen 坐标. */
  private applyPosition(canvasX: number, canvasY: number) {
    this._lastCanvasX = canvasX;
    this._lastCanvasY = canvasY;
    const rect = getCanvasRect(this.scene);   // PERF: 缓存, 不再每帧每龟 getBoundingClientRect
    if (!rect) return;
    const sy = rect.sy;
    const screenX = rect.left + canvasX * rect.sx;
    const screenY = rect.top + canvasY * sy;
    // P62 FIX: 血条位置数学
    //   JS scene.css:6 `.scene-turtle{transform:scale(--base-scale 0.9); transform-origin:bottom center}`
    //   transform-origin:bottom center 意味着缩放围绕**自然 box 的 bottom 中心**.
    //   关键: 用 NATURAL height 计算 top, 不是 pre-scaled —
    //     设 top = screenY - naturalHeight → 自然 bottom = top + height = screenY ✓
    //     scale 围绕 bottom 缩放: visual bottom 不变还是 screenY (= 龟脚)
    //     visual top = screenY - naturalHeight × finalScale (HP bar 上沿位置自动正确)
    //   之前 P29 误用 totalHeight * baseScale: 自然 bottom 落在 screenY+13.5 (HP 整体下沉 13.5px)
    //   sy (canvas-display ratio) 应该只走 scale, NOT 乘到 top — 否则双重缩放.
    // P64/P69 FIX: 血条/龟身大小
    //   JS ui.js:154 spriteSize = 80 (NOT 113) — body 包裹 80px sprite
    //   JS base-scale = 0.9 × 1.417 × factor (1.275 at PC 1280)
    //   normal: body 80 × 1.275 = 102 visual
    //   boss:   body 80 × 1.913 = 153 visual (匹配 is-boss CSS 153×153)
    const isBoss = (this.fighter as Fighter & { _isBoss?: boolean })._isBoss;
    const POSITIONS_SCALE = 1.417;
    const baseScale = isBoss ? (0.9 * POSITIONS_SCALE * 1.5) : (0.9 * POSITIONS_SCALE);
    const HP_ROW_PX = isBoss ? 28 : 22;
    const BODY_PX = isBoss ? 153 : 80;     // P69: JS sprite 80 (not 113); boss 80×1.913 = 153
    const naturalHeight = HP_ROW_PX + BODY_PX;   // 102 (普通) / 181 (boss)
    const finalScale = baseScale * sy;
    const top = screenY - naturalHeight;
    // PERF: 最终位置/缩放未变则跳过 DOM 写入 (per-frame homeX/homeY 恒定 → 不再每帧重排)
    if (screenX === this._lastLeft && top === this._lastTop && finalScale === this._lastScale) return;
    this._lastLeft = screenX;
    this._lastTop = top;
    this._lastScale = finalScale;
    this.root.style.left = `${screenX}px`;
    this.root.style.top = `${top}px`;
    this.root.style.transform = `translateX(-50%) scale(${finalScale})`;
    this.root.style.transformOrigin = 'bottom center';
  }

  /** 每帧 / hp 变化时调 — 完整刷新 (HP/Shield/Aura/Bubble/Ticks/Text/Status/Equips/Level/Chest)
   *  P17: JS ui.js:469-639 updateSceneHp 1:1 — 加 delay 红色受击轨迹 + 60ms 高亮闪 + 回血绿轨迹
   */
  update() {
    const f = this.fighter;
    const fAny = f as Fighter & {
      bubbleShieldVal?: number; _auraShieldVal?: number; _lavaShieldVal?: number;
    };
    const auraVal = (fAny._auraShieldVal ?? fAny._lavaShieldVal ?? 0);
    const bsVal = fAny.bubbleShieldVal ?? 0;
    const totalEff = f.hp + (f.shield ?? 0) + auraVal + bsVal;
    const barMax = Math.max(f.maxHp, totalEff);
    const hpPct = Math.max(0, f.hp / barMax * 100);
    const shieldPct = (f.shield ?? 0) / barMax * 100;
    const auraPct = auraVal / barMax * 100;
    const bsPct = bsVal / barMax * 100;

    // P17 受击/回血触发 delay 轨迹 + flash (JS ui.js:506-535 1:1)
    if (this._lastHp >= 0 && f.hp !== this._lastHp) {
      const oldPct = Math.max(0, this._lastHp / barMax * 100);
      if (f.hp < this._lastHp) {
        // 受击: 红色 delay (200ms hold → 500ms shrink + 400ms fade) + 60ms flash
        const delay = this.hpDelay;
        delay.style.background = 'linear-gradient(180deg, #ff4d4d 40%, #c81e1e 60%)';
        delay.style.transition = 'none';
        delay.style.opacity = '1';
        delay.style.width = `${oldPct}%`;
        // rAF×2 让 transition:none 落, 然后切到真正的延时收缩
        requestAnimationFrame(() => requestAnimationFrame(() => {
          delay.style.transition = 'width 0.5s ease-in-out 0.2s, opacity 0.4s ease-in 0.5s';
          delay.style.width = `${hpPct}%`;
          delay.style.opacity = '0';
        }));
        // hit-flash: 60ms 高亮后清除 (JS scene.css:201)
        this.hpFill.classList.add('hp-flash');
        setTimeout(() => this.hpFill.classList.remove('hp-flash'), 60);
      } else if (f.hp > this._lastHp) {
        // 回血: 绿色 delay 0.7→0 fade
        const delay = this.hpDelay;
        delay.style.background = 'linear-gradient(180deg, #3deb9e 40%, #1fb57f 60%)';
        delay.style.transition = 'none';
        delay.style.opacity = '0.7';
        delay.style.width = `${hpPct}%`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          delay.style.transition = 'opacity 0.4s ease-out 0.1s';
          delay.style.opacity = '0';
        }));
      }
    } else if (this._lastHp < 0) {
      // 首次 update: 直接对齐, 不触发动画
      this.hpDelay.style.opacity = '0';
      this.hpDelay.style.width = `${hpPct}%`;
    }
    this._lastHp = f.hp;

    this.hpFill.style.width = `${hpPct}%`;

    if ((f.shield ?? 0) > 0) {
      this.shieldFill.style.display = '';
      this.shieldFill.style.left = `${hpPct}%`;
      this.shieldFill.style.width = `${shieldPct}%`;
      // 雷盾 (counter buff) 期间护盾段用电光黄特殊色; 否则恢复 CSS 默认白盾 (用户: 雷盾盾用特殊颜色)
      const hasThunderShield = (f.buffs ?? []).some(b => b.type === 'counter');
      this.shieldFill.style.background = hasThunderShield
        ? 'linear-gradient(180deg, rgba(255,225,77,.8) 40%, rgba(255,196,32,.55) 60%)'
        : '';
    } else {
      this.shieldFill.style.display = 'none';
    }
    if (auraVal > 0) {
      this.auraShield.style.display = '';
      this.auraShield.style.left = `${hpPct + shieldPct}%`;
      this.auraShield.style.width = `${auraPct}%`;
    } else {
      this.auraShield.style.display = 'none';
    }
    if (bsVal > 0) {
      this.bubbleShield.style.display = '';
      this.bubbleShield.style.left = `${hpPct + shieldPct + auraPct}%`;
      this.bubbleShield.style.width = `${bsPct}%`;
    } else {
      this.bubbleShield.style.display = 'none';
    }

    // P25: JS 不渲染 .st-hp-text. P17 自创已删. 数字看 fighter detail modal.
    void auraVal; void bsVal;

    // P17 ticks: barMax 变化时重建 (50 minor / 500 major)
    if (barMax !== this._lastBarMax) {
      this._lastBarMax = barMax;
      this.rebuildTicks(barMax);
    }

    // P17 body-scale: maxHp 改变时 (e.g. 装备 / shellAbsorb 偷血) 0.9-1.15 缩放 (JS ui.js:474-480)
    if (f.maxHp !== this._lastMaxHp && this._lastMaxHp > 0) {
      const initHp = (f as Fighter & { _initHp?: number })._initHp ?? this._lastMaxHp;
      const ratio = f.maxHp / Math.max(1, initHp);
      const scale = Math.max(0.9, Math.min(1.15, 0.85 + ratio * 0.15));
      this.root.style.setProperty('--body-scale', String(scale));
    }
    this._lastMaxHp = f.maxHp;
    // Level badge (level 改变可能性低, 但兜底)
    const lv = (f as Fighter & { _level?: number })._level;
    if (this.levelBadge) this.levelBadge.textContent = String(lv ?? 1);
    // Specialty bars
    if (this.bubbleStoreFill) {
      const store = (f as Fighter & { bubbleStore?: number }).bubbleStore ?? 0;
      this.bubbleStoreFill.style.width = `${Math.min(100, store / f.maxHp * 100)}%`;
    }
    if (this.rageFill) {
      const lf = f as Fighter & { _lavaRage?: number; _lavaTransformed?: boolean; _lavaTransformTurns?: number };
      if (lf._lavaTransformed) {
        // 变身后: 红条改为"火山形态倒计时" — 剩余变身回合/总时长, 满→0 (用户新概念)
        const dur = (f.passive as { transformDuration?: number } | null)?.transformDuration ?? 6;
        this.rageFill.style.width = `${Math.min(100, (lf._lavaTransformTurns ?? 0) / Math.max(1, dur) * 100)}%`;
      } else {
        const rage = lf._lavaRage ?? 0;
        const max = (f.passive as { rageMax?: number } | null)?.rageMax ?? 100;
        this.rageFill.style.width = `${Math.min(100, rage / max * 100)}%`;
      }
    }
    if (this.energyFill) {
      const en = (f as Fighter & { _starEnergy?: number; _storedEnergy?: number })._starEnergy
              ?? (f as Fighter & { _storedEnergy?: number })._storedEnergy ?? 0;
      const cap = (f.passive as { maxChargePct?: number; energyMaxStorePct?: number } | null);
      const maxE = cap?.maxChargePct
        ? Math.round(f.maxHp * cap.maxChargePct / 100)
        : Math.round(f.maxHp * (cap?.energyMaxStorePct ?? 0.5));
      this.energyFill.style.width = `${Math.min(100, en / Math.max(1, maxE) * 100)}%`;
    }
    if (this.wallFill) {
      // 坚壁: 已叠加护甲 / 上限(=开局护甲×maxDefInitPct%). 与 BattleScene stoneWall 回合hook 同款 cap。
      const fx = f as Fighter & { _stoneDefGained?: number; _initDef?: number };
      const gained = fx._stoneDefGained ?? 0;
      const initDef = fx._initDef ?? f.baseDef;
      const maxCap = Math.round(initDef * (((f.passive as { maxDefInitPct?: number } | null)?.maxDefInitPct ?? 100) / 100));
      this.wallFill.style.width = `${Math.min(100, gained / Math.max(1, maxCap) * 100)}%`;
    }
    if (this.chestPile) {
      const treasure = (f as Fighter & { _chestTreasure?: number })._chestTreasure ?? 0;
      this.chestPile.textContent = `${treasure}`;
    }
    if (this.droneFill) {
      const n = ((f as Fighter & { _drones?: unknown[] })._drones?.length) ?? 0;
      const cap = (f.passive as { maxDrones?: number } | null)?.maxDrones ?? 10;   // 强化被动时 maxDrones 已在 init 设为 20
      this.droneFill.style.width = `${Math.min(100, n / Math.max(1, cap) * 100)}%`;
    }
    // Status icons (buffs)
    this.refreshStatusIcons();
    // Equip badges
    this.refreshEquipBadges();
  }

  private refreshStatusIcons() {
    const seen: Record<string, { value: number; duration: number }> = {};
    for (const b of this.fighter.buffs) {
      const dur = b.duration ?? 0;
      if (dur <= 0 && dur !== -1 && dur !== 999) continue;
      if (!seen[b.type]) seen[b.type] = { value: 0, duration: dur };
      seen[b.type].value += b.value ?? 0;
      seen[b.type].duration = Math.max(seen[b.type].duration, dur);
    }
    this.statusEl.innerHTML = Object.entries(seen).map(([type, info]) => {
      const iconPath = STATUS_ICON_MAP[type];
      if (iconPath) {
        return `<img src="${iconPath}" title="${type} ${info.duration}t" alt="${type}">`;
      }
      const chip = CHIP_LABEL[type];
      if (chip) {
        return `<span class="st-chip" style="color:${chip.color}" title="${type} ${info.duration}t">${chip.txt}</span>`;
      }
      return '';
    }).join('');
  }

  private refreshEquipBadges() {
    // P122 1:1 修字段不一致: attachEquipment push 到 f.equipment, refreshEquipBadges 之前读 _equips 永远空
    //   → 用户开局选的初始装备图标不显示. 现统一读 f.equipment.
    const equips = (this.fighter.equipment ?? []) as Array<{ id?: string; icon?: string; name?: string }>;
    const fAny = this.fighter as Fighter & Record<string, unknown>;
    // P119 装备图标 + 灰字 stat (P115 getEquipStatLine tooltip) + P119b 孵化器进度条+等级 badge
    this.equipsEl.innerHTML = equips.map(eq => {
      if (!eq) return '';
      const statLine = eq.id ? getEquipStatLine(eq.id, this.fighter) : '';
      const fullTitle = `${eq.name ?? ''}${statLine ? `\n${statLine}` : ''}`;
      const iconHtml = (eq.icon && eq.icon.endsWith && eq.icon.endsWith('.png'))
        ? `<img src="${eq.icon}" title="${fullTitle}" alt="${eq.name ?? ''}">`
        : `<span class="st-chip" title="${fullTitle}">${eq.icon ?? '?'}</span>`;
      // 孵化器: 加进度条 + 临时等级 badge (用户 spec)
      if (eq.id === 'e_incubator') {
        const prog = (fAny._incubatorProgress as number) ?? 0;
        const lv = (fAny._incubatorTempLevel as number) ?? 0;
        return `<span class="st-equip-wrap">${iconHtml}<span class="st-equip-progress"><span class="st-equip-progress-fill" style="width:${Math.min(100, prog)}%"></span></span>${lv > 0 ? `<span class="st-equip-temp-level">+${lv}</span>` : ''}</span>`;
      }
      // 电棍: 显示剩余层数 badge
      if (eq.id === 'e_stun_baton') {
        const stacks = (fAny._stunBatonStacks as number) ?? 0;
        return `<span class="st-equip-wrap">${iconHtml}${stacks > 0 ? `<span class="st-equip-temp-level">${stacks}</span>` : ''}</span>`;
      }
      // 竹叶: 充能 indicator
      if (eq.id === 'e_bamboo_leaf') {
        const charge = (fAny._bambooLeafCharge as number) ?? 0;
        return `<span class="st-equip-wrap">${iconHtml}${charge > 0 ? `<span class="st-equip-temp-level" style="color:#7dffb3">✓</span>` : ''}</span>`;
      }
      return iconHtml;
    }).join('');
  }

  /** P24 ticks: JS ui.js:94-104 buildSceneTickBg(barMax) 1:1
   *  - 大刻度 (major): 500 HP, **全高**, rgba(0,0,0,.6) 深黑
   *  - 小刻度 (minor): 100 HP, **只占上半部分**, rgba(0,0,0,.35) 浅黑
   *  - **量表全游戏统一**, 不按 barMax 切换 (JS:95 注释明确)
   *  - 用 calc 比例 (跟 bar 宽度无关, %跟随)
   */
  private rebuildTicks(barMax: number) {
    if (barMax <= 0) { this.hpTicks.style.background = 'none'; return; }
    const majorStep = 500;
    const minorStep = 100;
    const minorPct = (minorStep / barMax) * 100;
    const majorPct = (majorStep / barMax) * 100;
    // 太密就不画 (avoid muddy bars on huge maxHp)
    if (minorPct < 2) { this.hpTicks.style.background = 'none'; return; }
    const minorBg = `repeating-linear-gradient(90deg, transparent 0, transparent calc(${minorPct}% - 1px), rgba(0,0,0,.35) calc(${minorPct}% - 1px), rgba(0,0,0,.35) ${minorPct}%)`;
    const majorBg = `repeating-linear-gradient(90deg, transparent 0, transparent calc(${majorPct}% - 1px), rgba(0,0,0,.6) calc(${majorPct}% - 1px), rgba(0,0,0,.6) ${majorPct}%)`;
    // major 全高 + minor 只占顶部 50% (JS background-size: 100% 100%, 100% 50%)
    this.hpTicks.style.backgroundImage = `${majorBg}, ${minorBg}`;
    this.hpTicks.style.backgroundSize = '100% 100%, 100% 50%';
    this.hpTicks.style.backgroundPosition = '0 0, 0 0';
    this.hpTicks.style.backgroundRepeat = 'no-repeat, no-repeat';
  }

  /** sprite 在 hop/attack 时位移, 但 DOM 不动 (JS .scene-turtle 不动, 只 .st-body 动) */
  // 不需要 per-frame sync — DOM 固定在 sprite home

  destroy() {
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  setVisible(v: boolean) {
    this.root.style.display = v ? 'flex' : 'none';
  }
}
