/**
 * 文件说明：结算详情页路由参数与跳转辅助。
 */
import type { SettlementRecordItem } from '@/hooks/settlementTypes';

export type SettlementDetailAction = 'settle' | 'view';

export type SettlementRouteKind = 'coin' | 'battle';

export type SettlementDetailLocationState = {
  itemId?: string;
  reopenDrawer?: boolean;
};

export function settlementRecordToPath(
  item: Pick<SettlementRecordItem, 'id' | 'sourceTab' | 'marketId' | 'battleId' | 'status'>,
  action: SettlementDetailAction,
) {
  const query = new URLSearchParams();
  query.set('action', action);

  if (item.sourceTab === 'dark' && item.marketId) {
    return `/settlement/coin/${item.marketId}?${query.toString()}`;
  }
  if (item.sourceTab === 'arena' && item.battleId) {
    return `/settlement/battle/${item.battleId}?${query.toString()}`;
  }
  return '/';
}

export function settlementItemIdFromRoute(kind: SettlementRouteKind, id: string) {
  if (kind === 'coin') return `coin-${id}`;
  return `battle-${id}`;
}
