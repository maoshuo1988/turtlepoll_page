/**
 * 文件说明：Sidebar Desktop Profile Panel，PC 左侧栏相关展示组件。
 */
import React from 'react';
import { ChevronRight, UserRound } from 'lucide-react';
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
  onOpenProfile,
  onOpenChat: _onOpenChat,
  onOpenShop,
  onOpenPetSpace,
  onOpenActivePredictions,
}) => {
  const userCurrent = useRequestUserCurrent();
  const coinMe = useRequestCoinMe();
  const displayBalance = coinMe.data?.balance ?? 0;
  const user = userCurrent.data;
  const displayName = user?.nickname || user?.username || user?.email || '个人中心';
  const displaySubtitle = user?.levelTitle?.trim() || (user ? '查看个人资料' : '登录后同步个人资料');
  const avatar = typeof user?.avatar === 'string' ? user.avatar.trim() : '';
  const isAvatarImage = /^https?:\/\//.test(avatar) || avatar.startsWith('/');

  const staminaDen = Math.max(pet.maxStamina || 1, 1);
  const staminaPercent = Math.round(Math.min(100, Math.max(0, (pet.stamina / staminaDen) * 100)));

  if (chatOpen) {
    return <PetChat pet={pet} onClose={onCloseChat} aiPushMessages={aiPushMessages} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-left transition-colors hover:border-emerald-400/25 hover:bg-emerald-400/[0.06]"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[#1d1e22] to-[#0f1013] text-lg font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
          {isAvatarImage ? (
            <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
          ) : avatar ? (
            <span>{avatar}</span>
          ) : (
            <UserRound size={20} className="text-zinc-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-white">{displayName}</div>
          <div className="mt-0.5 truncate text-[10px] text-zinc-500">{displaySubtitle}</div>
        </div>
        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
      </button>

      <PetProfilePanel
        balance={displayBalance}
        winStreak={0}
        winRate={0}
        totalPredictions={0}
        activePredictions={0}
        pet={{ name: pet.name, level: pet.level, avatar: pet.avatar }}
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
