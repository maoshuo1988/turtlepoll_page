/**
 * 文件说明：结算详情页路由参数与跳转辅助。
 */
import type { SettlementRecordItem } from '@/hooks/settlementTypes';

export type SettlementDetailAction = 'settle' | 'view';

export type SettlementRouteKind = 'coin' | 'tear' | 'battle' | 'pk';

export type SettlementDetailLocationState = {
  itemId?: string;
  reopenDrawer?: boolean;
};

export function settlementRecordToPath(
  item: Pick<SettlementRecordItem, 'id' | 'sourceTab' | 'marketId' | 'battleId' | 'topicId' | 'roundId' | 'status'>,
  action: SettlementDetailAction,
) {
  const query = new URLSearchParams();
  query.set('action', action);

  if (item.sourceTab === 'dark' && item.marketId) {
    if (item.id.startsWith('tear-')) {
      return `/settlement/tear/${item.marketId}?${query.toString()}`;
    }
    return `/settlement/coin/${item.marketId}?${query.toString()}`;
  }
  if (item.sourceTab === 'arena' && item.battleId) {
    return `/settlement/battle/${item.battleId}?${query.toString()}`;
  }
  if (item.sourceTab === 'pk' && item.topicId) {
    if (item.roundId) {
      query.set('roundId', String(item.roundId));
    }
    return `/settlement/pk/${item.topicId}?${query.toString()}`;
  }
  return '/';
}

export function settlementItemIdFromRoute(kind: SettlementRouteKind, id: string) {
  if (kind === 'coin') return `coin-${id}`;
  if (kind === 'tear') return `tear-${id}`;
  if (kind === 'pk') return `pk-${id}`;
  return `battle-${id}`;
}
