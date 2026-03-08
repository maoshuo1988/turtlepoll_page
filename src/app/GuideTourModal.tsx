import React, { useEffect, useMemo, useState } from 'react';

interface GuideTourModalProps {
  open: boolean;
  onClose: () => void;
}

type GuideStep = {
  icon: string;
  title: string;
  desc: string;
};

const STEPS: GuideStep[] = [
  {
    icon: '🐢',
    title: '欢迎来到龟投！',
    desc: '这是一个集预测投票、宠物养成、小游戏于一体的趣味平台。跟着指引快速上手吧！',
  },
  {
    icon: '🎯',
    title: '预测投票',
    desc: '在热门事件中押注龟币，猜对即可赢取奖励。连胜还能解锁珍稀披风！',
  },
  {
    icon: '⚔️',
    title: '龟势 PK',
    desc: '在开战广场发起对决，和其他玩家正面交锋。选择阵营，押注龟币、赢取荣耀！',
  },
  {
    icon: '🥚',
    title: '收集宠物',
    desc: '花费龟币开蛋，收集 28 种不同龟种。从 C 级到 SSS 级，每只都有独特能力加成！',
  },
  {
    icon: '💰',
    title: '收集龟币',
    desc: '每日登录领奖励、投票赚收益、小游戏拿高分……龟币越多，玩法越丰富！',
  },
];

export const GuideTourModal: React.FC<GuideTourModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const isLast = step === total - 1;

  const dots = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center !p-4">
        <div
          className="w-full max-w-[420px] rounded-[24px] border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-card shadow-[0_24px_70px_rgba(0,0,0,0.28)] !px-8 !py-7"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="!mb-2 flex items-center justify-center gap-2">
            {dots.map((i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${i === step ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-rdark-border'}`}
              />
            ))}
          </div>

          <div className="text-center">
            <div className="text-[86px] leading-none">{current.icon}</div>
            <h3 className="!mt-4 text-[28px] leading-tight font-black text-emerald-500">{current.title}</h3>
            <p className="!mt-3 text-[14px] leading-[1.5] text-slate-500 dark:text-rdark-text2">{current.desc}</p>
          </div>

          <div className="!mt-7 flex items-center justify-center gap-10">
            <button
              className="h-11 min-w-[88px] rounded-[12px] border border-slate-300 dark:border-rdark-border bg-white dark:bg-rdark-input text-slate-500 dark:text-rdark-text2 font-bold text-[15px] cursor-pointer"
              onClick={onClose}
            >
              跳过
            </button>
            <button
              className="h-11 min-w-[104px] rounded-[12px] border-0 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-[15px] cursor-pointer"
              onClick={() => (isLast ? onClose() : setStep((s) => Math.min(s + 1, total - 1)))}
            >
              {isLast ? '开始探索' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
