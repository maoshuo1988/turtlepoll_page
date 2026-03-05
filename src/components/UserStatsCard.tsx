import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserStatsCardProps {
  name: string;
  balance: number;
  winStreak: number;
}

export const UserStatsCard: React.FC<UserStatsCardProps> = ({ name: _name, balance, winStreak }) => {
  return (
    <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/20 border-2 border-amber-400/30 dark:border-amber-700/30 shadow-[0_4px_16px_rgba(245,166,35,0.15)] dark:shadow-none">
      {/* Top: icon + title */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[28px]">🪙</span>
        <div>
          <h4 className="text-[15px] font-bold text-amber-900 dark:text-amber-300">我的龟币</h4>
          <p className="text-[11px] text-amber-700 dark:text-amber-400/60">今日还可签到 +50</p>
        </div>
      </div>

      {/* Big balance number */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={balance}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="text-[32px] font-bold text-center my-1 text-amber-700 dark:text-amber-300"
        >
          {balance.toLocaleString()}
        </motion.div>
      </AnimatePresence>

      {/* Stats subtitle */}
      <div className="text-[11px] text-center mb-2.5 text-amber-700 dark:text-amber-400/60">
        本周赢得 +340 🐢 · 已押注 5 题 · <span className="font-bold text-red-600 dark:text-red-400">🔥 {winStreak}连胜</span>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button className="py-[7px] rounded-[10px] text-center text-xs font-bold cursor-pointer transition-all bg-white dark:bg-rdark-card text-amber-700 dark:text-amber-400 border-[1.5px] border-amber-400/40 dark:border-amber-700/40">
          每日签到
        </button>
        <button className="py-[7px] rounded-[10px] text-center text-xs font-bold cursor-pointer transition-all text-white bg-amber-700 dark:bg-amber-600 border-[1.5px] border-transparent">
          宠物商店
        </button>
      </div>
    </div>
  );
};
