/**
 * 文件说明：宠物皮肤稀有度展示样式。
 */
import type { PetRarity } from '@/components/common/pet/petTypes';

export const RARITY_COLORS: Record<PetRarity, string> = {
  N: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  R: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  SR: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  SSR: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};
