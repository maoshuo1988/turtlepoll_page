/**
 * 文件说明：pet Types，定义对应业务域的接口数据类型。
 */
export type PetApiErrorCode =
  | 'ALREADY_SETTLED'
  | 'EQUIP_DAILY_LIMIT'
  | 'DEBT_UNPAID'
  | 'INSUFFICIENT_COINS'
  | 'STAMINA_NOT_ENOUGH'
  | 'PARAM_INVALID'
  | 'PET_NOT_OWNED';

export type PetEquipInfo = {
  petId: number | string;
  petKey?: string;
  petName?: string;
  rarity?: string;
  level?: number;
  equippedAt?: number;
  equipDayName?: number;
  abilities?: Record<string, unknown>;
  abilityDescriptions?: PetAbilityDescription[];
  /** equip 接口 icon，json 为骨骼动画资源 */
  icon?: string;
  /** equip 接口 image，与 icon 同源时可二选一 */
  image?: string;
};

export type PetAbilityDescription = {
  description: string;
  enabled?: boolean;
  featureKey?: string;
  name?: string;
};

export type OwnedPetItem = {
  petId: number | string;
  petKey?: string;
  petName?: string;
  rarity?: string;
  level?: number;
  xp?: number;
  isEquipped?: boolean;
  obtainedAt?: number;
  /** owned 接口 icon，json 为骨骼动画资源 */
  icon?: string;
  /** owned 接口 image，与 icon 同源时可二选一 */
  image?: string;
};

export type PetOwnedResponse = {
  equippedPetId?: number | string;
  list: OwnedPetItem[];
};

export type PetStaminaResponse = {
  current: number;
  cap: number;
  regenPerHour?: number;
  nextRegenAt?: number;
};

export type PetStatusDaily = {
  alreadySettled?: boolean;
  lastSettleTime?: number;
};

export type PetStatusAiMessage =
  | string
  | {
      role?: string;
      text?: string;
      content?: string;
      message?: string;
      createTime?: number;
    };

export type PetStatusResponse = {
  moodState?: string | { label?: string; state?: string; description?: string };
  voteStats?: Record<string, unknown>;
  spark?: number;
  daily?: PetStatusDaily;
  ai?: PetStatusAiMessage[];
  dialogues?: PetStatusAiMessage[];
  idleDialogues?: PetStatusAiMessage[];
  dialogue?: PetStatusAiMessage;
  message?: PetStatusAiMessage;
  greeting?: PetStatusAiMessage;
};

export type PetEquipPayload =
  | {
      petId: number;
      petKey?: never;
    }
  | {
      petId?: never;
      petKey: string;
    };

export type PetEquipMutationResponse = {
  ok: boolean;
  pet: PetEquipInfo;
  nextEffectiveAt?: number | string;
  abilities?: Record<string, unknown>;
  abilityDescriptions?: PetAbilityDescription[];
};

export type PetStaminaConsumePayload = {
  amount: number;
};

export type PetStaminaFeedPayload = {
  count: number;
};

export type PetStaminaMutationResponse = {
  current?: number;
  cap?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  cost?: number;
  xp?: number;
  [key: string]: unknown;
};

export type PetEggHatchRewardPet = {
  petId: number | string;
  petKey?: string;
  rarity?: string;
  name?: string;
};

export type PetEggHatchResponse = {
  cost: number;
  refund: number;
  isDuplicate: boolean;
  pet: PetEggHatchRewardPet;
  balanceBefore?: number;
  balanceAfter?: number;
};

export type PetGachaProbabilityRow = {
  rarity: string | number;
  label: string;
  probability?: number;
  value: string;
};

export type PetGachaConfigResponse = {
  cost?: number;
  probabilities: PetGachaProbabilityRow[];
};

/** 归一化后的单条宠物定义（接口字段兼容别名）。 */
export type PetDefNormalized = {
  id: string;
  petKey: string;
  displayName: string;
  rarity?: string;
  /** 服务端静态资源完整 URL（display.thumbnail / icon 等） */
  avatarUrl?: string;
};

export type PetDefsListNormalized = {
  list: PetDefNormalized[];
  total: number;
};
