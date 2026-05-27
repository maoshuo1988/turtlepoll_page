// ══════════════════════════════════════════════════════════
// MenuDebugOverlay.ts — 图鉴/菜单侧 调试面板 (JS debug.js menu-level 1:1 port)
// ══════════════════════════════════════════════════════════
// JS debug.js 的"非战斗"调试: 设全体龟等级 / 加龟币 / 重置进度 / 快速对战 / 跳深海 Boss.
// 战斗内调试 (满血/杀敌/重置 CD/...) 走 DebugOverlay.ts (🛠 in BattleScene).
//
// petState localStorage schema 跟 JS fighter.js:7-21 1:1:
//   { levels: { [petId]: 1-10 }, coins: number }
import Phaser from 'phaser';
import { ALL_PETS } from '../data/pets';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    #poc-menu-debug-overlay {
      position: fixed; right: 12px; top: 60px;
      width: 320px; max-height: calc(100vh - 80px);
      overflow-y: auto;
      z-index: 250;
      background: rgba(8,12,20,.94);
      border: 2px solid #ffd93d;
      border-radius: 10px;
      padding: 12px;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
      color: #ddd;
      box-shadow: 0 8px 32px rgba(0,0,0,.6);
      display: none;
    }
    #poc-menu-debug-overlay.show { display: block; }
    #poc-menu-debug-overlay h3 {
      font-size: 14px; color: #ffd93d; margin: 0 0 4px 0;
      border-bottom: 1px solid rgba(255,217,61,.3);
      padding-bottom: 3px;
    }
    #poc-menu-debug-overlay .dbg-section { margin-bottom: 12px; }
    #poc-menu-debug-overlay button {
      background: #1a2740; color: #ddd;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      margin: 2px 3px 0 0;
      transition: .15s;
    }
    #poc-menu-debug-overlay button:hover { background: #2a3a55; border-color: #58a6ff; }
    #poc-menu-debug-overlay button.danger { background: #4a1a1a; border-color: #ff6b6b; }
    #poc-menu-debug-overlay button.danger:hover { background: #6a2828; }
    #poc-menu-debug-overlay button.success { background: #1a4a2a; border-color: #06d6a0; }
    #poc-menu-debug-overlay .dbg-info {
      font-size: 10px; color: #888;
      white-space: pre-wrap;
      background: rgba(0,0,0,.3);
      padding: 6px;
      border-radius: 4px;
      font-family: monospace;
      max-height: 120px; overflow-y: auto;
    }
    #poc-menu-debug-overlay .dbg-close {
      position: absolute; top: 6px; right: 8px;
      background: none; border: none;
      color: #888; font-size: 16px;
      cursor: pointer; padding: 0;
    }
  `;
  document.head.appendChild(st);
}

// ── petState helpers (JS fighter.js:7-21 1:1) ──
function setPetLevel(petId: string, level: number) {
  const lv = Math.max(1, Math.min(10, Math.round(level)));
  try {
    const ps = JSON.parse(localStorage.getItem('petState') || '{}');
    if (!ps.levels) ps.levels = {};
    ps.levels[petId] = lv;
    localStorage.setItem('petState', JSON.stringify(ps));
  } catch { /* ignore */ }
}
function getCoins(): number {
  try { return JSON.parse(localStorage.getItem('petState') || '{}').coins || 0; } catch { return 0; }
}
function addCoins(amount: number) {
  try {
    const ps = JSON.parse(localStorage.getItem('petState') || '{}');
    ps.coins = (ps.coins || 0) + amount;
    localStorage.setItem('petState', JSON.stringify(ps));
  } catch { /* ignore */ }
}
function resetProgress() {
  try {
    const ps = JSON.parse(localStorage.getItem('petState') || '{}');
    ps.levels = {};
    ps.coins = 0;
    localStorage.setItem('petState', JSON.stringify(ps));
  } catch { /* ignore */ }
}

export interface MenuDebugApi {
  /** 快速对战: 跳到指定 TeamSelect 模式 (JS debugQuickBattle 1:1) */
  quickBattle: (mode: 'custom' | 'pve' | 'dungeon') => void;
  /** 跳到深海第 5 关 Boss (JS debugJumpToDungeonBoss 1:1) */
  jumpDungeonBoss: () => void;
  /** 设全体等级后刷新图鉴显示 (CodexScene.restart) */
  afterLevelChange: () => void;
}

export class MenuDebugOverlay {
  private root: HTMLDivElement | null = null;
  private visible = false;
  private api: MenuDebugApi;

  constructor(scene: Phaser.Scene, api: MenuDebugApi) {
    this.api = api;
    installCss();
    const root = document.createElement('div');
    root.id = 'poc-menu-debug-overlay';
    root.innerHTML = this.renderHtml();
    document.body.appendChild(root);
    this.root = root;
    this.wireEvents();
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  private renderHtml(): string {
    return `
      <button class="dbg-close" data-action="close">×</button>
      <h3>🛠 调试面板 (图鉴)</h3>

      <div class="dbg-section">
        <h3>全体等级</h3>
        <button data-action="lv-1">全员 Lv.1</button>
        <button data-action="lv-5">全员 Lv.5</button>
        <button data-action="lv-10" class="success">全员 Lv.10</button>
      </div>

      <div class="dbg-section">
        <h3>经济</h3>
        <button data-action="coins-100">+100 龟币</button>
        <button data-action="coins-500">+500 龟币</button>
      </div>

      <div class="dbg-section">
        <h3>进度</h3>
        <button data-action="reset" class="danger">重置全部 (等级+龟币)</button>
      </div>

      <div class="dbg-section">
        <h3>快速对战</h3>
        <button data-action="qb-custom">PvP (自定义)</button>
        <button data-action="qb-pve">野生 (人机)</button>
        <button data-action="qb-dungeon">深海闯关</button>
        <button data-action="qb-boss">跳深海 Boss (第5关)</button>
      </div>

      <div class="dbg-section">
        <h3>当前状态</h3>
        <div class="dbg-info" id="menu-dbg-info">(等待刷新)</div>
      </div>
    `;
  }

  private wireEvents() {
    if (!this.root) return;
    this.root.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).dataset.action;
      if (!action) return;
      this.handleAction(action);
    });
  }

  private handleAction(action: string) {
    switch (action) {
      case 'close': this.hide(); break;
      case 'lv-1':  this.setAllLevels(1); break;
      case 'lv-5':  this.setAllLevels(5); break;
      case 'lv-10': this.setAllLevels(10); break;
      case 'coins-100': addCoins(100); this.toast('+100 龟币'); break;
      case 'coins-500': addCoins(500); this.toast('+500 龟币'); break;
      case 'reset':
        if (confirm('清空所有龟等级和龟币?')) { resetProgress(); this.api.afterLevelChange(); this.toast('进度已清空'); }
        break;
      case 'qb-custom':  this.api.quickBattle('custom'); break;
      case 'qb-pve':     this.api.quickBattle('pve'); break;
      case 'qb-dungeon': this.api.quickBattle('dungeon'); break;
      case 'qb-boss':    this.api.jumpDungeonBoss(); break;
    }
  }

  private setAllLevels(lv: number) {
    for (const p of ALL_PETS) setPetLevel(p.id, lv);
    this.api.afterLevelChange();
    this.toast(`全体 28 只龟 → Lv.${lv}`);
  }

  /** 在 info 区顶部插一条带时间戳的反馈 (JS showToast 等价) + 刷新状态 */
  private toast(msg: string) {
    this.refreshInfo();
    if (!this.root) return;
    const el = this.root.querySelector('#menu-dbg-info') as HTMLElement | null;
    if (el) el.textContent = `✓ ${msg}\n${el.textContent}`;
  }

  private refreshInfo() {
    if (!this.root) return;
    const el = this.root.querySelector('#menu-dbg-info') as HTMLElement | null;
    if (!el) return;
    const coins = getCoins();
    // 等级概览: 统计每个等级有多少龟 (避免列 28 行)
    const lvCount: Record<number, number> = {};
    try {
      const ps = JSON.parse(localStorage.getItem('petState') || '{}');
      for (const p of ALL_PETS) {
        const lv = (ps.levels && ps.levels[p.id]) || 1;
        lvCount[lv] = (lvCount[lv] || 0) + 1;
      }
    } catch { /* ignore */ }
    const lvSummary = Object.entries(lvCount)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([lv, n]) => `Lv${lv}×${n}`)
      .join('  ');
    el.textContent = `龟币: ${coins}\n等级分布: ${lvSummary}`;
  }

  show() {
    if (!this.root) return;
    this.root.classList.add('show');
    this.visible = true;
    this.refreshInfo();
  }
  hide() {
    if (!this.root) return;
    this.root.classList.remove('show');
    this.visible = false;
  }
  toggle() { if (this.visible) this.hide(); else this.show(); }
  isVisible(): boolean { return this.visible; }

  destroy() {
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.visible = false;
  }
}
