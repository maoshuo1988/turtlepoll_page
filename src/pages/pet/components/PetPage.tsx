/**
 * 文件说明：Pet Page，宠物系统页面组件。
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Zap,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { PetChat } from '@/components/common/pet/PetChat';
import { hasDisplayPetRarity, hasEquippedPetInfo } from '@/components/common/pet/petEquip';
import { PetAssetPreview } from '@/components/common/pet/PetAssetPreview';
import { pickPetAvatarUrl } from '@/components/common/pet/petPreviewAsset';
import type { AiPushMessage } from '@/hooks/aiTypes';
import type {
  PetInfo,
  PetSkin,
} from '@/components/common/pet/petTypes';
import type { OwnedPetItem, PetEquipInfo, PetStaminaResponse, PetStatusResponse } from '@/hooks/petTypes';
import { getPetRarityBadgeClass, getPetRarityTextClass, normalizePetRarityGrade } from '@/components/common/pet/petRarity';
import { getTurtleAbility } from './petAbilities';
import {
  formatBeijingDateTime,
  getPetApiErrorMessage,
  getPetStatusAiText,
} from '@/utils/petHelpers';
import { useIsMobileViewport, usePetSceneIsNight } from '@/utils/petSceneBackground';
import { getPetIdleDialogues } from '@/components/common/pet/petDialogue';

const PET_PAGE_SCENE_BG_SUN = '/image/gui-bg-sun.png';
const PET_PAGE_SCENE_BG_MOON = '/image/gui-bg-moon.png';
const PET_PAGE_SCENE_BG_SUN_MOBILE = '/image/gui-bg1-sun.png';
const PET_PAGE_SCENE_BG_MOON_MOBILE = '/image/gui-bg1-moon.png';

const DEFAULT_PET_DISPLAY_INFO: PetInfo = {
  name: '基础小龟',
  status: '状态稳定',
  level: 1,
  avatar: '🐢',
  stamina: 0,
  maxStamina: 0,
};

type PetTab = 'status' | 'species' | 'abilities' | 'aiChat';

const TAB_LIST: { key: PetTab; label: string; icon: React.ReactNode; mobileOnly?: boolean }[] = [
  { key: 'status', label: '状态', icon: <Heart size={14} /> },
  { key: 'species', label: '龟种', icon: <Shield size={14} /> },
  { key: 'abilities', label: '能力', icon: <Zap size={14} /> },
  { key: 'aiChat', label: 'AI对话', icon: <MessageCircle size={14} />, mobileOnly: true },
];

const card = 'rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

interface PetPageProps {
  pet: PetInfo;
  balance: number;
  winRate: number;
  winStreak: number;
  totalPredictions: number;
  onBack: () => void;
  skins?: PetSkin[];
  onEquipSkin?: (skinId: string) => void;
  equippedPet?: PetEquipInfo | null;
  ownedPets?: OwnedPetItem[];
  petStatus?: PetStatusResponse | null;
  petStaminaInfo?: PetStaminaResponse | null;
  onEquipPet?: (petId: number) => Promise<unknown>;
  equippingPetId?: number | null;
  onStaminaChange?: (newStamina: number) => void;
  /** 与 PC 侧栏一致的 AI 推送，传入 PetChat */
  aiPushMessages?: AiPushMessage[];
}

/* ── Rarity badge ── */
const RarityBadge: React.FC<{ rarity?: string | number | null; size?: 'sm' | 'lg' }> = ({ rarity, size = 'sm' }) => {
  const rarityGrade = normalizePetRarityGrade(rarity);
  const sizeClass = size === 'lg'
    ? 'text-[30px] leading-none tracking-wide drop-shadow-[0_4px_12px_rgba(15,23,42,0.22)] dark:drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]'
    : 'px-1.5 py-0.5 text-[9px]';
  const colorClass = size === 'lg'
    ? getPetRarityTextClass(rarityGrade)
    : getPetRarityBadgeClass(rarityGrade);

  return (
    <span className={`inline-flex items-center justify-center rounded font-extrabold ${sizeClass} ${colorClass}`}>
      {rarityGrade}
    </span>
  );
};

