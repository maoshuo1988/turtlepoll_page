import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { AppFooter, AppHeader } from '@/app/pc';
import { AuthModal } from '@/components/shared/auth';
import { Shop } from '@/components/shared/shop';
import { mockPetSkins, mockUser, type PetSkin } from '@/data/mock_data';
import { COIN_ME_QUERY_KEY } from '@/hook/useCoinRequest';
import { useAppSession } from '@/hook/useAppSession';
import {
  PET_EQUIP_QUERY_KEY,
  PET_OWNED_QUERY_KEY,
  PET_STATUS_QUERY_KEY,
  PET_STAMINA_QUERY_KEY,
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hook/usePetRequest';
import { useRequestSignout } from '@/hook/useRequest';
import { getPetMoodLabel } from '@/components/shared/pet/ui/petDisplay';
import { clearInfo } from '@/utils/authStorage';

const THEME_KEY = 'theme';
type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === 'dark';
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
}

export default function ShopPage() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [balance, setBalance] = useState(mockUser.balance);
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins] = useState<PetSkin[]>(mockPetSkins);
  const darkMode = theme === 'dark';

  // 黑市页自己维护它需要的登录态、金币和宠物接口，避免再绕到 AppShell。
  const { userInfo, coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();
  const signOutMutation = useRequestSignout();

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
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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

  const refreshSessionData = useCallback(async () => {
    await Promise.all([
      userInfo.refetch(),
      coinMe.refetch(),
      petEquipQuery.refetch(),
      petOwnedQuery.refetch(),
      petStaminaQuery.refetch(),
      petStatusQuery.refetch(),
    ]);
  }, [coinMe, petEquipQuery, petOwnedQuery, petStaminaQuery, petStatusQuery, userInfo]);

  const clearSessionCaches = useCallback(() => {
    queryClient.removeQueries(['requestUserCurrent']);
    queryClient.removeQueries(['requestBadgeBadges']);
    queryClient.removeQueries(['requestUserMsgRecent']);
    queryClient.removeQueries(COIN_ME_QUERY_KEY);
    queryClient.removeQueries(PET_EQUIP_QUERY_KEY);
    queryClient.removeQueries(PET_OWNED_QUERY_KEY);
    queryClient.removeQueries(PET_STAMINA_QUERY_KEY);
    queryClient.removeQueries(PET_STATUS_QUERY_KEY);
    setBalance(mockUser.balance);
    setPetStamina(mockUser.petInfo.stamina);
  }, [queryClient]);

  const handleSessionSignOut = useCallback(async () => {
    try {
      await signOutMutation.mutateAsync();
    } finally {
      clearInfo();
      clearSessionCaches();
      setAuthModalOpen(false);
    }
  }, [clearSessionCaches, signOutMutation]);

  const handleSessionAuthSuccess = useCallback(() => {
    void refreshSessionData();
    setAuthModalOpen(false);
  }, [refreshSessionData]);

  return (
    <div className="legacy-fusion-app fixed-sidebar-style min-h-screen overflow-x-hidden bg-[#080808] text-white dark:bg-rdark transition-colors">
      <AppHeader
        darkMode={darkMode}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="mx-auto min-h-[calc(100vh-56px)] w-full max-w-[1440px] px-0 pb-12 pt-3 lg:px-8">
        <Shop
          balance={balance}
          pet={currentPet}
          petStaminaInfo={petStaminaQuery.data ?? null}
          onBack={() => {
            window.location.href = '/';
          }}
          onRequireAuth={() => setAuthModalOpen(true)}
        />
      </main>

      <div className="border-t border-white/8 bg-[#080808]/96 px-3 py-3 dark:border-rdark-border dark:bg-rdark/96">
        <AppFooter />
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignOut={handleSessionSignOut}
        onAuthSuccess={handleSessionAuthSuccess}
      />
    </div>
  );
}
