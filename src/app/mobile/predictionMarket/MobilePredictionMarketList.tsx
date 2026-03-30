import React, { useState } from 'react';
import { Bookmark, MessageCircleMore, ShieldCheck, ShieldOff } from 'lucide-react';
import { PredictionBetModal } from '@/components/shared/predictions/ui/PredictionBetModal';
import type { PlaceBetResult } from '@/hook/coinType';
import type { PredictionCardItem } from '@/components/shared/predictions/ui/predictionCard';

/**
 * MobilePredictionMarketList:
 * 手机端“预测市场”列表页。
 *
 * 这个组件只服务 mobile 端，不参与 PC 端布局。
 * 这里不复用桌面流式卡片，而是按用户给的 App 卡片布局重做：
 * - 左侧封面
 * - 中间标题和两个主要选项
 * - 右侧直接给 Yes / No 操作视觉
 * - 底部额外展示重要状态，比如是否下注、是否封盘、是否已结算、进入评论战场
 *
 * 如果以后你要继续改手机端预测市场列表，优先从这个文件开始看。
 */
interface MobilePredictionMarketListProps {
  items: PredictionCardItem[];
  onOpenDetail: (item: PredictionCardItem) => void;
  onOpenBattle: (item: PredictionCardItem) => void;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
}

type MobilePredictionOption = {
  key: 'A' | 'B';
  label: string;
  probability: number;
};

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

function resolvePrimaryOptions(item: PredictionCardItem): MobilePredictionOption[] {
  return [
    { key: 'A' as const, label: item.optionA, probability: resolveProbability(item, 'A') },
    { key: 'B' as const, label: item.optionB, probability: resolveProbability(item, 'B') },
  ].sort((left, right) => right.probability - left.probability);
}

function formatVolume(item: PredictionCardItem) {
  const totalVotes = item.votes.A + item.votes.B;
  if (totalVotes >= 1000000) return `$${(totalVotes / 1000000).toFixed(1)}M 交易量`;
  if (totalVotes >= 1000) return `$${(totalVotes / 1000).toFixed(1)}K 交易量`;
  return `$${totalVotes} 交易量`;
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

function MobilePredictionActionButton({
  label,
  tone,
  disabled = false,
  onClick,
}: {
  label: string;
  tone: 'yes' | 'no';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[70px] rounded-[12px] px-4 py-2 text-[15px] font-bold transition-colors ${
        tone === 'yes'
          ? 'bg-emerald-500/16 text-emerald-300 hover:bg-emerald-500/22'
          : 'bg-rose-500/14 text-rose-300 hover:bg-rose-500/20'
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {label}
    </button>
  );
}

function MobilePredictionMarketCard({
  item,
  onOpenDetail,
  onOpenBattle,
  onOpenBet,
}: {
  item: PredictionCardItem;
  onOpenDetail: (item: PredictionCardItem) => void;
  onOpenBattle: (item: PredictionCardItem) => void;
  onOpenBet: (item: PredictionCardItem, option: 'A' | 'B') => void;
}) {
  const primaryOptions = resolvePrimaryOptions(item).slice(0, 2);
  const isClosed = item.status !== 'open';

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#1a1d22] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={() => onOpenDetail(item)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <img
            src={item.image}
            alt=""
            className="h-[66px] w-[66px] shrink-0 rounded-[18px] object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[17px] font-extrabold leading-[1.35] text-white">
              {item.title}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-zinc-300">
                {resolveStatusText(item)}
              </span>
              {item.hasBet && (
                <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  已下注
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-5 space-y-4">
        {primaryOptions.map((option) => (
          <div key={option.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenDetail(item)}
              className="truncate text-left text-[18px] leading-none text-zinc-200"
            >
              {option.label}
            </button>
            <div className="text-[18px] font-black text-white">{option.probability}%</div>
            <MobilePredictionActionButton
              label="是"
              tone="yes"
              disabled={isClosed}
              onClick={() => onOpenBet(item, 'A')}
            />
            <MobilePredictionActionButton
              label="否"
              tone="no"
              disabled={isClosed}
              onClick={() => onOpenBet(item, 'B')}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-4">
        <div className="text-[16px] font-medium text-zinc-500">{formatVolume(item)}</div>
        <div className="flex items-center gap-4 text-zinc-500">
          <button
            type="button"
            onClick={() => onOpenBattle(item)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-400"
          >
            <MessageCircleMore size={18} />
            评论战场
          </button>
          <Bookmark size={20} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-400">
          {item.status === 'closed' ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
          {item.status === 'closed' ? '封盘中' : '可下注'}
        </span>
        {item.betSettleResult && (
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-400">
            结算结果: {item.betSettleResult}
          </span>
        )}
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-400">
          赔率 {item.oddsA.toFixed(1)}x / {item.oddsB.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}

export const MobilePredictionMarketList: React.FC<MobilePredictionMarketListProps> = ({
  items,
  onOpenDetail,
  onOpenBattle,
  onBetSuccess,
  onRequireAuth,
}) => {
  const [bettingItem, setBettingItem] = useState<PredictionCardItem | null>(null);
  const [bettingOption, setBettingOption] = useState<'A' | 'B' | null>(null);

  return (
    <>
      <section className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <MobilePredictionMarketCard
              item={item}
              onOpenDetail={onOpenDetail}
              onOpenBattle={onOpenBattle}
              onOpenBet={(targetItem, option) => {
                setBettingItem(targetItem);
                setBettingOption(option);
              }}
            />
          </div>
        ))}
      </section>

      <PredictionBetModal
        open={Boolean(bettingItem && bettingOption)}
        item={bettingItem}
        option={bettingOption}
        onClose={() => {
          setBettingItem(null);
          setBettingOption(null);
        }}
        onSuccess={onBetSuccess}
        onRequireAuth={onRequireAuth}
      />
    </>
  );
};
