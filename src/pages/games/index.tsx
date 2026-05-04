/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { GameHubPage } from '@/components/shared/game';

function openJumpStandalone() {
  window.location.href = '/jump';
}

function openLabStandalone() {
  window.location.href = '/games/turtle-jump/index.html';
}

function openBattleStandalone() {
  window.location.href = '/games/turtle-battle/index.html';
}

export default function GamesPage() {
  return (
    <section className="view-shell view-rhythm view-games mx-0 grid w-full max-w-none gap-4">
      <GameHubPage
        onOpenJump={openJumpStandalone}
        onOpenLab={openLabStandalone}
        onOpenBattle={openBattleStandalone}
      />
    </section>
  );
}
