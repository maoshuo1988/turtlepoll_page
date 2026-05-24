/** 文件说明：活跃预测页面展示组件，承接列表数据并渲染预测列表视图。 */
import { ActivePredictionsPage } from './ActivePredictionsPage';
import type { PredictionCardItem } from './predictionCards';

interface ActivePredictionsPageViewProps {
  items: PredictionCardItem[];
  onBack: () => void;
  onEnterBattle: () => void;
}

export function ActivePredictionsPageView({ items, onBack, onEnterBattle }: ActivePredictionsPageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-active-predictions">
      <ActivePredictionsPage
        items={items}
        onBack={onBack}
        onEnterBattle={onEnterBattle}
      />
    </section>
  );
}
