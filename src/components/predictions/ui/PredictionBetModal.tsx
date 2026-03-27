import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coins, TrendingUp, X } from 'lucide-react';
import { useRequestCoinBet, useRequestCoinMe } from '@/hook/useCoinRequest';
import type { PlaceBetResult } from '@/hook/coinType';
import type { PredictionCardItem } from './predictionCard';

interface PredictionBetModalProps {
  open: boolean;
  item: PredictionCardItem | null;
  option: 'A' | 'B' | null;
  onClose: () => void;
  onSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
}

// 预测下注确认弹框：在提交前展示余额、赔率、预估收益和可输入的下注金额
export function PredictionBetModal({
  open,
  item,
  option,
  onClose,
  onSuccess,
  onRequireAuth,
}: PredictionBetModalProps) {
  const coinMe = useRequestCoinMe();
  const coinBetMutation = useRequestCoinBet();
  const [amount, setAmount] = useState('100');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('100');
    setErrorText('');
  }, [open, item?.id, option]);

  const balance = coinMe.data?.balance ?? 0;
  const numericAmount = Number(amount);
  const selectedOdds = option === 'A' ? (item?.oddsA ?? 0) : option === 'B' ? (item?.oddsB ?? 0) : 0;
  const selectedLabel = option === 'A' ? (item?.optionA ?? '') : option === 'B' ? (item?.optionB ?? '') : '';
  const expectedPayout = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !selectedOdds) return 0;
    return Math.floor(numericAmount * selectedOdds);
  }, [numericAmount, selectedOdds]);

  if (!open || !item || !option) return null;

  const handleSubmit = async () => {
    if (!item.marketId) {
      setErrorText('当前预测没有可下注的 marketId。');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorText('请输入有效的下注金额。');
      return;
    }

    if (!Number.isInteger(numericAmount)) {
      setErrorText('下注金额请使用整数。');
      return;
    }

    if (numericAmount > balance) {
      setErrorText('龟币余额不足，无法完成下注。');
      return;
    }

    try {
      setErrorText('');
      const result = await coinBetMutation.mutateAsync({
        marketId: item.marketId,
        option,
        amount: numericAmount,
      });
      onSuccess?.(item, option, result);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '下注失败，请稍后再试。';
      if (message.includes('NotLogin')) {
        onRequireAuth?.();
      }
      setErrorText(message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.72)] backdrop-blur-[10px]" onClick={onClose} />
      <div className="absolute inset-0 grid items-end p-0 md:place-items-center md:p-4">
        <div
          className="relative w-full max-w-[520px] overflow-hidden rounded-t-[30px] md:rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,#0b0d12_0%,#101521_58%,#0b0e14_100%)] shadow-[0_-18px_48px_rgba(0,0,0,0.46)] md:shadow-[0_28px_110px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.06)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex justify-center pt-2.5 md:hidden">
            <div className="h-1.5 w-12 rounded-full bg-white/16" />
          </div>
          <button
            type="button"
            className="absolute right-[14px] top-[12px] md:right-[18px] md:top-[14px] grid h-[42px] w-[42px] md:h-[48px] md:w-[48px] place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,#24262c_0%,#17181c_45%,#101114_100%)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
            onClick={onClose}
          >
            <X size={20} strokeWidth={2.6} />
          </button>

          <div className="border-b border-white/8 px-[18px] pb-[16px] pt-[18px] md:px-[24px] md:pb-[18px] md:pt-[24px]">
            <div className="mb-[10px] inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-[14px] py-[6px] text-[12px] font-semibold text-emerald-300">
              <TrendingUp size={14} />
              下注确认
            </div>
            <h3 className="max-w-[420px] pr-10 text-[22px] md:text-[28px] font-black tracking-[-0.04em] text-white">{item.title}</h3>
            <p className="mt-[8px] text-[13px] md:text-[14px] leading-[1.45] text-zinc-400">
              你正在选择 <span className="font-bold text-white">{selectedLabel}</span>，确认金额后将立即提交下注。
            </p>
          </div>

          <div className="space-y-[14px] px-[18px] py-[18px] md:space-y-[16px] md:px-[24px] md:py-[22px]">
            <div className="grid grid-cols-2 gap-[10px] md:gap-[14px]">
              <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,23,30,0.96),rgba(12,14,18,0.96))] px-[18px] py-[16px]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">我的余额</div>
                <div className="mt-[10px] flex items-center gap-[8px] text-[20px] md:text-[26px] font-black tracking-[-0.04em] text-emerald-300">
                  <Coins size={18} />
                  {balance.toLocaleString()}
                </div>
              </div>
              <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,23,30,0.96),rgba(12,14,18,0.96))] px-[18px] py-[16px]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">当前赔率</div>
                <div className="mt-[10px] text-[20px] md:text-[26px] font-black tracking-[-0.04em] text-cyan-300">{selectedOdds.toFixed(1)}x</div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,23,30,0.96),rgba(12,14,18,0.96))] px-[18px] py-[18px]">
              <div className="mb-[10px] text-[14px] font-semibold tracking-[-0.02em] text-zinc-300">下注金额</div>
              <label className="flex h-[54px] md:h-[58px] items-center rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,15,20,0.98),rgba(9,11,15,0.96))] px-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.24)]">
                <span className="mr-[12px] text-[14px] font-bold uppercase tracking-[0.14em] text-zinc-500">Coins</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="请输入下注金额"
                  className="h-full w-full bg-transparent text-[22px] md:text-[26px] font-black tracking-[-0.03em] text-white outline-none placeholder:text-white/30"
                />
              </label>

              <div className="mt-[14px] flex items-center justify-between rounded-[22px] border border-cyan-400/12 bg-cyan-400/5 px-[16px] py-[14px]">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">预计派奖</div>
                  <div className="mt-[6px] text-[20px] md:text-[24px] font-black tracking-[-0.04em] text-white">{expectedPayout.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-zinc-500">选择阵营</div>
                  <div className="mt-[6px] text-[16px] font-bold text-cyan-300">{selectedLabel}</div>
                </div>
              </div>
            </div>

            {errorText ? (
              <div className="rounded-[22px] border border-[#ff8e97]/18 bg-[#ff8e97]/8 px-[16px] py-[12px] text-[14px] text-[#ff9ca4]">
                {errorText}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-[10px] md:gap-[14px] border-t border-white/8 px-[18px] py-[16px] pb-[max(16px,env(safe-area-inset-bottom))] md:px-[24px] md:py-[20px]">
            <button
              type="button"
              className="h-[46px] md:h-[52px] rounded-full border border-white/10 bg-[rgba(255,255,255,0.03)] text-[16px] md:text-[18px] font-semibold text-zinc-300 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              disabled={coinBetMutation.isLoading}
              className="h-[46px] md:h-[52px] rounded-full border border-emerald-400/20 bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_48%,#0b8f84_100%)] text-[16px] md:text-[18px] font-black tracking-[0.04em] text-white shadow-[0_18px_34px_rgba(16,185,129,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSubmit}
            >
              {coinBetMutation.isLoading ? '下注中...' : '确认下注'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
