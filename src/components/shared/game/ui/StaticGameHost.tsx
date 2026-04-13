import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, ExternalLink } from 'lucide-react';
import type { OwnedPetItem, PetEquipInfo } from '@/hook/petType';

type StaticGameHostProps = {
  title: string;
  subtitle: string;
  htmlPath: string;
  standalonePath?: string;
  stripSelectors?: string[];
  onBack?: () => void;
  balance?: number;
  ownedPets?: OwnedPetItem[];
  equippedPet?: PetEquipInfo | null;
  mobileMode?: boolean;
};

type GamePetStateEntry = {
  id: string;
  owned: boolean;
  equipped: boolean;
};

const GAME_PET_ALIASES: Array<{ id: string; aliases: string[] }> = [
  { id: 'basic', aliases: ['basic', '小龟', '基础小龟'] },
  { id: 'stone', aliases: ['stone', '石头龟'] },
  { id: 'bamboo', aliases: ['bamboo', '竹叶龟'] },
  { id: 'angel', aliases: ['angel', '天使龟'] },
  { id: 'ice', aliases: ['ice', '寒冰龟'] },
  { id: 'ninja', aliases: ['ninja', '忍者龟'] },
  { id: 'two_head', aliases: ['two_head', '双头龟'] },
  { id: 'ghost', aliases: ['ghost', '幽灵龟'] },
  { id: 'diamond', aliases: ['diamond', '钻石龟'] },
  { id: 'fortune', aliases: ['fortune', '财神龟'] },
  { id: 'dice', aliases: ['dice', '骰子龟'] },
  { id: 'rainbow', aliases: ['rainbow', '彩虹龟'] },
  { id: 'gambler', aliases: ['gambler', '赌神龟'] },
  { id: 'hunter', aliases: ['hunter', '猎人龟'] },
  { id: 'pirate', aliases: ['pirate', '海盗龟'] },
  { id: 'candy', aliases: ['candy', '糖果龟'] },
  { id: 'bubble', aliases: ['bubble', '泡泡龟', '气泡龟'] },
  { id: 'line', aliases: ['line', '线条龟'] },
  { id: 'lightning', aliases: ['lightning', '闪电龟'] },
  { id: 'phoenix', aliases: ['phoenix', '凤凰龟'] },
  { id: 'lava', aliases: ['lava', '熔岩龟'] },
  { id: 'cyber', aliases: ['cyber', '赛博龟'] },
  { id: 'crystal', aliases: ['crystal', '水晶龟'] },
  { id: 'chest', aliases: ['chest', '宝箱龟'] },
  { id: 'space', aliases: ['space', '星际龟'] },
  { id: 'hiding', aliases: ['hiding', '缩头乌龟'] },
  { id: 'headless', aliases: ['headless', '无头龟'] },
  { id: 'shell', aliases: ['shell', '龟壳'] },
];

function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim().toLowerCase();
}

function mapToGamePetId(petKey?: string | number | null, petName?: string | null) {
  const source = `${normalizeText(petKey)} ${normalizeText(petName)}`;
  return (
    GAME_PET_ALIASES.find(({ aliases }) => aliases.some((alias) => source.includes(alias.toLowerCase())))?.id ??
    null
  );
}

function clampLevel(level?: number) {
  if (typeof level !== 'number' || Number.isNaN(level)) return 1;
  return Math.max(1, Math.min(10, Math.round(level)));
}

function buildGamePetState(ownedPets?: OwnedPetItem[], equippedPet?: PetEquipInfo | null) {
  const mappedPets = new Map<string, GamePetStateEntry>([
    ['basic', { id: 'basic', owned: true, equipped: false }],
  ]);
  const levels: Record<string, number> = {};

  const equippedGameId =
    mapToGamePetId(equippedPet?.petKey ?? equippedPet?.petId, equippedPet?.petName) ??
    (ownedPets ?? [])
      .filter((pet) => pet.isEquipped)
      .map((pet) => mapToGamePetId(pet.petKey ?? pet.petId, pet.petName))[0] ??
    'basic';

  for (const pet of ownedPets ?? []) {
    const gamePetId = mapToGamePetId(pet.petKey ?? pet.petId, pet.petName);
    if (!gamePetId) continue;

    mappedPets.set(gamePetId, {
      id: gamePetId,
      owned: true,
      equipped: gamePetId === equippedGameId || Boolean(pet.isEquipped),
    });
    levels[gamePetId] = clampLevel(pet.level);
  }

  mappedPets.forEach((value, key) => {
    mappedPets.set(key, { ...value, equipped: key === equippedGameId });
  });

  if (typeof equippedPet?.level === 'number') {
    levels[equippedGameId] = clampLevel(equippedPet.level);
  }

  return {
    pets: Array.from(mappedPets.values()),
    levels,
  };
}

