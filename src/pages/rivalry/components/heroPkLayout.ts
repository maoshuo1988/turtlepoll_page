/**
 * 文件说明：HeroPK 布局用视口相关尺寸；PC 用 clamp 保持原 680px 上限，小屏单独区间。
 */

/** PC（lg+）网格最小高度：随视口在 520px～680px 之间伸缩 */
export const HERO_PK_GRID_MIN_HEIGHT = 'clamp(520px, 72dvh, 680px)';

/** 手机端网格最小高度：随视口变矮，避免固定 px 撑满屏 */
export const HERO_PK_MOBILE_GRID_MIN_HEIGHT = 'clamp(300px, 56dvh, 480px)';

/** 主舞台内容最大宽度 */
export const HERO_PK_MOBILE_STAGE_MAX_WIDTH = '26rem';

/** 主舞台内容最大高度（超出可滚动） */
export const HERO_PK_MOBILE_STAGE_MAX_HEIGHT = 'min(48dvh, 380px)';
