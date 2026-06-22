/**
 * 文件说明：结算详情页数据组装（暗盘 / 开撕台）。
 */
import { useCallback } from 'react';
import { fetchBattleDetail } from '@/hooks/useBattleRequests';
import type { CoinSettleResult } from '@/hooks/coinTypes';
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
} from '@/components/common/settlement/settlementModel';

export function useSettlementDetailBuilder(marketList: FootballMarketAggregate[]) {
  const userQuery = useRequestUserCurrent();
  const currentUserName = userQuery.data?.nickname || userQuery.data?.username || '我';

  const findMarketAggregate = useCallback(
    (marketId?: number) => marketList.find((item) => item.market.id === marketId),
    [marketList],
  );

  const buildDetailModel = useCallback(
    async (
      item: SettlementRecordItem,
      settlePayload?: CoinSettleResult | SettlementActionResult | null,
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
          settleResult: settlePayload ?? null,
          currentUserName,
          participatedHeat,
        });
      }

      if (item.sourceTab === 'arena' && item.battleId) {
        const detail = await fetchBattleDetail(item.battleId);
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

      throw new Error('无法识别结算条目');
    },
    [currentUserName, findMarketAggregate],
  );

  return { buildDetailModel, findMarketAggregate };
}