/* ━━━━━━━━━━━━━━━ Status Tab ━━━━━━━━━━━━━━━ */
const StatusTab: React.FC<{
  pet: PetInfo;
  winRate: number;
  winStreak: number;
  totalPredictions: number;
  balance: number;
  equippedPet?: PetEquipInfo | null;
  petStatus?: PetStatusResponse | null;
  petStaminaInfo?: PetStaminaResponse | null;
  equippedPetXp?: number;
  ownedPetsCount?: number;
  onOpenSpeciesManager?: () => void;
}> = ({
  petStatus,
}) => {
  const aiMessages = (petStatus?.ai ?? []).map(getPetStatusAiText).filter(Boolean).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* 心情 & 体力 */}
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">今日状态</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">😊</span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{moodLabel}</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-rdark-text2">
              {petStatus?.daily?.alreadySettled ? '今日登录结算已完成。' : '今日登录结算尚未完成。'}
            </div>
          </div> */}
          {/* <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">⚡</span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{pet.stamina} / {pet.maxStamina}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 dark:bg-rdark-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${staminaPct}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-rdark-text2 mt-1">
              {typeof petStaminaInfo?.regenPerHour === 'number'
                ? `每小时恢复 ${petStaminaInfo.regenPerHour} 点`
                : '体力值'}
            </div>
            {petStaminaInfo?.nextRegenAt ? (
              <div className="mt-1 text-[9px] text-slate-400 dark:text-rdark-text2">
                下次恢复：{formatBeijingDateTime(petStaminaInfo.nextRegenAt)}
              </div>
            ) : null}
          </div> */}
        </div>

        {/* <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-rdark-border dark:bg-rdark-input/40">
            <div className="text-[10px] text-slate-400 dark:text-rdark-text2">当前龟种</div>
            <div className="mt-1 text-[12px] font-bold text-slate-700 dark:text-rdark-text">
              {equippedPet?.petName ?? pet.name}
            </div>
            <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">
              {normalizePetRarityGrade(equippedPet?.rarity)} · Lv.{equippedPet?.level ?? pet.level}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-rdark-border dark:bg-rdark-input/40">
            <div className="text-[10px] text-slate-400 dark:text-rdark-text2">成长与火花</div>
            <div className="mt-1 text-[12px] font-bold text-slate-700 dark:text-rdark-text">
              Spark {petStatus?.spark ?? 0}
            </div>
            <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">
              累计 XP {typeof equippedPetXp === 'number' ? equippedPetXp.toLocaleString() : '-'}
            </div>
          </div>
        </div> */}
      </div>

      {/* <div className={`${card} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">龟种资产</div>
            <div className="mt-1 text-[12px] text-slate-500 dark:text-rdark-text2">
              已接入龟种拥有列表、当前装备和切换装备逻辑
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSpeciesManager}
            className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            去切换龟种
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-rdark-border dark:bg-rdark-input/40">
            <div className="text-[10px] text-slate-400 dark:text-rdark-text2">当前上阵</div>
            <div className="mt-1 text-[12px] font-bold text-slate-700 dark:text-rdark-text">
              {equippedPet?.petName ?? pet.name}
            </div>
            <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">
              {normalizePetRarityGrade(equippedPet?.rarity)} · Lv.{equippedPet?.level ?? pet.level}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-rdark-border dark:bg-rdark-input/40">
            <div className="text-[10px] text-slate-400 dark:text-rdark-text2">已拥有龟种</div>
            <div className="mt-1 text-[12px] font-bold text-slate-700 dark:text-rdark-text">
              {ownedPetsCount} 只
            </div>
            <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">
              点右上角可直接进入切换页
            </div>
          </div>
        </div>
      </div> */}

      {/* {(petStatus?.daily?.lastSettleTime || voteStats.length > 0) && (
        <div className={`${card} p-4`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">状态聚合</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-rdark-border dark:bg-rdark-input/40">
              <div className="text-[10px] text-slate-400 dark:text-rdark-text2">每日结算</div>
              <div className="mt-1 text-[12px] font-bold text-slate-700 dark:text-rdark-text">
                {petStatus?.daily?.alreadySettled ? '今日已完成结算' : '今日尚未结算'}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">
                上次结算：{formatBeijingDateTime(petStatus?.daily?.lastSettleTime)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-rdark-border dark:bg-rdark-input/40">
              <div className="text-[10px] text-slate-400 dark:text-rdark-text2">投票风向</div>
              {voteStats.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {voteStats.map((item) => (
                    <span
                      key={item.key}
                      className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-sm dark:bg-rdark-card dark:text-rdark-text2"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">暂无可展示的聚合统计</div>
              )}
            </div>
          </div>
        </div>
      )} */}

      {aiMessages.length > 0 && (
        <div className={`${card} p-4`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">AI 最近对话</div>
          <div className="space-y-2">
            {aiMessages.map((message, index) => (
              <div
                key={`${index}-${message.slice(0, 12)}`}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-600 dark:border-rdark-border dark:bg-rdark-input/40 dark:text-rdark-text2"
              >
                {message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 战绩概览 */}
      {/* <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">战绩概览</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '余额', value: balance.toLocaleString(), sub: '龟币', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: '胜率', value: `${(winRate * 100).toFixed(0)}%`, sub: '', color: 'text-slate-700 dark:text-rdark-text' },
            { label: '连胜', value: String(winStreak), sub: '🔥', color: 'text-orange-500' },
            { label: '已预测', value: String(totalPredictions), sub: '次', color: 'text-blue-600 dark:text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-rdark-input rounded-lg py-3 text-center">
              <div className={`text-[16px] font-extrabold leading-none mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-400 dark:text-rdark-text2">{s.label} {s.sub}</div>
            </div>
          ))}
        </div>
      </div> */}

      {/* 每日任务速览 */}
      {/* <div className={`${card} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">每日任务</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{completedDaily}/{dailyTasks.length} 已完成</span>
        </div>
        <div className="space-y-2">
          {dailyTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-rdark-hover transition-colors">
              <span className="text-sm shrink-0">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-700 dark:text-rdark-text">{task.title}</div>
                <div className="text-[9px] text-slate-400 dark:text-rdark-text2">{task.description}</div>
              </div>
              {task.completed ? (
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center shrink-0">
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                </span>
              ) : (
                <span className="text-[9px] text-slate-400 dark:text-rdark-text2 shrink-0">{task.progress}/{task.total}</span>
              )}
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
};

const SpeciesTab: React.FC<{
  pet: PetInfo;
  ownedPets?: OwnedPetItem[];
  equippedPet?: PetEquipInfo | null;
  equippingPetId?: number | null;
  onEquipPet?: (petId: number) => Promise<unknown>;
}> = ({
  ownedPets,
  equippingPetId,
  onEquipPet,
}) => {
  const [petActionMessage, setPetActionMessage] = useState<string | null>(null);
  const petList = ownedPets ?? [];

  const handleEquipPetClick = async (petId: number | string) => {
    if (!onEquipPet) return;

    const numericPetId = typeof petId === 'number' ? petId : Number(petId);
    if (!Number.isFinite(numericPetId)) {
      setPetActionMessage('无效的宠物 ID');
      return;
    }

    try {
      const result = await onEquipPet(numericPetId);
      const nextEffectiveAt =
        typeof result === 'object' && result && 'nextEffectiveAt' in result
          ? (result as { nextEffectiveAt?: number | string }).nextEffectiveAt
          : null;
      setPetActionMessage(
        nextEffectiveAt
          ? `龟种切换成功，已同步到当前装备。下次可切换时间：${formatBeijingDateTime(nextEffectiveAt)}`
          : '龟种切换成功，已同步到当前装备。',
      );
    } catch (error) {
      setPetActionMessage(getPetApiErrorMessage(error, '切换失败，请稍后重试。'));
    }
  };

  return (
    <div className="space-y-4">
      {/* <div className={`${card} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">当前龟种</div>
            <div className="mt-1 text-[12px] text-slate-500 dark:text-rdark-text2">这里直接消费装备接口，切换后会自动刷新当前宠物状态。</div>
          </div>
          <div className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-950/20 dark:text-sky-300">
            GET /api/pet/equip
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg dark:border-cyan-900/30 dark:from-cyan-950/20 dark:to-sky-950/20">
          <div className="grid h-16 w-16 place-items-center rounded-xl border border-cyan-100 bg-white text-3xl shadow-sm dark:border-cyan-900/30 dark:bg-rdark-card">
            {getPetDisplayAvatar(currentEquippedPet?.petKey, currentEquippedPet?.petName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="truncate text-[13px] font-bold text-slate-700 dark:text-rdark-text">
                {currentEquippedPet?.petName ?? pet.name}
              </span>
              {currentEquippedPet?.rarity ? <RarityBadge rarity={currentEquippedPet.rarity} /> : null}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-rdark-text2">
              petKey: {currentEquippedPet?.petKey ?? '-'} · Lv.{currentEquippedPet?.level ?? pet.level}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check size={10} /> 装备中
            </div>
          </div>
        </div>
      </div> */}

      {petActionMessage ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] text-zinc-200">
          {petActionMessage}
        </div>
      ) : null}

      <div className={`${card} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">龟种仓库 ({petList.length})</div>
            {/* <div className="mt-1 text-[12px] text-slate-500 dark:text-rdark-text2">点击未装备的龟种即可发起切换，并自动刷新当前上阵状态。</div> */}
          </div>
          {/* <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
            GET /api/pet/owned
          </div> */}
        </div>

        {petList.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {petList.map((ownedPet) => {
              const isPending = equippingPetId != null && equippingPetId === Number(ownedPet.petId);
              const isEquipped = Boolean(ownedPet.isEquipped);

              return (
                <div
                  key={String(ownedPet.petId)}
                  className={`rounded-lg border p-3 transition-all ${
                    isEquipped
                      ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-950/10'
                      : 'border-slate-200 bg-white dark:border-rdark-border dark:bg-rdark-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-rdark-input">
                      <PetAssetPreview
                        avatarUrl={pickPetAvatarUrl(ownedPet.icon, ownedPet.image)}
                        petKey={ownedPet.petKey}
                        petName={ownedPet.petName}
                        size={48}
                        className="mx-auto"
                        imageClassName="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-bold text-slate-700 dark:text-rdark-text">
                        {ownedPet.petName ?? ownedPet.petKey ?? `宠物 ${ownedPet.petId}`}
                      </div>
                      {/* <div className="mt-1 text-[9px] text-slate-500 dark:text-rdark-text2">
                        Lv.{ownedPet.level ?? 1} · XP {ownedPet.xp ?? 0}
                      </div> */}
                      <div className="mt-1 flex items-center gap-1.5">
                        {ownedPet.rarity ? <RarityBadge rarity={ownedPet.rarity} /> : null}
                        <span className={`text-[8px] font-bold ${isEquipped ? 'text-emerald-500' : 'text-cyan-500'}`}>
                          {isEquipped ? '已装备' : isPending ? '切换中...' : '可切换'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleEquipPetClick(ownedPet.petId);
                    }}
                    disabled={!onEquipPet || isPending || isEquipped}
                    className={`mt-3 w-full rounded-lg border px-3 py-2 text-[11px] font-bold shadow-sm transition-all ${
                      isEquipped
                        ? 'cursor-default border-emerald-300/40 bg-emerald-400/14 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/12 dark:text-emerald-300'
                        : 'border-emerald-300/30 bg-emerald-500 text-white shadow-emerald-900/10 hover:border-emerald-200/50 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:border-emerald-400/20 dark:bg-emerald-500/90 dark:text-white dark:hover:bg-emerald-400 dark:disabled:border-rdark-border dark:disabled:bg-rdark-input dark:disabled:text-rdark-text2'
                    }`}
                  >
                    {isEquipped ? '当前装备' : isPending ? '切换中...' : '装备这只龟'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-rdark-border dark:bg-rdark-input/30">
            <div className="text-[12px] font-bold text-slate-700 dark:text-rdark-text">还没有龟种资产</div>
            <div className="mt-1 text-[10px] text-slate-500 dark:text-rdark-text2">等后续获取后，这里会自动展示并支持切换。</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Abilities Tab ━━━━━━━━━━━━━━━ */
const AbilitiesTab: React.FC<{
  pet: PetInfo;
  equippedPet?: PetEquipInfo | null;
}> = ({ pet, equippedPet }) => {
  const currentAbility = getTurtleAbility(equippedPet, pet.name);

  return (
    <div className="space-y-4">
      <div className={`${card} overflow-hidden`}>
        {/* <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 p-4 dark:from-emerald-950/24 dark:via-teal-950/16 dark:to-sky-950/20">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-white text-4xl shadow-sm dark:border-emerald-900/30 dark:bg-rdark-card">
              {avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-black text-slate-800 dark:text-rdark-text">{currentAbility.displayName}</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {currentAbility.displayRarity}
                </span>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/8 dark:text-rdark-text2">
                  Lv.{currentAbility.level}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-rdark-text2">
                龟种ID：{currentAbility.id}
              </div>
            </div>
          </div>
        </div> */}

        <div className="p-4">
          <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">
            <Zap size={11} /> 特殊能力
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/14">
            <div className="text-[13px] font-bold leading-6 text-slate-700 dark:text-rdark-text">
              {currentAbility.description}
            </div>
          </div>
        </div>
      </div>

      {/* <div className={`${card} p-4`}>
        <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">
          <Shield size={11} /> 生效说明
        </div>
        <div className="text-[11px] leading-5 text-slate-500 dark:text-rdark-text2">
          当前页面按正在装备的龟种展示能力。切换龟种后，能力会随装备接口返回的 petKey / petName 自动更新。
        </div>
      </div> */}
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Main PetPage ━━━━━━━━━━━━━━━ */
export const PetPage: React.FC<PetPageProps> = ({
  pet,
  balance,
  winRate,
  winStreak,
  totalPredictions,
  onBack,
  equippedPet,
  ownedPets,
  petStatus,
  petStaminaInfo,
  onEquipPet,
  equippingPetId,
  onStaminaChange,
  aiPushMessages = [],
}) => {
  const [activeTab, setActiveTab] = useState<PetTab>('status');
  const idleDialogues = useMemo(() => getPetIdleDialogues(petStatus), [petStatus]);
  const [currentDialogue, setCurrentDialogue] = useState(idleDialogues[0] ?? '');
  const [dialogueKey, setDialogueKey] = useState(0);
  const equippedOwnedPet = ownedPets?.find((item) => item.isEquipped) ?? null;
  const displayPet = useMemo<PetInfo>(() => ({
    name: pet.name || equippedPet?.petName || equippedOwnedPet?.petName || DEFAULT_PET_DISPLAY_INFO.name,
    status: pet.status || DEFAULT_PET_DISPLAY_INFO.status,
    level: pet.level || equippedPet?.level || equippedOwnedPet?.level || DEFAULT_PET_DISPLAY_INFO.level,
    avatar: pet.avatar || DEFAULT_PET_DISPLAY_INFO.avatar,
    stamina: pet.stamina,
    maxStamina: pet.maxStamina,
  }), [
    equippedOwnedPet?.level,
    equippedOwnedPet?.petName,
    equippedPet?.level,
    equippedPet?.petName,
    pet.avatar,
    pet.level,
    pet.maxStamina,
    pet.name,
    pet.stamina,
    pet.status,
  ]);
  const equippedAvatarUrl = pickPetAvatarUrl(equippedPet?.icon, equippedPet?.image);
  const showEquippedPetHero = hasEquippedPetInfo(equippedPet);
  const isNightScene = usePetSceneIsNight();
  const isMobileViewport = useIsMobileViewport();
  const sceneBgSrc = isMobileViewport
    ? (isNightScene ? PET_PAGE_SCENE_BG_MOON_MOBILE : PET_PAGE_SCENE_BG_SUN_MOBILE)
    : (isNightScene ? PET_PAGE_SCENE_BG_MOON : PET_PAGE_SCENE_BG_SUN);

  useEffect(() => {
    setCurrentDialogue(idleDialogues[0] ?? '');
    setDialogueKey((k) => k + 1);

    if (idleDialogues.length <= 1) return undefined;

    const iv = window.setInterval(() => {
      const idx = Math.floor(Math.random() * idleDialogues.length);
      setCurrentDialogue(idleDialogues[idx] ?? '');
      setDialogueKey((k) => k + 1);
    }, 5000);
    return () => window.clearInterval(iv);
  }, [idleDialogues]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncTabForViewport = () => {
      if (mediaQuery.matches && activeTab === 'aiChat') {
        setActiveTab('status');
      }
    };
    syncTabForViewport();
    mediaQuery.addEventListener('change', syncTabForViewport);
    return () => mediaQuery.removeEventListener('change', syncTabForViewport);
  }, [activeTab]);

  return (
    <div className="legacy-pet-page w-full space-y-5">

      {/* ━━━ 上半：宠物形象 & 空间 ━━━ */}
      <div className={`relative ${card} overflow-hidden`}>
            {/* 返回按钮浮层 */}
            <button
              onClick={onBack}
              className="absolute top-3 left-3 z-30 p-2 rounded-lg bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm hover:bg-white dark:hover:bg-rdark-card transition-colors border border-white/40 dark:border-rdark-border/50 shadow-sm cursor-pointer text-slate-500 dark:text-rdark-text2"
            >
              <ArrowLeft size={16} />
            </button>

            {/* 2D 全宽场景 */}
            <div className="relative h-[340px] overflow-hidden">
              <img
                src={sceneBgSrc}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />

              {/* Pet character — centered */}
              <div className="absolute bottom-[12px] left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                {showEquippedPetHero ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={dialogueKey}
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.9 }}
                        className="relative mb-3 max-w-[260px] px-5 py-2.5 rounded-xl bg-white/90 dark:bg-rdark-card/90 shadow-lg border border-white/60 dark:border-rdark-border text-center backdrop-blur-sm"
                      >
                        <span className="text-[12px] text-slate-600 dark:text-rdark-text leading-snug block">
                          {currentDialogue}
                        </span>
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 dark:bg-rdark-card/90 rotate-45 border-r border-b border-white/60 dark:border-rdark-border" />
                      </motion.div>
                    </AnimatePresence>

                    <PetAssetPreview
                      avatarUrl={equippedAvatarUrl}
                      petKey={equippedPet?.petKey}
                      petName={equippedPet?.petName ?? displayPet.name}
                      size={180}
                      className="drop-shadow-[0_14px_24px_rgba(15,23,42,0.24)]"
                      imageClassName="object-contain drop-shadow-[0_14px_24px_rgba(15,23,42,0.24)]"
                    />
                  </>
                ) : null}

                {/* Name + level */}
                {/* <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 drop-shadow-sm">{pet.name}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/80 text-white font-bold shadow-sm">
                    Lv.{pet.level}
                  </span>
                </div> */}
              </div>

            

              {/* Mood & Stamina — top-left glass panels */}
              <div className="absolute top-3 left-14 z-10 flex gap-2">
                {/* <div className="flex items-center gap-2 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/40 dark:border-rdark-border/50">
                  <span className="text-[14px]">😊</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">心情</span>
                    <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 leading-tight">{getPetMoodLabel(petStatus?.moodState)}</span>
                  </div>
                </div> */}
                {/* <div className="flex items-center gap-2 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/40 dark:border-rdark-border/50">
                  <span className="text-[14px]">⚡</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">体力</span>
                    <div className="flex items-center gap-1">
                      <div className="w-[48px] h-[6px] bg-slate-200/80 dark:bg-rdark-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${staminaPct}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                        />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">{pet.stamina}</span>
                    </div>
                  </div>
                </div> */}
              </div>

              {/* Pet info — top-left glass panel */}
              
              {showEquippedPetHero && hasDisplayPetRarity(equippedPet?.rarity) ? (
                <div className="absolute top-3 left-16 z-10">
                  <RarityBadge rarity={equippedPet?.rarity} size="lg" />
                </div>
              ) : null}
                {/* <div className="bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/40 dark:border-rdark-border/50 flex items-center gap-3">
                  <div>
                    <div className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none mb-0.5">稀有度</div>
                    <RarityBadge rarity={equippedPet?.rarity} size="lg" />
                  </div>
                  <div className="w-px h-6 bg-slate-200/60 dark:bg-rdark-border/40" />
                  <div>
                    <div className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none mb-0.5">性格</div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-rdark-text">{getPetMoodLabel(petStatus?.moodState)}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200/60 dark:bg-rdark-border/40" />
                  <div>
                    <div className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none mb-0.5">天赋</div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Spark {petStatus?.spark ?? 0}</span>
                  </div>
                </div> */}

              {/* Chat button — bottom center */}
              {/* <button
                onClick={() => setChatOpen(true)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-6 py-2.5 rounded-full text-[12px] font-bold cursor-pointer transition-all bg-white/80 dark:bg-rdark-card/80 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-rdark-card border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-2 shadow-lg backdrop-blur-md hover:scale-105 hover:shadow-xl"
              >
                <MessageCircle size={14} /> 和{pet.name}聊聊
              </button> */}

              {/* XP bar — bottom overlay */}
              {/* <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 w-[260px]">
                <div className="bg-white/60 dark:bg-rdark-card/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30 dark:border-rdark-border/30 shadow-sm">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] text-slate-500 dark:text-rdark-text2">EXP</span>
                    <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">{xpValue.toLocaleString()} XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/60 dark:bg-rdark-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpBarWidth}%` }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              </div> */}
            </div>
      </div>

      {/* ━━━ 下半：Tab 面板 ━━━ */}
      <div>
        {/* Tab bar */}
        <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-[#14151a]">
          {TAB_LIST.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border-0 px-1.5 py-2 text-[11px] font-medium transition-all sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-[12px] ${
                tab.mobileOnly ? 'lg:hidden' : ''
              } ${
                activeTab === tab.key
                  ? 'bg-emerald-500/15 font-semibold text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-transparent text-slate-500 hover:bg-white/70 dark:text-zinc-500 dark:hover:bg-white/[0.06]'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'status' && (
              <StatusTab
                pet={displayPet}
                winRate={winRate}
                winStreak={winStreak}
                totalPredictions={totalPredictions}
                balance={balance}
                equippedPet={equippedPet}
                petStatus={petStatus}
                petStaminaInfo={petStaminaInfo}
                equippedPetXp={equippedOwnedPet?.xp}
                ownedPetsCount={ownedPets?.length ?? 0}
                onOpenSpeciesManager={() => setActiveTab('species')}
              />
            )}
            {activeTab === 'species' && (
              <SpeciesTab
                pet={displayPet}
                ownedPets={ownedPets}
                equippedPet={equippedPet}
                equippingPetId={equippingPetId}
                onEquipPet={onEquipPet}
              />
            )}
            {activeTab === 'abilities' && <AbilitiesTab pet={displayPet} equippedPet={equippedPet} />}
            {activeTab === 'aiChat' && (
              <div className={`${card} overflow-hidden p-0 lg:hidden`}>
                <PetChat
                  pet={displayPet}
                  embedded
                  onClose={() => setActiveTab('status')}
                  stamina={displayPet.stamina}
                  onStaminaChange={onStaminaChange}
                  aiPushMessages={aiPushMessages}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
