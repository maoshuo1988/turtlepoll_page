/**
 * 文件说明：ai Types，定义 AI 聊天相关接口数据类型。
 */
export type AiChatRole = 'user' | 'assistant' | string;

// AI 聊天消息实体：后端会分别返回用户消息和助手回复。
export type AiChatMessage = {
  // 消息 ID，降级回复或兜底场景可能没有。
  id?: number | string;
  // 消息所属用户 ID。
  userId?: number | string;
  // 消息角色：user 表示用户，assistant 表示小龟 AI。
  role?: AiChatRole;
  // 聊天场景，默认 chat。
  scene?: string;
  // 消息正文。
  content?: string;
  // 实际使用的模型名称。
  model?: string;
  // Prompt token 消耗。
  promptTokens?: number;
  // Completion token 消耗。
  completionTokens?: number;
  // 总 token 消耗。
  totalTokens?: number;
  // 这条消息记录的体力消耗，助手降级回复通常为 0。
  staminaCost?: number;
  // 业务上下文类型，例如 predict_market。
  contextType?: string;
  // 业务上下文 ID。
  contextId?: number | string;
  // DeepSeek 或后端生成的请求 ID。
  requestId?: string;
  // 创建时间，后端 Unix 时间戳。
  createTime?: number;
};

// POST /api/ai/chat 请求体。
export type AiChatPayload = {
  // 用户输入内容，后端默认最多 500 字。
  content: string;
  // 聊天场景，默认 chat。
  scene?: string;
  // 可选业务上下文类型，例如 predict_market。
  contextType?: string;
  // 可选业务上下文 ID。
  contextId?: number | string;
};

// POST /api/ai/chat 返回 data。
export type AiChatResponse = {
  // AI 助手回复消息；体力不足时可能不存在，只返回 insufficientPrompt。
  message?: AiChatMessage;
  // 后端保存的用户消息。
  userMessage?: AiChatMessage;
  // 本次聊天后剩余 AI 体力。
  staminaLeft?: number;
  // AI 体力上限。
  maxStamina?: number;
  // 下次自然恢复时间；0 表示已满。
  nextRecoverAt?: number;
  // 本次用户主动聊天应消耗的体力。
  staminaCost?: number;
  // Prompt token 消耗。
  promptTokens?: number;
  // Completion token 消耗。
  completionTokens?: number;
  // 总 token 消耗。
  totalTokens?: number;
  // DeepSeek 超时或失败时为 true，此时后端返回降级文案且不扣体力。
  degraded?: boolean;
  // 今日主动聊天剩余次数。
  dailyRemaining?: number;
  // 每日主动聊天次数上限。
  dailyMessageLimit?: number;
  // 体力不足时后端返回的可直接展示文案。
  insufficientPrompt?: string;
};

// GET /api/ai/stamina 返回 data。
export type AiStaminaResponse = {
  // 当前用户 ID。
  userId?: number | string;
  // 当前 AI 体力。
  stamina: number;
  // AI 体力上限。
  maxStamina: number;
  // 下次恢复时间；0 表示当前体力已满。
  nextRecoverAt?: number;
  // 今日已主动聊天次数。
  dailyUsedCount?: number;
  // 每日主动聊天次数上限。
  dailyLimit?: number;
  // 自然恢复间隔，单位分钟。
  recoverMinutes?: number;
  // 每颗苹果补给消耗的龟币数量。
  appleCoinCost?: number;
  // 上次自然恢复结算时间。
  lastRecoverAt?: number;
  // 今日主动聊天剩余次数。
  dailyRemaining?: number;
};

// POST /api/ai/stamina/apple 请求体。
export type AiStaminaApplePayload = {
  // 使用苹果数量，必须为正数。
  count: number;
};

// POST /api/ai/stamina/apple 返回 data。
export type AiStaminaAppleResponse = AiStaminaResponse & {
  // 请求使用的苹果数量。
  requestedCount?: number;
  // 实际恢复的体力数量。
  recoveredCount?: number;
  // 本次补给消耗的龟币。
  coinCost?: number;
  // 补给后的龟币余额。
  balanceAfter?: number;
};

// AI 主动推送消息实体。
export type AiPushMessage = {
  // 推送 ID，用于前端去重展示。
  id: number | string;
  // 推送场景，例如 win_streak。
  scene?: string;
  // 推送正文。
  content: string;
  // 关联业务上下文类型。
  contextType?: string;
  // 关联业务上下文 ID。
  contextId?: number | string;
  // 推送创建时间，后端 Unix 时间戳。
  createTime?: number;
};

// GET /api/ai/pushes/unread 返回 data。
export type AiUnreadPushesResponse = {
  // 未读 AI 推送列表。
  results: AiPushMessage[];
};

// POST /api/ai/pushes/read 请求体。
export type AiPushesReadPayload = {
  // 需要标记已读的 AI 推送 ID 列表。
  ids: Array<number | string>;
};

// POST /api/ai/pushes/read 返回 data。
export type AiPushesReadResponse = {
  // 本次真实从未读改为已读的数量；重复提交已读 ID 不视为错误。
  updated: number;
};

// POST /api/ai/presence 请求体。
export type AiPresencePayload = {
  // 当前用户所在页面或业务场景，例如 predict_market、pet_chat。
  page: string;
  // 当前页面是否处于活跃状态。
  active: boolean;
};

// POST /api/ai/presence 返回 data。
export type AiPresenceResponse = {
  // 当前用户 ID。
  userId?: number | string;
  // 后端记录的页面或业务场景。
  page: string;
  // 后端记录的活跃状态。
  active: boolean;
  // 最近在线上报时间，后端 Unix 时间戳。
  lastSeenAt: number;
};

// GET /api/ai/pushes/stream 的前端订阅参数。
export type AiPushStreamOptions = {
  // 是否建立 SSE 连接。
  enabled?: boolean;
  // 收到 ai_push 事件后的回调。
  onPush: (message: AiPushMessage) => void;
  // SSE 错误回调，通常只用于调试或页面提示。
  onError?: (error: Event) => void;
};
