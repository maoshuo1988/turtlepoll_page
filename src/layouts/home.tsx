/**
 * 文件说明：home，Umi layout 入口，负责路由嵌套和页面壳挂载。
 */
import { useMemo, useState } from 'react';
import { Outlet, useLocation } from '@umijs/renderer-react';
import { StandalonePageShell, type ViewType } from './components';
import { HomeLayoutProvider } from './context';

// 路由路径和左侧导航状态的映射关系。
// 这里集中维护，可以避免每个页面自己判断当前高亮菜单。
const PATH_VIEW_MAP: Record<string, ViewType> = {
  '/': 'predictions',
  '/rivalry': 'rivalry',
  '/forum': 'forum',
  '/games': 'games',
  '/battle-plaza': 'battlePlaza6c47700',
  '/rank': 'rank',
  '/shop': 'shop',
  '/pet': 'pet',
  '/profile': 'profile',
  '/active-predictions': 'activePredictions',
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
  const activeView = useMemo(() => PATH_VIEW_MAP[location.pathname] ?? 'predictions', [location.pathname]);

  return (
    <StandalonePageShell
      activeView={activeView}
      authModalOpen={authModalOpen}
      onAuthModalOpenChange={setAuthModalOpen}
    >
      {/* StandalonePageShell 负责真实页面壳，这里只把页面需要的 layout 能力透传下去。 */}
      {({ darkMode, onToggleTheme }) => (
        <HomeLayoutProvider
          value={{
            darkMode,
            onToggleTheme,
            onOpenAuth: () => setAuthModalOpen(true),
          }}
        >
          <Outlet />
        </HomeLayoutProvider>
      )}
    </StandalonePageShell>
  );
}
