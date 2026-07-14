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
    return { code: 'underground_bank', label: '黑市', shortLabel: '黑市', summaryOrder: 99, tone: 'green' };
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
  if (normalized.startsWith('/rewards')) return '/pet';
  if (normalized.startsWith('/profile') || normalized.startsWith('/mine')) return '/profile';
  if (normalized === '/' || normalized.startsWith('/dark-market')) return '/dark-market';

  return normalized;
}

export type MessageDetailField = {
  label: string;
  value: string;
  mono?: boolean;
};

export type MessageTimelineItem = {
  id: string;
  label: string;
  timeLabel: string;
  tone: 'green' | 'amber' | 'blue' | 'orange';
  icon: 'plus' | 'wallet' | 'box' | 'check' | 'gift' | 'flame';
};

export type MessagePrimaryAction = {
  label: string;
  path: string | null;
};

const FIELD_LABEL_MAP: Record<string, { label: string; mono?: boolean }> = {
  orderNo: { label: '订单编号', mono: true },
  orderId: { label: '订单编号', mono: true },
  order_no: { label: '订单编号', mono: true },
  bizId: { label: '业务编号', mono: true },
  amount: { label: '消耗龟币' },
  payout: { label: '奖励龟币' },
  coinCost: { label: '消耗龟币' },
  cost: { label: '消耗龟币' },
  itemName: { label: '交付对象' },
  petName: { label: '交付对象' },
  deliveryTarget: { label: '交付对象' },
  delivery: { label: '交付位置' },
  location: { label: '交付位置' },
  marketTitle: { label: '市场' },
  marketId: { label: '市场 ID', mono: true },
  settleResult: { label: '结算结果' },
  betId: { label: '下注编号', mono: true },
  loginStreak: { label: '连续登录' },
  balanceAfter: { label: '余额' },
  date: { label: '日期' },
};

const HIDDEN_DETAIL_KEYS = new Set([
  'timeline',
  'records',
  'steps',
  'status',
  'statusLabel',
  'scene',
  'sceneTitle',
  'actionTitle',
  'title',
  'subtitle',
]);

function toUnixMs(createTime?: number) {
  if (!createTime) return 0;
  return createTime > 1_000_000_000_000 ? createTime : createTime * 1000;
}

export function parseMessageJsonObject(raw?: string): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore invalid json snapshot
  }
  return {};
}

