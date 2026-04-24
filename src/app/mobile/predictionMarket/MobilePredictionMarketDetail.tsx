import React, { useState } from 'react';
import { ArrowLeft, Bookmark, Clock3, MessageCircleMore, ShieldCheck, ShieldOff, Trophy, WalletCards } from 'lucide-react';
import { PredictionBetModal } from '@/components/shared/predictions/ui/PredictionBetModal';
import type { PlaceBetResult } from '@/hook/coinType';
import type { PredictionCardItem } from '@/components/shared/predictions/ui/predictionCard';

/**
 * MobilePredictionMarketDetail:
 * 手机端“预测市场”单个 item 的详情页。
 *
 * 这个页面只服务 mobile 端：
 * - 通过返回按钮回到预测市场列表
 * - 打开详情页时，外层会隐藏底部 tabbar
 * - 列表没放下的重要返回字段，会在详情页继续展开
 *
 * 以后如果要继续补手机端预测详情，优先从这个文件改。
 */
interface MobilePredictionMarketDetailProps {
  item: PredictionCardItem;
  onBack: () => void;
  onOpenBattle: (item: PredictionCardItem) => void;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
}

function resolveProbability(item: PredictionCardItem, key: 'A' | 'B') {
  const totalVotes = item.votes.A + item.votes.B;
  if (totalVotes > 0) {
    const raw = key === 'A' ? (item.votes.A / totalVotes) * 100 : (item.votes.B / totalVotes) * 100;
    return Math.round(raw);
  }

  const impliedA = 1 / Math.max(item.oddsA, 1);
  const impliedB = 1 / Math.max(item.oddsB, 1);
  const total = impliedA + impliedB;
  const ratio = key === 'A' ? impliedA / total : impliedB / total;
  return Math.round(ratio * 100);
}

function formatParticipants(item: PredictionCardItem) {
  const totalVotes = item.votes.A + item.votes.B;
  if (totalVotes >= 10000) return `${(totalVotes / 1000).toFixed(1)}K`;
  return `${totalVotes}`;
}

function formatCloseTime(closeTime?: number) {
  if (!closeTime) return '未提供';
  const date = new Date(closeTime);
  if (Number.isNaN(date.getTime())) return '未提供';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function resolveStatusText(item: PredictionCardItem) {
  if (item.status === 'settled') {
    if (item.betSettleResult === 'WIN') return '已结算 · 你赢了';
    if (item.betSettleResult === 'LOSE') return '已结算 · 你输了';
    return '已结算';
  }
  if (item.status === 'closed') return '封盘中';
  return '可下注';
}

export const MobilePredictionMarketDetail: React.FC<MobilePredictionMarketDetailProps> = ({
  item,
  onBack,
  onOpenBattle,
  onBetSuccess,
  onRequireAuth,
}) => {
  const [bettingOption, setBettingOption] = useState<'A' | 'B' | null>(null);
  const probabilityA = resolveProbability(item, 'A');
  const probabilityB = resolveProbability(item, 'B');
  const isClosed = item.status !== 'open';

  return (
    <section className="space-y-4 pb-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-zinc-200"
      >
        <ArrowLeft size={16} />
        返回
      </button>

      <div className="overflow-hidden rounded-[30px] border border-white/8 bg-[#171a1f] shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        <img
          src={item.image}
          alt=""
          className="h-[220px] w-full object-cover"
        />
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-300">
              {resolveStatusText(item)}
            </span>
            {item.hasBet && (
              <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                已下注
              </span>
            )}
            {item.betSettleResult && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-300">
                结果 {item.betSettleResult}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-[24px] font-black leading-[1.3] tracking-[-0.03em] text-white">
            {item.title}
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-zinc-400">
            {item.summary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-white/8 bg-[#171a1f] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-500">
            <WalletCards size={14} />
            参与人数
          </div>
          <div className="mt-3 text-[24px] font-black text-white">{formatParticipants(item)}</div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-[#171a1f] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-500">
            <Clock3 size={14} />
            截止时间
          </div>
          <div className="mt-3 text-[16px] font-bold leading-6 text-white">{formatCloseTime(item.closeTime)}</div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-[#171a1f] p-5">
        <div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-zinc-400">
          <Trophy size={16} />
          核心选项与下注入口
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-[18px] font-bold text-white">{item.optionA}</div>
              <div className="text-[22px] font-black text-white">{probabilityA}%</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isClosed}
                onClick={() => setBettingOption('A')}
                className="rounded-[16px] bg-emerald-500/16 px-4 py-3 text-[16px] font-bold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                点击下注
              </button>
              <button type="button" className="rounded-[16px] bg-white/[0.04] px-4 py-3 text-[16px] font-bold text-zinc-300">
                赔率 {item.oddsA.toFixed(1)}x
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-[18px] font-bold text-white">{item.optionB}</div>
              <div className="text-[22px] font-black text-white">{probabilityB}%</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isClosed}
                onClick={() => setBettingOption('B')}
                className="rounded-[16px] bg-rose-500/14 px-4 py-3 text-[16px] font-bold text-rose-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                点击下注
              </button>
              <button type="button" className="rounded-[16px] bg-white/[0.04] px-4 py-3 text-[16px] font-bold text-zinc-300">
                赔率 {item.oddsB.toFixed(1)}x
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-[#171a1f] p-5">
        <div className="mb-4 text-[13px] font-semibold text-zinc-400">更多重要信息</div>
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4 text-[14px] text-zinc-300">
            当前状态: <span className="font-bold text-white">{resolveStatusText(item)}</span>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4 text-[14px] text-zinc-300">
            是否下注: <span className="font-bold text-white">{item.hasBet ? '已下注' : '未下注'}</span>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4 text-[14px] text-zinc-300">
            是否结算: <span className="font-bold text-white">{item.status === 'settled' ? '已结算' : '未结算'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenBattle(item)}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-4 py-2 text-[13px] font-semibold text-emerald-300"
        >
          <MessageCircleMore size={16} />
          进入撕裂带
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-zinc-300"
        >
          <Bookmark size={16} />
          收藏议题
        </button>
      </div>

      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-[12px] text-zinc-500">
        {item.status === 'closed' ? <ShieldOff size={14} className="mr-2 inline-block" /> : <ShieldCheck size={14} className="mr-2 inline-block" />}
        {item.status === 'closed' ? '当前已封盘，不能继续直接下注，但仍可查看详情和撕裂带。' : '当前可以继续下注，点击上面的下注按钮会进入现有下注/撕裂带。'}
      </div>



      <PredictionBetModal
        open={Boolean(bettingOption)}
        item={item}
        option={bettingOption}
        onClose={() => setBettingOption(null)}
        onSuccess={onBetSuccess}
        onRequireAuth={onRequireAuth}
      />
    </section>
  );
};
