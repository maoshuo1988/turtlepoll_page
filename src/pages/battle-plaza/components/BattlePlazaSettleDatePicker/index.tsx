/** 文件说明：做庄弹框结算日期与时间选择器。 */
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check } from 'lucide-react';
import styles from './index.module.scss';
import {
  buildComposeCalendarCells,
  buildComposeSettleHourOptions,
  buildComposeSettleMinuteOptions,
  buildComposeSettleSecondOptions,
  COMPOSE_SETTLE_WEEK_LABELS,
  formatComposeSettleDisplay,
  isComposeSettleDateTimeDisabled,
  normalizeComposeSettleDateTimeParts,
  partsFromComposeSettleDate,
  type ComposeSettleDateTimeParts,
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
  value: ComposeSettleDateTimeParts;
  onClose: () => void;
  onConfirm: (dateTime: ComposeSettleDateTimeParts) => void;
}

export function BattlePlazaSettleDatePicker({
  open,
  value,
  onClose,
  onConfirm,
}: BattlePlazaSettleDatePickerProps) {
  const [draftDateTime, setDraftDateTime] = useState<ComposeSettleDateTimeParts>(value);
  const [viewMonth, setViewMonth] = useState(() => dayjs(`${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}T12:00:00`));

  useEffect(() => {
    if (!open) return;
    const next = normalizeComposeSettleDateTimeParts(value);
    setDraftDateTime(next);
    setViewMonth(dayjs(`${next.year}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}T12:00:00`));
  }, [open, value]);

  const draftDate = `${draftDateTime.year}-${String(draftDateTime.month).padStart(2, '0')}-${String(draftDateTime.day).padStart(2, '0')}`;
  const cells = useMemo(() => buildComposeCalendarCells(viewMonth), [viewMonth]);
  const hourOptions = useMemo(() => buildComposeSettleHourOptions(), []);
  const minuteOptions = useMemo(() => buildComposeSettleMinuteOptions(), []);
  const secondOptions = useMemo(() => buildComposeSettleSecondOptions(), []);
  const draftDisplay = useMemo(() => formatComposeSettleDisplay(draftDateTime), [draftDateTime]);
  const isDraftDisabled = isComposeSettleDateTimeDisabled(draftDateTime);

  if (!open) return null;

  const updateDraft = (next: Partial<ComposeSettleDateTimeParts>) => {
    setDraftDateTime((current) => normalizeComposeSettleDateTimeParts({ ...current, ...next }));
  };

  const handleConfirm = () => {
    if (isDraftDisabled) return;
    onConfirm(draftDateTime);
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
            <span>选择结算时间</span>
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
                onClick={() => updateDraft(partsFromComposeSettleDate(cell.date))}
              >
                {cell.label}
              </button>
            ))}
          </div>

          <div className={css('time-section')}>
            <div className={css('time-label')}>结算时分秒</div>
            <div className={css('time-pickers')}>
              <div className={css('select-wrap')}>
                <select
                  className={css('time-select')}
                  value={draftDateTime.hour}
                  onChange={(event) => updateDraft({ hour: Number(event.target.value) })}
                  aria-label="结算小时"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, '0')} 时
                    </option>
                  ))}
                </select>
              </div>
              <div className={css('select-wrap')}>
                <select
                  className={css('time-select')}
                  value={draftDateTime.minute}
                  onChange={(event) => updateDraft({ minute: Number(event.target.value) })}
                  aria-label="结算分钟"
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {String(minute).padStart(2, '0')} 分
                    </option>
                  ))}
                </select>
              </div>
              <div className={css('select-wrap')}>
                <select
                  className={css('time-select')}
                  value={draftDateTime.second}
                  onChange={(event) => updateDraft({ second: Number(event.target.value) })}
                  aria-label="结算秒数"
                >
                  {secondOptions.map((second) => (
                    <option key={second} value={second}>
                      {String(second).padStart(2, '0')} 秒
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={css('selected-box')}>
            <span className={css('selected-label')}>已选结算时间</span>
            <span className={css('selected-value')}>{draftDisplay}</span>
          </div>

          {isDraftDisabled ? (
            <p className={css('hint')}>结算时间必须晚于当前时间。</p>
          ) : null}
        </div>

        <div className={css('foot')}>
          <button type="button" className={css('cancel')} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={css('confirm')}
            onClick={handleConfirm}
            disabled={isDraftDisabled}
            style={isDraftDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            <Check size={16} aria-hidden />
            确认时间
          </button>
        </div>
      </div>
    </div>
  );
}
