/**
 * 文件说明：prediction Cards，预测市场和撕裂带页面组件。
 */
import { useMemo } from 'react';
import type { FootballMarketAggregate, PredictContext, PredictTearSettlement } from '@/hooks/predictionTypes';
import { pickFirstNonEmptyString, resolveAssetUrl } from '@/utils/assetUrl';
import {
  marketSupportsDrawBet,
  resolveMarketDrawBase,
  resolveMarketDrawPool,
} from '@/hooks/predictionTypes';
import { useRequestFootballMarkets, useRequestFootballMarketsByTag } from '@/hooks/usePredictionRequests';

export type PredictionCardType = 'politics' | 'tech' | 'sports' | 'entertainment' | 'finance';

export type PredictionBetOption = 'A' | 'B' | 'C';

export type PredictionCardItem = {
  id: string;
  marketId: number;
  title: string;
  summary: string;
  image: string;
  cover?: string;
  listImage?: string;
  sideABgImage?: string;
  sideBBgImage?: string;
  sideABgColor?: string;
  sideBBgColor?: string;
  votes: { A: number; B: number; C: number };
  optionA: string;
  optionB: string;
  optionDraw: string;
  oddsA: number;
  oddsB: number;
  oddsDraw: number;
  supportsDrawBet?: boolean;
  status: 'open' | 'closed' | 'settled';
  hasBet?: boolean;
  betSettleResult?: 'WIN' | 'LOSE' | string;
  tearSettlement?: PredictTearSettlement;
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

export const PREDICTION_CARD_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80';

function isLikelyImageUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  return (
    /^(https?:)?\/\//.test(trimmed) ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(trimmed)
  );
}

function resolveAggregateContext(item: FootballMarketAggregate) {
  const raw = item as FootballMarketAggregate & Record<string, unknown>;
  const nested = (raw.context ?? raw.predictContext ?? raw.predict_context ?? {}) as Record<string, unknown>;

  return {
    ...nested,
    eventName: pickFirstNonEmptyString(nested.eventName, nested.event_name, raw.eventName, raw.event_name),
    proText: pickFirstNonEmptyString(nested.proText, nested.pro_text, raw.proText, raw.pro_text),
    conText: pickFirstNonEmptyString(nested.conText, nested.con_text, raw.conText, raw.con_text),
    imageUrl: pickFirstNonEmptyString(nested.imageUrl, nested.image_url, raw.imageUrl, raw.image_url),
    listImage: pickFirstNonEmptyString(nested.listImage, nested.list_image, raw.listImage, raw.list_image),
    sideABgImage: pickFirstNonEmptyString(
      nested.sideABgImage,
      nested.side_a_bg_image,
      nested.sideABg_image,
      nested.proImage,
      nested.pro_image,
      nested.proBgImage,
      nested.pro_bg_image,
      nested.sideAAvatar,
      nested.side_a_avatar,
      nested.proAvatar,
      nested.pro_avatar,
      raw.sideABgImage,
      raw.side_a_bg_image,
    ),
    sideBBgImage: pickFirstNonEmptyString(
      nested.sideBBgImage,
      nested.side_b_bg_image,
      nested.sideBBg_image,
      nested.conImage,
      nested.con_image,
      nested.conBgImage,
      nested.con_bg_image,
      nested.sideBAvatar,
      nested.side_b_avatar,
      nested.conAvatar,
      nested.con_avatar,
      raw.sideBBgImage,
      raw.side_b_bg_image,
    ),
    sideABgColor: pickFirstNonEmptyString(nested.sideABgColor, nested.side_a_bg_color, raw.sideABgColor, raw.side_a_bg_color),
    sideBBgColor: pickFirstNonEmptyString(nested.sideBBgColor, nested.side_b_bg_color, raw.sideBBgColor, raw.side_b_bg_color),
  } as Partial<PredictContext> & Record<string, unknown>;
}

function resolvePredictContextMediaFields(context: Partial<PredictContext>) {
  const raw = context as Partial<PredictContext> & Record<string, unknown>;

  return {
    cover: pickFirstNonEmptyString(raw.imageUrl, raw.image_url),
    listImage: pickFirstNonEmptyString(raw.listImage, raw.list_image),
    sideABgImage: pickFirstNonEmptyString(
      raw.sideABgImage,
      raw.side_a_bg_image,
      raw.sideABg_image,
      raw.proImage,
      raw.pro_image,
      raw.proBgImage,
      raw.pro_bg_image,
      raw.sideAAvatar,
      raw.side_a_avatar,
      raw.proAvatar,
      raw.pro_avatar,
    ),
    sideBBgImage: pickFirstNonEmptyString(
      raw.sideBBgImage,
      raw.side_b_bg_image,
      raw.sideBBg_image,
      raw.conImage,
      raw.con_image,
      raw.conBgImage,
      raw.con_bg_image,
      raw.sideBAvatar,
      raw.side_b_avatar,
      raw.conAvatar,
      raw.con_avatar,
    ),
    sideABgColor: pickFirstNonEmptyString(raw.sideABgColor, raw.side_a_bg_color),
    sideBBgColor: pickFirstNonEmptyString(raw.sideBBgColor, raw.side_b_bg_color),
  };
}

