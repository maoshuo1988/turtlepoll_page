/**
 * 文件说明：Predictions View，预测市场和撕裂带页面组件。
 */
import React from 'react';
import { HeroPrediction } from './HeroPrediction';
import { NewsFeed } from './NewsFeed';
import type { PredictionCardItem } from './predictionCards';
import type { PlaceBetResult } from '@/hooks/coinTypes';

interface PredictionsViewProps {
  selectedTag: string | null;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (newsId: string) => void;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({ selectedTag, onBetSuccess, onRequireAuth, onEnterBattle }) => {
  return (
    <section className="grid w-full gap-4 pb-1 md:gap-4 md:pb-0">
      <HeroPrediction selectedTag={selectedTag} onBetSuccess={onBetSuccess} onRequireAuth={onRequireAuth} onEnterBattle={onEnterBattle} />
      <NewsFeed selectedTag={selectedTag} onBetSuccess={onBetSuccess} onRequireAuth={onRequireAuth} onEnterBattle={onEnterBattle} />
    </section>
  );
};
