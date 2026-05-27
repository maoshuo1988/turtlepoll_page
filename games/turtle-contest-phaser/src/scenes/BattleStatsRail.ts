// ══════════════════════════════════════════════════════════
// BattleStatsRail — 深海币 pill + 羁绊 chip 竖排, 双方各一组
// 1:1 复刻 JS index.html:372-377 + battle.css:8-25,37-56,175-208
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:372-377):
//   <div class="deep-coin-pill deep-coin-left"  id="deepCoinLeft" ><img ...> <span id="deepCoinLeftVal">0</span></div>
//   <div class="deep-coin-pill deep-coin-right" id="deepCoinRight"><img ...> <span id="deepCoinRightVal">0</span></div>
//   <div class="synergy-bar synergy-bar-left"  id="synergyBarLeft"></div>
//   <div class="synergy-bar synergy-bar-right" id="synergyBarRight"></div>
//
// JS CSS (battle.css:8-25 坐标变量, 37-56 deep-coin, 175-208 synergy):
//   :root{
//     --bench-slot-size:48px; --bench-slot-gap:6px; --bench-slot-count:10;
//     --bench-rail-pad-v:8px; --bench-rail-pad-h:6px;
//     --bench-rail-margin:6px; --bench-rail-width:60px;
//     --bench-rail-height: calc(count*size + (count-1)*gap + pad-v*2);  // = 550px
//     --bench-rail-half:   calc(--bench-rail-height / 2);                 // = 275px
//     --stats-offset-x:    calc(--bench-rail-margin + --bench-rail-width + 8px);  // = 74px
//     --stats-synergy-gap: 58px;
//   }
//   .deep-coin-pill{
//     position:absolute; top:calc(50% - var(--bench-rail-half)); z-index:45;
//     background:linear-gradient(135deg, rgba(20,90,150,.92), rgba(10,40,80,.92));
//     border:2px solid #58d3ff; color:#aef0ff;
//     font-size:18px; font-weight:800;
//     padding:8px 16px; border-radius:18px;
//     box-shadow:0 0 10px rgba(88,211,255,.5), inset 0 0 8px rgba(88,211,255,.25);
//     user-select:none; pointer-events:none;
//     transition:transform .15s ease, box-shadow .15s ease;
//     white-space: nowrap;
//   }
//   .deep-coin-pill.deep-coin-pulse{ transform:scale(1.18); box-shadow:0 0 14px rgba(88,211,255,.7), inset 0 0 8px rgba(88,211,255,.4); }
//   .deep-coin-left { left: var(--stats-offset-x); }
//   .deep-coin-right{ right: var(--stats-offset-x); }
//
//   .synergy-bar{
//     position:absolute;
//     top: calc(50% - var(--bench-rail-half) + var(--stats-synergy-gap));
//     z-index:44;
//     display:flex; flex-direction:column; gap:10px; pointer-events:auto;
//   }
//   .synergy-bar-left  { left: var(--stats-offset-x); align-items:flex-start; }
//   .synergy-bar-right { right: var(--stats-offset-x); align-items:flex-end; }
//   .synergy-bar .synergy-chip{ min-height:30px; box-sizing:border-box; }
//   .synergy-chip{
//     display:inline-flex; align-items:center; gap:5px;
//     padding:5px 12px; border-radius:14px;
//     font-size:15px; font-weight:800;
//     border:1.5px solid rgba(255,255,255,.25);
//     cursor:help; user-select:none;
//     background:rgba(20,30,45,.85);
//     box-shadow:0 2px 6px rgba(0,0,0,.4);
//   }
//   .synergy-chip-t2{ background:linear-gradient(135deg, rgba(80,80,90,.85), rgba(50,50,60,.85)); color:#cfd2dc; }
//   .synergy-chip-t3{ background:linear-gradient(135deg, rgba(220,180,40,.85), rgba(180,130,20,.85));
//                     color:#fff; border-color:#ffe066; box-shadow:0 0 5px rgba(255,220,80,.6); }
//
// PHASER DIVERGENCE:
//   - JS deep-coin/synergy 坐标依赖 #screenBattle 父容器 position:relative (top/left%
//     基于父); poc 用 position:fixed (canvas 全屏), 同 50% 基准跟 viewport 锚定 → 视觉相同.
//   - 图片路径 "assets/battle/deep-coin.png" → "battle/deep-coin.png" (Vite public/ 直挂根)
//   - 点击 synergy chip 弹 detail modal: 暂走 onClick callback (上层 showCenterBanner),
//     待后续完整 modal 接入 (JS showSynergyDetail 还原)
import Phaser from 'phaser';
import { SYNERGY_TAGS, type ActiveSynergy } from '../data/synergies';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* 坐标变量 — v0.9.9: 全部随视口高度等比缩放 (像画布一样跟分辨率走)。
       --poc-ui-scale = 视口高 / 720(画布基准高), clamp 防极端: 矮屏 0.8↓ / 4K 1.7↑。
       基准值按"设计 720 高"取, ×scale 后: 1080p≈1.5× → 槽 78px(达到用户要的 1.6× 视觉),
       760 窗口≈1.06× → 槽 55px, 720 → 52px。因 rail 永远是视口高的固定比例 (~83%),
       所以任何分辨率都放得下、深海币/羁绊不会被挤出屏 → 彻底解决固定 px 溢出问题。 */
    :root {
      /* --poc-ui-scale 由 JS 按 视口高/720 实时计算并写入 (CSS calc 无法从 vh 得无单位比值);
         见 BattleStatsRail.updateUiScale + resize 监听。fallback 1 保证未初始化时不崩。 */
      --poc-ui-scale: 1;
      --poc-bench-slot-size: calc(52px * var(--poc-ui-scale));
      --poc-bench-slot-gap:  calc(7px  * var(--poc-ui-scale));
      --poc-bench-slot-count: 10;
      --poc-bench-rail-pad-v: calc(9px * var(--poc-ui-scale));
      --poc-bench-rail-pad-h: calc(9px * var(--poc-ui-scale));
      --poc-bench-rail-margin: 6px;
      --poc-bench-rail-width: calc(72px * var(--poc-ui-scale));
      --poc-bench-rail-height:
        calc(var(--poc-bench-slot-count) * var(--poc-bench-slot-size)
             + (var(--poc-bench-slot-count) - 1) * var(--poc-bench-slot-gap)
             + var(--poc-bench-rail-pad-v) * 2);
      --poc-bench-rail-half: calc(var(--poc-bench-rail-height) / 2);
      --poc-stats-offset-x: calc(var(--poc-bench-rail-margin) + var(--poc-bench-rail-width) + 8px);
      --poc-stats-synergy-gap: calc(40px * var(--poc-ui-scale));
    }
    /* deep-coin pill — 放大 + Steam 风金属深海币章 */
    .poc-deep-coin-pill {
      position: fixed;
      top: calc(50% - var(--poc-bench-rail-half));
      z-index: 45;
      display: inline-flex; align-items: center; gap: calc(5px * var(--poc-ui-scale));
      background: linear-gradient(135deg, rgba(28,118,190,.95), rgba(8,46,92,.96));
      border: 3px solid #58d3ff;
      color: #cdf3ff;
      font-size: calc(18px * var(--poc-ui-scale)); font-weight: 900;
      padding: calc(7px * var(--poc-ui-scale)) calc(15px * var(--poc-ui-scale));
      border-radius: calc(18px * var(--poc-ui-scale));
      letter-spacing: .5px;
      text-shadow: 0 0 8px rgba(88,211,255,.6), 0 1px 2px rgba(0,0,0,.6);
      box-shadow:
        0 0 16px rgba(88,211,255,.55),
        inset 0 1px 0 rgba(255,255,255,.35),
        inset 0 -3px 8px rgba(0,20,45,.7);
      font-family: 'm6x11','pixel-zh', 'Microsoft YaHei', sans-serif;
      user-select: none; pointer-events: none;
      transition: transform .15s ease, box-shadow .15s ease;
      white-space: nowrap;
    }
    .poc-deep-coin-pill.deep-coin-pulse {
      transform: scale(1.18);
      box-shadow: 0 0 22px rgba(88,211,255,.85), inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 8px rgba(0,20,45,.7);
    }
    .poc-deep-coin-left  { left:  var(--poc-stats-offset-x); }
    .poc-deep-coin-right { right: var(--poc-stats-offset-x); }
    .poc-deep-coin-pill img {
      width: calc(20px * var(--poc-ui-scale)); height: calc(20px * var(--poc-ui-scale));
      vertical-align: middle;
      image-rendering: pixelated;
      filter: drop-shadow(0 0 4px rgba(88,211,255,.7));
    }
    /* JS battle.css:175-208 1:1 — synergy bar 竖排 */
    .poc-synergy-bar {
      position: fixed;
      top: calc(50% - var(--poc-bench-rail-half) + var(--poc-stats-synergy-gap));
      z-index: 44;
      display: flex; flex-direction: column; gap: calc(8px * var(--poc-ui-scale));
      pointer-events: auto;
      font-family: 'pixel-zh', 'Microsoft YaHei', sans-serif;
    }
    .poc-synergy-bar-left  { left:  var(--poc-stats-offset-x); align-items: flex-start; }
    .poc-synergy-bar-right { right: var(--poc-stats-offset-x); align-items: flex-end; }
    /* v0.9.9 #2: TFT 风羁绊徽章 — 大图标(×2.5, base 50px) + 银/金金属框 + ×N 角标。
       t2=银色, t3=金色 (对齐 TFT 等级配色)。 */
    .poc-synergy-bar .poc-synergy-chip { min-height: calc(58px * var(--poc-ui-scale)); box-sizing: border-box; }
    .poc-synergy-chip {
      position: relative;
      display: inline-flex; align-items: center; gap: calc(7px * var(--poc-ui-scale));
      padding: calc(5px * var(--poc-ui-scale)) calc(13px * var(--poc-ui-scale)) calc(5px * var(--poc-ui-scale)) calc(6px * var(--poc-ui-scale));
      border-radius: calc(14px * var(--poc-ui-scale));
      font-weight: 900;
      border: 2px solid rgba(255,255,255,.3);
      cursor: help; user-select: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 3px 10px rgba(0,0,0,.55);
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .poc-synergy-chip:hover { transform: scale(1.08); }
    /* t2 银色金属 */
    .poc-synergy-chip-t2 {
      background: linear-gradient(135deg, #e9edf5 0%, #b9c2d2 42%, #8c95a8 100%);
      color: #1a2030;
      border-color: #f2f5fb;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 0 9px rgba(200,212,235,.55), 0 3px 9px rgba(0,0,0,.5);
    }
    /* t3 金色金属 */
    .poc-synergy-chip-t3 {
      background: linear-gradient(135deg, #ffe9a0 0%, #f4c33c 42%, #c98e1c 100%);
      color: #3a2606;
      border-color: #ffe066;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 0 14px rgba(255,210,70,.8), 0 3px 9px rgba(0,0,0,.5);
    }
    .poc-synergy-chip-icon {
      /* 高度固定、宽度 auto 保持原图长宽比 (之前固定 50×50 把非方标签图压扁了, 用户报) */
      height: calc(50px * var(--poc-ui-scale)); width: auto;
      image-rendering: pixelated;
      pointer-events: none;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,.6));
    }
    .poc-synergy-chip-tag  { font-size: calc(44px * var(--poc-ui-scale)); line-height: 1; }
    .poc-synergy-chip-tier {
      font-size: calc(20px * var(--poc-ui-scale)); font-weight: 900;
      text-shadow: 0 1px 2px rgba(255,255,255,.4);
    }
  `;
  document.head.appendChild(st);
}

export interface BattleStatsRailHandlers {
  onSynergyClick: (tag: string, tier: 2 | 3) => void;
}

export class BattleStatsRail {
  private coinPillL: HTMLDivElement | null = null;
  private coinPillR: HTMLDivElement | null = null;
  private synergyL: HTMLDivElement | null = null;
  private synergyR: HTMLDivElement | null = null;
  private coinValL: HTMLSpanElement | null = null;
  private coinValR: HTMLSpanElement | null = null;
  private handlers: BattleStatsRailHandlers;

  constructor(scene: Phaser.Scene, handlers: BattleStatsRailHandlers) {
    installCss();
    this.handlers = handlers;
    // v0.9.9: 写入 --poc-ui-scale 并随窗口变化更新 (装备席/深海币/羁绊随分辨率等比缩放)
    BattleStatsRail.updateUiScale();
    window.addEventListener('resize', BattleStatsRail.updateUiScale);
    // deep-coin pill — JS index.html:373-374 1:1
    this.coinPillL = this.mkCoinPill('left',  '我方深海币');
    this.coinPillR = this.mkCoinPill('right', '敌方深海币');
    this.coinValL = this.coinPillL.querySelector<HTMLSpanElement>('.deep-coin-val');
    this.coinValR = this.coinPillR.querySelector<HTMLSpanElement>('.deep-coin-val');
    // synergy bar — JS index.html:376-377 1:1
    this.synergyL = this.mkSynergyBar('left');
    this.synergyR = this.mkSynergyBar('right');

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  /** 视口高/720(画布基准高) → 无单位 UI 缩放比, clamp[0.8,1.7] 防极端。
   *  rail 永远是视口高的固定比例 (~83%) → 任何分辨率放得下, 深海币/羁绊不出屏。 */
  static updateUiScale = () => {
    const scale = Math.max(0.8, Math.min(1.7, window.innerHeight / 720));
    document.documentElement.style.setProperty('--poc-ui-scale', String(scale));
  };

  private mkCoinPill(side: 'left' | 'right', title: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `poc-deep-coin-pill poc-deep-coin-${side}`;
    el.title = title;
    el.innerHTML = `<img src="battle/deep-coin.png" alt="深海币"> <span class="deep-coin-val">0</span>`;
    document.body.appendChild(el);
    return el;
  }

  private mkSynergyBar(side: 'left' | 'right'): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `poc-synergy-bar poc-synergy-bar-${side}`;
    document.body.appendChild(el);
    return el;
  }

  private _coinRaf: { left?: number; right?: number } = {};
  setDeepCoin(side: 'left' | 'right', val: number, pulse = false) {
    const span = side === 'left' ? this.coinValL : this.coinValR;
    const pill = side === 'left' ? this.coinPillL : this.coinPillR;
    if (span) {
      // 阶段3: count-up 滚动跳数 (从当前显示值缓动到 val, ~420ms), 而非瞬切
      const from = parseInt(span.textContent || '0', 10) || 0;
      if (this._coinRaf[side]) cancelAnimationFrame(this._coinRaf[side]!);
      if (from === val) { span.textContent = String(val); }
      else {
        const start = performance.now(), dur = 420;
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const e = 1 - Math.pow(1 - p, 3);   // easeOutCubic
          span.textContent = String(Math.round(from + (val - from) * e));
          if (p < 1) this._coinRaf[side] = requestAnimationFrame(step);
          else { span.textContent = String(val); this._coinRaf[side] = undefined; }
        };
        this._coinRaf[side] = requestAnimationFrame(step);
      }
    }
    if (pulse && pill) {
      pill.classList.add('deep-coin-pulse');
      setTimeout(() => pill.classList.remove('deep-coin-pulse'), 220);
    }
  }

  /** 渲染 side 的羁绊 chip 列 — JS synergies.js:312-332 1:1 */
  renderSynergy(side: 'left' | 'right', synergies: ActiveSynergy[]) {
    const bar = side === 'left' ? this.synergyL : this.synergyR;
    if (!bar) return;
    bar.innerHTML = synergies.map(s => {
      const cfg = SYNERGY_TAGS[s.tag];
      if (!cfg) return '';
      const tier = s.tier;
      // 羁绊图标 (assets/tags/<tag>标签.png → public/tags/) 替换 emoji; 404 时 onerror 回退 emoji
      const iconSrc = `tags/${s.tag}标签.png`;
      return `<span class="poc-synergy-chip poc-synergy-chip-t${tier}" data-tag="${s.tag}" data-tier="${tier}" title="${cfg.name} ×${tier} (点击查看详情)">
        <img class="poc-synergy-chip-icon" src="${iconSrc}" alt="${cfg.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'poc-synergy-chip-tag',textContent:'${cfg.emoji ?? ''}'}))">
        <span class="poc-synergy-chip-tier">×${tier}</span>
      </span>`;
    }).join('');
    bar.querySelectorAll<HTMLSpanElement>('.poc-synergy-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag ?? '';
        const tier = (parseInt(chip.dataset.tier ?? '2', 10) as 2 | 3);
        this.handlers.onSynergyClick(tag, tier);
      });
    });
  }

  destroy() {
    window.removeEventListener('resize', BattleStatsRail.updateUiScale);
    for (const el of [this.coinPillL, this.coinPillR, this.synergyL, this.synergyR]) {
      if (el?.parentNode) el.parentNode.removeChild(el);
    }
    this.coinPillL = this.coinPillR = this.synergyL = this.synergyR = null;
    this.coinValL = this.coinValR = null;
  }
}
