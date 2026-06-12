/** 文件说明：地下钱庄挑战庄家 / 庄家加注金额弹框。 */
import styles from './index.module.scss';
import { Coins, Plus, Swords, X } from 'lucide-react';
import { formatCoins } from '../battlePlazaDuelModel';

const STAKE_PRESETS = [100, 500, 1000, 2000] as const;

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

export interface BattlePlazaStakeModalProps {
  open: boolean;
  mode: 'join' | 'add-stake';
  remainingAmount?: number;
  visibility?: 'public' | 'private';
  currentWager?: number;
  amount: number;
  minAmount?: number;
  maxAmount?: number;
  feeNote: string;
  submitting?: boolean;
  canSubmit?: boolean;
  onClose: () => void;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
}

export function BattlePlazaStakeModal({
  open,
  mode,
  remainingAmount,
  visibility = 'public',
  currentWager,
  amount,
  minAmount = 100,
  maxAmount,
  feeNote,
  submitting = false,
  canSubmit = true,
  onClose,
  onAmountChange,
  onSubmit,
}: BattlePlazaStakeModalProps) {
  if (!open) return null;

  const isJoin = mode === 'join';
  const title = isJoin ? '挑战庄家' : '庄家加注';
  const modeLabel = visibility === 'public' ? '公开' : '私人';
  const cappedMax = typeof maxAmount === 'number' ? Math.max(minAmount, maxAmount) : undefined;

  const handlePresetClick = (preset: number) => {
    if (cappedMax !== undefined) {
      onAmountChange(Math.min(cappedMax, Math.max(minAmount, preset)));
      return;
    }
    onAmountChange(Math.max(minAmount, preset));
  };

  const handleAmountInput = (raw: string) => {
    const next = Number(raw || 0);
    if (!Number.isFinite(next)) return;
    if (cappedMax !== undefined) {
      onAmountChange(Math.min(cappedMax, Math.max(minAmount, Math.floor(next))));
      return;
    }
    onAmountChange(Math.max(minAmount, Math.floor(next)));
  };

  const submitLabel = isJoin
    ? `确认挑战 ${formatCoins(amount)} 龟币`
    : `确认加注 ${formatCoins(amount)} 龟币`;

  return (
    <div className={css('overlay')} onClick={onClose} role="presentation">
      <div
        className={css('modal')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-stake-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={css('close')} aria-label="关闭" onClick={onClose}>
          <X size={16} aria-hidden />
        </button>

        <div className={css('head')}>
          {isJoin ? (
            <Swords size={20} className={css('head-icon')} aria-hidden />
          ) : (
            <Plus size={20} className={css('head-icon')} aria-hidden />
          )}
          <h2 id="bp-stake-modal-title" className={css('title')}>
            {title}
          </h2>
        </div>

        <p className={css('meta')}>
          {isJoin ? (
            <>
              剩余可挑战{' '}
              <span className={css('meta-amount')}>
                {formatCoins(remainingAmount ?? 0)}
                <Coins size={14} className="text-amber-400" aria-hidden />
              </span>
              {' · '}模式 {modeLabel}
            </>
          ) : (
            <>
              当前庄家押注{' '}
              <span className={css('meta-amount')}>
                {formatCoins(currentWager ?? 0)}
                <Coins size={14} className="text-amber-400" aria-hidden />
              </span>
              {' · '}模式 {modeLabel}
            </>
          )}
        </p>

        <div className={css('amount-box')}>
          <input
            className={css('amount-input')}
            type="number"
            min={minAmount}
            max={cappedMax}
            value={amount}
            onChange={(event) => handleAmountInput(event.target.value)}
            aria-label={isJoin ? '挑战金额' : '加注金额'}
          />
          <Coins size={22} className={css('amount-coin')} aria-hidden />
        </div>

        <div className={css('presets')}>
          {STAKE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={css('preset', amount === preset && 'preset-on')}
              onClick={() => handlePresetClick(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <p className={css('fee-note')}>{feeNote}</p>

        <button
          type="button"
          className={css('submit', isJoin ? 'submit-green' : 'submit-orange')}
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            '提交中...'
          ) : (
            <>
              {isJoin ? <Swords size={17} aria-hidden /> : <Plus size={17} aria-hidden />}
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
