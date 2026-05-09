/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { mockCommunityPosts, mockPetSkins, mockUser, type PetSkin } from '@/data/mockData';
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
  const [skins] = useState<PetSkin[]>(mockPetSkins);
  const { darkMode, onToggleTheme, onOpenAuth } = useHomeLayoutContext();

  // 我的主页自己维护用户、金币、宠物接口，避免依赖 AppShell 的全局 activeView。
  const { userInfo, coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();

  const equippedSkin = skins.find((skin) => skin.equipped && skin.owned);
  const equippedOwnedPet = useMemo(() => findEquippedOwnedPet(petOwnedQuery.data), [petOwnedQuery.data]);
  const storedUser = getStoredUserInfo();
  const petStamina = petStaminaQuery.data?.current ?? mockUser.petInfo.stamina;
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

  return (
    <ProfilePageView
      userId={userInfo.data?.id ?? storedUser?.id ?? ''}
      userName={storedUser?.username ?? '路边社社长'}
      userHandle="预测达人"
      avatar="🦊"
      posts={mockCommunityPosts}
      pet={currentPet}
      skins={skins}
      balance={coinMe.data?.balance ?? mockUser.balance}
      darkMode={darkMode}
      onBack={() => {
        navigate('/');
      }}
      onOpenForum={() => {
        navigate('/forum');
      }}
      onOpenAuth={onOpenAuth}
      onToggleTheme={onToggleTheme}
      ownedPets={petOwnedQuery.data?.list ?? []}
    />
  );
}
