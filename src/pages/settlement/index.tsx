/**
 * 文件说明：结算详情页路由入口，负责领取结算与详情展示。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from '@umijs/renderer-react';
import { createBattleRequestId } from '@/hooks/battleTypes';
import type { CoinSettleResult } from '@/hooks/coinTypes';
import type { PKSettleResponse } from '@/hooks/pkTypes';
import type { SettlementActionResult, SettlementDetailViewModel, SettlementRecordItem } from '@/hooks/settlementTypes';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestPredictMyMarkets } from '@/hooks/usePredictionRequests';
import { useRequestBattleWithdraw } from '@/hooks/useBattleRequests';
import { useRequestCoinSettle } from '@/hooks/useCoinRequests';
import { useRequestPKSettle } from '@/hooks/usePkRequests';
import { useSettlementDetailBuilder } from '@/hooks/useSettlementDetail';
import { useSettlementLayout } from '@/layouts/context/SettlementLayoutContext';
import { requireAuthOrOpen } from '@/utils/authStorage';
import { useHomeLayoutContext } from '@/layouts/context';
import { SettlementDetailPage } from './components/SettlementDetailPage';
import {
  settlementItemIdFromRoute,
  type SettlementDetailAction,
  type SettlementRouteKind,
} from './settlementNavigation';

function resolveCampSideFromMarket(
  marketList: { market: { id: number } }[],
  marketId: number,
): SettlementRecordItem['campSide'] {
  const item = marketList.find((entry) => entry.market.id === marketId);
  if (!item) return 'unknown';
  const raw = item as typeof item & { bet?: { option?: string }; myBet?: { option?: string } };
  const option = String(raw.bet?.option ?? raw.myBet?.option ?? '').trim().toUpperCase();
  if (option === 'A') return 'A';
  if (option === 'B') return 'B';
  if (option === 'DRAW' || option === 'C') return 'draw';
  return 'unknown';
}

export default function SettlementPage() {
  const navigate = useNavigate();
  const params = useParams<{ kind: SettlementRouteKind; id: string }>();
  const [searchParams] = useSearchParams();
  const { onOpenAuth } = useHomeLayoutContext();
  const { openSettlementDrawer, hideSettlementItem } = useSettlementLayout();
  const kind = params.kind;
  const myMarketsPendingQuery = useRequestPredictMyMarkets({
    page: 1,
    limit: 100,
    status: 'pending',
    enabled: kind === 'coin',
  });
  const myMarketsSettledQuery = useRequestPredictMyMarkets({
    page: 1,
    limit: 100,
    status: 'settled',
    enabled: kind === 'coin',
  });
  const marketList = useMemo(() => {
    if (kind !== 'coin') return [];
    const merged = new Map<number, FootballMarketAggregate>();
    [...(myMarketsPendingQuery.data?.list ?? []), ...(myMarketsSettledQuery.data?.list ?? [])].forEach(
      (item) => {
        if (item.market?.id) merged.set(item.market.id, item);
      },
    );
    return Array.from(merged.values());
  }, [kind, myMarketsPendingQuery.data?.list, myMarketsSettledQuery.data?.list]);
  const { buildDetailModel } = useSettlementDetailBuilder(marketList);
  const buildDetailModelRef = useRef(buildDetailModel);
  buildDetailModelRef.current = buildDetailModel;
  const coinSettleMutation = useRequestCoinSettle();
  const battleWithdrawMutation = useRequestBattleWithdraw();
  const pkSettleMutation = useRequestPKSettle();

  const rawId = params.id ?? '';
  const numericId = Number(rawId);
  const action = (searchParams.get('action') as SettlementDetailAction | null) ?? 'view';
  const roundIdParam = searchParams.get('roundId') ?? undefined;

  const coinCampSide = useMemo(
    () => (kind === 'coin' ? resolveCampSideFromMarket(marketList, numericId) : 'unknown' as const),
    [kind, marketList, numericId],
  );

  const record = useMemo<SettlementRecordItem | null>(() => {
    if (!kind || !Number.isFinite(numericId) || numericId <= 0) return null;
    const id = settlementItemIdFromRoute(kind, rawId);
    if (kind === 'coin') {
      return {
        id,
        status: action === 'settle' ? 'pending' : 'settled',
        sourceTab: 'dark',
        title: '',
        subtitle: '',
        campSide: coinCampSide,
        marketId: numericId,
      };
    }
    if (kind === 'pk') {
      const campSide: SettlementRecordItem['campSide'] = 'unknown';
      return {
        id: roundIdParam ? `pk-${numericId}-${roundIdParam}` : settlementItemIdFromRoute(kind, rawId),
        status: action === 'settle' ? 'pending' : 'settled',
        sourceTab: 'pk',
        title: '',
        subtitle: '',
        campSide,
        topicId: numericId,
        roundId: roundIdParam ?? undefined,
      };
    }
    return {
      id,
      status: action === 'settle' ? 'pending' : 'settled',
      sourceTab: 'arena',
      title: '',
      subtitle: '',
      campSide: 'unknown',
      battleId: numericId,
    };
  }, [action, coinCampSide, kind, numericId, rawId, roundIdParam]);

  const [model, setModel] = useState<SettlementDetailViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | undefined>();
  const [settledItemId, setSettledItemId] = useState<string | null>(null);
  const settleRequestedRef = useRef<string | null>(null);
  const inflightRouteKeyRef = useRef<string | null>(null);
  const onOpenAuthRef = useRef(onOpenAuth);
  onOpenAuthRef.current = onOpenAuth;

  useEffect(() => {
    settleRequestedRef.current = null;
    inflightRouteKeyRef.current = null;
  }, [action, kind, rawId]);

  useEffect(() => {
    if (!record) {
      setLoading(false);
      setErrorText('无效的结算链接');
      return;
    }

    const routeKey = `${kind ?? ''}-${rawId}-${action}`;
    if (inflightRouteKeyRef.current === routeKey) {
      return;
    }

    if (!requireAuthOrOpen(onOpenAuthRef.current)) {
      setLoading(false);
      setErrorText('请先登录后查看结算详情');
      return;
    }

    inflightRouteKeyRef.current = routeKey;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErrorText(undefined);
      setModel(null);

      try {
        let settlePayload: CoinSettleResult | SettlementActionResult | PKSettleResponse | null = null;
        const shouldSettle = action === 'settle' && record.status === 'pending';

        if (shouldSettle && settleRequestedRef.current !== routeKey) {
          settleRequestedRef.current = routeKey;
          if (record.sourceTab === 'dark' && record.marketId) {
            settlePayload = await coinSettleMutation.mutateAsync({ marketId: record.marketId });
          } else if (record.sourceTab === 'arena' && record.battleId) {
            const withdrawResult = await battleWithdrawMutation.mutateAsync({
              battleId: record.battleId,
              requestId: createBattleRequestId(`battle-withdraw-${record.battleId}`),
            });
            const payout = withdrawResult.payoutAmount ?? 0;
            settlePayload = {
              payout,
              outcome: payout > 0 ? 'win' : 'neutral',
              message: '奖励已提取到你的龟币账户。',
            };
          } else if (record.sourceTab === 'pk' && record.topicId) {
            settlePayload = await pkSettleMutation.mutateAsync({
              topicId: record.topicId,
              roundId: record.roundId,
              requestId: `pk-settle-${record.topicId}-${record.roundId ?? 'latest'}-${Date.now()}`,
              snapshotType: 'SETTLE',
              freezeSource: 'ON_DEMAND',
            });
          }
          if (!cancelled) {
            setSettledItemId(record.id);
          }
        }

        const nextModel = await buildDetailModelRef.current(
          { ...record, status: 'settled' },
          settlePayload,
        );
        if (!cancelled) {
          setModel(nextModel);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '加载结算详情失败';
          setErrorText(message);
          setModel(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        if (inflightRouteKeyRef.current === routeKey) {
          inflightRouteKeyRef.current = null;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (inflightRouteKeyRef.current === routeKey) {
        inflightRouteKeyRef.current = null;
      }
    };
  }, [
    action,
    kind,
    rawId,
    record?.battleId,
    record?.id,
    record?.marketId,
    record?.sourceTab,
    record?.status,
    record?.topicId,
    record?.roundId,
  ]);

  const handleBack = () => {
    if (settledItemId) {
      hideSettlementItem(settledItemId);
    }
    openSettlementDrawer();
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <SettlementDetailPage
      model={model}
      loading={loading}
      errorText={errorText}
      onBack={handleBack}
    />
  );
}
