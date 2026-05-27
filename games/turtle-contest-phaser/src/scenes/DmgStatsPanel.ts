// ══════════════════════════════════════════════════════════
// DmgStatsPanel — DOM overlay, 1:1 复刻 JS ui.js:1349-1408 + battle.css:608-642
// ══════════════════════════════════════════════════════════
// JS 结构:
//   .dmg-stats-panel (position:absolute top:40 left:6 width:360 max-h:300)
//     .ds-tabs > .ds-tab (⚔/🛡 切换)
//     .ds-columns > 2× .ds-col (我方/敌方)
//       .ds-col-label
//       N× .ds-row (.ds-left/.ds-right .ds-dead)
//         .ds-top: .ds-name + .ds-val
//         .ds-bar-wrap: 3× .ds-bar (.ds-bar-normal/magic/true, absolute 叠加)
//
// PoC 之前用 Phaser canvas rectangles+text 渲染 — 用户报"排版怎么回事".
// 改 DOM overlay 1:1 JS HTML 输出.
import Phaser from 'phaser';
import { battleStats, type FighterStats } from '../systems/battle-stats';
import { bus } from '../systems/bus';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* P100 1:1 JS battle.css:608-642 .dmg-stats-panel */
    #poc-dmg-stats-panel {
      position: fixed; top: 56px; left: 12px;
      background: linear-gradient(180deg, rgba(20,26,38,.96), rgba(10,14,22,.97));
      backdrop-filter: blur(8px);
      border-radius: 16px;
      padding: 12px 16px;
      border: 2px solid #6b5430;
      box-shadow: inset 0 1px 0 rgba(255,216,107,.12), 0 6px 22px rgba(0,0,0,.6);
      width: 540px; max-height: 76vh;
      overflow-y: auto;
      font-size: 14px;
      z-index: 200;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #e6edf3;
      display: none;
    }
    #poc-dmg-stats-panel.show { display: block; }
    #poc-dmg-stats-panel .dmg-stats-header {
      font-size: 17px; font-weight: 700;
      color: #ffd86b; margin-bottom: 8px;
      display: flex; justify-content: space-between; align-items: center;
      text-shadow: 0 1px 2px rgba(0,0,0,.5);
    }
    #poc-dmg-stats-panel .dmg-close {
      cursor: pointer; font-size: 22px; color: #8b949e;
      padding: 4px 10px; border-radius: 8px;
      min-width: 40px; min-height: 40px;
      display: inline-flex; align-items: center; justify-content: center;
      line-height: 1; border: none; background: transparent;
    }
    #poc-dmg-stats-panel .dmg-close:hover { color: #e6edf3; background: rgba(255,255,255,.08); }
    #poc-dmg-stats-panel .ds-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
    #poc-dmg-stats-panel .ds-tab {
      flex: 1; padding: 8px 0; border: 1px solid rgba(255,255,255,.08); border-radius: 8px;
      background: rgba(255,255,255,.05); color: #8b949e;
      font-size: 14px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: .15s;
    }
    #poc-dmg-stats-panel .ds-tab:hover { background: rgba(255,255,255,.1); }
    #poc-dmg-stats-panel .ds-tab.active {
      background: linear-gradient(180deg, #6db3ff, #3d82e0);
      color: #fff; border-color: #8fc4ff;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
    }
    #poc-dmg-stats-panel .ds-columns { display: flex; gap: 12px; }
    #poc-dmg-stats-panel .ds-col { flex: 1; min-width: 0; }
    #poc-dmg-stats-panel .ds-col-label {
      font-size: 13px; font-weight: 700; color: #c9d1d9;
      margin-bottom: 4px; text-align: center;
    }
    #poc-dmg-stats-panel .ds-row {
      display: flex; flex-direction: column; gap: 3px;
      padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04);
    }
    #poc-dmg-stats-panel .ds-row:last-child { border-bottom: none; }
    #poc-dmg-stats-panel .ds-row.ds-dead { opacity: .4; }
    #poc-dmg-stats-panel .ds-top {
      display: flex; justify-content: space-between; align-items: center;
    }
    #poc-dmg-stats-panel .ds-name {
      font-size: 15px; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #poc-dmg-stats-panel .ds-row.ds-left  .ds-name { color: #06d6a0; }
    #poc-dmg-stats-panel .ds-row.ds-right .ds-name { color: #ff6b6b; }
    #poc-dmg-stats-panel .ds-val { font-size: 14px; font-weight: 700; color: #e6edf3; }
    #poc-dmg-stats-panel .ds-bar-wrap {
      height: 12px; background: rgba(255,255,255,.05);
      border-radius: 4px; overflow: hidden; position: relative;
    }
    #poc-dmg-stats-panel .ds-bar {
      height: 100%; border-radius: 3px;
      transition: width .4s ease;
      min-width: 0; position: absolute; top: 0;
    }
    #poc-dmg-stats-panel .ds-bar-normal { background: rgba(255,68,68,.6); left: 0; }
    #poc-dmg-stats-panel .ds-bar-magic  { background: rgba(77,171,247,.6); }
    #poc-dmg-stats-panel .ds-bar-true   { background: rgba(255,255,255,.6); }
    #poc-dmg-stats-panel .ds-bar-heal   { background: rgba(6,214,160,.65); left: 0; }
    #poc-dmg-stats-panel .ds-bar-shield { background: rgba(88,211,255,.6); left: 0; }
  `;
  document.head.appendChild(st);
}

type StatsTab = 'dealt' | 'taken' | 'heal' | 'shield';

export class DmgStatsPanel {
  private root: HTMLDivElement | null = null;
  private tab: StatsTab = 'dealt';
  private visible = false;
  private _refreshPending = false;
  private _busUnsub?: () => void;

  constructor(scene: Phaser.Scene) {
    installCss();
    const root = document.createElement('div');
    root.id = 'poc-dmg-stats-panel';
    document.body.appendChild(root);
    this.root = root;
    this.render();

    // 实时刷新 (JS stats_tracker.js:33 stats:updated 同款, 60ms throttle)
    const handler = () => {
      if (!this.visible || this._refreshPending) return;
      this._refreshPending = true;
      scene.time.delayedCall(60, () => {
        this._refreshPending = false;
        if (this.visible) this.render();
      });
    };
    bus.on('stats:updated', handler);
    this._busUnsub = () => bus.off('stats:updated', handler);

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.root) this.root.classList.toggle('show', this.visible);
    if (this.visible) this.render();
  }
  setVisible(v: boolean): void {
    this.visible = v;
    if (this.root) this.root.classList.toggle('show', v);
    if (v) this.render();
  }
  isVisible(): boolean { return this.visible; }

  /** 当前 tab 取哪个累计字段 */
  private valKeyOf(): keyof FighterStats {
    switch (this.tab) {
      case 'taken':  return 'dmgTaken';
      case 'heal':   return 'healDone';
      case 'shield': return 'shieldGained';
      default:       return 'dmgDealt';
    }
  }

  private render(): void {
    if (!this.root) return;
    const valKey = this.valKeyOf();
    const val = (s: FighterStats) => (s[valKey] as number) ?? 0;
    // 排序: 各列按当前 tab 值降序 (对齐 JS updateDmgStats sort b-a); 初始全 0 时保持登记顺序
    const sortDesc = (arr: FighterStats[]) => [...arr].sort((a, b) => val(b) - val(a));
    // 中立生物(treasure_golem/训龟大师 等)虽被分到左/右, 但不属任一玩家队伍 → 从战绩面板排除,
    //   否则它的伤害会污染所在那一侧的玩家统计 (用户报"中立伤害没分边")。
    const left = sortDesc(battleStats.bySide('left').filter(s => !s.isNeutral));
    const right = sortDesc(battleStats.bySide('right').filter(s => !s.isNeutral));
    const leftMax = Math.max(1, ...left.map(val));
    const rightMax = Math.max(1, ...right.map(val));

    const renderRow = (s: FighterStats, max: number): string => {
      const total = val(s);
      const sideCls = s.side === 'left' ? 'ds-left' : 'ds-right';
      const deadCls = ((s as unknown as Record<string, boolean>)['alive'] === false) ? 'ds-dead' : '';
      let bars: string;
      if (this.tab === 'dealt' || this.tab === 'taken') {
        // 伤害: 物理/法术/真实(含DoT) 三色叠加 bar
        const bd = this.tab === 'dealt' ? s.dmgDealtByType : s.dmgTakenByType;
        const phys = bd.phy ?? 0, magic = bd.mag ?? 0, tru = (bd.tru ?? 0) + (bd.dot ?? 0);
        const physPct  = total > 0 ? (phys  / max) * 100 : 0;
        const magicPct = total > 0 ? (magic / max) * 100 : 0;
        const truePct  = total > 0 ? (tru   / max) * 100 : 0;
        bars = `<div class="ds-bar ds-bar-normal" style="width:${physPct}%"></div>
          <div class="ds-bar ds-bar-magic"  style="width:${magicPct}%;left:${physPct}%"></div>
          <div class="ds-bar ds-bar-true"   style="width:${truePct}%;left:${physPct + magicPct}%"></div>`;
      } else {
        // 治疗/护盾: 单色 bar
        const pct = total > 0 ? (total / max) * 100 : 0;
        const barCls = this.tab === 'heal' ? 'ds-bar-heal' : 'ds-bar-shield';
        bars = `<div class="ds-bar ${barCls}" style="width:${pct}%"></div>`;
      }
      return `<div class="ds-row ${sideCls} ${deadCls}">
        <div class="ds-top"><div class="ds-name">${s.name}</div><div class="ds-val">${total}</div></div>
        <div class="ds-bar-wrap">${bars}</div>
      </div>`;
    };

    const TABS: Array<{ key: StatsTab; label: string }> = [
      { key: 'dealt',  label: '⚔ 造成' },
      { key: 'taken',  label: '🛡 承受' },
      { key: 'heal',   label: '💚 治疗' },
      { key: 'shield', label: '🔵 护盾' },
    ];
    this.root.innerHTML = `
      <div class="dmg-stats-header">
        <span>📊 战斗统计</span>
        <button class="dmg-close" data-act="close">×</button>
      </div>
      <div class="ds-tabs">
        ${TABS.map(t => `<button class="ds-tab ${this.tab === t.key ? 'active' : ''}" data-act="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div class="ds-columns">
        <div class="ds-col">
          <div class="ds-col-label">我方</div>
          ${left.map(s => renderRow(s, leftMax)).join('')}
        </div>
        <div class="ds-col">
          <div class="ds-col-label">敌方</div>
          ${right.map(s => renderRow(s, rightMax)).join('')}
        </div>
      </div>
    `;
    // 绑点击 (innerHTML 替换后需重绑)
    this.root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        if (act === 'close') this.setVisible(false);
        else if (act === 'dealt' || act === 'taken' || act === 'heal' || act === 'shield') {
          this.tab = act;
          this.render();
        }
      };
    });
  }

  destroy(): void {
    this._busUnsub?.();
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
  }
}
