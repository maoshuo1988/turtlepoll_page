/**
 * 文件说明：Shop，商城黑市相关共享组件。
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import type { PetInfo, ShopItem } from '@/data/mockData';
import {
  shopApples,
} from '@/data/mockData';
import { useRequestPetEggHatch, useRequestPetOwned, useRequestPetStaminaFeed } from '@/hooks/usePetRequests';
import type { PetEggHatchResponse, PetStaminaResponse } from '@/hooks/petTypes';
import { getPetDisplayAvatar } from '../../pet/ui/petDisplay';
import { getPetApiErrorMessage, isAuthError } from '@/utils/petHelpers';

const card =
  'rounded-[24px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,15,31,0.96),rgba(6,12,24,0.98))] shadow-[0_14px_40px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl';

/* ── Types ── */
type HatchPhase = 'idle' | 'heating' | 'cracking' | 'breaking' | 'reveal';

interface ShopProps {
  balance: number;
  pet: PetInfo;
  petStaminaInfo?: PetStaminaResponse | null;
  onBack: () => void;
  onRequireAuth?: () => void;
}

const GACHA_COST = 100;
const SHOP_BG = '/shop/bg.png';
const APPLE_IMAGE_BY_ITEM: Record<string, string> = {
  apple1: '/shop/apple.png',
  apple2: '/shop/apple1.png',
  apple3: '/shop/apple2.png',
};
const STAMINA_SHOP_META: Record<string, { title: string; frame: string; pill: string }> = {
  apple1: { title: '小苹果', frame: 'border-[#b86cff] bg-[linear-gradient(180deg,#5e2ea3,#2d185f)]', pill: 'border-[#8458dc] bg-[linear-gradient(180deg,#1f2147,#111528)]' },
  apple2: { title: '大苹果', frame: 'border-[#4ea0ff] bg-[linear-gradient(180deg,#1e5fa7,#16234d)]', pill: 'border-[#3d82d8] bg-[linear-gradient(180deg,#182e63,#101525)]' },
  apple3: { title: '黄金苹果', frame: 'border-[#d8b74c] bg-[linear-gradient(180deg,#8f6d17,#3e2d14)]', pill: 'border-[#b9962f] bg-[linear-gradient(180deg,#3a3018,#1d170f)]' },
};
function getDailyResetCountdown() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const diff = Math.max(0, next.getTime() - now.getTime());
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
const RECORD_IMAGE_BY_INDEX = ['/shop/r1.png', '/shop/r2.png', '/shop/r3.png', '/shop/r4.png'];
const RARITY_ICON_BY_LABEL: Record<string, string> = {
  普通: '/shop/xing4.png',
  稀有: '/shop/xing3.png',
  史诗: '/shop/xing2.png',
  传说: '/shop/xing1.png',
};
const PET_POOL_PREVIEW_NAMES = ['凤凰龟', '双头龟', '基础小龟', '天使龟', '宝箱龟', '寒冰龟', '幽灵龟', '彩虹龟', '忍者龟', '无头龟', '星际龟', '气泡龟', '水晶龟', '海盗龟', '熔岩龟', '猎人龟', '石头龟', '竹叶龟', '糖果龟', '线条龟', '缩头乌龟', '财神龟', '赌神龟', '赛博龟', '钻石龟', '闪电龟', '骰子龟', '龟壳',];
const FEED_COUNT_BY_ITEM: Record<string, number> = {
  apple1: 1,
  apple2: 2,
  apple3: 3,
};

function getRarityBadgeClass(rarity?: string) {
  switch (rarity) {
    case 'SSR':
    case 'SS':
    case 'SSS':
      return 'bg-amber-50 text-amber-500 dark:bg-amber-500/10';
    case 'SR':
      return 'bg-violet-50 text-violet-500 dark:bg-violet-500/10';
    case 'R':
      return 'bg-blue-50 text-blue-500 dark:bg-blue-500/10';
    default:
      return 'bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-rdark-text2';
  }
}

