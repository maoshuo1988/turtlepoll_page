/**
 * 文件说明：聚合暗盘与开撕台待结算 / 已结算条目。
 */
import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { getAuthToken } from '@/utils/authStorage';
import {
  fetchBattleDetail,
  battleQueryKeys,
  useRequestBattleList,
} from '@/hooks/useBattleRequests';
import { getBattleActionPermissions } from '@/hooks/battleTypes';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { useRequestPKTopics } from '@/hooks/usePkRequests';
import type { PKTopicSummary } from '@/hooks/pkTypes';
import type { SettlementCampSide, SettlementRecordItem } from '@/hooks/settlementTypes';

function resolveMarketBetSide(item: FootballMarketAggregate): SettlementCampSide {
  const raw = item as FootballMarketAggregate & {
    bet?: { option?: string };
    myBet?: { option?: string; side?: string };
    betOption?: string;
  };
  const option = String(raw.bet?.option ?? raw.myBet?.option ?? raw.betOption ?? raw.myBet?.side ?? '')
    .trim()
    .toUpperCase();
  if (option === 'A') return 'A';
  if (option === 'B') return 'B';
  if (option === 'DRAW' || option === 'C') return 'draw';
  return 'unknown';
}

function mapCoinRecord(
  item: FootballMarketAggregate,
  status: 'pending' | 'settled',
): SettlementRecordItem | null {
  const market = item.market;
  if (!item.hasBet) return null;
  if (String(market.status ?? '').toUpperCase() !== 'SETTLED') return null;

  const isPending = !item.betSettleResult;
  if (status === 'pending' && !isPending) return null;
  if (status === 'settled' && isPending) return null;

  const marketId = market.id;
  const title = item.context?.eventName || market.title || `预测市场 #${marketId}`;

  return {
    id: `coin-${marketId}`,
    status,
    sourceTab: 'dark',
    title,
    subtitle: status === 'pending' ? '已结束 · 赛果已出' : '已结算',
    campSide: resolveMarketBetSide(item),
    marketId,
  };
}

function mapBattleRecord(
  battleId: number,
  title: string,
  campSide: SettlementCampSide,
  status: 'pending' | 'settled',
): SettlementRecordItem {
  return {
    id: `battle-${battleId}`,
    status,
    sourceTab: 'arena',
    title,
    subtitle: status === 'pending' ? '已结束 · 赛果已出' : '已结算',
    campSide,
    battleId,
  };
}

function mapPkRecord(summary: PKTopicSummary): SettlementRecordItem | null {
  if (!summary.canSettle || !summary.topic?.id) return null;
  const topicId = Number(summary.topic.id);
  if (!Number.isFinite(topicId) || topicId <= 0) return null;
  const campSide: SettlementCampSide =
    summary.mySide === 'A' ? 'A' : summary.mySide === 'B' ? 'B' : 'unknown';

  return {
    id: `pk-${topicId}`,
    status: 'pending',
    sourceTab: 'pk',
    title: summary.topic.title || `开撕话题 #${topicId}`,
    subtitle: '回合已结束 · 可结算',
    campSide,
    topicId,
    roundId: summary.round?.id,
  };
}

