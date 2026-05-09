/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { mockPetSkins, mockUser, type PetSkin } from '@/data/mockData';
import { useHomeLayoutContext } from '@/layouts/context';
import { useAppSession } from '@/hooks/useAppSession';
import {
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hooks/usePetRequests';
import { ShopPageView } from './components/ShopPageView';
import { getPetMoodLabel } from './components/petDisplay';

export default function ShopPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(mockUser.balance);
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins] = useState<PetSkin[]>(mockPetSkins);
  const { onOpenAuth } = useHomeLayoutContext();

  // 商城页自己维护它需要的金币和宠物接口，页面壳统一交给 layouts/home。
  const { coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();

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
    if (typeof coinMe.data?.balance === 'number') {
      setBalance(coinMe.data.balance);
    }
  }, [coinMe.data?.balance]);

  useEffect(() => {
    if (typeof petStaminaQuery.data?.current === 'number') {
      setPetStamina(petStaminaQuery.data.current);
    }
  }, [petStaminaQuery.data?.current]);

  return (
    <ShopPageView
      balance={balance}
      pet={currentPet}
      petStaminaInfo={petStaminaQuery.data ?? null}
      onBack={() => {
        navigate('/');
      }}
      onRequireAuth={onOpenAuth}
    />
  );
}
