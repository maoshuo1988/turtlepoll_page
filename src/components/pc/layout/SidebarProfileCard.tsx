/**
 * 文件说明：Sidebar Profile Card，PC 左侧栏相关展示组件。
 */
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { PetChat } from '@/components/common/pet/PetChat';
import type { AiPushMessage } from '@/hooks/aiTypes';
import type { PetInfo } from '@/components/common/pet/petTypes';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import { useRequestCoinMe } from '@/hooks/useCoinRequests';
import { PetProfilePanel } from './PetProfilePanel';
import { ShopShortcutCard } from './ShopShortcutCard';

const DEFAULT_USER_AVATAR = '/image/default-header.png';

function petBadgeIconFromAvatar(avatar: string): string {
  const t = avatar.trim();
  if (!t) return '🐢';
  const first = [...t][0];
  return first ?? '🐢';
}

interface SidebarProfileCardProps {
  pet: PetInfo;
  aiPushMessages?: AiPushMessage[];
  chatOpen: boolean;
  currentDialogue: string;
  dialogueKey: number;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onOpenProfile: () => void;
  onOpenActivePredictions: () => void;
  onOpenShop: () => void;
  onOpenPetSpace: () => void;
}

export const SidebarProfileCard: React.FC<SidebarProfileCardProps> = ({
  pet,
  aiPushMessages = [],
  chatOpen,
  currentDialogue,
  dialogueKey,
  onOpenChat,
  onCloseChat,
  onOpenProfile,
  onOpenActivePredictions,
  onOpenShop,
  onOpenPetSpace,
}) => {
  const userCurrent = useRequestUserCurrent();
  const coinMe = useRequestCoinMe();
  const displayBalance = coinMe.data?.balance ?? 0;
  const user = userCurrent.data;
  const displayName = user?.nickname || user?.username || user?.email || '未登录用户';
  const displaySubtitle = user?.levelTitle?.trim() || (user ? '暂无等级称号' : '登录后同步你的等级称号');
  const avatarValue = typeof user?.avatar === 'string' && user.avatar.trim() ? user.avatar.trim() : '';
  const isAvatarImage = /^https?:\/\//.test(avatarValue) || avatarValue.startsWith('/');
  const avatarSrc = isAvatarImage ? avatarValue : DEFAULT_USER_AVATAR;

  const staminaDen = Math.max(pet.maxStamina || 1, 1);
  const staminaPercent = Math.round(Math.min(100, Math.max(0, (pet.stamina / staminaDen) * 100)));

  return (
    <div
      className={`rounded-xl 
        bg-[#0f1013] 
        dark:bg-rdark-card 
        border 
        border-white/8 
        dark:border-rdark-border 
        shadow-[0_12px_28px_rgba(0,0,0,0.24)] 
        dark:shadow-none 
        overflow-hidden
        lg:rounded-2xl
        lg:shadow-none`}
    >
      {chatOpen ? (
        <PetChat pet={pet} onClose={onCloseChat} aiPushMessages={aiPushMessages} />
      ) : (
        <div className="flex flex-col gap-3 !px-4 !pb-4 !pt-4">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent p-0 text-left transition-all hover:border-white/8 hover:bg-white/[0.03]"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[#1c1d22] to-[#0f1013] text-xl font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
              {avatarValue && !isAvatarImage ? (
                <span>{avatarValue}</span>
              ) : (
                <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-white dark:text-rdark-text">{displayName}</div>
              <div className="mt-0.5 truncate text-[10px] text-zinc-500 dark:text-rdark-text2">{displaySubtitle}</div>
            </div>
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

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200/60 bg-white/50 py-2.5 text-[11px] font-bold text-emerald-600 shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-white dark:border-emerald-800/60 dark:bg-rdark-card/50 dark:text-emerald-400 dark:hover:bg-rdark-card"
          >
            <MessageCircle size={13} /> 和龟仙人聊聊
          </button>
        </div>
      )}
    </div>
  );
};
