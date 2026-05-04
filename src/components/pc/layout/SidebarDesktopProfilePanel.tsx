/**
 * 文件说明：Sidebar Desktop Profile Panel，PC 左侧栏相关展示组件。
 */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Flame, MessageCircle, Turtle } from 'lucide-react';
import { PetChat } from '../../shared/pet/ui/PetChat';
import type { PetInfo } from '@/data/mockData';
import { useRequestCoinMe } from '@/hooks/useCoinRequests';

interface SidebarDesktopProfilePanelProps {
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  chatOpen: boolean;
  currentDialogue: string;
  dialogueKey: number;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onViewPet: () => void;
  onOpenProfile: () => void;
  onOpenActivePredictions: () => void;
}

// 桌面侧边栏顶部个人卡片：资料、金币、战绩和宠物入口
// 金币直接读取全局 coinMe 缓存，别处更新后这里会自动同步
export const SidebarDesktopProfilePanel: React.FC<SidebarDesktopProfilePanelProps> = ({
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  chatOpen,
  currentDialogue,
  dialogueKey,
  onOpenChat,
  onCloseChat,
  onViewPet,
  onOpenProfile,
  onOpenActivePredictions,
}) => {
  const coinMe = useRequestCoinMe();
  const displayBalance = coinMe.data?.balance ?? 0;

  if (chatOpen) {
    return <PetChat pet={pet} onClose={onCloseChat} />;
  }

  return (
    <div>
      <div className="">
        <button
          onClick={onOpenProfile}
          className=" flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent p-0 text-left transition-all hover:border-white/8 hover:bg-white/[0.03]"
        >
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#1d1e22] to-[#0f1013] text-lg font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
            🦊
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-white dark:text-rdark-text">路边社社长</div>
            <div className=" text-[10px] text-zinc-500 dark:text-rdark-text2">预测达人 · 连续签到 12 天</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onViewPet}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-emerald-400/18 bg-emerald-500/10 px-3 py-2 text-left transition-colors hover:bg-emerald-500/15 dark:border-emerald-500/18 dark:bg-emerald-500/10"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/18 text-emerald-300">
              <Turtle size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-emerald-200">宠物空间</div>
              <div className="text-[10px] text-emerald-200/70">查看龟种资产并切换上阵</div>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold text-emerald-300">进入</span>
        </button>

        <div className=" flex items-center justify-center gap-2">
          <Coins size={18} className="text-emerald-500 dark:text-emerald-400" />
          <AnimatePresence mode="popLayout">
            <motion.span
              key={displayBalance}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-[26px] font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400"
            >
              {displayBalance.toLocaleString()}
            </motion.span>
          </AnimatePresence>
          <span className=" self-end text-[11px] text-zinc-500 dark:text-rdark-text2">龟币</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-lg bg-[#141518]  text-center dark:bg-rdark-input">
            <div className=" text-[15px] font-bold leading-none text-white dark:text-rdark-text">{(winRate * 100).toFixed(0)}%</div>
            <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">胜率</div>
          </div>
          <div className="rounded-lg bg-[#141518]  text-center dark:bg-rdark-input">
            <div className=" flex items-center justify-center gap-0.5 text-[15px] font-bold leading-none text-emerald-600 dark:text-emerald-400">
              <Flame size={12} className="text-orange-400" />
              {winStreak}
            </div>
            <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">连胜</div>
          </div>
          <div className="rounded-lg bg-[#141518]  text-center dark:bg-rdark-input">
            <div className=" text-[15px] font-bold leading-none text-white dark:text-rdark-text">{totalPredictions}</div>
            <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">已预测</div>
          </div>
          <button
            type="button"
            onClick={onOpenActivePredictions}
            className="rounded-lg bg-[#141518] text-center transition-colors hover:bg-[#1a1c20] dark:bg-rdark-input dark:hover:bg-rdark-hover"
          >
            <div className="text-[15px] font-bold leading-none text-zinc-200 dark:text-zinc-200">{activePredictions}</div>
            <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">进行中</div>
          </button>
        </div>
      </div>

      <div className="relative h-[190px] cursor-pointer overflow-hidden group" onClick={onViewPet}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#16171b] via-[#111214] to-[#090909]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-3 right-6"
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 shadow-[0_0_12px_rgba(251,191,36,0.4)] dark:from-slate-300 dark:to-slate-400 dark:shadow-[0_0_12px_rgba(203,213,225,0.2)]" />
        </motion.div>

        <motion.div animate={{ x: [-10, 40, -10] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute top-4 left-2">
          <div className="relative">
            <div className="h-4 w-14 rounded-full bg-white/60 dark:bg-white/8" />
            <div className="absolute -top-1.5 left-3 h-4 w-8 rounded-full bg-white/50 dark:bg-white/6" />
            <div className="absolute -top-0.5 left-8 h-3 w-5 rounded-full bg-white/40 dark:bg-white/5" />
          </div>
        </motion.div>
        <motion.div animate={{ x: [10, -25, 10] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} className="absolute top-9 right-4">
          <div className="relative">
            <div className="h-3 w-10 rounded-full bg-white/45 dark:bg-white/6" />
            <div className="absolute -top-1 left-2 h-3 w-6 rounded-full bg-white/35 dark:bg-white/5" />
          </div>
        </motion.div>
        <motion.div animate={{ x: [0, 20, 0] }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} className="absolute top-14 left-1/4">
          <div className="h-2.5 w-8 rounded-full bg-white/30 dark:bg-white/4" />
        </motion.div>

        <div className="absolute bottom-[52px] left-0 right-0 h-[30px]">
          <svg viewBox="0 0 260 30" className="h-full w-full" preserveAspectRatio="none">
            <path d="M0 30 Q30 8 65 18 Q100 5 130 14 Q165 2 195 12 Q225 6 260 16 L260 30 Z" className="fill-emerald-200/60 dark:fill-emerald-900/30" />
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[50px]">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/30 via-emerald-400/40 to-emerald-200/30 dark:from-emerald-950/80 dark:via-emerald-900/50 dark:to-emerald-900/20" />
          <svg viewBox="0 0 260 12" className="absolute -top-1 left-0 h-3 w-full" preserveAspectRatio="none">
            <path d="M0 12 Q8 4 16 8 Q24 2 32 7 Q40 3 48 8 Q56 1 64 6 Q72 3 80 8 Q88 2 96 7 Q104 4 112 8 Q120 1 128 6 Q136 3 144 8 Q152 2 160 7 Q168 4 176 8 Q184 1 192 6 Q200 3 208 8 Q216 2 224 7 Q232 4 240 8 Q248 2 260 6 L260 12 Z" className="fill-emerald-300/70 dark:fill-emerald-800/50" />
          </svg>
          <div className="absolute bottom-[8px] left-3 flex items-end gap-[2px]">
            <div className="h-[10px] w-[3px] -rotate-6 rounded-t-full bg-emerald-500/60 dark:bg-emerald-600/40" />
            <div className="h-[13px] w-[2px] rounded-t-full bg-emerald-600/50 dark:bg-emerald-500/35" />
            <div className="h-[9px] w-[3px] rotate-6 rounded-t-full bg-emerald-500/55 dark:bg-emerald-600/40" />
          </div>
          <div className="absolute bottom-[8px] left-12 flex items-end gap-[2px]">
            <div className="h-[8px] w-[2px] -rotate-3 rounded-t-full bg-emerald-500/50 dark:bg-emerald-600/35" />
            <div className="h-[11px] w-[3px] rotate-2 rounded-t-full bg-emerald-600/45 dark:bg-emerald-500/30" />
          </div>
          <div className="absolute bottom-[8px] right-5 flex items-end gap-[2px]">
            <div className="h-[11px] w-[3px] -rotate-4 rounded-t-full bg-emerald-500/55 dark:bg-emerald-600/40" />
            <div className="h-[14px] w-[2px] rotate-2 rounded-t-full bg-emerald-600/50 dark:bg-emerald-500/35" />
            <div className="h-[9px] w-[2px] rotate-8 rounded-t-full bg-emerald-500/45 dark:bg-emerald-600/30" />
          </div>
          <div className="absolute bottom-[8px] right-16 flex items-end gap-[2px]">
            <div className="h-[7px] w-[2px] rounded-t-full bg-emerald-600/40 dark:bg-emerald-500/25" />
            <div className="h-[10px] w-[3px] -rotate-3 rounded-t-full bg-emerald-500/50 dark:bg-emerald-600/35" />
          </div>
          <div className="absolute bottom-[14px] left-[70px] text-[6px] opacity-70">🌼</div>
          <div className="absolute bottom-[12px] right-[55px] text-[5px] opacity-60">🌸</div>
          <div className="absolute bottom-[6px] left-[45%] h-1.5 w-3 rounded-full bg-slate-400/30 dark:bg-slate-600/30" />
          <div className="absolute bottom-[5px] left-[30%] h-1 w-2 rounded-full bg-slate-400/20 dark:bg-slate-600/20" />
        </div>

        <motion.div animate={{ y: [0, 60, 0], x: [0, 8, -5, 0], opacity: [0, 0.7, 0.7, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0 }} className="absolute top-6 left-[20%] h-1 w-1 rounded-full bg-amber-300/60 dark:bg-amber-400/40" />
        <motion.div animate={{ y: [0, 50, 0], x: [0, -6, 4, 0], opacity: [0, 0.5, 0.5, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }} className="absolute top-4 left-[65%] h-1 w-1 rounded-full bg-pink-300/50 dark:bg-pink-400/30" />
        <motion.div animate={{ y: [0, 45, 0], x: [0, 5, -3, 0], opacity: [0, 0.6, 0.6, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 4 }} className="absolute top-8 left-[45%] h-0.5 w-0.5 rounded-full bg-amber-200/70 dark:bg-amber-300/40" />

        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[44px] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={dialogueKey}
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.9 }}
              className="relative max-w-[180px] rounded-xl border border-white/60 bg-white/90   text-center shadow-lg backdrop-blur-sm dark:border-rdark-border dark:bg-rdark-card/90"
            >
              <span className="block truncate text-[10px] leading-snug text-slate-600 dark:text-rdark-text">{currentDialogue}</span>
              <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white/60 bg-white/90 dark:border-rdark-border dark:bg-rdark-card/90" />
            </motion.div>
          </AnimatePresence>
          <div className="select-none text-[48px] leading-none drop-shadow-lg">{pet.avatar}</div>
          <div className=" flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-600 drop-shadow-sm dark:text-slate-300">{pet.name}</span>
            <span className="rounded-full bg-emerald-500/80   text-[8px] font-bold text-white shadow-sm">Lv.{pet.level}</span>
          </div>
        </motion.div>

        <motion.div animate={{ scale: [1, 0.9, 1], opacity: [0.15, 0.1, 0.15] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[38px] left-1/2 z-0 h-2.5 w-14 -translate-x-1/2 rounded-full bg-black/15 blur-[2px] dark:bg-black/25" />

        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/70  shadow-sm backdrop-blur-sm dark:border-rdark-border/50 dark:bg-rdark-card/70">
            <span className="text-[11px]">😊</span>
            <div className="flex flex-col">
              <span className="text-[8px] leading-none text-slate-400 dark:text-rdark-text2">心情</span>
              <span className="text-[9px] font-bold leading-tight text-amber-500 dark:text-amber-400">开心</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/70  shadow-sm backdrop-blur-sm dark:border-rdark-border/50 dark:bg-rdark-card/70">
            <span className="text-[11px]">⚡</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] leading-none text-slate-400 dark:text-rdark-text2">体力</span>
              <div className="flex items-center gap-1">
                <div className="h-[5px] w-[38px] overflow-hidden rounded-full bg-slate-200/80 dark:bg-rdark-border">
                  <motion.div initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                </div>
                <span className="text-[8px] font-bold leading-none text-emerald-600 dark:text-emerald-400">78</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat();
          }}
          className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-200/60 bg-white/80  text-[11px] font-bold text-emerald-600 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:shadow-xl dark:border-emerald-800/60 dark:bg-rdark-card/80 dark:text-emerald-400 dark:hover:bg-rdark-card"
        >
          <MessageCircle size={13} /> 和龟仙人聊聊
        </button>

        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-md border border-emerald-200/40 bg-white/80  text-[9px] font-medium text-emerald-600 shadow-sm backdrop-blur-sm dark:border-emerald-800/40 dark:bg-rdark-card/80 dark:text-emerald-400">
            进入宠物空间 →
          </div>
        </div>
      </div>
    </div>
  );
};
