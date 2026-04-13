import React from 'react';
import type { OwnedPetItem, PetEquipInfo } from '@/hook/petType';
import { StaticGameHost } from '@/components/shared/game/ui/StaticGameHost';

interface TurtleDivePixelProps {
  onBack?: () => void;
  mobileMode?: boolean;
  balance?: number;
  ownedPets?: OwnedPetItem[];
  equippedPet?: PetEquipInfo | null;
}

export const TurtleDivePixel: React.FC<TurtleDivePixelProps> = ({
  onBack,
  mobileMode = false,
  balance,
  ownedPets,
  equippedPet,
}) => (
  <StaticGameHost
    title="龟龟出海"
    subtitle="按当前项目组件架构挂载的原项目小游戏"
    htmlPath="/games/turtle-jump/index.html"
    standalonePath="/games/turtle-jump/index.html"
    stripSelectors={['.nav']}
    onBack={onBack}
    mobileMode={mobileMode}
    balance={balance}
    ownedPets={ownedPets}
    equippedPet={equippedPet}
  />
);
