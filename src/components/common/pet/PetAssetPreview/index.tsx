/**
 * 文件说明：龟种预览统一展示，json 资源走 Spine，其余走静态图。
 */
import React, { useState } from 'react';
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
  /** 直接传入已解析资源，避免重复计算 */
  asset?: PetPreviewAsset | null;
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
}: PetAssetPreviewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const preview = asset ?? resolvePetPreviewAsset({ avatarUrl, petKey, petName });
  const label = alt ?? petName ?? petKey ?? '龟种预览';

  if (!preview) {
    return (
      <div
        className={`grid place-items-center ${className}`}
        style={{ width: size, height: size }}
      >
        {renderFallback('🐢', 'text-[1.4em]')}
      </div>
    );
  }

  if (preview.kind === 'spine' && preview.atlasUrl) {
    return (
      <DynamicSpine
        skeletonUrl={preview.src}
        atlasUrl={preview.atlasUrl}
        width={size}
        height={size}
        className={className}
        fallback={renderFallback(preview.fallback, 'text-[1.4em]')}
        padding={Math.max(4, Math.round(size * 0.08))}
        offsetY={Math.round(size * 0.04)}
      />
    );
  }

  if (imageFailed) {
    return (
      <div
        className={`grid place-items-center ${className}`}
        style={{ width: size, height: size }}
      >
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
