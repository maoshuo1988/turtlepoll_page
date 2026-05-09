/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useState } from 'react';
import { useHomeLayoutContext } from '@/layouts/context';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { heroNews, mockNews } from '@/data/mockData';
import { HomePageView } from './components/HomePageView';
import { usePredictionCardItems, type PredictionCardItem } from './components/predictionCards';

export default function HomePage() {
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const { onOpenAuth } = useHomeLayoutContext();
  const { allItems } = usePredictionCardItems(null);

  const handlePredictionBetSuccess = useCallback((item: PredictionCardItem, option: 'A' | 'B', _result: PlaceBetResult) => {
    setUserVotes((prev) => ({ ...prev, [item.id]: option }));
  }, []);

  const allFallbackItems = [heroNews, ...mockNews] as PredictionCardItem[];
  const battleNews = selectedBattleId
    ? allItems.find((item) => item.id === selectedBattleId) ?? allFallbackItems.find((item) => item.id === selectedBattleId) ?? allFallbackItems[0]
    : null;

  return (
    <HomePageView
      battleNews={battleNews}
      userSide={selectedBattleId ? (userVotes[selectedBattleId] ?? null) : null}
      onBattleBack={() => setSelectedBattleId(null)}
      onPredictionBetSuccess={handlePredictionBetSuccess}
      onRequireAuth={onOpenAuth}
      onEnterBattle={setSelectedBattleId}
    />
  );
}