export function formatMessageDetailTime(createTime?: number): string {
  if (!createTime) return '';
  const tsMs = toUnixMs(createTime);
  const date = new Date(tsMs);
  const now = new Date();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const timePart = `${hh}:${mm}`;

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `今天 ${timePart}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return `昨天 ${timePart}`;

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timePart}`;
  }
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${timePart}`;
}

function formatClock(createTime?: number): string {
  if (!createTime) return '';
  const date = new Date(toUnixMs(createTime));
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatFieldValue(key: string, value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') {
    if (['amount', 'payout', 'coinCost', 'cost', 'balanceAfter'].includes(key)) {
      return `${value.toLocaleString('zh-CN')} 龟币`;
    }
    if (key === 'loginStreak') return `${value} 天`;
    return String(value);
  }
  const text = String(value).trim();
  if (!text) return '';
  if (['amount', 'payout', 'coinCost', 'cost', 'balanceAfter'].includes(key) && /^\d+(\.\d+)?$/.test(text)) {
    return `${Number(text).toLocaleString('zh-CN')} 龟币`;
  }
  if (key === 'settleResult') {
    const upper = text.toUpperCase();
    if (upper === 'WIN') return '已获胜';
    if (upper === 'LOSE') return '未命中';
    if (upper === 'DRAW') return '平局';
  }
  if (key === 'loginStreak' && /^\d+$/.test(text)) return `${text} 天`;
  return text;
}

export function resolveMessageMergedPayload(record: MessageNotifyRecord): Record<string, unknown> {
  return {
    ...parseMessageJsonObject(record.templateParams),
    ...parseMessageJsonObject(record.extraData),
    ...(record.bizId ? { bizId: record.bizId } : {}),
  };
}

export function resolveMessageSceneTitle(record: MessageNotifyRecord): string {
  const meta = resolveMessageBusinessMeta(record.businessCode);
  const payload = resolveMessageMergedPayload(record);
  const scene =
    String(payload.scene ?? payload.sceneTitle ?? payload.actionTitle ?? payload.subtitle ?? '').trim() ||
    resolveSceneFromTemplate(record.templateCode, record.businessCode);
  return scene ? `${meta.label} · ${scene}` : meta.label;
}

function resolveSceneFromTemplate(templateCode: string, businessCode: string): string {
  const code = templateCode.toLowerCase();
  if (code.includes('buy') || code.includes('purchase') || code.includes('hatch')) return '购买乌龟';
  if (code.includes('settle_win') || code.includes('settle')) return '结算通知';
  if (code.includes('reply') || code.includes('comment')) return '互动提醒';
  if (code.includes('daily') || code.includes('login_reward')) return '每日奖励';
  if (code.includes('announce') || code.includes('system')) return '系统公告';
  if (businessCode === 'underground_bank') return '交易通知';
  if (businessCode === 'dark_market') return '盘口通知';
  if (businessCode === 'tear_square') return '观点互动';
  if (businessCode === 'reward') return '奖励到账';
  if (businessCode === 'intel') return '线报更新';
  return '消息通知';
}

export function resolveMessageDetailStatusBadge(record: MessageNotifyRecord): string {
  const payload = resolveMessageMergedPayload(record);
  const fromPayload = String(payload.statusLabel ?? payload.status ?? '').trim();
  if (fromPayload) {
    const upper = fromPayload.toUpperCase();
    if (upper === 'DONE' || upper === 'COMPLETED' || upper === 'PAID' || fromPayload === '完成') return '已完成';
    if (upper === 'WIN') return '已结算';
    if (upper === 'PENDING') return '处理中';
    return fromPayload;
  }
  if (record.status === 0) return '未读';
  if (record.templateCode.toLowerCase().includes('settle')) return '已结算';
  if (record.businessCode === 'system') return '公告';
  if (record.businessCode === 'reward') return '已到账';
  return '已完成';
}

export function resolveMessageDetailFields(record: MessageNotifyRecord): MessageDetailField[] {
  const payload = resolveMessageMergedPayload(record);
  const fields: MessageDetailField[] = [];
  const preferredKeys = [
    'orderNo',
    'orderId',
    'order_no',
    'bizId',
    'amount',
    'coinCost',
    'cost',
    'payout',
    'itemName',
    'petName',
    'deliveryTarget',
    'delivery',
    'location',
    'marketTitle',
    'settleResult',
    'betId',
    'loginStreak',
    'balanceAfter',
    'date',
    'marketId',
  ];

  const used = new Set<string>();
  preferredKeys.forEach((key) => {
    if (!(key in payload) || used.has(key)) return;
    const meta = FIELD_LABEL_MAP[key];
    const value = formatFieldValue(key, payload[key]);
    if (!meta || !value) return;
    used.add(key);
    fields.push({ label: meta.label, value, mono: meta.mono });
  });

  if (fields.length === 0) {
    Object.entries(payload).forEach(([key, rawValue]) => {
      if (HIDDEN_DETAIL_KEYS.has(key) || typeof rawValue === 'object') return;
      const meta = FIELD_LABEL_MAP[key] ?? { label: key };
      const value = formatFieldValue(key, rawValue);
      if (!value) return;
      fields.push({ label: meta.label, value, mono: meta.mono });
    });
  }

  return fields.slice(0, 8);
}

function resolveTimelineTone(index: number, rawTone?: string): MessageTimelineItem['tone'] {
  const tone = String(rawTone ?? '').toLowerCase();
  if (tone.includes('amber') || tone.includes('gold') || tone.includes('wallet')) return 'amber';
  if (tone.includes('blue') || tone.includes('system')) return 'blue';
  if (tone.includes('orange') || tone.includes('flame')) return 'orange';
  if (index === 1) return 'amber';
  return 'green';
}

function resolveTimelineIcon(index: number, rawIcon?: string): MessageTimelineItem['icon'] {
  const icon = String(rawIcon ?? '').toLowerCase();
  if (icon.includes('wallet') || icon.includes('coin')) return 'wallet';
  if (icon.includes('box') || icon.includes('package') || icon.includes('delivery')) return 'box';
  if (icon.includes('gift')) return 'gift';
  if (icon.includes('flame')) return 'flame';
  if (icon.includes('check')) return 'check';
  if (index === 0) return 'plus';
  if (index === 1) return 'wallet';
  return 'box';
}

export function resolveMessageTimeline(record: MessageNotifyRecord): MessageTimelineItem[] {
  const payload = resolveMessageMergedPayload(record);
  const rawList = payload.timeline ?? payload.records ?? payload.steps;
  if (Array.isArray(rawList) && rawList.length) {
    return rawList.slice(0, 6).map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const label = String(row.label ?? row.title ?? row.name ?? `步骤 ${index + 1}`).trim();
      const timeLabel = String(row.timeLabel ?? row.time ?? row.at ?? '').trim() || formatClock(record.createTime);
      return {
        id: String(row.id ?? `${index}-${label}`),
        label,
        timeLabel,
        tone: resolveTimelineTone(index, String(row.tone ?? row.type ?? '')),
        icon: resolveTimelineIcon(index, String(row.icon ?? row.type ?? '')),
      };
    });
  }

  // 无时间线快照时按业务兜底三段进度，便于详情页结构稳定
  const clock = formatClock(record.createTime) || '--';
  if (record.businessCode === 'underground_bank' || record.templateCode.toLowerCase().includes('buy')) {
    return [
      { id: 'created', label: '订单已创建', timeLabel: clock, tone: 'green', icon: 'plus' },
      { id: 'paid', label: '龟币已扣除', timeLabel: clock, tone: 'amber', icon: 'wallet' },
      { id: 'delivered', label: '乌龟已入库', timeLabel: clock, tone: 'green', icon: 'box' },
    ];
  }
  if (record.businessCode === 'dark_market' || record.templateCode.toLowerCase().includes('settle')) {
    return [
      { id: 'bet', label: '下注已确认', timeLabel: clock, tone: 'green', icon: 'check' },
      { id: 'closed', label: '市场已封盘', timeLabel: clock, tone: 'amber', icon: 'wallet' },
      { id: 'settled', label: '奖励已结算', timeLabel: clock, tone: 'green', icon: 'gift' },
    ];
  }
  if (record.businessCode === 'reward') {
    return [
      { id: 'ready', label: '奖励已生成', timeLabel: clock, tone: 'amber', icon: 'gift' },
      { id: 'paid', label: '龟币已到账', timeLabel: clock, tone: 'green', icon: 'wallet' },
    ];
  }
  return [
    { id: 'created', label: '消息已创建', timeLabel: clock, tone: 'green', icon: 'plus' },
    { id: 'delivered', label: '已推送到消息中心', timeLabel: clock, tone: 'blue', icon: 'check' },
  ];
}

export function resolveMessagePrimaryAction(record: MessageNotifyRecord): MessagePrimaryAction {
  const path = resolveMessageDetailPath(record.detailUrl || '');
  const payload = resolveMessageMergedPayload(record);
  const customLabel = String(payload.actionLabel ?? payload.ctaLabel ?? '').trim();
  if (customLabel) return { label: customLabel, path };

  const code = record.businessCode;
  const template = record.templateCode.toLowerCase();
  if (path?.startsWith('/pet') || template.includes('pet') || template.includes('buy')) {
    return { label: '查看宠物仓库', path: path || '/pet' };
  }
  if (code === 'dark_market' || path?.includes('event-battle') || path?.includes('dark-market')) {
    return { label: '查看相关盘口', path: path || '/dark-market' };
  }
  if (code === 'tear_square' || path?.includes('rivalry')) {
    return { label: '查看开撕台', path: path || '/rivalry' };
  }
  if (code === 'intel' || path?.includes('forum')) {
    return { label: '查看线报', path: path || '/forum' };
  }
  if (code === 'reward') {
    return { label: '查看奖励', path: path || '/pet' };
  }
  if (code === 'underground_bank') {
    return { label: '前往黑市', path: path || '/shop' };
  }
  if (path) return { label: '查看详情', path };
  return { label: '返回消息中心', path: null };
}
