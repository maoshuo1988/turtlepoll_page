// ══════════════════════════════════════════════════════════
// BattleLog — DOM overlay 版, 1:1 复刻 JS battle.css:726-743,786-789 +
// index.html .battle-log-wrapper / .battle-log / .log-entry
// ══════════════════════════════════════════════════════════
// JS HTML (battle.log 在 index.html 接近 #screenBattle 末尾):
//   <div class="battle-log-wrapper">
//     <div class="battle-log" id="battleLog"></div>
//   </div>
// JS log entries: <div class="log-entry [sys|death|round-sep]">...内含 .log-direct/.log-pierce/...</div>
//
// JS CSS (battle.css):
//   --bg2:#161b22  --bg3:#1c2333  --fg:#e6edf3  --fg2:#8b949e
//   --accent:#58a6ff  --red:#ff6b6b  --radius:12px
//   (battle.css:786-789 桌面 PC fixed right panel)
//   .battle-log-wrapper{flex-shrink:0;display:block;position:fixed;right:0;top:40px;
//                       width:280px;height:calc(100vh - 40px);z-index:50;pointer-events:none}
//   .battle-log-wrapper .battle-log{pointer-events:auto;max-height:100%;overflow-y:auto;
//                                   background:rgba(0,0,0,.7);
//                                   border-left:1px solid rgba(255,255,255,.1);
//                                   font-size:11px;padding:8px}
//   (battle.css:726-743 inner)
//   .battle-log{background:var(--bg2);border-radius:var(--radius);padding:12px;
//               max-height:200px;overflow-y:auto;font-size:13px;line-height:1.8;display:none}
//   .battle-log-wrapper.log-open .battle-log{display:block}    // 注意 wrapper 桌面 always-on
//   .log-entry{padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)}
//   .log-entry.sys{color:var(--fg2);font-style:italic}
//   .log-entry.round-sep{text-align:center;color:var(--accent);font-weight:700;
//                        border-bottom:1px solid rgba(88,166,255,.15);
//                        padding:6px 0;margin:4px 0;font-size:12px;letter-spacing:1px}
//   .log-entry.death{color:var(--red)}
//   .log-entry b{color:var(--accent)}
//   .log-direct{color:#ff4444;font-weight:700}
//   .log-pierce{color:#d06bff;font-weight:700}
//   .log-heal{color:#06d6a0;font-weight:700}
//   .log-shield{color:rgba(255,255,255,.9);font-weight:700}
//   .log-shield-dmg{color:#999;font-weight:600}
//   .log-crit{color:#ffa500;font-weight:700}
//   .log-dot{color:#ff6600;font-weight:700}
//   .log-debuff{color:#ff9f43;font-weight:700}
//   .log-passive{color:#7dffb3;font-weight:700;font-style:italic}
//
// PHASER DIVERGENCE:
//   - JS PC 桌面 fixed right top:40px width:280px height:calc(100vh - 40px)
//     poc 同 fixed right:0 top:48px (顶部 row 8+32+8=48), height:calc(100vh - 56px)
//     避开 BattleTopRow + 留底部 8px
//   - 关键词自动上色 colorize() 保留, 用 JS class 名 (log-crit/log-heal/log-dot/log-passive)
//     而非内联 color, 颜色配置统一在 CSS, 便于主题
import Phaser from 'phaser';

