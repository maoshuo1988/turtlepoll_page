import React from 'react';
import { House, Plus, Swords, Turtle, UserRound } from 'lucide-react';
import type { ViewType } from '@/components/layout';

interface MobileTabBarProps {
  activeView: ViewType;
  onChange: (view: ViewType) => void;
  onCompose: () => void;
}

type MobileTabItem =
  | { key: 'home'; label: string; view: ViewType; icon: React.ReactNode }
  | { key: 'battle'; label: string; view: ViewType; icon: React.ReactNode }
  | { key: 'compose'; label: string; icon: React.ReactNode }
  | { key: 'pet'; label: string; view: ViewType; icon: React.ReactNode }
  | { key: 'profile'; label: string; view: ViewType; icon: React.ReactNode };

const tabs: MobileTabItem[] = [
  { key: 'home', label: '首页', view: 'forum', icon: <House size={18} /> },
  { key: 'battle', label: '对战', view: 'battle', icon: <Swords size={18} /> },
  { key: 'compose', label: '', icon: <Plus size={20} /> },
  { key: 'pet', label: '宠物', view: 'pet', icon: <Turtle size={18} /> },
  { key: 'profile', label: '我的', view: 'profile', icon: <UserRound size={18} /> },
];

function getHighlightedTab(activeView: ViewType): MobileTabItem['key'] {
  if (activeView === 'battle') return 'battle';
  if (activeView === 'forum') return 'home';
  if (activeView === 'pet') return 'pet';
  if (activeView === 'profile') return 'profile';
  return 'home';
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeView, onChange, onCompose }) => {
  const highlightedTab = getHighlightedTab(activeView);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-5 items-end gap-1 rounded-[28px] border border-white/10 bg-[#090909]/96 p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        {tabs.map((tab) => {
          const active = highlightedTab === tab.key;
          const isCompose = tab.key === 'compose';

          if (isCompose) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={onCompose}
                className="flex min-h-[58px] flex-col items-center justify-center gap-1"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-emerald-300/30 bg-emerald-500 text-black shadow-[0_10px_24px_rgba(34,197,94,0.35)]">
                  {tab.icon}
                </span>
                <span className="text-[10px] font-semibold text-zinc-300">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.view)}
              className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] border transition-colors ${
                active
                  ? 'border-transparent bg-transparent text-emerald-300'
                  : 'border-transparent bg-transparent text-zinc-500'
              }`}
            >
              <span className={active ? 'text-emerald-300' : 'text-zinc-400'}>{tab.icon}</span>
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
