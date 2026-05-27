// ══════════════════════════════════════════════════════════
// vfx/skills.ts — Phase B 的 5 个示范技能特效
// 每个函数: scene + 攻击者 view + 目标 view(s) → 播视觉, 并 emit bus 事件让 dispatcher 飘字
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { Fighter } from '../types';
import { bus } from '../systems/bus';

export interface ViewLike {
  fighter: Fighter;
  sprite: Phaser.GameObjects.GameObject & { x: number; y: number };
  homeX: number;
  homeY: number;
}

// ── 0. 近战 arc trail + impact burst (JS basic.js:46-75 同款) ─────
/**
 * 金色弧线扫过目标 + 击中粒子爆发
 * 用在普攻 / shield-bash / chop 类近战技能, 跟攻击 hop 配合
 */
export function playMeleeArcTrail(
  scene: Phaser.Scene,
  attackerLeft: boolean,
  targetX: number,
  targetY: number,
): void {
  // 弧线方向: 左方→右下挥, 右方→左下挥
  const arcDir = attackerLeft ? 1 : -1;
  // 起始点: 目标上方 + 攻击者前侧
  const startX = targetX - arcDir * 50;
  const startY = targetY - 40;
  const midX = targetX - arcDir * 10;
  const midY = targetY - 25;
  const endX = targetX + arcDir * 20;
  const endY = targetY + 10;

  // 画 3 段贝塞尔弧线 (用 graphics, 渐变 alpha + 渐细)
  const g = scene.add.graphics().setDepth(45);
  let progress = 0;
  const segments = 12;
  const startTime = scene.time.now;
  const totalDur = 280;
  const tick = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      const elapsed = scene.time.now - startTime;
      progress = Math.min(1, elapsed / totalDur);
      g.clear();
      // 渐淡尾迹: 沿弧线 segments 个圆点, 头亮尾暗
      const drawTo = Math.floor(progress * segments);
      for (let i = 0; i <= drawTo; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
        const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
        const tailAlpha = (i / drawTo) * (1 - progress * 0.7);
        const r = 9 - i * 0.4;
        g.fillStyle(0xffd33a, Math.max(0, tailAlpha));
        g.fillCircle(x, y, Math.max(2, r));
        // 内层亮色
        g.fillStyle(0xffffff, Math.max(0, tailAlpha * 0.6));
        g.fillCircle(x, y, Math.max(1, r * 0.4));
      }
      if (progress >= 1) {
        tick.remove();
        g.destroy();
      }
    },
  });

  // impact burst (250ms 后, 弧线刚到目标)
  scene.time.delayedCall(220, () => {
    const burst = scene.add.particles(targetX, targetY, '__DEFAULT', {
      lifespan: 350,
      speed: { min: 80, max: 200 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd33a, 0xffffff, 0xffaa00],
      blendMode: 'ADD',
      quantity: 14,
      emitting: false,
    }).setDepth(46);
    burst.explode(14);
    scene.time.delayedCall(400, () => burst.destroy());
    // 中心闪光圈
    const flash = scene.add.circle(targetX, targetY, 8, 0xffffff, 1).setDepth(47);
    scene.tweens.add({
      targets: flash,
      radius: 26, alpha: 0, scale: 2.2,
      duration: 280, ease: 'power2.out',
      onComplete: () => flash.destroy(),
    });
  });
}

