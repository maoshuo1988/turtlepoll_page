/** 文件说明：小游戏页面展示组件，负责承载游戏入口和对应跳转动作。 */
import { GameHubPage } from './GameHubPage';

interface GamesPageViewProps {
  onOpenJump: () => void;
  onOpenLab: () => void;
  onOpenBattle: () => void;
}

export function GamesPageView({ onOpenJump, onOpenLab, onOpenBattle }: GamesPageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-games">
      <GameHubPage
        onOpenJump={onOpenJump}
        onOpenLab={onOpenLab}
        onOpenBattle={onOpenBattle}
      />
    </section>
  );
}
