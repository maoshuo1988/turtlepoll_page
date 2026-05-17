/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { ForumPageView } from './components/ForumPageView';
import { mapMarketToPredictionCard, type PredictionCardItem } from './components/predictionCards';

export default function ForumPage() {
  const navigate = useNavigate();
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  const newsByMarketId = useMemo(() => {
    const list = footballMarkets.data?.list ?? [];
    const cards = Array.isArray(list) ? list.map(mapMarketToPredictionCard) : [];
    return new Map(cards.filter((item) => typeof item.marketId === 'number').map((item) => [item.marketId as number, item]));
  }, [footballMarkets.data]);

  const handleOpenLinkedPrediction = (item: PredictionCardItem) => {
    navigate(`/?market=${item.marketId ?? item.id}`);
  };

  return (
    <div className="pt-[10px]">
      <ForumPageView
        newsByMarketId={newsByMarketId}
        onOpenLinkedPrediction={handleOpenLinkedPrediction}
      />
    </div>
  );
}