export function resolvePredictionCardImageFields(context: Partial<PredictContext>) {
  const fields = resolvePredictContextMediaFields(context);
  const cover = fields.cover && isLikelyImageUrl(fields.cover) ? resolveAssetUrl(fields.cover) : undefined;
  const listImage = fields.listImage && isLikelyImageUrl(fields.listImage) ? resolveAssetUrl(fields.listImage) : undefined;
  const sideABgRaw = fields.sideABgImage && isLikelyImageUrl(fields.sideABgImage) ? fields.sideABgImage : undefined;
  const sideBBgRaw = fields.sideBBgImage && isLikelyImageUrl(fields.sideBBgImage) ? fields.sideBBgImage : undefined;
  const sideABgImage = sideABgRaw ? resolveAssetUrl(sideABgRaw) : undefined;
  const sideBBgImage = sideBBgRaw ? resolveAssetUrl(sideBBgRaw) : undefined;
  const coverImage = cover || listImage;

  return {
    cover,
    listImage,
    sideABgImage,
    sideBBgImage,
    sideABgColor: fields.sideABgColor,
    sideBBgColor: fields.sideBBgColor,
    image: coverImage || PREDICTION_CARD_FALLBACK_IMAGE,
  };
}

export { marketSupportsDrawBet } from '@/hooks/predictionTypes';

export function resolveDrawText(context: Partial<PredictContext>) {
  return context.drawText?.trim() || context.neutralText?.trim() || context.tieText?.trim() || '平局';
}

export function resolveDrawVoteCount(context: Partial<PredictContext>) {
  if (typeof context.drawVoteCount === 'number') return context.drawVoteCount;
  if (typeof context.neutralVoteCount === 'number') return context.neutralVoteCount;
  return 0;
}

export function normalizePredictionCardItem(
  item: Partial<PredictionCardItem> & Pick<PredictionCardItem, 'id' | 'marketId' | 'title' | 'summary' | 'image' | 'status'>,
): PredictionCardItem {
  const votesA = item.votes?.A ?? 0;
  const votesB = item.votes?.B ?? 0;
  const votesC = item.votes?.C ?? 0;
  const oddsA = Number.isFinite(item.oddsA) ? Number(item.oddsA) : 1.8;
  const oddsB = Number.isFinite(item.oddsB) ? Number(item.oddsB) : 1.8;
  const oddsDraw = Number.isFinite(item.oddsDraw)
    ? Number(item.oddsDraw)
    : Number(((oddsA + oddsB) / 2).toFixed(1));

  return {
    ...item,
    votes: { A: votesA, B: votesB, C: votesC },
    optionA: item.optionA || '正方',
    optionB: item.optionB || '反方',
    optionDraw: item.optionDraw?.trim() || '平局',
    oddsA,
    oddsB,
    oddsDraw,
    supportsDrawBet: item.supportsDrawBet ?? false,
  } as PredictionCardItem;
}

export function calcPredictionMarketOdds(item: FootballMarketAggregate) {
  const context = item.context ?? {};
  const supportsDraw = marketSupportsDrawBet(item.market);
  const votesA = context.proVoteCount ?? 0;
  const votesB = context.conVoteCount ?? 0;
  const votesC = supportsDraw ? resolveDrawVoteCount(context) : 0;
  const poolA = item.market.poolA ?? votesA;
  const poolB = item.market.poolB ?? votesB;
  const poolDraw = supportsDraw ? resolveMarketDrawPool(item.market, votesC) : 0;
  const baseA = item.market.baseA ?? 500;
  const baseB = item.market.baseB ?? 500;
  const baseDraw = supportsDraw ? resolveMarketDrawBase(item.market) : 0;
  const effectiveA = Math.max(1, baseA + poolA);
  const effectiveB = Math.max(1, baseB + poolB);
  const effectiveDraw = supportsDraw ? Math.max(1, baseDraw + poolDraw) : 1;
  const total = supportsDraw ? effectiveA + effectiveB + effectiveDraw : effectiveA + effectiveB;
  const clampOdds = (value: number) => Number((Math.max(1.2, Math.min(5, value))).toFixed(1));

  return {
    votesA,
    votesB,
    votesC,
    oddsA: clampOdds(total / effectiveA),
    oddsB: clampOdds(total / effectiveB),
    oddsDraw: supportsDraw ? clampOdds(total / effectiveDraw) : 0,
  };
}

export function getPredictionOptionLabel(item: Pick<PredictionCardItem, 'optionA' | 'optionB' | 'optionDraw'>, option: PredictionBetOption) {
  if (option === 'A') return item.optionA;
  if (option === 'B') return item.optionB;
  return item.optionDraw;
}

export function getPredictionOptionOdds(item: Pick<PredictionCardItem, 'oddsA' | 'oddsB' | 'oddsDraw'>, option: PredictionBetOption) {
  if (option === 'A') return item.oddsA;
  if (option === 'B') return item.oddsB;
  return item.oddsDraw;
}

export function mapMarketToPredictionCard(item: FootballMarketAggregate): PredictionCardItem {
  const marketId = item.market.id;
  const context = resolveAggregateContext(item);
  const optionA = context.proText || '正方';
  const optionB = context.conText || '反方';
  const { votesA, votesB, votesC, oddsA, oddsB, oddsDraw } = calcPredictionMarketOdds(item);
  return normalizePredictionCardItem({
    id: `market-${marketId}`,
    marketId,
    title: context.eventName || item.market.title || `预测市场 #${marketId}`,
    summary: context.detail || item.market.title || '查看当前预测双方观点与热度变化。',
    ...resolvePredictionCardImageFields(context),
    votes: { A: votesA, B: votesB, C: votesC },
    optionA,
    optionB,
    optionDraw: resolveDrawText(context),
    oddsA,
    oddsB,
    oddsDraw,
    supportsDrawBet: marketSupportsDrawBet(item.market),
    status:
      item.market.status === 'OPEN'
        ? 'open'
        : item.market.status === 'SETTLED'
          ? 'settled'
          : 'closed',
    hasBet: item.hasBet ?? false,
    betSettleResult: item.betSettleResult,
    tearSettlement: item.tearSettlement,
    closeTime: item.market.closeTime,
  });
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
