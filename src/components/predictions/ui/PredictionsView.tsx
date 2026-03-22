import React from 'react';
import { HeroPrediction } from './HeroPrediction';
import { NewsFeed } from './NewsFeed';
import type { NewsItem } from '../../../data/mock_data';

interface PredictionsViewProps {
  heroNews: NewsItem;
  items: NewsItem[];
  onBet: (newsId: string, option: 'A' | 'B', odds: number) => void;
  onEnterBattle?: (newsId: string) => void;
  bettingMarketId?: number | null;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({ heroNews, items, onBet, onEnterBattle, bettingMarketId }) => {
  return (
    <section className="view-shell view-rhythm view-predictions w-full max-w-none mx-0 grid gap-4">
      <HeroPrediction news={heroNews} onBet={onBet} onEnterBattle={onEnterBattle} bettingMarketId={bettingMarketId} />
      <NewsFeed items={items} onBet={onBet} onEnterBattle={onEnterBattle} bettingMarketId={bettingMarketId} />
    </section>
  );
};
