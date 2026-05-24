/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import type { PetInfo, PetSkin } from '@/components/common/pet/petTypes';
import { useAppSession } from '@/hooks/useAppSession';
import {
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetEquipUpdate,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hooks/usePetRequests';
import { PetPageView } from './components/PetPageView';
import { getPetMoodLabel } from './components/petDisplay';
import { useHomeLayoutContext } from '@/layouts/context';

export default function PetPage() {
  const navigate = useNavigate();
  const { aiPushMessages } = useHomeLayoutContext();
  const [petStamina, setPetStamina] = useState(0);
  const [skins, setSkins] = useState<PetSkin[]>([]);

  // 宠物页自己维护金币、当前装备龟种、拥有龟种、体力和心情接口。
  const { coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();
  const petEquipMutation = useRequestPetEquipUpdate();

  const equippedSkin = skins.find((skin) => skin.equipped && skin.owned);
  const equippedOwnedPet = useMemo(() => findEquippedOwnedPet(petOwnedQuery.data), [petOwnedQuery.data]);
  const currentPet = useMemo<PetInfo>(() => ({
    name: petEquipQuery.data?.petName ?? '',
    status: getPetMoodLabel(petStatusQuery.data?.moodState) ?? '',
    level: petEquipQuery.data?.level ?? equippedOwnedPet?.level ?? 0,
    stamina: petStamina,
    maxStamina: petStaminaQuery.data?.cap ?? 0,
    avatar: equippedSkin?.avatar ?? '',
  }), [
    equippedOwnedPet?.level,
    equippedSkin?.avatar,
    petEquipQuery.data?.level,
    petEquipQuery.data?.petName,
    petStamina,
    petStaminaQuery.data?.cap,
    petStatusQuery.data?.moodState,
  ]);

  useEffect(() => {
    if (typeof petStaminaQuery.data?.current === 'number') {
      setPetStamina(petStaminaQuery.data.current);
    }
  }, [petStaminaQuery.data?.current]);

  const handleEquipSkin = useCallback((skinId: string) => {
    setSkins((prev) => prev.map((skin) => ({ ...skin, equipped: skin.id === skinId })));
  }, []);

  const handleEquipPet = useCallback(async (petId: number | string) => {
    const result = await petEquipMutation.mutateAsync({ petId });
    void Promise.all([
      petEquipQuery.refetch(),
      petOwnedQuery.refetch(),
      petStatusQuery.refetch(),
    ]);
    return result;
  }, [petEquipMutation, petEquipQuery, petOwnedQuery, petStatusQuery]);

  return (
    <PetPageView
      pet={currentPet}
      balance={coinMe.data?.balance ?? 0}
      winRate={0}
      winStreak={0}
      totalPredictions={0}
      onBack={() => {
        navigate('/');
      }}
      skins={skins}
      onEquipSkin={handleEquipSkin}
      equippedPet={petEquipQuery.data ?? null}
      ownedPets={petOwnedQuery.data?.list ?? []}
      petStatus={petStatusQuery.data ?? null}
      petStaminaInfo={petStaminaQuery.data ?? null}
      onEquipPet={handleEquipPet}
      equippingPetId={
        petEquipMutation.isLoading
          ? (petEquipMutation.variables?.petId ?? petEquipMutation.variables?.petKey ?? null)
          : null
      }
      onStaminaChange={setPetStamina}
      aiPushMessages={aiPushMessages}
    />
  );
}
