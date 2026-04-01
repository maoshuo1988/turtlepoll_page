export type BattleStatus = "open" | "sealed" | "pending" | "disputed" | "settled";

export type BattleResult = "banker_wins" | "banker_loses" | "void";

export type BattleResultBy =
  | "banker"
  | "timeout"
  | "confirm_timeout"
  | "admin"
  | "admin_timeout"
  | string;

export type BattleMyAction = "" | "confirm" | "dispute";

export type Battle = {
  id: number;
  title: string;
  bankerUserId: number;
  bankerSide: string;
  challengerSide: string;
  isPublic: boolean;
  inviteCode?: string;
  status: BattleStatus;
  settleTime: number;
  pendingDeadline?: number;
  confirmDeadline?: number;
  disputeDeadline?: number;
  disputedByUserId?: number;
  result?: BattleResult | "";
  resultBy?: BattleResultBy | "";
  resultTime?: number;
  bankerStakeTotal: number;
  challengerStakeTotal: number;
  poolPrincipalTotal: number;
  entryFeeTotal: number;
  burnTotal: number;
  createTime?: number;
  updateTime?: number;
};

export type BattleBet = {
  id: number;
  battleId: number;
  userId: number;
  amount: number;
  createTime?: number;
  updateTime?: number;
};

export type BattleChallengeAction = {
  battleId: number;
  userId: number;
  action: BattleMyAction;
  requestId: string;
  remark?: string;
  createTime?: number;
};

export type BattleSettlement = {
  id: number;
  battleId: number;
  result: BattleResult;
  createTime?: number;
  createdAt?: number;
};

export type BattleSettlementItem = {
  id: number;
  battleId: number;
  userId: number;
  payoutAmount: number;
  withdrawn: boolean;
  withdrawTime: number;
  createTime?: number;
  updateTime?: number;
};

export type BattleListItem = {
  battle: Battle;
  myAction: BattleMyAction;
};

export type BattleListParams = {
  page?: number;
  pageSize?: number;
  status?: BattleStatus;
  mine?: "1" | "0" | 1 | 0;
};

export type BattleListResponse = {
  list: BattleListItem[];
  count: number;
  page: number;
  pageSize: number;
};

export type BattleDetailResponse = {
  battle: Battle;
  myAction: BattleMyAction;
  settlement: {
    settlement: BattleSettlement | null;
    myItem: BattleSettlementItem | null;
  };
};

export type CreateBattlePayload = {
  title: string;
  bankerSide: string;
  challengerSide: string;
  stakeAmount: number;
  isPublic: boolean;
  inviteCode?: string;
  settleTime: number;
  requestId?: string;
};

export type JoinBattlePayload = {
  battleId: number;
  amount: number;
  requestId: string;
  inviteCode?: string;
};

export type JoinBattleResponse = {
  battle: Battle;
  bet: BattleBet;
};

export type BankerAddStakePayload = {
  battleId: number;
  amount: number;
  requestId: string;
};

export type DeclareBattlePayload = {
  battleId: number;
  result: Extract<BattleResult, "banker_wins" | "banker_loses">;
};

export type BattleChallengeActionPayload = {
  battleId: number;
  requestId: string;
  remark?: string;
};

export type BattleWithdrawPayload = {
  battleId: number;
  requestId: string;
};

export type AdminResolveBattlePayload = {
  battleId: number;
  requestId: string;
  result: BattleResult;
  remark?: string;
};

export type BattleActionPermissions = {
  isBanker: boolean;
  isChallenger: boolean;
  canJoin: boolean;
  canBankerAddStake: boolean;
  canDeclare: boolean;
  canConfirm: boolean;
  canDispute: boolean;
  canWithdraw: boolean;
};

// 后端 battle 当前主要靠 message 区分错误场景，前端在这里做统一中文映射。
const BATTLE_ERROR_MESSAGE_MAP: Record<string, string> = {
  "battle not found": "赌局不存在或已删除",
  "battle is not open": "赌局当前不可加入",
  "battle is full": "赌局已满",
  "invalid inviteCode": "邀请码错误",
  "permission denied": "无权限操作",
  "insufficient balance": "余额不足",
  "battle is not settled": "尚未结算，无法提取",
  "no payout for this user": "你在本局没有可提取金额",
  "banker has not declared result": "庄家尚未宣判",
  "battle is not pending": "当前阶段不允许该操作",
  "battle is not disputed": "当前不在争议仲裁状态",
  "battleId is required": "缺少赌局 ID",
  "title is required": "请输入赌局标题",
  "sides are required": "请完整填写双方观点",
  "stakeAmount must be >= 100": "开战金额不能低于 100",
  "settleTime is required": "请选择结算时间",
  "inviteCode is required for private battle": "私密场必须填写邀请码",
  "amount must be positive": "金额必须大于 0",
  "requestId is required": "请求标识不能为空",
  "banker cannot join as challenger": "庄家不能以挑战者身份加入",
  "battle is not allowed to add stake": "当前阶段不能追加庄家押注",
  "battle already reached settle time": "已到结算时间，不能再加注",
  "invalid result": "结果参数不正确",
  "only challenger can confirm": "只有挑战者可以确认结果",
  "only challenger can dispute": "只有挑战者可以发起异议",
};

export function getBattleErrorMessage(message?: string | null) {
  if (!message) return "系统繁忙，请稍后重试";

  // 这类错误后端会把剩余额度直接拼在 message 里，前端单独抽出来展示。
  if (message.startsWith("amount exceeds remaining capacity:")) {
    const remaining = message.split(":").slice(1).join(":").trim();
    return remaining ? `下注金额超过可加入上限，当前最多还能加入 ${remaining}` : "下注金额超过剩余可加入额度";
  }

  return BATTLE_ERROR_MESSAGE_MAP[message] ?? "系统繁忙，请稍后重试";
}

export function createBattleRequestId(prefix: string) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  // 兜底给旧环境，保证 join/confirm/dispute/withdraw 这些幂等接口都有 requestId。
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getBattleActionPermissions(params: {
  battle: Battle;
  myAction?: BattleMyAction;
  currentUserId?: number | string | null;
  settlementItem?: BattleSettlementItem | null;
  now?: number;
}) {
  const {
    battle,
    myAction = "",
    currentUserId,
    settlementItem,
    now = Math.floor(Date.now() / 1000),
  } = params;

  // 这里把文档里的按钮态规则收敛成一个函数，PC/手机端都走同一套判断。
  const currentUserIdText = currentUserId === undefined || currentUserId === null || currentUserId === "" ? "" : String(currentUserId);
  const bankerUserIdText = String(battle.bankerUserId);
  const isBanker = currentUserIdText !== "" && bankerUserIdText === currentUserIdText;
  const isChallenger = currentUserIdText !== "" && !isBanker;
  const inPendingWindow = typeof battle.pendingDeadline === "number" ? now <= battle.pendingDeadline : true;
  const inConfirmWindow = typeof battle.confirmDeadline === "number" ? now <= battle.confirmDeadline : true;

  const permissions: BattleActionPermissions = {
    isBanker,
    isChallenger,
    canJoin: battle.status === "open" && !isBanker,
    canBankerAddStake: isBanker && battle.status === "open",
    canDeclare: isBanker && battle.status === "pending" && inPendingWindow,
    canConfirm: isChallenger && battle.status === "pending" && myAction === "" && inConfirmWindow,
    canDispute: isChallenger && battle.status === "pending" && myAction === "" && inConfirmWindow,
    canWithdraw: battle.status === "settled" && Boolean(settlementItem) && settlementItem?.withdrawn === false,
  };

  return permissions;
}
