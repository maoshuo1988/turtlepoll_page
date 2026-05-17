/**
 * 文件说明：mobile Header 组件，负责对应端的顶部导航展示。
 */
import React from 'react';
import { Search, Sparkles } from 'lucide-react';

export interface MobileHeaderProps {
  darkMode: boolean;
  onOpenGames: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ darkMode, onOpenGames }) => {
  return (
    <>
      <header className={`fixed left-0 right-0 top-0 z-50 backdrop-blur-xl lg:hidden ${darkMode ? 'border-b border-white/8 bg-[#090909]/92' : 'border-b border-slate-200 bg-white/92'}`}>
        <div className="flex h-[58px] justify-between items-center gap-3 px-3">
          <div className="flex shrink-0 items-center">
            <img src="/logo.png" alt="龟投 Logo" className="h-8 w-8 rounded-xl object-contain" />
            <img
              src="/logo-text.png"
              alt="龟投"
              className="h-8 w-auto object-contain"
            />
          </div>

          <button
            type="button"
            onClick={onOpenGames}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
          >
            <Sparkles size={14} />
            游戏
          </button>
        </div>
      </header>
      <div className="h-[58px] lg:hidden" />
    </>
  );
};

