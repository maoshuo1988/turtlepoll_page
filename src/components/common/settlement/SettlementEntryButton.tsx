/**
 * 文件说明：顶栏待结算入口按钮（钱袋图标 + 文案 + 金色角标）。
 */
import React from 'react';
import { HandCoins } from 'lucide-react';

interface SettlementEntryButtonProps {
  pendingCount: number;
  onClick: () => void;
  className?: string;
}

export const SettlementEntryButton: React.FC<SettlementEntryButtonProps> = ({
  pendingCount,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      className={`relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#0c0d10] px-3.5 text-[13px] font-medium text-white transition-colors hover:border-white/16 hover:bg-[#141518] dark:border-white/8 dark:bg-[#111215] dark:hover:border-white/12 dark:hover:bg-rdark-hover ${className}`}
      onClick={onClick}
      aria-label={pendingCount > 0 ? `结算，${pendingCount} 条待结算` : '结算'}
    >
      <HandCoins size={18} className="shrink-0 text-amber-300" strokeWidth={2} aria-hidden />
      <span>结算</span>
      {pendingCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#c4ad86] px-1.5 py-0.5 text-[10px] font-black leading-none text-[#1a1408]">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      ) : null}
    </button>
  );
};
