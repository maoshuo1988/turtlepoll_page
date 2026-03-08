import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import type { PetInfo, PetSkin, ShopItem, PetRarity } from '../../../data/mock_data';
import {
  shopApples,
  mockPetSkins,
  RARITY_COLORS,
  RARITY_BORDER_COLORS,
  DUPE_REFUND,
} from '../../../data/mock_data';

const card =
  'rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

/* ── Types ── */
type HatchPhase = 'idle' | 'heating' | 'cracking' | 'breaking' | 'reveal';

interface ShopProps {
  balance: number;
  onBalanceChange: (delta: number) => void;
  pet: PetInfo;
  onStaminaChange: (newStamina: number) => void;
  skins: PetSkin[];
  onSkinUnlock: (skinId: string) => void;
  onBack: () => void;
}

/* ── Gacha probability ── */
function rollRarity(): PetRarity {
  const r = Math.random();
  if (r < 0.05) return 'SSR';
  if (r < 0.20) return 'SR';
  if (r < 0.50) return 'R';
  return 'N';
}

const GACHA_COST = 100;

/* ═══════════════════════ Main Component ═══════════════════════ */
export const Shop: React.FC<ShopProps> = ({
  balance,
  onBalanceChange,
  pet,
  onStaminaChange,
  skins,
  onSkinUnlock,
  onBack,
}) => {
  const [phase, setPhase] = useState<HatchPhase>('idle');
  const [result, setResult] = useState<PetSkin | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [refundCoins, setRefundCoins] = useState(0);
  const [tempGlow, setTempGlow] = useState(0); // 0-100 temperature bar
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [buyFlash, setBuyFlash] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  /* ── Gacha logic ── */
  const doGacha = useCallback(() => {
    if (balance < GACHA_COST || phase !== 'idle') return;
    onBalanceChange(-GACHA_COST);
    clearTimers();

    // Pick result
    const rarity = rollRarity();
    const pool = mockPetSkins.filter((s) => s.rarity === rarity);
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const dup = skins.find((s) => s.id === picked.id)?.owned ?? false;

    setResult(picked);
    setIsDuplicate(dup);
    setRefundCoins(dup ? DUPE_REFUND[rarity] : 0);

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
      setTimeout(() => {
        setPhase('reveal');
        if (dup) {
          onBalanceChange(DUPE_REFUND[rarity]);
        } else {
          onSkinUnlock(picked.id);
        }
      }, 2500),
    );
  }, [balance, phase, skins, onBalanceChange, onSkinUnlock, clearTimers]);

  const resetGacha = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setResult(null);
    setIsDuplicate(false);
    setRefundCoins(0);
    setTempGlow(0);
  }, [clearTimers]);

  /* ── Buy apple ── */
  const buyApple = useCallback(
    (item: ShopItem) => {
      if (balance < item.price) return;
      onBalanceChange(-item.price);
      const newStamina = Math.min(pet.stamina + item.effect.value, pet.maxStamina);
      onStaminaChange(newStamina);
      setBuyFlash(item.id);
      setTimeout(() => setBuyFlash(null), 600);
    },
    [balance, pet.stamina, pet.maxStamina, onBalanceChange, onStaminaChange],
  );

  const ownedSkins = skins.filter((s) => s.owned);

  return (
    <div className="legacy-shop-page space-y-5 !mt-4">
      {/* ━━━ Header ━━━ */}
      <div className={`${card} !px-5 !py-4 flex items-center justify-between`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-rdark-text2 hover:text-slate-700 dark:hover:text-rdark-text transition"
        >
          <ArrowLeft size={18} /> 返回
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-rdark-text">
          抽奖 & 商店
        </h2>
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-sm">
          <Coins size={16} /> {balance.toLocaleString()}
        </div>
      </div>

      {/* ━━━ Gacha Section ━━━ */}
      <div className={`${card} !mt-4 !px-5 !py-6`}>
        <div className="flex flex-col items-center">
          {/* ── Egg / Result Area ── */}
          <div className="relative w-48 h-56 flex items-center justify-center mb-4">
            <AnimatePresence mode="wait">
              {phase === 'reveal' && result ? (
                /* ── Reveal: show new skin ── */
                <motion.div
                  key="reveal"
                  initial={{ scale: 0, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center"
                >
                  {/* SSR glow ring */}
                  {result.rarity === 'SSR' && (
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
                  {result.rarity === 'SR' && (
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
                  <span className="text-8xl relative z-10 drop-shadow-lg">{result.avatar}</span>
                  <div className="!mt-3 text-center relative z-10">
                    <p className="font-bold text-lg text-slate-800 dark:text-rdark-text">
                      {result.name}
                    </p>
                    <span
                      className={`inline-block !mt-1 !px-2 py-0.5 text-xs font-semibold rounded-full ${RARITY_COLORS[result.rarity]}`}
                    >
                      {result.rarity}
                    </span>
                    {isDuplicate && (
                      <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                        已拥有，转换为 +{refundCoins} 龟币
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
                  <span className="text-[7rem] leading-none select-none relative">
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
            <div className="w-40 h-2 rounded-full bg-slate-200 dark:bg-slate-700 mb-3 overflow-hidden">
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
              className={`!px-6 !py-2.5 rounded-xl font-bold text-white text-sm transition
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
              className="!px-6 !py-2.5 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-600 text-white transition shadow-lg shadow-cyan-500/25"
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
        </div>

        {/* ── Probability hint ── */}
        <div className="!mt-4 flex justify-center gap-3 text-[16px] text-slate-400 dark:text-rdark-text2">
          <span>N 50%</span>
          <span className="text-blue-500">R 30%</span>
          <span className="text-purple-500">SR 15%</span>
          <span className="text-amber-500">SSR 5%</span>
        </div>
      </div>

      {/* ━━━ Skin Collection ━━━ */}
      <div className={`${card} !mt-4 !px-5 !py-4`}>
        <h3 className="text-xl font-bold text-slate-700 dark:text-rdark-text !mb-3">
          已获得形象 ({ownedSkins.length}/{skins.length})
        </h3>
        <div className="flex gap-3 overflow-x-auto !pb-2">
          {skins.map((skin) => (
            <div
              key={skin.id}
              className={`flex-shrink-0 w-32 h-40 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition
                ${skin.owned ? RARITY_BORDER_COLORS[skin.rarity] : 'border-slate-200 dark:border-slate-700 opacity-40'}
                ${skin.equipped ? 'ring-2 ring-cyan-400' : ''}`}
            >
              <span className="text-6xl">{skin.owned ? skin.avatar : '?'}</span>
              <span
                className={`!mt-4 text-[16px] font-semibold !px-1 rounded ${
                  skin.owned ? RARITY_COLORS[skin.rarity] : 'text-slate-400'
                }`}
              >
                {skin.rarity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ Apple Shop ━━━ */}
      <div className={`${card} !mt-4 !px-5 !py-4`}>
        <div className="flex items-center justify-between !mb-3">
          <h3 className="text-xl font-bold text-slate-700 dark:text-rdark-text flex items-center gap-1.5">
            <span>🍎</span> 体力商店
          </h3>
          {/* Stamina bar */}
          <div className="flex items-center gap-1.5">
            <Heart size={14} className="text-red-500" />
            <div className="flex gap-0.5">
              {Array.from({ length: pet.maxStamina }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                    i < pet.stamina
                      ? 'bg-red-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xl text-slate-500 dark:text-rdark-text2 !ml-1">
              {pet.stamina}/{pet.maxStamina}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
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
                className={`relative rounded-xl !p-3 text-center transition border
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
                <span className="text-4xl block mb-1">{item.icon}</span>
                <p className="!mt-2 text-xl font-bold text-slate-700 dark:text-rdark-text">
                  {item.name}
                </p>
                <p className="text-[16px] text-slate-500 dark:text-rdark-text2 !mt-2">
                  +{item.effect.value} 体力
                </p>
                <div className="!mt-1.5 flex items-center justify-center gap-1 text-xl font-semibold text-amber-600 dark:text-amber-400">
                  <Coins size={20} /> {item.price}
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
