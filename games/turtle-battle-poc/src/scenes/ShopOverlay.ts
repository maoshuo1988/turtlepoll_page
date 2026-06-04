// ══════════════════════════════════════════════════════════
// ShopOverlay — DOM overlay 版, 1:1 复刻 JS index.html:681-692 +
// battle.css:73-114 .shop-overlay / .shop-panel / .shop-grid / .shop-item
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:682-692):
//   <div class="shop-overlay" id="shopOverlay" style="display:none">
//     <div class="shop-panel">
//       <div class="shop-header">
//         <span class="shop-title">🛒 小商店</span>
//         <span class="shop-coins"><img src="assets/ui/coin.png" class="coin-icon"> <span id="shopCoins">0</span></span>
//         <span class="shop-timer" id="shopTimer">12</span>
//       </div>
//       <div class="shop-grid" id="shopGrid"></div>
//       <button class="shop-skip" onclick="closeShop()">跳过</button>
//     </div>
//   </div>
//
// JS shop-item 渲染 (shop.js:278-284 1:1):
//   <div class="shop-item">
//     <div class="shop-item-name">${name}</div>
//     <div class="shop-item-desc">${desc}</div>
//     <button class="shop-item-buy">${price} 🪙</button>
//   </div>
//
// JS CSS (battle.css:73-114 1:1):
//   .shop-overlay{position:fixed;inset:0;z-index:90;background:rgba(8,12,20,.75);
//                 backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}
//   .shop-panel{width:min(80vw, 900px);padding:24px 32px;
//               background:url('menu/shop-panel-bg.png') center/contain no-repeat;
//               border:none;border-radius:0;box-shadow:none}
//   .shop-header{display:flex;align-items:center;gap:14px;
//                border-bottom:1px solid rgba(255,255,255,.15);
//                padding-bottom:10px;margin-bottom:14px}
//   .shop-title{font-size:17px;font-weight:700;color:#ffd93d;flex:1}
//   .shop-coins{color:#aef0ff;font-weight:700;font-size:14px}
//   .shop-timer{color:#ff9;font-weight:700;font-size:14px;
//               background:rgba(60,80,120,.3);padding:2px 8px;border-radius:10px;
//               min-width:24px;text-align:center}
//   .shop-grid{display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;margin-bottom:14px}
//   .shop-item{background:rgba(20,30,45,.7);border:1px solid rgba(80,120,180,.3);
//              border-radius:8px;padding:10px 12px}
//   .shop-item-name{font-size:13px;font-weight:700;color:#eee;margin-bottom:4px}
//   .shop-item-desc{font-size:11px;color:#bbc;margin-bottom:8px;min-height:32px}
//   .shop-item-buy{background:linear-gradient(135deg, #58a6ff, #2d6fce);color:#fff;
//                  border:none;padding:5x14;border-radius:6px;
//                  font-size:12px;font-weight:700;cursor:pointer}
//   .shop-skip{background:rgba(80,80,90,.5);color:#cfd2dc;
//              border:1px solid rgba(255,255,255,.15);
//              padding:6px 18px;border-radius:6px;width:100%}
//
// PHASER DIVERGENCE:
//   - JS shopOverlay 是 body-level 静态 DOM (index.html:682), 切 display:none/flex 控制
//     poc 用 ShopOverlay class 动态 create/remove DOM (避免 scene shutdown 残留)
//   - 图片路径 "assets/menu/shop-panel-bg.png" → "menu/shop-panel-bg.png" (Vite public/)
//   - showFighterPicker (选龟装备) 改为 DOM modal, 跟 shop-overlay 同 z-index 体系
import Phaser from 'phaser';
import type { Fighter } from '../types';
import { EQUIP_POOL, EQUIP_BY_ID } from '../data/equipment';
import { attachEquipment } from '../engine/fighter';
import { tracker } from '../systems/achievement-tracker';
import { rollShopItems, applyTeamBuff, type ShopSlot } from '../data/shop-quick';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* JS battle.css:73-114 1:1 */
    #poc-shop-overlay {
      /* A3: z-index 抬到战斗 DOM (top-row 100 / timeline 175 / picker 200) 之上,
         否则"第N回合"+timeline+选龟框会浮在商店面板上 (用户报"商店页显示第四回合")。 */
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(8,12,20,.82);
      backdrop-filter: blur(5px);
      display: none;
      align-items: center; justify-content: center;
      font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    #poc-shop-overlay.show { display: flex; }
    #poc-shop-overlay .shop-panel {
      width: min(94vw, 1040px);
      min-height: min(78vh, 560px);
      /* 移动端/矮屏: 面板不超过视口高, 超出则内部滚动 (否则商品+跳过按钮跑屏外点不到) */
      max-height: 94vh; overflow-y: auto;
      padding: 30px 40px 26px;
      /* 面板底图 + 兜底深色渐变 (底图缺失/比例不符时不至于"图太小"露空) */
      background:
        url('menu/shop-panel-bg.png') center/100% 100% no-repeat,
        linear-gradient(180deg, rgba(16,24,42,.96), rgba(8,12,22,.98));
      border: 2px solid rgba(120,170,255,.35); border-radius: 18px;
      box-shadow: 0 18px 60px rgba(0,0,0,.6), inset 0 0 40px rgba(40,70,130,.25);
      box-sizing: border-box;
      color: #eee;
      display: flex; flex-direction: column;
    }
    #poc-shop-overlay .shop-header {
      display: flex; align-items: center; gap: 14px;
      border-bottom: 1px solid rgba(255,255,255,.15);
      padding-bottom: 10px; margin-bottom: 14px;
    }
    #poc-shop-overlay .shop-title {
      font-size: 17px; font-weight: 700; color: #ffd93d; flex: 1;
    }
    #poc-shop-overlay .shop-coins {
      color: #aef0ff; font-weight: 700; font-size: 14px;
      display: inline-flex; align-items: center; gap: 4px;
    }
    #poc-shop-overlay .shop-coins .coin-icon {
      width: 18px; height: 18px; vertical-align: middle;
    }
    #poc-shop-overlay .shop-timer {
      color: #ff9; font-weight: 700; font-size: 14px;
      background: rgba(60,80,120,.3);
      padding: 2px 8px; border-radius: 10px;
      min-width: 24px; text-align: center;
    }
    #poc-shop-overlay .shop-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 14px; margin-bottom: 16px; flex: 1;
    }
    /* 稀有度边框 — 普通灰 / 独特金 / 消耗青 / 增益绿 / 重投紫 */
    #poc-shop-overlay .shop-item[data-rarity="normal"]      { border-color: rgba(150,160,180,.5); }
    #poc-shop-overlay .shop-item[data-rarity="unique"]      { border-color: rgba(255,200,70,.7);  box-shadow: 0 0 8px rgba(255,200,70,.25); }
    #poc-shop-overlay .shop-item[data-rarity="consumable"]  { border-color: rgba(90,200,220,.6); }
    #poc-shop-overlay .shop-item[data-rarity="buff"]        { border-color: rgba(110,220,140,.6); }
    #poc-shop-overlay .shop-item[data-rarity="reroll"]      { border-color: rgba(190,130,255,.7); background: rgba(40,28,60,.7); }
    #poc-shop-overlay .shop-item {
      background: rgba(20,30,45,.7);
      border: 1px solid rgba(80,120,180,.3);
      border-radius: 10px;
      padding: 14px 14px 12px;
      display: flex; flex-direction: column; align-items: center;
      text-align: center;
    }
    #poc-shop-overlay .shop-item-icon {
      width: 64px; height: 64px; margin-bottom: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 46px; line-height: 1;
    }
    #poc-shop-overlay .shop-item-icon img {
      width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.5));
    }
    #poc-shop-overlay .shop-item-name {
      font-size: 14px; font-weight: 700; color: #eee; margin-bottom: 5px;
    }
    #poc-shop-overlay .shop-item-desc {
      font-size: 11px; color: #bbc; margin-bottom: 10px; min-height: 44px;
      line-height: 1.4; flex: 1;
    }
    #poc-shop-overlay .shop-item-buy {
      background: linear-gradient(135deg, #58a6ff, #2d6fce);
      color: #fff; border: none;
      padding: 6px 16px; border-radius: 7px;
      font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: inherit;
      display: inline-flex; align-items: center; gap: 5px;
    }
    #poc-shop-overlay .shop-item-buy .coin-icon {
      width: 15px; height: 15px;
    }
    #poc-shop-overlay .shop-item-buy:hover {
      background: linear-gradient(135deg, #79b8ff, #4a8eee);
    }
    #poc-shop-overlay .shop-item-buy:disabled {
      background: rgba(80,80,90,.5); cursor: not-allowed; opacity: .6;
    }
    #poc-shop-overlay .shop-skip {
      background: rgba(80,80,90,.5);
      color: #cfd2dc;
      border: 1px solid rgba(255,255,255,.15);
      padding: 6px 18px; border-radius: 6px;
      font-size: 12px; font-weight: 700; cursor: pointer;
      width: 100%;
      font-family: inherit;
    }
    #poc-shop-overlay .shop-skip:hover {
      background: rgba(100,100,115,.6);
    }
    /* 选龟 picker (装备分支 sub-modal) — z-index 高于 shop-overlay (90) */
    #poc-shop-picker {
      position: fixed; inset: 0; z-index: 1005;
      background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
      display: none;
      align-items: center; justify-content: center;
      font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    #poc-shop-picker.show { display: flex; }
    #poc-shop-picker .picker-panel {
      background: rgba(20,30,45,.95);
      border: 2px solid #ffd93d;
      border-radius: 12px;
      padding: 18px 24px;
      min-width: 560px; max-width: 90vw;
      color: #eee; text-align: center;
    }
    #poc-shop-picker .picker-title {
      font-size: 18px; font-weight: 700; color: #ffd93d; margin-bottom: 12px;
    }
    #poc-shop-picker .picker-grid {
      display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
      margin-bottom: 12px;
    }
    #poc-shop-picker .picker-card {
      width: 90px; padding: 8px;
      background: rgba(0,0,0,.6);
      border: 2px solid #ffd93d; border-radius: 8px;
      cursor: pointer; transition: .15s;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    #poc-shop-picker .picker-card.dead {
      border-color: #666; opacity: .55; cursor: not-allowed;
    }
    #poc-shop-picker .picker-card:not(.dead):hover {
      border-color: #fff3a0; transform: translateY(-2px);
    }
    #poc-shop-picker .picker-card img {
      width: 58px; height: 58px; image-rendering: pixelated; object-fit: contain;
    }
    #poc-shop-picker .picker-card .pname {
      font-size: 11px; color: #fff; font-weight: 700;
    }
    #poc-shop-picker .picker-card.dead .pname { color: #666; }
    #poc-shop-picker .picker-cancel {
      background: rgba(80,80,90,.5);
      color: #cfd2dc; border: 1px solid rgba(255,255,255,.15);
      padding: 6px 18px; border-radius: 6px;
      font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: inherit;
    }
  `;
  document.head.appendChild(st);
}

export class ShopOverlay {
  private scene: Phaser.Scene;
  private root: HTMLDivElement | null = null;
  private picker: HTMLDivElement | null = null;
  private shown = false;
  private cdTimer: ReturnType<typeof setInterval> | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    installCss();
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  /** 打开商店. coins: 当前龟币. playerFighters: 玩家阵容.
   *  shopIndex: 第几次商店 (0=turn4, 1=turn8, 2=turn12) — 决定价格 ×1.25^n.
   *  onClose(coinsAfter): 关闭时回调, 传剩余龟币. */
  open(coins: number, playerFighters: Fighter[], shopIndex: number, onClose: (coinsAfter: number) => void) {
    if (this.shown) return;
    this.shown = true;

    let curCoins = coins;
    let rerollCost = 2;                          // 首次 2, 每重投 +1, 进商店重置 (本次 open 即 2)
    // 财富羁绊 tier3: 商店全场 -25% 价 (_synergyWealthShopDiscount — 之前 set flag 从不消费)。
    //   作用于装备/消耗品/增益价, 不动重投费。重投后重新套用。
    const wealthDisc = playerFighters
      .map(f => (f as Fighter & { _synergyWealthShopDiscount?: number })._synergyWealthShopDiscount)
      .find(v => v) ?? 0;
    const applyWealthDisc = (sl: ReturnType<typeof rollShopItems>): ReturnType<typeof rollShopItems> => {
      if (wealthDisc > 0) for (const s of sl) if (!s.isReroll) s.price = Math.max(1, Math.round(s.price * (1 - wealthDisc)));
      return sl;
    };
    let slots = applyWealthDisc(rollShopItems(shopIndex));

    // A6: 商店开着时禁用 Phaser 场景输入 — 防止点击穿透面板点到后面的龟
    try { this.scene.input.enabled = false; } catch { /* ignore */ }

    // 建 DOM
    const root = document.createElement('div');
    root.id = 'poc-shop-overlay';
    document.body.appendChild(root);
    this.root = root;

    const coinsLabel = `第 ${shopIndex + 1} 次商店`;

    const renderGrid = () => {
      // F 格价格 = 当前重投费用
      const fSlot = slots.find(s => s.isReroll);
      if (fSlot) fSlot.price = rerollCost;
      root.innerHTML = `
        <div class="shop-panel">
          <div class="shop-header">
            <span class="shop-title">🛒 小商店 · ${coinsLabel}</span>
            <span class="shop-coins"><img src="battle/deep-coin.png" class="coin-icon" alt="深海币"
              onerror="this.style.display='none'"> <span id="poc-shop-coins">${curCoins}</span></span>
            <span class="shop-timer" id="poc-shop-timer" title="自动跳过倒计时">⏳ --</span>
          </div>
          <div class="shop-grid" id="poc-shop-grid">
            ${slots.map((it, i) => `
              <div class="shop-item" data-idx="${i}" data-rarity="${it.rarity}">
                <div class="shop-item-icon">${slotIconHtml(it)}</div>
                <div class="shop-item-name">${escapeHtml(it.name)}</div>
                <div class="shop-item-desc">${escapeHtml(it.desc)}</div>
                <button class="shop-item-buy" data-idx="${i}" ${curCoins < it.price ? 'disabled' : ''}>${it.price} <img src="battle/deep-coin.png" class="coin-icon" alt="深海币" onerror="this.replaceWith(document.createTextNode('🪙'))"></button>
              </div>
            `).join('')}
          </div>
          <button class="shop-skip" id="poc-shop-skip">跳过 (剩 <span id="poc-shop-cd">--</span>s)</button>
        </div>
      `;
      root.classList.add('show');
      bindHandlers();
    };

    const coinsTextEl = () => root.querySelector<HTMLSpanElement>('#poc-shop-coins');
    const refreshAffordability = () => {
      const el = coinsTextEl();
      if (el) el.textContent = String(curCoins);
      root.querySelectorAll<HTMLButtonElement>('.shop-item-buy').forEach(btn => {
        const idx = parseInt(btn.dataset.idx ?? '-1', 10);
        const it = slots[idx];
        if (!it) return;
        btn.disabled = curCoins < it.price || btn.dataset.bought === '1';
      });
    };

    const bindHandlers = () => {
      root.querySelectorAll<HTMLButtonElement>('.shop-item-buy').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx ?? '-1', 10);
          const item = slots[idx];
          if (!item) return;
          if (curCoins < item.price) return;

          // 重投格: 扣费 + 重置费用 +1 + 重滚 A~E (保持 shopIndex 价位)
          if (item.isReroll) {
            curCoins -= rerollCost;
            rerollCost += 1;
            slots = applyWealthDisc(rollShopItems(shopIndex));
            renderGrid();
            refreshAffordability();
            return;
          }

          if (btn.dataset.bought === '1') return;
          this.buySlot(item, playerFighters, (ok) => {
            if (!ok) return;
            curCoins -= item.price;
            btn.dataset.bought = '1';
            btn.textContent = '✓ 已购';
            btn.disabled = true;
            refreshAffordability();
          });
        });
      });

      const skipBtn = root.querySelector<HTMLButtonElement>('#poc-shop-skip');
      skipBtn?.addEventListener('click', () => finish());
    };

    // 单一收尾入口 (手动跳过 / 倒计时归零 共用, 防重复回调)
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.close();
      onClose(curCoins);
    };

    renderGrid();

    // A4: 真倒计时 — 30s 自动跳过。顶部 ⏳N + 跳过按钮里 (剩 Ns), ≤10s 变红。
    let cdLeft = SHOP_COUNTDOWN_SEC;
    const paintCd = () => {
      const timerEl = root.querySelector<HTMLSpanElement>('#poc-shop-timer');
      const cdEl = root.querySelector<HTMLSpanElement>('#poc-shop-cd');
      if (timerEl) {
        timerEl.textContent = `⏳ ${cdLeft}`;
        timerEl.style.color = cdLeft <= 10 ? '#ff7a7a' : '#ff9';
      }
      if (cdEl) cdEl.textContent = String(cdLeft);
    };
    paintCd();
    this.cdTimer = setInterval(() => {
      cdLeft--;
      paintCd();
      if (cdLeft <= 0) finish();
    }, 1000);
  }

  /** 买下一格 A~E (非重投). */
  private buySlot(item: ShopSlot, playerFighters: Fighter[], onOk: (ok: boolean) => void) {
    // 装备 (consumable / normal / unique) → 推装备席 (玩家拖到龟身上使用)
    if (item.equipId) {
      const eq = EQUIP_POOL.find(e => e.id === item.equipId) ?? null;
      if (!eq) { onOk(false); return; }
      const battleScene = this.scene as Phaser.Scene & { addToBench?: (eq: import('../types').EquipmentDef) => void };
      if (typeof battleScene.addToBench === 'function') {
        battleScene.addToBench(eq);
        if (item.rarity !== 'consumable') tracker.onEquipBought();
        onOk(true);
        return;
      }
      this.showFighterPicker(playerFighters, (fighter) => {
        if (!fighter) { onOk(false); return; }
        attachEquipment(fighter, eq);
        tracker.onEquipBought();
        onOk(true);
      });
      return;
    }

    // 增益 buff
    const buff = item.buff;
    if (!buff) { onOk(true); return; }

    if (buff.kind === 'team-buff') {
      applyTeamBuff(playerFighters, buff);
      onOk(true);
      return;
    }

    // 单体增益 → 进装备席, 玩家拖到龟身上使用
    if (buff.applyToTarget) {
      const battleScene = this.scene as Phaser.Scene & { addToBench?: (eq: import('../types').EquipmentDef) => void };
      const apply = buff.applyToTarget;
      const benchItem = {
        id: buff.id, name: buff.name,
        icon: buff.name.trim().split(/\s+/)[0],   // name 以 emoji 开头
        category: 'consumable', unique: false, desc: buff.desc,
        target: buff.wantsEnemy ? 'enemy' : undefined,
        apply: (f: Fighter) => apply(f),
      } as unknown as import('../types').EquipmentDef;
      if (typeof battleScene.addToBench === 'function') {
        battleScene.addToBench(benchItem);
        onOk(true);
        return;
      }
      this.showFighterPicker(playerFighters, (fighter) => {
        if (!fighter) { onOk(false); return; }
        apply(fighter);
        onOk(true);
      });
      return;
    }

    onOk(true);
  }

  private showFighterPicker(playerFighters: Fighter[], onPick: (f: Fighter | null) => void) {
    if (this.picker) this.picker.remove();
    const picker = document.createElement('div');
    picker.id = 'poc-shop-picker';
    picker.innerHTML = `
      <div class="picker-panel">
        <div class="picker-title">选择装备的龟</div>
        <div class="picker-grid">
          ${playerFighters.map((f, i) => `
            <div class="picker-card ${f.alive ? '' : 'dead'}" data-idx="${i}">
              <img src="avatars/${f.id}.png" alt="${escapeHtml(f.name)}"
                onerror="this.style.display='none'">
              <span class="pname">${escapeHtml(f.name)}</span>
            </div>
          `).join('')}
        </div>
        <button class="picker-cancel">取消</button>
      </div>
    `;
    document.body.appendChild(picker);
    this.picker = picker;
    picker.classList.add('show');

    picker.querySelectorAll<HTMLDivElement>('.picker-card').forEach(card => {
      if (card.classList.contains('dead')) return;
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx ?? '-1', 10);
        const f = playerFighters[idx];
        picker.remove();
        this.picker = null;
        onPick(f ?? null);
      });
    });
    picker.querySelector<HTMLButtonElement>('.picker-cancel')?.addEventListener('click', () => {
      picker.remove();
      this.picker = null;
      onPick(null);
    });
  }

  private close() {
    if (this.cdTimer != null) { clearInterval(this.cdTimer); this.cdTimer = null; }
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.picker?.parentNode) this.picker.parentNode.removeChild(this.picker);
    this.root = null;
    this.picker = null;
    this.shown = false;
    // A6: 关店恢复 Phaser 场景输入
    try { this.scene.input.enabled = true; } catch { /* ignore */ }
  }

  destroy() {
    this.close();
  }

  isOpen(): boolean { return this.shown; }
}

/** 商店自动跳过倒计时 (秒) */
const SHOP_COUNTDOWN_SEC = 30;

/** 商店格图标 HTML — 装备用 equip png, 增益/重投用 emoji (name 首 token / 🔄)。 */
function slotIconHtml(it: ShopSlot): string {
  if (it.isReroll) return '🔄';
  if (it.equipId) {
    const eq = EQUIP_BY_ID[it.equipId];
    const icon = eq?.icon;
    if (icon && icon.endsWith('.png')) {
      return `<img src="${icon}" alt="${escapeHtml(eq?.name ?? '')}" onerror="this.replaceWith(document.createTextNode('📦'))">`;
    }
    if (icon) return escapeHtml(icon);   // emoji 图标
    return '📦';
  }
  // 增益: name 以 emoji 开头, 取首 token
  const first = it.name.trim().split(/\s+/)[0];
  return escapeHtml(first || '✨');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' : '&#39;'
  );
}
