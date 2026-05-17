/** 文件说明：PC 左侧栏一体化宠物面板（场景、龟币、战绩四格）。 */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Coins, Flame } from 'lucide-react';

/** 面板内展示的上阵宠物字段（与全局 PetInfo 的展示子集对齐）。 */
export interface SidebarPetProfilePet {
  name: string;
  level: number;
  /** emoji 或可直接渲染的短字符串 */
  avatar: string;
}

export interface PetProfilePanelProps {
  balance: number;
  winStreak: number;
  /** 胜率 0..1 */
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: SidebarPetProfilePet;
  currentDialogue: string;
  dialogueKey: number;
  onViewPet: () => void;
  onOpenActivePredictions: () => void;
  petBadgeName?: string;
  petBadgeIcon?: string;
  moodLabel?: string;
  staminaPercent?: number;
}

export const PetProfilePanel: React.FC<PetProfilePanelProps> = ({
  balance,
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  currentDialogue,
  dialogueKey,
  onViewPet,
  onOpenActivePredictions,
  petBadgeName = '寒冰龟',
  petBadgeIcon = '❄️',
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-400/22 bg-gradient-to-b from-[#0c1318] via-[#0e1a18] to-[#0a1614] shadow-[0_14px_34px_rgba(0,0,0,0.36)] dark:border-emerald-500/25">
      <div className="flex items-center justify-between gap-2 border-b border-white/6 bg-gradient-to-r from-sky-500/18 via-cyan-500/10 to-emerald-500/8 px-3 py-2 backdrop-blur dark:border-white/8">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-[14px] leading-none">{petBadgeIcon}</span>
          <span className="truncate text-[13px] font-bold text-sky-100 [text-shadow:0_0_8px_rgba(125,211,252,0.4)] dark:text-sky-50">
            {petBadgeName}
          </span>
          <span className="rounded-full bg-emerald-500/85 px-1.5 py-[1px] text-[9px] font-black text-white shadow-sm dark:bg-emerald-600/90">
            Lv.{pet.level}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewPet}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-[3px] text-[10px] font-bold text-emerald-200 transition-colors hover:border-emerald-400/55 hover:bg-emerald-400/20 dark:border-emerald-500/35 dark:text-emerald-100"
        >
          进入空间
          <ChevronRight size={11} />
        </button>
      </div>

      <div className="group relative h-[190px] cursor-pointer overflow-hidden" onClick={onViewPet}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#162028] via-[#13211f] to-[#0a1614]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_15%,rgba(186,230,253,0.18),transparent_60%)]" />

        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-6 top-3"
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 shadow-[0_0_12px_rgba(251,191,36,0.45)] dark:from-amber-300 dark:to-orange-400" />
        </motion.div>

        <motion.div animate={{ x: [-10, 40, -10] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute left-2 top-4">
          <div className="relative">
            <div className="h-4 w-14 rounded-full bg-white/35 dark:bg-white/25" />
            <div className="absolute -top-1.5 left-3 h-4 w-8 rounded-full bg-white/30 dark:bg-white/18" />
            <div className="absolute -top-0.5 left-8 h-3 w-5 rounded-full bg-white/25 dark:bg-white/14" />
          </div>
        </motion.div>
        <motion.div animate={{ x: [10, -25, 10] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} className="absolute right-4 top-9">
          <div className="relative">
            <div className="h-3 w-10 rounded-full bg-white/28 dark:bg-white/16" />
            <div className="absolute -top-1 left-2 h-3 w-6 rounded-full bg-white/22 dark:bg-white/12" />
          </div>
        </motion.div>
        <motion.div animate={{ x: [0, 20, 0] }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} className="absolute left-1/4 top-14">
          <div className="h-2.5 w-8 rounded-full bg-white/18 dark:bg-white/10" />
        </motion.div>

        <div className="absolute bottom-[52px] left-0 right-0 h-[30px]">
          <svg viewBox="0 0 260 30" className="h-full w-full" preserveAspectRatio="none">
            <path d="M0 30 Q30 8 65 18 Q100 5 130 14 Q165 2 195 12 Q225 6 260 16 L260 30 Z" className="fill-cyan-500/22 dark:fill-cyan-600/18" />
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[50px]">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/85 via-emerald-700/55 to-emerald-500/20 dark:from-emerald-950/90 dark:via-emerald-900/60" />
          <svg viewBox="0 0 260 12" className="absolute -top-1 left-0 h-3 w-full" preserveAspectRatio="none">
            <path d="M0 12 Q8 4 16 8 Q24 2 32 7 Q40 3 48 8 Q56 1 64 6 Q72 3 80 8 Q88 2 96 7 Q104 4 112 8 Q120 1 128 6 Q136 3 144 8 Q152 2 160 7 Q168 4 176 8 Q184 1 192 6 Q200 3 208 8 Q216 2 224 7 Q232 4 240 8 Q248 2 260 6 L260 12 Z" className="fill-emerald-600/55 dark:fill-emerald-700/45" />
          </svg>
          <div className="absolute bottom-[8px] left-3 flex items-end gap-[2px]">
            <div className="h-[10px] w-[3px] -rotate-6 rounded-t-full bg-emerald-300/55 dark:bg-emerald-500/45" />
            <div className="h-[13px] w-[2px] rounded-t-full bg-emerald-200/55 dark:bg-emerald-500/40" />
            <div className="h-[9px] w-[3px] rotate-6 rounded-t-full bg-emerald-300/55 dark:bg-emerald-500/45" />
          </div>
          <div className="absolute bottom-[8px] left-12 flex items-end gap-[2px]">
            <div className="h-[8px] w-[2px] -rotate-3 rounded-t-full bg-emerald-300/50 dark:bg-emerald-500/38" />
            <div className="h-[11px] w-[3px] rotate-2 rounded-t-full bg-emerald-200/45 dark:bg-emerald-500/35" />
          </div>
          <div className="absolute bottom-[8px] right-5 flex items-end gap-[2px]">
            <div className="h-[11px] w-[3px] -rotate-4 rounded-t-full bg-emerald-300/55 dark:bg-emerald-500/45" />
            <div className="h-[14px] w-[2px] rotate-2 rounded-t-full bg-emerald-200/50 dark:bg-emerald-500/40" />
            <div className="h-[9px] w-[2px] rotate-[8deg] rounded-t-full bg-emerald-300/45 dark:bg-emerald-500/38" />
          </div>
          <div className="absolute bottom-[8px] right-16 flex items-end gap-[2px]">
            <div className="h-[7px] w-[2px] rounded-t-full bg-emerald-200/40 dark:bg-emerald-500/32" />
            <div className="h-[10px] w-[3px] -rotate-3 rounded-t-full bg-emerald-300/50 dark:bg-emerald-500/40" />
          </div>
          <div className="absolute bottom-[14px] left-[70px] text-[6px] opacity-80">🌼</div>
          <div className="absolute bottom-[12px] right-[55px] text-[5px] opacity-70">🌸</div>
          <div className="absolute bottom-[6px] left-[45%] h-1.5 w-3 rounded-full bg-slate-500/30 dark:bg-slate-600/35" />
          <div className="absolute bottom-[5px] left-[30%] h-1 w-2 rounded-full bg-slate-500/20 dark:bg-slate-600/28" />
        </div>

        <motion.div animate={{ y: [0, 60, 0], x: [0, 8, -5, 0], opacity: [0, 0.7, 0.7, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0 }} className="absolute left-[20%] top-6 h-1 w-1 rounded-full bg-amber-300/55" />
        <motion.div animate={{ y: [0, 50, 0], x: [0, -6, 4, 0], opacity: [0, 0.5, 0.5, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }} className="absolute left-[65%] top-4 h-1 w-1 rounded-full bg-pink-300/50" />
        <motion.div animate={{ y: [0, 45, 0], x: [0, 5, -3, 0], opacity: [0, 0.6, 0.6, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 4 }} className="absolute left-[45%] top-8 h-0.5 w-0.5 rounded-full bg-amber-200/65" />

        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[42px] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={dialogueKey}
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.9 }}
              className="relative mb-1.5 max-w-[180px] rounded-xl border border-emerald-400/28 bg-[#0a1614]/85 px-2.5 py-1.5 text-center shadow-[0_6px_18px_rgba(0,0,0,0.5)] backdrop-blur-md dark:border-emerald-500/35 dark:bg-rdark-card/90"
            >
              <span className="block truncate text-[10px] leading-snug text-emerald-100/90 dark:text-emerald-50/95">{currentDialogue}</span>
              <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-emerald-400/28 bg-[#0a1614]/85 dark:border-emerald-500/35 dark:bg-rdark-card/90" />
            </motion.div>
          </AnimatePresence>
          <div className="select-none text-[44px] leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]">{pet.avatar}</div>
        </motion.div>

        <motion.div animate={{ scale: [1, 0.9, 1], opacity: [0.22, 0.14, 0.22] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[34px] left-1/2 z-0 h-2.5 w-14 -translate-x-1/2 rounded-full bg-black/45 blur-[2px]" />

        {/* <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-400/22 bg-black/55 px-1.5 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-sm dark:border-emerald-500/25 dark:bg-black/65">
            <span className="text-[11px] leading-none">😊</span>
            <div className="flex flex-col">
              <span className="text-[8px] leading-none text-zinc-400 dark:text-zinc-500">心情</span>
              <span className="text-[9px] font-bold leading-tight text-amber-300 dark:text-amber-400">{moodLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-400/22 bg-black/55 px-1.5 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-sm dark:border-emerald-500/25 dark:bg-black/65">
            <span className="text-[11px] leading-none">⚡</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] leading-none text-zinc-400 dark:text-zinc-500">体力</span>
              <div className="flex items-center gap-1">
                <div className="h-[5px] w-[38px] overflow-hidden rounded-full bg-white/10 dark:bg-white/15">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${staminaPercent}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500" />
                </div>
                <span className="text-[8px] font-bold leading-none text-emerald-300 dark:text-emerald-400">{staminaPercent}</span>
              </div>
            </div>
          </div>
        </div> */}

        {/* <div className="pointer-events-none absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-md border border-emerald-400/30 bg-black/65 px-2 py-1 text-[9px] font-bold text-emerald-300 shadow-sm backdrop-blur-sm dark:border-emerald-500/35 dark:text-emerald-200">
            进入宠物空间 →
          </div>
        </div> */}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-emerald-400/12 bg-gradient-to-r from-emerald-500/8 via-emerald-400/12 to-emerald-500/8 px-3 py-2.5 dark:border-emerald-500/15">
        <Coins size={17} className="text-emerald-400 dark:text-emerald-500" />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={balance}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-[24px] font-extrabold leading-none tracking-tight text-emerald-300 [text-shadow:0_0_12px_rgba(52,211,153,0.35)] dark:text-emerald-400"
          >
            {balance.toLocaleString()}
          </motion.span>
        </AnimatePresence>
        <span className="self-end text-[11px] font-bold text-emerald-200/65 dark:text-emerald-300/70">龟币</span>
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-white/5 bg-white/[0.03] dark:border-white/8">
        <div className="bg-black/35 px-1.5 py-2 text-center dark:bg-black/45">
          <div className="text-[15px] font-bold leading-none text-white dark:text-rdark-text">{(winRate * 100).toFixed(0)}%</div>
          <div className="mt-1 text-[9px] text-zinc-500 dark:text-rdark-text2">胜率</div>
        </div>
        <div className="bg-black/35 px-1.5 py-2 text-center dark:bg-black/45">
          <div className="flex items-center justify-center gap-0.5 text-[15px] font-bold leading-none text-emerald-400 dark:text-emerald-500">
            <Flame size={12} className="text-orange-400" />
            {winStreak}
          </div>
          <div className="mt-1 text-[9px] text-zinc-500 dark:text-rdark-text2">连胜</div>
        </div>
        <div className="bg-black/35 px-1.5 py-2 text-center dark:bg-black/45">
          <div className="text-[15px] font-bold leading-none text-white dark:text-rdark-text">{totalPredictions}</div>
          <div className="mt-1 text-[9px] text-zinc-500 dark:text-rdark-text2">已预测</div>
        </div>
        {/* <button
          type="button"
          onClick={onOpenActivePredictions}
          className="bg-black/35 px-1.5 py-2 text-center transition-colors hover:bg-emerald-400/10 dark:bg-black/45 dark:hover:bg-emerald-500/15"
        >
          <div className="text-[15px] font-bold leading-none text-zinc-100 dark:text-rdark-text">{activePredictions}</div>
          <div className="mt-1 text-[9px] text-zinc-500 dark:text-rdark-text2">进行中</div>
        </button> */}
      </div>
    </div>
  );
};
