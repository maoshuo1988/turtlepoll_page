/**
 * 文件说明：pet Rarity，维护宠物稀有度等级枚举和展示映射。
 */
export const PetRarityGrade = {
  C: 'C',
  B: 'B',
  A: 'A',
  S: 'S',
  SS: 'SS',
  SSS: 'SSS',
} as const;

export type PetRarityGrade = (typeof PetRarityGrade)[keyof typeof PetRarityGrade];

export const PET_RARITY_BADGE_CLASSES: Record<PetRarityGrade, string> = {
  [PetRarityGrade.C]: 'bg-lime-500/12 text-lime-300',
  [PetRarityGrade.B]: 'bg-sky-500/12 text-sky-300',
  [PetRarityGrade.A]: 'bg-fuchsia-500/12 text-fuchsia-300',
  [PetRarityGrade.S]: 'bg-amber-500/12 text-amber-300',
  [PetRarityGrade.SS]: 'bg-amber-500/12 text-amber-300',
  [PetRarityGrade.SSS]: 'bg-amber-500/12 text-amber-300',
};

export const PET_RARITY_TEXT_CLASSES: Record<PetRarityGrade, string> = {
  [PetRarityGrade.C]: 'text-lime-300',
  [PetRarityGrade.B]: 'text-sky-300',
  [PetRarityGrade.A]: 'text-fuchsia-300',
  [PetRarityGrade.S]: 'text-amber-300',
  [PetRarityGrade.SS]: 'text-amber-300',
  [PetRarityGrade.SSS]: 'text-amber-300',
};

const LEGACY_RARITY_TO_GRADE: Record<string, PetRarityGrade> = {
  '1': PetRarityGrade.C,
  '2': PetRarityGrade.B,
  '3': PetRarityGrade.A,
  '4': PetRarityGrade.S,
  '5': PetRarityGrade.SS,
  '6': PetRarityGrade.SSS,
  N: PetRarityGrade.C,
  R: PetRarityGrade.B,
  SR: PetRarityGrade.A,
  SSR: PetRarityGrade.S,
  普通: PetRarityGrade.C,
  稀有: PetRarityGrade.B,
  史诗: PetRarityGrade.A,
  传说: PetRarityGrade.S,
};

export function normalizePetRarityGrade(rarity?: string | number | null): PetRarityGrade {
  const normalized = String(rarity ?? '').trim().toUpperCase();

  if (normalized in PetRarityGrade) {
    return PetRarityGrade[normalized as keyof typeof PetRarityGrade];
  }

  return LEGACY_RARITY_TO_GRADE[normalized] ?? PetRarityGrade.C;
}

export function getPetRarityBadgeClass(rarity?: string | number | null): string {
  return PET_RARITY_BADGE_CLASSES[normalizePetRarityGrade(rarity)];
}

export function getPetRarityTextClass(rarity?: string | number | null): string {
  return PET_RARITY_TEXT_CLASSES[normalizePetRarityGrade(rarity)];
}
