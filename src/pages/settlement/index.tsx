/**
 * 文件说明：结算详情页路由入口，负责领取结算与详情展示。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from '@umijs/renderer-react';
import { createBattleRequestId } from '@/hooks/battleTypes';
import type { CoinSettleResult } from '@/hooks/coinTypes';
import type { SettlementActionResult, SettlementDetailViewModel, SettlementRecordItem } from '@/hooks/settlementTypes';
import { useSettlementRecords } from '@/hooks/usePendingSettlements';
import { useRequestBattleWithdraw } from '@/hooks/useBattleRequests';
import { useRequestCoinSettle } from '@/hooks/useCoinRequests';
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
  marketList: ReturnType<typeof useSettlementRecords>['marketList'],
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
  const { marketList } = useSettlementRecords();
  const { buildDetailModel } = useSettlementDetailBuilder(marketList);
  const coinSettleMutation = useRequestCoinSettle();
  const battleWithdrawMutation = useRequestBattleWithdraw();

  const kind = params.kind;
  const rawId = params.id ?? '';
  const numericId = Number(rawId);
  const action = (searchParams.get('action') as SettlementDetailAction | null) ?? 'view';

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
        campSide: resolveCampSideFromMarket(marketList, numericId),
        marketId: numericId,
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
  }, [action, kind, marketList, numericId, rawId]);

  const [model, setModel] = useState<SettlementDetailViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | undefined>();
  const [settledItemId, setSettledItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!record) {
      setLoading(false);
      setErrorText('无效的结算链接');
      return;
    }

    if (!requireAuthOrOpen(onOpenAuth)) {
      setLoading(false);
      setErrorText('请先登录后查看结算详情');
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErrorText(undefined);
      setModel(null);

      try {
        let settlePayload: CoinSettleResult | SettlementActionResult | null = null;

        if (action === 'settle' && record.status === 'pending') {
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
          }
          if (!cancelled) {
            setSettledItemId(record.id);
          }
        }

        const nextModel = await buildDetailModel(
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
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    action,
    battleWithdrawMutation.mutateAsync,
    buildDetailModel,
    coinSettleMutation.mutateAsync,
    onOpenAuth,
    record,
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
