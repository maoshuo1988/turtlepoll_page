/**
 * 文件说明：Predictions View，预测市场和撕裂带页面组件。
 */
import React from 'react';
import { HeroPrediction } from './HeroPrediction';
import { HomeMobileHome } from './HomeMobileHome';
import { NewsFeed } from './NewsFeed';
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
      {/* 移动端：按设计稿整页实现；PC 保持原结构 */}
      <HomeMobileHome />

      <div className="hidden lg:grid w-full gap-3 md:gap-4">
        <HeroPrediction
          news={selectedPrediction}
          selectedTag={selectedTag}
          onBetSuccess={onBetSuccess}
          onRequireAuth={onRequireAuth}
          onEnterBattle={onEnterBattle}
        />
        <NewsFeed
          selectedTag={selectedTag}
          onTagChange={onTagChange}
          onBetSuccess={onBetSuccess}
          onRequireAuth={onRequireAuth}
          onEnterBattle={onEnterBattle}
        />
      </div>
    </section>
  );
};