export function useSettlementRecords() {
  const isAuthenticated = Boolean(getAuthToken());
  const marketsQuery = useRequestFootballMarkets({ page: 1, limit: 100 });
  const pkTopicsQuery = useRequestPKTopics({ page: 1, pageSize: 50 });
  const battlesQuery = useRequestBattleList(
    { mine: '1', status: 'settled', pageSize: 50 },
    { enabled: isAuthenticated },
  );

  const battleIds = useMemo(() => {
    const list = battlesQuery.data?.list ?? [];
    return list
      .filter((item) => item.myRole !== 'none' || item.myAction !== '')
      .map((item) => item.battle.id)
      .filter((id) => typeof id === 'number' && id > 0);
  }, [battlesQuery.data?.list]);

  const battleDetailQueries = useQueries(
    battleIds.map((battleId) => ({
      queryKey: battleQueryKeys.detail(battleId),
      queryFn: () => fetchBattleDetail(battleId),
      enabled: isAuthenticated,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  );

  const marketList = marketsQuery.data?.list ?? [];

  const pendingItems = useMemo(() => {
    const coinItems = marketList
      .map((item) => mapCoinRecord(item, 'pending'))
      .filter((item): item is SettlementRecordItem => Boolean(item));

    const battleItems: SettlementRecordItem[] = [];
    battleDetailQueries.forEach((query) => {
      const detail = query.data;
      if (!detail) return;

      const { battle, myRole, myAction, settlement } = detail;
      const permissions = getBattleActionPermissions({
        battle,
        myRole,
        myAction,
        settlementItem: settlement.myItem,
      });
      if (!permissions.canWithdraw) return;

      const campSide: SettlementCampSide =
        myRole === 'banker' ? 'A' : myRole === 'challenger' ? 'B' : 'unknown';

      battleItems.push(mapBattleRecord(battle.id, battle.title, campSide, 'pending'));
    });

    const pkItems = (pkTopicsQuery.data?.list ?? [])
      .map(mapPkRecord)
      .filter((item): item is SettlementRecordItem => Boolean(item));

    return [...coinItems, ...battleItems, ...pkItems];
  }, [battleDetailQueries, marketList, pkTopicsQuery.data?.list]);

  const settledItems = useMemo(() => {
    const coinItems = marketList
      .map((item) => mapCoinRecord(item, 'settled'))
      .filter((item): item is SettlementRecordItem => Boolean(item));

    const battleItems: SettlementRecordItem[] = [];
    battleDetailQueries.forEach((query) => {
      const detail = query.data;
      if (!detail) return;

      const { battle, myRole, myAction, settlement } = detail;
      const myItem = settlement.myItem;
      if (!myItem || !myItem.withdrawn) return;
      if (myRole === 'none' && myAction === '') return;

      const campSide: SettlementCampSide =
        myRole === 'banker' ? 'A' : myRole === 'challenger' ? 'B' : 'unknown';

      battleItems.push(mapBattleRecord(battle.id, battle.title, campSide, 'settled'));
    });

    return [...coinItems, ...battleItems];
  }, [battleDetailQueries, marketList]);

  const pendingDarkItems = useMemo(
    () => pendingItems.filter((item) => item.sourceTab === 'dark'),
    [pendingItems],
  );
  const pendingArenaItems = useMemo(
    () => pendingItems.filter((item) => item.sourceTab === 'arena'),
    [pendingItems],
  );
  const pendingPkItems = useMemo(
    () => pendingItems.filter((item) => item.sourceTab === 'pk'),
    [pendingItems],
  );
  const settledDarkItems = useMemo(
    () => settledItems.filter((item) => item.sourceTab === 'dark'),
    [settledItems],
  );
  const settledArenaItems = useMemo(
    () => settledItems.filter((item) => item.sourceTab === 'arena'),
    [settledItems],
  );

  const isLoading =
    (isAuthenticated && marketsQuery.isLoading) ||
    (isAuthenticated && battlesQuery.isLoading) ||
    (isAuthenticated && pkTopicsQuery.isLoading) ||
    (battleIds.length > 0 && battleDetailQueries.some((query) => query.isLoading));

  return {
    pendingItems,
    settledItems,
    pendingDarkItems,
    pendingArenaItems,
    pendingPkItems,
    settledDarkItems,
    settledArenaItems,
    pendingCount: pendingItems.length,
    marketList,
    battleDetails: battleDetailQueries.map((query) => query.data).filter(Boolean),
    isLoading,
    isAuthenticated,
  };
}

/** @deprecated 使用 useSettlementRecords */
export function usePendingSettlements() {
  const records = useSettlementRecords();
  return {
    items: records.pendingItems,
    darkItems: records.pendingDarkItems,
    arenaItems: records.pendingArenaItems,
    totalCount: records.pendingCount,
    isLoading: records.isLoading,
    isAuthenticated: records.isAuthenticated,
  };
}
