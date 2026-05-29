/** 文件说明：孵化成功 reveal 区展示对应龟种图片（按 petId 匹配定义列表）。 */
import { useMemo } from 'react';
import { PetAssetPreview } from '@/components/common/pet/PetAssetPreview';
import { getPetRarityTextClass } from '@/components/common/pet/petRarity';
import type { PetEggHatchResponse } from '@/hooks/petTypes';
import type { PetDefNormalized } from '@/hooks/petTypes';
import { resolveHatchResultPetPreview } from './shopHatchReveal';

interface ShopHatchRevealPetProps {
  hatchResult: PetEggHatchResponse;
  petDefs: PetDefNormalized[];
  previewSize?: number;
  className?: string;
  /** 是否在图片下方展示名称与稀有度，默认仅展示图片 */
  showMeta?: boolean;
}

export function ShopHatchRevealPet({
  hatchResult,
  petDefs,
  previewSize = 200,
  className = '',
  showMeta = false,
}: ShopHatchRevealPetProps) {
  const resolved = useMemo(
    () => resolveHatchResultPetPreview(hatchResult, petDefs),
    [hatchResult, petDefs],
  );

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`.trim()}
    >
      <PetAssetPreview
        asset={resolved.preview}
        petKey={resolved.petKey}
        petName={resolved.label}
        alt={resolved.label}
        size={previewSize}
        className="pointer-events-none"
        imageClassName="max-h-full max-w-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
      />
      {showMeta ? (
        <>
          <p className="mt-3 max-w-[220px] truncate text-[15px] font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            {resolved.label}
          </p>
          <p className={`mt-1 text-[12px] font-bold ${getPetRarityTextClass(resolved.rarityGrade)}`}>
            {resolved.rarityGrade}
            {hatchResult.isDuplicate ? ' · 重复返还' : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}
