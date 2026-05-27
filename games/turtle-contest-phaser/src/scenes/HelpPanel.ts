// ══════════════════════════════════════════════════════════
// HelpPanel — DOM overlay 版, 1:1 复刻 JS index.html:380-460 +
// battle.css:209-221 .help-panel / .help-title / .help-grid / .help-item
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:380-460): 19 个 .help-item, auto-fill grid 240px min.
// JS CSS (battle.css:211-221, base.css:86-91):
//   --bg2:#161b22  --bg3:#1c2333  --fg:#e6edf3  --fg2:#8b949e  --radius:12px
//   .help-panel{background:var(--bg2);border:1px solid rgba(255,255,255,.1);
//               border-radius:var(--radius);padding:16px;margin-bottom:12px;
//               animation:fadeUp .2s ease}
//   .help-title{font-size:15px;font-weight:700;margin-bottom:12px;display:flex;
//               justify-content:space-between;align-items:center}
//   .help-close{cursor:pointer;color:var(--fg2);font-size:18px;padding:6px 10px;
//               border-radius:6px;min-width:32px;min-height:32px;display:inline-flex;
//               align-items:center;justify-content:center;line-height:1}
//   .help-close:hover{color:var(--fg);background:rgba(255,255,255,.08)}
//   .help-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
//   .help-item{display:flex;gap:10px;padding:8px 10px;background:var(--bg3);
//              border-radius:8px;font-size:12px;line-height:1.5}
//   .help-icon{font-size:20px;flex-shrink:0;width:24px;text-align:center}
//   .help-color{font-size:16px}
//   .help-item b{color:var(--fg);display:inline}
//   .help-item div{color:var(--fg2)}
//   @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
//
// PHASER DIVERGENCE:
//   - JS 是 inline panel (#screenBattle 内 display:none/block 切换, push 下方 .battle-scene)
//     Phaser canvas 全屏渲染, 没"流式 push", 改成 modal: position:fixed center, 半透 veil 背景
//     遮罩可点关闭. 内部布局 (title + grid + items) 严格 JS 1:1.
//   - 图片路径: JS "assets/stats/atk-icon.png" → poc "stats/atk-icon.png"
import Phaser from 'phaser';

interface HelpItem {
  /** 图标: 'img:stats/xx.png' = PNG, 'col:#ff4444' = 色块 (.help-color), 'emoji:🔥' = 普通 emoji */
  icon: string;
  title: string;
  desc: string;  // 允许 HTML <br>
}

