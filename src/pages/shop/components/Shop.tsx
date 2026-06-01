/**
 * 文件说明：Shop，商城黑市页面组件。
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import type { PetInfo } from '@/components/common/pet/petTypes';
import type { ShopItem } from './shopTypes';
import { useRequestAiStaminaApple } from '@/hooks/useAiRequests';
import { useRequestPetEggHatch, useRequestPetGachaConfig, useRequestPetOwned, useRequestPetDefs } from '@/hooks/usePetRequests';
import type { PetEggHatchResponse, PetStaminaResponse } from '@/hooks/petTypes';
import type { OwnedPetItem } from '@/hooks/petTypes';
import { PetPoolPreviewTile } from './PetPoolPreviewTile';
import { PetAssetPreview } from '@/components/common/pet/PetAssetPreview';
import { resolvePetPreviewAsset } from '@/components/common/pet/petPreviewAsset';
import { getPetApiErrorMessage, isAuthError } from '@/utils/petHelpers';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { HORIZONTAL_DRAG_SCROLL_TRACK_CLASS, useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { getPetRarityBadgeClass, getPetRarityTextClass, normalizePetRarityGrade } from '@/components/common/pet/petRarity';
import { TextEmptyState } from '@/components/common/state/PageState';
import { ShopGachaEggStage } from './ShopGachaEggStage';
import { ShopGachaHeroMobile } from './ShopGachaHeroMobile';
import { ShopGachaStageLayers } from './ShopGachaStageLayers';
import { getPetEggHatchMissMessage, getPetEggHatchWinMessage, isPetEggHatchWin } from './shopHatchReveal';
import {
  SHOP_AURORA_STAGE_OFFSET_X,
  SHOP_AURORA_STAGE_OFFSET_Y,
  SHOP_EGG_REVEAL_DELAY_MS,
  SHOP_GACHA_EGG_STAGE_ANCHOR,
} from '@/config/shopSpineAssets';

const card =
  'rounded-[24px] max-lg:rounded-[18px] border border-cyan-400/18 max-lg:border-cyan-400/11 bg-[linear-gradient(180deg,rgba(7,15,31,0.96),rgba(6,12,24,0.98))] shadow-[0_14px_40px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] max-lg:shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl';

/* ── Types ── */
type HatchPhase = 'idle' | 'opening' | 'glowing' | 'reveal';

interface ShopProps {
  balance: number;
  pet: PetInfo;
  petStaminaInfo?: PetStaminaResponse | null;
  onBack: () => void;
  onRequireAuth?: () => void;
}

const GACHA_COST = 100;
const SMALL_APPLE_PRICE = 5;
const SMALL_APPLE_RECOVERY = 1;
const SHOP_BG = '/shop/bg.png';
const APPLE_IMAGE_BY_ITEM: Record<string, string> = {
  apple1: '/shop/apple.png',
  apple2: '/shop/apple1.png',
  apple3: '/shop/apple2.png',
};
const STAMINA_SHOP_META: Record<string, { title: string; frame: string; pill: string }> = {
  apple1: { title: '小苹果', frame: '', pill: '' },
  apple2: { title: '大苹果', frame: 'border-[#4ea0ff] bg-[linear-gradient(180deg,#1e5fa7,#16234d)]', pill: 'border-[#3d82d8] bg-[linear-gradient(180deg,#182e63,#101525)]' },
  apple3: { title: '黄金苹果', frame: 'border-[#d8b74c] bg-[linear-gradient(180deg,#8f6d17,#3e2d14)]', pill: 'border-[#b9962f] bg-[linear-gradient(180deg,#3a3018,#1d170f)]' },
};
// const RECORD_IMAGE_BY_INDEX = ['/shop/r1.png', '/shop/r2.png', '/shop/r3.png', '/shop/r4.png'];
const RARITY_ICON_BY_LABEL: Record<string, string> = {
  普通: '/shop/xing4.png',
  稀有: '/shop/xing3.png',
  史诗: '/shop/xing2.png',
  传说: '/shop/xing1.png',
  C: '/shop/xing4.png',
  B: '/shop/xing3.png',
  A: '/shop/xing2.png',
  S: '/shop/xing1.png',
  SS: '/shop/xing1.png',
  SSS: '/shop/xing1.png',
};
const FEED_COUNT_BY_ITEM: Record<string, number> = {
  apple1: 1,
  apple2: 2,
  apple3: 3,
};
const staminaShopItems: ShopItem[] = [
  {
    id: 'apple1',
    name: '小苹果',
    icon: '🍎',
    description: '补充 AI 体力',
    price: SMALL_APPLE_PRICE,
    effect: { type: 'stamina', value: SMALL_APPLE_RECOVERY },
  },
];

