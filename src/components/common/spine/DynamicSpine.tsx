/**
 * 文件说明：按 skeleton.json + atlas 动态加载 Spine 骨骼动画。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Application, Assets } from 'pixi.js';
import '@esotericsoftware/spine-pixi-v8';
import {
  AtlasAttachmentLoader,
  Physics,
  SkeletonJson,
  SkinsAndAnimationBoundsProvider,
  Spine,
} from '@esotericsoftware/spine-pixi-v8';
import type { SkeletonData, TextureAtlas } from '@esotericsoftware/spine-core';

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
  if (registeredAtlasAliases.has(alias)) {
    return alias;
  }

  registeredAtlasAliases.add(alias);
  Assets.add({
    alias,
    src: atlasUrl,
    parser: 'spineTextureAtlasLoader',
  });

  return alias;
}

async function loadSkeletonData(skeletonUrl: string, atlas: TextureAtlas): Promise<SkeletonData> {
  const response = await fetch(skeletonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch skeleton json: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (!json || !Array.isArray(json.bones)) {
    throw new Error('Invalid spine skeleton json: missing bones array');
  }

  const attachmentLoader = new AtlasAttachmentLoader(atlas);
  return new SkeletonJson(attachmentLoader).readSkeletonData(json);
}

function resolveAnimationName(spine: Spine, preferred?: string): string | null {
  if (preferred && spine.skeleton.data.findAnimation(preferred)) {
    return preferred;
  }
  if (spine.skeleton.data.findAnimation('idle')) return 'idle';
  if (spine.skeleton.data.findAnimation('animation')) return 'animation';
  return spine.skeleton.data.animations[0]?.name ?? null;
}

function layoutSpine(
  spine: Spine,
  app: Application,
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

  const bounds = spine.skeleton.getBoundsRect();
  if (!Number.isFinite(bounds.width) || bounds.width <= 0 || bounds.height <= 0) {
    return;
  }

  const targetWidth = Math.max(options.width - options.padding * 2, 1);
  const targetHeight = Math.max(options.height - options.padding * 2, 1);
  const scaleX = targetWidth / bounds.width;
  const scaleY = targetHeight / bounds.height;
  const scale = options.fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;

  let x = (app.screen.width - scaledWidth) / 2 - bounds.x * scale;
  let y =
    options.verticalAlign === 'top'
      ? options.padding - bounds.y * scale
      : options.verticalAlign === 'bottom'
        ? app.screen.height - scaledHeight - options.padding - bounds.y * scale
        : (app.screen.height - scaledHeight) / 2 - bounds.y * scale;

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
}) => {
  const resolvedBoundsSampleStep = boundsClipMargin ?? boundsSampleStep;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let spine: Spine | null = null;

    const setup = async () => {
      if (!hostRef.current || width <= 0 || height <= 0) return;

      try {
        const atlasAlias = registerAtlasAsset(atlasUrl);
        const app = new Application();
        await app.init({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });

        if (!mounted || !hostRef.current) {
          app.destroy(true, { children: true });
          return;
        }

        appRef.current = app;
        hostRef.current.replaceChildren(app.canvas);
        app.canvas.style.display = 'block';
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';

        await Assets.load(atlasAlias);
        const atlas = Assets.get<TextureAtlas>(atlasAlias);
        if (!atlas) {
          throw new Error('Spine atlas asset missing after load');
        }

        const skeletonData = await loadSkeletonData(skeletonUrl, atlas);
        if (!mounted) return;

        spine = new Spine({
          skeletonData,
          autoUpdate: true,
          ticker: app.ticker,
        });

        app.stage.addChild(spine);
        layoutSpine(spine, app, {
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

        if (mounted) {
          setHasError(false);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize DynamicSpine scene.', error);
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
      if (spine?.parent) {
        spine.parent.removeChild(spine);
      }
      spine?.destroy();
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
  }, [animation, atlasUrl, boundsClipMargin, boundsSampleStep, fit, height, layoutSampleTime, loop, offsetX, offsetY, padding, skeletonUrl, verticalAlign, width]);

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
