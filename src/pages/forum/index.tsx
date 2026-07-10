/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { ForumPageView } from './components/ForumPageView';
import { mapMarketToPredictionCard, type PredictionCardItem } from './components/predictionCards';

export default function ForumPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20, requireAuth: false });
  const newsByMarketId = useMemo(() => {
    const list = footballMarkets.data?.list ?? [];
    const cards = Array.isArray(list) ? list.map(mapMarketToPredictionCard) : [];
    return new Map(cards.filter((item) => typeof item.marketId === 'number').map((item) => [item.marketId as number, item]));
  }, [footballMarkets.data]);

  const shouldOpenCompose = new URLSearchParams(location.search || '').get('compose') === '1';

  useEffect(() => {
    if (!shouldOpenCompose) return;
    setComposerFocusSignal((prev) => prev + 1);
  }, [shouldOpenCompose, location.key]);

  const handleOpenLinkedPrediction = (item: PredictionCardItem) => {
    navigate(`/event-battle?market=${item.marketId ?? item.id}`, {
      state: {
        openBattleNews: item,
        returnTo: `${location.pathname}${location.search || ''}`,
      },
    });
  };

  return (
    <ForumPageView
      newsByMarketId={newsByMarketId}
      onOpenLinkedPrediction={handleOpenLinkedPrediction}
      onBack={() => navigate('/')}
      composerFocusSignal={composerFocusSignal || undefined}
    />
  );
}
