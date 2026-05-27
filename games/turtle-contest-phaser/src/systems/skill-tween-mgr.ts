// ══════════════════════════════════════════════════════════
// skill-tween-mgr.ts — sprite scale/rotation corruption 防护层
// ══════════════════════════════════════════════════════════
// JS 设计 (scene.css:6 + Web Animations API fill:'none'):
//   .scene-turtle 外层 transform:scale(var(--base-scale)) 永不动
//   .st-body 内层 body.animate([...], {fill:'none'}) 跑完自动清痕迹
// Phaser 没 CSS Web Animations, 直接 tween 改 sprite 属性后没"自动清"
// 这个 mgr 是 Phaser 端等价: 任何 skill tween 走它, onComplete 强制还原 home;
// 加上 BattleScene update 里的 watcher (sprite 没 active skill tween 时
// 自动 reset scale/rotation), 双保.
//
// 规则:
//   1. 任何 skill handler 想 tween view.sprite 的 scaleX/Y/rotation, **必须**
//      走 SkillTweenMgr.skillTween, 不许直接 scene.tweens.add(view.sprite, ...)
//   2. 想动 view.sprite.x/y (位移类动画) 可走 helper, 也可直接 tween — watcher
//      不检 x/y, idle bob 在 sprite.y 上独立跑
//   3. fire-and-forget skill tween 同样要走 helper (拿到 Promise 但不 await)
//      — onComplete 会自动 reset, watcher 兜底
//
// idle bob tween (BattleScene.makeView 末尾给无 spritesheet 龟加的 sprite.y 浮)
// 用 tween.data.isIdleBob = true 标记, watcher 跳过它. 见 BattleScene.makeView.
import Phaser from 'phaser';

/** sprite 容器接口 — 兼容 BattleScene FighterView 的子集.
 *  独立定义避免循环依赖. BattleScene FighterView 自动满足这个 shape. */
export interface TweenableView {
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  homeScaleX: number;
  homeScaleY: number;
  homeRotation: number;
  homeX: number;
  homeY: number;
  /** P24: hop / addCounter 等不走 sprite tween 的位移期间, BattleScene 标 true,
   *  watcher 跳过 x reset (否则 sprite 被拉回 homeX, 只剩 shadow 在动). */
  _inHop?: boolean;
}

export interface SkillTweenOptions {
  /** ms */
  duration: number;
  /** Phaser ease string */
  ease?: string;
  /** yoyo: true 让 tween 自动来回, 终值跟起始一致 */
  yoyo?: boolean;
  /** repeat 次数 (默认 0). yoyo:true + repeat:0 = 一次往返. */
  repeat?: number;
  /** 持续位移类 (跟 x/y): 跑完是否回 home? 默认 true (强制还原 home x/y). 改 false 留位移 (e.g. 击退后留在新位置) */
  restoreXY?: boolean;
}

export interface SkillTweenProps {
  /** sprite.scaleX 目标. 不传 = 跑完还原 homeScaleX */
  scaleX?: number;
  /** sprite.scaleY 目标. 不传 = 跑完还原 homeScaleY */
  scaleY?: number;
  /** sprite.rotation 目标. 不传 = 跑完还原 homeRotation */
  rotation?: number;
  /** sprite.x 目标 (位移). 终值由 restoreXY 决定 */
  x?: number;
  /** sprite.y 目标 (位移) */
  y?: number;
  /** sprite.alpha 目标 */
  alpha?: number;
}

