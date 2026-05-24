/**
 * 文件说明：Static Game Host，游戏中心和静态游戏宿主相关组件。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, ExternalLink } from 'lucide-react';
import type { OwnedPetItem, PetEquipInfo } from '@/hooks/petTypes';

type StaticGameBadgeTone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';

type StaticGameBadge = {
  label: string;
  tone?: StaticGameBadgeTone;
};

type StaticGameStat = {
  label: string;
  value: string;
};

type StaticGameHostProps = {
  title: string;
  subtitle: string;
  description?: string;
  badges?: StaticGameBadge[];
  stats?: StaticGameStat[];
  tips?: string[];
  immersive?: boolean;
  htmlPath: string;
  standalonePath?: string;
  stripSelectors?: string[];
  onFrameLoad?: (doc: Document, win: Window) => void;
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

const BADGE_TONE_CLASS: Record<StaticGameBadgeTone, string> = {
  emerald: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200',
  sky: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
  amber: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
  rose: 'border-rose-300/25 bg-rose-400/10 text-rose-200',
  violet: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
};

export const StaticGameHost: React.FC<StaticGameHostProps> = ({
  title,
  subtitle,
  description,
  badges = [],
  stats = [],
  tips = [],
  immersive = false,
  htmlPath,
  standalonePath,
  stripSelectors = [],
  onFrameLoad,
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

      if (frame.contentWindow) {
        onFrameLoad?.(doc, frame.contentWindow);
      }

      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : '未知错误');
    }
  }, [onFrameLoad, stripSelectors]);

  const hostHeight = mobileMode ? 'calc(100vh - 78px)' : immersive ? '100%' : 'calc(100vh - 220px)';
  const showProjectBrief = !immersive && Boolean(description || badges.length || stats.length || tips.length);

  return (
    <div
      className={`relative overflow-hidden bg-[#061018] text-white ${
        mobileMode
          ? 'min-h-screen rounded-none'
          : immersive
            ? 'h-full rounded-[28px] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]'
            : 'rounded-[28px] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]'
      }`}
    >
      {!mobileMode ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(76,201,240,0.18),transparent_68%)]" />
          <div className="pointer-events-none absolute right-0 top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(6,214,160,0.1),transparent_68%)] blur-2xl" />
        </>
      ) : null}

      <div
        className={`relative flex items-center gap-3 border-b border-white/10 bg-[linear-gradient(135deg,rgba(7,18,24,0.96),rgba(11,30,40,0.96))] ${
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
          {!mobileMode ? (
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5fbde7]">
              Turtle Arcade
            </div>
          ) : null}
          <div className="truncate text-[18px] font-black tracking-[-0.02em]">{title}</div>
          <div className="truncate text-[12px] text-[#91a7b7]">{subtitle}</div>
        </div>

        {typeof balance === 'number' ? (
          <div className="hidden items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[12px] font-bold text-amber-200 sm:inline-flex">
            <Coins size={14} />
            {Math.round(balance).toLocaleString()}
          </div>
        ) : null}

        {standalonePath && !immersive ? (
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

      <div className={mobileMode ? 'px-0 py-0' : immersive ? 'flex h-[calc(100%-72px)] flex-col p-0' : 'p-3 sm:p-4'}>
        {showProjectBrief ? (
          <section className={`mb-3 overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,26,40,0.92),rgba(8,18,28,0.96))] ${
            mobileMode ? 'mx-3 mt-3 px-3 py-3' : 'px-4 py-4'
          }`}>
            <div className={`grid gap-4 ${stats.length > 0 && !mobileMode ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]' : ''}`}>
              <div className="min-w-0">
                {description ? (
                  <p className="text-[13px] leading-6 text-[#c8d7e4]">
                    {description}
                  </p>
                ) : null}

                {badges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <span
                        key={badge.label}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${BADGE_TONE_CLASS[badge.tone ?? 'sky']}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {tips.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tips.map((tip) => (
                      <span
                        key={tip}
                        className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[12px] text-[#9db2c3]"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {stats.length > 0 ? (
                <div className={`grid gap-2 ${mobileMode ? 'grid-cols-3' : 'grid-cols-3 lg:grid-cols-1'}`}>
                  {stats.map((stat) => (
                    <div
                      key={`${stat.label}-${stat.value}`}
                      className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f8b9f]">
                        {stat.label}
                      </div>
                      <div className="mt-1 text-[13px] font-bold text-white sm:text-[14px]">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <div
          className={`overflow-hidden border border-white/10 bg-black ${immersive && !mobileMode ? 'min-h-0 flex-1 rounded-none border-0' : 'rounded-[22px]'}`}
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
