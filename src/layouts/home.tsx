/**
 * 文件说明：home，Umi layout 入口，负责路由嵌套和页面壳挂载。
 */
import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation } from '@umijs/renderer-react';
import { StandalonePageShell, type ViewType } from './components';
import { HomeLayoutProvider } from './context';

// 路由路径和左侧导航状态的映射关系。
// 这里集中维护，可以避免每个页面自己判断当前高亮菜单。
const PATH_VIEW_MAP: Record<string, ViewType> = {
  // 世界杯页：展示杯赛专题盘口、赛程热度和冠军预测。
  '/world-cup': 'worldCup',
  // 首页：默认展示撕裂带预测信息流。
  '/': 'predictions',
  // 真实撕裂带直达页：复用首页撕裂带逻辑，支持独立路径访问。
  '/event-battle': 'predictions',
  '/rivalry-battle': 'rivalry',
  // 对抗页：展示龟龟阵营、对抗态势等内容。
  '/rivalry': 'rivalry',
  // 论坛页：展示话题列表和评论互动。
  '/forum': 'forum',
  // 游戏管理页：展示龟龟跳海等游戏入口。
  '/games': 'games',
  // 龟龟争霸：Phaser 版对战（与旧版游戏管理独立）。
  '/turtle-contest': 'turtleContest',
  // 撕裂带广场页：展示战斗广场和下注对局。
  '/battle-plaza': 'battlePlaza',
  // 排行榜页：展示用户、宠物或战绩排名。
  '/rank': 'rank',
  // 商城页：展示宠物蛋、体力补给等商品。
  '/shop': 'shop',
  // 宠物页：展示用户宠物资产和养成状态。
  '/pet': 'pet',
  // 个人中心页：展示用户资料、资产和历史记录。
  '/profile': 'profile',
  // 我的 Tab：待结算与个人快捷入口（移动端一级页）。
  '/mine': 'activePredictions',
  // 暗盘二级页：移动端从首页功能卡进入。
  '/dark-market': 'predictions',
  // 活跃预测页：展示当前正在进行的预测市场（PC 侧栏）。
  '/active-predictions': 'activePredictions',
};

type TearStripRouteState = {
  returnTo?: string;
};

/**
 * 业务主 layout。
 *
 * 这个文件只负责三件事：
 * 1. 根据当前路由推导左侧导航高亮项。
 * 2. 控制全局登录弹窗的打开状态。
 * 3. 把主题切换、打开登录弹窗等布局能力通过 context 给页面使用。
 */
export default function HomeLayout() {
  const location = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const activeView = useMemo(() => {
    if (location.pathname.startsWith('/settlement/')) {
      return 'predictions';
    }
    if (location.pathname === '/event-battle' || location.pathname === '/rivalry-battle') {
      const routeState = location.state as TearStripRouteState | null;
      const returnPath = routeState?.returnTo?.split('?')[0];
      if (returnPath && PATH_VIEW_MAP[returnPath]) {
        return PATH_VIEW_MAP[returnPath];
      }
    }
    return PATH_VIEW_MAP[location.pathname] ?? 'predictions';
  }, [location.pathname, location.state]);
  const handleOpenAuth = useCallback(() => {
    setAuthModalOpen(true);
  }, []);

  return (
    <StandalonePageShell
      activeView={activeView}
      authModalOpen={authModalOpen}
      onAuthModalOpenChange={setAuthModalOpen}
    >
      {/* StandalonePageShell 负责真实页面壳，这里只把页面需要的 layout 能力透传下去。 */}
      {({ darkMode, onToggleTheme, aiPushMessages }) => (
        <HomeLayoutProvider
          value={{
            darkMode,
            onToggleTheme,
            onOpenAuth: handleOpenAuth,
            aiPushMessages,
          }}
        >
          <Outlet />
        </HomeLayoutProvider>
      )}
    </StandalonePageShell>
  );
}
