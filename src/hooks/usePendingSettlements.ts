/**
 * 文件说明：右上角待结算抽屉数据聚合。
 * 仅使用 GET /api/predict/my/markets（暗盘）与 GET /api/pk/my/bets（开撕台 PK）。
 */
import { useCallback, useMemo } from 'react';
import { getAuthToken } from '@/utils/authStorage';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestPredictMyMarkets } from '@/hooks/usePredictionRequests';
import { useRequestPKMyBets } from '@/hooks/usePkRequests';
import type { PKMyBetRecord } from '@/hooks/pkTypes';
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

  const marketStatus = String(market.status ?? '').toUpperCase();
  const isPending = !item.betSettleResult;
  if (status === 'pending' && !isPending) return null;
  if (status === 'settled' && isPending) return null;

  if (status === 'pending') {
    if (!['CLOSED', 'CLOSE', 'SETTLED'].includes(marketStatus)) return null;
  } else if (marketStatus !== 'SETTLED') {
    return null;
  }

  const marketId = market.id;
  const title = item.context?.eventName || market.title || `预测市场 #${marketId}`;
  const pendingSubtitle =
    marketStatus === 'SETTLED' ? '已结束 · 赛果已出' : '已结束 · 待结算';

  return {
    id: `coin-${marketId}`,
    status,
    sourceTab: 'dark',
    title,
    subtitle: status === 'pending' ? pendingSubtitle : '已结算',
    campSide: resolveMarketBetSide(item),
    marketId,
  };
}

function mapTearRecord(item: FootballMarketAggregate): SettlementRecordItem | null {
  const tear = item.tearSettlement;
  if (!tear?.canSettle || !item.market?.id) return null;
  if (String(item.market.status ?? '').toUpperCase() !== 'SETTLED') return null;

  const marketId = item.market.id;
  const title = item.context?.eventName || item.market.title || `预测市场 #${marketId}`;

  return {
    id: `tear-${marketId}`,
    status: 'pending',
    sourceTab: 'dark',
    title,
    subtitle: '撕裂带奖励可领取',
    campSide: resolveMarketBetSide(item),
    marketId,
  };
}

function resolvePkBetSide(record: PKMyBetRecord): SettlementCampSide {
  const side = record.bet?.side;
  if (side === 'A') return 'A';
  if (side === 'B') return 'B';
  return 'unknown';
}

function mapPkBetRecord(
  record: PKMyBetRecord,
  drawerStatus: 'pending' | 'settled',
): SettlementRecordItem | null {
  const topicId = Number(record.topic?.id ?? record.bet?.topicId ?? record.battle?.topicId);
  const roundId = record.round?.id ?? record.bet?.roundId ?? record.battle?.id;
  if (!Number.isFinite(topicId) || topicId <= 0) return null;
  if (!record.bet?.id && !record.bet?.amount) return null;

  const title = record.topic?.title || record.battle?.topic?.title || `开撕话题 #${topicId}`;

  return {
    id: `pk-${topicId}-${roundId ?? '0'}`,
    status: drawerStatus,
    sourceTab: 'pk',
    title,
    subtitle: drawerStatus === 'pending' ? '回合已结束 · 可结算' : '已结算',
    campSide: resolvePkBetSide(record),
    topicId,
    roundId,
  };
}

