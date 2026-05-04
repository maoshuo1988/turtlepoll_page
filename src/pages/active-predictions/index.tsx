/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo } from 'react';
import { ActivePredictionsPage as SharedActivePredictionsPage } from '@/components/shared/predictions';
import { heroNews, mockNews } from '@/data/mock_data';
import { useRequestFootballMarkets } from '@/hook/usePredictRequest';
import { mapMarketToPredictionCard, type PredictionCardItem } from '@/components/shared/predictions/ui/predictionCard';

export default function ActivePredictionsPage() {
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  const activePredictionItems = useMemo<PredictionCardItem[]>(() => {
    const list = footballMarkets.data?.list ?? [];
    const liveNews = Array.isArray(list) && list.length > 0
      ? list.map(mapMarketToPredictionCard)
      : ([heroNews, ...mockNews] as PredictionCardItem[]);
    return liveNews.filter((item) => item.status === 'open');
  }, [footballMarkets.data]);

  return (
    <SharedActivePredictionsPage
      items={activePredictionItems}
      onBack={() => {
        window.location.href = '/';
      }}
      onEnterBattle={() => {
        window.location.href = '/';
      }}
    />
  );
}
