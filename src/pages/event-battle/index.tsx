/**
 * 文件说明：event-battle 页面路由入口，负责根据 market 参数装配真实撕裂带页面。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import type { SidebarHotTopic } from '@/components/common/layout/sidebarHotTopics';
import { useHomeLayoutContext } from '@/layouts/context';
import { heroNews, mockNews } from '@/data/mockData';
import { EventBattlePage } from './components/EventBattlePage';
import type { PredictionCardItem } from '@/pages/home/components/predictionCards';

type EventBattleLocationState = {
  sidebarTopic?: SidebarHotTopic;
  openBattleNews?: PredictionCardItem;
  returnTo?: string;
};

function mapSidebarTopicToPredictionCard(topic?: SidebarHotTopic): PredictionCardItem | null {
  if (!topic?.context?.marketId) return null;

  return {
    id: `market-${topic.context.marketId}`,
    marketId: topic.context.marketId,
    title: topic.context.eventName || topic.title,
    summary: topic.context.detail || '查看当前热点争议与讨论风向。',
    image: topic.context.imageUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    votes: {
      A: topic.context.proVoteCount ?? 0,
      B: topic.context.conVoteCount ?? 0,
    },
    optionA: topic.context.proText || '支持',
    optionB: topic.context.conText || '反对',
    oddsA: 1.8,
    oddsB: 1.8,
    status: 'open',
  };
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

  const allFallbackItems = [heroNews, ...mockNews] as PredictionCardItem[];
  const selectedMarketId = selectedMarket && Number.isFinite(Number(selectedMarket)) ? Number(selectedMarket) : null;

  const selectedPrediction = useMemo(() => {
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
      isLoading={false}
      onBack={handleBack}
      onRequireAuth={onOpenAuth}
    />
  );
}
