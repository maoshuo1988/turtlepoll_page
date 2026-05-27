// ══════════════════════════════════════════════════════════
// ease.ts — v0.9.5.A14 真 CSS cubic-bezier 曲线 Phaser ease 函数
//
// Phaser back.out(s) 数学不等于 CSS cubic-bezier(.34, 1.56, .64, 1):
//   - back.out(1.7) 峰值过冲 ~10%
//   - cubic-bezier(.34, 1.56, .64, 1) 峰值过冲 ~50% (JS 标准弹性入场用的就是这条)
//
// 这里用牛顿迭代解 x(s)=t 反推 s, 再算 y(s) 返回 ease 值, 误差 < 0.001
// ══════════════════════════════════════════════════════════

/**
 * 生成 CSS cubic-bezier(p1x, p1y, p2x, p2y) 对应的 ease 函数, 供 Phaser tween 用
 *   const myEase = cubicBezier(0.34, 1.56, 0.64, 1);
 *   this.tweens.add({ ..., ease: myEase, ... });
 */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // 牛顿迭代解 x(s) = t (3-阶贝塞尔, P0=(0,0), P3=(1,1))
    let s = t;
    for (let i = 0; i < 8; i++) {
      const oneMinusS = 1 - s;
      const x = 3 * oneMinusS * oneMinusS * s * p1x + 3 * oneMinusS * s * s * p2x + s * s * s;
      const dx = 3 * oneMinusS * oneMinusS * p1x + 6 * oneMinusS * s * (p2x - p1x) + 3 * s * s * (1 - p2x);
      if (Math.abs(dx) < 1e-6) break;
      const newS = s - (x - t) / dx;
      s = Math.max(0, Math.min(1, newS));
      if (Math.abs(x - t) < 1e-4) break;
    }
    const oneMinusS = 1 - s;
    return 3 * oneMinusS * oneMinusS * s * p1y + 3 * oneMinusS * s * s * p2y + s * s * s;
  };
}

/** JS 主菜单标准弹性入场 ease (cubic-bezier(.34, 1.56, .64, 1)) — 标题 drop / 按钮滑入 / 卡片滑入都用这条 */
export const EASE_MENU_IN = cubicBezier(0.34, 1.56, 0.64, 1);

/** ease-out 通用 (cubic-bezier(0, 0, .2, 1)) — material design 标准 */
export const EASE_OUT = cubicBezier(0, 0, 0.2, 1);
