import React from 'react';
import { Coins, Flame, MessageCircle } from 'lucide-react';
import { PetChat } from '@/components/shared/pet/ui/PetChat';
import type { PetInfo } from '@/data/mock_data';
import { useRequestCoinMe } from '@/hook/useCoinRequest';

interface MobileProfileCardProps {
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  chatOpen: boolean;
  currentDialogue: string;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onViewPet: () => void;
  onOpenProfile: () => void;
  onOpenActivePredictions: () => void;
}

export const MobileProfileCard: React.FC<MobileProfileCardProps> = ({
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  chatOpen,
  currentDialogue,
  onOpenChat,
  onCloseChat,
  onViewPet,
  onOpenProfile,
  onOpenActivePredictions,
}) => {
  const coinMe = useRequestCoinMe();
  const displayBalance = coinMe.data?.balance ?? 0;

  if (chatOpen) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0f1013] shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        <PetChat pet={pet} onClose={onCloseChat} />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0f1013] shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/8 px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex w-full items-center gap-3 rounded-[22px] border border-white/8 bg-[#15161a] px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-[#181a1e]"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#1c1d22] to-[#0f1013] text-xl font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
            {pet.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-white">路边社社长</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">预测达人 · 连续签到 12 天</div>
          </div>
        </button>

        <div className="mt-3 rounded-[22px] border border-emerald-400/15 bg-[linear-gradient(135deg,rgba(16,24,19,0.96),rgba(13,15,18,0.96))] px-4 py-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <Coins size={16} className="text-emerald-400" />
            <span className="text-[12px] font-medium">当前龟币</span>
          </div>
          <div className="mt-2 text-[30px] font-extrabold leading-none tracking-tight text-emerald-300">
            {displayBalance.toLocaleString()}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-[18px] bg-[#15161a] px-2 py-3 text-center">
            <div className="text-[15px] font-bold leading-none text-white">{(winRate * 100).toFixed(0)}%</div>
            <div className="mt-1 text-[10px] text-zinc-500">胜率</div>
          </div>
          <div className="rounded-[18px] bg-[#15161a] px-2 py-3 text-center">
            <div className="flex items-center justify-center gap-0.5 text-[15px] font-bold leading-none text-emerald-300">
              <Flame size={12} className="text-orange-400" />
              {winStreak}
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">连胜</div>
          </div>
          <div className="rounded-[18px] bg-[#15161a] px-2 py-3 text-center">
            <div className="text-[15px] font-bold leading-none text-white">{totalPredictions}</div>
            <div className="mt-1 text-[10px] text-zinc-500">已预测</div>
          </div>
          <button
            type="button"
            onClick={onOpenActivePredictions}
            className="rounded-[18px] bg-[#15161a] px-2 py-3 text-center transition-colors hover:bg-[#1a1c20]"
          >
            <div className="text-[15px] font-bold leading-none text-white">{activePredictions}</div>
            <div className="mt-1 text-[10px] text-zinc-500">进行中</div>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewPet}
        className="relative block h-[196px] w-full overflow-hidden text-left"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,197,94,0.18),transparent_26%),radial-gradient(circle_at_76%_14%,rgba(251,191,36,0.16),transparent_24%),linear-gradient(180deg,#16171b_0%,#101114_60%,#0b0b0d_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[92px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.42))]" />
        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-semibold text-zinc-300">
          宠物空间
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
          Lv.{pet.level}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-7">
          <div className="mb-3 max-w-[210px] rounded-[18px] border border-white/10 bg-white/92 px-4 py-2 text-center shadow-lg">
            <span className="block truncate text-[11px] leading-5 text-slate-700">{currentDialogue}</span>
          </div>
          <div className="text-[50px] leading-none drop-shadow-lg">{pet.avatar}</div>
          <div className="mt-1 text-[12px] font-semibold text-white">{pet.name}</div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenChat();
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
          >
            <MessageCircle size={13} />
            和龟仙人聊聊
          </button>
        </div>
      </button>
    </section>
  );
};
