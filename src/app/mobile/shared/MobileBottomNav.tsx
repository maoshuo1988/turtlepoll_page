import React from 'react';
import { Gamepad2, Gift, MessageSquare, TrendingUp, UserRound } from 'lucide-react';
import type { ViewType } from '@/components/layout';

interface MobileBottomNavProps {
  activeView: ViewType;
  onChange: (view: ViewType) => void;
}

const tabs: Array<{ view: ViewType; label: string; icon: React.ReactNode }> = [
  { view: 'forum', label: '社区', icon: <MessageSquare size={18} /> },
  { view: 'predictions', label: '预测', icon: <TrendingUp size={18} /> },
  { view: 'games', label: '游戏', icon: <Gamepad2 size={18} /> },
  { view: 'shop', label: '商店', icon: <Gift size={18} /> },
  { view: 'profile', label: '我的', icon: <UserRound size={18} /> },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, onChange }) => {
  const highlightedView = activeView === 'pet'
    ? 'profile'
    : activeView === 'jump' || activeView === 'lab' || activeView === 'battle'
      ? 'games'
      : activeView;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-5 gap-1 rounded-[28px] border border-white/10 bg-[#090909]/96 p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        {tabs.map((tab) => {
          const active = highlightedView === tab.view;

          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => onChange(tab.view)}
              className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] border transition-colors ${
                active
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
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
