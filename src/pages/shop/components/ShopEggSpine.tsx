/** 文件说明：黑市龟蛋 Spine，Spine.from 加载 + 固定 AABB 布局，单实例切换 idle/open。 */
import { useEffect, useRef, useState } from 'react';
import { Application, Assets } from 'pixi.js';
import '@esotericsoftware/spine-pixi-v8';
import {
  AABBRectangleBoundsProvider,
  Physics,
  Spine,
} from '@esotericsoftware/spine-pixi-v8';
import {
  SHOP_EGG_SPINE_AABB,
  SHOP_EGG_SPINE_ASSETS,
  SHOP_EGG_SPINE_STAGE_OFFSET,
  SHOP_GACHA_EGG_STAGE_LAYOUT,
  SHOP_GACHA_STAGE_LAYERS,
} from '@/config/shopSpineAssets';

type ShopEggAnimationMode = 'idle' | 'open';
type ShopEggDisplayMode = 'hidden' | 'egg' | 'glow';

type ShopEggStageVariant = keyof typeof SHOP_GACHA_EGG_STAGE_LAYOUT;

interface ShopEggSpineProps {
  displayMode?: ShopEggDisplayMode;
  className?: string;
  stageVariant?: ShopEggStageVariant;
}

const EGG_LAYOUT = SHOP_GACHA_STAGE_LAYERS.egg;
const EGG_SPINE_ASSET_LIST = [SHOP_EGG_SPINE_ASSETS.dan, SHOP_EGG_SPINE_ASSETS.guang] as const;
const EGG_CANVAS_BLEED_RATIO = 0.88;
const EGG_SPINE_ANIMATION_BY_MODE: Record<ShopEggAnimationMode, string> = {
  idle: 'idle',
  open: 'open',
};

let eggAssetsRegistered = false;

function ensureEggAssetsRegistered() {
  if (eggAssetsRegistered) return;
  eggAssetsRegistered = true;

  EGG_SPINE_ASSET_LIST.forEach(({ skeletonAlias, atlasAlias, skeletonUrl, atlasUrl }) => {
    Assets.add({ alias: skeletonAlias, src: skeletonUrl });
    Assets.add({
      alias: atlasAlias,
      src: atlasUrl,
      parser: 'spineTextureAtlasLoader',
    });
  });
}

function createEggBoundsProvider() {
  const { x, y, width, height, expand } = SHOP_EGG_SPINE_AABB;
  const expandedWidth = width * expand;
  const expandedHeight = height * expand;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return new AABBRectangleBoundsProvider(
    centerX - expandedWidth / 2,
    centerY - expandedHeight / 2,
    expandedWidth,
    expandedHeight,
  );
}

function layoutEggSpine(
  spine: Spine,
  canvasWidth: number,
  canvasHeight: number,
  stageOffset: { offsetX: number; offsetY: number },
  originX = 0,
  originY = 0,
) {
  const bounds = createEggBoundsProvider().calculateBounds();
  const padding = EGG_LAYOUT.renderPadding;
  const targetWidth = Math.max(canvasWidth - padding * 2, 1);
  const targetHeight = Math.max(canvasHeight - padding * 2, 1);
  const scale = Math.min(targetWidth / bounds.width, targetHeight / bounds.height);
  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;

  const offsetY =
    EGG_LAYOUT.verticalAlign === 'top'
      ? padding - bounds.y * scale
      : EGG_LAYOUT.verticalAlign === 'bottom'
        ? canvasHeight - scaledHeight - padding - bounds.y * scale
        : (canvasHeight - scaledHeight) / 2 - bounds.y * scale;

  spine.scale.set(scale);
  spine.x = originX + (canvasWidth - scaledWidth) / 2 - bounds.x * scale + stageOffset.offsetX;
  spine.y = originY + offsetY + stageOffset.offsetY;
}

type EggSpinePair = {
  dan: Spine;
  guang: Spine;
};

function resetSpinePose(spine: Spine) {
  spine.state.clearTracks();
  spine.skeleton.setSkin('default');
  spine.skeleton.setupPose();
}

function applySpineAnimation(spine: Spine, animationName: string, loop: boolean) {
  const hasAnimation = Boolean(spine.skeleton.data.findAnimation(animationName));
  if (!hasAnimation) {
    console.warn(`[ShopEggSpine] animation "${animationName}" not found on ${spine.skeleton.data.name}`);
    resetSpinePose(spine);
    spine.state.apply(spine.skeleton);
    spine.skeleton.updateWorldTransform(Physics.update);
    spine.update(0);
    return null;
  }

  const entry = spine.state.setAnimation(0, animationName, loop);
  spine.state.apply(spine.skeleton);
  spine.skeleton.updateWorldTransform(Physics.update);
  spine.update(0);
  return entry;
}

function hideEggSpines(spines: EggSpinePair) {
  resetSpinePose(spines.dan);
  resetSpinePose(spines.guang);
  spines.dan.visible = false;
  spines.guang.visible = false;
}

function showEggGlow(spines: EggSpinePair) {
  const animationName = EGG_SPINE_ANIMATION_BY_MODE.idle;
  resetSpinePose(spines.dan);
  spines.dan.visible = false;

  resetSpinePose(spines.guang);
  spines.guang.visible = true;
  applySpineAnimation(spines.guang, animationName, true);
}

function startEggOpen(spines: EggSpinePair) {
  const animationName = EGG_SPINE_ANIMATION_BY_MODE.open;
  resetSpinePose(spines.guang);
  spines.guang.visible = false;

  resetSpinePose(spines.dan);
  spines.dan.visible = true;
  const entry = applySpineAnimation(spines.dan, animationName, false);
  if (entry) {
    entry.trackTime = 0;
  }
}

