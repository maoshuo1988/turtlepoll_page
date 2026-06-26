/** 文件说明：开撕台对抗条固定对称收窄外形路径（仅开撕台使用）。 */

const TAPER_BOTTOM_PCT = 70;
const EDGE_TRANSITION_PX = 40;
const HALF_LEFT_RATIO = 0.25;
const HALF_RIGHT_RATIO = 0.75;

function getTaperY(): number {
  return TAPER_BOTTOM_PCT / 100;
}

function fmt(value: number): string {
  const fixed = value.toFixed(4);
  return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

function buildSideTransitionCurve(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): string {
  const span = endX - startX;
  const bend = Math.min(0.26, Math.abs(span) * 0.68);
  const sign = span >= 0 ? 1 : -1;
  const c1x = startX + sign * bend * 0.34;
  const c1y = startY - bend * 0.14;
  const c2x = endX - sign * bend;
  const c2y = endY;
  return `C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(endX)} ${fmt(endY)}`;
}

function resolveTaperAnchors(outerLeft: number, outerRight: number): {
  halfLeft: number;
  halfRight: number;
  useCenterMerge: boolean;
} {
  let halfLeft = HALF_LEFT_RATIO;
  let halfRight = HALF_RIGHT_RATIO;

  if (outerLeft >= halfLeft) {
    halfLeft = outerLeft + 0.01;
  }
  if (outerRight <= halfRight) {
    halfRight = outerRight - 0.01;
  }

  if (halfLeft >= halfRight) {
    return { halfLeft: 0.5, halfRight: 0.5, useCenterMerge: true };
  }

  return { halfLeft, halfRight, useCenterMerge: false };
}

export function buildHeroBattleRailClipPathD(
  trackWidthPx: number,
  _trackHeightPx = 48,
): string {
  const t = getTaperY();
  const outerLeft = trackWidthPx > 0 ? EDGE_TRANSITION_PX / trackWidthPx : 0;
  const outerRight = trackWidthPx > 0 ? 1 - EDGE_TRANSITION_PX / trackWidthPx : 1;
  const { halfLeft, halfRight, useCenterMerge } = resolveTaperAnchors(outerLeft, outerRight);

  if (useCenterMerge) {
    const mid = 0.5;
    return [
      'M 0 0',
      'L 1 0',
      'L 1 1',
      `L ${fmt(outerRight)} 1`,
      buildSideTransitionCurve(outerRight, 1, mid, t),
      buildSideTransitionCurve(mid, t, outerLeft, 1),
      'L 0 1',
      'Z',
    ].join(' ');
  }

  return [
    'M 0 0',
    'L 1 0',
    'L 1 1',
    `L ${fmt(outerRight)} 1`,
    buildSideTransitionCurve(outerRight, 1, halfRight, t),
    `L ${fmt(halfLeft)} ${fmt(t)}`,
    buildSideTransitionCurve(halfLeft, t, outerLeft, 1),
    'L 0 1',
    'Z',
  ].join(' ');
}

export function heroBattleRailClipPathUrl(id: string): string {
  return `url(#${id})`;
}
