/**
 * 文件说明：mobile Footer 组件，负责对应端的底部区域和移动端选项卡。
 */
import React from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { Gamepad2, Home, MessageSquare, Swords, UserRound } from 'lucide-react';

const MOBILE_TABS = [
  { key: 'home', label: '暗盘', path: '/', icon: Home },
  { key: 'rivalry', label: '开撕', path: '/rivalry', icon: Swords },
  { key: 'forum', label: '线报', path: '/forum', icon: MessageSquare },
  { key: 'games', label: '游戏', path: '/games', icon: Gamepad2 },
  { key: 'profile', label: '我的', path: '/profile', icon: UserRound },
] as const;

function isActivePath(currentPath: string, tabPath: string) {
  if (tabPath === '/') return currentPath === '/';
  return currentPath === tabPath || currentPath.startsWith(`${tabPath}/`);
}

export const MobileFooter: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <footer className="mx-auto flex w-full max-w-[520px] items-center justify-around rounded-[24px] border border-white/8 bg-[#101114]/96 px-2 py-1.5 shadow-[0_-10px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl dark:border-rdark-border dark:bg-rdark-card/96">
      {MOBILE_TABS.map((tab) => {
        const active = isActivePath(currentPath, tab.path);
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              if (currentPath !== tab.path) {
                navigate(tab.path);
              }
            }}
            className={`relative flex h-[50px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] font-bold transition-colors ${
              active
                ? 'bg-emerald-400/12 text-emerald-300'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.8 : 2.2} />
            <span className="leading-none">{tab.label}</span>
          </button>
        );
      })}
    </footer>
  );
};
