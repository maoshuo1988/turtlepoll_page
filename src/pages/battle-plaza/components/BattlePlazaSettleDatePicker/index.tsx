/** 文件说明：做庄弹框结算日期日历选择器。 */
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check } from 'lucide-react';
import styles from './index.module.scss';
import {
  buildComposeCalendarCells,
  COMPOSE_SETTLE_WEEK_LABELS,
  formatComposeSettleDisplay,
  isComposeSettleDateDisabled,
  parseComposeSettleDate,
} from '../composeSettleDate';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function CalendarTitleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 3.5v3M16 3.5v3M4 9.5h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <text x="12" y="16.5" textAnchor="middle" fill="currentColor" fontSize="5.5" fontWeight="700">
        17
      </text>
    </svg>
  );
}

export interface BattlePlazaSettleDatePickerProps {
  open: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (dateValue: string) => void;
}

export function BattlePlazaSettleDatePicker({
  open,
  value,
  onClose,
  onConfirm,
}: BattlePlazaSettleDatePickerProps) {
  const [draftDate, setDraftDate] = useState(value);
  const [viewMonth, setViewMonth] = useState(() => parseComposeSettleDate(value) ?? dayjs());

  useEffect(() => {
    if (!open) return;
    setDraftDate(value);
    setViewMonth(parseComposeSettleDate(value) ?? dayjs());
  }, [open, value]);

  const cells = useMemo(() => buildComposeCalendarCells(viewMonth), [viewMonth]);

  if (!open) return null;

  const handleConfirm = () => {
    if (isComposeSettleDateDisabled(draftDate)) return;
    onConfirm(draftDate);
    onClose();
  };

  return (
    <div className={css('overlay')} onClick={onClose} role="presentation">
      <div
        className={css('modal')}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-settle-picker-title"
      >
        <div className={css('head')}>
          <div className={css('title-row')} id="compose-settle-picker-title">
            <CalendarTitleIcon className={css('title-ico')} />
            <span>选择结算日期</span>
          </div>
          <button type="button" className={css('close')} aria-label="关闭" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={css('body')}>
          <div className={css('month-bar')}>
            <button
              type="button"
              className={css('month-nav')}
              aria-label="上一月"
              onClick={() => setViewMonth((prev) => prev.subtract(1, 'month'))}
            >
              ‹
            </button>
            <div className={css('month-label')}>{viewMonth.format('YYYY 年 MM 月')}</div>
            <button
              type="button"
              className={css('month-nav')}
              aria-label="下一月"
              onClick={() => setViewMonth((prev) => prev.add(1, 'month'))}
            >
              ›
            </button>
          </div>

          <div className={css('week-row')}>
            {COMPOSE_SETTLE_WEEK_LABELS.map((label) => (
              <div key={label} className={css('week-cell')}>
                {label}
              </div>
            ))}
          </div>

          <div className={css('grid')}>
            {cells.map((cell, index) => (
              <button
                key={`${cell.key}-${index}`}
                type="button"
                className={css(
                  'day',
                  !cell.inMonth && 'day-outside',
                  cell.isToday && 'day-today',
                  draftDate === cell.date && 'day-selected',
                  cell.disabled && 'day-disabled',
                )}
                disabled={cell.disabled}
                onClick={() => setDraftDate(cell.date)}
              >
                {cell.label}
              </button>
            ))}
          </div>

          <div className={css('selected-box')}>
            <span className={css('selected-label')}>已选结算日期</span>
            <span className={css('selected-value')}>{formatComposeSettleDisplay(draftDate)}</span>
          </div>
        </div>

        <div className={css('foot')}>
          <button type="button" className={css('cancel')} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={css('confirm')}
            onClick={handleConfirm}
            disabled={isComposeSettleDateDisabled(draftDate)}
            style={isComposeSettleDateDisabled(draftDate) ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            <Check size={16} aria-hidden />
            确认日期
          </button>
        </div>
      </div>
    </div>
  );
}
