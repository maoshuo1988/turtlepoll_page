/** 文件说明：小游戏页面展示组件，负责承载游戏入口和对应跳转动作。 */
import { Gamepad2 } from 'lucide-react';
import { GameHubPage } from './GameHubPage';

interface GamesPageViewProps {
  onOpenJump: () => void;
  onOpenLab: () => void;
  onOpenBattle: () => void;
}

export function GamesPageView({ onOpenJump, onOpenLab, onOpenBattle }: GamesPageViewProps) {
  return (
    <section className="page-frame view-games">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Gamepad2 size={14} />
              Arcade
            </div>
            <h1 className="page-title">游戏管理</h1>
            <p className="page-description">龟龟跳海、出海探索和对战入口集中展示，保持轻量、直接、适合快速进入。</p>
          </div>
        </div>
      </header>
      <GameHubPage
        onOpenJump={onOpenJump}
        onOpenLab={onOpenLab}
        onOpenBattle={onOpenBattle}
      />
    </section>
  );
}