export class SkillTweenMgr {
  private scene: Phaser.Scene;
  private activeTweens = new Set<Phaser.Tweens.Tween>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** 跑一段 skill tween, **onComplete 自动还原 sprite 到 home 状态**.
   *  返回 Promise resolve 在 onComplete 之后. fire-and-forget 时不 await, 但
   *  onComplete reset 仍会跑.
   *
   *  JS body.animate({fill:'none'}) 1:1 等价: 动画跑完痕迹自动清, 回 baseline.
   */
  skillTween(view: TweenableView, props: SkillTweenProps, opts: SkillTweenOptions): Promise<void> {
    return new Promise(resolve => {
      const s = view.sprite;
      const tween = this.scene.tweens.add({
        targets: s,
        ...props,
        duration: opts.duration,
        ease: opts.ease ?? 'linear',
        yoyo: !!opts.yoyo,
        repeat: opts.repeat ?? 0,
        onComplete: () => {
          this.activeTweens.delete(tween);
          // 强制还原 scale/rotation 到 home (JS fill:'none' 等价).
          // 不直接 setScale 是因为 tween 可能正好 stop 在 home, 但保险还是 set.
          s.setScale(view.homeScaleX, view.homeScaleY);
          s.setRotation(view.homeRotation);
          if (opts.restoreXY !== false) {
            s.x = view.homeX;
            s.y = view.homeY;
          }
          resolve();
        },
        onStop: () => {
          this.activeTweens.delete(tween);
          // tween 被外部 kill, 同样回 home
          s.setScale(view.homeScaleX, view.homeScaleY);
          s.setRotation(view.homeRotation);
          if (opts.restoreXY !== false) {
            s.x = view.homeX;
            s.y = view.homeY;
          }
          resolve();
        },
      });
      // 标记: skill tween, 跟 idle bob 区分 (watcher 兜底用)
      (tween as Phaser.Tweens.Tween & { _isSkillTween?: boolean })._isSkillTween = true;
      this.activeTweens.add(tween);
    });
  }

  /** await 所有 active skill tween 完成. 用在 turn end / battle end 收尾. */
  async flush(): Promise<void> {
    if (this.activeTweens.size === 0) return;
    await new Promise<void>(resolve => {
      const check = () => {
        if (this.activeTweens.size === 0) return resolve();
        this.scene.time.delayedCall(50, check);
      };
      check();
    });
  }

  /** 立即杀掉所有 active skill tween 并 reset 所有 view 到 home.
   *  battle end / scene shutdown 兜底用. */
  killAll(views: TweenableView[]) {
    for (const tw of this.activeTweens) {
      try { tw.stop(); } catch { /* ignore */ }
    }
    this.activeTweens.clear();
    for (const v of views) {
      v.sprite.setScale(v.homeScaleX, v.homeScaleY);
      v.sprite.setRotation(v.homeRotation);
      v.sprite.x = v.homeX;
      v.sprite.y = v.homeY;
    }
  }

  /** Watcher 入口: BattleScene update loop 每帧调一次.
   *  检查每个 view 上的 sprite, 若没 active skill tween (idle bob 不算),
   *  且 scale/rotation 偏离 home > epsilon, 强制还原. 兜底 fire-and-forget 漏的.
   *
   *  ⚠ 不检查 x/y: idle bob 一直在浮 sprite.y, 如果检会跟 bob 打架.
   *  scale/rotation 由 skill tween 改, idle bob 只动 y, 互不重叠 → 安全分离.
   */
  watchTick(views: TweenableView[]) {
    const EPSILON = 0.001;
    const X_EPSILON = 1.0;
    for (const v of views) {
      const s = v.sprite;
      // P71 fix: 跳过 reset 不只看 _isSkillTween flag (大部分 skill 没 set), 而是看
      //   sprite 上有 NO 任何 active tween. 任意 tween 在 (skill chop / hop / shake / hurt 等)
      //   都不该被 watchTick 拉回 home — 否则 turtleShieldBash 等 tweens.chain
      //   动画被每帧 reset, 用户报"小龟释放龟盾直接崩坏".
      //   idle bob 是 Phaser anim (帧序列, 不是 tween), 不会被这里判到.
      const tweens = this.scene.tweens.getTweensOf(s);
      if (tweens.length > 0) continue;
      if (Math.abs(s.scaleX - v.homeScaleX) > EPSILON) s.scaleX = v.homeScaleX;
      if (Math.abs(s.scaleY - v.homeScaleY) > EPSILON) s.scaleY = v.homeScaleY;
      if (Math.abs(s.rotation - v.homeRotation) > EPSILON) s.rotation = v.homeRotation;
      // P24: hop 走 addCounter (target=number, getTweensOf 找不到) — 仍需 _inHop guard
      if (!v._inHop && Math.abs(s.x - v.homeX) > X_EPSILON) s.x = v.homeX;
    }
  }
}
