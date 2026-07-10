/**
 * 文件说明：mobile Footer，手机底栏五 Tab（首页 / 消息 / 发布 / 我的 / 账号）；仅移动端，与 PC 侧栏分离。
 */
import React from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { isMobileTabBarRoute } from '@/utils/mobileRoutes';

const TABBAR_ICON_BASE = '/mobile/tabbar';

const MOBILE_TABS = [
  {
    key: 'home',
    label: '首页',
    path: '/',
    icon: `${TABBAR_ICON_BASE}/home.png`,
    iconActive: `${TABBAR_ICON_BASE}/home_select.png`,
  },
  {
    key: 'message',
    label: '消息',
    path: '/messages',
    icon: `${TABBAR_ICON_BASE}/message.png`,
    iconActive: `${TABBAR_ICON_BASE}/message_select.png`,
  },
  {
    key: 'publish',
    label: '发布',
    path: '/forum?compose=1',
    icon: `${TABBAR_ICON_BASE}/add.png`,
    iconActive: `${TABBAR_ICON_BASE}/add_select.png`,
  },
  {
    key: 'mine',
    label: '我的',
    path: '/mine',
    icon: `${TABBAR_ICON_BASE}/my.png`,
    iconActive: `${TABBAR_ICON_BASE}/my-select.png`,
  },
  {
    key: 'account',
    label: '账号',
    path: '/profile',
    icon: `${TABBAR_ICON_BASE}/account.png`,
    iconActive: `${TABBAR_ICON_BASE}/account_select.png`,
  },
] as const;

export { isMobileTabBarRoute };

type MobileTabKey = (typeof MOBILE_TABS)[number]['key'];

function isComposeOpen(search: string) {
  return new URLSearchParams(search).get('compose') === '1';
}

function isActiveTab(currentPath: string, search: string, tabKey: MobileTabKey) {
  const composeOpen = isComposeOpen(search);

  if (tabKey === 'home') return currentPath === '/';
  if (tabKey === 'message') return currentPath === '/messages';
  if (tabKey === 'publish') return currentPath === '/forum' && composeOpen;
  if (tabKey === 'mine') {
    return currentPath === '/mine' || currentPath.startsWith('/mine/');
  }
  if (tabKey === 'account') {
    return currentPath === '/profile' || currentPath.startsWith('/profile/');
  }
  return false;
}

export interface MobileFooterProps {
  /** false 时底栏滑出视野（仍占位由外层 padding 控制） */
  visible?: boolean;
}

export const MobileFooter: React.FC<MobileFooterProps> = ({ visible = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const search = location.search || '';

  return (
    <footer
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-2 lg:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      } transition-transform duration-200 ease-out`}
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      aria-hidden={!visible}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-[520px] items-stretch justify-around gap-0 rounded-[20px] border border-white/10 bg-[#0c0d10]/96 py-1.5 shadow-[0_-8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-rdark-border dark:bg-[#0f1013]/96">
        {MOBILE_TABS.map((tab) => {
          const active = isActiveTab(currentPath, search, tab.key);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (active && tab.key !== 'publish') return;
                navigate(tab.path);
              }}
              className={`relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-0.5 text-[10px] font-bold transition-colors touch-manipulation ${
                active
                  ? 'text-emerald-300 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300 dark:text-rdark-text2 dark:hover:text-rdark-text'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <img
                src={active ? tab.iconActive : tab.icon}
                alt=""
                aria-hidden
                className="h-[22px] w-[22px] shrink-0 object-contain"
                draggable={false}
              />
              <span className="leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
};
