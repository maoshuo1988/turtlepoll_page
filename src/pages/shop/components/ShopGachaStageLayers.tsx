/** 文件说明：黑市抽奖主视觉层：极光 + 双龟法师（分层异步加载，尺寸随舞台变化）。 */
import { useEffect, useRef, useState } from 'react';
import {
  getShopWizardStageSize,
  SHOP_GACHA_STAGE_LAYERS,
  SHOP_GACHA_STAGE_WIZARDS_MOBILE,
} from '@/config/shopSpineAssets';
import {
  markShopStageBootComplete,
  resetShopStageBootGate,
} from '@/components/common/spine/shopStageBootGate';
import { ShopAuroraSpine } from './ShopAuroraSpine';
import { ShopSpineLayer } from './ShopSpineLayer';

type ShopGachaStageVariant = 'desktop' | 'mobile';

interface ShopGachaStageLayersProps {
  /** 龟蛋动画由 ShopGachaEggStage 在按钮上方单独展示，背景层不再渲染蛋。 */
  showEgg?: boolean;
  variant?: ShopGachaStageVariant;
}

/** 舞台分层加载间隔（毫秒）：极光 → 右法师 → 左法师 */
const STAGE_LAYER_DEFER_MS = [0, 80, 160] as const;
const STAGE_BOOT_FALLBACK_MS = 2500;

export function ShopGachaStageLayers({ showEgg = false, variant = 'desktop' }: ShopGachaStageLayersProps) {
  const wizardLayers = variant === 'mobile' ? SHOP_GACHA_STAGE_WIZARDS_MOBILE : SHOP_GACHA_STAGE_LAYERS;
  const { wizard, wizard2 } = wizardLayers;
  const stageRef = useRef<HTMLDivElement>(null);
  const [wizardStageSize, setWizardStageSize] = useState(200);
  const [mountTier, setMountTier] = useState(0);
  void showEgg;

  useEffect(() => {
    resetShopStageBootGate();
    setMountTier(0);
    const timers = STAGE_LAYER_DEFER_MS.map((delay, index) =>
      window.setTimeout(() => setMountTier(index + 1), delay),
    );
    const fallbackTimer = window.setTimeout(() => markShopStageBootComplete(), STAGE_BOOT_FALLBACK_MS);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(fallbackTimer);
    };
  }, [variant]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;

    const syncSize = () => {
      const { width } = node.getBoundingClientRect();
      setWizardStageSize(getShopWizardStageSize(width));
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(node);
    window.addEventListener('resize', syncSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncSize);
    };
  }, []);

  const wizardBox = { width: wizardStageSize, height: wizardStageSize };

  return (
    <div ref={stageRef} className="pointer-events-none absolute inset-0 overflow-visible">
      {mountTier >= 1 ? <ShopAuroraSpine className="z-[1]" /> : null}
      {mountTier >= 2 ? (
        <ShopSpineLayer
          assetKey="wizard2"
          className={wizard.className}
          containerStyle={wizardBox}
          animation={wizard2.animation}
          fit={wizard2.fit}
          verticalAlign={wizard2.verticalAlign}
          offsetX={wizard2.offsetX}
          offsetY={wizard2.offsetY}
          clipContent={wizard.clipContent}
          canvasBleedRatio={wizard.canvasBleedRatio}
          canvasBleedAnchor={wizard.canvasBleedAnchor}
          renderPadding={wizard.renderPadding}
          boundsClipMargin={wizard.boundsClipMargin}
          loop={wizard2.animationLoop}
        />
      ) : null}
      {mountTier >= 3 ? (
        <ShopSpineLayer
          assetKey="wizard"
          className={wizard2.className}
          containerStyle={wizardBox}
          animation={wizard.animation}
          fit={wizard.fit}
          verticalAlign={wizard.verticalAlign}
          offsetX={wizard.offsetX}
          offsetY={wizard.offsetY}
          clipContent={wizard2.clipContent}
          canvasBleedRatio={wizard2.canvasBleedRatio}
          canvasBleedAnchor={wizard2.canvasBleedAnchor}
          renderPadding={wizard2.renderPadding}
          boundsClipMargin={wizard2.boundsClipMargin}
          loop={wizard.animationLoop}
        />
      ) : null}
    </div>
  );
}
