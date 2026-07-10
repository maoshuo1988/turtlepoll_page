/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useNavigate } from '@umijs/renderer-react';
import { GamesPageView } from './components/GamesPageView';

function openLabStandalone() {
  window.location.href = '/games/turtle-jump/index.html';
}

function openBattleStandalone() {
  window.location.href = '/games/turtle-arena-game/index.html';
}

export default function GamesPage() {
  const navigate = useNavigate();

  return (
    <div className="pt-0 lg:pt-3">
      <GamesPageView
        onBack={() => navigate('/')}
        onOpenJump={() => navigate('/jump')}
        onOpenLab={openLabStandalone}
        onOpenBattle={openBattleStandalone}
      />
    </div>
  );
}
