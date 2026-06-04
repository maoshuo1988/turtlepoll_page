// ══════════════════════════════════════════════════════════
// TutorialGuide — P221 新手教程步骤引导 (DOM 顶部横幅 + 下一步/跳过)
// ══════════════════════════════════════════════════════════
// 非阻挡式提示条 (除自身按钮外不吃指针), 玩家照提示在真实战斗里操作,
// 点"下一步"推进。可选 advanceOn 事件 → 玩家完成对应动作时自动推进。
import Phaser from 'phaser';

export interface TutorialStep {
  text: string;
  /** 完成该步的事件名 (BattleScene 在对应动作发生时 emit); 不填则只能手动"下一步" */
  advanceOn?: string;
  /** 提示锚点: 'bench' | 'enemy' | 'center' — 决定横幅竖直位置避免挡操作 */
  anchor?: 'top' | 'bottom';
}

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    #poc-tutorial-guide{
      position:fixed; left:50%; transform:translateX(-50%);
      z-index:8000; width:min(620px,82vw);
      background:rgba(18,28,52,.96);
      border:2px solid #ffd93d; border-radius:12px; padding:14px 18px;
      box-shadow:0 6px 30px rgba(0,0,0,.55);
      font-family:'pixel-zh', 'Microsoft YaHei',system-ui,sans-serif; color:#eaf0fa;
      display:flex; flex-direction:column; gap:10px; pointer-events:auto;
    }
    #poc-tutorial-guide.top{ top:14px; } #poc-tutorial-guide.bottom{ bottom:120px; }
    #poc-tutorial-guide .tg-row{ display:flex; align-items:center; gap:12px; }
    #poc-tutorial-guide .tg-badge{ flex:0 0 auto; background:#ffd93d; color:#3a1f00; font-weight:700;
      border-radius:6px; padding:2px 9px; font-size:13px; }
    #poc-tutorial-guide .tg-text{ flex:1 1 auto; font-size:15px; line-height:1.5; }
    #poc-tutorial-guide .tg-btns{ display:flex; gap:10px; justify-content:flex-end; }
    #poc-tutorial-guide button{ border:none; border-radius:7px; padding:7px 18px; font-size:14px; cursor:pointer; font-family:inherit; }
    #poc-tutorial-guide .tg-next{ background:linear-gradient(180deg,#ffe27a,#ffb01f); color:#3a1f00; font-weight:700; }
    #poc-tutorial-guide .tg-skip{ background:transparent; color:#8b96ac; border:1px solid #44506e; }
  `;
  document.head.appendChild(st);
}

export class TutorialGuide {
  private root: HTMLDivElement;
  private steps: TutorialStep[];
  private idx = 0;
  private onDone: () => void;

  constructor(scene: Phaser.Scene, steps: TutorialStep[], onDone: () => void) {
    installCss();
    this.steps = steps;
    this.onDone = onDone;
    this.root = document.createElement('div');
    this.root.id = 'poc-tutorial-guide';
    document.body.appendChild(this.root);
    this.render();
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  /** BattleScene 在动作发生时调: 若当前步在等这个事件则自动推进 */
  notify(event: string) {
    const step = this.steps[this.idx];
    if (step && step.advanceOn === event) this.next();
  }

  private next() {
    this.idx++;
    if (this.idx >= this.steps.length) { this.destroy(); this.onDone(); return; }
    this.render();
  }

  private render() {
    const step = this.steps[this.idx];
    if (!step) return;
    this.root.className = step.anchor === 'top' ? 'top' : 'bottom';
    const isLast = this.idx === this.steps.length - 1;
    this.root.innerHTML = `
      <div class="tg-row">
        <span class="tg-badge">${this.idx + 1}/${this.steps.length}</span>
        <span class="tg-text">${step.text}</span>
      </div>
      <div class="tg-btns">
        ${this.idx < this.steps.length - 1 ? '<button class="tg-skip">跳过教程</button>' : ''}
        <button class="tg-next">${isLast ? '完成 ✓' : (step.advanceOn ? '知道了' : '下一步 ▶')}</button>
      </div>`;
    const nextBtn = this.root.querySelector<HTMLButtonElement>('.tg-next');
    if (nextBtn) nextBtn.onclick = () => this.next();
    const skipBtn = this.root.querySelector<HTMLButtonElement>('.tg-skip');
    if (skipBtn) skipBtn.onclick = () => { this.destroy(); this.onDone(); };
  }

  destroy() {
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
