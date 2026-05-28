/**
 * 文件说明：Sidebar Desktop Profile Panel，PC 左侧栏相关展示组件。
 */
import React from 'react';
import { PetChat } from '@/components/common/pet/PetChat';
import type { AiPushMessage } from '@/hooks/aiTypes';
import type { PetInfo } from '@/components/common/pet/petTypes';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import { useRequestCoinMe } from '@/hooks/useCoinRequests';
import { PetProfilePanel } from './PetProfilePanel';
import { ShopShortcutCard } from './ShopShortcutCard';

function petBadgeIconFromAvatar(avatar: string): string {
  const t = avatar.trim();
  if (!t) return '🐢';
  const first = [...t][0];
  return first ?? '🐢';
}

interface SidebarDesktopProfilePanelProps {
  pet: PetInfo;
  aiPushMessages?: AiPushMessage[];
  chatOpen: boolean;
  currentDialogue: string;
  dialogueKey: number;
  onCloseChat: () => void;
  onOpenProfile: () => void;
  onOpenChat: () => void;
  onOpenShop: () => void;
  onOpenPetSpace: () => void;
  onOpenActivePredictions: () => void;
}

export const SidebarDesktopProfilePanel: React.FC<SidebarDesktopProfilePanelProps> = ({
  pet,
  aiPushMessages = [],
  chatOpen,
  currentDialogue,
  dialogueKey,
  onCloseChat,
  onOpenProfile: _onOpenProfile,
  onOpenChat: _onOpenChat,
  onOpenShop,
  onOpenPetSpace,
  onOpenActivePredictions,
}) => {
  useRequestUserCurrent();
  const coinMe = useRequestCoinMe();
  const displayBalance = coinMe.data?.balance ?? 0;

  const staminaDen = Math.max(pet.maxStamina || 1, 1);
  const staminaPercent = Math.round(Math.min(100, Math.max(0, (pet.stamina / staminaDen) * 100)));

  if (chatOpen) {
    return <PetChat pet={pet} onClose={onCloseChat} aiPushMessages={aiPushMessages} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* <button
        type="button"
        onClick={onOpenProfile}
        className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent p-0 text-left transition-all hover:border-white/8 hover:bg-white/[0.03]"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[#1d1e22] to-[#0f1013] text-lg font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)] dark:from-[#1c1d22] dark:to-[#0f1013]">
          {avatarValue && !isAvatarImage ? (
            <span>{avatarValue}</span>
          ) : (
            <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-white dark:text-rdark-text">{displayName}</div>
          <div className="truncate text-[10px] text-zinc-500 dark:text-rdark-text2">{displaySubtitle}</div>
        </div>
      </button> */}

      <PetProfilePanel
        balance={displayBalance}
        winStreak={0}
        winRate={0}
        totalPredictions={0}
        activePredictions={0}
        pet={{
          name: pet.name,
          rarityKey: pet.rarityKey,
          level: pet.level,
          avatar: pet.avatar,
          petKey: pet.petKey,
          petId: pet.petId,
          icon: pet.icon,
          image: pet.image,
        }}
        currentDialogue={currentDialogue}
        dialogueKey={dialogueKey}
        onViewPet={onOpenPetSpace}
        onOpenActivePredictions={onOpenActivePredictions}
        petBadgeName={pet.name}
        petBadgeIcon={petBadgeIconFromAvatar(pet.avatar)}
        moodLabel={pet.status || '开心'}
        staminaPercent={staminaPercent}
      />

      <ShopShortcutCard onClick={onOpenShop} />

      {/* <button
        type="button"
        onClick={onOpenChat}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200/60 bg-white/80 py-2 text-[11px] font-bold text-emerald-600 shadow-md backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-white dark:border-emerald-800/60 dark:bg-rdark-card/80 dark:text-emerald-400 dark:hover:bg-rdark-card"
      >
        <MessageCircle size={13} /> 和龟仙人聊聊
      </button> */}
    </div>
  );
};
