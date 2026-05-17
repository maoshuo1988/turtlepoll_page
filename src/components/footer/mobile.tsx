/**
 * 文件说明：mobile Footer 组件，手机底栏四 Tab（与 PC 左侧导航分离）；支持随主区域滚动方向隐藏/显示。
 */
import React from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { Banknote, Flame, Home, MessageSquare } from 'lucide-react';

const MOBILE_TABS = [
  { key: 'predictions', label: '暗盘', path: '/', icon: Home },
  { key: 'rivalry', label: '开撕台', path: '/rivalry', icon: Flame },
  { key: 'forum', label: '线报', path: '/forum', icon: MessageSquare },
  { key: 'battle-plaza', label: '钱庄', path: '/battle-plaza', icon: Banknote },
] as const;

function isActivePath(currentPath: string, tabPath: string) {
  if (tabPath === '/') return currentPath === '/';
  return currentPath === tabPath || currentPath.startsWith(`${tabPath}/`);
}

export interface MobileFooterProps {
  /** false 时底栏滑出视野（仍占位由外层 padding 控制） */
  visible?: boolean;
}

export const MobileFooter: React.FC<MobileFooterProps> = ({ visible = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

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
              className={`relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-0.5 text-[10px] font-bold transition-colors ${
                active
                  ? 'text-emerald-300 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300 dark:text-rdark-text2 dark:hover:text-rdark-text'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={active ? 2.6 : 2.1} className="shrink-0" />
              <span className="leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
};
