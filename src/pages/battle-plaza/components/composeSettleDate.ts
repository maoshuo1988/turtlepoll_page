/** 文件说明：做庄弹框结算日期与时间戳换算工具。 */
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export const DEFAULT_COMPOSE_SETTLE_HOUR = 18;
export const DEFAULT_COMPOSE_SETTLE_MINUTE = 0;
export const DEFAULT_COMPOSE_SETTLE_SECOND = 0;

export const COMPOSE_SETTLE_WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

export interface ComposeSettleDateParts {
  year: number;
  month: number;
  day: number;
}

export interface ComposeSettleDateTimeParts extends ComposeSettleDateParts {
  hour: number;
  minute: number;
  second: number;
}

export interface ComposeCalendarCell {
  key: string;
  date: string;
  label: number;
  inMonth: boolean;
  isToday: boolean;
  disabled: boolean;
}

export function getDefaultComposeSettleDateTime(): ComposeSettleDateTimeParts {
  const base = dayjs().add(7, 'day');
  return {
    year: base.year(),
    month: base.month() + 1,
    day: base.date(),
    hour: DEFAULT_COMPOSE_SETTLE_HOUR,
    minute: DEFAULT_COMPOSE_SETTLE_MINUTE,
    second: DEFAULT_COMPOSE_SETTLE_SECOND,
  };
}

export function getDefaultComposeSettleDate() {
  return partsToComposeSettleDateTime(getDefaultComposeSettleDateTime());
}

export function parseComposeSettleDate(value: string): Dayjs | null {
  const parsed = dayjs(`${value}T12:00:00`);
  return parsed.isValid() ? parsed : null;
}

export function partsToComposeSettleDateTime(parts: ComposeSettleDateTimeParts) {
  const dateParts = clampComposeSettleParts(parts.year, parts.month, parts.day);
  return `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-${String(dateParts.day).padStart(2, '0')}`;
}

export function normalizeComposeSettleDateTimeParts(parts: ComposeSettleDateTimeParts): ComposeSettleDateTimeParts {
  const dateParts = clampComposeSettleParts(parts.year, parts.month, parts.day);
  return {
    ...dateParts,
    hour: clampComposeSettleTimePart(parts.hour, 23),
    minute: clampComposeSettleTimePart(parts.minute, 59),
    second: clampComposeSettleTimePart(parts.second, 59),
  };
}

export function composeSettleTimestampFromParts(parts: ComposeSettleDateTimeParts) {
  const normalized = normalizeComposeSettleDateTimeParts(parts);
  const parsed = parseComposeSettleDate(partsToComposeSettleDateTime(normalized));
  if (!parsed) return null;
  return parsed
    .hour(normalized.hour)
    .minute(normalized.minute)
    .second(normalized.second)
    .millisecond(0)
    .unix();
}

/** @deprecated 仅保留日期时使用固定 18:00:00，请优先使用 composeSettleTimestampFromParts */
export function composeSettleTimestamp(dateValue: string) {
  const parsed = parseComposeSettleDate(dateValue);
  if (!parsed) return null;
  return parsed
    .hour(DEFAULT_COMPOSE_SETTLE_HOUR)
    .minute(DEFAULT_COMPOSE_SETTLE_MINUTE)
    .second(DEFAULT_COMPOSE_SETTLE_SECOND)
    .millisecond(0)
    .unix();
}

export function formatComposeSettleTime(parts: Pick<ComposeSettleDateTimeParts, 'hour' | 'minute' | 'second'>) {
  const normalized = normalizeComposeSettleDateTimeParts({
    year: 2000,
    month: 1,
    day: 1,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  });
  return `${String(normalized.hour).padStart(2, '0')}:${String(normalized.minute).padStart(2, '0')}:${String(normalized.second).padStart(2, '0')}`;
}

export function formatComposeSettleSummary(parts: ComposeSettleDateTimeParts) {
  const dateValue = partsToComposeSettleDateTime(parts);
  return `结算时间 ${formatComposeSettleTime(parts)} · ${dateValue}`;
}

export function formatComposeSettleDisplay(parts: ComposeSettleDateTimeParts) {
  const dateValue = partsToComposeSettleDateTime(parts);
  return `${dateValue} ${formatComposeSettleTime(parts)}`;
}

export function getMinComposeSettleDateTimeLabel(now = dayjs()) {
  return now.add(1, 'minute').startOf('minute').format('YYYY-MM-DD HH:mm:ss');
}

export function isComposeSettleDateTimeDisabled(parts: ComposeSettleDateTimeParts, now = dayjs()) {
  const timestamp = composeSettleTimestampFromParts(parts);
  if (!timestamp) return true;
  return timestamp <= now.unix();
}

export function isComposeSettleDateDisabled(dateValue: string, now = dayjs()) {
  const parsed = parseComposeSettleDate(dateValue);
  if (!parsed) return true;
  return parsed.endOf('day').unix() <= now.unix();
}

export function clampComposeSettleTimePart(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), max);
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

export function partsFromComposeSettleDateTime(parts: ComposeSettleDateTimeParts): ComposeSettleDateTimeParts {
  return normalizeComposeSettleDateTimeParts(parts);
}

export function partsToComposeSettleDate(year: number, month: number, day: number) {
  const dateParts = clampComposeSettleParts(year, month, day);
  return `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-${String(dateParts.day).padStart(2, '0')}`;
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

export function buildComposeSettleHourOptions() {
  return Array.from({ length: 24 }, (_, index) => index);
}

export function buildComposeSettleMinuteOptions() {
  return Array.from({ length: 60 }, (_, index) => index);
}

export function buildComposeSettleSecondOptions() {
  return Array.from({ length: 60 }, (_, index) => index);
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
