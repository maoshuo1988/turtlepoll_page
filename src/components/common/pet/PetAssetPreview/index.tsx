/**
 * 文件说明：龟种预览统一展示，json 资源走 Spine，其余走静态图。
 */
import { useState } from 'react';
import { DynamicSpine } from '@/components/common/spine/DynamicSpine';
import {
  resolvePetPreviewAsset,
  type PetPreviewAsset,
  type PetPreviewSource,
} from '../petPreviewAsset';

export interface PetAssetPreviewProps extends PetPreviewSource {
  size: number;
  className?: string;
  imageClassName?: string;
  alt?: string;
  asset?: PetPreviewAsset | null;
  /** 黑市列表：等舞台法师加载完再 init */
  deferSpineMount?: boolean;
}

function renderFallback(fallback: string, className: string) {
  return <span className={`leading-none ${className}`}>{fallback}</span>;
}

export function PetAssetPreview({
  avatarUrl,
  petKey,
  petName,
  size,
  className = '',
  imageClassName = 'object-contain',
  alt,
  asset,
  deferSpineMount = false,
}: PetAssetPreviewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const preview = asset ?? resolvePetPreviewAsset({ avatarUrl, petKey, petName });
  const label = alt ?? petName ?? petKey ?? '龟种预览';

  if (!preview) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ width: size, height: size }}>
        {renderFallback('🐢', 'text-[1.4em]')}
      </div>
    );
  }

  if (preview.kind === 'spine' && preview.atlasUrl) {
    const fallbackNode = renderFallback(preview.fallback, 'text-[1.4em]');

    return (
      <div className={className} style={{ width: size, height: size }}>
        <DynamicSpine
          skeletonUrl={preview.src}
          atlasUrl={preview.atlasUrl}
          width={size}
          height={size}
          initPriority="preview"
          waitForStageBoot={deferSpineMount}
          fallback={fallbackNode}
          padding={Math.max(4, Math.round(size * 0.08))}
          offsetY={Math.round(size * 0.04)}
        />
      </div>
    );
  }

  if (imageFailed) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ width: size, height: size }}>
        {renderFallback(preview.fallback, 'text-[1.4em]')}
      </div>
    );
  }

  return (
    <img
      src={preview.src}
      alt={label}
      draggable={false}
      className={imageClassName}
      style={{ width: size, height: size }}
      onError={() => setImageFailed(true)}
    />
  );
}
