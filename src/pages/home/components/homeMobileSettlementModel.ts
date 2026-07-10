/**
 * 文件说明：移动端首页待结算卡片数据映射（对齐 PC 结算抽屉数据源）。
 */
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import type { SettlementRecordItem } from '@/hooks/settlementTypes';
import type { SettlementRecords } from '@/hooks/usePendingSettlements';
import { mapMarketToPredictionCard, type PredictionCardItem } from './predictionCards';
import type { HomeMobileStatusFilter } from './HomeMobileStatusFilters';

export type HomeMobileSettlementCard = {
  record: SettlementRecordItem;
  market: FootballMarketAggregate | null;
  card: PredictionCardItem | null;
};

function buildMarketMap(marketList: FootballMarketAggregate[]) {
  return new Map(marketList.map((item) => [item.market.id, item]));
}

function dedupeSettlementCards(items: HomeMobileSettlementCard[]) {
  const seen = new Set<string>();
  const merged: HomeMobileSettlementCard[] = [];
  items.forEach((item) => {
    if (seen.has(item.record.id)) return;
    seen.add(item.record.id);
    merged.push(item);
  });
  return merged;
}

export function enrichSettlementRecord(
  record: SettlementRecordItem,
  marketMap: Map<number, FootballMarketAggregate>,
): HomeMobileSettlementCard {
  const market = record.marketId ? marketMap.get(record.marketId) ?? null : null;
  return {
    record,
    market,
    card: market ? mapMarketToPredictionCard(market) : null,
  };
}

export function listSettlementCards(
  settlement: Pick<SettlementRecords, 'pendingItems' | 'settledItems' | 'marketList'>,
  filter: HomeMobileStatusFilter,
): HomeMobileSettlementCard[] {
  const marketMap = buildMarketMap(settlement.marketList);
  const pending = settlement.pendingItems.map((record) => enrichSettlementRecord(record, marketMap));
  const settled = settlement.settledItems.map((record) => enrichSettlementRecord(record, marketMap));

  switch (filter) {
    case 'upcoming':
      return pending;
    case 'settled':
      return settled;
    case 'open':
      return pending.filter((item) => item.card?.status === 'open');
    case 'hot':
    default:
      return dedupeSettlementCards([...pending, ...settled]);
  }
}

export function countSettlementCards(
  settlement: Pick<SettlementRecords, 'pendingItems' | 'settledItems' | 'marketList'>,
  filter: HomeMobileStatusFilter,
) {
  return listSettlementCards(settlement, filter).length;
}

const FILTER_META: Record<
  HomeMobileStatusFilter,
  { title: string; emptyText: string }
> = {
  hot: { title: '我的全部结算', emptyText: '暂无结算相关事件' },
  open: { title: '我的进行中结算', emptyText: '暂无进行中的结算事件' },
  upcoming: { title: '我的待结算事件', emptyText: '暂无待结算事件，稍后再来看看' },
  settled: { title: '我的已结算事件', emptyText: '暂无已结算记录' },
};

export function resolveSettlementSectionMeta(filter: HomeMobileStatusFilter) {
  return FILTER_META[filter];
}

export function resolveSettlementSourceLabel(record: SettlementRecordItem) {
  return record.sourceTab === 'pk' ? '开撕台' : '暗盘事件';
}

export function resolveSettlementStatusLabel(item: HomeMobileSettlementCard) {
  if (item.record.status === 'settled') return '已结算';
  if (item.card?.status === 'open') return '进行中';
  if (item.card?.status === 'closed') return '封盘中';
  return item.record.subtitle || '待结算';
}

export function resolveSettlementCountdownLabel(item: HomeMobileSettlementCard) {
  if (item.record.status === 'pending') {
    return item.record.id.startsWith('tear-') ? '撕裂带奖励' : '可结算';
  }
  return '已结算';
}

export function resolveSettlementCtaLabel(
  record: SettlementRecordItem,
  card: PredictionCardItem | null = null,
) {
  if (record.id.startsWith('open-') || card?.status === 'open') return '去查看';
  return record.status === 'pending' ? '去结算' : '查看';
}

export function resolveBetAmount(market: FootballMarketAggregate | null) {
  if (!market) return 0;
  const raw = market as FootballMarketAggregate & {
    bet?: { amount?: number };
    myBet?: { amount?: number };
  };
  return raw.bet?.amount ?? raw.myBet?.amount ?? 0;
}

export function resolveBetOdds(market: FootballMarketAggregate | null) {
  if (!market) return 0;
  const raw = market as FootballMarketAggregate & {
    bet?: { odds?: number };
    myBet?: { odds?: number };
  };
  return raw.bet?.odds ?? raw.myBet?.odds ?? 0;
}

export function resolveExpectedPayout(market: FootballMarketAggregate | null, card: PredictionCardItem | null) {
  const amount = resolveBetAmount(market);
  const odds = resolveBetOdds(market);
  if (amount > 0 && odds > 0) return Math.round(amount * odds);
  if (card) return Math.max(0, Math.round(Math.max(card.oddsA, card.oddsB) * 100));
  return 0;
}

export function resolvePoolTotal(card: PredictionCardItem | null) {
  if (!card) return 0;
  return card.votes.A + card.votes.B + card.votes.C;
}

export function resolveSidePercents(card: PredictionCardItem | null) {
  if (!card) return { pctA: 50, pctB: 50 };
  const total = Math.max(1, card.votes.A + card.votes.B + card.votes.C);
  const pctA = Math.round((card.votes.A / total) * 100);
  return { pctA, pctB: Math.max(0, 100 - pctA) };
}

export function resolveDisplayOdds(market: FootballMarketAggregate | null, card: PredictionCardItem | null) {
  const betOdds = resolveBetOdds(market);
  if (betOdds > 0) return `${betOdds.toFixed(1)}x`;
  if (card) return `${Math.max(card.oddsA, card.oddsB).toFixed(1)}x`;
  return '--';
}

export function resolveExpectedReturnPct(market: FootballMarketAggregate | null, card: PredictionCardItem | null) {
  const odds = resolveBetOdds(market) || (card ? Math.max(card.oddsA, card.oddsB) : 0);
  if (odds <= 0) return 0;
  return Math.max(0, Math.round((odds - 1) * 100));
}
