/**
 * 文件说明：prediction Cards，预测市场和撕裂带页面组件。
 */
import { useMemo } from 'react';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestFootballMarkets, useRequestFootballMarketsByTag } from '@/hooks/usePredictionRequests';

export type PredictionCardType = 'politics' | 'tech' | 'sports' | 'entertainment' | 'finance';

export type PredictionCardItem = {
  id: string;
  marketId: number;
  title: string;
  summary: string;
  image: string;
  votes: { A: number; B: number };
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  status: 'open' | 'closed' | 'settled';
  hasBet?: boolean;
  betSettleResult?: 'WIN' | 'LOSE' | string;
  closeTime?: number;
};

export const PREDICTION_TYPE_LABELS: Record<PredictionCardType, string> = {
  politics: '时政',
  tech: '科技',
  sports: '体育',
  entertainment: '娱乐',
  finance: '财经',
};

export const PREDICTION_TYPE_COLORS: Record<PredictionCardType, string> = {
  politics: 'bg-red-100/70 text-red-600',
  tech: 'bg-blue-100/70 text-blue-600',
  sports: 'bg-green-100/70 text-green-600',
  entertainment: 'bg-purple-100/70 text-purple-600',
  finance: 'bg-amber-100/70 text-amber-700',
};

export function mapMarketToPredictionCard(item: FootballMarketAggregate): PredictionCardItem {
  const marketId = item.market.id;
  const context = item.context ?? {};
  const votesA = context.proVoteCount ?? 0;
  const votesB = context.conVoteCount ?? 0;
  const poolA = item.market.poolA ?? votesA;
  const poolB = item.market.poolB ?? votesB;
  const baseA = item.market.baseA ?? 500;
  const baseB = item.market.baseB ?? 500;
  const effectiveA = Math.max(1, baseA + poolA);
  const effectiveB = Math.max(1, baseB + poolB);
  const total = effectiveA + effectiveB;
  const oddsA = Number((Math.max(1.2, Math.min(5, total / effectiveA))).toFixed(1));
  const oddsB = Number((Math.max(1.2, Math.min(5, total / effectiveB))).toFixed(1));

  return {
    id: `market-${marketId}`,
    marketId,
    title: context.eventName || item.market.title || `预测市场 #${marketId}`,
    summary: context.detail || item.market.title || '查看当前预测双方观点与热度变化。',
    image: context.imageUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    votes: { A: votesA, B: votesB },
    optionA: context.proText || '正方',
    optionB: context.conText || '反方',
    oddsA,
    oddsB,
    status:
      item.market.status === 'OPEN'
        ? 'open'
        : item.market.status === 'SETTLED'
          ? 'settled'
          : 'closed',
    hasBet: item.hasBet ?? false,
    betSettleResult: item.betSettleResult,
    closeTime: item.market.closeTime,
  };
}

export function usePredictionCardItems(selectedTag: string | null) {
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20, requireAuth: false });
  const footballMarketsByTag = useRequestFootballMarketsByTag({
    tag: selectedTag ?? undefined,
    page: 1,
    limit: 20,
    requireAuth: false,
  });

  return useMemo(() => {
    if (selectedTag) {
      const taggedList = footballMarketsByTag.data?.list ?? [];
      const taggedItems = Array.isArray(taggedList) ? taggedList.map(mapMarketToPredictionCard) : [];
      return {
        heroItem: taggedItems[0] ?? null,
        feedItems: taggedItems.slice(1),
        allItems: taggedItems,
      };
    }

    const list = footballMarkets.data?.list ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return {
        heroItem: null,
        feedItems: [],
        allItems: [],
      };
    }

    const items = list.map(mapMarketToPredictionCard);
    return {
      heroItem: items[0] ?? null,
      feedItems: items.slice(1),
      allItems: items,
    };
  }, [footballMarkets.data, footballMarketsByTag.data, selectedTag]);
}
