import React from 'react';
import { CircleHelp } from 'lucide-react';

interface FloatingGuideButtonProps {
  onClick: () => void;
  sizeClassName?: string;
}

export const FloatingGuideButton: React.FC<FloatingGuideButtonProps> = ({ onClick, sizeClassName = 'w-11 h-11' }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-[92px] md:bottom-[100px] right-3 md:right-6 z-50 ${sizeClassName} rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-slate-600 dark:text-slate-200 cursor-pointer inline-flex items-center justify-center shrink-0`}
    >
      <CircleHelp size={34} />
    </button>
  );
};
