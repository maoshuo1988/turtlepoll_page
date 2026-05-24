/**
 * 文件说明：宠物展示层通用类型定义。
 */
export interface PetInfo {
  name: string;
  status: string;
  level: number;
  avatar: string;
  stamina: number;
  maxStamina: number;
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
