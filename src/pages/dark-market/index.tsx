/**
 * 文件说明：暗盘二级页路由入口（移动端从首页功能卡进入，独立 Tab 之外）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { useHomeLayoutContext } from '@/layouts/context';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import {
  mapMarketToPredictionCard,
  type PredictionBetOption,
  type PredictionCardItem,
} from '@/pages/home/components/predictionCards';
import { DarkMarketPageView } from './components/DarkMarketPageView';

const DARK_MARKET_PAGE_SIZE = 50;

function mergeMarketPages(
  prev: FootballMarketAggregate[],
  pageList: FootballMarketAggregate[],
  reset: boolean,
) {
  const next = reset ? [] : [...prev];
  pageList.forEach((item) => {
    const existingIndex = next.findIndex((current) => current.market.id === item.market.id);
    if (existingIndex >= 0) {
      next[existingIndex] = item;
      return;
    }
    next.push(item);
  });
  return next;
}

export default function DarkMarketPage() {
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const [page, setPage] = useState(1);
  const [loadedMarkets, setLoadedMarkets] = useState<FootballMarketAggregate[]>([]);
  const footballMarkets = useRequestFootballMarkets({
    page,
    limit: DARK_MARKET_PAGE_SIZE,
    requireAuth: false,
  });

  const pageList = useMemo(() => footballMarkets.data?.list ?? [], [footballMarkets.data?.list]);
  const total = footballMarkets.data?.total ?? pageList.length;
  const hasMore = loadedMarkets.length > 0 ? loadedMarkets.length < total : pageList.length < total;

  useEffect(() => {
    if (!pageList.length) return;
    setLoadedMarkets((prev) => mergeMarketPages(prev, pageList, page === 1));
  }, [page, pageList]);

  useEffect(() => {
    if (footballMarkets.isLoading || footballMarkets.isFetching) return;
    if (!hasMore) return;
    if (!pageList.length) return;
    setPage((current) => current + 1);
  }, [footballMarkets.isLoading, footballMarkets.isFetching, hasMore, pageList.length]);

  const marketItems = useMemo<PredictionCardItem[]>(() => {
    const source = loadedMarkets.length > 0 ? loadedMarkets : pageList;
    if (!Array.isArray(source) || source.length === 0) return [];
    return source.map(mapMarketToPredictionCard);
  }, [loadedMarkets, pageList]);

  const isInitialLoading = (footballMarkets.isLoading || footballMarkets.isFetching) && marketItems.length === 0;
  const isLoadingMore = (footballMarkets.isLoading || footballMarkets.isFetching) && marketItems.length > 0 && hasMore;

  const handleEnterBattle = useCallback(
    (item: PredictionCardItem) => {
      navigate(`/event-battle?market=${item.marketId}`);
    },
    [navigate],
  );

  const handleBetSuccess = useCallback(
    (_item: PredictionCardItem, _option: PredictionBetOption, _result: PlaceBetResult) => {
      setPage(1);
      setLoadedMarkets([]);
      void footballMarkets.refetch();
    },
    [footballMarkets],
  );

  return (
    <DarkMarketPageView
      items={marketItems}
      isLoading={isInitialLoading}
      isLoadingMore={isLoadingMore}
      onBack={() => navigate('/')}
      onEnterBattle={handleEnterBattle}
      onRequireAuth={onOpenAuth}
      onBetSuccess={handleBetSuccess}
    />
  );
}