export function useSettlementRecords() {
  const isAuthenticated = Boolean(getAuthToken());

  const myMarketsOpenQuery = useRequestPredictMyMarkets({
    page: 1,
    limit: 100,
    status: 'OPEN',
    enabled: isAuthenticated,
  });
  const myMarketsPendingQuery = useRequestPredictMyMarkets({
    page: 1,
    limit: 100,
    status: 'pending',
    enabled: isAuthenticated,
  });
  const myMarketsSettledQuery = useRequestPredictMyMarkets({
    page: 1,
    limit: 100,
    status: 'settled',
    enabled: isAuthenticated,
  });
  const pkPendingBetsQuery = useRequestPKMyBets({
    page: 1,
    pageSize: 50,
    status: 'pending',
    enabled: isAuthenticated,
  });
  const pkSettledBetsQuery = useRequestPKMyBets({
    page: 1,
    pageSize: 50,
    status: 'settled',
    enabled: isAuthenticated,
  });

  const openMarketList = myMarketsOpenQuery.data?.list ?? [];
  const pendingMarketList = myMarketsPendingQuery.data?.list ?? [];
  const settledMarketList = myMarketsSettledQuery.data?.list ?? [];

  const marketList = useMemo(() => {
    const merged = new Map<number, FootballMarketAggregate>();
    [...openMarketList, ...pendingMarketList, ...settledMarketList].forEach((item) => {
      if (item.market?.id) merged.set(item.market.id, item);
    });
    return Array.from(merged.values());
  }, [openMarketList, pendingMarketList, settledMarketList]);

  const pendingItems = useMemo(() => {
    const coinItemsFromPending = pendingMarketList
      .map((item) => mapCoinRecord(item, 'pending'))
      .filter((item): item is SettlementRecordItem => Boolean(item));
    const coinItemsFromSettled = settledMarketList
      .map((item) => mapCoinRecord(item, 'pending'))
      .filter((item): item is SettlementRecordItem => Boolean(item));
    const dedupedCoinItems = Array.from(
      new Map(
        [...coinItemsFromPending, ...coinItemsFromSettled].map((item) => [item.id, item]),
      ).values(),
    );

    const pkItems = (pkPendingBetsQuery.data?.list ?? [])
      .map((item) => mapPkBetRecord(item, 'pending'))
      .filter((item): item is SettlementRecordItem => Boolean(item));

    const tearItems = settledMarketList
      .map(mapTearRecord)
      .filter((item): item is SettlementRecordItem => Boolean(item));

    return [...dedupedCoinItems, ...pkItems, ...tearItems];
  }, [pendingMarketList, settledMarketList, pkPendingBetsQuery.data?.list]);

  const settledItems = useMemo(() => {
    const coinItems = settledMarketList
      .map((item) => mapCoinRecord(item, 'settled'))
      .filter((item): item is SettlementRecordItem => Boolean(item));

    const pkItems = (pkSettledBetsQuery.data?.list ?? [])
      .map((item) => mapPkBetRecord(item, 'settled'))
      .filter((item): item is SettlementRecordItem => Boolean(item));

    return [...coinItems, ...pkItems];
  }, [pkSettledBetsQuery.data?.list, settledMarketList]);

  const pendingDarkItems = useMemo(
    () => pendingItems.filter((item) => item.sourceTab === 'dark'),
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
  const settledPkItems = useMemo(
    () => settledItems.filter((item) => item.sourceTab === 'pk'),
    [settledItems],
  );

  const refetch = useCallback(async () => {
    if (!isAuthenticated) return;
    await Promise.all([
      myMarketsOpenQuery.refetch(),
      myMarketsPendingQuery.refetch(),
      myMarketsSettledQuery.refetch(),
      pkPendingBetsQuery.refetch(),
      pkSettledBetsQuery.refetch(),
    ]);
  }, [
    isAuthenticated,
    myMarketsOpenQuery,
    myMarketsPendingQuery,
    myMarketsSettledQuery,
    pkPendingBetsQuery,
    pkSettledBetsQuery,
  ]);

  const isLoading =
    (isAuthenticated && myMarketsOpenQuery.isLoading) ||
    (isAuthenticated && myMarketsPendingQuery.isLoading) ||
    (isAuthenticated && myMarketsSettledQuery.isLoading) ||
    (isAuthenticated && pkPendingBetsQuery.isLoading) ||
    (isAuthenticated && pkSettledBetsQuery.isLoading);

  return {
    pendingItems,
    settledItems,
    pendingDarkItems,
    pendingPkItems,
    settledDarkItems,
    settledPkItems,
    pendingCount: pendingItems.length,
    marketList,
    refetch,
    isLoading,
    isAuthenticated,
  };
}

export type SettlementRecords = ReturnType<typeof useSettlementRecords>;

/** @deprecated 使用 useSettlementRecords */
export function usePendingSettlements() {
  const records = useSettlementRecords();
  return {
    items: records.pendingItems,
    darkItems: records.pendingDarkItems,
    arenaItems: records.pendingPkItems,
    totalCount: records.pendingCount,
    isLoading: records.isLoading,
    isAuthenticated: records.isAuthenticated,
  };
}
