/** 文件说明：黑市极光 Spine，铺满父级容器（与背景图同尺寸）。 */
import { useEffect, useRef, useState } from 'react';
import { SHOP_AURORA_LAYOUT, SHOP_SPINE_ASSETS } from '@/config/shopSpineAssets';
import { DynamicSpine } from '@/components/common/spine/DynamicSpine';

interface ShopAuroraSpineProps {
  className?: string;
  animation?: string;
}

export function ShopAuroraSpine({ className = '', animation = 'animation' }: ShopAuroraSpineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  return (
    <div
      ref={hostRef}
      className={`relative h-full w-full overflow-hidden opacity-90 mix-blend-screen ${className}`.trim()}
    >
      {size.width > 0 && size.height > 0 ? (
        <DynamicSpine
          {...SHOP_SPINE_ASSETS.aurora}
          initPriority="stage"
          width={size.width}
          height={size.height}
          animation={animation}
          fit="cover"
          verticalAlign={SHOP_AURORA_LAYOUT.verticalAlign}
          offsetX={SHOP_AURORA_LAYOUT.offsetX}
          offsetY={SHOP_AURORA_LAYOUT.offsetY}
          padding={0}
          className="h-full w-full"
        />
      ) : null}
    </div>
  );
}
