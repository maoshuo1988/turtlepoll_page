/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { useHomeLayoutContext } from '@/layouts/context';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import type { SidebarHotTopic } from '@/components/common/layout/sidebarHotTopics';
import { useRequestFootballMarketsByTag } from '@/hooks/usePredictionRequests';
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
};

function mapSidebarTopicToPredictionCard(topic?: SidebarHotTopic): PredictionCardItem | null {
  if (!topic?.context?.marketId) return null;

  return {
    id: `market-${topic.context.marketId}`,
    marketId: topic.context.marketId,
    title: topic.context.eventName || topic.title,
    summary: topic.context.detail || '查看当前热点争议与讨论风向。',
    image: topic.context.imageUrl?.trim() || topic.context.listImage?.trim() || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    listImage: topic.context.listImage?.trim() || undefined,
    sideABgImage: topic.context.sideABgImage?.trim() || undefined,
    sideBBgImage: topic.context.sideBBgImage?.trim() || undefined,
    sideABgColor: topic.context.sideABgColor?.trim() || undefined,
    sideBBgColor: topic.context.sideBBgColor?.trim() || undefined,
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
  const location = useLocation();
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const searchParams = new URLSearchParams(location.search);
  const selectedTag = searchParams.get('tag');
  const selectedMarket = searchParams.get('market');
  const sidebarTopic = (location.state as HomeLocationState | null)?.sidebarTopic;
  const sidebarTopicItem = mapSidebarTopicToPredictionCard(sidebarTopic);
  const { allItems } = usePredictionCardItems(selectedTag);

  const allFallbackItems: PredictionCardItem[] = [];
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
    requireAuth: false,
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

  const handlePredictionBetSuccess = useCallback((_item: PredictionCardItem, _option: 'A' | 'B', _result: PlaceBetResult) => {
  }, []);

  const handleEnterBattle = useCallback((item: PredictionCardItem) => {
    const nextSearch = new URLSearchParams();
    if (selectedTag) nextSearch.set('tag', selectedTag);
    if (item.marketId !== undefined && item.marketId !== null) {
      nextSearch.set('market', String(item.marketId));
    } else {
      nextSearch.set('market', item.id);
    }
    navigate(`/event-battle?${nextSearch.toString()}`, {
      state: {
        openBattleNews: item,
        returnTo: `${location.pathname}${location.search || ''}`,
      },
    });
  }, [location.pathname, location.search, navigate, selectedTag]);

  return (
    <div className="pt-[10px]">
      <HomePageView
        selectedTag={selectedTag}
        selectedPrediction={selectedPrediction}
        onPredictionBetSuccess={handlePredictionBetSuccess}
        onRequireAuth={onOpenAuth}
        onEnterBattle={handleEnterBattle}
      />
    </div>
  );
}
