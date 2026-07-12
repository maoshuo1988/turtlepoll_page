/**
 * 文件说明：message-notify Types，定义主站消息通知接口数据类型。
 */

export type MessageNotifyBusinessCode =
  | 'dark_market'
  | 'tear_square'
  | 'intel'
  | 'system'
  | 'reward'
  | 'underground_bank';

export type MessageNotifyStatus = 0 | 1;

export type MessageNotifyRecord = {
  id: number;
  businessCode: MessageNotifyBusinessCode | string;
  templateCode: string;
  templateId: number;
  userId: number;
  subject: string;
  body: string;
  detailUrl: string;
  status: MessageNotifyStatus;
  templateParams: string;
  extraData: string;
  bizId: string;
  idempotencyKey: string;
  createTime: number;
  updateTime: number;
};

export type MessageNotifyListParams = {
  businessCode?: string;
  status?: MessageNotifyStatus;
  cursor?: number | string;
  limit?: number;
};

export type MessageNotifyListResult = {
  results: MessageNotifyRecord[];
  cursor: number | string;
  hasMore: boolean;
  unreadCount: number;
};

export type MessageNotifyUnreadCountResult = {
  totalUnread: number;
  businessUnread: Partial<Record<MessageNotifyBusinessCode | string, number>>;
};

export type MessageNotifyReadResult = {
  updated: boolean;
  record: MessageNotifyRecord;
};

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function normalizeMessageNotifyRecord(raw: Record<string, unknown>): MessageNotifyRecord {
  return {
    id: toNumber(raw.id),
    businessCode: String(raw.businessCode ?? raw.business_code ?? ''),
    templateCode: String(raw.templateCode ?? raw.template_code ?? ''),
    templateId: toNumber(raw.templateId ?? raw.template_id),
    userId: toNumber(raw.userId ?? raw.user_id),
    subject: String(raw.subject ?? ''),
    body: String(raw.body ?? ''),
    detailUrl: String(raw.detailUrl ?? raw.detail_url ?? ''),
    status: (toNumber(raw.status) === 1 ? 1 : 0) as MessageNotifyStatus,
    templateParams: String(raw.templateParams ?? raw.template_params ?? ''),
    extraData: String(raw.extraData ?? raw.extra_data ?? ''),
    bizId: String(raw.bizId ?? raw.biz_id ?? ''),
    idempotencyKey: String(raw.idempotencyKey ?? raw.idempotency_key ?? ''),
    createTime: toNumber(raw.createTime ?? raw.create_time),
    updateTime: toNumber(raw.updateTime ?? raw.update_time),
  };
}

export function normalizeMessageNotifyListResult(raw: Record<string, unknown>): MessageNotifyListResult {
  const resultsRaw = Array.isArray(raw.results) ? raw.results : [];
  return {
    results: resultsRaw.map((item) => normalizeMessageNotifyRecord(item as Record<string, unknown>)),
    cursor: (raw.cursor ?? 0) as number | string,
    hasMore: Boolean(raw.hasMore ?? raw.has_more),
    unreadCount: toNumber(raw.unreadCount ?? raw.unread_count),
  };
}

export function normalizeMessageNotifyUnreadCount(
  raw: Record<string, unknown>,
): MessageNotifyUnreadCountResult {
  const businessUnreadRaw = (raw.businessUnread ?? raw.business_unread ?? {}) as Record<string, unknown>;
  const businessUnread: MessageNotifyUnreadCountResult['businessUnread'] = {};
  Object.entries(businessUnreadRaw).forEach(([key, value]) => {
    businessUnread[key] = toNumber(value);
  });
  return {
    totalUnread: toNumber(raw.totalUnread ?? raw.total_unread),
    businessUnread,
  };
}

export function normalizeMessageNotifyReadResult(raw: Record<string, unknown>): MessageNotifyReadResult {
  const recordRaw = (raw.record ?? {}) as Record<string, unknown>;
  return {
    updated: Boolean(raw.updated),
    record: normalizeMessageNotifyRecord(recordRaw),
  };
}
