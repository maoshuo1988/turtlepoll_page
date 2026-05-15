/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useState } from 'react';
import { useEffect } from 'react';
import { useLocation } from '@umijs/renderer-react';
import { useHomeLayoutContext } from '@/layouts/context';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import type { SidebarHotTopic } from '@/components/shared/layout';
import { heroNews, mockNews } from '@/data/mockData';
import { HomePageView } from './components/HomePageView';
import { usePredictionCardItems, type PredictionCardItem } from './components/predictionCards';

type HomeLocationState = {
  sidebarTopic?: SidebarHotTopic;
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

export default function HomePage() {
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [selectedBattleNews, setSelectedBattleNews] = useState<PredictionCardItem | null>(null);
  const location = useLocation();
  const { onOpenAuth } = useHomeLayoutContext();
  const searchParams = new URLSearchParams(location.search);
  const selectedTag = searchParams.get('tag');
  const selectedMarket = searchParams.get('market');
  const sidebarTopic = (location.state as HomeLocationState | null)?.sidebarTopic;
  const sidebarTopicItem = mapSidebarTopicToPredictionCard(sidebarTopic);
  const { allItems } = usePredictionCardItems(selectedTag);

  useEffect(() => {
    if (selectedMarket) {
      setSelectedBattleNews(null);
    }
  }, [selectedMarket]);

  const handlePredictionBetSuccess = useCallback((item: PredictionCardItem, option: 'A' | 'B', _result: PlaceBetResult) => {
    setUserVotes((prev) => ({ ...prev, [item.id]: option }));
  }, []);

  const allFallbackItems = [heroNews, ...mockNews] as PredictionCardItem[];
  const selectedMarketId = selectedMarket ? Number(selectedMarket) : null;
  const selectedPrediction = selectedMarket
    ? allItems.find((item) => item.marketId === selectedMarketId || item.id === selectedMarket || item.id === `market-${selectedMarket}`)
      ?? allFallbackItems.find((item) => item.marketId === selectedMarketId || item.id === selectedMarket || item.id === `market-${selectedMarket}`)
      ?? (sidebarTopicItem?.marketId === selectedMarketId ? sidebarTopicItem : null)
    : null;
  const battleNews = selectedBattleNews;

  const handleBattleBack = useCallback(() => {
    setSelectedBattleNews(null);
  }, []);

  return (
    <HomePageView
      battleNews={battleNews}
      userSide={battleNews ? (userVotes[battleNews.id] ?? null) : null}
      selectedTag={selectedTag}
      selectedPrediction={selectedPrediction}
      onBattleBack={handleBattleBack}
      onPredictionBetSuccess={handlePredictionBetSuccess}
      onRequireAuth={onOpenAuth}
      onEnterBattle={setSelectedBattleNews}
    />
  );
}
