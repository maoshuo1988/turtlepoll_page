/**
 * 文件说明：结算详情页数据组装（暗盘 / 开撕台）。
 */
import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { battleQueryKeys, fetchBattleDetail } from '@/hooks/useBattleRequests';
import { fetchPKTopic } from '@/hooks/usePkRequests';
import type { CoinSettleResult } from '@/hooks/coinTypes';
import type { PKSettleResponse } from '@/hooks/pkTypes';
import type {
  SettlementActionResult,
  SettlementDetailViewModel,
  SettlementRecordItem,
} from '@/hooks/settlementTypes';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import {
  buildBattleSettlementDetail,
  buildCoinSettlementDetail,
  buildPkSettlementDetail,
} from '@/components/common/settlement/settlementModel';

export function useSettlementDetailBuilder(marketList: FootballMarketAggregate[]) {
  const queryClient = useQueryClient();
  const userQuery = useRequestUserCurrent();
  const currentUserName = userQuery.data?.nickname || userQuery.data?.username || '我';

  const findMarketAggregate = useCallback(
    (marketId?: number) => marketList.find((item) => item.market.id === marketId),
    [marketList],
  );

  const buildDetailModel = useCallback(
    async (
      item: SettlementRecordItem,
      settlePayload?: CoinSettleResult | SettlementActionResult | PKSettleResponse | null,
    ): Promise<SettlementDetailViewModel> => {
      if (item.sourceTab === 'dark' && item.marketId) {
        const market = findMarketAggregate(item.marketId);
        if (!market) {
          throw new Error('未找到市场数据');
        }
        const participatedHeat = Boolean(
          (market.context?.participantCount ?? 0) > 0 && item.campSide !== 'unknown',
        );
        return buildCoinSettlementDetail({
          record: item,
          market,
          settleResult:
            settlePayload && ('list' in settlePayload || 'outcome' in settlePayload)
              ? (settlePayload as CoinSettleResult | SettlementActionResult)
              : null,
          currentUserName,
          participatedHeat,
        });
      }

      if (item.sourceTab === 'arena' && item.battleId) {
        const detail = await queryClient.fetchQuery({
          queryKey: battleQueryKeys.detail(item.battleId),
          queryFn: () => fetchBattleDetail(item.battleId),
          staleTime: 30_000,
        });
        const payout =
          settlePayload && 'payout' in settlePayload
            ? settlePayload.payout
            : detail.settlement.myItem?.payoutAmount ?? 0;
        return buildBattleSettlementDetail({
          record: item,
          detail,
          payout,
          currentUserName,
        });
      }

      if (item.sourceTab === 'pk' && item.topicId) {
        const topic = await fetchPKTopic({ topicId: item.topicId });
        const title = topic.topic?.title || item.title || `开撕话题 #${item.topicId}`;
        return buildPkSettlementDetail({
          record: { ...item, title },
          topic,
          settleResult:
            settlePayload && 'winner' in settlePayload
              ? (settlePayload as PKSettleResponse)
              : null,
          currentUserName,
        });
      }

      throw new Error('无法识别结算条目');
    },
    [currentUserName, findMarketAggregate, queryClient],
  );

  return { buildDetailModel, findMarketAggregate };
}