// ── 1. 火球术 ──────────────────────────────────────────────
export function castFireball(
  scene: Phaser.Scene,
  caster: ViewLike,
  target: ViewLike,
  damage: number,
): Promise<void> {
  return new Promise((resolve) => {
    scene.sound.play('sfx-hit', { volume: 0.4 });
    const fb = scene.add.circle(caster.sprite.x, caster.sprite.y, 12, 0xff6a00, 1).setDepth(40);
    const glow = scene.add.circle(caster.sprite.x, caster.sprite.y, 22, 0xffaa33, 0.55).setDepth(39);
    const trail = scene.add.particles(0, 0, '__DEFAULT', {
      follow: fb,
      lifespan: 350,
      speed: { min: 10, max: 40 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xff4400, 0xff8800, 0xffcc33],
      frequency: 16,
      blendMode: 'ADD',
    }).setDepth(38);

    scene.tweens.add({
      targets: [fb, glow],
      x: target.sprite.x,
      y: target.sprite.y,
      duration: 350,
      ease: 'power2.in',
      onComplete: () => {
        const burst = scene.add.particles(target.sprite.x, target.sprite.y, '__DEFAULT', {
          lifespan: 500,
          speed: { min: 80, max: 220 },
          scale: { start: 1.0, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: [0xff2200, 0xff7700, 0xffdd33],
          quantity: 24,
          blendMode: 'ADD',
          emitting: false,
        }).setDepth(45);
        burst.explode(24);
        fb.destroy(); glow.destroy(); trail.stop();
        scene.time.delayedCall(500, () => { trail.destroy(); burst.destroy(); });
        scene.cameras.main.shake(180, 0.012);
        bus.emit('damage:visual', {
          target: target.fighter, amount: damage, via: 'skill:fireball',
          atkSide: caster.fighter.side, floatCls: 'magic-dmg',
        });
        resolve();
      },
    });
  });
}

// ── 2. 治疗光环 ────────────────────────────────────────────
export function castHealAura(
  scene: Phaser.Scene,
  caster: ViewLike,
  allies: ViewLike[],
  amountEach: number,
): Promise<void> {
  return new Promise((resolve) => {
    scene.sound.play('sfx-heal', { volume: 0.4 });
    // 中心绿色脉冲
    const pulse = scene.add.circle(caster.sprite.x, caster.sprite.y, 30, 0x4ade80, 0.6).setDepth(35);
    scene.tweens.add({
      targets: pulse,
      radius: 200,
      alpha: 0,
      duration: 700,
      ease: 'cubic.out',
      onUpdate: () => { pulse.setRadius((pulse as unknown as { radius: number }).radius); },
      onComplete: () => pulse.destroy(),
    });

    // 每个友军附近撒治疗粒子
    allies.forEach((a, i) => {
      scene.time.delayedCall(80 + i * 70, () => {
        const burst = scene.add.particles(a.sprite.x, a.sprite.y, '__DEFAULT', {
          lifespan: 700,
          speed: { min: 30, max: 100 },
          scale: { start: 0.7, end: 0 },
          alpha: { start: 0.9, end: 0 },
          tint: [0x4ade80, 0x86efac, 0xa7f3d0],
          quantity: 18,
          blendMode: 'ADD',
          emitting: false,
        }).setDepth(45);
        burst.explode(18);
        scene.time.delayedCall(800, () => burst.destroy());

        bus.emit('heal:visual', {
          target: a.fighter, amount: amountEach, via: 'skill:heal-aura',
        });
      });
    });

    scene.time.delayedCall(900, () => resolve());
  });
}

// ── 3. 闪电链 ──────────────────────────────────────────────
export function castChainLightning(
  scene: Phaser.Scene,
  caster: ViewLike,
  targets: ViewLike[],         // 已排好的命中顺序
  damagePerHit: number[],      // 每跳伤害, 长度 = targets.length
): Promise<void> {
  return new Promise((resolve) => {
    scene.sound.play('sfx-crit', { volume: 0.5 });
    const sequence: ViewLike[] = [caster, ...targets];

    targets.forEach((tgt, idx) => {
      scene.time.delayedCall(idx * 220, () => {
        const from = sequence[idx];
        const to = sequence[idx + 1];

        // 闪电线段 (Phaser Graphics)
        const g = scene.add.graphics().setDepth(46);
        g.lineStyle(4, 0xa5f3fc, 1);
        // jagged line
        const points: Array<{ x: number; y: number }> = [{ x: from.sprite.x, y: from.sprite.y }];
        const steps = 6;
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const ox = from.sprite.x + (to.sprite.x - from.sprite.x) * t + (Math.random() - 0.5) * 24;
          const oy = from.sprite.y + (to.sprite.y - from.sprite.y) * t + (Math.random() - 0.5) * 24;
          points.push({ x: ox, y: oy });
        }
        points.push({ x: to.sprite.x, y: to.sprite.y });
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
        g.strokePath();

        // 命中点白光
        const flash = scene.add.circle(to.sprite.x, to.sprite.y, 30, 0xffffff, 0.8).setDepth(47);
        scene.tweens.add({ targets: [g, flash], alpha: 0, duration: 200, onComplete: () => { g.destroy(); flash.destroy(); } });

        // 麻痹 tint
        if ('setTint' in to.sprite) {
          (to.sprite as unknown as Phaser.GameObjects.Sprite).setTint(0xa5f3fc);
          scene.time.delayedCall(300, () => (to.sprite as unknown as Phaser.GameObjects.Sprite).clearTint());
        }

        bus.emit('damage:visual', {
          target: tgt.fighter, amount: damagePerHit[idx] ?? 0, via: 'skill:chain-lightning',
          atkSide: caster.fighter.side, floatCls: 'magic-dmg',
        });
      });
    });

    scene.time.delayedCall(targets.length * 220 + 200, () => resolve());
  });
}

