/**
 * 文件说明：全局乌龟 Spine 展示组件，加载 public/spine/common 下的 wugui 资源。
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

export interface CommonSpineProps {
  /** 画布宽度（px） */
  width: number;
  /** 画布高度（px） */
  height: number;
  className?: string;
  /** 循环播放的动画名，默认 idle */
  animation?: string;
  /** 加载失败或加载中时展示的占位内容 */
  fallback?: React.ReactNode;
  /** 骨骼适配留白，默认 12 */
  padding?: number;
  /** 垂直居中微调，默认 4 */
  offsetY?: number;
}

const SPINE_ASSET_BASE = '/spine/common';
const ATLAS_ALIAS = 'pet-wugui-atlas-v4';
const ATLAS_URL = `${SPINE_ASSET_BASE}/wugui.atlas`;
const SKELETON_URL = `${SPINE_ASSET_BASE}/wugui.json?v=1`;

let atlasAssetRegistered = false;

function registerAtlasAsset() {
  if (atlasAssetRegistered) return;
  atlasAssetRegistered = true;

  Assets.add({
    alias: ATLAS_ALIAS,
    src: ATLAS_URL,
    parser: 'spineTextureAtlasLoader',
  });
}

async function loadSkeletonData(atlas: TextureAtlas): Promise<SkeletonData> {
  const response = await fetch(SKELETON_URL);
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

interface LayoutOptions {
  width: number;
  height: number;
  padding: number;
  offsetY: number;
}

function layoutSpine(spine: Spine, app: Application, options: LayoutOptions) {
  const boundsAnimation = resolveAnimationName(spine, 'idle') ?? 'idle';

  spine.skeleton.setSkin('default');
  spine.boundsProvider = new SkinsAndAnimationBoundsProvider(boundsAnimation, ['default'], 0.05);
  spine.skeleton.setupPose();
  spine.skeleton.updateWorldTransform(Physics.update);
  spine.update(0);

  const bounds = spine.skeleton.getBoundsRect();
  if (!Number.isFinite(bounds.width) || bounds.width <= 0 || bounds.height <= 0) {
    return;
  }

  const targetWidth = Math.max(options.width - options.padding * 2, 1);
  const targetHeight = Math.max(options.height - options.padding * 2, 1);
  const scale = Math.min(targetWidth / bounds.width, targetHeight / bounds.height);

  spine.scale.set(scale);
  spine.x = (app.screen.width - bounds.width * scale) / 2 - bounds.x * scale;
  spine.y =
    (app.screen.height - bounds.height * scale) / 2 - bounds.y * scale + options.offsetY;
}

function playAnimation(spine: Spine, animation?: string) {
  const animationName = resolveAnimationName(spine, animation);
  if (!animationName) {
    console.warn('CommonSpine has no animation track to play.');
    return;
  }

  spine.state.setAnimation(0, animationName, true);
}

export const CommonSpine: React.FC<CommonSpineProps> = ({
  width,
  height,
  className = '',
  animation = 'idle',
  fallback = null,
  padding = 12,
  offsetY = 4,
}) => {
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
        registerAtlasAsset();

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

        await Assets.load(ATLAS_ALIAS);
        const atlas = Assets.get<TextureAtlas>(ATLAS_ALIAS);
        if (!atlas) {
          throw new Error('Spine atlas asset missing after load');
        }

        const skeletonData = await loadSkeletonData(atlas);
        if (!mounted) return;

        spine = new Spine({
          skeletonData,
          autoUpdate: true,
          ticker: app.ticker,
        });

        app.stage.addChild(spine);
        layoutSpine(spine, app, { width, height, padding, offsetY });
        playAnimation(spine, animation);

        if (mounted) {
          setHasError(false);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize CommonSpine scene.', error);
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
  }, [animation, height, offsetY, padding, width]);

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
    <div
      className={`relative select-none ${className}`}
      style={{ width, height }}
    >
      {!isReady && fallback ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-35"
        >
          {fallback}
        </div>
      ) : null}
      <div
        ref={hostRef}
        className={`h-full w-full ${isReady ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
