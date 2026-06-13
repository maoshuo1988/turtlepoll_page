/** 文件说明：做庄弹框结算日期与时间戳换算工具。 */
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export const COMPOSE_SETTLE_HOUR = 18;
export const COMPOSE_SETTLE_MINUTE = 0;

export const COMPOSE_SETTLE_WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

export interface ComposeSettleDateParts {
  year: number;
  month: number;
  day: number;
}

export interface ComposeCalendarCell {
  key: string;
  date: string;
  label: number;
  inMonth: boolean;
  isToday: boolean;
  disabled: boolean;
}

export function getDefaultComposeSettleDate() {
  return dayjs().add(7, 'day').format('YYYY-MM-DD');
}

export function parseComposeSettleDate(value: string): Dayjs | null {
  const parsed = dayjs(`${value}T12:00:00`);
  return parsed.isValid() ? parsed : null;
}

export function composeSettleTimestamp(dateValue: string) {
  const parsed = parseComposeSettleDate(dateValue);
  if (!parsed) return null;
  return parsed.hour(COMPOSE_SETTLE_HOUR).minute(COMPOSE_SETTLE_MINUTE).second(0).millisecond(0).unix();
}

export function formatComposeSettleSummary(dateValue: string) {
  const hourText = `${String(COMPOSE_SETTLE_HOUR).padStart(2, '0')}:00`;
  return `结算时间 ${hourText} · ${dateValue}`;
}

export function formatComposeSettleDisplay(dateValue: string) {
  const hourText = `${String(COMPOSE_SETTLE_HOUR).padStart(2, '0')}:00`;
  return `${dateValue} ${hourText}`;
}

export function getMinComposeSettleDate() {
  const now = dayjs();
  const todaySettle = now.hour(COMPOSE_SETTLE_HOUR).minute(0).second(0).millisecond(0);
  if (now.isBefore(todaySettle)) {
    return now.format('YYYY-MM-DD');
  }
  return now.add(1, 'day').format('YYYY-MM-DD');
}

export function isComposeSettleDateDisabled(dateValue: string, now = dayjs()) {
  const timestamp = composeSettleTimestamp(dateValue);
  if (!timestamp) return true;
  return timestamp <= now.unix();
}

export function clampComposeSettleParts(year: number, month: number, day: number): ComposeSettleDateParts {
  const base = dayjs(`${year}-${String(month).padStart(2, '0')}-01T12:00:00`);
  const safeBase = base.isValid() ? base : dayjs(getDefaultComposeSettleDate());
  const maxDay = safeBase.daysInMonth();
  return {
    year: safeBase.year(),
    month: safeBase.month() + 1,
    day: Math.min(Math.max(1, day), maxDay),
  };
}

export function partsFromComposeSettleDate(value: string): ComposeSettleDateParts {
  const parsed = parseComposeSettleDate(value);
  if (!parsed) {
    return partsFromComposeSettleDate(getDefaultComposeSettleDate());
  }
  return { year: parsed.year(), month: parsed.month() + 1, day: parsed.date() };
}

export function partsToComposeSettleDate(year: number, month: number, day: number) {
  const parts = clampComposeSettleParts(year, month, day);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function buildComposeSettleYearOptions(baseYear = dayjs().year()) {
  return Array.from({ length: 6 }, (_, index) => baseYear + index);
}

export function buildComposeSettleMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => index + 1);
}

export function buildComposeSettleDayOptions(year: number, month: number) {
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01T12:00:00`).daysInMonth();
  return Array.from({ length: daysInMonth }, (_, index) => index + 1);
}

export function buildComposeCalendarCells(viewMonth: Dayjs, now = dayjs()): ComposeCalendarCell[] {
  const monthStart = viewMonth.startOf('month');
  const monthEnd = viewMonth.endOf('month');
  const leading = monthStart.isoWeekday() - 1;
  const gridStart = monthStart.subtract(leading, 'day');
  const todayKey = now.format('YYYY-MM-DD');

  return Array.from({ length: 42 }, (_, index) => {
    const current = gridStart.add(index, 'day');
    const date = current.format('YYYY-MM-DD');
    return {
      key: date,
      date,
      label: current.date(),
      inMonth: !current.isBefore(monthStart, 'day') && !current.isAfter(monthEnd, 'day'),
      isToday: date === todayKey,
      disabled: isComposeSettleDateDisabled(date, now),
    };
  });
}
