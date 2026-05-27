// ══════════════════════════════════════════════════════════
// BenchRail — 装备席 rail, 双方各一条, 1:1 复刻 JS index.html:467-468 +
// battle.css:2617-2670 .equip-bench-rail / .bench-slot
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:467-468):
//   <div class="equip-bench-rail left"  id="benchRailLeft"  aria-label="我方装备席"></div>
//   <div class="equip-bench-rail right" id="benchRailRight" aria-label="敌方装备席"></div>
//
// JS CSS (battle.css:2621-2670 + :root 8-25 1:1):
//   .equip-bench-rail{
//     position:absolute; top:50%; transform:translateY(-50%);
//     width: var(--bench-rail-width);
//     display:flex; flex-direction:column;
//     gap: var(--bench-slot-gap);
//     padding: var(--bench-rail-pad-v) var(--bench-rail-pad-h);
//     background:rgba(10,14,24,.55);
//     border:1px solid rgba(255,255,255,.1);
//     border-radius:8px;
//     z-index:6;
//     pointer-events:none;        // 整 rail 不吃点击, 只有 filled 槽
//   }
//   .equip-bench-rail.left{  left:  var(--bench-rail-margin); }
//   .equip-bench-rail.right{ right: var(--bench-rail-margin); }
//   .equip-bench-rail.locked{ opacity:.55; filter:grayscale(.4); }
//
//   .bench-slot{
//     width: var(--bench-slot-size); height: var(--bench-slot-size);
//     border-radius:6px;
//     background:rgba(255,255,255,.04);
//     border:1px solid rgba(255,255,255,.08);
//     display:flex; align-items:center; justify-content:center;
//     position:relative;
//     user-select:none; touch-action:none;
//   }
//   .bench-slot.empty{ background:rgba(255,255,255,.02); pointer-events:none; }
//   .bench-slot.filled{
//     background:rgba(255,217,102,.08);
//     border-color:rgba(255,217,102,.35);
//     cursor:grab;
//     box-shadow:inset 0 0 0 1px rgba(255,217,102,.15);
//     pointer-events:auto;
//   }
//   .equip-bench-rail:not(.locked) .bench-slot.filled:hover{
//     background:rgba(255,217,102,.18); border-color:#ffd966;
//     transform:scale(1.06); transition:transform .12s ease;
//   }
//   .bench-slot img{ width:38px; height:38px; image-rendering:pixelated; pointer-events:none; }
//   .bench-slot .bench-emoji{ font-size:28px; line-height:1; pointer-events:none; }
//
// PHASER DIVERGENCE:
//   - position:absolute (JS 父 #screenBattle relative) → position:fixed (poc canvas)
//     视觉等效, 都以 viewport 50% 锚定
//   - 装备图标路径 JS "assets/equip/xxx.png" → poc "equip/xxx.png" (Vite public/)
//   - 拖拽 (bench.js drag-drop) 暂未接, 点击 filled 槽走 onSlotClick callback
//     (上层 BattleScene 弹 picker 选目标)
import Phaser from 'phaser';
import type { EquipmentDef } from '../types';
import { getEquipStatLine } from '../systems/equip-stats';

