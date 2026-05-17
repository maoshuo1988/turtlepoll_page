/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { useHomeLayoutContext } from '@/layouts/context';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import type { SidebarHotTopic } from '@/components/shared/layout';
import { useRequestFootballMarketsByTag } from '@/hooks/usePredictionRequests';
import { heroNews, mockNews } from '@/data/mockData';
import { HomePageView } from './components/HomePageView';
import {
  mapMarketToPredictionCard,
  usePredictionCardItems,
  type PredictionCardItem,
} from './components/predictionCards';

/** deep link ?market= ：世界杯等走 football 标签，与首页默认列表可能不是同一批 */
const FOOTBALL_TAG_DEEP_LINK_LIMIT = 100;

type HomeLocationState = {
  sidebarTopic?: SidebarHotTopic;
  openBattleNews?: PredictionCardItem;
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
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const searchParams = new URLSearchParams(location.search);
  const selectedTag = searchParams.get('tag');
  const selectedMarket = searchParams.get('market');
  const sidebarTopic = (location.state as HomeLocationState | null)?.sidebarTopic;
  const sidebarTopicItem = mapSidebarTopicToPredictionCard(sidebarTopic);
  const { allItems } = usePredictionCardItems(selectedTag);

  const allFallbackItems = [heroNews, ...mockNews] as PredictionCardItem[];
  const selectedMarketId = selectedMarket && Number.isFinite(Number(selectedMarket)) ? Number(selectedMarket) : null;

  const needsFootballDeepLink =
    Boolean(selectedMarket && selectedMarketId !== null) &&
    !allItems.some(
      (item) =>
        item.marketId === selectedMarketId ||
        item.id === selectedMarket ||
        item.id === `market-${selectedMarket}`,
    );

  const footballDeepLinkQuery = useRequestFootballMarketsByTag({
    tag: 'football',
    page: 1,
    limit: FOOTBALL_TAG_DEEP_LINK_LIMIT,
    enabled: needsFootballDeepLink,
  });

  const selectedPrediction = useMemo(() => {
    if (!selectedMarket || selectedMarketId === null) return null;
    const match = (items: PredictionCardItem[]) =>
      items.find(
        (item) =>
          item.marketId === selectedMarketId ||
          item.id === selectedMarket ||
          item.id === `market-${selectedMarket}`,
      );
    const fromMain = match(allItems);
    if (fromMain) return fromMain;
    const footballItems = (footballDeepLinkQuery.data?.list ?? []).map(mapMarketToPredictionCard);
    const fromFootball = match(footballItems);
    if (fromFootball) return fromFootball;
    return (
      allFallbackItems.find(
        (item) =>
          item.marketId === selectedMarketId ||
          item.id === selectedMarket ||
          item.id === `market-${selectedMarket}`,
      ) ?? (sidebarTopicItem?.marketId === selectedMarketId ? sidebarTopicItem : null)
    );
  }, [
    allItems,
    allFallbackItems,
    footballDeepLinkQuery.data,
    selectedMarket,
    selectedMarketId,
    sidebarTopicItem,
  ]);

  /** 世界杯等路由传入 state，直达撕裂带；消费后丢掉避免刷新重复进入 */
  useEffect(() => {
    const raw = location.state as HomeLocationState | null;
    if (!raw?.openBattleNews) return;
    setSelectedBattleNews(raw.openBattleNews);
    navigate(`${location.pathname}${location.search || ''}`, {
      replace: true,
      state: raw.sidebarTopic ? { sidebarTopic: raw.sidebarTopic } : {},
    });
  }, [location.state, location.pathname, location.search, navigate]);

  /** URL ?market= 与当前撕裂带场次不一致时再关掉撕裂带 */
  useEffect(() => {
    if (selectedMarketId === null) return;
    setSelectedBattleNews((prev) => {
      if (!prev) return prev;
      return prev.marketId === selectedMarketId ? prev : null;
    });
  }, [selectedMarketId]);

  const handlePredictionBetSuccess = useCallback((item: PredictionCardItem, option: 'A' | 'B', _result: PlaceBetResult) => {
    setUserVotes((prev) => ({ ...prev, [item.id]: option }));
  }, []);

  const battleNews = selectedBattleNews;

  const handleBattleBack = useCallback(() => {
    setSelectedBattleNews(null);
  }, []);

  return (
    <div className="pt-[10px]">
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
    </div>
  );
}
