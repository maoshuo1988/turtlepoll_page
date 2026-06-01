/** 文件说明：孵化结果与奖池宠物定义对齐，解析展示用预览资源。 */
import { resolvePetPreviewAsset, type PetPreviewAsset } from '@/components/common/pet/petPreviewAsset';
import { normalizePetRarityGrade, type PetRarityGrade } from '@/components/common/pet/petRarity';
import { isPetEggHatchWin, type PetEggHatchResponse } from '@/hooks/petTypes';
import type { PetDefNormalized } from '@/hooks/petTypes';

function isHatchSuccessLikeMessage(message: string) {
  return /恭喜|成功|获得|抽中/.test(message);
}

export function getPetEggHatchMissMessage(result: PetEggHatchResponse) {
  const apiMessage = result.message?.trim();
  if (apiMessage && !isHatchSuccessLikeMessage(apiMessage)) {
    return apiMessage;
  }

  const costText = result.cost > 0 ? `，已消耗 ${result.cost.toLocaleString()} 龟币` : '';
  return `很遗憾，这次没有抽到宠物${costText}。再试一次吧！`;
}

export function getPetEggHatchWinMessage(result: PetEggHatchResponse) {
  if (result.isDuplicate) {
    return `开蛋完成，重复龟种已返还 ${result.refund.toLocaleString()} 龟币，实际扣费 ${result.cost.toLocaleString()}。`;
  }
  const petName = result.pet.name ?? result.pet.petKey ?? '新龟种';
  return `恭喜抽中 ${petName}！实际扣费 ${result.cost.toLocaleString()} 龟币。`;
}

export { isPetEggHatchWin };

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
