/**
 * 文件说明：Game Hub Page，游戏中心和静态游戏宿主相关组件。
 */
import React from 'react';
import { ExternalLink, FlaskConical, Swords, Turtle } from 'lucide-react';

type GameHubPageProps = {
  onOpenJump: () => void;
  onOpenLab: () => void;
  onOpenBattle: () => void;
};

type GameCard = {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentClassName: string;
  badge: string;
  buttonLabel: string;
  onOpen: () => void;
};

export const GameHubPage: React.FC<GameHubPageProps> = ({
  onOpenJump,
  onOpenLab,
  onOpenBattle,
}) => {
  const cards: GameCard[] = [
    {
      key: 'jump',
      title: '龟龟跳海',
      subtitle: '节奏躲避',
      description: '轻快上手的像素挑战，拼反应、拼节奏，适合随时来一局。',
      icon: <Turtle size={20} />,
      accentClassName: 'from-sky-500/20 via-cyan-400/10 to-transparent border-sky-300/20 text-sky-100',
      badge: '轻竞技',
      buttonLabel: '进入跳海',
      onOpen: onOpenJump,
    },
    {
      key: 'lab',
      title: '龟龟出海',
      subtitle: '航线探索',
      description: '带着你的龟龟出航探索，资源、成长和随机事件都在这趟航程里。',
      icon: <FlaskConical size={20} />,
      accentClassName: 'from-emerald-500/20 via-teal-400/10 to-transparent border-emerald-300/20 text-emerald-100',
      badge: '成长向',
      buttonLabel: '进入出海',
      onOpen: onOpenLab,
    },
    {
      key: 'battle',
      title: '龟龟对战',
      subtitle: '战斗对抗',
      description: '直接进入全屏对战场，带上你当前的宠物与资产状态开始战斗。',
      icon: <Swords size={20} />,
      accentClassName: 'from-rose-500/20 via-orange-400/10 to-transparent border-rose-300/20 text-rose-100',
      badge: '3V3 对抗',
      buttonLabel: '进入对战',
      onOpen: onOpenBattle,
    },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0f14] text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#0c0f14]">
      <div className="relative overflow-hidden border-b border-white/8 px-5 py-6 md:px-7 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
      </div>

      <div className="grid gap-4 p-5 md:p-7 xl:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.onOpen}
            className={`group relative overflow-hidden rounded-[24px] border bg-gradient-to-br p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] ${card.accentClassName}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%)] opacity-70" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white">
                  {card.icon}
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-zinc-100">
                  {card.badge}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[24px] font-black tracking-[-0.04em] text-white">{card.title}</div>
                <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                  {card.subtitle}
                </div>
              </div>

              <p className="mt-4 min-h-[72px] text-sm leading-6 text-zinc-200">
                {card.description}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-zinc-100">
                  点击即进入全屏
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-white transition-transform duration-300 group-hover:translate-x-1">
                  {card.buttonLabel}
                  <ExternalLink size={15} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
