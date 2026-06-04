// ══════════════════════════════════════════════════════════
// DebugOverlay.ts — P17 调试面板 (JS games/turtle-battle/js/debug.js 1:1 port)
// ══════════════════════════════════════════════════════════
// 战斗内: 满血 / 杀敌 / 杀我方 / 重置 CD / 加金币 / 加深海币 / 加消耗品 / 装备发放 / 导出日志
// 外面 panel (settings/menu) 部分调试 (设龟等级 / 重置进度) 暂不实现 (level 系统部分未 1:1)
//
// JS 入口: index.html 的 🛠 按钮 → showDebugPanel(). poc BattleScene.ts:391 已 stub
// 现 wire 到 this.debug.toggle().
import Phaser from 'phaser';
import type { Fighter } from '../types';
import { applyRawDamage } from '../engine/damage';
import { EQUIP_POOL, EQUIP_BY_ID } from '../data/equipment';
export function getEquipById(id: string) { return EQUIP_BY_ID[id]; }
import { battleStats } from '../systems/battle-stats';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    #poc-debug-overlay {
      position: fixed; right: 12px; top: 60px;
      width: 360px; max-height: calc(100vh - 80px);
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
    #poc-debug-overlay.show { display: block; }
    #poc-debug-overlay h3 {
      font-size: 14px; color: #ffd93d; margin: 0 0 4px 0;
      border-bottom: 1px solid rgba(255,217,61,.3);
      padding-bottom: 3px;
    }
    #poc-debug-overlay .dbg-section { margin-bottom: 12px; }
    #poc-debug-overlay button {
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
    #poc-debug-overlay button:hover { background: #2a3a55; border-color: #58a6ff; }
    #poc-debug-overlay button.danger { background: #4a1a1a; border-color: #ff6b6b; }
    #poc-debug-overlay button.danger:hover { background: #6a2828; }
    #poc-debug-overlay button.success { background: #1a4a2a; border-color: #06d6a0; }
    #poc-debug-overlay .dbg-info {
      font-size: 10px; color: #888;
      white-space: pre-wrap;
      background: rgba(0,0,0,.3);
      padding: 6px;
      border-radius: 4px;
      font-family: monospace;
      max-height: 80px; overflow-y: auto;
    }
    #poc-debug-overlay .dbg-close {
      position: absolute; top: 6px; right: 8px;
      background: none; border: none;
      color: #888; font-size: 16px;
      cursor: pointer; padding: 0;
    }
    #poc-debug-overlay .dbg-equip-controls {
      display: flex; gap: 4px; margin-bottom: 4px;
    }
    #poc-debug-overlay .dbg-equip-controls input,
    #poc-debug-overlay .dbg-equip-controls select {
      flex: 1; background: #0d1318; color: #ddd;
      border: 1px solid rgba(255,255,255,.15);
      padding: 3px 6px; font-size: 11px;
      font-family: inherit;
    }
    #poc-debug-overlay .dbg-equip-list {
      max-height: 160px; overflow-y: auto;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 4px;
      padding: 2px;
    }
    #poc-debug-overlay .dbg-equip-row {
      display: flex; align-items: center; gap: 4px;
      padding: 2px 4px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      font-size: 11px;
    }
    #poc-debug-overlay .dbg-equip-row:hover { background: rgba(255,255,255,.04); }
    #poc-debug-overlay .dbg-equip-name { flex: 1; }
    #poc-debug-overlay .dbg-equip-row button { padding: 1px 5px; font-size: 10px; margin: 0; }
  `;
  document.head.appendChild(st);
}

export interface DebugBattleApi {
  /** 满血全队 (JS debugFullHealAll) */
  fullHealAll: () => void;
  /** 杀敌至残血 (JS debugKillAllEnemies) */
  killAllEnemies: () => void;
  /** 杀我方至残血 (JS debugKillAllAllies) */
  killAllAllies: () => void;
  /** 重置所有 CD (JS debugResetCds) */
  resetCds: () => void;
  /** 加金币 — 注: poc 战斗内金币不同于 codex 金币 */
  addBattleCoins: (amount: number) => void;
  /** 加深海币 (JS debugAddDeepCoin) */
  addDeepCoin: (side: 'left' | 'right', amount: number) => void;
  /** 强制开商店 (JS debugOpenQuickShop) */
  openShop: () => void;
  /** 给装备到 bench (JS debugGiveEquip) */
  giveEquip: (id: string, side: 'left' | 'right') => void;
  /** 加消耗品到我方 bench (JS debugAddConsumable) */
  addConsumable: (id: string) => void;
  /** 导出战斗日志到剪贴板 (JS debugExportLog) */
  exportLog: () => void;
  /** 获取当前战斗信息 — 显示在 info 板 */
  getInfo: () => string;
}

export class DebugOverlay {
  private scene: Phaser.Scene;
  private root: HTMLDivElement | null = null;
  private visible = false;
  private api: DebugBattleApi;

  constructor(scene: Phaser.Scene, api: DebugBattleApi) {
    this.scene = scene;
    this.api = api;
    installCss();
    const root = document.createElement('div');
    root.id = 'poc-debug-overlay';
    root.innerHTML = this.renderHtml();
    document.body.appendChild(root);
    this.root = root;
    this.wireEvents();
    scene.events.once('shutdown', () => this.destroy());
  }

  private renderHtml(): string {
    return `
      <button class="dbg-close" data-action="close">×</button>
      <h3>🛠 调试面板</h3>

      <div class="dbg-section">
        <h3>战斗内</h3>
        <button data-action="full-heal" class="success">全体满血</button>
        <button data-action="reset-cds">重置 CD</button>
        <button data-action="kill-enemies" class="danger">敌方残血</button>
        <button data-action="kill-allies" class="danger">我方残血</button>
      </div>

      <div class="dbg-section">
        <h3>经济</h3>
        <button data-action="coins-100">+100 金币</button>
        <button data-action="coins-500">+500 金币</button>
        <button data-action="dc-left-20">我方 +20💎</button>
        <button data-action="dc-left-100">我方 +100💎</button>
        <button data-action="open-shop">强开商店</button>
      </div>

      <div class="dbg-section">
        <h3>消耗品</h3>
        <button data-action="c-heal">+ 治疗药水</button>
        <button data-action="c-speed">+ 加速药水</button>
        <button data-action="c-bomb">+ 炸弹</button>
      </div>

      <div class="dbg-section">
        <h3>装备发放</h3>
        <div class="dbg-equip-controls">
          <input type="text" id="dbg-equip-filter" placeholder="搜索...">
          <select id="dbg-equip-cat">
            <option value="">全部</option>
            <option value="unique">唯一</option>
            <option value="consumable">消耗</option>
            <option value="normal">普通</option>
          </select>
        </div>
        <div class="dbg-equip-list" id="dbg-equip-list"></div>
      </div>

      <div class="dbg-section">
        <h3>工具</h3>
        <button data-action="export-log">📋 导出战斗日志</button>
        <button data-action="refresh-info">↻ 刷新信息</button>
      </div>

      <div class="dbg-section">
        <h3>当前状态</h3>
        <div class="dbg-info" id="dbg-info">(等待刷新)</div>
      </div>
    `;
  }

  private wireEvents() {
    if (!this.root) return;
    this.root.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const action = t.dataset.action;
      if (!action) return;
      this.handleAction(action);
    });
    const filterInput = this.root.querySelector('#dbg-equip-filter') as HTMLInputElement | null;
    const catSel = this.root.querySelector('#dbg-equip-cat') as HTMLSelectElement | null;
    filterInput?.addEventListener('input', () => this.renderEquipList());
    catSel?.addEventListener('change', () => this.renderEquipList());
  }

  private handleAction(action: string) {
    switch (action) {
      case 'close':         this.hide(); break;
      case 'full-heal':     this.api.fullHealAll(); this.toast('全体满血'); break;
      case 'reset-cds':     this.api.resetCds(); this.toast('所有 CD 已重置'); break;
      case 'kill-enemies':  this.api.killAllEnemies(); this.toast('敌方残血'); break;
      case 'kill-allies':   this.api.killAllAllies(); this.toast('我方残血'); break;
      case 'coins-100':     this.api.addBattleCoins(100); this.toast('+100 金币'); break;
      case 'coins-500':     this.api.addBattleCoins(500); this.toast('+500 金币'); break;
      case 'dc-left-20':    this.api.addDeepCoin('left', 20); this.toast('我方 +20 深海币'); break;
      case 'dc-left-100':   this.api.addDeepCoin('left', 100); this.toast('我方 +100 深海币'); break;
      case 'open-shop':     this.api.openShop(); break;
      case 'c-heal':        this.api.addConsumable('c_heal'); break;
      case 'c-speed':       this.api.addConsumable('c_speed'); break;
      case 'c-bomb':        this.api.addConsumable('c_bomb'); break;
      case 'export-log':    this.api.exportLog(); break;
      case 'refresh-info':  this.refreshInfo(); break;
      default: {
        // 装备发放: equip-<side>-<id>
        const m = action.match(/^equip-(left|right)-(.+)$/);
        if (m) this.api.giveEquip(m[2], m[1] as 'left' | 'right');
      }
    }
  }

  private renderEquipList() {
    if (!this.root) return;
    const list = this.root.querySelector('#dbg-equip-list') as HTMLElement | null;
    if (!list) return;
    const filterEl = this.root.querySelector('#dbg-equip-filter') as HTMLInputElement | null;
    const catEl = this.root.querySelector('#dbg-equip-cat') as HTMLSelectElement | null;
    const filter = (filterEl?.value ?? '').toLowerCase();
    const cat = catEl?.value ?? '';
    const items = EQUIP_POOL.filter(e => {
      if (cat && e.category !== cat) return false;
      if (filter) {
        const idLower = e.id.toLowerCase();
        const nameLower = (e.name ?? '').toLowerCase();
        if (!idLower.includes(filter) && !nameLower.includes(filter)) return false;
      }
      return true;
    });
    if (!items.length) {
      list.innerHTML = '<div style="color:#888;padding:4px;font-size:11px">无匹配装备</div>';
      return;
    }
    list.innerHTML = items.slice(0, 80).map(e => {
      const color = e.category === 'unique' ? '#ffd93d' : e.category === 'consumable' ? '#8bf' : '#ddd';
      return `<div class="dbg-equip-row">
        <span class="dbg-equip-name" style="color:${color}">
          ${e.name ?? e.id}
          <span style="color:#666;font-size:9px">[${e.category}]</span>
        </span>
        <button data-action="equip-left-${e.id}">→ 我</button>
        <button data-action="equip-right-${e.id}">→ 敌</button>
      </div>`;
    }).join('');
  }

  private refreshInfo() {
    if (!this.root) return;
    const el = this.root.querySelector('#dbg-info') as HTMLElement | null;
    if (el) el.textContent = this.api.getInfo();
  }

  private toast(msg: string) {
    if (!this.root) return;
    const el = this.root.querySelector('#dbg-info') as HTMLElement | null;
    if (el) {
      const prev = el.textContent;
      el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n${prev}`;
    }
  }

  show() {
    if (!this.root) return;
    this.root.classList.add('show');
    this.visible = true;
    this.refreshInfo();
    this.renderEquipList();
  }
  hide() {
    if (!this.root) return;
    this.root.classList.remove('show');
    this.visible = false;
  }
  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }
  isVisible(): boolean { return this.visible; }

  destroy() {
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.visible = false;
  }
}

/** Helper: kill a fighter to 1 HP then apply huge true dmg (JS debugKillAllEnemies pattern) */
export function debugKillFighter(f: Fighter) {
  if (!f.alive) return;
  f.hp = 1;
  const r = applyRawDamage(f, 99999, 'true');
  // Stats record (treat as caster:null = "debug")
  battleStats.recordDamage(null, f, r.hpLoss + r.shieldAbs, 'tru');
}

/** Helper: full-heal a fighter */
export function debugFullHeal(f: Fighter) {
  if (!f.alive) return;
  f.hp = f.maxHp;
}

// Re-export for BattleScene wire
export { EQUIP_POOL };
