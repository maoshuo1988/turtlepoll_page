/** 文件说明：PC 左侧栏一体化宠物面板（场景、龟币、战绩四格）。 */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Coins, Flame } from 'lucide-react';
import { hasDisplayPetRarity, hasEquippedPetInfo } from '@/components/common/pet/petEquip';
import { getPetRarityBadgeClass, normalizePetRarityGrade } from '@/components/common/pet/petRarity';
import { PetAssetPreview } from '@/components/common/pet/PetAssetPreview';
import { pickPetAvatarUrl } from '@/components/common/pet/petPreviewAsset';
import { usePetSceneIsNight } from '@/utils/petSceneBackground';

const PET_SCENE_BG_SUN = '/image/gui-bg1-sun.png';
const PET_SCENE_BG_MOON = '/image/gui-bg1-moon.png';

/** 面板内展示的上阵宠物字段（与全局 PetInfo 的展示子集对齐）。 */
export interface SidebarPetProfilePet {
  name: string;
  rarityKey?: string | number;
  level: number;
  /** emoji 或可直接渲染的短字符串 */
  avatar: string;
  petKey?: string;
  petId?: number | string;
  icon?: string;
  image?: string;
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
  activePredictions: _activePredictions,
  pet,
  currentDialogue,
  dialogueKey,
  onViewPet,
  onOpenActivePredictions: _onOpenActivePredictions,
  petBadgeName = '寒冰龟',
  petBadgeIcon: _petBadgeIcon = '❄️',
}) => {
  const isNightScene = usePetSceneIsNight();
  const showEquippedPet = hasEquippedPetInfo(pet);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-400/22 bg-gradient-to-b from-[#0c1318] via-[#0e1a18] to-[#0a1614] shadow-[0_14px_34px_rgba(0,0,0,0.36)] dark:border-emerald-500/25">
      <div className="flex items-center justify-between gap-2 border-b border-white/6 bg-gradient-to-r from-sky-500/18 via-cyan-500/10 to-emerald-500/8 px-3 py-2 backdrop-blur dark:border-white/8">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* <CommonSpine
            width={16}
            height={16}
            fallback={pet.avatar}
            padding={1}
            offsetY={0}
            className="pointer-events-none shrink-0"
          /> */}
          <span className="truncate text-[13px] font-bold text-sky-100 [text-shadow:0_0_8px_rgba(125,211,252,0.4)] dark:text-sky-50">
            {petBadgeName}
          </span>
          {hasDisplayPetRarity(pet.rarityKey) ? (
            <span className={`shrink-0 inline-flex rounded-full px-1.5 py-[1px] text-[9px] font-black ${getPetRarityBadgeClass(pet.rarityKey)}`}>
              {normalizePetRarityGrade(pet.rarityKey)}
            </span>
          ) : null}
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
        <img
          src={isNightScene ? PET_SCENE_BG_MOON : PET_SCENE_BG_SUN}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {showEquippedPet ? (
          <div className="absolute bottom-[4px] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
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
            <PetAssetPreview
              avatarUrl={pickPetAvatarUrl(pet.icon, pet.image)}
              petKey={pet.petKey}
              petName={pet.name}
              size={120}
              className="pointer-events-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
              imageClassName="object-contain pointer-events-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
            />
          </div>
        ) : null}


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
