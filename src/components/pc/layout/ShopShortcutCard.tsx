/** 文件说明：PC 左侧栏黑市快捷入口卡片（周期性提示冒泡）。 */
import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ShopShortcutCardProps {
  onClick: () => void;
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  /** 预留：底部周期冒泡开启时的动画周期（秒） */
  cycleSeconds?: number;
}

export const ShopShortcutCard: React.FC<ShopShortcutCardProps> = ({
  onClick,
  title = '黑市',
  message = '宠物蛋•体力补给•道具',
  icon = '🛒',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[52px] w-full items-center gap-3 overflow-hidden rounded-2xl border border-amber-400/22 bg-gradient-to-br from-amber-500/12 via-orange-500/8 to-emerald-500/5 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-amber-400/55 hover:bg-amber-400/15 hover:shadow-[0_8px_20px_rgba(251,191,36,0.2)] dark:border-amber-500/30 dark:from-amber-500/10 dark:via-orange-500/6 dark:to-emerald-500/5 dark:hover:border-amber-400/50"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/12 text-[22px] shadow-[inset_0_0_12px_rgba(251,191,36,0.18)] dark:border-amber-500/30 dark:bg-amber-500/12">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[15px] font-bold leading-tight tracking-wide text-amber-100 dark:text-amber-50">{title}</div>
        <div className="mt-0.5 text-xs leading-snug text-amber-200/80 dark:text-amber-100/60">{message}</div>
      </div>
      <ChevronRight size={14} className="shrink-0 self-center text-amber-200/60 dark:text-amber-100/50" />
    </button>
  );
};