const SLOTS_PER_RAIL = 10;  // JS :root --bench-slot-count:10

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* JS battle.css:2621-2670 1:1 — 使用 BattleStatsRail 已定义的 --poc-bench-* 变量 */
    .poc-equip-bench-rail {
      position: fixed; top: 50%; transform: translateY(-50%);
      width: var(--poc-bench-rail-width);
      display: flex; flex-direction: column;
      gap: var(--poc-bench-slot-gap);
      padding: var(--poc-bench-rail-pad-v) var(--poc-bench-rail-pad-h);
      /* Steam 风格装备托盘: 木/金属渐变框 + 金边 + 内阴影 */
      background: linear-gradient(180deg, rgba(34,28,20,.92), rgba(20,16,12,.94));
      border: 2px solid #6b5430;
      border-radius: 12px;
      box-shadow: 0 0 0 1px rgba(255,216,107,.18), 0 6px 18px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08);
      z-index: 6;
      pointer-events: none;
      box-sizing: border-box;
      font-family: 'm6x11','pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    .poc-equip-bench-rail.poc-bench-left  { left:  var(--poc-bench-rail-margin); }
    .poc-equip-bench-rail.poc-bench-right { right: var(--poc-bench-rail-margin); }
    .poc-equip-bench-rail.poc-bench-locked { opacity: .55; filter: grayscale(.4); }
    .poc-equip-bench-rail.poc-bench-locked .poc-bench-slot.filled { cursor: not-allowed; }
    .poc-bench-slot {
      width: var(--poc-bench-slot-size); height: var(--poc-bench-slot-size);
      border-radius: 9px;
      /* 凹槽: 暗底 + 内阴影 (Steam 物品格) */
      background: radial-gradient(circle at 50% 38%, rgba(0,0,0,.25), rgba(0,0,0,.5));
      border: 2px solid rgba(0,0,0,.45);
      box-shadow: inset 0 2px 5px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.05);
      display: flex; align-items: center; justify-content: center;
      position: relative;
      user-select: none; -webkit-user-select: none;
      touch-action: none;
      box-sizing: border-box;
    }
    .poc-bench-slot.empty { opacity: .85; pointer-events: none; }
    .poc-bench-slot.filled {
      background: radial-gradient(circle at 50% 35%, rgba(255,217,102,.18), rgba(40,30,12,.5));
      border-color: #ffd966;
      cursor: grab;
      box-shadow: inset 0 0 8px rgba(255,217,102,.25), 0 0 8px rgba(255,217,102,.3);
      pointer-events: auto;
    }
    .poc-equip-bench-rail:not(.poc-bench-locked) .poc-bench-slot.filled:hover {
      border-color: #fff3a0;
      transform: scale(1.08);
      box-shadow: inset 0 0 8px rgba(255,217,102,.35), 0 0 14px rgba(255,216,107,.55);
      transition: transform .12s ease;
    }
    .poc-bench-slot img {
      /* 随 --poc-ui-scale (BattleStatsRail :root 定义) 等比缩放, 跟槽位大小同步 */
      width: calc(41px * var(--poc-ui-scale, 1)); height: calc(41px * var(--poc-ui-scale, 1));
      image-rendering: pixelated;
      pointer-events: none;
    }
    .poc-bench-slot .bench-emoji {
      font-size: calc(30px * var(--poc-ui-scale, 1)); line-height: 1; pointer-events: none;
    }
  `;
  document.head.appendChild(st);
}

export interface BenchRailHandlers {
  onSlotClick: (side: 'left' | 'right', index: number, eq: EquipmentDef) => void;
  /** P220 拖拽 (1:1 JS bench.js): 拖动中每帧报当前指针屏幕坐标, 上层据此高亮可/不可放置的龟。
   *  返回 'valid' / 'invalid' / null (未悬停在龟上) 供 ghost 视觉反馈。 */
  onDragMove?: (side: 'left' | 'right', eq: EquipmentDef, screenX: number, screenY: number) => 'valid' | 'invalid' | null;
  /** 松手: 在屏幕坐标处尝试装备/使用。返回 true=已装备(从席移除), false=弹回。 */
  onDragDrop?: (side: 'left' | 'right', index: number, eq: EquipmentDef, screenX: number, screenY: number) => boolean;
}

export class BenchRail {
  private railL: HTMLDivElement | null = null;
  private railR: HTMLDivElement | null = null;
  private handlers: BenchRailHandlers;
  private locked: { left: boolean; right: boolean } = { left: false, right: false };

  constructor(scene: Phaser.Scene, handlers: BenchRailHandlers) {
    installCss();
    this.handlers = handlers;
    this.railL = this.mkRail('left',  '我方装备席');
    this.railR = this.mkRail('right', '敌方装备席');

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  private mkRail(side: 'left' | 'right', aria: string): HTMLDivElement {
    const rail = document.createElement('div');
    rail.className = `poc-equip-bench-rail poc-bench-${side}`;
    rail.setAttribute('aria-label', aria);
    // 10 个空槽预创建 — render 时只改内容, DOM 节点不动 (减少重建抖动)
    for (let i = 0; i < SLOTS_PER_RAIL; i++) {
      const slot = document.createElement('div');
      slot.className = 'poc-bench-slot empty';
      slot.dataset.index = String(i);
      rail.appendChild(slot);
    }
    document.body.appendChild(rail);
    return rail;
  }

  /** 渲染一侧的 bench. eq 为 null/undefined 的位置显示空槽. */
  render(side: 'left' | 'right', items: (EquipmentDef | undefined | null)[]) {
    const rail = side === 'left' ? this.railL : this.railR;
    if (!rail) return;
    const slots = rail.querySelectorAll<HTMLDivElement>('.poc-bench-slot');
    for (let i = 0; i < SLOTS_PER_RAIL; i++) {
      const slot = slots[i];
      const eq = items[i] ?? null;
      slot.innerHTML = '';
      if (eq) {
        slot.className = 'poc-bench-slot filled';
        slot.title = `${eq.name} — 点击装备\n${getEquipStatLine(eq.id, null)}`;
        if (eq.icon && eq.icon.endsWith('.png')) {
          const img = document.createElement('img');
          img.src = eq.icon;  // JS 'equip/dungeon-xxx.png' 同款
          img.alt = eq.name;
          // 防止 404 自动隐藏 (跟 TurtlePicker 同款防护)
          img.onerror = () => { img.style.display = 'none'; };
          slot.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.className = 'bench-emoji';
          span.textContent = eq.icon ?? '📦';
          slot.appendChild(span);
        }
        slot.title = `${eq.name} — 拖到龟身上装备 (或点击选目标)\n${getEquipStatLine(eq.id, null)}`;
        slot.onclick = null;
        slot.onpointerdown = (e) => this.startDrag(side, i, eq, e);
      } else {
        slot.className = 'poc-bench-slot empty';
        slot.title = '';
        slot.onclick = null;
        slot.onpointerdown = null;
      }
    }
  }

  /** 锁定 (JS .equip-bench-rail.locked: opacity .55 grayscale .4, filled 不可点) */
  setLocked(side: 'left' | 'right', locked: boolean) {
    this.locked[side] = locked;
    const rail = side === 'left' ? this.railL : this.railR;
    if (!rail) return;
    rail.classList.toggle('poc-bench-locked', locked);
  }

  // ── P220 拖拽 (1:1 JS bench.js startBenchDrag/dragMove/drop) ──────────
  private dragGhost: HTMLDivElement | null = null;

  private startDrag(side: 'left' | 'right', index: number, eq: EquipmentDef, ev: PointerEvent) {
    if (this.locked[side]) return;
    ev.preventDefault();
    const startX = ev.clientX, startY = ev.clientY;
    let dragging = false;
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;opacity:.9;transform:translate(-50%,-50%);background:rgba(10,14,24,.85);border:2px solid #ffd966;transition:border-color .1s';
    if (eq.icon && eq.icon.endsWith('.png')) {
      const img = document.createElement('img');
      img.src = eq.icon; img.style.cssText = 'width:38px;height:38px;image-rendering:pixelated'; ghost.appendChild(img);
    } else {
      ghost.textContent = eq.icon ?? '📦'; ghost.style.fontSize = '28px';
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
        dragging = true;
        if (!this.dragGhost) { this.dragGhost = ghost; document.body.appendChild(ghost); }
      }
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      const verdict = this.handlers.onDragMove?.(side, eq, e.clientX, e.clientY) ?? null;
      ghost.style.borderColor = verdict === 'valid' ? '#06d6a0' : verdict === 'invalid' ? '#ff5050' : '#ffd966';
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (this.dragGhost) { this.dragGhost.remove(); this.dragGhost = null; }
      if (dragging) {
        this.handlers.onDragDrop?.(side, index, eq, e.clientX, e.clientY);
      } else {
        // 未移动 = 点击回退 (弹目标 picker)
        this.handlers.onSlotClick(side, index, eq);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  destroy() {
    if (this.dragGhost) { this.dragGhost.remove(); this.dragGhost = null; }
    if (this.railL?.parentNode) this.railL.parentNode.removeChild(this.railL);
    if (this.railR?.parentNode) this.railR.parentNode.removeChild(this.railR);
    this.railL = this.railR = null;
  }
}
