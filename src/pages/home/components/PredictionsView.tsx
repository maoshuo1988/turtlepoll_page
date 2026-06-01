/**
 * 文件说明：Predictions View，预测市场和撕裂带页面组件。
 */
import React from 'react';
import { HeroPrediction } from './HeroPrediction';
import { NewsFeed } from './NewsFeed';
import { PredictTagCategoryBar } from './PredictTagCategoryBar';
import type { PredictionBetOption, PredictionCardItem } from './predictionCards';
import type { PlaceBetResult } from '@/hooks/coinTypes';

interface PredictionsViewProps {
  selectedTag: string | null;
  selectedPrediction?: PredictionCardItem | null;
  onTagChange: (slug: string | null) => void;
  onBetSuccess?: (item: PredictionCardItem, option: PredictionBetOption, result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (item: PredictionCardItem) => void;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({
  selectedTag,
  selectedPrediction,
  onTagChange,
  onBetSuccess,
  onRequireAuth,
  onEnterBattle,
}) => {
  return (
    <section className="flex w-full min-w-0 flex-col pb-1 md:pb-0">
      <div className="sticky top-0 z-30 -mt-[10px] shrink-0 bg-[#f8fafc] pb-3 pt-[10px] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.85)] dark:bg-[#080808] max-lg:pb-2.5">
        <PredictTagCategoryBar selectedTag={selectedTag} onTagChange={onTagChange} />
      </div>
      <div className="grid w-full gap-3 md:gap-4">
        <HeroPrediction
          news={selectedPrediction}
          selectedTag={selectedTag}
          onBetSuccess={onBetSuccess}
          onRequireAuth={onRequireAuth}
          onEnterBattle={onEnterBattle}
        />
        <NewsFeed
          selectedTag={selectedTag}
          onBetSuccess={onBetSuccess}
          onRequireAuth={onRequireAuth}
          onEnterBattle={onEnterBattle}
        />
      </div>
    </section>
  );
};
