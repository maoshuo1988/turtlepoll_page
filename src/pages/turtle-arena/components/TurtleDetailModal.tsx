/**
 * 文件说明：龟战 Arena - 龟种详情弹框。
 * 左侧展示完整 PNG 形象 + 主题光晕，右侧展示名字 / 稀有度 / 等级 / 属性条 / 出战相关操作。
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Star, X } from 'lucide-react';
import {
  RARITY_TONE,
  TURTLE_TONE_BG,
  TURTLE_TONE_GLOW,
  type ArenaTurtle,
} from '../data/arenaMockData';

interface TurtleDetailModalProps {
  turtle: ArenaTurtle | null;
  onClose: () => void;
}

const STAT_MAX = { hp: 500, atk: 60, def: 30, mr: 30 } as const;

const STAT_COLOR = {
  hp: { label: 'HP · 生命值', bar: 'from-rose-500 to-rose-400', dot: 'text-rose-300' },
  atk: { label: 'ATK · 攻击力', bar: 'from-amber-500 to-amber-400', dot: 'text-amber-300' },
  def: { label: 'DEF · 护甲', bar: 'from-sky-500 to-sky-400', dot: 'text-sky-300' },
  mr: { label: 'MR · 魔抗', bar: 'from-violet-500 to-violet-400', dot: 'text-violet-300' },
} as const;

export function TurtleDetailModal({ turtle, onClose }: TurtleDetailModalProps) {
  useEffect(() => {
    if (!turtle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [turtle, onClose]);

  if (!turtle) return null;

  const rarityCls = RARITY_TONE[turtle.rarity] ?? RARITY_TONE.C;
  const toneBg = TURTLE_TONE_BG[turtle.tone];
  const toneGlow = TURTLE_TONE_GLOW[turtle.tone];

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-md" onClick={onClose} aria-hidden />

      <div className="absolute inset-0 grid place-items-center p-4 md:p-6">
        <div
          className="relative w-full max-w-[880px] overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(180deg,#0a1118_0%,#06080d_100%)] shadow-[0_28px_70px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-black/55 text-white/85 transition-colors hover:bg-black/82 md:right-4 md:top-4"
            aria-label="关闭"
          >
            <X size={18} strokeWidth={2.4} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1.1fr]">
            {/* === 左：完整 PNG 形象 + 主题光晕 === */}
            <div
              className="relative grid h-[280px] place-items-center overflow-hidden md:h-[480px]"
              style={{ background: toneBg }}
            >
              {/* 背景光晕 */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{ background: toneGlow }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-12 left-1/2 h-32 w-[60%] -translate-x-1/2 rounded-full bg-black/45 blur-2xl"
              />
              {/* 装饰条纹 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 14px)',
                }}
              />

              {/* 主图 */}
              <img
                src={turtle.avatar}
                alt={turtle.name}
                className="relative z-10 h-[78%] w-[78%] object-contain drop-shadow-[0_24px_42px_rgba(0,0,0,0.75)] md:h-[80%] md:w-[80%]"
              />

              {/* 角标：稀有度 + 出战中 */}
              <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5">
                <span className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[11px] font-black ${rarityCls}`}>
                  {turtle.rarity}
                </span>
                {turtle.equipped ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-300/45 bg-emerald-500/22 px-2 py-0.5 text-[10px] font-bold text-emerald-100 backdrop-blur-sm">
                    <Star size={9} className="fill-current" /> 出战中
                  </span>
                ) : null}
              </div>

              {/* 等级章 */}
              <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-lg border border-amber-300/45 bg-black/55 px-2 py-1 text-[11px] font-black text-amber-300 backdrop-blur-sm">
                <Crown size={11} className="text-amber-200" />
                Lv.{turtle.level}
              </div>
            </div>

            {/* === 右：名字 / 属性 / 操作 === */}
            <div className="relative px-5 py-6 md:px-7 md:py-8">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{turtle.title}</div>
                <h2 className="mt-1 text-[28px] font-black tracking-tight text-white md:text-[34px]">{turtle.name}</h2>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <StatBar label={STAT_COLOR.hp.label} value={turtle.hp} max={STAT_MAX.hp} barCls={STAT_COLOR.hp.bar} dotCls={STAT_COLOR.hp.dot} />
                <StatBar label={STAT_COLOR.atk.label} value={turtle.atk} max={STAT_MAX.atk} barCls={STAT_COLOR.atk.bar} dotCls={STAT_COLOR.atk.dot} />
                <StatBar label={STAT_COLOR.def.label} value={turtle.def} max={STAT_MAX.def} barCls={STAT_COLOR.def.bar} dotCls={STAT_COLOR.def.dot} />
                <StatBar label={STAT_COLOR.mr.label} value={turtle.spd} max={STAT_MAX.mr} barCls={STAT_COLOR.mr.bar} dotCls={STAT_COLOR.mr.dot} />
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-[12px] leading-relaxed text-white/65">
                <span className="font-bold text-emerald-200">定位：</span>
                {turtle.title}。属性数值来自《龟龟对战》核心战斗表，技能与被动可在「技能树」中升级。
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {turtle.equipped ? (
                  <button
                    type="button"
                    className="flex-1 rounded-full border border-rose-400/45 bg-rose-500/14 py-2.5 text-sm font-bold text-rose-100 transition-colors hover:bg-rose-500/24"
                  >
                    取消出战
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex-1 rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-500/35 to-teal-500/35 py-2.5 text-sm font-black text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.32)] transition-transform hover:scale-[1.01]"
                  >
                    编入出战
                  </button>
                )}
                <button
                  type="button"
                  className="flex-1 rounded-full border border-amber-400/45 bg-amber-500/12 py-2.5 text-sm font-bold text-amber-100 transition-colors hover:bg-amber-500/22"
                >
                  升级训练
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StatBar({
  label,
  value,
  max,
  barCls,
  dotCls,
}: {
  label: string;
  value: number;
  max: number;
  barCls: string;
  dotCls: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className={`inline-flex items-center gap-1.5 font-medium text-white/65`}>
          <span className={`h-1.5 w-1.5 rounded-full bg-current ${dotCls}`} />
          {label}
        </span>
        <span className="tabular-nums text-[13px] font-black text-white">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/45">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barCls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
