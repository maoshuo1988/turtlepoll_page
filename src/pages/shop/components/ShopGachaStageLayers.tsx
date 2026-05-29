/** 文件说明：黑市抽奖主视觉层：极光 + 双龟法师（尺寸随舞台容器宽度变化）。 */
import { useEffect, useRef, useState } from 'react';
import { getShopWizardStageSize, SHOP_GACHA_STAGE_LAYERS } from '@/config/shopSpineAssets';
import { ShopAuroraSpine } from './ShopAuroraSpine';
import { ShopSpineLayer } from './ShopSpineLayer';

interface ShopGachaStageLayersProps {
  /** 龟蛋动画由 ShopGachaEggStage 在按钮上方单独展示，背景层不再渲染蛋。 */
  showEgg?: boolean;
}

export function ShopGachaStageLayers({ showEgg = false }: ShopGachaStageLayersProps) {
  const { wizard, wizard2 } = SHOP_GACHA_STAGE_LAYERS;
  const stageRef = useRef<HTMLDivElement>(null);
  const [wizardStageSize, setWizardStageSize] = useState(200);
  void showEgg;

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
      <ShopAuroraSpine className="z-[1]" />
      <ShopSpineLayer
        key={`wizard-right-${wizardStageSize}`}
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
      <ShopSpineLayer
        key={`wizard-left-${wizardStageSize}`}
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
    </div>
  );
}
