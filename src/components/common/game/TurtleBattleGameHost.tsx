/**
 * 文件说明：龟战 Arena 静态游戏宿主，统一承载新的 turtle-battle-poc 游戏。
 */
import React from 'react';
import type { OwnedPetItem, PetEquipInfo } from '@/hooks/petTypes';
import { StaticGameHost } from '@/components/common/game/StaticGameHost';

export const TURTLE_BATTLE_GAME_URL = '/games/turtle-arena-game/index.html';

interface TurtleBattleGameHostProps {
  mobileMode?: boolean;
  isImmersive?: boolean;
  balance?: number;
  ownedPets?: OwnedPetItem[];
  equippedPet?: PetEquipInfo | null;
}

export const TurtleBattleGameHost: React.FC<TurtleBattleGameHostProps> = ({
  mobileMode = false,
  isImmersive = true,
  balance,
  ownedPets,
  equippedPet,
}) => {
  return (
    <StaticGameHost
      title="龟战 Arena"
      subtitle="Phaser 深海闯关与 3V3 对战"
      htmlPath={TURTLE_BATTLE_GAME_URL}
      standalonePath={TURTLE_BATTLE_GAME_URL}
      stripSelectors={[]}
      onFrameLoad={(doc) => {
        doc.documentElement.style.background = '#0a0e18';
        doc.body.style.background = 'transparent';
        doc.body.style.overflow = 'hidden';
      }}
      immersive={isImmersive}
      mobileMode={mobileMode}
      balance={balance}
      ownedPets={ownedPets}
      equippedPet={equippedPet}
    />
  );
};