function syncGameStorage(balance?: number, ownedPets?: OwnedPetItem[], equippedPet?: PetEquipInfo | null) {
  if (typeof window === 'undefined') return;

  const current = JSON.parse(window.localStorage.getItem('petState') || '{}') as Record<string, unknown>;
  const nextState: Record<string, unknown> = { ...current };

  if (typeof balance === 'number' && Number.isFinite(balance)) {
    nextState.coins = Math.max(0, Math.round(balance));
  }

  const { pets, levels } = buildGamePetState(ownedPets, equippedPet);
  nextState.pets = pets;
  nextState.levels = {
    ...(typeof current.levels === 'object' && current.levels ? (current.levels as Record<string, number>) : {}),
    ...levels,
  };

  window.localStorage.setItem('petState', JSON.stringify(nextState));
}

export const StaticGameHost: React.FC<StaticGameHostProps> = ({
  title,
  subtitle,
  htmlPath,
  standalonePath,
  stripSelectors = [],
  onBack,
  balance,
  ownedPets,
  equippedPet,
  mobileMode = false,
}) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    syncGameStorage(balance, ownedPets, equippedPet);
  }, [balance, equippedPet, ownedPets]);

  useEffect(() => {
    setStatus('loading');
    setErrorText('');
  }, [htmlPath]);

  const handleFrameLoad = useCallback(() => {
    try {
      const frame = frameRef.current;
      const doc = frame?.contentDocument;
      if (!doc) {
        throw new Error('无法访问游戏页面文档');
      }

      stripSelectors.forEach((selector) => {
        doc.querySelectorAll(selector).forEach((node) => {
          if (node instanceof HTMLElement) {
            node.style.display = 'none';
          } else {
            node.remove();
          }
        });
      });

      doc.documentElement.style.background = '#000';
      doc.body.style.margin = '0';
      doc.body.style.background = '#000';
      doc.body.style.overflow = 'auto';

      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : '未知错误');
    }
  }, [stripSelectors]);

  const hostHeight = mobileMode ? 'calc(100vh - 78px)' : 'calc(100vh - 220px)';

  return (
    <div
      className={`overflow-hidden bg-[#061018] text-white ${
        mobileMode
          ? 'min-h-screen rounded-none'
          : 'rounded-[28px] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]'
      }`}
    >
      <div
        className={`flex items-center gap-3 border-b border-white/10 bg-[linear-gradient(135deg,rgba(7,18,24,0.96),rgba(11,30,40,0.96))] ${
          mobileMode ? 'px-4 py-3' : 'px-5 py-4'
        }`}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
            aria-label={`返回${title}`}
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-black tracking-[-0.02em]">{title}</div>
          <div className="truncate text-[12px] text-[#91a7b7]">{subtitle}</div>
        </div>

        {typeof balance === 'number' ? (
          <div className="hidden items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[12px] font-bold text-amber-200 sm:inline-flex">
            <Coins size={14} />
            {Math.round(balance).toLocaleString()}
          </div>
        ) : null}

        {standalonePath ? (
          <a
            href={standalonePath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
            aria-label={`打开独立${title}页面`}
          >
            <ExternalLink size={16} />
          </a>
        ) : null}
      </div>

      <div className={mobileMode ? 'px-0 py-0' : 'p-3 sm:p-4'}>
        <div
          className="overflow-hidden rounded-[22px] border border-white/10 bg-black"
          style={{ minHeight: hostHeight }}
        >
          {status !== 'error' ? (
            <iframe
              key={htmlPath}
              ref={frameRef}
              src={htmlPath}
              title={title}
              className={`min-h-full w-full border-0 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
              style={{ minHeight: hostHeight }}
              onLoad={handleFrameLoad}
            />
          ) : (
            <div className="grid min-h-full place-items-center px-6 py-16 text-center text-sm text-[#91a7b7]">
              游戏挂载失败：{errorText}
            </div>
          )}

          {status === 'loading' ? (
            <div className="grid min-h-[260px] place-items-center text-sm text-[#91a7b7]">
              正在加载{title}...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
