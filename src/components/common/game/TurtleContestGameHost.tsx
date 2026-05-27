/**
 * 文件说明：龟龟争霸（Phaser）独立游戏宿主，与旧版 turtle-battle 完全分离。
 */
import React, { useEffect } from 'react';
import type { OwnedPetItem, PetEquipInfo } from '@/hooks/petTypes';
import { StaticGameHost } from '@/components/common/game/StaticGameHost';

const TURTLE_CONTEST_CLOSE_MESSAGE = 'turtle-contest:close';

interface TurtleContestGameHostProps {
  onBack?: () => void;
  mobileMode?: boolean;
  balance?: number;
  ownedPets?: OwnedPetItem[];
  equippedPet?: PetEquipInfo | null;
}

export const TurtleContestGameHost: React.FC<TurtleContestGameHostProps> = ({
  onBack,
  mobileMode = false,
  balance,
  ownedPets,
  equippedPet,
}) => {
  useEffect(() => {
    if (!onBack) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { type?: string } | null;
      if (payload?.type === TURTLE_CONTEST_CLOSE_MESSAGE) {
        onBack();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onBack]);

  return (
  <StaticGameHost
    title="龟龟争霸"
    subtitle="Phaser 版深海闯关与 3V3 对战"
    htmlPath="/games/turtle-contest-phaser/index.html"
    standalonePath="/games/turtle-contest-phaser/index.html"
    stripSelectors={[]}
    onBack={onBack}
    mobileMode={mobileMode}
    balance={balance}
    ownedPets={ownedPets}
    equippedPet={equippedPet}
  />
  );
};