/* ═══════════════════════ Main Component ═══════════════════════ */
export const Shop: React.FC<ShopProps> = ({
  balance,
  pet,
  onBack,
  onRequireAuth,
}) => {
  const [phase, setPhase] = useState<HatchPhase>('idle');
  const [hatchResult, setHatchResult] = useState<PetEggHatchResponse | null>(null);
  const [tempGlow, setTempGlow] = useState(0); // 0-100 temperature bar
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const previewDragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const ownedPetsScrollRef = useRef<HTMLDivElement | null>(null);
  const ownedPetsDragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [buyFlash, setBuyFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(getDailyResetCountdown());
  const [dailyBuyCount, setDailyBuyCount] = useState(0);
  const hatchMutation = useRequestPetEggHatch();
  const ownedPetsQuery = useRequestPetOwned();
  const feedMutation = useRequestPetStaminaFeed();

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  /* ── Gacha logic ── */
  const doGacha = useCallback(() => {
    if (phase !== 'idle' || hatchMutation.isLoading) return;
    clearTimers();
    setActionError(null);
    setActionSuccess(null);
    setHatchResult(null);

    // Phase sequence
    setPhase('heating');
    setTempGlow(0);

    // Animate temperature 0→100 over 1s
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      timerRef.current.push(
        setTimeout(() => setTempGlow(Math.round((i / steps) * 100)), (i / steps) * 1000),
      );
    }

    timerRef.current.push(setTimeout(() => setPhase('cracking'), 1000));
    timerRef.current.push(setTimeout(() => setPhase('breaking'), 2000));
    timerRef.current.push(
      setTimeout(async () => {
        setPhase('reveal');
        try {
          const result = await hatchMutation.mutateAsync();
          setHatchResult(result);
          setActionSuccess(
            result.isDuplicate
              ? `开蛋完成，实际扣费 ${result.cost}，重复返还 ${result.refund}，当前余额 ${typeof result.balanceAfter === 'number' ? result.balanceAfter.toLocaleString() : '已更新'}。`
              : `开蛋完成，获得 ${result.pet.name ?? result.pet.petKey ?? '新龟种'}，实际扣费 ${result.cost}。`,
          );
        } catch (error) {
          setPhase('idle');
          setActionError(getPetApiErrorMessage(error, '开蛋失败，请稍后重试。'));
          if (isAuthError(error)) {
            onRequireAuth?.();
          }
        }
      }, 2500),
    );
  }, [clearTimers, hatchMutation, onRequireAuth, phase]);

  const resetGacha = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setHatchResult(null);
    setTempGlow(0);
    setActionError(null);
    setActionSuccess(null);
  }, [clearTimers]);

  /* ── Buy apple ── */
  const buyApple = useCallback(
    async (item: ShopItem) => {
      if (dailyBuyCount >= 3) {
        setActionError('今日购买次数已用完，0点重置。');
        return;
      }
      if (pet.stamina >= pet.maxStamina || feedMutation.isLoading) return;
      setActionError(null);
      setActionSuccess(null);

      try {
        const result = await feedMutation.mutateAsync({
          count: FEED_COUNT_BY_ITEM[item.id] ?? 1,
        });
        setBuyFlash(item.id);
        setActionSuccess(
          `喂食成功，当前体力 ${result.current ?? '-'} / ${result.cap ?? '-'}，${typeof result.xp === 'number' ? `获得 XP ${result.xp}` : '成长已同步'
          }。`,
        );
        setDailyBuyCount((count) => Math.min(count + 1, 3));
        setTimeout(() => setBuyFlash(null), 600);
      } catch (error) {
        setActionError(getPetApiErrorMessage(error, '喂食失败，请稍后重试。'));
        if (isAuthError(error)) {
          onRequireAuth?.();
        }
      }
    },
    [dailyBuyCount, feedMutation, onRequireAuth, pet.maxStamina, pet.stamina],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextValue = getDailyResetCountdown();
      setResetCountdown(nextValue);
      if (nextValue === '00:00:00') setDailyBuyCount(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshStaminaShop = useCallback(() => {
    setDailyBuyCount(0);
    setActionError(null);
    setActionSuccess('体力商店已刷新，购买次数已恢复。');
  }, []);

  const handlePreviewMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !previewScrollRef.current) return;
    previewDragRef.current = { active: true, startX: event.clientX, scrollLeft: previewScrollRef.current.scrollLeft };
  }, []);
  const handlePreviewMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!previewDragRef.current.active || !previewScrollRef.current) return;
    event.preventDefault();
    previewScrollRef.current.scrollLeft = previewDragRef.current.scrollLeft - (event.clientX - previewDragRef.current.startX);
  }, []);
  const stopPreviewDrag = useCallback(() => {
    previewDragRef.current.active = false;
  }, []);

  const handleOwnedPetsMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !ownedPetsScrollRef.current) return;
    ownedPetsDragRef.current = { active: true, startX: event.clientX, scrollLeft: ownedPetsScrollRef.current.scrollLeft };
  }, []);
  const handleOwnedPetsMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!ownedPetsDragRef.current.active || !ownedPetsScrollRef.current) return;
    event.preventDefault();
    ownedPetsScrollRef.current.scrollLeft = ownedPetsDragRef.current.scrollLeft - (event.clientX - ownedPetsDragRef.current.startX);
  }, []);
  const stopOwnedPetsDrag = useCallback(() => {
    ownedPetsDragRef.current.active = false;
  }, []);

  const ownedPetList = ownedPetsQuery.data?.list ?? [];
  const featuredPets = ownedPetList.slice(0, 5);
  const heroAvatar = hatchResult ? getPetDisplayAvatar(hatchResult.pet.petKey, hatchResult.pet.name) : '🥚';
  const heroName = hatchResult?.pet.name ?? hatchResult?.pet.petKey ?? '极光蛋池';
  const probabilityRows = [
    { label: '传说', value: '1.00%', tone: 'text-amber-300' },
    { label: '史诗', value: '5.00%', tone: 'text-fuchsia-300' },
    { label: '稀有', value: '20.00%', tone: 'text-sky-300' },
    { label: '普通', value: '74.00%', tone: 'text-lime-300' },
  ];
  const petPoolPreviewItems = PET_POOL_PREVIEW_NAMES.map((petName, index) => ({
    petName,
    rarity: ['传说', '史诗', '稀有', '稀有', '普通', '普通'][index % 6],
  }));
  const recordRows = [
    { name: heroName, ago: '刚刚', rarity: '传说' },
    { name: featuredPets[1]?.petName ?? '星眸少女', ago: '5分钟前', rarity: '史诗' },
    { name: featuredPets[2]?.petName ?? '钢铁爬爬', ago: '8分钟前', rarity: '稀有' },
    { name: featuredPets[3]?.petName ?? '西瓜巨人', ago: '15分钟前', rarity: '普通' },
    { name: featuredPets[4]?.petName ?? '熔岩巨壳', ago: '23分钟前', rarity: '稀有' },
    { name: '钻石龟', ago: '31分钟前', rarity: '史诗' },
  ].map((item, index) => ({ ...item, image: RECORD_IMAGE_BY_INDEX[index % RECORD_IMAGE_BY_INDEX.length] ?? RECORD_IMAGE_BY_INDEX[0] }));

  return (
    <div className="legacy-shop-page space-y-3 px-4 md:space-y-5 md:px-0 !mt-3 md:!mt-4">
      <div className="grid gap-4 md:hidden">
        <section className={`${card} relative overflow-hidden !bg-transparent !px-0 !py-0`}>
          <img src={SHOP_BG} alt="黑市背景" className="absolute inset-0 h-full w-full object-cover opacity-100" />
          <div className="relative px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[22px] font-black text-white">宠物抽奖</div>
                <div className="mt-1 text-[12px] text-white/76">极光之力，守护你的每一次召唤!</div>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-[#08192f]/90 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">奖池预览</div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
              <div className="text-[72px] leading-none">{heroAvatar}</div>
              <div className="flex items-end gap-2">
                <div className="flex h-[94px] w-[62px] items-center justify-center rounded-b-[28px] rounded-t-[40px] border border-white/15 bg-[linear-gradient(180deg,#edf4ff,#b8d7ff)] text-[34px]">🥚</div>
                <div className="flex h-[110px] w-[76px] items-center justify-center rounded-b-[34px] rounded-t-[48px] border border-[#ffde7d]/25 bg-[linear-gradient(180deg,#f4de88,#bf7d17)] text-[42px]">🥚</div>
                <div className="flex h-[94px] w-[62px] items-center justify-center rounded-b-[28px] rounded-t-[40px] border border-violet-300/20 bg-[linear-gradient(180deg,#7b61d6,#4e348f)] text-[34px]">🥚</div>
              </div>
            </div>

            {(phase === 'heating' || phase === 'cracking') && (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-rdark-text2">
                  <span>孵化进度</span>
                  <span>{tempGlow}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #3b82f6 0%, #ef4444 100%)',
                      width: `${tempGlow}%`,
                    }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">{shopApples.slice(0, 3).map((item) => <button key={item.id} onClick={() => buyApple(item)} disabled={pet.stamina >= pet.maxStamina} className="rounded-[16px] border border-[#7b5eff]/35 bg-[linear-gradient(180deg,#26173d,#111a2f)] px-2 py-2 text-center"><img src={APPLE_IMAGE_BY_ITEM[item.id]} alt={item.name} className="mx-auto h-12 w-12 object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]" /><div className="mt-1 text-[11px] font-bold text-white">{item.name}</div><div className="mt-1 text-[16px] font-black text-white">+{item.effect.value}</div><div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#0d2216] px-2 py-0.5 text-[10px] font-black text-emerald-300"><Coins size={10} /> {item.price}</div></button>)}</div>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
              {phase === 'idle' ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={doGacha}
                  disabled={hatchMutation.isLoading}
                  className={`flex h-12 items-center justify-center rounded-2xl px-4 text-[15px] font-black text-white transition ${!hatchMutation.isLoading
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_10px_24px_rgba(245,158,11,0.28)]'
                    : 'bg-slate-400 cursor-not-allowed'
                    }`}
                >
                  <Coins size={15} className="mr-1.5" />
                  花 {GACHA_COST} 龟币孵化
                </motion.button>
              ) : phase === 'reveal' ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={resetGacha}
                  className="flex h-12 items-center justify-center rounded-2xl bg-cyan-500 px-4 text-[15px] font-black text-white shadow-[0_10px_24px_rgba(6,182,212,0.24)]"
                >
                  继续孵化
                </motion.button>
              ) : (
                <div className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-[14px] font-bold text-amber-600 dark:bg-white/[0.05] dark:text-amber-400">
                  孵化中...
                </div>
              )}

              <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-[#f8fafc] px-3 text-[12px] font-bold text-slate-600 dark:border-white/10 dark:bg-[#121820] dark:text-rdark-text2">
                已拥有 {ownedPetList.length}
              </div>
            </div>

            {actionError ? (
              <p className="mt-2 text-[12px] text-rose-500">{actionError}</p>
            ) : null}
            {actionSuccess ? (
              <p className="mt-2 text-[12px] text-emerald-600 dark:text-emerald-400">{actionSuccess}</p>
            ) : null}
          </div>
        </section>

        <section className={`${card} overflow-hidden !px-0 !py-0`}>
          <div className="border-b border-slate-100 px-4 py-3 dark:border-white/6">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[15px] font-bold text-slate-800 dark:text-rdark-text">已拥有龟种</div>
              <div className="text-[12px] font-semibold text-slate-500 dark:text-rdark-text2">{ownedPetList.length}</div>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 py-4 snap-x snap-mandatory">
            {ownedPetList.map((petItem) => (
              <div
                key={String(petItem.petId)}
                className={`w-[112px] shrink-0 snap-start rounded-[22px] border px-3 py-4 text-center border-slate-200 bg-[#fafbfd] dark:border-white/10 dark:bg-[#121820] ${petItem.isEquipped ? 'ring-2 ring-cyan-400/70' : ''}`}
              >
                <div className="text-5xl">{getPetDisplayAvatar(petItem.petKey, petItem.petName)}</div>
                <div className="mt-3 truncate text-[13px] font-bold text-slate-700 dark:text-rdark-text">
                  {petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}
                </div>
                <div className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${getRarityBadgeClass(petItem.rarity)}`}>
                  {petItem.rarity ?? 'N'}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} overflow-hidden !px-0 !py-0`}>
          <div className="border-b border-slate-100 px-4 py-3 dark:border-white/6">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[15px] font-bold text-slate-800 dark:text-rdark-text">体力商店</div>
              <div className="flex items-center gap-1 text-[12px] font-semibold text-rose-500 dark:text-rose-300">
                <Heart size={13} />
                {pet.stamina}/{pet.maxStamina}
              </div>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="grid gap-3">
              {shopApples.map((item) => {
                const isFull = pet.stamina >= pet.maxStamina;
                const cantAfford = balance < item.price;
                const disabled = isFull;

                return (
                  <motion.button
                    key={item.id}
                    whileTap={disabled ? {} : { scale: 0.98 }}
                    onClick={() => buyApple(item)}
                    disabled={disabled}
                    className={`relative overflow-hidden rounded-[20px] border px-3 py-3 text-left ${disabled
                      ? 'border-slate-200 bg-slate-100/80 opacity-55 dark:border-white/8 dark:bg-white/[0.03]'
                      : 'border-slate-200 bg-[#fafbfd] dark:border-white/10 dark:bg-[#121820]'
                      }`}
                  >
                    {buyFlash === item.id && (
                      <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 rounded-[20px] bg-green-400/20"
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 shadow-sm">
                        <img src={APPLE_IMAGE_BY_ITEM[item.id]} alt={item.name} className="h-10 w-10 object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-slate-800 dark:text-rdark-text">{item.name}</div>
                        <div className="mt-1 text-[12px] text-slate-500 dark:text-rdark-text2">补充 {item.effect.value} 点体力</div>
                        <div className="mt-2 flex items-center gap-1 text-[13px] font-bold text-amber-600 dark:text-amber-400">
                          <Coins size={14} />
                          {item.price}
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${disabled ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-[#ff8200] text-white'}`}>
                        {isFull ? '已满' : cantAfford ? '试试购买' : '购买'}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            {pet.stamina >= pet.maxStamina && (
              <p className="mt-3 text-center text-[12px] text-green-600 dark:text-green-400">体力已满</p>
            )}
            {actionSuccess ? (
              <p className="mt-3 text-center text-[12px] text-emerald-600 dark:text-emerald-400">{actionSuccess}</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className={`${card} hidden md:block overflow-hidden !mt-3 md:!mt-4 !px-0 !py-0 `}>
        <div className="grid gap-px  lg:grid-cols-[1.18fr_1.02fr_0.92fr] ">
          <section className="relative overflow-hidden px-5 py-5 lg:col-span-3  !bg-transparent">
            <img src={SHOP_BG} alt="黑市背景" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,30,0.18),rgba(5,10,20,0.2))]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[31px] font-black tracking-tight text-white">宠物抽奖</div>
                  <div className="mt-1 text-[14px] font-medium text-white/80">极光之力，守护你的每一次召唤!</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/84">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-200"><Coins size={14} /> {balance.toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-rose-200"><Heart size={14} /> {pet.stamina}/{pet.maxStamina}</span>
                  </div>
                </div>
                <button onClick={onBack} className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/78 transition hover:bg-white/10">
                  <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> 返回
                </button>
              </div>
              <div className="mt-5 flex justify-center lg:-translate-x-6">
                <div className="relative w-full max-w-[560px] px-6 py-6">
                  <div className="relative mx-auto flex h-[340px] w-full items-center justify-center text-center">
                    <AnimatePresence mode="wait">{phase === 'reveal' && hatchResult ? <motion.div key="reveal" initial={{ scale: 0.86, y: 28, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 16 }} className="flex flex-col items-center justify-center"><span className="relative z-10 text-[132px] leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.22)]">{getPetDisplayAvatar(hatchResult.pet.petKey, hatchResult.pet.name)}</span><div className="mt-3 text-center"><p className="text-xl font-black text-white">{hatchResult.pet.name ?? hatchResult.pet.petKey ?? '神秘龟种'}</p><span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-[#ffcf58]">{hatchResult.pet.rarity ?? 'N'}</span></div></motion.div> : <motion.div key="egg" className="relative flex items-center justify-center" animate={phase === 'idle' ? { scale: [1, 1.03, 1] } : phase === 'heating' ? { rotate: [-2, 2, -2, 2, 0], scale: [1, 1.05, 1] } : phase === 'cracking' ? { rotate: [-4, 4, -4, 4, 0], scale: [1, 1.08, 1.03] } : { scale: 0.92, opacity: 0 }} transition={phase === 'idle' ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.28, repeat: phase === 'breaking' ? 0 : 3 }}><span className="text-[220px] leading-none">🥚</span></motion.div>}</AnimatePresence>
                    {(phase === 'heating' || phase === 'cracking') && <div className="absolute bottom-3 left-1/2 w-[220px] -translate-x-1/2"><div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-white/65"><span>孵化进度</span><span>{tempGlow}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#59d8ff,#8b5cf6,#ffb84d)]" style={{ width: `${tempGlow}%` }} transition={{ duration: 0.05 }} /></div></div>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                {phase === 'idle' ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={doGacha}
                    disabled={hatchMutation.isLoading}
                    className="relative flex h-[58px] w-[220px] items-center justify-center overflow-hidden text-center disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <img src="/shop/btn-o.png" alt="孵化按钮" className="absolute inset-0 h-full w-full object-fill" />
                    <span className="relative z-10 text-[18px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)]">{GACHA_COST}龟币孵化</span>
                  </motion.button>
                ) : phase === 'reveal' ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={resetGacha}
                    className="relative flex h-[58px] w-[220px] items-center justify-center overflow-hidden text-center"
                  >
                    <img src="/shop/btn-o.png" alt="继续孵化" className="absolute inset-0 h-full w-full object-fill" />
                    <span className="relative z-10 text-[18px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)]">继续孵化</span>
                  </motion.button>
                ) : (
                  <div className="relative flex h-[58px] w-[220px] items-center justify-center overflow-hidden text-center opacity-75">
                    <img src="/shop/btn-o.png" alt="孵化中" className="absolute inset-0 h-full w-full object-fill" />
                    <span className="relative z-10 text-[18px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)]">孵化中...</span>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="relative mx-1 my-1 overflow-hidden rounded-[24px] border border-[#9a73ff]/30 bg-[linear-gradient(135deg,rgba(18,12,48,0.46)_0%,rgba(76,42,150,0.38)_30%,rgba(32,74,150,0.34)_58%,rgba(18,120,118,0.22)_78%,rgba(10,18,48,0.48)_100%)] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(210,188,255,0.16)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(195,128,255,0.92),rgba(101,151,255,0.88),rgba(113,255,225,0.65),transparent)]" />
            <div className="relative rounded-[22px] border border-white/12 bg-[linear-gradient(135deg,rgba(22,16,54,0.36),rgba(88,44,144,0.3),rgba(38,82,156,0.26),rgba(18,92,92,0.18))] p-3 shadow-[inset_0_1px_0_rgba(222,212,255,0.12)]">
              <div className="text-base font-black text-white">奖池概率</div>
              <div className="mt-4 grid grid-cols-2 gap-3">{probabilityRows.map((item) => <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,20,48,0.92),rgba(35,31,84,0.9),rgba(16,78,85,0.88))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"><div className="flex items-center gap-2"><img src={RARITY_ICON_BY_LABEL[item.label]} alt={item.label} className="h-6 w-6 object-contain" /><span className={`text-[15px] font-black ${item.tone}`}>{item.label}</span></div><span className={`text-[16px] font-black ${item.tone}`}>{item.value}</span></div>)}</div>
            </div>
            <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(22,16,56,0.38),rgba(98,42,154,0.32),rgba(44,86,160,0.28),rgba(18,92,92,0.18),rgba(14,20,52,0.4))] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(222,212,255,0.14)]">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-black text-white">奖池预览</div>
                <button onClick={() => setIsPreviewDialogOpen(true)} className="text-[12px] font-bold text-white/72 transition hover:text-white">全部预览 &gt;</button>
              </div>
              <div ref={previewScrollRef} onMouseDown={handlePreviewMouseDown} onMouseMove={handlePreviewMouseMove} onMouseUp={stopPreviewDrag} onMouseLeave={stopPreviewDrag} className="mt-3 flex gap-3 overflow-x-auto pb-1 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing">{petPoolPreviewItems.slice(0, 12).map((item) => <div key={item.petName} className={`w-[92px] shrink-0 rounded-[18px] border p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${item.rarity === '传说' ? 'border-[#9a6a16] bg-[linear-gradient(180deg,#3a2402,#16100a)]' : item.rarity === '史诗' ? 'border-[#6d44b1] bg-[linear-gradient(180deg,#24123e,#131125)]' : item.rarity === '稀有' ? 'border-[#225c8d] bg-[linear-gradient(180deg,#08294a,#0d1d31)]' : 'border-[#3c6b1c] bg-[linear-gradient(180deg,#18340c,#101c0d)]'}`}><div className={`rounded-[10px] px-1 py-0.5 text-[10px] font-black ${item.rarity === '传说' ? 'text-amber-300' : item.rarity === '史诗' ? 'text-fuchsia-300' : item.rarity === '稀有' ? 'text-sky-300' : 'text-lime-300'}`}>{item.rarity}</div><img src={`/assets/pets/${item.petName}.png`} alt={item.petName} draggable={false} className="mx-auto mt-2 h-12 w-12 object-contain" /><div className="mt-2 truncate text-[11px] font-black text-white">{item.petName.replace(/v1$/, '')}</div></div>)}</div>
            </div>
          </section>
          <section className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(28,14,64,0.42),rgba(98,42,154,0.34),rgba(44,86,160,0.24),rgba(12,20,50,0.42))] px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(230,210,255,0.12)]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(195,120,255,0.18),transparent_36%),radial-gradient(circle_at_100%_0%,rgba(105,122,255,0.14),transparent_30%)]" /><div className="relative flex items-start justify-between"><div className="text-[15px] font-black text-white">体力商店</div><div className="text-[12px] font-black text-white/82">刷新倒计时: {resetCountdown}</div></div><div className="relative mt-4 grid grid-cols-3 gap-3">{shopApples.slice(0, 3).map((item) => { const meta = STAMINA_SHOP_META[item.id] ?? STAMINA_SHOP_META.apple1; const disabled = pet.stamina >= pet.maxStamina || dailyBuyCount >= 3; return <button key={item.id} onClick={() => buyApple(item)} disabled={disabled} className={`relative overflow-hidden rounded-[22px] border px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${meta.frame} ${disabled ? 'cursor-not-allowed grayscale-[0.08]' : ''}`}>{buyFlash === item.id && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white/20" />}<div className="text-[13px] font-black text-white">{meta.title}</div><img src={APPLE_IMAGE_BY_ITEM[item.id]} alt={meta.title} className="mx-auto mt-3 h-24 w-24 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]" /><div className="mt-3 text-[18px] font-black text-white">+{item.effect.value}</div><div className={`mx-auto mt-4 inline-flex h-[38px] min-w-[74px] items-center justify-center gap-1.5 rounded-full border px-3 text-[14px] font-black text-white ${meta.pill}`}><Coins size={14} className="text-emerald-300" /> {item.price}</div></button>; })}</div><div className="relative mt-4 flex items-center justify-between gap-3"><div className="text-[12px] font-black text-white/78">每日限购次数 <span className="ml-1 text-[28px] leading-none text-white">{Math.max(0, 3 - dailyBuyCount)}/3</span></div><button onClick={refreshStaminaShop} className="relative flex h-[56px] w-[168px] items-center justify-center overflow-hidden text-center"><img src="/shop/btn-g.png" alt="刷新按钮" className="absolute inset-0 h-full w-full object-fill" /><span className="relative z-10 flex items-center gap-2 text-[20px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,40,0,0.45)]">刷新 <Coins size={18} className="text-emerald-200" /> 5</span></button></div></section>
          <section className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(24,14,48,0.58),rgba(17,17,36,0.72))] px-4 py-4 shadow-[0_14px_32px_rgba(0,0,0,0.26)]">
            <div className="flex items-center justify-between"><div className="text-base font-bold text-white">抽奖记录</div><div className="text-xs text-white/50">全部记录</div></div>
            <div className="mt-4 grid gap-3">{recordRows.slice(0, 4).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3"><div className="flex items-center gap-3"><img src={item.image} alt={item.name} className="h-10 w-10 rounded-full object-cover" /><div className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${item.rarity === '传说' ? 'bg-amber-500/12 text-amber-300' : item.rarity === '史诗' ? 'bg-fuchsia-500/12 text-fuchsia-300' : item.rarity === '稀有' ? 'bg-sky-500/12 text-sky-300' : 'bg-lime-500/12 text-lime-300'}`}>{item.rarity}</div><div className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{item.name}</div><div className="shrink-0 text-[11px] text-white/48">{item.ago}</div></div></div>)}</div>
          </section>
        </div>
        <AnimatePresence>
          {isPreviewDialogOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#020817]/82 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-[860px] overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(8,18,48,0.96),rgba(75,37,123,0.9),rgba(20,101,98,0.88),rgba(9,20,45,0.96))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.46)]">
                <div className="flex items-center justify-between"><div className="text-lg font-black text-white">全部预览</div><button onClick={() => setIsPreviewDialogOpen(false)} className="rounded-full border border-white/12 px-3 py-1 text-sm font-bold text-white/72">关闭</button></div>
                <div className="mt-4 grid max-h-[70vh] grid-cols-4 gap-3 overflow-y-auto pr-1">{petPoolPreviewItems.map((item) => <div key={`dialog-${item.petName}`} className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,30,72,0.94),rgba(10,20,44,0.96))] p-3 text-center"><img src={`/assets/pets/${item.petName}.png`} alt={item.petName} className="mx-auto h-14 w-14 object-contain" /><div className="mt-2 truncate text-xs font-black text-white">{item.petName.replace(/v1$/, '')}</div><div className="mt-1 text-[10px] font-bold text-white/62">{item.rarity}</div></div>)}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ━━━ Gacha Section ━━━ */}
      <div className="hidden">
        <div className="flex flex-col items-center text-center">
          {/* ── Egg / Result Area ── */}
          <div className="relative mb-3 flex h-40 w-full max-w-[220px] items-center justify-center sm:h-52 sm:w-44 md:h-56 md:w-48 md:max-w-none md:mb-4">
            <AnimatePresence mode="wait">
              {phase === 'reveal' && hatchResult ? (
                /* ── Reveal: show new skin ── */
                <motion.div
                  key="reveal"
                  initial={{ scale: 0, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center"
                >
                  {/* SSR glow ring */}
                  {hatchResult.pet.rarity === 'SSR' && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #fbbf24, #f59e0b, #d97706, #fbbf24)',
                        filter: 'blur(18px)',
                        opacity: 0.5,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  {hatchResult.pet.rarity === 'SR' && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #a855f7, #7c3aed, #6d28d9, #a855f7)',
                        filter: 'blur(16px)',
                        opacity: 0.4,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  <span className="text-6xl sm:text-8xl relative z-10 drop-shadow-lg">{getPetDisplayAvatar(hatchResult.pet.petKey, hatchResult.pet.name)}</span>
                  <div className="!mt-2 sm:!mt-3 text-center relative z-10 max-w-[220px]">
                    <p className="font-bold text-base sm:text-lg text-slate-800 dark:text-rdark-text">
                      {hatchResult.pet.name ?? hatchResult.pet.petKey ?? '神秘龟种'}
                    </p>
                    <span
                      className={`inline-block !mt-1 !px-2 py-0.5 text-xs font-semibold rounded-full ${getRarityBadgeClass(hatchResult.pet.rarity)}`}
                    >
                      {hatchResult.pet.rarity ?? 'N'}
                    </span>
                    {hatchResult.isDuplicate && (
                      <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                        已拥有，转换为 +{hatchResult.refund} 龟币
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* ── Egg ── */
                <motion.div
                  key="egg"
                  className="flex flex-col items-center"
                  animate={
                    phase === 'idle'
                      ? { scale: [1, 1.03, 1] }
                      : phase === 'heating'
                        ? { rotate: [-2, 2, -2, 2, 0], scale: [1, 1.05, 1] }
                        : phase === 'cracking'
                          ? { rotate: [-4, 4, -4, 4, -3, 3, 0], scale: [1, 1.06, 1.02] }
                          : { scale: 0.9, opacity: 0 }
                  }
                  transition={
                    phase === 'idle'
                      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                      : phase === 'heating'
                        ? { duration: 0.3, repeat: 3 }
                        : phase === 'cracking'
                          ? { duration: 0.25, repeat: 3 }
                          : { duration: 0.3 }
                  }
                >
                  <span className="text-[5.5rem] sm:text-[6.5rem] md:text-[7rem] leading-none select-none relative">
                    🥚
                    {/* Crack lines overlay */}
                    {(phase === 'cracking' || phase === 'breaking') && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <svg
                          viewBox="0 0 100 120"
                          className="w-full h-full absolute"
                          style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' }}
                        >
                          <path
                            d="M45 20 L48 40 L40 55 L50 65 L42 80"
                            stroke="#8B4513"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <path
                            d="M55 25 L52 45 L58 58 L50 70"
                            stroke="#8B4513"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.div>
                    )}
                  </span>

                  {/* Heat waves */}
                  {phase === 'heating' && (
                    <>
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full border border-orange-400/40"
                          style={{
                            width: 100 + i * 30,
                            height: 100 + i * 30,
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.2, 1.4] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sparkle burst on break */}
            {phase === 'breaking' && (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={`spark-${i}`}
                    className="absolute text-xl"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos((i / 8) * Math.PI * 2) * 80,
                      y: Math.sin((i / 8) * Math.PI * 2) * 80,
                      opacity: 0,
                      scale: 0.5,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ left: '50%', top: '50%', marginLeft: -10, marginTop: -10 }}
                  >
                    {i % 2 === 0 ? '✨' : '💫'}
                  </motion.div>
                ))}
              </>
            )}
          </div>

          {/* Temperature bar */}
          {(phase === 'heating' || phase === 'cracking') && (
            <div className="w-36 sm:w-40 h-2 rounded-full bg-slate-200 dark:bg-slate-700 mb-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, #3b82f6 0%, #ef4444 100%)`,
                  width: `${tempGlow}%`,
                }}
                transition={{ duration: 0.05 }}
              />
            </div>
          )}

          {/* Action button */}
          {phase === 'idle' ? (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={doGacha}
              disabled={hatchMutation.isLoading}
              className={`w-full !px-4 sm:w-auto sm:!px-6 !py-3 rounded-2xl font-bold text-white text-sm transition
                ${!hatchMutation.isLoading
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25'
                  : 'bg-slate-400 cursor-not-allowed'
                }`}
            >
              <Coins size={14} className="inline !mr-1.5 !-mt-0.5" />
              花 {GACHA_COST} 龟币孵化
            </motion.button>
          ) : phase === 'reveal' ? (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={resetGacha}
              className="w-full !px-4 sm:w-auto sm:!px-6 !py-3 rounded-2xl font-bold text-sm bg-cyan-500 hover:bg-cyan-600 text-white transition shadow-lg shadow-cyan-500/25"
            >
              继续孵化
            </motion.button>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400 animate-pulse font-medium">
              孵化中...
            </p>
          )}

          {actionError ? (
            <p className="mt-2 text-xs text-red-500">{actionError}</p>
          ) : null}
          {actionSuccess ? (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{actionSuccess}</p>
          ) : null}
        </div>

        {/* ── Probability hint ── */}
        <div className="!mt-3 md:!mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[13px] sm:text-[14px] md:text-[16px] text-slate-400 dark:text-rdark-text2">
          <span>N 50%</span>
          <span className="text-blue-500">R 30%</span>
          <span className="text-purple-500">SR 15%</span>
          <span className="text-amber-500">SSR 5%</span>
        </div>
      </div>

      {/* ━━━ Skin Collection ━━━ */}
      <div className={`${card} hidden md:block !mt-3 md:!mt-4 !px-3 sm:!px-4 md:!px-5 !py-3 md:!py-4`}>
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-700 dark:text-rdark-text !mb-2.5 md:!mb-3">
          已拥有龟种 ({ownedPetList.length})
        </h3>
        <div
          ref={ownedPetsScrollRef}
          onMouseDown={handleOwnedPetsMouseDown}
          onMouseMove={handleOwnedPetsMouseMove}
          onMouseUp={stopOwnedPetsDrag}
          onMouseLeave={stopOwnedPetsDrag}
          className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
        >
          {ownedPetList.map((petItem) => (
            <div
              key={String(petItem.petId)}
              className={`flex h-40 w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(22,16,56,0.38),rgba(98,42,154,0.32),rgba(44,86,160,0.28),rgba(14,20,52,0.4))] px-3 text-center shadow-[0_12px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(222,212,255,0.12)] transition ${petItem.isEquipped ? 'ring-2 ring-cyan-400' : ''}`}
            >
              <img
                src={petItem.petName ? `/assets/pets/${petItem.petName}.png` : '/assets/pets/基础小龟.png'}
                alt={petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}
                draggable={false}
                className="h-20 w-20 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]"
              />
              <span
                className={`text-[13px] font-semibold !px-2 !py-0.5 rounded-full ${getRarityBadgeClass(petItem.rarity)}`}
              >
                {petItem.rarity ?? 'N'}
              </span>
              <span className="truncate text-[11px] font-bold text-white">{petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
