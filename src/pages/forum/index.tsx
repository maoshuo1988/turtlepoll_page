/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo } from 'react';
import { Forum } from '@/components/shared/forum';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { mapMarketToPredictionCard, type PredictionCardItem } from '@/components/shared/predictions/ui/predictionCards';

export default function ForumPage() {
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  const newsByMarketId = useMemo(() => {
    const list = footballMarkets.data?.list ?? [];
    const cards = Array.isArray(list) ? list.map(mapMarketToPredictionCard) : [];
    return new Map(cards.filter((item) => typeof item.marketId === 'number').map((item) => [item.marketId as number, item]));
  }, [footballMarkets.data]);

  const handleOpenLinkedPrediction = (item: PredictionCardItem) => {
    window.location.href = `/?market=${item.marketId ?? item.id}`;
  };

  return (
    <section className="view-shell view-rhythm view-forum mx-0 grid w-full max-w-none gap-4">
      <Forum
        newsByMarketId={newsByMarketId}
        onOpenLinkedPrediction={handleOpenLinkedPrediction}
        showComposer
        mobileBottomSheetComposer={false}
      />
    </section>
  );
}
