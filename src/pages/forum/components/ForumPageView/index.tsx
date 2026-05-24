/** 文件说明：论坛页面展示组件，负责把预测映射数据传入论坛视图。 */
import { useState } from 'react';
import { PenLine } from 'lucide-react';
import { Forum } from '../Forum';
import type { PredictionCardItem } from '../predictionCards';
import styles from './index.module.scss';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

interface ForumPageViewProps {
  newsByMarketId: Map<number, PredictionCardItem>;
  onOpenLinkedPrediction: (item: PredictionCardItem) => void;
}

export function ForumPageView({ newsByMarketId, onOpenLinkedPrediction }: ForumPageViewProps) {
  const [composerFocusKey, setComposerFocusKey] = useState<number | undefined>(undefined);

  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-forum">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className={css("page-secondary-button cursor-pointer")}
          onClick={() => setComposerFocusKey((k) => (k ?? 0) + 1)}
        >
          <PenLine size={15} />
          发线报
        </button>
      </div>
      <Forum
        newsByMarketId={newsByMarketId}
        onOpenLinkedPrediction={onOpenLinkedPrediction}
        showComposer
        composerFocusSignal={composerFocusKey}
        mobileBottomSheetComposer={false}
      />
    </section>
  );
}