// ── 4. 生命偷取 (普攻附带, 在 doDamage 后调) ───────────────────
export function playLifesteal(
  scene: Phaser.Scene,
  caster: ViewLike,
  target: ViewLike,
  healAmount: number,
): Promise<void> {
  return new Promise((resolve) => {
    // 红色粒子从 target → caster
    const p = scene.add.particles(target.sprite.x, target.sprite.y, '__DEFAULT', {
      lifespan: 500,
      moveToX: caster.sprite.x,
      moveToY: caster.sprite.y,
      speed: { min: 200, max: 400 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xff1744, 0xff6688],
      quantity: 12,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(44);
    p.explode(12);

    bus.emit('heal:visual', { target: caster.fighter, amount: healAmount, via: 'skill:lifesteal' });

    scene.time.delayedCall(550, () => { p.destroy(); resolve(); });
  });
}

// ── 5. 反伤 / 荆棘 (受击时触发) ────────────────────────────
export function playThorns(
  scene: Phaser.Scene,
  defender: ViewLike,
  attacker: ViewLike,
  reflectDmg: number,
): Promise<void> {
  return new Promise((resolve) => {
    scene.sound.play('sfx-shield-break', { volume: 0.4 });
    // defender 周围黄色刺花
    const burst = scene.add.particles(defender.sprite.x, defender.sprite.y, '__DEFAULT', {
      lifespan: 400,
      speed: { min: 100, max: 200 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xfde047, 0xfbbf24, 0xfacc15],
      quantity: 16,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(45);
    burst.explode(16);

    // 一道黄线打回 attacker
    const g = scene.add.graphics().setDepth(45);
    g.lineStyle(3, 0xfde047, 0.9);
    g.lineBetween(defender.sprite.x, defender.sprite.y, attacker.sprite.x, attacker.sprite.y);
    scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });

    bus.emit('damage:visual', {
      target: attacker.fighter, amount: reflectDmg, via: 'skill:thorns',
      atkSide: defender.fighter.side, floatCls: 'true-dmg',
    });

    scene.time.delayedCall(450, () => { burst.destroy(); resolve(); });
  });
}

// ══════════════════════════════════════════════════════════
// E3/23: launchWaveSweep — JS equip-effects.js:402-451 1:1
//
// row (front/back) 的单位 y 求均值 = wave y
// wave 从屏幕左 (-120) 横扫到屏幕右 (sceneW+120), 2000ms 总长
// 经过每个 unit 的 x 时调 onHit(unit) (按 x 排序 + 时间比例 delay)
// ══════════════════════════════════════════════════════════
export async function launchWaveSweep(
  scene: Phaser.Scene,
  rowKey: 'front' | 'back',
  allUnits: Array<{ fighter: import('../types').Fighter; sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; }>,
  onHit: (fighter: import('../types').Fighter) => void,
): Promise<void> {
  const sceneW = scene.scale.gameSize.width;
  const sceneH = scene.scale.gameSize.height;
  // 找该行所有 alive unit, 按 x 排序
  const targets = allUnits
    .filter(v => v.fighter.alive && v.fighter._slotKey?.startsWith(rowKey + '-'))
    .map(v => ({ fighter: v.fighter, x: v.sprite.x, y: v.sprite.y }))
    .sort((a, b) => a.x - b.x);
  // wave y = 平均 y, 没目标用屏中
  const waveY = targets.length > 0
    ? targets.reduce((s, t) => s + t.y, 0) / targets.length
    : sceneH / 2;
  const dur = 2000;
  const startX = -120;
  const endX = sceneW + 120;
  const travel = endX - startX;

  // K12: 用真 wave-sweep 贴图 (JS equip-effects.js:418 img 220×110); 纹理缺失才回退 graphics。
  let wave: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  if (scene.textures.exists('vfx-wave-sweep')) {
    const img = scene.add.image(startX, waveY, 'vfx-wave-sweep')
      .setDepth(45).setDisplaySize(220, 110).setAlpha(0);
    try { img.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); } catch { /* ignore */ }
    wave = img;
  } else {
    const g = scene.add.graphics().setDepth(45);
    g.fillGradientStyle(0x6bccff, 0x6bccff, 0xffffff, 0xffffff, 0.9, 0.7, 0.3, 0.1);
    g.fillRoundedRect(-110, -55, 220, 110, 20);
    g.lineStyle(3, 0x88ddff, 0.8);
    g.strokeRoundedRect(-110, -55, 220, 110, 20);
    g.x = startX; g.y = waveY; g.alpha = 0;
    wave = g;
  }

  // 入场淡入 (8% × 2000 = 160ms)
  scene.tweens.add({ targets: wave, alpha: 1, duration: 160 });
  // 移动到右
  scene.tweens.add({
    targets: wave,
    x: endX,
    duration: dur,
    ease: 'linear',
    onComplete: () => {
      scene.tweens.add({
        targets: wave, alpha: 0, duration: 200,
        onComplete: () => wave.destroy(),
      });
    },
  });

  // 按 x 顺序触发 onHit (wave 经过 unit.x 时)
  for (const t of targets) {
    const ratio = (t.x - startX) / travel;
    const delay = Math.max(0, Math.round(ratio * dur));
    scene.time.delayedCall(delay, () => onHit(t.fighter));
  }

  await new Promise<void>(r => scene.time.delayedCall(dur + 200, () => r()));
}

// ══════════════════════════════════════════════════════════
// E3/23: launchMiniCrystalBeam — JS equip-effects.js:638-734 1:1
//
// 一道红光以 owner 为中心顺时针旋转 180° (1400ms 总长)
// 触碰到敌人时落 20 magic + 1 mini-crystal 层 (按角度排序触发)
// 左队 owner: startAng=-90, endAng=+90 (-90°→+90° 半圆, 敌人在右)
// 右队 owner: startAng=+90, endAng=+270 (+90°→+270° 半圆, 敌人在左, 跨负角)
// ══════════════════════════════════════════════════════════
export async function launchMiniCrystalBeam(
  scene: Phaser.Scene,
  owner: { sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; fighter: import('../types').Fighter },
  enemies: Array<{ fighter: import('../types').Fighter; sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image }>,
  onHit: (target: import('../types').Fighter) => void,
): Promise<void> {
  const ownerCenter = { x: owner.sprite.x, y: owner.sprite.y };
  // 计算每个敌人相对 owner 的角度 + 距离
  const enemiesWithAngle = enemies
    .filter(e => e.fighter.alive)
    .map(e => {
      const dx = e.sprite.x - ownerCenter.x;
      const dy = e.sprite.y - ownerCenter.y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      return { fighter: e.fighter, ang, dist: Math.hypot(dx, dy) };
    });
  if (enemiesWithAngle.length === 0) return;

  const ownerOnLeft = owner.fighter.side === 'left';
  const startAng = ownerOnLeft ? -90 : 90;
  const endAng = ownerOnLeft ? 90 : 270;
  const normalize = (a: number) => ownerOnLeft ? a : (a < 0 ? a + 360 : a);
  enemiesWithAngle.sort((a, b) => normalize(a.ang) - normalize(b.ang));

  const dur = 1400;
  const maxDist = enemiesWithAngle.reduce((m, x) => Math.max(m, x.dist), 0) + 80;

  // beam VFX: Phaser graphics 画一条径向红光
  const beam = scene.add.graphics().setDepth(46);
  beam.x = ownerCenter.x;
  beam.y = ownerCenter.y;
  beam.fillGradientStyle(0xff2828, 0xff2828, 0xff5050, 0xff5050, 1, 0.7, 0.6, 0.1);
  beam.fillRect(0, -4, maxDist, 8);
  beam.lineStyle(2, 0xff5050, 0.8);
  beam.strokeRect(0, -4, maxDist, 8);
  beam.rotation = startAng * Math.PI / 180;
  beam.alpha = 0;

  // 入场 (10% × 1400 = 140ms 淡入)
  scene.tweens.add({ targets: beam, alpha: 1, duration: 140 });
  // 旋转 startAng → endAng
  scene.tweens.add({
    targets: beam,
    rotation: endAng * Math.PI / 180,
    duration: dur,
    ease: 'cubic.inOut',
    onComplete: () => {
      scene.tweens.add({
        targets: beam, alpha: 0, duration: 140,
        onComplete: () => beam.destroy(),
      });
    },
  });

  // 调度 per-enemy 触发
  const sweepRange = endAng - startAng;
  for (const item of enemiesWithAngle) {
    const t = (normalize(item.ang) - startAng) / sweepRange;
    const delay = Math.max(0, Math.min(dur, Math.round(t * dur)));
    scene.time.delayedCall(delay, () => onHit(item.fighter));
  }

  await new Promise<void>(r => scene.time.delayedCall(dur + 200, () => r()));
}

// ══════════════════════════════════════════════════════════
// castCrystalBeam — JS main.js:531-572 drawCrystalBeam 1:1
//   从 source 朝 aim 方向射一道长光线: 红色警告相 (260ms) → 蓝紫发射相 (350ms)。
//   水晶龟召唤水晶球 + 迷你水晶球A装备 共用 (K1)。
// ══════════════════════════════════════════════════════════
export async function castCrystalBeam(
  scene: Phaser.Scene,
  fromX: number, fromY: number, towardX: number, towardY: number,
): Promise<void> {
  const angle = Math.atan2(towardY - fromY, towardX - fromX);
  const length = Math.hypot(scene.scale.width, scene.scale.height) * 1.5;
  const beam = scene.add.graphics().setDepth(46);
  beam.x = fromX; beam.y = fromY; beam.rotation = angle;
  // 警告相 (260ms): 红光 14px (JS rgba(255,80,80))
  beam.fillGradientStyle(0xff5050, 0xff5050, 0xff5050, 0xff5050, 0.7, 0.5, 0.5, 0);
  beam.fillRect(0, -7, length, 14);
  await new Promise<void>(r => scene.time.delayedCall(260, () => r()));
  if (!beam.active) return;
  // 发射相 (350ms): 蓝紫 6px (JS rgba(180,120,255)→rgba(80,40,180))
  beam.clear();
  beam.fillGradientStyle(0xb478ff, 0xb478ff, 0x5028b4, 0x5028b4, 0.95, 0.85, 0.4, 0.4);
  beam.fillRect(0, -3, length, 6);
  scene.tweens.add({ targets: beam, alpha: 0, duration: 350, onComplete: () => beam.destroy() });
  await new Promise<void>(r => scene.time.delayedCall(350, () => r()));
}

// ══════════════════════════════════════════════════════════
// fireHunterArrow — JS hunter.js:3-10 spawnHunterArrow/fireProjectile 1:1
//   飞 hunter-arrow sprite (旋转朝向目标) 从 from→to。hunterShot/hunterBarrage 共用 (K3/K10)。
// ══════════════════════════════════════════════════════════
export function fireHunterArrow(
  scene: Phaser.Scene,
  fromX: number, fromY: number, toX: number, toY: number, ms = 220,
): Promise<void> {
  return new Promise((resolve) => {
    if (!scene.textures.exists('vfx-hunter-arrow')) { resolve(); return; }
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrow = scene.add.sprite(fromX, fromY, 'vfx-hunter-arrow')
      .setDepth(48).setRotation(angle).setDisplaySize(56, 14);   // 512×128 源图 4:1
    try { arrow.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
    scene.tweens.add({
      targets: arrow, x: toX, y: toY, duration: ms, ease: 'linear',
      onComplete: () => { arrow.destroy(); resolve(); },
    });
  });
}

// ══════════════════════════════════════════════════════════
// fireStraightProjectile — JS equip-effects.js:365 launchStraightProjectile 1:1
//   飞一张 sprite (旋转朝向目标) 从 from→to。哑铃/飞镖/左轮子弹 共用 (K7)。
// ══════════════════════════════════════════════════════════
export function fireStraightProjectile(
  scene: Phaser.Scene,
  fromX: number, fromY: number, toX: number, toY: number,
  textureKey: string, size = 32, dur = 360,
): Promise<void> {
  return new Promise((resolve) => {
    if (!scene.textures.exists(textureKey)) { resolve(); return; }
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const p = scene.add.image(fromX, fromY, textureKey)
      .setDepth(48).setDisplaySize(size, size).setRotation(angle);
    try { p.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
    scene.tweens.add({
      targets: p, x: toX, y: toY, duration: dur, ease: 'Linear',
      onComplete: () => { p.destroy(); resolve(); },
    });
  });
}

// ══════════════════════════════════════════════════════════
// spawnFireSweep — JS equip-effects.js dragon-fly-trail (火柱横扫一列, K5)
//   火色粒子发射器从 fromX 扫到 toX (同 row Y), 模拟龙息火柱掠过。
// ══════════════════════════════════════════════════════════
export function spawnFireSweep(scene: Phaser.Scene, fromX: number, y: number, toX: number): void {
  const dur = 600;
  const emitter = scene.add.particles(fromX, y, '__DEFAULT', {
    lifespan: 420, speed: { min: 20, max: 90 }, scale: { start: 1.3, end: 0 },
    alpha: { start: 0.95, end: 0 }, tint: [0xff3300, 0xff8800, 0xffdd33],
    frequency: 14, quantity: 3, blendMode: 'ADD',
  }).setDepth(46);
  scene.tweens.add({
    targets: emitter, x: toX, duration: dur, ease: 'Cubic.easeOut',
    onComplete: () => { emitter.stop(); scene.time.delayedCall(460, () => emitter.destroy()); },
  });
}

// ══════════════════════════════════════════════════════════
// spawnCrystalDetonate — JS main.js:494-506 满层引爆: 紫色径向爆 + 震屏 (K2)
// ══════════════════════════════════════════════════════════
export function spawnCrystalDetonate(scene: Phaser.Scene, x: number, y: number): void {
  const boom = scene.add.particles(x, y, '__DEFAULT', {
    lifespan: 420, speed: { min: 80, max: 260 }, scale: { start: 1.1, end: 0 },
    tint: [0xb478ff, 0xd8b0ff, 0x7028c8], quantity: 28, blendMode: 'ADD', emitting: false,
  }).setDepth(47);
  boom.explode(28);
  const ring = scene.add.circle(x, y, 12, 0xb478ff, 0.5).setDepth(46);
  scene.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 360, ease: 'cubic.out', onComplete: () => ring.destroy() });
  scene.time.delayedCall(500, () => boom.destroy());
  scene.cameras.main.shake(220, 0.006);
}
