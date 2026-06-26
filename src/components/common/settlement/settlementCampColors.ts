/**
 * 文件说明：待结算阵营色与 chip 颜色映射。
 */
import type { SettlementCampSide } from '@/hooks/settlementTypes';

export const SETTLEMENT_CAMP_COLORS = {
  A: '#00D2FF',
  B: '#FF0055',
  draw: '#facc15',
  unknown: '#6b7280',
} as const;

export const SETTLEMENT_TAB_DOT_COLORS = {
  dark: '#00D2FF',
  arena: '#FF4D4F',
  pk: '#FF4D4F',
} as const;

export function resolveSettlementChipColor(side: SettlementCampSide): string {
  return SETTLEMENT_CAMP_COLORS[side];
}
