/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import type { PetInfo, PetSkin } from '@/components/common/pet/petTypes';
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
  const [balance, setBalance] = useState(0);
  const [petStamina, setPetStamina] = useState(0);
  const [skins] = useState<PetSkin[]>([]);
  const { onOpenAuth } = useHomeLayoutContext();

  // 商城页自己维护它需要的金币和宠物接口，页面壳统一交给 layouts/home。
  const { coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();

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
