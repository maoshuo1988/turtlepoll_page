/** 文件说明：论坛页面展示组件，负责把预测映射数据传入论坛视图。 */
import { Forum } from '../Forum';
import type { PredictionCardItem } from '../predictionCards';

interface ForumPageViewProps {
  newsByMarketId: Map<number, PredictionCardItem>;
  onOpenLinkedPrediction: (item: PredictionCardItem) => void;
}

export function ForumPageView({ newsByMarketId, onOpenLinkedPrediction }: ForumPageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-forum">
      <Forum
        newsByMarketId={newsByMarketId}
        onOpenLinkedPrediction={onOpenLinkedPrediction}
        showComposer
        mobileBottomSheetComposer={false}
      />
    </section>
  );
}
