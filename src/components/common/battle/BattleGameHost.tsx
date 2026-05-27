/**
 * 文件说明：Battle Game Host，旧版 JS 龟龟对战宿主。
 */
import React from 'react';
import type { OwnedPetItem, PetEquipInfo } from '@/hooks/petTypes';
import { StaticGameHost } from '@/components/common/game/StaticGameHost';

interface BattleGameHostProps {
  onBack?: () => void;
  mobileMode?: boolean;
  balance?: number;
  ownedPets?: OwnedPetItem[];
  equippedPet?: PetEquipInfo | null;
}

export const BattleGameHost: React.FC<BattleGameHostProps> = ({
  onBack,
  mobileMode = false,
  balance,
  ownedPets,
  equippedPet,
}) => (
  <StaticGameHost
    title="龟龟对战"
    subtitle="按当前项目组件架构挂载的原项目 3V3 战斗"
    htmlPath="/games/turtle-battle/index.html"
    standalonePath="/games/turtle-battle/index.html"
    stripSelectors={['.top-nav', '#screenMenu .menu-top-bar a.back-link']}
    onBack={onBack}
    mobileMode={mobileMode}
    balance={balance}
    ownedPets={ownedPets}
    equippedPet={equippedPet}
  />
);
