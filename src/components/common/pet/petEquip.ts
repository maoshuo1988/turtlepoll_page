/**
 * 文件说明：装备龟种展示判断，空 equip（petId=0 等）不渲染宠物形象。
 */
import type { PetEquipInfo } from '@/hooks/petTypes';
import { pickPetAvatarUrl } from './petPreviewAsset';

export function isPresentPetId(petId?: number | string | null): boolean {
  if (petId == null) return false;
  if (typeof petId === 'number') return Number.isFinite(petId) && petId > 0;
  const trimmed = petId.trim();
  return trimmed !== '' && trimmed !== '0';
}

export function pickValidPetId(...vals: unknown[]): string {
  for (const value of vals) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 0) return String(value);
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && trimmed !== '0') return trimmed;
    }
  }
  return '';
}

export function pickValidPetRarity(...vals: unknown[]): string {
  for (const value of vals) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 0) return String(value);
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && trimmed !== '0') return trimmed;
    }
  }
  return '';
}

export function hasDisplayPetRarity(rarity?: string | number | null): boolean {
  if (rarity == null) return false;
  if (typeof rarity === 'number') return Number.isFinite(rarity) && rarity > 0;
  const trimmed = rarity.trim();
  return trimmed !== '' && trimmed !== '0';
}

export type PetEquipDisplaySource = {
  petId?: number | string | null;
  petKey?: string | null;
  petName?: string | null;
  name?: string | null;
  icon?: string | null;
  image?: string | null;
};

export function hasEquippedPetInfo(info?: PetEquipInfo | PetEquipDisplaySource | null): boolean {
  if (!info) return false;
  if (isPresentPetId(info.petId)) return true;
  if (pickPetAvatarUrl(info.icon, info.image)) return true;
  if (info.petKey?.trim()) return true;
  const displayName = info.petName?.trim() || ('name' in info ? info.name?.trim() : '');
  return Boolean(displayName);
}
