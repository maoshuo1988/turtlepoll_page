/** 文件说明：黑市舞台单层 Spine（蛋、龟法师等），尺寸随容器自适应。 */
import { useEffect, useRef, useState } from 'react';
import {
  SHOP_SPINE_ASSETS,
  type ShopSpineAssetKey,
} from '@/config/shopSpineAssets';
import { DynamicSpine } from '@/components/common/spine/DynamicSpine';

interface ShopSpineLayerProps {
  assetKey: ShopSpineAssetKey;
  className?: string;
  /** 布局盒宽高（px），用于法师等需随屏幕缩放的层 */
  containerStyle?: { width: number; height: number };
  animation?: string;
  fit?: 'contain' | 'cover';
  verticalAlign?: 'center' | 'top' | 'bottom';
  offsetX?: number;
  offsetY?: number;
  /** 默认 true；法师等需要露出容器外的特效时设为 false */
  clipContent?: boolean;
  /** 画布相对布局盒外扩比例，避免 Pixi 画布边缘裁切动画 */
  canvasBleedRatio?: number;
  /** 外扩锚点：贴边法师用 bottom-right / bottom-left，只往内侧扩，避免被容器裁切 */
  canvasBleedAnchor?: 'center' | 'bottom-right' | 'bottom-left';
  /** 画布内留白，缩小骨骼缩放以留出动画余量 */
  renderPadding?: number;
  /** 计算包围盒外扩，特效层（如龟蛋光晕）需更大 */
  boundsClipMargin?: number;
  /** 布局采样时间（秒），特效峰值时刻用于计算缩放 */
  layoutSampleTime?: number;
  /** 是否循环播放 */
  loop?: boolean;
}

export function ShopSpineLayer({
  assetKey,
  className = '',
  containerStyle,
  animation = 'animation',
  fit = 'contain',
  verticalAlign = 'center',
  offsetX = 0,
  offsetY = 0,
  clipContent = true,
  canvasBleedRatio = 0,
  canvasBleedAnchor = 'center',
  renderPadding = 0,
  boundsClipMargin = 0.05,
  layoutSampleTime = 0,
  loop = true,
}: ShopSpineLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() =>
    containerStyle
      ? { width: containerStyle.width, height: containerStyle.height }
      : { width: 0, height: 0 },
  );
  const assets = SHOP_SPINE_ASSETS[assetKey];
  const bleed = clipContent ? 0 : Math.max(canvasBleedRatio, 0);
  const isEdgeBleed = canvasBleedAnchor === 'bottom-right' || canvasBleedAnchor === 'bottom-left';
  const canvasWidth = Math.max(
    1,
    Math.round(size.width * (isEdgeBleed ? 1 + bleed : 1 + bleed * 2)),
  );
  const canvasHeight = Math.max(
    1,
    Math.round(size.height * (isEdgeBleed ? 1 + bleed : 1 + bleed * 2)),
  );

  const bleedWrapperStyle =
    canvasBleedAnchor === 'bottom-right'
      ? {
          right: 0,
          bottom: 0,
          width: `${(1 + bleed) * 100}%`,
          height: `${(1 + bleed) * 100}%`,
        }
      : canvasBleedAnchor === 'bottom-left'
        ? {
            left: 0,
            bottom: 0,
            width: `${(1 + bleed) * 100}%`,
            height: `${(1 + bleed) * 100}%`,
          }
        : {
            left: `${-bleed * 100}%`,
            top: `${-bleed * 100}%`,
            width: `${(1 + bleed * 2) * 100}%`,
            height: `${(1 + bleed * 2) * 100}%`,
          };

  useEffect(() => {
    if (containerStyle) {
      setSize({ width: containerStyle.width, height: containerStyle.height });
      return undefined;
    }

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
  }, [containerStyle?.height, containerStyle?.width]);

  const hostStyle = containerStyle
    ? { width: containerStyle.width, height: containerStyle.height }
    : undefined;

  return (
    <div
      ref={hostRef}
      style={hostStyle}
      className={`pointer-events-none ${clipContent ? 'overflow-hidden' : 'overflow-visible'} ${className}`.trim()}
    >
      {size.width > 0 && size.height > 0 ? (
        bleed > 0 ? (
          <div className="absolute overflow-visible" style={bleedWrapperStyle}>
            <DynamicSpine
              {...assets}
              initPriority="stage"
              width={canvasWidth}
              height={canvasHeight}
              animation={animation}
              fit={fit}
              verticalAlign={verticalAlign}
              offsetX={offsetX}
              offsetY={offsetY}
              padding={renderPadding}
              boundsClipMargin={boundsClipMargin}
              layoutSampleTime={layoutSampleTime}
              loop={loop}
              className="h-full w-full"
            />
          </div>
        ) : (
          <DynamicSpine
            {...assets}
            initPriority="stage"
            width={size.width}
            height={size.height}
            animation={animation}
            fit={fit}
            verticalAlign={verticalAlign}
            offsetX={offsetX}
            offsetY={offsetY}
            padding={renderPadding}
            boundsClipMargin={boundsClipMargin}
            layoutSampleTime={layoutSampleTime}
            loop={loop}
            className="h-full w-full"
          />
        )
      ) : null}
    </div>
  );
}
