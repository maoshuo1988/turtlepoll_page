/**
 * 文件说明：pet Helpers 工具方法，封装跨模块复用的基础能力。
 */
import type { DailySettleItem } from '@/hook/types';
import type { PetStatusAiMessage } from '@/hook/petType';

const PET_API_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_SETTLED: '今日已结算，无需重复发放。',
  EQUIP_DAILY_LIMIT: '今日切换龟种次数已用尽，请明天再试。',
  DEBT_UNPAID: '当前仍有欠款未还清，暂时不能切换龟种。',
  INSUFFICIENT_COINS: '龟币余额不足。',
  STAMINA_NOT_ENOUGH: '体力不足。',
  PARAM_INVALID: '参数有误，请刷新后重试。',
  PET_NOT_OWNED: '这只龟种还没有拥有，暂时不能装备。',
};

function normalizeTimestamp(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return null;

  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return null;
  return num < 1_000_000_000_000 ? num * 1000 : num;
}

export function formatBeijingDateTime(value?: number | string | null, options?: Intl.DateTimeFormatOptions) {
  const timestamp = normalizeTimestamp(value);
  if (!timestamp) return '-';

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(new Date(timestamp));
}

export function formatBeijingDate(value?: number | string | null) {
  return formatBeijingDateTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getPetApiErrorMessage(error: unknown, fallback = '操作失败，请稍后重试。') {
  if (error instanceof Error) {
    const code = String((error as Error & { code?: unknown }).code ?? '').trim();
    if (code && PET_API_ERROR_MESSAGES[code]) {
      return PET_API_ERROR_MESSAGES[code];
    }

    if (error.message && error.message !== '[object Object]') {
      return error.message;
    }
  }

  return fallback;
}

export function isAuthError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const code = String((error as Error & { code?: unknown }).code ?? '').trim();
  const message = error.message ?? '';
  return code === '401' || code === '403' || message.includes('NotLogin');
}

export function getDailySettleNetChange(items?: DailySettleItem[]) {
  return (items ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);
}

export function getPetStatusAiText(message: PetStatusAiMessage) {
  if (typeof message === 'string') return message;
  return message.text || message.content || message.message || '';
}

export function summarizeVoteStats(voteStats?: Record<string, unknown> | null) {
  if (!voteStats) return [];

  return Object.entries(voteStats)
    .filter(([, value]) => ['number', 'string', 'boolean'].includes(typeof value))
    .slice(0, 4)
    .map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
      value: typeof value === 'boolean' ? (value ? '是' : '否') : String(value),
    }));
}
