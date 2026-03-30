import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Flame, MessageCircle } from 'lucide-react';
import { PetChat } from '../../shared/pet/ui/PetChat';
import type { PetInfo } from '@/data/mock_data';
import { useRequestCoinMe } from '@/hook/useCoinRequest';

interface SidebarProfileCardProps {
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

export const SidebarProfileCard: React.FC<SidebarProfileCardProps> = ({
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
  // 直接订阅全局金币缓存，其他地方只要更新 coinMe，这里会自动同步
  const coinMe = useRequestCoinMe();
  const displayBalance = coinMe.data?.balance ?? 0;

  return (
    <div className={
      `rounded-xl 
        bg-[#0f1013] 
        dark:bg-rdark-card 
        border 
        border-white/8 
        dark:border-rdark-border 
        shadow-[0_12px_28px_rgba(0,0,0,0.24)] 
        dark:shadow-none 
        overflow-hidden
        xl:rounded-none
        xl:border-x-0
        xl:border-t-0
        xl:shadow-none`
    }>
      {chatOpen ? (
        <PetChat pet={pet} onClose={onCloseChat} />
      ) : (
        <div>
          <div className="!px-4 !pt-4 !pb-4 border-b border-white/8 bg-[#0f1013]/96 dark:bg-rdark-card/90">
            <div className='flex flex-col !mb-4'>
              <button
                onClick={onOpenProfile}
                className="mb-3.5 flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent p-0 text-left transition-all hover:border-white/8 hover:bg-white/[0.03]"
              >
                <div className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#1c1d22] to-[#0f1013] text-xl font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">🦊</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-white dark:text-rdark-text">路边社社长</div>
                  <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-rdark-text2">预测达人 · 连续签到 12 天</div>
                </div>
              </button>

              <div className="mb-3.5 rounded-xl border border-white/6 bg-[#141518] px-3 py-2.5 dark:bg-rdark-input/75">
                <div className="flex items-center justify-center gap-2">
                  <Coins size={17} className="text-emerald-500 dark:text-emerald-400" />
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={displayBalance}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="text-[32px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight leading-none"
                    >
                      {displayBalance.toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                  <span className="mb-0.5 self-end text-[11px] text-zinc-500 dark:text-rdark-text2">龟币</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-[#141518] !py-2.5 text-center dark:bg-rdark-input">
                <div className="mb-1 text-[15px] font-bold leading-none text-white dark:text-rdark-text">{(winRate * 100).toFixed(0)}%</div>
                <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">胜率</div>
              </div>
              <div className="rounded-lg bg-[#141518] !py-2.5 text-center dark:bg-rdark-input">
                <div className="mb-1 flex items-center justify-center gap-0.5 text-[15px] font-bold leading-none text-emerald-600 dark:text-emerald-400">
                  <Flame size={12} className="text-orange-400" />{winStreak}
                </div>
                <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">连胜</div>
              </div>
              <div className="rounded-lg bg-[#141518] !py-2.5 text-center dark:bg-rdark-input">
                <div className="mb-1 text-[15px] font-bold leading-none text-white dark:text-rdark-text">{totalPredictions}</div>
                <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">已预测</div>
              </div>
              <button
                type="button"
                onClick={onOpenActivePredictions}
                className="rounded-lg bg-[#141518] !py-2.5 text-center transition-colors hover:bg-[#1a1c20] dark:bg-rdark-input dark:hover:bg-rdark-hover"
              >
                <div className="mb-1 text-[15px] font-bold leading-none text-zinc-200 dark:text-zinc-200">{activePredictions}</div>
                <div className="text-[9px] text-zinc-500 dark:text-rdark-text2">进行中</div>
              </button>
            </div>
          </div>

          <div className="relative h-[194px] overflow-hidden cursor-pointer group" onClick={onViewPet}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#16171b] via-[#111214] to-[#090909]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

            <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-3 right-6">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-slate-300 dark:to-slate-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] dark:shadow-[0_0_12px_rgba(203,213,225,0.2)]" />
            </motion.div>

            <motion.div animate={{ x: [-10, 40, -10] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute top-4 left-2"><div className="relative"><div className="w-14 h-4 bg-white/60 dark:bg-white/8 rounded-full" /><div className="absolute -top-1.5 left-3 w-8 h-4 bg-white/50 dark:bg-white/6 rounded-full" /><div className="absolute -top-0.5 left-8 w-5 h-3 bg-white/40 dark:bg-white/5 rounded-full" /></div></motion.div>
            <motion.div animate={{ x: [10, -25, 10] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} className="absolute top-9 right-4"><div className="relative"><div className="w-10 h-3 bg-white/45 dark:bg-white/6 rounded-full" /><div className="absolute -top-1 left-2 w-6 h-3 bg-white/35 dark:bg-white/5 rounded-full" /></div></motion.div>
            <motion.div animate={{ x: [0, 20, 0] }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} className="absolute top-14 left-1/4"><div className="w-8 h-2.5 bg-white/30 dark:bg-white/4 rounded-full" /></motion.div>

            <div className="absolute bottom-[52px] left-0 right-0 h-[30px]"><svg viewBox="0 0 260 30" className="w-full h-full" preserveAspectRatio="none"><path d="M0 30 Q30 8 65 18 Q100 5 130 14 Q165 2 195 12 Q225 6 260 16 L260 30 Z" className="fill-white/6" /></svg></div>
            <div className="absolute bottom-0 left-0 right-0 h-[50px]"><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-white/5" /><svg viewBox="0 0 260 12" className="absolute -top-1 left-0 w-full h-3" preserveAspectRatio="none"><path d="M0 12 Q8 4 16 8 Q24 2 32 7 Q40 3 48 8 Q56 1 64 6 Q72 3 80 8 Q88 2 96 7 Q104 4 112 8 Q120 1 128 6 Q136 3 144 8 Q152 2 160 7 Q168 4 176 8 Q184 1 192 6 Q200 3 208 8 Q216 2 224 7 Q232 4 240 8 Q248 2 260 6 L260 12 Z" className="fill-white/8" /></svg>
              <div className="absolute bottom-[8px] left-3 flex gap-[2px] items-end"><div className="h-[10px] w-[3px] rounded-t-full bg-white/10 -rotate-6" /><div className="h-[13px] w-[2px] rounded-t-full bg-white/12" /><div className="h-[9px] w-[3px] rounded-t-full bg-white/10 rotate-6" /></div>
              <div className="absolute bottom-[8px] left-12 flex gap-[2px] items-end"><div className="h-[8px] w-[2px] rounded-t-full bg-white/9 -rotate-3" /><div className="h-[11px] w-[3px] rounded-t-full bg-white/10 rotate-2" /></div>
              <div className="absolute bottom-[8px] right-5 flex gap-[2px] items-end"><div className="h-[11px] w-[3px] rounded-t-full bg-white/10 -rotate-4" /><div className="h-[14px] w-[2px] rounded-t-full bg-white/12 rotate-2" /><div className="h-[9px] w-[2px] rounded-t-full bg-white/8 rotate-8" /></div>
              <div className="absolute bottom-[8px] right-16 flex gap-[2px] items-end"><div className="h-[7px] w-[2px] rounded-t-full bg-white/8" /><div className="h-[10px] w-[3px] rounded-t-full bg-white/10 -rotate-3" /></div>
              <div className="absolute bottom-[6px] left-[45%] h-1.5 w-3 rounded-full bg-white/12" /><div className="absolute bottom-[5px] left-[30%] h-1 w-2 rounded-full bg-white/8" />
            </div>

            <motion.div animate={{ y: [0, 60, 0], x: [0, 8, -5, 0], opacity: [0, 0.7, 0.7, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0 }} className="absolute top-6 left-[20%] w-1 h-1 rounded-full bg-amber-300/60 dark:bg-amber-400/40" />
            <motion.div animate={{ y: [0, 50, 0], x: [0, -6, 4, 0], opacity: [0, 0.5, 0.5, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }} className="absolute top-4 left-[65%] w-1 h-1 rounded-full bg-pink-300/50 dark:bg-pink-400/30" />
            <motion.div animate={{ y: [0, 45, 0], x: [0, 5, -3, 0], opacity: [0, 0.6, 0.6, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 4 }} className="absolute top-8 left-[45%] w-0.5 h-0.5 rounded-full bg-amber-200/70 dark:bg-amber-300/40" />

            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[44px] left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
              <AnimatePresence mode="wait">
                <motion.div key={dialogueKey} initial={{ opacity: 0, y: 5, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.9 }} className="relative mb-2 max-w-[180px] px-3 py-1.5 rounded-xl bg-white/90 dark:bg-rdark-card/90 shadow-lg border border-white/60 dark:border-rdark-border text-center backdrop-blur-sm">
                  <span className="text-[10px] text-slate-600 dark:text-rdark-text leading-snug block truncate">{currentDialogue}</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-rdark-card/90 rotate-45 border-r border-b border-white/60 dark:border-rdark-border" />
                </motion.div>
              </AnimatePresence>
              <div className="text-[48px] leading-none select-none drop-shadow-lg">{pet.avatar}</div>
              <div className="flex items-center gap-1 mt-1"><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 drop-shadow-sm">{pet.name}</span><span className="text-[8px] px-1.5 py-px rounded-full bg-emerald-500/80 text-white font-bold shadow-sm">Lv.{pet.level}</span></div>
            </motion.div>

            <motion.div animate={{ scale: [1, 0.9, 1], opacity: [0.15, 0.1, 0.15] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[38px] left-1/2 -translate-x-1/2 w-14 h-2.5 bg-black/15 dark:bg-black/25 rounded-full blur-[2px] z-0" />

            <div className="absolute top-2.5 left-2.5 z-10 flex  gap-2">
              <div className="!px-4 !py-2 flex items-center gap-1.5 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/40 dark:border-rdark-border/50">
                <span className="text-[11px]">😊</span>
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">心情</span>
                  <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 leading-tight">开心</span>
                </div>
              </div>
              <div className="!px-3 !py-2 flex items-center gap-1.5 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/40 dark:border-rdark-border/50">
                <span className="text-[11px]">⚡</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">体力</span>
                  <div className="flex items-center gap-1">
                    <div className="w-[38px] h-[5px] bg-slate-200/80 dark:bg-rdark-border rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ duration: 1, delay: 0.3 }} className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
                    </div>
                    <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">78</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onOpenChat(); }} className="!px-4.5 !py-2 absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20  rounded-xl text-[11px] font-bold cursor-pointer transition-all bg-white/50 dark:bg-rdark-card/50 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-rdark-card border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1.5 shadow-lg backdrop-blur-md hover:scale-105 hover:shadow-xl whitespace-nowrap">
              <MessageCircle size={13} /> 和龟仙人聊聊
            </button>

            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"><div className="bg-white/80 dark:bg-rdark-card/80 backdrop-blur-sm rounded-md px-2 py-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/40 dark:border-emerald-800/40">进入宠物空间 →</div></div>
          </div>
        </div>
      )}
    </div>
  );
};
