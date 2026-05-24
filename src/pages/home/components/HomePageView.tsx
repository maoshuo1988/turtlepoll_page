/** 文件说明：首页展示组件，负责在预测列表和单场对战视图之间切换。 */
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { PredictionsView } from './PredictionsView';
import type { PredictionCardItem } from './predictionCards';

interface HomePageViewProps {
  selectedTag: string | null;
  selectedPrediction: PredictionCardItem | null;
  onRequireAuth: () => void;
  onPredictionBetSuccess: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onEnterBattle: (item: PredictionCardItem) => void;
}

export function HomePageView({
  selectedTag,
  selectedPrediction,
  onRequireAuth,
  onPredictionBetSuccess,
  onEnterBattle,
}: HomePageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-predictions">
      <PredictionsView
        selectedTag={selectedTag}
        selectedPrediction={selectedPrediction}
        onBetSuccess={onPredictionBetSuccess}
        onRequireAuth={onRequireAuth}
        onEnterBattle={onEnterBattle}
      />
    </section>
  );
}
