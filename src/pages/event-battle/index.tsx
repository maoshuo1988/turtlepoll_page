/**
 * 文件说明：暗盘撕裂带页面路由入口，根据 market 参数装配预测市场撕裂带。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import type { SidebarHotTopic } from '@/components/common/layout/sidebarHotTopics';
import { useHomeLayoutContext } from '@/layouts/context';
import { EventBattlePage } from './components/EventBattlePage';
import {
  mapMarketToPredictionCard,
  normalizePredictionCardItem,
  resolveDrawText,
  resolveDrawVoteCount,
  resolvePredictionCardImageFields,
  type PredictionCardItem,
} from '@/pages/home/components/predictionCards';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';

type EventBattleLocationState = {
  sidebarTopic?: SidebarHotTopic;
  openBattleNews?: PredictionCardItem;
  returnTo?: string;
};

function mapSidebarTopicToPredictionCard(topic?: SidebarHotTopic): PredictionCardItem | null {
  if (!topic?.context?.marketId) return null;

  return normalizePredictionCardItem({
    id: `market-${topic.context.marketId}`,
    marketId: topic.context.marketId,
    title: topic.context.eventName || topic.title,
    summary: topic.context.detail || '查看当前热点争议与讨论风向。',
    ...resolvePredictionCardImageFields(topic.context),
    votes: {
      A: topic.context.proVoteCount ?? 0,
      B: topic.context.conVoteCount ?? 0,
      C: resolveDrawVoteCount(topic.context),
    },
    optionA: topic.context.proText || '支持',
    optionB: topic.context.conText || '反对',
    optionDraw: resolveDrawText(topic.context),
    oddsA: 1.8,
    oddsB: 1.8,
    oddsDraw: 1.8,
    supportsDrawBet: false,
    status: 'open',
  });
}

export default function EventBattleRoutePage() {
  const [selectedBattleNews, setSelectedBattleNews] = useState<PredictionCardItem | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const searchParams = new URLSearchParams(location.search);
  const selectedTag = searchParams.get('tag');
  const selectedMarket = searchParams.get('market');
  const routeState = location.state as EventBattleLocationState | null;
  const sidebarTopic = routeState?.sidebarTopic;
  const routeStateBattleNews = routeState?.openBattleNews ?? null;
  const returnTo = routeState?.returnTo;
  const sidebarTopicItem = mapSidebarTopicToPredictionCard(sidebarTopic);

  const allFallbackItems: PredictionCardItem[] = [];
  const selectedMarketId = selectedMarket && Number.isFinite(Number(selectedMarket)) ? Number(selectedMarket) : null;

  const marketsQuery = useRequestFootballMarkets({ page: 1, limit: 100 });
  const marketCardFromApi = useMemo(() => {
    if (selectedMarketId === null) return null;
    const aggregate = (marketsQuery.data?.list ?? []).find((item) => item.market.id === selectedMarketId);
    return aggregate ? mapMarketToPredictionCard(aggregate) : null;
  }, [marketsQuery.data?.list, selectedMarketId]);

  const selectedPrediction = useMemo(() => {
    if (selectedMarketId !== null && marketCardFromApi) {
      return marketCardFromApi;
    }
    if (routeStateBattleNews) return routeStateBattleNews;
    if (!selectedMarket || selectedMarketId === null) return null;
    return (
      allFallbackItems.find(
        (item) =>
          item.marketId === selectedMarketId ||
          item.id === selectedMarket ||
          item.id === `market-${selectedMarket}`,
      ) ?? (sidebarTopicItem?.marketId === selectedMarketId ? sidebarTopicItem : null)
    );
  }, [
    allFallbackItems,
    marketCardFromApi,
    routeStateBattleNews,
    selectedMarket,
    selectedMarketId,
    sidebarTopicItem,
  ]);

  useEffect(() => {
    const raw = location.state as EventBattleLocationState | null;
    if (!raw?.openBattleNews) return;
    setSelectedBattleNews(raw.openBattleNews);
    navigate(`${location.pathname}${location.search || ''}`, {
      replace: true,
      state: {
        ...(raw.sidebarTopic ? { sidebarTopic: raw.sidebarTopic } : {}),
        ...(raw.returnTo ? { returnTo: raw.returnTo } : {}),
      },
    });
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!selectedPrediction) return;
    setSelectedBattleNews(selectedPrediction);
  }, [selectedPrediction]);

  const handleBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    const nextSearch = new URLSearchParams();
    if (selectedTag) nextSearch.set('tag', selectedTag);
    const nextUrl = nextSearch.toString() ? `/?${nextSearch.toString()}` : '/';
    navigate(nextUrl);
  }, [navigate, returnTo, selectedTag]);

  return (
    <EventBattlePage
      battleNews={selectedPrediction ?? selectedBattleNews}
      userSide={null}
      isLoading={marketsQuery.isLoading && !selectedPrediction}
      onBack={handleBack}
      onRequireAuth={onOpenAuth}
    />
  );
}
