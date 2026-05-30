/** 文件说明：孵化结果与奖池宠物定义对齐，解析展示用预览资源。 */
import { resolvePetPreviewAsset, type PetPreviewAsset } from '@/components/common/pet/petPreviewAsset';
import { normalizePetRarityGrade, type PetRarityGrade } from '@/components/common/pet/petRarity';
import type { PetEggHatchResponse } from '@/hooks/petTypes';
import type { PetDefNormalized } from '@/hooks/petTypes';

export type HatchResultPetPreview = {
  preview: PetPreviewAsset | null;
  label: string;
  petKey?: string;
  rarityGrade: PetRarityGrade;
};

function findPetDefByHatchPetId(petDefs: PetDefNormalized[], petId: string) {
  if (!petId) return undefined;
  return (
    petDefs.find((item) => String(item.id) === petId) ??
    petDefs.find((item) => String(item.petKey) === petId)
  );
}

/** 用孵化返回的 petId 在宠物定义列表中匹配，并解析图片 / Spine 预览。 */
export function resolveHatchResultPetPreview(
  hatchResult: PetEggHatchResponse,
  petDefs: PetDefNormalized[],
): HatchResultPetPreview {
  const { pet } = hatchResult;
  const petId = String(pet.petId ?? '').trim();
  const def = findPetDefByHatchPetId(petDefs, petId);
  const petKey = pet.petKey ?? def?.petKey;
  const petName = pet.name ?? def?.displayName;
  const avatarUrl = pet.avatarUrl ?? def?.avatarUrl;

  return {
    preview: resolvePetPreviewAsset({
      avatarUrl,
      petKey,
      petName,
    }),
    label: petName ?? petKey ?? '新龟种',
    petKey,
    rarityGrade: normalizePetRarityGrade(pet.rarity ?? def?.rarity),
  };
}