function playEggAnimation(spines: EggSpinePair, displayMode: ShopEggDisplayMode) {
  if (displayMode === 'hidden') {
    hideEggSpines(spines);
  } else if (displayMode === 'glow') {
    showEggGlow(spines);
  } else {
    startEggOpen(spines);
  }
}

export function ShopEggSpine({
  displayMode = 'hidden',
  className = '',
  stageVariant = 'desktop',
}: ShopEggSpineProps) {
  const stageOffset = SHOP_EGG_SPINE_STAGE_OFFSET[stageVariant];
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spinePairRef = useRef<EggSpinePair | null>(null);
  const playbackModeRef = useRef<ShopEggDisplayMode>('hidden');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;

    const syncSize = () => {
      const { width, height } = node.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0 || !canvasHostRef.current) return undefined;

    let mounted = true;
    let spines: EggSpinePair | null = null;
    let tickSpine: ((ticker: Application['ticker']) => void) | null = null;
    const bleedX = Math.round(size.width * EGG_CANVAS_BLEED_RATIO);
    const bleedY = Math.round(size.height * EGG_CANVAS_BLEED_RATIO);
    const renderWidth = size.width + bleedX * 2;
    const renderHeight = size.height + bleedY * 2;

    const setup = async () => {
      try {
        ensureEggAssetsRegistered();
        await Assets.load(EGG_SPINE_ASSET_LIST.flatMap(({ skeletonAlias, atlasAlias }) => [skeletonAlias, atlasAlias]));
        if (!mounted || !canvasHostRef.current) return;

        const app = new Application();
        await app.init({
          width: renderWidth,
          height: renderHeight,
          backgroundAlpha: 0,
          premultipliedAlpha: false,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });

        if (!mounted || !canvasHostRef.current) {
          app.destroy(true, { children: true });
          return;
        }

        appRef.current = app;
        canvasHostRef.current.replaceChildren(app.canvas);
        app.canvas.style.display = 'block';
        app.canvas.style.position = 'absolute';
        app.canvas.style.left = `${-bleedX}px`;
        app.canvas.style.top = `${-bleedY}px`;
        app.canvas.style.width = `${renderWidth}px`;
        app.canvas.style.height = `${renderHeight}px`;

        const dan = Spine.from({
          skeleton: SHOP_EGG_SPINE_ASSETS.dan.skeletonAlias,
          atlas: SHOP_EGG_SPINE_ASSETS.dan.atlasAlias,
          autoUpdate: false,
          boundsProvider: createEggBoundsProvider(),
        });
        const guang = Spine.from({
          skeleton: SHOP_EGG_SPINE_ASSETS.guang.skeletonAlias,
          atlas: SHOP_EGG_SPINE_ASSETS.guang.atlasAlias,
          autoUpdate: false,
          boundsProvider: createEggBoundsProvider(),
        });
        spines = { dan, guang };
        spinePairRef.current = spines;

        app.stage.addChild(guang);
        app.stage.addChild(dan);
        layoutEggSpine(guang, size.width, size.height, stageOffset, bleedX, bleedY);
        layoutEggSpine(dan, size.width, size.height, stageOffset, bleedX, bleedY);
        tickSpine = (ticker) => {
          const deltaSec = ticker.deltaMS / 1000;
          spines?.guang.update(deltaSec);
          spines?.dan.update(deltaSec);
        };
        app.ticker.add(tickSpine);
        app.start();

        playEggAnimation(spines, 'hidden');
        playbackModeRef.current = 'hidden';

        if (mounted) {
          setHasError(false);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize ShopEggSpine.', error);
        if (mounted) {
          setHasError(true);
          setIsReady(false);
        }
      }
    };

    setIsReady(false);
    void setup();

    return () => {
      mounted = false;
      appRef.current?.stop();
      if (tickSpine) {
        appRef.current?.ticker.remove(tickSpine);
        tickSpine = null;
      }
      if (spines?.guang.parent) {
        spines.guang.parent.removeChild(spines.guang);
      }
      if (spines?.dan.parent) {
        spines.dan.parent.removeChild(spines.dan);
      }
      spines?.guang.destroy();
      spines?.dan.destroy();
      spinePairRef.current = null;
      playbackModeRef.current = 'hidden';
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
  }, [size.height, size.width, stageVariant]);

  useEffect(() => {
    const spines = spinePairRef.current;
    if (!spines || !isReady) return;

    const nextMode = displayMode;
    if (playbackModeRef.current === nextMode && nextMode === 'egg') {
      return;
    }

    playEggAnimation(spines, nextMode);
    playbackModeRef.current = nextMode;
  }, [displayMode, isReady]);

  useEffect(() => {
    const spines = spinePairRef.current;
    if (!spines || !isReady) return;
    const bleedX = Math.round(size.width * EGG_CANVAS_BLEED_RATIO);
    const bleedY = Math.round(size.height * EGG_CANVAS_BLEED_RATIO);
    layoutEggSpine(spines.guang, size.width, size.height, stageOffset, bleedX, bleedY);
    layoutEggSpine(spines.dan, size.width, size.height, stageOffset, bleedX, bleedY);
  }, [isReady, size.height, size.width, stageVariant]);

  return (
    <div ref={hostRef} className={`pointer-events-none ${className}`.trim()}>
      {hasError ? (
        <div className="flex h-full w-full items-center justify-center text-[11px] text-white/35">
          龟蛋动画加载失败
        </div>
      ) : (
        <div
          ref={canvasHostRef}
          className={`relative h-full w-full overflow-visible ${isReady ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
