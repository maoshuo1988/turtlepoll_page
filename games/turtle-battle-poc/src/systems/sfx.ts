// ══════════════════════════════════════════════════════════
// sfx.ts — 按伤害类型选音效 (JS engine.js:765-773 同款映射)
// 我们只有 7 个原始 wav, 缺 magic/true/dodge — 用 detune+rate 派生
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { DamageType } from '../types';

export interface SfxOpts {
  type?: DamageType;
  isCrit?: boolean;
  /** dmg 被护盾吸收 (出 shield-break 音) */
  shieldHit?: boolean;
  /** target dodged (出 dodge 音) */
  dodged?: boolean;
  volume?: number;
}

export function playDmgSfx(scene: Phaser.Scene, opts: SfxOpts = {}) {
  const { type = 'physical', isCrit, shieldHit, dodged } = opts;
  const baseVol = opts.volume ?? 0.6;

  if (dodged) {
    // dodge: 用 heal 高音 + 短促 (whoosh)
    scene.sound.play('sfx-heal', { volume: baseVol * 0.55, rate: 1.6, detune: 400 });
    return;
  }
  if (shieldHit) {
    scene.sound.play('sfx-shield-break', { volume: baseVol * 0.85 });
    return;
  }
  if (isCrit) {
    scene.sound.play('sfx-crit', { volume: baseVol });
    return;
  }
  switch (type) {
    case 'magic':
      // 魔法: 高音 hit
      scene.sound.play('sfx-hit', { volume: baseVol * 0.85, detune: 500, rate: 1.15 });
      break;
    case 'true':
      // 真伤: 低音 hit + 略低音量 (沉重感)
      scene.sound.play('sfx-hit', { volume: baseVol * 0.95, detune: -500, rate: 0.92 });
      break;
    case 'physical':
    default:
      scene.sound.play('sfx-hit', { volume: baseVol });
      break;
  }
}

export function playHealSfx(scene: Phaser.Scene, vol: number = 0.5) {
  scene.sound.play('sfx-heal', { volume: vol });
}

export function playShieldGainSfx(scene: Phaser.Scene, vol: number = 0.5) {
  if (scene.cache.audio.exists('sfx-shield-gain')) {
    scene.sound.play('sfx-shield-gain', { volume: vol });
  } else {
    scene.sound.play('sfx-heal', { volume: vol * 0.7, detune: 200 });
  }
}