// JS index.html:383-458 1:1 — 19 个 help-item, 顺序严格
const HELP_ITEMS: HelpItem[] = [
  { icon: 'img:stats/atk-icon.png',        title: '攻击力 (ATK)', desc: '技能伤害基于攻击力百分比计算，如"90%ATK"' },
  { icon: 'img:stats/def-icon.png',        title: '护甲',          desc: '减少受到的物理伤害。减伤% = 护甲÷(护甲+40)' },
  { icon: 'img:stats/mr-icon.png',         title: '魔抗',          desc: '减少受到的魔法伤害。减伤% = 魔抗÷(魔抗+40)' },
  { icon: 'img:stats/armor-pen-icon.png',  title: '护甲穿透',      desc: '无视目标等量护甲值' },
  { icon: 'img:stats/magic-pen-icon.png',  title: '魔法穿透',      desc: '无视目标等量魔抗值' },
  { icon: 'col:#ff4444',                   title: '物理伤害（红色）', desc: '受护甲减免' },
  { icon: 'col:#4dabf7',                   title: '魔法伤害（蓝色）', desc: '受魔抗减免' },
  { icon: 'col:#ffffff',                   title: '真实伤害（白色）', desc: '无视护甲和魔抗，但会被护盾吸收' },
  { icon: 'col:#fff',                      title: '护盾（白色）',  desc: '额外生命层，所有伤害先消耗护盾再扣血。血条上白色部分' },
  { icon: 'img:stats/hp-icon.png',         title: '生命值（绿色回复）', desc: '恢复生命值，不超过最大HP' },
  { icon: 'img:stats/crit-icon.png',       title: '暴击率',        desc: '基础暴击率25%，暴击时触发额外伤害' },
  { icon: 'img:stats/crit-dmg-icon.png',   title: '暴击伤害',      desc: '暴击时伤害倍率，基础×1.5倍。暴击数字前显示此图标' },
  { icon: 'img:stats/lifesteal-icon.png',  title: '生命偷取',      desc: '造成伤害时按比例回复自身生命值' },
  { icon: 'img:status/dodge-icon.png',     title: '闪避率',        desc: '有概率完全闪避一段攻击，不受伤害' },
  { icon: 'emoji:🔥',                       title: '灼烧 / 持续伤害', desc: '统一：0.4×ATK+8%最大HP 魔法伤害，4回合，被魔抗减免，被护盾吸收，不叠加只刷新' },
  { icon: 'emoji:⬇️',                       title: '减益效果',      desc: '减攻/减护甲/减魔抗：降低百分比，持续若干回合。眩晕：跳过1回合行动' },
  { icon: 'emoji:⭐',                       title: '被动技能',      desc: '每只龟的固有能力，战斗中自动触发。点击卡片上的图标查看详情' },
  { icon: 'emoji:📊',                       title: '伤害公式',      desc: '物理伤害 = 基础值 × 暴击倍率 × (1 - 护甲减伤%)<br>魔法伤害 = 基础值 × 暴击倍率 × (1 - 魔抗减伤%)<br>真实伤害 = 基础值 × 暴击倍率（无视护甲和魔抗）<br>伤害顺序：先打泡泡盾 → 护盾 → 生命值' },
  { icon: 'emoji:🎮',                       title: '回合规则',      desc: '第1回合：左方出1只 → 右方全部出手<br>第2回合起：左方全部 → 右方全部<br>每回合双方选择哪只龟行动' },
];

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* JS battle.css:211-221 + base.css:86-91 1:1 — help panel */
    #poc-help-veil {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 220;
      display: none;
      opacity: 0;
      transition: opacity .2s ease;
    }
    #poc-help-veil.show { display: block; opacity: 1; }
    #poc-help-panel {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      max-width: 92vw; max-height: 84vh; overflow-y: auto;
      width: 720px;
      background: #161b22;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      z-index: 221;
      display: none;
      opacity: 0;
      transform: translate(-50%, calc(-50% + 6px));
      transition: opacity .2s ease, transform .2s ease;
      font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
      color: #e6edf3;
      box-sizing: border-box;
    }
    #poc-help-panel.show {
      display: block; opacity: 1;
      transform: translate(-50%, -50%);
    }
    #poc-help-panel .help-title {
      font-size: 15px; font-weight: 700;
      margin-bottom: 12px;
      display: flex; justify-content: space-between; align-items: center;
      color: #e6edf3;
    }
    #poc-help-panel .help-close {
      cursor: pointer; color: #8b949e;
      font-size: 18px; padding: 6px 10px;
      border-radius: 6px;
      min-width: 32px; min-height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      line-height: 1;
      user-select: none;
    }
    #poc-help-panel .help-close:hover {
      color: #e6edf3; background: rgba(255,255,255,.08);
    }
    #poc-help-panel .help-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    #poc-help-panel .help-item {
      display: flex; gap: 10px;
      padding: 8px 10px;
      background: #1c2333;
      border-radius: 8px;
      font-size: 12px; line-height: 1.5;
    }
    #poc-help-panel .help-icon {
      font-size: 20px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }
    #poc-help-panel .help-color { font-size: 16px; }
    #poc-help-panel .help-item b { color: #e6edf3; display: inline; }
    #poc-help-panel .help-item div { color: #8b949e; }
    @keyframes pocFadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(st);
}

function renderIcon(icon: string): string {
  if (icon.startsWith('img:')) {
    return `<img src="${icon.slice(4)}" class="help-icon" style="width:20px;height:20px" loading="lazy">`;
  }
  if (icon.startsWith('col:')) {
    return `<span class="help-icon help-color" style="color:${icon.slice(4)}">■</span>`;
  }
  // emoji:
  return `<span class="help-icon">${icon.slice(6)}</span>`;
}

export class HelpPanel {
  private veil: HTMLDivElement | null = null;
  private panel: HTMLDivElement | null = null;
  private shown = false;

  constructor(scene: Phaser.Scene) {
    installCss();
    const veil = document.createElement('div');
    veil.id = 'poc-help-veil';
    veil.addEventListener('click', () => this.hide());
    document.body.appendChild(veil);

    const panel = document.createElement('div');
    panel.id = 'poc-help-panel';
    // JS index.html:381-459 1:1 — title + grid
    const gridHtml = HELP_ITEMS.map(it =>
      `<div class="help-item">${renderIcon(it.icon)}<div><b>${it.title}</b><br>${it.desc}</div></div>`
    ).join('');
    panel.innerHTML = `
      <div class="help-title">术语说明 <span class="help-close" data-act="close">✕</span></div>
      <div class="help-grid">${gridHtml}</div>
    `;
    panel.querySelector<HTMLSpanElement>('.help-close')?.addEventListener('click', () => this.hide());
    document.body.appendChild(panel);

    this.veil = veil;
    this.panel = panel;

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  toggle() {
    if (this.shown) this.hide(); else this.show();
  }

  show() {
    if (!this.veil || !this.panel) return;
    this.veil.classList.add('show');
    this.panel.classList.add('show');
    this.shown = true;
  }

  hide() {
    if (!this.veil || !this.panel) return;
    this.veil.classList.remove('show');
    this.panel.classList.remove('show');
    this.shown = false;
  }

  isShown() { return this.shown; }

  destroy() {
    if (this.veil?.parentNode) this.veil.parentNode.removeChild(this.veil);
    if (this.panel?.parentNode) this.panel.parentNode.removeChild(this.panel);
    this.veil = null;
    this.panel = null;
    this.shown = false;
  }
}
