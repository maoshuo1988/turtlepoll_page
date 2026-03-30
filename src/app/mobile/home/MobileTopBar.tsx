import React from 'react';
import { Search, Sparkles } from 'lucide-react';

interface MobileTopBarProps {
  onOpenLab: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onOpenLab }) => {
  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-[#090909]/92 backdrop-blur-xl xl:hidden">
        <div className="flex h-[58px] items-center gap-3 px-3">
          <div className="flex shrink-0 items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-[#1a1a1d] to-[#0d0d10] text-white shadow-[0_8px_20px_rgba(0,0,0,0.32)]">
              🐢
            </div>
            <span className="bg-gradient-to-r from-white to-[#a3a3a3] bg-clip-text text-[18px] font-extrabold tracking-[-0.03em] text-transparent">
              龟投
            </span>
          </div>

          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/8 bg-[#121316] px-3 py-2">
            <Search size={15} className="shrink-0 text-zinc-500" />
            <input
              type="text"
              placeholder="搜索热点事件..."
              className="w-full border-0 bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </label>

          <button
            type="button"
            onClick={onOpenLab}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
          >
            <Sparkles size={14} />
            游戏
          </button>
        </div>
      </header>
      <div className="h-[58px] xl:hidden" />
    </>
  );
};
