/**
 * 文件说明：黑市横向列表共用单个 WebGL，渲染多个 Spine 缩略图。
 */
import { useEffect, useMemo, useRef } from 'react';
import { Application, Assets, Container } from 'pixi.js';
import '@esotericsoftware/spine-pixi-v8';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { layoutSpineInBox } from '@/components/common/spine/DynamicSpine';
import { loadSkeletonDataFromAtlas } from '@/components/common/spine/spineSkeletonLoad';
import { safeDestroyPixiApp } from '@/components/common/spine/safeDestroyPixiApp';
import {
  cancelShopStageBootWait,
  waitForShopStageBoot,
  type ShopStageBootToken,
} from '@/components/common/spine/shopStageBootGate';

export type ShopSharedSpineSlot =
  | {
      key: string;
      skeletonUrl: string;
      atlasUrl: string;
    }
  | null;

interface ShopSharedSpineStripProps {
  slots: ShopSharedSpineSlot[];
  /** 每个卡片占位宽度（与列表项 w-[Npx] 一致） */
  columnWidth: number;
  /** Spine 绘制区域宽高（与卡片内预览洞一致） */
  previewWidth: number;
  previewHeight: number;
  /** 预览区相对滚动行顶部的偏移（px） */
  previewTopPx?: number;
  /** 预览区相对列左侧偏移；默认居中 */
  previewOffsetX?: number;
  gap?: number;
  className?: string;
  children: React.ReactNode;
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
  const alias = `shop-strip-atlas-${hashAssetKey(atlasUrl)}`;
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

export function ShopSharedSpineStrip({
  slots,
  columnWidth,
  previewWidth,
  previewHeight,
  previewTopPx = 36,
  previewOffsetX,
  gap = 12,
  className = '',
  children,
}: ShopSharedSpineStripProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spineSlotsRef = useRef<Spine[]>([]);

  const resolvedPreviewOffsetX =
    previewOffsetX ?? Math.max(0, Math.round((columnWidth - previewWidth) / 2));

  const stripWidth = useMemo(() => {
    if (slots.length === 0) return 0;
    return slots.length * columnWidth + Math.max(0, slots.length - 1) * gap;
  }, [columnWidth, gap, slots.length]);

  const slotsKey = useMemo(
    () =>
      slots
        .map((slot) => (slot ? `${slot.key}:${slot.skeletonUrl}` : 'empty'))
        .join('|'),
    [slots],
  );

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || stripWidth <= 0) return undefined;

    const bootToken: ShopStageBootToken = { cancelled: false };
    let mounted = true;
    let app: Application | null = null;

    const releaseScene = () => {
      spineSlotsRef.current.forEach((spine) => {
        spine.destroy();
      });
      spineSlotsRef.current = [];
      const activeApp = appRef.current ?? app;
      appRef.current = null;
      app = null;
      if (host) host.replaceChildren();
      safeDestroyPixiApp(activeApp);
    };

    const setup = async () => {
      await waitForShopStageBoot(bootToken);
      if (!mounted || !canvasHostRef.current) return;

      app = new Application();
      await app.init({
        width: stripWidth,
        height: previewHeight,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });

      if (!mounted || !canvasHostRef.current) {
        releaseScene();
        return;
      }

      appRef.current = app;
      canvasHostRef.current.replaceChildren(app.canvas);
      app.canvas.style.display = 'block';
      app.canvas.style.width = `${stripWidth}px`;
      app.canvas.style.height = `${previewHeight}px`;

      const padding = Math.max(4, Math.round(previewHeight * 0.08));

      for (let index = 0; index < slots.length; index += 1) {
        const slot = slots[index];
        if (!slot || !mounted) continue;

        try {
          const atlasAlias = registerAtlasAsset(slot.atlasUrl);
          await Assets.load(atlasAlias);
          const atlas = Assets.get<TextureAtlas>(atlasAlias);
          if (!atlas || !mounted || !app) continue;

          const skeletonData = await loadSkeletonDataFromAtlas(slot.skeletonUrl, atlas);
          if (!mounted || !app) continue;

          const tileRoot = new Container();
          tileRoot.x = index * (columnWidth + gap) + resolvedPreviewOffsetX;
          app.stage.addChild(tileRoot);

          const spine = new Spine({
            skeletonData,
            autoUpdate: true,
            ticker: app.ticker,
          });
          tileRoot.addChild(spine);
          layoutSpineInBox(spine, previewWidth, previewHeight, {
            padding,
            offsetX: 0,
            offsetY: Math.round(previewHeight * 0.04),
            verticalAlign: 'center',
            fit: 'contain',
            animation: 'idle',
            loop: true,
            boundsSampleStep: 0.05,
            layoutSampleTime: 0,
          });
          spineSlotsRef.current.push(spine);
        } catch (error) {
          console.error('ShopSharedSpineStrip failed to load slot.', slot.key, error);
        }
      }
    };

    void setup();

    return () => {
      mounted = false;
      bootToken.cancelled = true;
      cancelShopStageBootWait(bootToken);
      releaseScene();
    };
  }, [
    columnWidth,
    gap,
    previewHeight,
    previewTopPx,
    previewWidth,
    resolvedPreviewOffsetX,
    slots,
    slotsKey,
    stripWidth,
  ]);

  if (slots.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative w-full max-w-full ${className}`.trim()}>
      <div className="relative z-[2] flex w-max max-w-none min-w-0" style={{ gap }}>
        {children}
      </div>
      {/* 画布必须在卡片之上：卡片背景不透明，放在下层会被完全挡住 */}
      <div
        ref={canvasHostRef}
        className="pointer-events-none absolute left-0 z-[3]"
        style={{ top: previewTopPx, width: stripWidth, height: previewHeight }}
      />
    </div>
  );
}
