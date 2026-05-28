/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import type { PetInfo, PetSkin } from '@/components/common/pet/petTypes';
import { LoginRequiredPage } from '@/components/common/state/PageState';
import { useHomeLayoutContext } from '@/layouts/context';
import { useAppSession } from '@/hooks/useAppSession';
import {
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hooks/usePetRequests';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import { createUserAvatarUrl } from '@/utils/userAvatar';
import { ProfilePageView } from './components/ProfilePageView';
import { getPetDisplayAvatar, getPetMoodLabel } from './components/petDisplay';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [skins] = useState<PetSkin[]>([]);
  const { onOpenAuth } = useHomeLayoutContext();
  const token = getAuthToken();

  // 我的主页自己维护用户、金币、宠物接口，避免依赖 AppShell 的全局 activeView。
  const { user, coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();

  const equippedSkin = skins.find((skin) => skin.equipped && skin.owned);
  const equippedOwnedPet = useMemo(() => findEquippedOwnedPet(petOwnedQuery.data), [petOwnedQuery.data]);
  const storedUser = getStoredUserInfo();
  const userId = user?.id;
  const displayName = storedUser?.nickname ?? storedUser?.username ?? '未登录用户';
  const displayHandle = storedUser?.username ? `@${storedUser.username}` : '';
  const avatarUrl = createUserAvatarUrl(userId, 96);
  const petStamina = petStaminaQuery.data?.current ?? 0;
  const petKey = petEquipQuery.data?.petKey ?? equippedOwnedPet?.petKey;
  const petName = petEquipQuery.data?.petName ?? equippedOwnedPet?.petName ?? '';
  const currentPet = useMemo<PetInfo>(() => ({
    name: petName,
    status: getPetMoodLabel(petStatusQuery.data?.moodState) ?? '',
    level: petEquipQuery.data?.level ?? equippedOwnedPet?.level ?? 0,
    stamina: petStamina,
    maxStamina: petStaminaQuery.data?.cap ?? 0,
    avatar: equippedSkin?.avatar || getPetDisplayAvatar(petKey, petName),
    petKey,
    icon: petEquipQuery.data?.icon,
    image: petEquipQuery.data?.image,
  }), [
    equippedOwnedPet?.level,
    equippedSkin?.avatar,
    petEquipQuery.data?.icon,
    petEquipQuery.data?.image,
    petEquipQuery.data?.level,
    petKey,
    petName,
    petStamina,
    petStaminaQuery.data?.cap,
    petStatusQuery.data?.moodState,
  ]);

  if (!token) {
    return (
      <section className="view-profile h-full min-h-full xl:bg-[#080808] px-3 pt-[10px]">
        <LoginRequiredPage
          title="登录后查看个人中心"
          description="登录后即可查看和管理你的帖子、评论与宠物档案。"
          actionLabel="去登录"
          onAction={onOpenAuth}
          className="min-h-[420px]"
        />
      </section>
    );
  }

  return (
    <ProfilePageView
      userName={displayName}
      userHandle={displayHandle}
      avatarUrl={avatarUrl}
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
