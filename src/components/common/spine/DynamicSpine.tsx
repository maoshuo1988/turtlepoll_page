/**
 * 文件说明：按 skeleton.json + atlas 动态加载 Spine 骨骼动画。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Application, Assets } from 'pixi.js';
import '@esotericsoftware/spine-pixi-v8';
import {
  Physics,
  SkinsAndAnimationBoundsProvider,
  Spine,
} from '@esotericsoftware/spine-pixi-v8';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { safeDestroyPixiApp } from '@/components/common/spine/safeDestroyPixiApp';
import {
  acquireSpineInitSlot,
  cancelSpineInitWait,
  releaseSpineInitSlot,
  type SpineInitPriority,
} from '@/components/common/spine/spineInitGate';
import { loadSkeletonDataFromAtlas } from '@/components/common/spine/spineSkeletonLoad';
import {
  cancelShopStageBootWait,
  isShopStageBootComplete,
  notifyShopStageLayerReady,
  waitForShopStageBoot,
  type ShopStageBootToken,
} from '@/components/common/spine/shopStageBootGate';

export interface DynamicSpineProps {
  skeletonUrl: string;
  atlasUrl: string;
  width: number;
  height: number;
  className?: string;
  animation?: string;
  fallback?: React.ReactNode;
  padding?: number;
  offsetX?: number;
  offsetY?: number;
  /** 垂直对齐，默认居中 */
  verticalAlign?: 'center' | 'top' | 'bottom';
  /** contain 完整显示；cover 铺满容器（可能裁切） */
  fit?: 'contain' | 'cover';
  /** 是否循环播放，默认 true */
  loop?: boolean;
  /** 动画包围盒采样步长（秒），越小越精确，默认 0.05 */
  boundsSampleStep?: number;
  /** @deprecated 请改用 boundsSampleStep */
  boundsClipMargin?: number;
  /** 布局采样时间（秒），用于特效动画取最大包围盒，如龟蛋 idle 光晕 */
  layoutSampleTime?: number;
  /** 延迟挂载（毫秒），用于舞台分层异步加载 */
  deferMs?: number;
  /** stage=黑市舞台法师/极光；preview=列表缩略图 */
  initPriority?: SpineInitPriority;
  /** 黑市列表：等舞台法师加载完再 init */
  waitForStageBoot?: boolean;
}

const registeredAtlasAliases = new Set<string>();

