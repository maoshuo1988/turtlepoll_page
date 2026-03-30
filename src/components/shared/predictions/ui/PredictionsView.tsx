import React from 'react';
import { HeroPrediction } from './HeroPrediction';
import { NewsFeed } from './NewsFeed';
import type { PredictionCardItem } from './predictionCard';
import type { PlaceBetResult } from '@/hook/coinType';

interface PredictionsViewProps {
  selectedTag: string | null;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (newsId: string) => void;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({ selectedTag, onBetSuccess, onRequireAuth, onEnterBattle }) => {
  return (
    <section className="view-shell view-rhythm view-predictions w-full max-w-none mx-0 grid gap-4 px-0 pb-1 md:gap-4 md:px-0 md:pb-0">
      <HeroPrediction selectedTag={selectedTag} onBetSuccess={onBetSuccess} onRequireAuth={onRequireAuth} onEnterBattle={onEnterBattle} />
      <NewsFeed selectedTag={selectedTag} onBetSuccess={onBetSuccess} onRequireAuth={onRequireAuth} onEnterBattle={onEnterBattle} />
    </section>
  );
};
