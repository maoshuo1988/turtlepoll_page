/**
 * 文件说明：黑市抽奖主视觉本地 Spine 资源路径配置。
 */
export const SHOP_SPINE_ASSETS = {
  aurora: {
    skeletonUrl: '/spine/aurora/jiguang.json',
    atlasUrl: '/spine/aurora/jiguang.atlas',
  },
  wizard: {
    skeletonUrl: '/spine/wgfs1/wgfs.json',
    atlasUrl: '/spine/wgfs1/wgfs.atlas',
  },
  wizard2: {
    skeletonUrl: '/spine/wgfs2/wgfs2.json',
    atlasUrl: '/spine/wgfs2/wgfs2.atlas',
  },
  egg: {
    skeletonUrl: '/spine/egg/dan.json',
    atlasUrl: '/spine/egg/dan.atlas',
  },
  dan: {
    skeletonUrl: '/spine/dan/dan.json',
    atlasUrl: '/spine/dan/dan.atlas',
  },
  guang: {
    skeletonUrl: '/spine/guang/guang.json',
    atlasUrl: '/spine/guang/guang.atlas',
  },
} as const;

/** 龟蛋 Spine 资源别名（Spine.from / Assets.load 用）。dan 必须用 egg 目录：含 idle + open。 */
export const SHOP_EGG_SPINE_ASSETS = {
  dan: {
    skeletonAlias: 'shop-egg-dan-skeleton-v2',
    atlasAlias: 'shop-egg-dan-atlas-v2',
    skeletonUrl: `${SHOP_SPINE_ASSETS.egg.skeletonUrl}?v=2`,
    atlasUrl: `${SHOP_SPINE_ASSETS.egg.atlasUrl}?v=2`,
  },
  guang: {
    skeletonAlias: 'shop-egg-guang-skeleton-v2',
    atlasAlias: 'shop-egg-guang-atlas-v2',
    skeletonUrl: `${SHOP_SPINE_ASSETS.guang.skeletonUrl}?v=2`,
    atlasUrl: `${SHOP_SPINE_ASSETS.guang.atlasUrl}?v=2`,
  },
} as const;

/** 龟蛋骨骼 AABB（来自 dan.json skeleton 字段）+ 布局外扩倍率。 */
export const SHOP_EGG_SPINE_AABB = {
  x: -168.5,
  y: -15.510742,
  width: 337,
  height: 384,
  /** open 特效会超出 setup 盒，适当放大布局盒避免裁切 */
  expand: 2.35,
} as const;

export type ShopSpineAssetKey = keyof typeof SHOP_SPINE_ASSETS;

/** 极光舞台整体平移（px）：x 向右，y 向上为负。 */
export const SHOP_AURORA_STAGE_OFFSET_X = -70;
export const SHOP_AURORA_STAGE_OFFSET_Y = -20;

/** 黑市龟蛋 open 动画时长（秒），用于同步孵化 reveal。 */
export const SHOP_EGG_OPEN_DURATION_SEC = 5.5;
/** reveal 等待时长：动画时长 + 缓冲，避免未播完就切结果页。 */
export const SHOP_EGG_REVEAL_DELAY_MS = Math.round(SHOP_EGG_OPEN_DURATION_SEC * 1000 + 300);

/** 按抽奖舞台容器宽度计算双法师边长（px），非整窗宽度。 */
export function getShopWizardStageSize(stageWidth: number) {
  if (!Number.isFinite(stageWidth) || stageWidth <= 0) return 170;
  return Math.round(Math.min(340, Math.max(120, stageWidth * 0.22)));
}

/** 抽奖区龟蛋舞台：紧贴孵化按钮正上方，底部对齐。 */
export const SHOP_GACHA_EGG_STAGE_LAYOUT = {
  mobile: {
    wrapper: 'relative z-[6] mx-auto h-[min(200px,46vw)] w-[min(220px,50vw)] shrink-0 overflow-visible',
    spine:
      'absolute bottom-0 left-1/2 z-[8] h-[min(200px,46vw)] w-[min(220px,50vw)] -translate-x-1/2 overflow-visible',
    revealOverlay:
      'pointer-events-none absolute inset-0 z-[9] flex -translate-y-5 items-center justify-center',
    revealPreviewSize: 128,
  },
  desktop: {
    wrapper: 'relative z-[10] mx-auto h-[280px] w-[300px] shrink-0 overflow-visible',
    spine:
      'absolute bottom-0 left-1/2 z-[8] h-[280px] w-[300px] -translate-x-1/2 overflow-visible',
    revealOverlay:
      'pointer-events-none absolute inset-0 z-[9] flex -translate-y-8 items-center justify-center',
    revealPreviewSize: 168,
  },
} as const;

/** 极光骨骼在画布内的对齐与微调。 */
export const SHOP_AURORA_LAYOUT = {
  verticalAlign: 'top' as const,
  offsetX: 0,
  offsetY: 0,
} as const;

type ShopGachaLayerPreset = {
  animation: string;
  fit: 'contain' | 'cover';
  verticalAlign: 'center' | 'top' | 'bottom';
  offsetX: number;
  offsetY: number;
  clipContent: boolean;
  canvasBleedRatio: number;
  canvasBleedAnchor: 'center' | 'bottom-right' | 'bottom-left';
  renderPadding: number;
  boundsClipMargin: number;
  layoutSampleTime: number;
  animationLoop: boolean;
  className: string;
};

/** 抽奖舞台上的蛋 / 龟法师层布局（className 含定位与尺寸）。 */
export const SHOP_GACHA_STAGE_LAYERS: Record<'egg' | 'wizard' | 'wizard2', ShopGachaLayerPreset> = {
  egg: {
    animation: 'idle',
    fit: 'contain',
    verticalAlign: 'bottom',
    offsetX: -8,
    offsetY: 72,
    clipContent: false,
    canvasBleedRatio: 0,
    canvasBleedAnchor: 'center',
    renderPadding: 8,
    boundsClipMargin: 0.05,
    layoutSampleTime: 0,
    animationLoop: true,
    className:
      'absolute left-1/2 top-[44%] z-[8] h-[min(520px,88vw)] w-[min(520px,88vw)] -translate-x-1/2 -translate-y-1/2 overflow-visible',
  },
  wizard: {
    animation: 'idle',
    fit: 'contain',
    verticalAlign: 'bottom',
    offsetX: 0,
    offsetY: 0,
    clipContent: false,
    canvasBleedRatio: 0.20,
    canvasBleedAnchor: 'bottom-right',
    renderPadding: 8,
    boundsClipMargin: 0.05,
    layoutSampleTime: 0,
    animationLoop: true,
    className: 'absolute bottom-0 right-0 z-[4]',
  },
  wizard2: {
    animation: 'idle',
    fit: 'contain',
    verticalAlign: 'bottom',
    offsetX: 15,
    offsetY: 0,
    clipContent: false,
    canvasBleedRatio: 0.20,
    canvasBleedAnchor: 'bottom-left',
    renderPadding: 8,
    boundsClipMargin: 0.05,
    layoutSampleTime: 0,
    animationLoop: true,
    className: 'absolute bottom-0 left-[6%] z-[4] sm:left-[7%] lg:left-[8%]',
  },
};
