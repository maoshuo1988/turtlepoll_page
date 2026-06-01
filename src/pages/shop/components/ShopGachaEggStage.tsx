/** 文件说明：抽奖区龟蛋开蛋/发光与 reveal 宠物图，仅在点击孵化后展示。 */
import { SHOP_GACHA_EGG_STAGE_LAYOUT } from '@/config/shopSpineAssets';
import { isPetEggHatchWin, type PetDefNormalized, type PetEggHatchResponse } from '@/hooks/petTypes';
import { ShopEggSpine } from './ShopEggSpine';
import { ShopHatchRevealPet } from './ShopHatchRevealPet';

export type ShopEggHatchPhase = 'idle' | 'opening' | 'glowing' | 'reveal';
type ShopGachaEggStageVariant = keyof typeof SHOP_GACHA_EGG_STAGE_LAYOUT;

interface ShopGachaEggStageProps {
  hatchPhase: ShopEggHatchPhase;
  hatchResult: PetEggHatchResponse | null;
  petDefs: PetDefNormalized[];
  variant: ShopGachaEggStageVariant;
}

function resolveEggDisplayMode(hatchPhase: ShopEggHatchPhase) {
  if (hatchPhase === 'opening') return 'egg' as const;
  if (hatchPhase === 'glowing' || hatchPhase === 'reveal') return 'glow' as const;
  return 'hidden' as const;
}

export function ShopGachaEggStage({
  hatchPhase,
  hatchResult,
  petDefs,
  variant,
}: ShopGachaEggStageProps) {
  if (hatchPhase === 'idle') return null;

  const layout = SHOP_GACHA_EGG_STAGE_LAYOUT[variant];
  const displayMode = resolveEggDisplayMode(hatchPhase);
  const showPet = hatchPhase === 'reveal' && hatchResult && isPetEggHatchWin(hatchResult);

  return (
    <div className={layout.wrapper}>
      <ShopEggSpine displayMode={displayMode} className={layout.spine} stageVariant={variant} />
      {showPet ? (
        <div className={layout.revealOverlay}>
          <ShopHatchRevealPet
            hatchResult={hatchResult}
            petDefs={petDefs}
            previewSize={layout.revealPreviewSize}
            className="justify-end"
          />
        </div>
      ) : null}
    </div>
  );
}