/* ═══════════════════════ Main Component ═══════════════════════ */
export const Shop: React.FC<ShopProps> = ({
  balance,
  pet,
  onBack,
  onRequireAuth,
}) => {
  const [phase, setPhase] = useState<HatchPhase>('idle');
  const [hatchResult, setHatchResult] = useState<PetEggHatchResponse | null>(null);
  const openDoneRef = useRef(false);
  const hatchReadyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previewScrollMobileRef = useRef<HTMLDivElement | null>(null);
  const ownedPetsScrollMobileRef = useRef<HTMLDivElement | null>(null);
  const previewDragScroll = useHorizontalDragScroll();
  const ownedPetsDragScroll = useHorizontalDragScroll();
  const [buyFlash, setBuyFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionMiss, setActionMiss] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [appleBuyOpen, setAppleBuyOpen] = useState(false);
  const [appleBuyCount, setAppleBuyCount] = useState(1);
  const hatchMutation = useRequestPetEggHatch();
  const ownedPetsQuery = useRequestPetOwned();
  const gachaConfigQuery = useRequestPetGachaConfig();
  const petDefsQuery = useRequestPetDefs({ page: 1, size: 200 });
  const requireAuth = useRequireAuth(onRequireAuth);
  const gachaCost =
    typeof gachaConfigQuery.data?.cost === 'number' ? gachaConfigQuery.data.cost : GACHA_COST;
  const aiAppleMutation = useRequestAiStaminaApple();

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const playWinHatchAnimation = useCallback(() => {
    timerRef.current.push(
      setTimeout(() => {
        openDoneRef.current = true;
        setPhase((current) => {
          if (current !== 'opening') return current;
          return hatchReadyRef.current ? 'reveal' : 'glowing';
        });
      }, SHOP_EGG_REVEAL_DELAY_MS),
    );
  }, []);

  /* ── Gacha：先请求接口；未中奖仅提示；中奖才播开蛋动画 ── */
  const doGacha = useCallback(() => {
    if (phase !== 'idle' || hatchMutation.isLoading) return;
    if (!requireAuth()) return;

    clearTimers();
    setActionError(null);
    setActionSuccess(null);
    setActionMiss(null);
    setHatchResult(null);
    openDoneRef.current = false;
    hatchReadyRef.current = false;

    void hatchMutation
      .mutateAsync()
      .then((result) => {
        if (!isPetEggHatchWin(result)) {
          setPhase('idle');
          setHatchResult(null);
          openDoneRef.current = false;
          hatchReadyRef.current = false;
          setActionMiss(getPetEggHatchMissMessage(result));
          return;
        }

        setHatchResult(result);
        hatchReadyRef.current = true;
        setActionSuccess(getPetEggHatchWinMessage(result));
        setPhase('opening');
        setPhase((current) => {
          if (current === 'glowing' || (current === 'opening' && openDoneRef.current)) {
            return 'reveal';
          }
          return current;
        });
        playWinHatchAnimation();
      })
      .catch((error) => {
        clearTimers();
        openDoneRef.current = false;
        hatchReadyRef.current = false;
        setPhase('idle');
        setHatchResult(null);
        setActionError(getPetApiErrorMessage(error, '开蛋失败，请稍后重试。'));
        if (isAuthError(error)) {
          onRequireAuth?.();
        }
      });
  }, [clearTimers, hatchMutation, onRequireAuth, phase, playWinHatchAnimation, requireAuth]);

  const resetGacha = useCallback(() => {
    clearTimers();
    openDoneRef.current = false;
    hatchReadyRef.current = false;
    setPhase('idle');
    setHatchResult(null);
    setActionError(null);
    setActionSuccess(null);
    setActionMiss(null);
  }, [clearTimers]);

  /* ── Buy apple ── */
  const buyApple = useCallback(
    async (item: ShopItem, count = FEED_COUNT_BY_ITEM[item.id] ?? 1) => {
      if (aiAppleMutation.isLoading) return;
      if (!requireAuth()) return;

      setActionError(null);
      setActionSuccess(null);

      try {
        const result = await aiAppleMutation.mutateAsync({
          count,
        });
        setBuyFlash(item.id);
        setActionSuccess(
          `购买成功，已使用 ${count} 个小苹果。当前 AI 体力 ${result.stamina ?? '-'} / ${result.maxStamina ?? '-'}。`,
        );
        setAppleBuyOpen(false);
        setAppleBuyCount(1);
        setTimeout(() => setBuyFlash(null), 600);
      } catch (error) {
        setActionError(getPetApiErrorMessage(error, '购买失败，请稍后重试。'));
        if (isAuthError(error)) {
          onRequireAuth?.();
        }
      }
    },
    [aiAppleMutation, onRequireAuth, requireAuth],
  );

  const firstStaminaItem = staminaShopItems[0];
  const confirmSmallApplePurchase = useCallback(() => {
    if (!firstStaminaItem) return;
    void buyApple(firstStaminaItem, Math.max(1, Math.floor(appleBuyCount)));
  }, [appleBuyCount, buyApple, firstStaminaItem]);

  const ownedPetList = ownedPetsQuery.data?.list ?? [];
  // const featuredPets = ownedPetList.slice(0, 5);
  const probabilityRows = (gachaConfigQuery.data?.probabilities ?? []).map((item) => {
      const rarity = normalizePetRarityGrade(item.rarity);
      return {
        ...item,
        label: rarity,
        icon: RARITY_ICON_BY_LABEL[rarity] ?? RARITY_ICON_BY_LABEL.C,
        tone: getPetRarityTextClass(rarity),
      };
    });
  const petPoolPreviewRows = useMemo(() => {
    const apiList = petDefsQuery.data?.list;
    if (!apiList?.length) return [];

    return apiList.map((item, index) => ({
      key: `def-${item.id}-${index}`,
      petKey: item.petKey,
      label: item.displayName.replace(/v1$/, ''),
      rarityGrade: normalizePetRarityGrade(item.rarity),
      preview: resolvePetPreviewAsset({
        avatarUrl: item.avatarUrl,
        petKey: item.petKey,
        petName: item.displayName,
      }),
    }));
  }, [petDefsQuery.data?.list]);

  const petDefList = petDefsQuery.data?.list ?? [];

  const petDefByKey = useMemo(() => {
    const map = new Map<string, { avatarUrl?: string; petKey: string; displayName: string }>();
    for (const def of petDefList) {
      map.set(def.petKey, def);
      map.set(def.displayName, def);
    }
    return map;
  }, [petDefList]);

  const resolveOwnedPetSource = useCallback(
    (petItem: OwnedPetItem) => {
      const def = petDefByKey.get(petItem.petKey ?? '') ?? petDefByKey.get(petItem.petName ?? '');
      return {
        avatarUrl: def?.avatarUrl,
        petKey: petItem.petKey ?? def?.petKey,
        petName: petItem.petName ?? def?.displayName,
      };
    },
    [petDefByKey],
  );

  // const recordRows = [
  //   { name: heroName, ago: '刚刚', rarity: '传说' },
  //   { name: featuredPets[1]?.petName ?? '星眸少女', ago: '5分钟前', rarity: '史诗' },
  //   { name: featuredPets[2]?.petName ?? '钢铁爬爬', ago: '8分钟前', rarity: '稀有' },
  //   { name: featuredPets[3]?.petName ?? '西瓜巨人', ago: '15分钟前', rarity: '普通' },
  //   { name: featuredPets[4]?.petName ?? '熔岩巨壳', ago: '23分钟前', rarity: '稀有' },
  //   { name: '钻石龟', ago: '31分钟前', rarity: '史诗' },
  // ].map((item, index) => ({ ...item, image: RECORD_IMAGE_BY_INDEX[index % RECORD_IMAGE_BY_INDEX.length] ?? RECORD_IMAGE_BY_INDEX[0] }));

  return (
    <div className="legacy-shop-page min-w-0 max-w-full overflow-x-hidden space-y-3 px-0 md:space-y-4">
      <div className="grid gap-3.5 md:hidden md:gap-4">
        <ShopGachaHeroMobile
          balance={balance}
          pet={pet}
          gachaCost={gachaCost}
          hatchPhase={phase}
          hatchResult={hatchResult}
          petDefs={petDefList}
          isHatchLoading={hatchMutation.isLoading}
          actionError={actionError}
          actionSuccess={actionSuccess}
          actionMiss={actionMiss}
          onBack={onBack}
          onGacha={doGacha}
          onResetGacha={resetGacha}
        />

        <div className={`${card} min-w-0 overflow-hidden !px-0 !py-0`}>
          <div className="grid min-w-0 gap-3 p-1">
            <section className="relative min-w-0 overflow-hidden rounded-[24px] border border-[#9a73ff]/30 bg-[linear-gradient(135deg,rgba(18,12,48,0.46)_0%,rgba(76,42,150,0.38)_30%,rgba(32,74,150,0.34)_58%,rgba(18,120,118,0.22)_78%,rgba(10,18,48,0.48)_100%)] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(210,188,255,0.16)]">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(195,128,255,0.92),rgba(101,151,255,0.88),rgba(113,255,225,0.65),transparent)]" />
              <div className="relative rounded-[22px] border border-white/12 bg-[linear-gradient(135deg,rgba(22,16,54,0.36),rgba(88,44,144,0.3),rgba(38,82,156,0.26),rgba(18,92,92,0.18))] p-3 shadow-[inset_0_1px_0_rgba(222,212,255,0.12)]">
                <div className="text-base font-black text-white">奖池概率</div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {probabilityRows.length > 0 ? probabilityRows.map((item) => <div key={item.label} className="flex min-w-0 items-center justify-between rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,20,48,0.92),rgba(35,31,84,0.9),rgba(16,78,85,0.88))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"><div className="flex min-w-0 items-center gap-2"><img src={item.icon} alt={item.label} className="h-6 w-6 shrink-0 object-contain" /><span className={`truncate text-[15px] font-black ${item.tone}`}>{item.label}</span></div><span className={`shrink-0 text-[16px] font-black ${item.tone}`}>{item.value}</span></div>) : (
                    <TextEmptyState text="暂无概率数据" className="sm:col-span-2" />
                  )}
                </div>
              </div>
              <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(22,16,56,0.38),rgba(98,42,154,0.32),rgba(44,86,160,0.28),rgba(18,92,92,0.18),rgba(14,20,52,0.4))] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(222,212,255,0.14)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[15px] font-black text-white">奖池预览</div>
                  <button type="button" onClick={() => setIsPreviewDialogOpen(true)} className="touch-manipulation text-[12px] font-bold text-white/72 transition hover:text-white">全部预览 &gt;</button>
                </div>
                <div ref={previewScrollMobileRef} className="mt-3 flex min-w-0 gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {petPoolPreviewRows.length > 0 ? petPoolPreviewRows.map((item) => (
                    <PetPoolPreviewTile
                      key={`m-${item.key}`}
                      variant="strip"
                      rarityGrade={item.rarityGrade}
                      label={item.label}
                      petKey={item.petKey}
                      preview={item.preview}
                    />
                  )) : (
                    <TextEmptyState text="暂无预览数据" className="min-w-full py-3 text-sm text-white/70" />
                  )}
                </div>
              </div>
            </section>

            <section className="relative min-w-0 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(28,14,64,0.42),rgba(98,42,154,0.34),rgba(44,86,160,0.24),rgba(12,20,50,0.42))] px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(230,210,255,0.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(195,120,255,0.18),transparent_36%),radial-gradient(circle_at_100%_0%,rgba(105,122,255,0.14),transparent_30%)]" />
              <div className="relative flex items-center justify-between gap-2">
                <div className="text-[15px] font-black text-white">体力商店</div>
                <div className="inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-300/10 px-2.5 py-1 text-[12px] font-semibold text-rose-200">
                  <Heart size={13} strokeWidth={2.3} />
                  {pet.stamina}/{pet.maxStamina}
                </div>
              </div>
              {firstStaminaItem ? (
                <div className="relative mt-4 grid grid-cols-1 gap-3">
                  <div className={`relative min-w-0 overflow-hidden px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${STAMINA_SHOP_META.apple1.frame}`}>
                    {buyFlash === firstStaminaItem.id && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white/20" />}
                    <div className="truncate text-[13px] font-black text-white">小苹果</div>
                    <img src={APPLE_IMAGE_BY_ITEM.apple1} alt="小苹果" className="mx-auto mt-3 h-[clamp(64px,8vw,96px)] w-[clamp(64px,8vw,96px)] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]" />
                    <div className="mt-3 text-[18px] font-black text-white">+{SMALL_APPLE_RECOVERY}</div>
                    <div className={`mx-auto mt-4 inline-flex h-[38px] min-w-[74px] items-center justify-center gap-1.5 rounded-full border px-3 text-[14px] font-black text-white ${STAMINA_SHOP_META.apple1.pill}`}>
                      <Coins size={14} className="text-emerald-300" /> {SMALL_APPLE_PRICE}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppleBuyOpen(true)}
                      className="relative mx-auto mt-4 flex h-[56px] w-full max-w-[168px] touch-manipulation items-center justify-center overflow-hidden text-center"
                    >
                      <img src="/shop/btn-g.png" alt="购买按钮" className="absolute inset-0 h-full w-full object-fill" />
                      <span className="relative z-10 flex items-center gap-2 text-[20px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,40,0,0.45)]">
                        购买
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className={`${card} min-w-0 !px-3 !py-3 sm:!px-4 sm:!py-4`}>
          <h3 className="!mb-2.5 text-base font-bold text-slate-700 dark:text-rdark-text sm:text-lg">
            已拥有龟种 ({ownedPetList.length})
          </h3>
          <div
            ref={ownedPetsScrollMobileRef}
            className="flex min-w-0 gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ownedPetList.length > 0 ? ownedPetList.map((petItem) => (
              <div
                key={String(petItem.petId)}
                className={`relative flex h-40 w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(22,16,56,0.38),rgba(98,42,154,0.32),rgba(44,86,160,0.28),rgba(14,20,52,0.4))] px-3 text-center shadow-[0_12px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(222,212,255,0.12)] ${petItem.isEquipped ? 'border-cyan-300/70 ring-2 ring-cyan-400/75 ring-offset-2 ring-offset-[#071527]' : ''}`}
              >
                {petItem.isEquipped ? (
                  <div className="absolute left-[-1px] top-[-1px] z-10 rounded-br-xl rounded-tl-[22px] border border-cyan-300/70 bg-cyan-400/95 px-2.5 py-1 text-[10px] font-black text-[#06242c] shadow-[0_6px_14px_rgba(34,211,238,0.22)]">
                    已装备
                  </div>
                ) : null}
                <div className="mx-auto flex justify-center">
                  <PetAssetPreview
                    {...resolveOwnedPetSource(petItem)}
                    size={80}
                    className="mx-auto drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]"
                    imageClassName="object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]"
                  />
                </div>
                <span className={`rounded-full !px-2 !py-0.5 text-[13px] font-semibold ${getPetRarityBadgeClass(petItem.rarity)}`}>
                  {normalizePetRarityGrade(petItem.rarity)}
                </span>
                <span className="truncate text-[11px] font-bold text-white">{petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}</span>
              </div>
            )) : (
              <TextEmptyState text="暂无已拥有龟种" className="min-h-40 w-full" />
            )}
          </div>
        </div>
      </div>

      <div className={`${card} hidden min-w-0 md:block overflow-hidden !px-0 !py-0`}>
        <div className="grid min-w-0 gap-3 p-1 md:grid-cols-3 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,0.82fr)]">
          <section className="relative min-h-[600px] min-w-0 overflow-hidden rounded-[22px] px-4 py-5 md:col-span-3 md:px-5 2xl:col-span-3 !bg-transparent">
            <img src={SHOP_BG} alt="黑市背景" className="absolute inset-0 h-full w-full object-fill" />
            <div
              className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
              style={{ transform: `translate(${SHOP_AURORA_STAGE_OFFSET_X}px, ${SHOP_AURORA_STAGE_OFFSET_Y}px)` }}
            >
              <ShopGachaStageLayers />
            </div>
            <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(8,14,30,0.18),rgba(5,10,20,0.2))]" />
            {phase !== 'idle' ? (
              <div className={SHOP_GACHA_EGG_STAGE_ANCHOR.desktop.className}>
                <ShopGachaEggStage
                  hatchPhase={phase}
                  hatchResult={hatchResult}
                  petDefs={petDefList}
                  variant="desktop"
                />
              </div>
            ) : null}
            <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2">
              {phase === 'idle' ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={doGacha}
                  disabled={hatchMutation.isLoading}
                  className="relative flex h-[58px] w-[220px] items-center justify-center overflow-hidden text-center disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <img src="/shop/btn-o.png" alt="孵化按钮" className="absolute inset-0 h-full w-full object-fill" />
                  <span className="relative z-10 text-[18px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)]">{hatchMutation.isLoading ? '准备中...' : `${gachaCost}龟币孵化`}</span>
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
            <div className="relative z-20 px-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[31px] font-black tracking-tight text-white">宠物抽奖</div>
                  <div className="mt-1 text-[14px] font-medium text-white/80">极光之力，守护你的每一次召唤!</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/84">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-200"><Coins size={14} /> {balance.toLocaleString()}</span>
                  </div>
                  {actionError ? (
                    <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-rose-300">{actionError}</p>
                  ) : null}
                  {actionMiss ? (
                    <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-amber-200">{actionMiss}</p>
                  ) : null}
                  {actionSuccess ? (
                    <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-emerald-300">{actionSuccess}</p>
                  ) : null}
                </div>
                <button onClick={onBack} className="relative z-20 flex shrink-0 items-center gap-1 rounded-full border border-white/14 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/86 shadow-[0_8px_18px_rgba(0,0,0,0.22)] backdrop-blur transition hover:bg-white/10 hover:text-white">
                  <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> 返回
                </button>
              </div>
            </div>
          </section>
          <section className="relative min-w-0 overflow-hidden rounded-[24px] border border-[#9a73ff]/30 bg-[linear-gradient(135deg,rgba(18,12,48,0.46)_0%,rgba(76,42,150,0.38)_30%,rgba(32,74,150,0.34)_58%,rgba(18,120,118,0.22)_78%,rgba(10,18,48,0.48)_100%)] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(210,188,255,0.16)] md:col-span-2 2xl:col-span-2">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(195,128,255,0.92),rgba(101,151,255,0.88),rgba(113,255,225,0.65),transparent)]" />
            <div className="relative rounded-[22px] border border-white/12 bg-[linear-gradient(135deg,rgba(22,16,54,0.36),rgba(88,44,144,0.3),rgba(38,82,156,0.26),rgba(18,92,92,0.18))] p-3 shadow-[inset_0_1px_0_rgba(222,212,255,0.12)]">
              <div className="text-base font-black text-white">奖池概率</div>
              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {probabilityRows.length > 0 ? probabilityRows.map((item) => <div key={item.label} className="flex min-w-0 items-center justify-between rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,20,48,0.92),rgba(35,31,84,0.9),rgba(16,78,85,0.88))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"><div className="flex min-w-0 items-center gap-2"><img src={item.icon} alt={item.label} className="h-6 w-6 shrink-0 object-contain" /><span className={`truncate text-[15px] font-black ${item.tone}`}>{item.label}</span></div><span className={`shrink-0 text-[16px] font-black ${item.tone}`}>{item.value}</span></div>) : (
                  <TextEmptyState text="暂无概率数据" className="xl:col-span-2" />
                )}
              </div>
            </div>
            <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(22,16,56,0.38),rgba(98,42,154,0.32),rgba(44,86,160,0.28),rgba(18,92,92,0.18),rgba(14,20,52,0.4))] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(222,212,255,0.14)]">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-black text-white">奖池预览</div>
                <button onClick={() => setIsPreviewDialogOpen(true)} className="text-[12px] font-bold text-white/72 transition hover:text-white">全部预览 &gt;</button>
              </div>
              <div
                ref={previewDragScroll.scrollRef}
                onMouseDown={previewDragScroll.onMouseDown}
                className={`mt-3 ${HORIZONTAL_DRAG_SCROLL_TRACK_CLASS}`}
              >
                {petPoolPreviewRows.length > 0 ? petPoolPreviewRows.slice(0, 12).map((item) => (
                  <PetPoolPreviewTile
                    key={item.key}
                    variant="strip"
                    rarityGrade={item.rarityGrade}
                    label={item.label}
                    petKey={item.petKey}
                    preview={item.preview}
                  />
                )) : (
                  <TextEmptyState text="暂无预览数据" className="min-w-full py-3 text-sm text-white/70" />
                )}
              </div>
            </div>
          </section>
          <section className="relative min-w-0 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(28,14,64,0.42),rgba(98,42,154,0.34),rgba(44,86,160,0.24),rgba(12,20,50,0.42))] px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(230,210,255,0.12)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(195,120,255,0.18),transparent_36%),radial-gradient(circle_at_100%_0%,rgba(105,122,255,0.14),transparent_30%)]" />
            <div className="relative text-[15px] font-black text-white">体力商店</div>
            {firstStaminaItem ? (
              <div className="relative mt-4 grid grid-cols-1 gap-3">
                <div className={`relative min-w-0 overflow-hidden  px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${STAMINA_SHOP_META.apple1.frame}`}>
                  {buyFlash === firstStaminaItem.id && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white/20" />}
                  <div className="truncate text-[13px] font-black text-white">小苹果</div>
                  <img src={APPLE_IMAGE_BY_ITEM.apple1} alt="小苹果" className="mx-auto mt-3 h-[clamp(64px,8vw,96px)] w-[clamp(64px,8vw,96px)] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]" />
                  <div className="mt-3 text-[18px] font-black text-white">+{SMALL_APPLE_RECOVERY}</div>
                  <div className={`mx-auto mt-4 inline-flex h-[38px] min-w-[74px] items-center justify-center gap-1.5 rounded-full border px-3 text-[14px] font-black text-white ${STAMINA_SHOP_META.apple1.pill}`}>
                    <Coins size={14} className="text-emerald-300" /> {SMALL_APPLE_PRICE}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppleBuyOpen(true)}
                    className="relative mx-auto mt-4 flex h-[56px] w-full max-w-[168px] items-center justify-center overflow-hidden text-center"
                  >
                    <img src="/shop/btn-g.png" alt="购买按钮" className="absolute inset-0 h-full w-full object-fill" />
                    <span className="relative z-10 flex items-center gap-2 text-[20px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,40,0,0.45)]">
                      购买
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </section>
          {/* <section className="relative min-w-0 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(24,14,48,0.58),rgba(17,17,36,0.72))] px-4 py-4 shadow-[0_14px_32px_rgba(0,0,0,0.26)]">
            <div className="flex items-center justify-between"><div className="text-base font-bold text-white">抽奖记录</div><div className="text-xs text-white/50">全部记录</div></div>
            <div className="mt-4 grid gap-3">{recordRows.slice(0, 4).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3"><div className="flex items-center gap-3"><img src={item.image} alt={item.name} className="h-10 w-10 rounded-full object-cover" /><div className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${item.rarity === '传说' ? 'bg-amber-500/12 text-amber-300' : item.rarity === '史诗' ? 'bg-fuchsia-500/12 text-fuchsia-300' : item.rarity === '稀有' ? 'bg-sky-500/12 text-sky-300' : 'bg-lime-500/12 text-lime-300'}`}>{item.rarity}</div><div className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{item.name}</div><div className="shrink-0 text-[11px] text-white/48">{item.ago}</div></div></div>)}</div>
          </section> */}
        </div>
      </div>
      <AnimatePresence>
        {isPreviewDialogOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#020817]/82 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 16 }} className="flex max-h-[min(92dvh,920px)] min-h-0 w-full max-w-[860px] flex-col overflow-hidden rounded-t-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(8,18,48,0.96),rgba(75,37,123,0.9),rgba(20,101,98,0.88),rgba(9,20,45,0.96))] p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,0.46)] sm:max-h-[90vh] sm:rounded-[28px] sm:p-4 sm:pb-4">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <div className="text-base font-black text-white sm:text-lg">全部预览</div>
                <button type="button" onClick={() => setIsPreviewDialogOpen(false)} className="touch-manipulation rounded-full border border-white/12 px-3 py-1.5 text-sm font-bold text-white/72">
                  关闭
                </button>
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable] sm:mt-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
                  {petPoolPreviewRows.length > 0 ? petPoolPreviewRows.map((item) => (
                    <PetPoolPreviewTile
                      key={`dialog-${item.key}`}
                      variant="dialog"
                      rarityGrade={item.rarityGrade}
                      label={item.label}
                      petKey={item.petKey}
                      preview={item.preview}
                    />
                  )) : (
                    <TextEmptyState text="暂无预览数据" className="col-span-2 min-h-40 sm:col-span-3 md:col-span-4" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {appleBuyOpen && firstStaminaItem ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#020817]/82 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 14 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 14 }} className="w-full max-w-[420px] overflow-hidden rounded-t-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(18,12,48,0.98),rgba(64,34,112,0.94),rgba(12,42,58,0.94))] p-4 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,0.46)] sm:rounded-[26px] sm:p-5 sm:pb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-white">购买小苹果</div>
                  <div className="mt-1 text-xs font-semibold text-white/58">每个恢复 {SMALL_APPLE_RECOVERY} 点体力，单价 {SMALL_APPLE_PRICE} 龟币</div>
                </div>
                <button type="button" onClick={() => setAppleBuyOpen(false)} className="touch-manipulation rounded-full border border-white/12 px-3 py-1 text-sm font-bold text-white/72 transition hover:text-white">
                  关闭
                </button>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center gap-4">
                  <img src={APPLE_IMAGE_BY_ITEM.apple1} alt="小苹果" className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-white">小苹果</div>
                    <div className="mt-1 text-xs text-white/58">本次恢复 +{appleBuyCount * SMALL_APPLE_RECOVERY} 体力</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-sm font-black text-emerald-200">
                      <Coins size={14} /> {appleBuyCount * SMALL_APPLE_PRICE}
                    </div>
                  </div>
                </div>

                <label className="mt-5 block text-xs font-bold text-white/62" htmlFor="small-apple-count">购买数量</label>
                <input
                  id="small-apple-count"
                  type="number"
                  min={1}
                  step={1}
                  value={appleBuyCount}
                  onChange={(event) => setAppleBuyCount(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/12 bg-[#071127]/70 px-4 text-base font-black text-white outline-none transition focus:border-emerald-300/45"
                />
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" onClick={() => setAppleBuyOpen(false)} className="touch-manipulation rounded-2xl border border-white/12 py-2.5 text-sm font-bold text-white/62 transition hover:text-white sm:px-4">
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmSmallApplePurchase}
                  disabled={aiAppleMutation.isLoading}
                  className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(16,185,129,0.28)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-55 sm:px-5"
                >
                  <Coins size={15} />
                  {aiAppleMutation.isLoading ? '购买中...' : '确认购买'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {/* ━━━ Skin Collection ━━━ */}
      <div className={`${card} hidden md:block !mt-3 md:!mt-4 !px-3 sm:!px-4 md:!px-5 !py-3 md:!py-4`}>
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-700 dark:text-rdark-text !mb-2.5 md:!mb-3">
          已拥有龟种 ({ownedPetList.length})
        </h3>
        <div
          ref={ownedPetsDragScroll.scrollRef}
          onMouseDown={ownedPetsDragScroll.onMouseDown}
          className={HORIZONTAL_DRAG_SCROLL_TRACK_CLASS}
        >
          {ownedPetList.length > 0 ? ownedPetList.map((petItem) => (
            <div
              key={String(petItem.petId)}
              className={`relative flex h-40 w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(22,16,56,0.38),rgba(98,42,154,0.32),rgba(44,86,160,0.28),rgba(14,20,52,0.4))] px-3 text-center shadow-[0_12px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(222,212,255,0.12)] transition ${petItem.isEquipped ? 'border-cyan-300/70 ring-2 ring-cyan-400/75 ring-offset-2 ring-offset-[#071527]' : ''}`}
            >
              {petItem.isEquipped ? (
                <div className="absolute left-[-1px] top-[-1px] z-10 rounded-br-xl rounded-tl-[22px] border border-cyan-300/70 bg-cyan-400/95 px-2.5 py-1 text-[10px] font-black text-[#06242c] shadow-[0_6px_14px_rgba(34,211,238,0.22)]">
                  已装备
                </div>
              ) : null}
              <div className="mx-auto flex justify-center">
                <PetAssetPreview
                  {...resolveOwnedPetSource(petItem)}
                  size={80}
                  className="mx-auto drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]"
                  imageClassName="object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]"
                />
              </div>
              <span
                className={`text-[13px] font-semibold !px-2 !py-0.5 rounded-full ${getPetRarityBadgeClass(petItem.rarity)}`}
              >
                {normalizePetRarityGrade(petItem.rarity)}
              </span>
              <span className="truncate text-[11px] font-bold text-white">{petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}</span>
            </div>
          )) : (
            <TextEmptyState text="暂无已拥有龟种" className="min-h-40 w-full" />
          )}
        </div>
      </div>
    </div>
  );
};
