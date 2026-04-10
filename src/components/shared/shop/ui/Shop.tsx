import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import type { PetInfo, ShopItem } from '@/data/mock_data';
import {
  shopApples,
} from '@/data/mock_data';
import { useRequestPetEggHatch, useRequestPetStaminaFeed } from '@/hook/usePetRequest';
import type { OwnedPetItem, PetEggHatchResponse } from '@/hook/petType';
import { getPetDisplayAvatar } from '../../pet/ui/petDisplay';

const card =
  'rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

/* ── Types ── */
type HatchPhase = 'idle' | 'heating' | 'cracking' | 'breaking' | 'reveal';

interface ShopProps {
  balance: number;
  pet: PetInfo;
  ownedPets?: OwnedPetItem[];
  onBack: () => void;
  onRequireAuth?: () => void;
}

const GACHA_COST = 100;
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
  ownedPets,
  onBack,
  onRequireAuth,
}) => {
  const [phase, setPhase] = useState<HatchPhase>('idle');
  const [hatchResult, setHatchResult] = useState<PetEggHatchResponse | null>(null);
  const [tempGlow, setTempGlow] = useState(0); // 0-100 temperature bar
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [buyFlash, setBuyFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const hatchMutation = useRequestPetEggHatch();
  const feedMutation = useRequestPetStaminaFeed();

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  /* ── Gacha logic ── */
  const doGacha = useCallback(() => {
    if (balance < GACHA_COST || phase !== 'idle' || hatchMutation.isLoading) return;
    clearTimers();
    setActionError(null);
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
        } catch (error) {
          setPhase('idle');
          setActionError(error instanceof Error ? error.message : '开蛋失败，请稍后重试。');
          if (error instanceof Error && error.message.includes('NotLogin')) {
            onRequireAuth?.();
          }
        }
      }, 2500),
    );
  }, [balance, clearTimers, hatchMutation, onRequireAuth, phase]);

  const resetGacha = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setHatchResult(null);
    setTempGlow(0);
    setActionError(null);
  }, [clearTimers]);

  /* ── Buy apple ── */
  const buyApple = useCallback(
    async (item: ShopItem) => {
      if (balance < item.price || feedMutation.isLoading) return;
      setActionError(null);

      try {
        await feedMutation.mutateAsync({
          count: FEED_COUNT_BY_ITEM[item.id] ?? 1,
        });
        setBuyFlash(item.id);
        setTimeout(() => setBuyFlash(null), 600);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : '喂食失败，请稍后重试。');
        if (error instanceof Error && error.message.includes('NotLogin')) {
          onRequireAuth?.();
        }
      }
    },
    [balance, feedMutation, onRequireAuth],
  );

  const ownedPetList = ownedPets ?? [];

  return (
    <div className="legacy-shop-page space-y-3 px-4 md:space-y-5 md:px-0 !mt-3 md:!mt-4">
      {/* ━━━ Header ━━━ */}
      <div className={`${card} !px-3 sm:!px-4 md:!px-5 !py-3 md:!py-4`}>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-rdark-text2 hover:text-slate-700 dark:hover:text-rdark-text transition shrink-0"
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> 返回
          </button>
          <div className="hidden md:flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-xs sm:text-sm shrink-0 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 px-2 py-1">
            <Coins size={14} className="sm:w-4 sm:h-4" /> {balance.toLocaleString()}
          </div>
        </div>
        <h2 className="!mt-2 text-base sm:text-lg md:text-lg font-bold text-slate-800 dark:text-rdark-text text-center">
          抽奖 & 商店
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
          <div className="rounded-[18px] border border-slate-200 bg-[#f8fafc] px-3 py-2.5 dark:border-white/10 dark:bg-[#121820]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-rdark-text2">当前龟币</div>
            <div className="mt-1 flex items-center gap-1 text-[17px] font-black text-amber-600 dark:text-amber-400">
              <Coins size={15} /> {balance.toLocaleString()}
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-[#f8fafc] px-3 py-2.5 dark:border-white/10 dark:bg-[#121820]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-rdark-text2">宠物体力</div>
            <div className="mt-1 flex items-center gap-1 text-[17px] font-black text-rose-500 dark:text-rose-300">
              <Heart size={15} /> {pet.stamina}/{pet.maxStamina}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:hidden">
        <section className={`${card} overflow-hidden !px-0 !py-0`}>
          <div className="border-b border-slate-100 px-4 py-3 dark:border-white/6">
            <div className="text-[15px] font-bold text-slate-800 dark:text-rdark-text">今日扭蛋</div>
            <div className="mt-1 text-[12px] text-slate-500 dark:text-rdark-text2">像微博移动端卡片一样，主操作放中间，信息收在下面。</div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[24px] bg-gradient-to-br from-amber-100 via-orange-50 to-white text-[56px] shadow-[0_10px_24px_rgba(251,191,36,0.18)] dark:from-amber-900/30 dark:via-orange-900/15 dark:to-transparent">
                {phase === 'reveal' && hatchResult ? getPetDisplayAvatar(hatchResult.pet.petKey, hatchResult.pet.name) : '🥚'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-black text-slate-800 dark:text-rdark-text">
                  {phase === 'reveal' && hatchResult ? hatchResult.pet.name ?? hatchResult.pet.petKey ?? '神秘龟种' : '孵化稀有龟种'}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-rdark-text2">
                  {phase === 'reveal' && hatchResult
                    ? hatchResult.isDuplicate
                      ? `重复龟种已返还 ${hatchResult.refund} 龟币`
                      : `恭喜获得 ${hatchResult.pet.rarity ?? '稀有'} 品质新龟种`
                    : `每次开蛋由后端统一扣费与返还，当前展示成本约 ${GACHA_COST} 龟币。`}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-white/[0.05] dark:text-rdark-text2">N 50%</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-500 dark:bg-blue-500/10">R 30%</span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-500 dark:bg-violet-500/10">SR 15%</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-500 dark:bg-amber-500/10">SSR 5%</span>
                </div>
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

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
              {phase === 'idle' ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={doGacha}
                  disabled={balance < GACHA_COST}
                  className={`flex h-12 items-center justify-center rounded-2xl px-4 text-[15px] font-black text-white transition ${
                    balance >= GACHA_COST
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

            {balance < GACHA_COST && phase === 'idle' && (
              <p className="mt-2 text-[12px] text-rose-500">龟币不足，需要 {GACHA_COST} 龟币</p>
            )}
            {actionError ? (
              <p className="mt-2 text-[12px] text-rose-500">{actionError}</p>
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
                const disabled = isFull || cantAfford;

                return (
                  <motion.button
                    key={item.id}
                    whileTap={disabled ? {} : { scale: 0.98 }}
                    onClick={() => buyApple(item)}
                    disabled={disabled}
                    className={`relative overflow-hidden rounded-[20px] border px-3 py-3 text-left ${
                      disabled
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
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[28px] shadow-sm dark:bg-white/[0.05]">
                        {item.icon}
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
                        {isFull ? '已满' : cantAfford ? '不足' : '购买'}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            {pet.stamina >= pet.maxStamina && (
              <p className="mt-3 text-center text-[12px] text-green-600 dark:text-green-400">体力已满</p>
            )}
          </div>
        </section>
      </div>

      {/* ━━━ Gacha Section ━━━ */}
      <div className={`${card} hidden md:block !mt-3 md:!mt-4 !px-3 sm:!px-4 md:!px-5 !py-4 md:!py-6`}>
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
              disabled={balance < GACHA_COST}
              className={`w-full !px-4 sm:w-auto sm:!px-6 !py-3 rounded-2xl font-bold text-white text-sm transition
                ${
                  balance >= GACHA_COST
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

          {balance < GACHA_COST && phase === 'idle' && (
            <p className="mt-2 text-xs text-red-500">龟币不足，需要 {GACHA_COST} 龟币</p>
          )}
          {actionError ? (
            <p className="mt-2 text-xs text-red-500">{actionError}</p>
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
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-3 md:gap-2.5 md:px-0 lg:flex lg:gap-3 lg:overflow-x-auto">
          {ownedPetList.map((petItem) => (
            <div
              key={String(petItem.petId)}
              className={`h-28 w-[96px] shrink-0 snap-start rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition sm:h-32 sm:w-[108px] md:h-40 md:w-full md:flex-shrink-0 lg:w-32 border-slate-200 dark:border-slate-700 ${petItem.isEquipped ? 'ring-2 ring-cyan-400' : ''}`}
            >
              <span className="text-5xl sm:text-6xl">{getPetDisplayAvatar(petItem.petKey, petItem.petName)}</span>
              <span
                className={`!mt-2.5 sm:!mt-4 text-[13px] sm:text-[16px] font-semibold !px-2 !py-0.5 rounded-full ${getRarityBadgeClass(petItem.rarity)}`}
              >
                {petItem.rarity ?? 'N'}
              </span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-rdark-text">{petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ Apple Shop ━━━ */}
      <div className={`${card} hidden md:block !mt-3 md:!mt-4 !px-3 sm:!px-4 md:!px-5 !py-3 md:!py-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 !mb-3">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-700 dark:text-rdark-text flex items-center gap-1.5">
            <span>🍎</span> 体力商店
          </h3>
          <div className="flex min-w-[180px] items-center gap-2">
            <Heart size={14} className="text-red-500" />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                style={{ width: `${Math.max(0, Math.min(100, (pet.stamina / Math.max(pet.maxStamina, 1)) * 100))}%` }}
              />
            </div>
            <span className="text-base sm:text-lg md:text-xl text-slate-500 dark:text-rdark-text2 !ml-1">
              {pet.stamina}/{pet.maxStamina}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 md:gap-3">
          {shopApples.map((item) => {
            const isFull = pet.stamina >= pet.maxStamina;
            const cantAfford = balance < item.price;
            const disabled = isFull || cantAfford;

            return (
              <motion.button
                key={item.id}
                whileHover={disabled ? {} : { scale: 1.03 }}
                whileTap={disabled ? {} : { scale: 0.97 }}
                onClick={() => buyApple(item)}
                disabled={disabled}
                className={`relative overflow-hidden rounded-[20px] !p-3 text-left transition border
                  ${
                    disabled
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 hover:shadow-md'
                  }`}
              >
                {buyFlash === item.id && (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 rounded-xl bg-green-400/30"
                  />
                )}
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/60 text-3xl shadow-sm dark:bg-white/[0.05]">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-slate-700 dark:text-rdark-text">
                      {item.name}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-rdark-text2">
                      +{item.effect.value} 体力
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[14px] font-semibold text-amber-600 dark:text-amber-400">
                      <Coins size={15} /> {item.price}
                    </div>
                  </div>
                  <div className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${disabled ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-amber-500 text-white'}`}>
                    {isFull ? '已满' : cantAfford ? '不足' : '购买'}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {pet.stamina >= pet.maxStamina && (
          <p className="mt-2 text-center text-xs text-green-600 dark:text-green-400">
            体力已满!
          </p>
        )}
      </div>
    </div>
  );
};
