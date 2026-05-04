/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PetPage as SharedPetPage } from '@/components/shared/pet';
import { getPetMoodLabel } from '@/components/shared/pet/ui/petDisplay';
import { mockPetSkins, mockUser, type PetSkin } from '@/data/mockData';
import { useAppSession } from '@/hooks/useAppSession';
import {
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetEquipUpdate,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hooks/usePetRequests';

export default function PetPage() {
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins, setSkins] = useState<PetSkin[]>(mockPetSkins);

  // 宠物页自己维护金币、当前装备龟种、拥有龟种、体力和心情接口。
  const { coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();
  const petEquipMutation = useRequestPetEquipUpdate();

  const equippedSkin = skins.find((skin) => skin.equipped && skin.owned);
  const equippedOwnedPet = useMemo(() => findEquippedOwnedPet(petOwnedQuery.data), [petOwnedQuery.data]);
  const currentPet = useMemo(() => ({
    ...mockUser.petInfo,
    name: petEquipQuery.data?.petName ?? mockUser.petInfo.name,
    status: getPetMoodLabel(petStatusQuery.data?.moodState) ?? mockUser.petInfo.status,
    level: petEquipQuery.data?.level ?? equippedOwnedPet?.level ?? mockUser.petInfo.level,
    stamina: petStamina,
    maxStamina: petStaminaQuery.data?.cap ?? mockUser.petInfo.maxStamina,
    avatar: equippedSkin?.avatar ?? mockUser.petInfo.avatar,
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
    <section className="view-shell view-rhythm view-pet mx-0 grid w-full max-w-none gap-4">
      <SharedPetPage
        pet={currentPet}
        balance={coinMe.data?.balance ?? mockUser.balance}
        winRate={0.68}
        winStreak={mockUser.winStreak}
        totalPredictions={42}
        onBack={() => {
          window.location.href = '/';
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
      />
    </section>
  );
}
