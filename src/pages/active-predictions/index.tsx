/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { heroNews, mockNews } from '@/data/mockData';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { ActivePredictionsPageView } from './components/ActivePredictionsPageView';
import { mapMarketToPredictionCard, type PredictionCardItem } from './components/predictionCards';

export default function ActivePredictionsPage() {
  const navigate = useNavigate();
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  const activePredictionItems = useMemo<PredictionCardItem[]>(() => {
    const list = footballMarkets.data?.list ?? [];
    const liveNews = Array.isArray(list) && list.length > 0
      ? list.map(mapMarketToPredictionCard)
      : ([heroNews, ...mockNews] as PredictionCardItem[]);
    return liveNews.filter((item) => item.status === 'open');
  }, [footballMarkets.data]);

  return (
    <ActivePredictionsPageView
      items={activePredictionItems}
      onBack={() => {
        navigate('/');
      }}
      onEnterBattle={() => {
        navigate('/');
      }}
    />
  );
}
