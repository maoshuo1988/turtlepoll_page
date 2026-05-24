/**
 * 文件说明：个人主页宠物档案组件，展示已拥有乌龟数量和可手势滑动的龟列表。
 */
import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { PetInfo } from '@/components/common/pet/petTypes';
import type { OwnedPetItem } from '@/hooks/petTypes';
import { getPetDisplayAvatar } from './petDisplay';

interface ProfilePetArchiveProps {
  pet: PetInfo;
  ownedPets?: OwnedPetItem[];
  compact?: boolean;
}

type ArchivePet = {
  id: string;
  name: string;
  avatar: string;
  rarity: string;
  level: number;
  xp?: number;
  isEquipped: boolean;
};

const rarityClassMap: Record<string, string> = {
  SSR: 'border-amber-300/28 bg-amber-300/12 text-amber-200',
  SR: 'border-fuchsia-300/24 bg-fuchsia-300/12 text-fuchsia-200',
  R: 'border-sky-300/24 bg-sky-300/12 text-sky-200',
  N: 'border-white/12 bg-white/[0.05] text-[#aeb8bf]',
};

const panelClass = 'rounded-[22px] border border-white/8 bg-white/[0.03] !p-2';

function normalizeRarity(rarity?: unknown) {
  if (!rarity) return 'N';
  if (typeof rarity === 'string' || typeof rarity === 'number') {
    return String(rarity).toUpperCase();
  }
  if (typeof rarity === 'object') {
    const value = rarity as { label?: unknown; name?: unknown; value?: unknown; code?: unknown };
    const displayValue = value.label ?? value.name ?? value.value ?? value.code;
    if (typeof displayValue === 'string' || typeof displayValue === 'number') {
      return String(displayValue).toUpperCase();
    }
  }
  return 'N';
}

function getRarityClass(rarity: string) {
  return rarityClassMap[rarity] ?? 'border-emerald-300/22 bg-emerald-300/10 text-emerald-200';
}

export const ProfilePetArchive: React.FC<ProfilePetArchiveProps> = ({
  pet,
  ownedPets,
  compact = false,
}) => {
  const touchStartXRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const archivePets = useMemo<ArchivePet[]>(() => {
    if (ownedPets?.length) {
      return ownedPets.map((item) => {
        const name = item.petName || item.petKey || `乌龟 #${item.petId}`;
        return {
          id: String(item.petId),
          name,
          avatar: getPetDisplayAvatar(item.petKey, item.petName),
          rarity: normalizeRarity(item.rarity),
          level: item.level ?? 1,
          xp: item.xp,
          isEquipped: Boolean(item.isEquipped),
        };
      });
    }

    return [{
      id: 'current-pet',
      name: pet.name,
      avatar: pet.avatar,
      rarity: 'N',
      level: pet.level,
      isEquipped: true,
    }];
  }, [ownedPets, pet.avatar, pet.level, pet.name]);

  const safeActiveIndex = Math.min(activeIndex, archivePets.length - 1);
  const activePet = archivePets[safeActiveIndex];

  const goToPet = (nextIndex: number) => {
    setActiveIndex(Math.min(Math.max(nextIndex, 0), archivePets.length - 1));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const distance = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(distance) < 36) return;
    goToPet(safeActiveIndex + (distance < 0 ? 1 : -1));
  };

  return (
    <section className={panelClass}>
      <div className="!mb-2 flex items-center justify-between gap-3 text-[13px] font-bold tracking-[0.02em] text-[#dbe2e8]">
        <div className="flex items-center gap-2">
          <span className="text-[#9fb0bf]"><Sparkles size={15} /></span>
          宠物档案
        </div>
        <span className="rounded-full border border-emerald-300/16 bg-emerald-300/10 !px-2.5 !py-1 text-[11px] font-black text-emerald-200">
          {archivePets.length} 只乌龟
        </span>
      </div>

      <div
        className={`overflow-hidden rounded-[20px] border border-emerald-400/10 bg-[radial-gradient(circle_at_top,rgba(70,180,120,0.18),transparent_46%),linear-gradient(180deg,rgba(18,24,20,1)_0%,rgba(11,14,13,1)_100%)] ${compact ? 'p-4' : '!p-5'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={safeActiveIndex === 0}
            onClick={() => goToPet(safeActiveIndex - 1)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#aeb8bf] transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="上一只乌龟"
          >
            <ChevronLeft size={17} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-white/10 bg-white/[0.04] text-[52px] shadow-[inset_0_0_24px_rgba(255,255,255,0.03)]">
              {activePet.avatar}
            </div>
            <div className="!mt-4 flex min-w-0 items-center justify-center gap-2">
              <h3 className="truncate text-[20px] font-black tracking-[-0.02em] text-white">{activePet.name}</h3>
              {activePet.isEquipped ? (
                <span className="shrink-0 rounded-full bg-emerald-400/18 !px-2 !py-1 text-[10px] font-black text-emerald-200">
                  当前装备
                </span>
              ) : null}
            </div>
            <div className="!mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className={`rounded-full border !px-2.5 !py-1 text-[11px] font-black ${getRarityClass(activePet.rarity)}`}>
                {activePet.rarity}
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.04] !px-2.5 !py-1 text-[11px] font-black text-[#c9d3db]">
                Lv.{activePet.level}
              </span>
              {typeof activePet.xp === 'number' ? (
                <span className="rounded-full border border-white/8 bg-white/[0.04] !px-2.5 !py-1 text-[11px] font-black text-[#9aa8b2]">
                  XP {activePet.xp}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            disabled={safeActiveIndex === archivePets.length - 1}
            onClick={() => goToPet(safeActiveIndex + 1)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#aeb8bf] transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="下一只乌龟"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {archivePets.length > 1 ? (
          <div className="!mt-5 flex justify-center gap-1.5">
            {archivePets.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goToPet(index)}
                className={`h-1.5 rounded-full transition-all ${index === safeActiveIndex ? 'w-6 bg-emerald-300' : 'w-1.5 bg-white/20 hover:bg-white/35'}`}
                aria-label={`查看第 ${index + 1} 只乌龟`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
