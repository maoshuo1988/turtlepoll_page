// ══════════════════════════════════════════════════════════
// sfx-synth.ts — Web Audio API 程序合成 SFX (1:1 JS audio.js)
//
// JS sfx 大部分用 Web Audio oscillator + noise 合成, 不依赖文件。
// 本模块 port 等价合成器, 供 Phaser 调用 (Phaser 的 sound 系统不适合做
// 实时合成, 用原生 WebAudio 走 masterGain → destination)。
// ══════════════════════════════════════════════════════════

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function ensureAudio(): AudioContext | null {
  if (!audioCtx) {
    const w = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx!.state === 'suspended') audioCtx!.resume();
  return audioCtx;
}

/** JS _osc — 单震荡器 + gain envelope (1:1 JS audio.js:134-144) */
function osc(type: OscillatorType, freq: number, dur: number, vol: number, freqEnd?: number): void {
  const c = ensureAudio();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * 0.8);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + dur);
}

/** JS _noise — 白噪声 buffer + decay envelope (1:1 JS audio.js:146-157) */
function noise(dur: number, vol: number): void {
  const c = ensureAudio();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  }
  const n = c.createBufferSource();
  const g = c.createGain();
  n.buffer = buf;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  n.connect(g);
  g.connect(masterGain);
  n.start(t);
}

// ─── per-skill SFX (1:1 JS audio.js 各 sfxXxx 函数) ───

/** JS sfxBuff: 2 sine 上升 (392→523, 523→659) */
export function sfxBuff(): void {
  osc('sine', 392, 0.15, 0.08, 523);
  osc('sine', 523, 0.12, 0.06, 659);
}

/** JS sfxDebuff: sawtooth 下行 (400→200) */
export function sfxDebuff(): void {
  osc('sawtooth', 400, 0.15, 0.08, 200);
}

/** JS sfxDodge: noise + sine 下行 */
export function sfxDodge(): void {
  noise(0.1, 0.08);
  osc('sine', 800, 0.08, 0.05, 400);
}

/** JS sfxCoin: 2 sine 高音 (1047→1568, 1319→1760) */
export function sfxCoin(): void {
  osc('sine', 1047, 0.08, 0.1, 1568);
  osc('sine', 1319, 0.06, 0.06, 1760);
}

/** JS sfxExplosion: noise + sawtooth + square */
export function sfxExplosion(): void {
  noise(0.25, 0.18);
  osc('sawtooth', 120, 0.3, 0.12, 30);
  osc('square', 60, 0.2, 0.08, 20);
}

/** JS sfxTrap: noise 短促 + square + triangle */
export function sfxTrap(): void {
  noise(0.04, 0.15);
  osc('square', 800, 0.04, 0.12, 200);
  osc('triangle', 200, 0.06, 0.08, 100);
}

/** JS sfxClick: 短促 sine 上升 */
export function sfxClick(): void {
  osc('sine', 600, 0.05, 0.06, 900);
}

/** 阶段2: 同步静音 — sound 面板静音时也把合成器 masterGain 拉 0 (否则 synth 仍响) */
export function setSfxMuted(muted: boolean): void {
  if (!masterGain || !audioCtx) return;
  masterGain.gain.setTargetAtTime(muted ? 0 : 0.25, audioCtx.currentTime, 0.02);
}

/** 阶段2: 全局 UI 点击音 — 一处监听, 命中 button/可点元素就播 sfxClick (顺带解锁 AudioContext)。
 *  在 main.ts 创建 game 后调一次即可覆盖所有 DOM 浮层 UI。 */
let uiClickInstalled = false;
export function installUiClickSfx(): void {
  if (uiClickInstalled || typeof document === 'undefined') return;
  uiClickInstalled = true;
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t || !t.closest) return;
    // 排除开发按钮(调试/反馈)免得点它们也响; 命中常见可点元素才播
    if (t.closest('#poc-fb-btn, [data-act="debug"]')) return;
    if (t.closest('button, [role="button"], .picker-btn, .skill-card, .nt, .nt-game, .ds-tab, .poc-synergy-chip, a[href]')) {
      sfxClick();
    }
  }, { capture: true });
}

/** JS sfxTurnStart: 短 triangle 上升 */
export function sfxTurnStart(): void {
  osc('triangle', 523, 0.06, 0.06, 784);
}

/** JS sfxBambooCharge: 复合 drain 音 (sine + triangle + filtered noise) */
export function sfxBambooCharge(): void {
  const c = ensureAudio();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  // Deep drone
  const o1 = c.createOscillator(), g1 = c.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(220, t);
  o1.frequency.exponentialRampToValueAtTime(80, t + 0.5);
  g1.gain.setValueAtTime(0.12, t);
  g1.gain.linearRampToValueAtTime(0.15, t + 0.2);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o1.connect(g1); g1.connect(masterGain);
  o1.start(t); o1.stop(t + 0.6);
  // Eerie overtone
  const o2 = c.createOscillator(), g2 = c.createGain();
  o2.type = 'triangle';
  o2.frequency.setValueAtTime(330, t);
  o2.frequency.exponentialRampToValueAtTime(110, t + 0.45);
  g2.gain.setValueAtTime(0.06, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o2.connect(g2); g2.connect(masterGain);
  o2.start(t); o2.stop(t + 0.5);
  // Suction whoosh
  const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  }
  const n = c.createBufferSource(), gn = c.createGain(), flt = c.createBiquadFilter();
  n.buffer = buf;
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(1200, t);
  flt.frequency.exponentialRampToValueAtTime(150, t + 0.45);
  flt.Q.value = 3;
  gn.gain.setValueAtTime(0.08, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  n.connect(flt); flt.connect(gn); gn.connect(masterGain);
  n.start(t);
}

/** JS sfxBambooHit: thud + ascending absorb */
export function sfxBambooHit(): void {
  const c = ensureAudio();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  const o1 = c.createOscillator(), g1 = c.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(100, t);
  o1.frequency.exponentialRampToValueAtTime(60, t + 0.15);
  g1.gain.setValueAtTime(0.15, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o1.connect(g1); g1.connect(masterGain);
  o1.start(t); o1.stop(t + 0.2);
  const o2 = c.createOscillator(), g2 = c.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(150, t + 0.05);
  o2.frequency.exponentialRampToValueAtTime(400, t + 0.35);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(0.1, t + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  o2.connect(g2); g2.connect(masterGain);
  o2.start(t + 0.05); o2.stop(t + 0.4);
  osc('triangle', 220, 0.15, 0.08, 110);
}

/** JS sfxFire/Lightning: 都 fallback 到 hit-physical 但 Phaser 没 throttle.
 *  Phaser 端建议: 通过 scene.sound.play('sfx-hit') 触发文件 — 这里仅 stub
 *  让调用端能编译通过, 实际 hit sound 由 Phaser playDmgSfx 走文件路径。
 */
export function sfxFire(): void { /* fallback: 让调用端用 scene.sound.play('sfx-hit') */ }
export function sfxLightning(): void { /* 同上 */ }

/** JS sfxBattleStart: 4 triangle 上升 fanfare */
export function sfxBattleStart(): void {
  const c = ensureAudio();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  [392, 494, 587, 784].forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t + i * 0.1);
    g.gain.setValueAtTime(0.12, t + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
    o.connect(g); g.connect(masterGain!);
    o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.25);
  });
}

/** JS sfxVictory: 5 sine 上升 triumphant */
export function sfxVictory(): void {
  const c = ensureAudio();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t + i * 0.12);
    g.gain.setValueAtTime(0.1, t + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
    o.connect(g); g.connect(masterGain!);
    o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.3);
  });
}
