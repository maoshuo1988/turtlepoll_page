/**
 * 文件说明：消息中心业务分类映射、跳转与时间格式化。
 */
import type { MessageNotifyBusinessCode, MessageNotifyRecord } from '@/hooks/messageNotifyTypes';

export type MessageFilterKey =
  | 'all'
  | 'dark_market'
  | 'intel'
  | 'tear_square'
  | 'system'
  | 'reward';

export type MessageBusinessMeta = {
  code: MessageNotifyBusinessCode;
  label: string;
  shortLabel: string;
  /** 未读汇总卡展示顺序 */
  summaryOrder: number;
  /** CSS module token suffix */
  tone: 'green' | 'teal' | 'orange' | 'purple' | 'amber';
};

export const MESSAGE_BUSINESS_META: MessageBusinessMeta[] = [
  { code: 'dark_market', label: '暗盘', shortLabel: '暗盘', summaryOrder: 1, tone: 'green' },
  { code: 'intel', label: '线报', shortLabel: '线报', summaryOrder: 2, tone: 'teal' },
  { code: 'tear_square', label: '开撕台', shortLabel: '开撕台', summaryOrder: 3, tone: 'orange' },
  { code: 'system', label: '系统', shortLabel: '系统', summaryOrder: 4, tone: 'purple' },
  { code: 'reward', label: '奖励', shortLabel: '奖励', summaryOrder: 5, tone: 'amber' },
];

export const MESSAGE_FILTER_TABS: Array<{ key: MessageFilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'dark_market', label: '暗盘' },
  { key: 'intel', label: '线报' },
  { key: 'tear_square', label: '开撕台' },
  { key: 'system', label: '系统' },
  { key: 'reward', label: '奖励' },
];

export function resolveMessageBusinessMeta(businessCode?: string): MessageBusinessMeta {
  const matched = MESSAGE_BUSINESS_META.find((item) => item.code === businessCode);
  if (matched) return matched;
  if (businessCode === 'underground_bank') {
    return { code: 'underground_bank', label: '地下钱庄', shortLabel: '钱庄', summaryOrder: 99, tone: 'green' };
  }
  return { code: 'system', label: '系统', shortLabel: '系统', summaryOrder: 99, tone: 'purple' };
}

export function resolveMessageFilterBusinessCode(filter: MessageFilterKey): string | undefined {
  if (filter === 'all') return undefined;
  return filter;
}

export function formatMessageRelativeTime(createTime?: number): string {
  if (!createTime) return '';
  const tsMs = createTime > 1_000_000_000_000 ? createTime : createTime * 1000;
  const diffSec = Math.max(0, Math.floor((Date.now() - tsMs) / 1000));
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d`;
  const date = new Date(tsMs);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function resolveMessageStatusLabel(record: MessageNotifyRecord): string {
  if (record.status === 0) return '未读';
  const meta = resolveMessageBusinessMeta(record.businessCode);
  if (record.businessCode === 'system') return '公告';
  if (record.businessCode === 'reward') return '奖励';
  if (record.templateCode.includes('complete') || record.templateCode.includes('settle')) return '完成';
  return meta.shortLabel;
}

export function resolveMessageDetailPath(detailUrl: string): string | null {
  const raw = detailUrl.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  const normalized = raw.startsWith('/') ? raw : `/${raw}`;

  const predictMarketMatch = normalized.match(/^\/predict\/markets\/(\d+)/i);
  if (predictMarketMatch?.[1]) {
    return `/event-battle?market=${predictMarketMatch[1]}`;
  }

  if (normalized.startsWith('/forum')) return '/forum';
  if (normalized.startsWith('/rivalry')) return '/rivalry';
  if (normalized.startsWith('/shop')) return '/shop';
  if (normalized.startsWith('/battle-plaza') || normalized.startsWith('/underground')) return '/battle-plaza';
  if (normalized.startsWith('/pet')) return '/pet';
  if (normalized.startsWith('/profile') || normalized.startsWith('/mine')) return '/profile';
  if (normalized === '/' || normalized.startsWith('/dark-market')) return '/dark-market';

  return normalized;
}
