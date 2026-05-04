/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useEffect, useMemo, useState } from 'react';
import { ProfilePage as SharedProfilePage } from '@/components/shared/profile';
import { getPetMoodLabel } from '@/components/shared/pet/ui/petDisplay';
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

export default function ProfilePage() {
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
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

  return (
    <section className="view-shell view-rhythm view-profile mx-0 grid w-full max-w-none gap-4">
      <SharedProfilePage
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
          window.location.href = '/';
        }}
        onOpenForum={() => {
          window.location.href = '/forum';
        }}
        onOpenAuth={onOpenAuth}
        onToggleTheme={onToggleTheme}
      />
    </section>
  );
}
