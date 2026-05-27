// ══════════════════════════════════════════════════════════
// TurtlePicker — DOM overlay 版, 1:1 复刻 JS ui-action.js:1 showTurtlePicker + battle.css:643-652
// ══════════════════════════════════════════════════════════
// JS HTML 结构 (index.html:510-513):
//   <div class="turtle-picker" id="turtlePicker">
//     <div class="picker-header">选择出战龟</div>
//     <div class="picker-buttons" id="pickerButtons">
//       <button class="picker-btn" style="border-color:${color}">
//         <span class="picker-emoji">${buildPetAvatarHTML(f, 36)}</span>
//         <span class="picker-name" style="color:${color}">${f.name}</span>
//       </button>
//     </div>
//   </div>
// JS CSS (battle.css:645-652):
//   .turtle-picker{bg rgba(10,14,24,.88);blur 6;radius 10;padding 8x14;mb 6;border 1px rgba(255,255,255,.08)}
//   .picker-header{12px bold #58a6ff(accent) center mb 6}
//   .picker-buttons{flex gap 8 center wrap}
//   .picker-btn{flex row align-center gap 8 bg .04 border 2 rgba .1 radius 10 padding 8x16 cursor pointer}
//   .picker-emoji{22px} (avatar 36px)
//   .picker-name{14px bold}
import Phaser from 'phaser';
import type { Fighter } from '../types';

const RARITY_COLOR_STR: Record<string, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* v0.9.9 #3: Steam 风选龟弹窗 — 渐变框+金边, 随 --poc-ui-scale 放大 */
    #poc-turtle-picker {
      position: fixed; left: 50%; bottom: calc(12px * var(--poc-ui-scale, 1)); transform: translateX(-50%);
      z-index: 200;
      max-width: 96vw;
      background: linear-gradient(180deg, rgba(24,32,54,.97), rgba(10,15,28,.98));
      backdrop-filter: blur(7px);
      border-radius: calc(16px * var(--poc-ui-scale, 1));
      padding: calc(12px * var(--poc-ui-scale, 1)) calc(22px * var(--poc-ui-scale, 1)) calc(14px * var(--poc-ui-scale, 1));
      margin-bottom: 6px;
      border: 2px solid #6b5430;
      box-shadow: 0 0 0 1px rgba(255,216,107,.22), 0 8px 28px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.1);
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
      color: #e6edf3;
      display: none;
      opacity: 0;
      transform: translate(-50%, 10px);
      transition: opacity .25s, transform .25s;
    }
    #poc-turtle-picker.show {
      display: block; opacity: 1;
      transform: translate(-50%, 0);
    }
    #poc-turtle-picker .picker-header {
      font-size: calc(17px * var(--poc-ui-scale, 1)); font-weight: 900; color: #ffe9a8;
      margin-bottom: calc(10px * var(--poc-ui-scale, 1)); text-align: center;
      text-shadow: 0 0 7px rgba(255,216,107,.45), 0 1px 2px rgba(0,0,0,.7);
      letter-spacing: 1px;
    }
    #poc-turtle-picker .picker-buttons {
      display: flex; gap: calc(12px * var(--poc-ui-scale, 1)); justify-content: center; flex-wrap: wrap;
    }
    #poc-turtle-picker .picker-btn {
      display: flex; flex-direction: row; align-items: center; gap: calc(10px * var(--poc-ui-scale, 1));
      background: linear-gradient(180deg, rgba(44,56,86,.72), rgba(20,28,46,.72));
      border: 2px solid rgba(120,140,180,.42);
      border-radius: calc(14px * var(--poc-ui-scale, 1));
      padding: calc(10px * var(--poc-ui-scale, 1)) calc(20px * var(--poc-ui-scale, 1));
      cursor: pointer;
      color: inherit;
      font-family: inherit;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 3px 8px rgba(0,0,0,.42);
      transition: .18s;
    }
    #poc-turtle-picker .picker-btn:hover {
      transform: translateY(-3px); filter: brightness(1.1);
      border-color: #ffd86b;
      box-shadow: 0 0 14px rgba(255,216,107,.4), inset 0 1px 0 rgba(255,255,255,.14), 0 4px 10px rgba(0,0,0,.5);
    }
    #poc-turtle-picker .picker-emoji {
      width: calc(56px * var(--poc-ui-scale, 1)); height: calc(56px * var(--poc-ui-scale, 1));
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: calc(10px * var(--poc-ui-scale, 1));
      border: 1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.32);
      box-shadow: inset 0 0 6px rgba(0,0,0,.4);
    }
    #poc-turtle-picker .picker-emoji img {
      width: 100%; height: 100%;
      object-fit: cover; border-radius: calc(9px * var(--poc-ui-scale, 1));
      image-rendering: pixelated;
    }
    #poc-turtle-picker .picker-name { font-size: calc(20px * var(--poc-ui-scale, 1)); font-weight: 900; }
  `;
  document.head.appendChild(st);
}

export class TurtlePicker {
  private scene: Phaser.Scene;
  private root: HTMLDivElement | null = null;
  private visible = false;
  private onPick: ((f: Fighter) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    installCss();
    const root = document.createElement('div');
    root.id = 'poc-turtle-picker';
    root.innerHTML = `<div class="picker-header">选择出战龟</div><div class="picker-buttons" id="poc-picker-buttons"></div>`;
    document.body.appendChild(root);
    this.root = root;
    // scene shutdown 清理
    scene.events.once('shutdown', () => this.destroy());
  }

  show(canAct: Fighter[], onPick: (f: Fighter) => void) {
    if (!this.root) return;
    this.onPick = onPick;
    const box = this.root.querySelector('#poc-picker-buttons') as HTMLElement | null;
    if (!box) return;
    box.innerHTML = canAct.map((f, i) => {
      const color = RARITY_COLOR_STR[f.rarity] ?? '#fff';
      return `<button class="picker-btn" data-idx="${i}" style="border-color:${color}">
        <span class="picker-emoji"><img src="avatars/${f.id}.png" alt="${f.name}" onerror="this.style.display='none'"></span>
        <span class="picker-name" style="color:${color}">${f.name}</span>
      </button>`;
    }).join('');
    box.querySelectorAll<HTMLButtonElement>('.picker-btn').forEach(btn => {
      const idx = parseInt(btn.dataset.idx ?? '-1', 10);
      btn.addEventListener('click', () => {
        const f = canAct[idx];
        if (!f) return;
        // BUG FIX: 先捕获 cb, 再 hide() — hide() 内部 this.onPick=null 会清掉, 不先存就触发不了
        const cb = this.onPick;
        this.hide();
        cb?.(f);
      });
    });
    this.root.classList.add('show');
    this.visible = true;
  }

  hide() {
    if (!this.root) return;
    this.root.classList.remove('show');
    this.visible = false;
    this.onPick = null;
  }

  isVisible(): boolean { return this.visible; }

  destroy() {
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.visible = false;
  }
}
