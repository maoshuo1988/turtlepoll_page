/**
 * 文件说明：视口适配常量与工具（对齐 Tian-Website 1920/375 双稿 + 768 内容断点）。
 */

/** 内容缩放、移动资源分叉（与 Tian useMedia768 一致） */
export const VP_MOBILE_MAX_PX = 768;

/** 布局分叉：侧栏 / PC 顶栏（项目原有 lg） */
export const VP_LAYOUT_DESKTOP_MIN_PX = 1024;

export const VP_DESKTOP_DESIGN_PX = 1920;
export const VP_MOBILE_DESIGN_PX = 375;
export const VP_CONTENT_MAX_PX = 1280;

export const VP_MOBILE_MQ = `(max-width: ${VP_MOBILE_MAX_PX}px)` as const;
export const VP_LAYOUT_DESKTOP_MQ = `(min-width: ${VP_LAYOUT_DESKTOP_MIN_PX}px)` as const;

/** 桌面稿 px → 随视口缩放的 clamp，避免超宽屏无限放大 */
export function vpDesktopClampPx(px: number, minRatio = 0.72, maxRatio = 1.08): string {
  const min = Math.round(px * minRatio);
  const max = Math.round(px * maxRatio);
  const preferred = `calc(${px} / ${VP_DESKTOP_DESIGN_PX} * 100vw)`;
  return `clamp(${min}px, ${preferred}, ${max}px)`;
}

/** 移动稿 px → clamp（375 基准） */
export function vpMobileClampPx(px: number, minRatio = 0.85, maxRatio = 1.05): string {
  const min = Math.round(px * minRatio);
  const max = Math.round(px * maxRatio);
  const preferred = `calc(${px} / ${VP_MOBILE_DESIGN_PX} * 100vw)`;
  return `clamp(${min}px, ${preferred}, ${max}px)`;
}
