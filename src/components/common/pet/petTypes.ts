/**
 * 文件说明：宠物展示层通用类型定义。
 */
export interface PetInfo {
  name: string;
  status: string;
  level: number;
  rarityKey?: string | number;
  avatar: string;
  stamina: number;
  maxStamina: number;
  petKey?: string;
  petId?: number | string;
  /** equip 接口 icon，json 为骨骼动画资源 */
  icon?: string;
  /** equip 接口 image，与 icon 同源时可二选一 */
  image?: string;
}

export type PetRarity = 'N' | 'R' | 'SR' | 'SSR';

export interface PetSkin {
  id: string;
  name: string;
  avatar: string;
  description: string;
  rarity: PetRarity;
  owned: boolean;
  equipped: boolean;
  price?: number;
  source: string;
}

export interface BattlePetSkillDefinition {
  name: string;
  icon: string;
  activeDesc: string;
  inactiveDesc: string;
  activation: 'comments' | 'likes' | 'contribution';
  threshold: number;
}