function hashAssetKey(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function registerAtlasAsset(atlasUrl: string) {
  const alias = `dynamic-spine-atlas-${hashAssetKey(atlasUrl)}`;
  if (!registeredAtlasAliases.has(alias)) {
    registeredAtlasAliases.add(alias);
    Assets.add({
      alias,
      src: atlasUrl,
      parser: 'spineTextureAtlasLoader',
    });
  }
  return alias;
}

function resolveLayoutBounds(spine: Spine) {
  const bounds = spine.skeleton.getBoundsRect();
  if (Number.isFinite(bounds.width) && bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  const data = spine.skeleton.data;
  const fallbackWidth = data.width > 0 ? data.width : 1;
  const fallbackHeight = data.height > 0 ? data.height : 1;
  return {
    x: data.x,
    y: data.y,
    width: fallbackWidth,
    height: fallbackHeight,
  };
}

function resolveAnimationName(spine: Spine, preferred?: string): string | null {
  if (preferred && spine.skeleton.data.findAnimation(preferred)) {
    return preferred;
  }
  if (spine.skeleton.data.findAnimation('idle')) return 'idle';
  if (spine.skeleton.data.findAnimation('animation')) return 'animation';
  return spine.skeleton.data.animations[0]?.name ?? null;
}

export function layoutSpineInBox(
  spine: Spine,
  boxWidth: number,
  boxHeight: number,
  options: {
    padding: number;
    offsetX: number;
    offsetY: number;
    verticalAlign: 'center' | 'top' | 'bottom';
    fit: 'contain' | 'cover';
    animation?: string;
    loop: boolean;
    boundsSampleStep: number;
    layoutSampleTime: number;
  },
) {
  const animationName = resolveAnimationName(spine, options.animation) ?? 'idle';

  spine.skeleton.setSkin('default');
  spine.skeleton.setupPose();
  spine.boundsProvider = new SkinsAndAnimationBoundsProvider(
    animationName,
    ['default'],
    options.boundsSampleStep,
  );

  spine.state.setAnimation(0, animationName, options.loop);
  if (options.layoutSampleTime > 0) {
    spine.state.update(options.layoutSampleTime);
  }
  spine.state.apply(spine.skeleton);
  spine.skeleton.updateWorldTransform(Physics.update);
  spine.update(0);

  const bounds = resolveLayoutBounds(spine);

  const targetWidth = Math.max(boxWidth - options.padding * 2, 1);
  const targetHeight = Math.max(boxHeight - options.padding * 2, 1);
  const scaleX = targetWidth / bounds.width;
  const scaleY = targetHeight / bounds.height;
  const scale = options.fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;

  const x = (boxWidth - scaledWidth) / 2 - bounds.x * scale;
  const y =
    options.verticalAlign === 'top'
      ? options.padding - bounds.y * scale
      : options.verticalAlign === 'bottom'
        ? boxHeight - scaledHeight - options.padding - bounds.y * scale
        : (boxHeight - scaledHeight) / 2 - bounds.y * scale;

  spine.scale.set(scale);
  spine.x = x + options.offsetX;
  spine.y = y + options.offsetY;

  if (options.layoutSampleTime > 0) {
    spine.state.setAnimation(0, animationName, options.loop);
    spine.state.apply(spine.skeleton);
    spine.skeleton.updateWorldTransform(Physics.update);
    spine.update(0);
  }
}

export function layoutDynamicSpine(
  spine: Spine,
  _app: Application,
  options: {
    width: number;
    height: number;
    padding: number;
    offsetX: number;
    offsetY: number;
    verticalAlign: 'center' | 'top' | 'bottom';
    fit: 'contain' | 'cover';
    animation?: string;
    loop: boolean;
    boundsSampleStep: number;
    layoutSampleTime: number;
  },
) {
  layoutSpineInBox(spine, options.width, options.height, options);
}

export const DynamicSpine: React.FC<DynamicSpineProps> = ({
  skeletonUrl,
  atlasUrl,
  width,
  height,
  className = '',
  animation = 'idle',
  fallback = null,
  padding = 12,
  offsetX = 0,
  offsetY = 4,
  verticalAlign = 'center',
  fit = 'contain',
  loop = true,
  boundsSampleStep = 0.05,
  boundsClipMargin,
  layoutSampleTime = 0,
  deferMs = 0,
  initPriority = 'preview',
  waitForStageBoot = false,
}) => {
  const resolvedBoundsSampleStep = boundsClipMargin ?? boundsSampleStep;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const initTokenRef = useRef(0);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [canInit, setCanInit] = useState(deferMs <= 0);
  const canRender = width > 0 && height > 0;

  useEffect(() => {
    if (deferMs <= 0) {
      setCanInit(true);
      return undefined;
    }

    setCanInit(false);
    const timer = window.setTimeout(() => setCanInit(true), deferMs);
    return () => window.clearTimeout(timer);
  }, [deferMs, skeletonUrl, atlasUrl]);

  useEffect(() => {
    if (!canRender || !canInit) return undefined;

    const initToken = ++initTokenRef.current;
    const waitToken: { cancelled: boolean } = { cancelled: false };
    let mounted = true;
    let spine: Spine | null = null;
    let app: Application | null = null;
    const stageBootToken: ShopStageBootToken = { cancelled: false };
    const initWidth = width;
    const initHeight = height;
    const isCancelled = () => waitToken.cancelled || !mounted || initToken !== initTokenRef.current;

    const releaseScene = () => {
      if (spine?.parent) {
        spine.parent.removeChild(spine);
      }
      spine?.destroy();
      spine = null;
      spineRef.current = null;

      const activeApp = appRef.current ?? app;
      appRef.current = null;
      app = null;
      safeDestroyPixiApp(activeApp);
    };

    const waitForHost = async () => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (hostRef.current) return hostRef.current;
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
      return hostRef.current;
    };

    const setup = async () => {
      if (waitForStageBoot) {
        await waitForShopStageBoot(stageBootToken);
        if (isCancelled()) return;
      }

      await acquireSpineInitSlot(waitToken, initPriority);
      if (isCancelled()) {
        releaseSpineInitSlot(initPriority);
        releaseScene();
        return;
      }

      try {
        const host = await waitForHost();
        if (isCancelled() || !host) {
          releaseScene();
          return;
        }

        const atlasAlias = registerAtlasAsset(atlasUrl);
        app = new Application();
        await app.init({
          width: initWidth,
          height: initHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });

        if (isCancelled() || !hostRef.current) {
          releaseScene();
          return;
        }

        appRef.current = app;
        hostRef.current.replaceChildren(app.canvas);
        app.canvas.style.display = 'block';
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';

        const onContextLost = (event: Event) => {
          event.preventDefault();
          setIsReady(false);
          releaseScene();
          if (!isCancelled() && initPriority === 'stage') {
            window.setTimeout(() => {
              if (!isCancelled()) void setup();
            }, 64);
          }
        };
        app.canvas.addEventListener('webglcontextlost', onContextLost);

        await Assets.load(atlasAlias);
        const atlas = Assets.get<TextureAtlas>(atlasAlias);
        if (!atlas) {
          throw new Error('Spine atlas asset missing after load');
        }

        const skeletonData = await loadSkeletonDataFromAtlas(skeletonUrl, atlas);
        if (isCancelled() || !hostRef.current) {
          releaseScene();
          return;
        }

        spine = new Spine({
          skeletonData,
          autoUpdate: true,
          ticker: app.ticker,
        });
        spineRef.current = spine;

        app.stage.addChild(spine);
        layoutDynamicSpine(spine, app, {
          width: initWidth,
          height: initHeight,
          padding,
          offsetX,
          offsetY,
          verticalAlign,
          fit,
          animation,
          loop,
          boundsSampleStep: resolvedBoundsSampleStep,
          layoutSampleTime,
        });

        if (!isCancelled()) {
          setHasError(false);
          setIsReady(true);
          if (initPriority === 'stage' && !isShopStageBootComplete()) {
            notifyShopStageLayerReady();
          }
        }
      } catch (error) {
        console.error('Failed to initialize DynamicSpine scene.', error);
        releaseScene();
        if (!isCancelled()) {
          setHasError(true);
          setIsReady(false);
        }
      } finally {
        releaseSpineInitSlot(initPriority);
      }
    };

    setIsReady(false);
    setHasError(false);
    void setup();

    return () => {
      mounted = false;
      stageBootToken.cancelled = true;
      cancelShopStageBootWait(stageBootToken);
      cancelSpineInitWait(waitToken);
      releaseScene();
    };
  }, [atlasUrl, canInit, canRender, initPriority, skeletonUrl, waitForStageBoot]);

  useEffect(() => {
    const app = appRef.current;
    const spine = spineRef.current;
    if (!isReady || !app || !spine || width <= 0 || height <= 0) return;

    if (app.screen.width !== width || app.screen.height !== height) {
      app.renderer.resize(width, height);
    }

    layoutDynamicSpine(spine, app, {
      width,
      height,
      padding,
      offsetX,
      offsetY,
      verticalAlign,
      fit,
      animation,
      loop,
      boundsSampleStep: resolvedBoundsSampleStep,
      layoutSampleTime,
    });
  }, [
    animation,
    fit,
    height,
    isReady,
    layoutSampleTime,
    loop,
    offsetX,
    offsetY,
    padding,
    resolvedBoundsSampleStep,
    verticalAlign,
    width,
  ]);

  if (hasError && fallback) {
    return (
      <div
        className={`flex items-center justify-center select-none ${className}`}
        style={{ width, height }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div className={`relative select-none ${className}`} style={{ width, height }}>
      {!isReady && fallback ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-35"
        >
          {fallback}
        </div>
      ) : null}
      <div ref={hostRef} className={`h-full w-full ${isReady ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};
