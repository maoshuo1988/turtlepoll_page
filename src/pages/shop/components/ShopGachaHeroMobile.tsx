/** 文件说明：黑市手机端抽奖主舞台（背景、极光、蛋与孵化按钮）。 */
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import type { PetInfo } from '@/components/common/pet/petTypes';
import type { PetDefNormalized, PetEggHatchResponse } from '@/hooks/petTypes';
import {
  SHOP_AURORA_STAGE_OFFSET_MOBILE_X,
  SHOP_AURORA_STAGE_OFFSET_MOBILE_Y,
  SHOP_GACHA_HERO_MOBILE_MIN_HEIGHT,
} from '@/config/shopSpineAssets';
import { ShopGachaEggStage, type ShopEggHatchPhase } from './ShopGachaEggStage';
import { ShopGachaStageLayers } from './ShopGachaStageLayers';

const SHOP_BG = '/shop/bg.png';

interface ShopGachaHeroMobileProps {
  balance: number;
  pet: PetInfo;
  gachaCost: number;
  hatchPhase: ShopEggHatchPhase;
  hatchResult: PetEggHatchResponse | null;
  petDefs: PetDefNormalized[];
  isHatchLoading: boolean;
  actionError: string | null;
  actionSuccess: string | null;
  actionMiss: string | null;
  onBack: () => void;
  onGacha: () => void;
  onResetGacha: () => void;
}

export function ShopGachaHeroMobile({
  balance,
  pet,
  gachaCost,
  hatchPhase,
  hatchResult,
  petDefs,
  isHatchLoading,
  actionError,
  actionSuccess,
  actionMiss,
  onBack,
  onGacha,
  onResetGacha,
}: ShopGachaHeroMobileProps) {
  return (
    <section
      className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#071527] shadow-[0_16px_44px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.04]"
      style={{ minHeight: SHOP_GACHA_HERO_MOBILE_MIN_HEIGHT }}
    >
      <img src={SHOP_BG} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div
        className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
        style={{
          transform: `translate(${SHOP_AURORA_STAGE_OFFSET_MOBILE_X}px, ${SHOP_AURORA_STAGE_OFFSET_MOBILE_Y}px)`,
        }}
      >
        <ShopGachaStageLayers variant="mobile" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(6,12,26,0.2),rgba(4,8,18,0.55))]" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_120%_70%_at_50%_18%,transparent_0%,rgba(0,0,0,0.35)_100%)]" />

      {hatchPhase !== 'idle' ? (
        <div className="pointer-events-none absolute bottom-[58px] left-1/2 z-[8] -translate-x-[calc(50%+10px)] overflow-visible">
          <ShopGachaEggStage
            hatchPhase={hatchPhase}
            hatchResult={hatchResult}
            petDefs={petDefs}
            variant="mobile"
          />
        </div>
      ) : null}

      <div className="absolute bottom-0 left-1/2 z-10 w-full max-w-full -translate-x-1/2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        {hatchPhase === 'idle' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onGacha}
            disabled={isHatchLoading}
            aria-busy={isHatchLoading}
            className="relative mx-auto flex h-[58px] w-[min(220px,100%)] touch-manipulation items-center justify-center overflow-hidden text-center disabled:cursor-not-allowed disabled:opacity-70"
          >
            <img src="/shop/btn-o.png" alt="孵化按钮" className="absolute inset-0 h-full w-full object-fill" />
            <span className="relative z-10 text-[17px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)] sm:text-[18px]">
              {isHatchLoading ? '准备中...' : `${gachaCost}龟币孵化`}
            </span>
          </motion.button>
        ) : hatchPhase === 'reveal' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onResetGacha}
            className="relative mx-auto flex h-[58px] w-[min(220px,100%)] touch-manipulation items-center justify-center overflow-hidden text-center"
          >
            <img src="/shop/btn-o.png" alt="继续孵化" className="absolute inset-0 h-full w-full object-fill" />
            <span className="relative z-10 text-[17px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)] sm:text-[18px]">
              继续孵化
            </span>
          </motion.button>
        ) : (
          <div className="relative mx-auto flex h-[58px] w-[min(220px,100%)] items-center justify-center overflow-hidden text-center opacity-75">
            <img src="/shop/btn-o.png" alt="孵化中" className="absolute inset-0 h-full w-full object-fill" />
            <span className="relative z-10 text-[17px] font-black tracking-[0.02em] text-white drop-shadow-[0_2px_4px_rgba(120,48,0,0.55)] sm:text-[18px]">
              孵化中...
            </span>
          </div>
        )}
      </div>

      <div className="relative z-20 px-3 pb-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 pr-1">
            <div className="text-[24px] font-black leading-tight tracking-tight text-white sm:text-[28px]">宠物抽奖</div>
            <div className="mt-1 text-[12px] font-medium text-white/78 sm:text-[13px]">极光之力，守护你的每一次召唤!</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:text-xs">
                <Coins size={13} strokeWidth={2.3} aria-hidden />
                {balance.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/20 bg-rose-300/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200 sm:text-xs">
                <Heart size={13} strokeWidth={2.3} aria-hidden />
                {pet.stamina}/{pet.maxStamina}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] shrink-0 touch-manipulation items-center justify-center gap-1 rounded-full border border-white/14 bg-black/40 px-3 py-2 text-[12px] font-bold text-white backdrop-blur-sm active:bg-black/55"
          >
            <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
            返回
          </button>
        </div>

        {actionError ? <p className="mt-2 text-[12px] leading-relaxed text-rose-300">{actionError}</p> : null}
        {actionMiss ? <p className="mt-2 text-[12px] leading-relaxed text-amber-200">{actionMiss}</p> : null}
        {actionSuccess ? <p className="mt-2 text-[12px] leading-relaxed text-emerald-300">{actionSuccess}</p> : null}
      </div>
    </section>
  );
}
