/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo, useState } from 'react';
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
import { getStoredUserInfo } from '@/utils/authStorage';
import { ProfilePageView } from './components/ProfilePageView';
import { getPetMoodLabel } from './components/petDisplay';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [skins] = useState<PetSkin[]>([]);
  const { onOpenAuth } = useHomeLayoutContext();

  // 我的主页自己维护用户、金币、宠物接口，避免依赖 AppShell 的全局 activeView。
  const { coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();

  const equippedSkin = skins.find((skin) => skin.equipped && skin.owned);
  const equippedOwnedPet = useMemo(() => findEquippedOwnedPet(petOwnedQuery.data), [petOwnedQuery.data]);
  const storedUser = getStoredUserInfo();
  const displayName = storedUser?.nickname ?? storedUser?.username ?? '未登录用户';
  const displayHandle = storedUser?.username ? `@${storedUser.username}` : '';
  const displayAvatar = storedUser?.nickname?.slice(0, 1).toUpperCase() ?? '';
  const petStamina = petStaminaQuery.data?.current ?? 0;
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

  return (
    <ProfilePageView
      userName={displayName}
      userHandle={displayHandle}
      avatar={displayAvatar}
      pet={currentPet}
      skins={skins}
      balance={coinMe.data?.balance ?? 0}
      onBack={() => {
        navigate('/');
      }}
      onOpenForum={() => {
        navigate('/forum');
      }}
      onOpenAuth={onOpenAuth}
      ownedPets={petOwnedQuery.data?.list ?? []}
    />
  );
}
