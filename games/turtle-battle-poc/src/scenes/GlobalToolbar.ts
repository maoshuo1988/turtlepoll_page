// ══════════════════════════════════════════════════════════
// GlobalToolbar — 音量 + 全屏 顶右 global 按钮, 1:1 复刻 JS
// index.html:122-124 + base.css:136-143
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:122-124, body-level 不在 #screenBattle 内):
//   <button class="btn-sound-global" id="soundBtn" onclick="toggleSoundPanel(event)">🔊</button>
//   <button class="btn-fullscreen-global" id="fullscreenBtn" onclick="toggleFullscreen()" title="全屏">⛶</button>
//
// JS CSS (base.css:136-143):
//   .btn-sound-global{
//     position:fixed; top:8px; right:8px; z-index:999;
//     width:32px; height:32px; border-radius:50%;
//     border:1px solid rgba(255,255,255,.15);
//     background:rgba(15,20,30,.8); backdrop-filter:blur(4px);
//     color:#fff; font-size:14px; cursor:pointer;
//     display:flex; align-items:center; justify-content:center
//   }
//   body:has(#screenBattle.active) .btn-sound-global{ top:46px }
//   .btn-fullscreen-global{ ...same... top:8px; right:46px }
//   body:has(#screenBattle.active) .btn-fullscreen-global{ top:46px; right:46px }
//   @media (min-width:801px) {
//     body:has(#screenBattle.active) .btn-fullscreen-global{ top:12px; right:56px }
//   }
//
// PHASER DIVERGENCE:
//   - JS is body-level global (跨 screen); poc 暂只在 BattleScene 实例化.
//   - body:has() top:46px 是 JS 在战斗页让位 BattleTopRow.
// P24: 完整 sound panel 接入 (JS audio.js:102-131 + index.html:132-148 1:1) —
//   点 🔊 弹 BGM/SFX slider + mute 切换 panel, 点空白关.
import Phaser from 'phaser';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* v0.9.9 #7: 音乐/全屏贴图按钮 — 与战斗顶栏 help/log/stats 同一行(top:12)、同尺寸、
       同间距单位对齐。右起: 全屏(8) → 音乐(8+unit) → [统计/日志/术语 在 BattleTopRow]。
       尺寸/单位用 BattleTopRow :root 定义的 --poc-chrome-*, 带 fallback 防未初始化。 */
    .poc-btn-sound-global, .poc-btn-fullscreen-global {
      position: fixed; top: 12px; z-index: 999;
      width: var(--poc-chrome-btn, 52px); height: var(--poc-chrome-btn, 52px);
      border: none; background: transparent;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      padding: 0;
      transition: .15s;
    }
    .poc-btn-sound-global img, .poc-btn-fullscreen-global img {
      width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;
      transition: transform .15s, filter .15s;
    }
    .poc-btn-sound-global:hover img, .poc-btn-fullscreen-global:hover img {
      transform: scale(1.1); filter: brightness(1.15) drop-shadow(0 0 5px rgba(255,216,107,.6));
    }
    /* 静音时音乐键灰显 */
    .poc-btn-sound-global.muted img { filter: grayscale(1) brightness(.6); }
    .poc-btn-fullscreen-global { right: 8px; }
    .poc-btn-sound-global      { right: calc(8px + var(--poc-chrome-unit, 62px)); }
    /* P24 sound panel — JS base.css:155-162 1:1 */
    .poc-sound-panel {
      position: fixed; top: 46px; right: 8px; z-index: 1000;
      background: rgba(15,20,30,.95);
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 8px;
      padding: 10px 12px;
      backdrop-filter: blur(8px);
      min-width: 200px;
      display: none;
      box-shadow: 0 4px 16px rgba(0,0,0,.5);
      font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    .poc-sound-panel.show { display: block; }
    @media (min-width: 801px) {
      .poc-sound-panel { top: 52px; right: 16px; }
    }
    .poc-sound-panel-row {
      display: flex; align-items: center; gap: 8px;
      margin: 6px 0; color: #fff; font-size: 12px;
    }
    .poc-sound-panel-title { font-weight: 700; font-size: 13px; }
    .poc-sound-panel-label { flex: 0 0 48px; color: #aab; }
    .poc-sound-panel-pct {
      flex: 0 0 38px; text-align: right; color: #aab;
      font-variant-numeric: tabular-nums;
    }
    .poc-sound-panel input[type=range] {
      flex: 1; accent-color: #4cc9f0; cursor: pointer;
    }
    .poc-sound-mute-btn {
      background: rgba(255,255,255,.06); color: #fff;
      border: 1px solid rgba(255,255,255,.15); border-radius: 4px;
      padding: 2px 8px; font-size: 14px;
      cursor: pointer; font-family: inherit;
    }
  `;
  document.head.appendChild(st);
}

export class GlobalToolbar {
  private scene: Phaser.Scene;
  private soundBtn: HTMLButtonElement | null = null;
  private fsBtn: HTMLButtonElement | null = null;
  private soundPanel: HTMLDivElement | null = null;
  private outsideClickHandler?: (e: MouseEvent) => void;

  constructor(scene: Phaser.Scene) {
    installCss();
    this.scene = scene;

    this.soundBtn = document.createElement('button');
    this.soundBtn.className = 'poc-btn-sound-global';
    this.soundBtn.id = 'poc-sound-btn';
    this.soundBtn.title = '音量';
    this.soundBtn.innerHTML = `<img src="ui/btn-sound.png" alt="音量">`;
    this.soundBtn.classList.toggle('muted', scene.sound.mute);
    // P24: 点击弹 sound panel (JS audio.js:102 toggleSoundPanel 1:1), 不再 toggleMute.
    this.soundBtn.addEventListener('click', (ev) => { ev.stopPropagation(); this.toggleSoundPanel(); });
    document.body.appendChild(this.soundBtn);

    // P24: 构造 sound panel DOM
    this.soundPanel = document.createElement('div');
    this.soundPanel.className = 'poc-sound-panel';
    this.soundPanel.id = 'poc-sound-panel';
    const bgmVal = Math.round(((scene.sound as unknown as { volume?: number }).volume ?? 0.35) * 100);
    const sfxVal = 50;
    this.soundPanel.innerHTML = `
      <div class="poc-sound-panel-row">
        <button class="poc-sound-mute-btn" id="poc-sound-mute">${scene.sound.mute ? '🔇' : '🔊'}</button>
        <span class="poc-sound-panel-title">音量</span>
      </div>
      <div class="poc-sound-panel-row">
        <span class="poc-sound-panel-label">主音乐</span>
        <input type="range" id="poc-bgm-slider" min="0" max="100" value="${bgmVal}">
        <span class="poc-sound-panel-pct" id="poc-bgm-pct">${bgmVal}%</span>
      </div>
      <div class="poc-sound-panel-row">
        <span class="poc-sound-panel-label">音效</span>
        <input type="range" id="poc-sfx-slider" min="0" max="100" value="${sfxVal}">
        <span class="poc-sound-panel-pct" id="poc-sfx-pct">${sfxVal}%</span>
      </div>
    `;
    document.body.appendChild(this.soundPanel);
    // wire sliders + mute
    this.soundPanel.querySelector<HTMLInputElement>('#poc-bgm-slider')?.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      this.scene.sound.volume = v;
      const pct = this.soundPanel?.querySelector<HTMLSpanElement>('#poc-bgm-pct');
      if (pct) pct.textContent = `${Math.round(v * 100)}%`;
    });
    this.soundPanel.querySelector<HTMLInputElement>('#poc-sfx-slider')?.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      // sfx volume — poc 没分 sfx 通道, 暂作 master tweak (留 hook 给将来分通道)
      (window as { _pocSfxVolume?: number })._pocSfxVolume = v;
      const pct = this.soundPanel?.querySelector<HTMLSpanElement>('#poc-sfx-pct');
      if (pct) pct.textContent = `${Math.round(v * 100)}%`;
    });
    this.soundPanel.querySelector<HTMLButtonElement>('#poc-sound-mute')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.toggleMute();
    });

    this.fsBtn = document.createElement('button');
    this.fsBtn.className = 'poc-btn-fullscreen-global';
    this.fsBtn.id = 'poc-fullscreen-btn';
    this.fsBtn.title = '全屏';
    this.fsBtn.innerHTML = `<img src="ui/btn-fullscreen.png" alt="全屏">`;
    this.fsBtn.addEventListener('click', () => this.toggleFullscreen());
    document.body.appendChild(this.fsBtn);

    // 全屏状态变化时同步图标
    document.addEventListener('fullscreenchange', this.onFsChange);

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  private onFsChange = () => {
    if (!this.fsBtn) return;
    // 贴图按钮不换图, 只用 title 区分
    this.fsBtn.title = document.fullscreenElement ? '退出全屏' : '全屏';
  };

  private toggleMute() {
    this.scene.sound.mute = !this.scene.sound.mute;
    if (this.soundBtn) this.soundBtn.classList.toggle('muted', this.scene.sound.mute);
    const muteBtn = this.soundPanel?.querySelector<HTMLButtonElement>('#poc-sound-mute');
    if (muteBtn) muteBtn.textContent = this.scene.sound.mute ? '🔇' : '🔊';
    // 阶段2: 同步静音 Web Audio 合成器 (否则 synth SFX 仍响)
    import('../systems/sfx-synth').then(({ setSfxMuted }) => setSfxMuted(this.scene.sound.mute));
  }

  /** P24 toggleSoundPanel — JS audio.js:102-131 1:1 */
  private toggleSoundPanel() {
    if (!this.soundPanel) return;
    const opening = !this.soundPanel.classList.contains('show');
    this.soundPanel.classList.toggle('show', opening);
    if (opening) {
      // outside click 关掉 — JS 同款 auto-dismiss
      setTimeout(() => {
        this.outsideClickHandler = (e: MouseEvent) => {
          if (!this.soundPanel) return;
          const t = e.target as HTMLElement;
          if (!this.soundPanel.contains(t) && t !== this.soundBtn) {
            this.soundPanel.classList.remove('show');
            if (this.outsideClickHandler) {
              document.removeEventListener('click', this.outsideClickHandler);
              this.outsideClickHandler = undefined;
            }
          }
        };
        document.addEventListener('click', this.outsideClickHandler);
      }, 0);
    } else if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = undefined;
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {/* ignore */});
    } else {
      document.exitFullscreen?.().catch(() => {/* ignore */});
    }
  }

  destroy() {
    document.removeEventListener('fullscreenchange', this.onFsChange);
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = undefined;
    }
    if (this.soundPanel?.parentNode) this.soundPanel.parentNode.removeChild(this.soundPanel);
    this.soundPanel = null;
    if (this.soundBtn?.parentNode) this.soundBtn.parentNode.removeChild(this.soundBtn);
    if (this.fsBtn?.parentNode) this.fsBtn.parentNode.removeChild(this.fsBtn);
    this.soundBtn = null;
    this.fsBtn = null;
  }
}
