/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useState } from 'react';
import { EventBattle, PredictionsView } from '@/components/shared/predictions';
import { useHomeLayoutContext } from '@/layouts/context';
import type { PlaceBetResult } from '@/hook/coinType';
import { usePredictionCardItems, type PredictionCardItem } from '@/components/shared/predictions/ui/predictionCard';
import { heroNews, mockNews } from '@/data/mock_data';

export default function HomePage() {
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const { onOpenAuth } = useHomeLayoutContext();
  const { allItems } = usePredictionCardItems(null);

  const handlePredictionBetSuccess = useCallback((item: PredictionCardItem, option: 'A' | 'B', _result: PlaceBetResult) => {
    setUserVotes((prev) => ({ ...prev, [item.id]: option }));
  }, []);

  void userVotes;

  if (selectedBattleId) {
    const allFallbackItems = [heroNews, ...mockNews] as PredictionCardItem[];
    const battleNews = allItems.find((item) => item.id === selectedBattleId) ?? allFallbackItems.find((item) => item.id === selectedBattleId) ?? allFallbackItems[0];

    return (
      <section className="view-shell view-rhythm view-event-battle mx-0 grid h-full w-full max-w-none gap-0">
        <EventBattle
          news={battleNews}
          onBack={() => setSelectedBattleId(null)}
          userSide={userVotes[selectedBattleId] ?? null}
          onRequireAuth={onOpenAuth}
        />
      </section>
    );
  }

  return (
    <PredictionsView
      selectedTag={null}
      onBetSuccess={handlePredictionBetSuccess}
      onRequireAuth={onOpenAuth}
      onEnterBattle={setSelectedBattleId}
    />
  );
}
