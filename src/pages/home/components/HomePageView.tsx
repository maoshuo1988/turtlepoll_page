/** 文件说明：首页展示组件，负责在预测列表和单场对战视图之间切换。 */
import { TrendingUp } from 'lucide-react';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { EventBattle } from './EventBattleLiveRoom';
import { PredictionsView } from './PredictionsView';
import type { PredictionCardItem } from './predictionCards';

interface HomePageViewProps {
  battleNews: PredictionCardItem | null;
  userSide: 'A' | 'B' | null;
  selectedTag: string | null;
  selectedPrediction: PredictionCardItem | null;
  onBattleBack: () => void;
  onRequireAuth: () => void;
  onPredictionBetSuccess: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onEnterBattle: (item: PredictionCardItem) => void;
}

export function HomePageView({
  battleNews,
  userSide,
  selectedTag,
  selectedPrediction,
  onBattleBack,
  onRequireAuth,
  onPredictionBetSuccess,
  onEnterBattle,
}: HomePageViewProps) {
  if (battleNews) {
    return (
      <section className="view-shell view-rhythm view-event-battle mx-0 grid h-full w-full max-w-none gap-0">
        <EventBattle
          news={battleNews}
          onBack={onBattleBack}
          userSide={userSide}
          onRequireAuth={onRequireAuth}
        />
      </section>
    );
  }

  return (
    <section className="page-frame page-frame-wide view-predictions">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <TrendingUp size={14} />
              Prediction Market
            </div>
            <h1 className="page-title">暗盘</h1>
            <p className="page-description">集中展示热门预测、实时盘口和下注入口。主要行动保持在卡片内，点击下注会先进入确认弹框。</p>
          </div>
        </div>
      </header>
      <PredictionsView
        selectedTag={selectedTag}
        selectedPrediction={selectedPrediction}
        onBetSuccess={onPredictionBetSuccess}
        onRequireAuth={onRequireAuth}
        onEnterBattle={onEnterBattle}
      />
    </section>
  );
}
