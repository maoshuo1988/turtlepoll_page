/** 文件说明：论坛页面展示组件，负责把预测映射数据传入论坛视图。 */
import { MessageSquareText, PenLine } from 'lucide-react';
import { Forum } from './Forum';
import type { PredictionCardItem } from './predictionCards';

interface ForumPageViewProps {
  newsByMarketId: Map<number, PredictionCardItem>;
  onOpenLinkedPrediction: (item: PredictionCardItem) => void;
}

export function ForumPageView({ newsByMarketId, onOpenLinkedPrediction }: ForumPageViewProps) {
  return (
    <section className="page-frame view-forum">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <MessageSquareText size={14} />
              Forum
            </div>
            <h1 className="page-title">线报广场</h1>
            <p className="page-description">围绕盘口、爆料和赛前分析展开讨论，相关预测会在帖子里保持联动。</p>
          </div>
          <div className="page-actions">
            <span className="page-secondary-button">
              <PenLine size={15} />
              发线报
            </span>
          </div>
        </div>
      </header>
      <Forum
        newsByMarketId={newsByMarketId}
        onOpenLinkedPrediction={onOpenLinkedPrediction}
        showComposer
        mobileBottomSheetComposer={false}
      />
    </section>
  );
}
