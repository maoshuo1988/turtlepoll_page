/**
 * 文件说明：pet Abilities，按接口返回的能力说明组装宠物能力展示。
 */
import type { PetEquipInfo } from '@/hooks/petTypes';
import { normalizePetRarityGrade } from '@/components/common/pet/petRarity';

function pickApiAbilityDescription(input?: Pick<PetEquipInfo, 'abilityDescriptions'> | null) {
  const descriptions = input?.abilityDescriptions ?? [];
  const enabled = descriptions.find((item) => item.enabled !== false && item.description.trim());
  const first = descriptions.find((item) => item.description.trim());
  return enabled?.description ?? first?.description ?? '';
}

export function getTurtleAbility(
  input?: Pick<PetEquipInfo, 'petKey' | 'petName' | 'rarity' | 'level' | 'abilityDescriptions'> | null,
  fallbackName?: string,
) {
  return {
    id: input?.petKey || '',
    name: input?.petName ?? fallbackName ?? '当前龟种',
    ability: '',
    description: pickApiAbilityDescription(input),
    displayName: input?.petName ?? fallbackName ?? '当前龟种',
    displayRarity: normalizePetRarityGrade(input?.rarity),
    level: input?.level ?? 1,
  };
}
