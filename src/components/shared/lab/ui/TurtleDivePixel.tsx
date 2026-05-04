/**
 * 文件说明：Turtle Dive Pixel，实验室小游戏相关共享组件。
 */
import React from 'react';
import type { OwnedPetItem, PetEquipInfo } from '@/hooks/petTypes';
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
    subtitle="从海底连跳 50 层气泡，带上你的龟龟冲回海面"
    immersive
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
