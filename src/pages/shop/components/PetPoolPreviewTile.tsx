/**
 * 文件说明：奖池预览单个宠物卡片，稀有度配色与商城列表一致。
 */
import type { PetRarityGrade } from '@/components/common/pet/petRarity';
import type { PetPreviewAsset } from '@/components/common/pet/petPreviewAsset';
import { PetAssetPreview } from '@/components/common/pet/PetAssetPreview';
import { getPetPoolPreviewBadgeTextClass, getPetPoolPreviewFrameClass } from './shopPetPreviewStyles';

export interface PetPoolPreviewTileProps {
  rarityGrade: PetRarityGrade;
  label: string;
  preview: PetPreviewAsset | null;
  petKey?: string;
  variant: 'strip' | 'dialog';
}

export function PetPoolPreviewTile({
  rarityGrade,
  label,
  preview,
  petKey,
  variant,
}: PetPoolPreviewTileProps) {
  const frame = getPetPoolPreviewFrameClass(rarityGrade);
  const badgeTone = getPetPoolPreviewBadgeTextClass(rarityGrade);
  const previewSize = variant === 'strip' ? 48 : 56;

  return (
    <div
      className={
        variant === 'strip'
          ? `w-[clamp(76px,8vw,92px)] shrink-0 rounded-[18px] border p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${frame}`
          : `rounded-[18px] border p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${frame}`
      }
    >
      <div className={`rounded-[10px] px-1 py-0.5 text-[10px] font-black ${badgeTone}`}>{rarityGrade}</div>
      <div className="mx-auto mt-2 flex justify-center">
        <PetAssetPreview
          asset={preview}
          petKey={petKey}
          petName={label}
          alt={label}
          size={previewSize}
          className="mx-auto"
          imageClassName="mx-auto object-contain"
        />
      </div>
      <div
        className={
          variant === 'strip'
            ? 'mt-2 truncate text-[11px] font-black text-white'
            : 'mt-2 truncate text-xs font-black text-white'
        }
      >
        {label}
      </div>
    </div>
  );
}
