/** 文件说明：活跃预测页面展示组件，承接列表数据并渲染预测列表视图。 */
import { Activity } from 'lucide-react';
import { ActivePredictionsPage } from './ActivePredictionsPage';
import type { PredictionCardItem } from './predictionCards';

interface ActivePredictionsPageViewProps {
  items: PredictionCardItem[];
  onBack: () => void;
  onEnterBattle: () => void;
}

export function ActivePredictionsPageView({ items, onBack, onEnterBattle }: ActivePredictionsPageViewProps) {
  return (
    <section className="page-frame view-active-predictions">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Activity size={14} />
              Live Markets
            </div>
            <h1 className="page-title">进行中对局</h1>
            <p className="page-description">只展示当前仍可进入的预测市场，按倒计时和热度优先帮助你快速判断。</p>
          </div>
        </div>
      </header>
      <ActivePredictionsPage
        items={items}
        onBack={onBack}
        onEnterBattle={onEnterBattle}
      />
    </section>
  );
}
