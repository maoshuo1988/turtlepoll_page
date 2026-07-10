/** 文件说明：活跃预测页面展示组件，承接列表数据并渲染预测列表视图。 */
import { ActivePredictionsPage } from './ActivePredictionsPage';
import type { PredictionCardItem } from './predictionCards';

interface ActivePredictionsPageViewProps {
  items: PredictionCardItem[];
  onBack: () => void;
  onEnterBattle: (item: PredictionCardItem) => void;
}

export function ActivePredictionsPageView({ items, onBack, onEnterBattle }: ActivePredictionsPageViewProps) {
  return (
    <section className="hidden lg:grid w-full max-w-none min-h-full mx-0 content-start gap-4 view-active-predictions">
      <ActivePredictionsPage
        items={items}
        onBack={onBack}
        onEnterBattle={(newsId) => {
          const item = items.find((entry) => entry.id === newsId);
          if (item) onEnterBattle(item);
        }}
      />
    </section>
  );
}