const MAX_LINES = 200;

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* JS battle.css:786-789 1:1 — wrapper fixed right side */
    #poc-battle-log-wrapper {
      position: fixed; right: 0; top: 48px;
      width: 400px; height: calc(100vh - 56px);
      z-index: 50;
      pointer-events: none;
      /* P99 1:1 JS base.css body: Segoe UI 英文优先, system-ui 中文 fallback */
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    #poc-battle-log-wrapper .battle-log {
      pointer-events: auto;
      max-height: 100%;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(8,11,18,.82), rgba(4,6,11,.86));
      border-left: 2px solid #6b5430;
      box-shadow: inset 1px 0 0 rgba(255,216,107,.1);
      font-size: 16px;
      padding: 12px;
      line-height: 1.7;
      color: #e6edf3;
      box-sizing: border-box;
      height: 100%;
    }
    /* JS battle.css:730-734 1:1 — log-entry baseline */
    #poc-battle-log-wrapper .log-entry {
      padding: 4px 0;
      border-bottom: 1px solid rgba(255,255,255,.04);
    }
    #poc-battle-log-wrapper .log-entry.sys {
      color: #8b949e; font-style: italic;
    }
    #poc-battle-log-wrapper .log-entry.round-sep {
      text-align: center;
      color: #ffd86b; font-weight: 700;
      border-bottom: 1px solid rgba(255,216,107,.2);
      padding: 8px 0; margin: 6px 0;
      font-size: 17px; letter-spacing: 1px;
    }
    #poc-battle-log-wrapper .log-entry.death { color: #ff6b6b; }
    #poc-battle-log-wrapper .log-entry b { color: #58a6ff; }
    /* JS battle.css:735-743 1:1 — 9 色 log-X */
    #poc-battle-log-wrapper .log-direct     { color: #ff4444; font-weight: 700; }
    #poc-battle-log-wrapper .log-pierce     { color: #d06bff; font-weight: 700; }
    #poc-battle-log-wrapper .log-heal       { color: #06d6a0; font-weight: 700; }
    #poc-battle-log-wrapper .log-shield     { color: rgba(255,255,255,.9); font-weight: 700; }
    #poc-battle-log-wrapper .log-shield-dmg { color: #999; font-weight: 600; }
    #poc-battle-log-wrapper .log-crit       { color: #ffa500; font-weight: 700; }
    #poc-battle-log-wrapper .log-dot        { color: #ff6600; font-weight: 700; }
    #poc-battle-log-wrapper .log-debuff     { color: #ff9f43; font-weight: 700; }
    #poc-battle-log-wrapper .log-passive    { color: #7dffb3; font-weight: 700; font-style: italic; }
    /* 滚动条 (JS battle.css:780-782) */
    #poc-battle-log-wrapper .battle-log::-webkit-scrollbar { width: 6px; }
    #poc-battle-log-wrapper .battle-log::-webkit-scrollbar-track { background: transparent; }
    #poc-battle-log-wrapper .battle-log::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,.12); border-radius: 3px;
    }
  `;
  document.head.appendChild(st);
}

export class BattleLog {
  private wrapper: HTMLDivElement | null = null;
  private listEl: HTMLDivElement | null = null;
  private lines: { html: string; cls: string }[] = [];
  // P23: 默认 hidden (JS battle.css:727 `.battle-log{display:none}` + `.log-open` toggle)
  private visible = false;

  constructor(scene: Phaser.Scene) {
    installCss();
    const wrapper = document.createElement('div');
    wrapper.id = 'poc-battle-log-wrapper';
    wrapper.innerHTML = `<div class="battle-log" id="poc-battle-log"></div>`;
    wrapper.style.display = 'none';   // P23: 默认隐藏, 点 📜 才开
    document.body.appendChild(wrapper);
    this.wrapper = wrapper;
    this.listEl = wrapper.querySelector<HTMLDivElement>('#poc-battle-log');

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  /** P23 toggle 显隐 — 跟 JS toggleBattleLog (ui-action.js:151-167) 1:1 */
  toggle() {
    this.visible = !this.visible;
    if (this.wrapper) this.wrapper.style.display = this.visible ? 'block' : 'none';
  }
  setVisible(v: boolean) {
    this.visible = v;
    if (this.wrapper) this.wrapper.style.display = v ? 'block' : 'none';
  }
  isVisible(): boolean { return this.visible; }

  /** 写一条 log. cls 可选: 'sys' | 'death' | 'round-sep' (作用于 .log-entry 整行).
   *  text 内部的关键词会被自动包成 .log-crit / .log-heal / .log-dot 等. */
  log(text: string, cls = '') {
    const styled = this.colorize(text);
    this.lines.push({ html: styled, cls });
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.render();
  }

  private render() {
    if (!this.listEl) return;
    this.listEl.innerHTML = this.lines.map(l =>
      `<div class="log-entry${l.cls ? ' ' + l.cls : ''}">${l.html}</div>`
    ).join('');
    this.listEl.scrollTop = this.listEl.scrollHeight;
  }

  /** P99 1:1 JS — 只匹配 JS 实际写日志时手工标的"数值短语"模式, 不污染纯文本.
   *  JS 写法 (e.g. lightning.js:72):
   *    addLog(`${name} <b>雷暴</b> ${hits}次随机闪电, 每次 <span class="log-direct">${dmg}伤害</span>`)
   *  即 JS 调用方手工传 HTML. PoC 调用方多传纯文本, 这里只做"短语模式"自动包.
   *  之前 PoC: 所有数字 <b>X</b> (JS 没此) + 关键词 sniff (回血/协同 等 JS 没此).
   */
  private colorize(text: string): string {
    // 如果 text 已经含 HTML span (caller 传了完整 JS 风格), 不再 sniff
    if (text.includes('<span') || text.includes('<b>')) return text;
    return text
      // X伤害 / X真实伤害 / X物理 / X魔法 → log-direct 红
      .replace(/(\d+)(伤害|真实|物理|魔法)/g, '<span class="log-direct">$1$2</span>')
      // +X 护盾 → log-shield 白
      .replace(/(\+\d+)(护盾)/g, '<span class="log-shield">$1$2</span>')
      // +X HP / +X 回血 → log-heal 绿
      .replace(/(\+\d+)(HP|回血)/g, '<span class="log-heal">$1$2</span>')
      // 暴击 (单独词) → log-crit 橙
      .replace(/(暴击)/g, '<span class="log-crit">$1</span>')
      // 灼烧/中毒/流血 (单独词) → log-dot 橙红
      .replace(/(灼烧|中毒|流血)/g, '<span class="log-dot">$1</span>');
  }

  destroy() {
    if (this.wrapper?.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
    this.wrapper = null;
    this.listEl = null;
  }
}
