/**
 * 文件说明：商城奖池预览卡片按稀有度等级的边框与标签文字配色（与原先中文档位视觉一致）。
 */
import { PetRarityGrade, type PetRarityGrade as PetGrade } from '@/components/shared/pet/petRarity';

export function getPetPoolPreviewFrameClass(grade: PetGrade): string {
  if (grade === PetRarityGrade.SSS || grade === PetRarityGrade.SS || grade === PetRarityGrade.S) {
    return 'border-[#9a6a16] bg-[linear-gradient(180deg,#3a2402,#16100a)]';
  }
  if (grade === PetRarityGrade.A) {
    return 'border-[#6d44b1] bg-[linear-gradient(180deg,#24123e,#131125)]';
  }
  if (grade === PetRarityGrade.B) {
    return 'border-[#225c8d] bg-[linear-gradient(180deg,#08294a,#0d1d31)]';
  }
  return 'border-[#3c6b1c] bg-[linear-gradient(180deg,#18340c,#101c0d)]';
}

export function getPetPoolPreviewBadgeTextClass(grade: PetGrade): string {
  if (grade === PetRarityGrade.SSS || grade === PetRarityGrade.SS || grade === PetRarityGrade.S) {
    return 'text-amber-300';
  }
  if (grade === PetRarityGrade.A) {
    return 'text-fuchsia-300';
  }
  if (grade === PetRarityGrade.B) {
    return 'text-sky-300';
  }
  return 'text-lime-300';
}
