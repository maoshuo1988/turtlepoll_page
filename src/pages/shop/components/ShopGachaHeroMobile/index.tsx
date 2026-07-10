/** 文件说明：黑市手机端抽奖主舞台（背景、极光、蛋与孵化按钮）。 */
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import type { PetInfo } from '@/components/common/pet/petTypes';
import type { PetDefNormalized, PetEggHatchResponse } from '@/hooks/petTypes';
import {
  SHOP_AURORA_STAGE_OFFSET_MOBILE_X,
  SHOP_AURORA_STAGE_OFFSET_MOBILE_Y,
  SHOP_GACHA_HERO_MOBILE_MIN_HEIGHT,
  SHOP_GACHA_MOBILE_LAYER_Z,
} from '@/config/shopSpineAssets';
import { ShopGachaEggStage, type ShopEggHatchPhase } from '../ShopGachaEggStage';
import { ShopGachaStageLayers } from '../ShopGachaStageLayers';
import styles from './index.module.scss';

const SHOP_BTN_ORANGE = '/shop/btn-o.png';

const SHOP_BG = '/shop/bg.png';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

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
    <section className={css('hero')} style={{ minHeight: SHOP_GACHA_HERO_MOBILE_MIN_HEIGHT }}>
      <div className={css('heroBg')}>
        <img src={SHOP_BG} alt="" className={css('heroBgImg')} />
        <div className={css('heroBgMask')} />
      </div>

      <div
        className={`${css('stageWrap')} ${
          hatchPhase !== 'idle' ? SHOP_GACHA_MOBILE_LAYER_Z.stageHatch : SHOP_GACHA_MOBILE_LAYER_Z.stageIdle
        }`}
        style={{
          transform: `translate(${SHOP_AURORA_STAGE_OFFSET_MOBILE_X}px, ${SHOP_AURORA_STAGE_OFFSET_MOBILE_Y}px)`,
        }}
      >
        <ShopGachaStageLayers variant="mobile" />
      </div>

      {hatchPhase !== 'idle' ? (
        <div className={css('hatchStage')} aria-hidden>
          <div className={css('hatchStageAnchor')}>
            <ShopGachaEggStage
              hatchPhase={hatchPhase}
              hatchResult={hatchResult}
              petDefs={petDefs}
              variant="mobile"
            />
          </div>
        </div>
      ) : null}

      <div className={css('head')}>
        <div className={css('headRow')}>
          <div className="min-w-0 flex-1">
            <h1 className={css('title')}>宠物抽奖</h1>
            <p className={css('subtitle')}>召唤稀有龟种，补充体力道具</p>
            <div className={css('stats')}>
              <span className={`${css('statPill')} ${css('statCoin')}`}>
                <Coins size={13} strokeWidth={2.3} aria-hidden />
                {balance.toLocaleString()}
              </span>
              <span className={`${css('statPill')} ${css('statStamina')}`}>
                <Heart size={13} strokeWidth={2.3} aria-hidden />
                {pet.stamina}/{pet.maxStamina}
              </span>
            </div>
          </div>
          <button type="button" onClick={onBack} className={css('backBtn')} aria-label="返回">
            <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
            返回
          </button>
        </div>

        {actionError ? <p className={`${css('feedback')} ${css('feedbackError')}`}>{actionError}</p> : null}
        {actionMiss ? <p className={`${css('feedback')} ${css('feedbackMiss')}`}>{actionMiss}</p> : null}
        {actionSuccess ? <p className={`${css('feedback')} ${css('feedbackSuccess')}`}>{actionSuccess}</p> : null}
      </div>

      <div className={css('actionWrap')}>
        {hatchPhase === 'idle' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onGacha}
            disabled={isHatchLoading}
            aria-busy={isHatchLoading}
            className={css('hatchBtn')}
          >
            <img src={SHOP_BTN_ORANGE} alt="" className={css('hatchBtnImg')} aria-hidden />
            <span className={css('hatchBtnText')}>
              {isHatchLoading ? '准备中...' : `${gachaCost}龟币孵化`}
            </span>
          </motion.button>
        ) : hatchPhase === 'reveal' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onResetGacha}
            className={css('hatchBtn')}
          >
            <img src={SHOP_BTN_ORANGE} alt="" className={css('hatchBtnImg')} aria-hidden />
            <span className={css('hatchBtnText')}>继续孵化</span>
          </motion.button>
        ) : (
          <div className={`${css('hatchBtn')} ${css('hatchBtnIdle')}`}>
            <img src={SHOP_BTN_ORANGE} alt="" className={css('hatchBtnImg')} aria-hidden />
            <span className={css('hatchBtnText')}>孵化中...</span>
          </div>
        )}
      </div>
    </section>
  );
}
