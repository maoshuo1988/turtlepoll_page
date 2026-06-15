/**
 * 文件说明：battle Types，定义对应业务域的接口数据类型。
 */
export type BattleStatus = "open" | "sealed" | "pending" | "disputed" | "settled";

export type BattleResult = "banker_wins" | "banker_loses" | "void";

const BATTLE_RESULT_BANKER_WINS = new Set([
  "banker_wins",
  "banker_win",
  "BANKER_WINS",
  "BANKER_WIN",
  "banker",
  "BANKER",
]);

const BATTLE_RESULT_BANKER_LOSES = new Set([
  "banker_loses",
  "banker_lose",
  "BANKER_LOSES",
  "BANKER_LOSE",
  "challenger_wins",
  "challenger_win",
  "CHALLENGER_WINS",
  "CHALLENGER_WIN",
  "challenger",
  "CHALLENGER",
]);

const BATTLE_RESULT_VOID = new Set(["void", "VOID", "cancelled", "CANCELLED"]);

/** 兼容后端不同 result 枚举/别名，统一成前端展示用的 BattleResult。 */
export function normalizeBattleResult(raw: unknown): BattleResult | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;

  const text = String(raw).trim();
  if (!text) return undefined;

  if (BATTLE_RESULT_BANKER_WINS.has(text)) return "banker_wins";
  if (BATTLE_RESULT_BANKER_LOSES.has(text)) return "banker_loses";
  if (BATTLE_RESULT_VOID.has(text)) return "void";

  const lower = text.toLowerCase();
  if (BATTLE_RESULT_BANKER_WINS.has(lower)) return "banker_wins";
  if (BATTLE_RESULT_BANKER_LOSES.has(lower)) return "banker_loses";
  if (BATTLE_RESULT_VOID.has(lower)) return "void";

  if (text.includes("庄家") && text.includes("胜")) return "banker_wins";
  if (text.includes("挑战") && text.includes("胜")) return "banker_loses";
  if (text.includes("作废")) return "void";

  return undefined;
}

export function getBattleResultLabel(result: BattleResult) {
  switch (result) {
    case "banker_wins":
      return "庄家获胜";
    case "banker_loses":
      return "挑战者获胜";
    case "void":
      return "本局作废";
    default:
      return "待宣布";
  }
}

export type BattleResultBy =
  | "banker"
  | "timeout"
  | "confirm_timeout"
  | "admin"
  | "admin_timeout"
  | string;

export type BattleMyAction = "" | "confirm" | "dispute";

export type BattleMyRole = "banker" | "challenger" | "none";

/** 归一化列表/详情里的挑战者动作字段。 */
export function normalizeBattleMyAction(raw: unknown): BattleMyAction {
  if (raw == null || raw === "") return "";
  const text = String(raw).trim().toLowerCase();
  if (text === "confirm") return "confirm";
  if (text === "dispute") return "dispute";
  return "";
}

/** 归一化列表里的当前用户身份字段。 */
export function normalizeBattleMyRole(raw: unknown): BattleMyRole {
  if (raw == null || raw === "") return "none";
  const text = String(raw).trim().toLowerCase();
  if (text === "banker") return "banker";
  if (text === "challenger") return "challenger";
  return "none";
}

export const BATTLE_DECLARE_WINDOW_SECONDS = 24 * 3600;
export const BATTLE_CONFIRM_WINDOW_SECONDS = 24 * 3600;

/** 兼容秒/毫秒时间戳，统一为 Unix 秒。 */
export function normalizeBattleUnixSeconds(value?: number | null): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  const num = Math.floor(value);
  if (num <= 0) return undefined;
  if (num >= 1_000_000_000_000) return Math.floor(num / 1000);
  return num;
}

export function resolvePendingDeadlineSeconds(battle: Battle): number | undefined {
  const pendingDeadline = normalizeBattleUnixSeconds(battle.pendingDeadline);
  const settleTime = normalizeBattleUnixSeconds(battle.settleTime);
  if (pendingDeadline) return pendingDeadline;
  return settleTime ? settleTime + BATTLE_DECLARE_WINDOW_SECONDS : undefined;
}

/** 挑战者确认截止：优先 confirmDeadline，缺失或早于宣判时间时回退 resultTime + 24h。 */
export function resolveConfirmDeadlineSeconds(battle: Battle): number | undefined {
  const resultTime = normalizeBattleUnixSeconds(battle.resultTime);
  const confirmDeadline = normalizeBattleUnixSeconds(battle.confirmDeadline);
  const fromResult = resultTime ? resultTime + BATTLE_CONFIRM_WINDOW_SECONDS : undefined;

  if (!normalizeBattleResult(battle.result) || !resultTime) {
    return confirmDeadline;
  }

  if (!confirmDeadline) return fromResult;
  if (confirmDeadline <= resultTime) return fromResult;

  const pendingDeadline = resolvePendingDeadlineSeconds(battle);
  if (pendingDeadline && confirmDeadline === pendingDeadline && fromResult) {
    return fromResult;
  }

  return confirmDeadline;
}

export type Battle = {
  id: number;
  title: string;
  bankerUserId: number;
  bankerSide: string;
  challengerSide: string;
  isPublic: boolean;
  inviteCode?: string;
  inviteExpireAt?: number;
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
  myRole: BattleMyRole;
  myAction: BattleMyAction;
  bankerNickname?: string;
  commentCount?: number;
  likeCount?: number;
};

export function normalizeBattleListItem(raw: BattleListItem): BattleListItem {
  return {
    ...raw,
    myRole: normalizeBattleMyRole(raw.myRole),
    myAction: normalizeBattleMyAction(raw.myAction),
    bankerNickname: raw.bankerNickname ?? "",
  };
}

export function normalizeBattleListResponse(raw: BattleListResponse): BattleListResponse {
  return {
    ...raw,
    list: (raw.list ?? []).map((item) => normalizeBattleListItem(item)),
  };
}

export type BattleListScope = "public" | "private";

export type BattleListSort = "latest" | "heat" | "big" | "settle_soon";

export type BattleListParams = {
  page?: number;
  pageSize?: number;
  status?: BattleStatus;
  listScope?: BattleListScope;
  role?: "banker" | "challenger";
  mine?: "1";
  sort?: BattleListSort;
};

export type BattleListResponse = {
  list: BattleListItem[];
  count: number;
  page: number;
  pageSize: number;
};

export type BattleStatsResponse = {
  unsettledCount?: number;
  pendingCount?: number;
  poolTotal?: number;
  bankerCount?: number;
};

export type BattleDetailParams = {
  battleId: number;
  inviteCode?: string;
  refreshInvite?: boolean | 0 | 1;
};

export type BattleDetailResponse = {
  battle: Battle;
  myRole: BattleMyRole;
  myAction: BattleMyAction;
  settlement: {
    settlement: BattleSettlement | null;
    myItem: BattleSettlementItem | null;
  };
};

export function normalizeBattleDetailResponse(raw: BattleDetailResponse): BattleDetailResponse {
  return {
    ...raw,
    myRole: normalizeBattleMyRole(raw.myRole),
    myAction: normalizeBattleMyAction(raw.myAction),
  };
}

export type CreateBattlePayload = {
  title: string;
  bankerSide: string;
  challengerSide: string;
  stakeAmount: number;
  isPublic: boolean;
  settleTime: number;
  requestId?: string;
};

export type CreateBattleResponse = {
  battle: Battle;
  inviteCode: string;
  inviteExpireAt: number;
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
  "battle not found": "赌局不存在或已删除；或私人局无有效邀请码",
  "battle is not open": "赌局当前不可加入",
  "battle is full": "赌局已满",
  "inviteCode is required for private battle": "私人局需要邀请码",
  "inviteCode format invalid": "邀请码格式错误，需为 4 位字母数字",
  "invalid inviteCode": "邀请码错误",
  "inviteCode expired": "邀请码已过期（48 小时有效期）",
  "only banker can refresh inviteCode": "仅庄家可刷新邀请码",
  "not battle banker": "不是该赌局的庄家",
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
  "amount must be positive": "金额必须大于 0",
  "requestId is required": "请求标识不能为空",
  "userId is required": "用户信息异常，请重新登录",
  "banker cannot join as challenger": "庄家不能以挑战者身份加入",
  "battle is not allowed to add stake": "当前阶段不能追加庄家押注",
  "battle already reached settle time": "已到结算时间，不能再加注",
  "invalid result": "结果参数不正确",
  "only challenger can confirm": "只有挑战者可以确认结果",
  "only challenger can dispute": "只有挑战者可以发起异议",
  "invalid listScope": "列表范围参数不正确",
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
  myRole?: BattleMyRole;
  myAction?: BattleMyAction;
  currentUserId?: number | string | null;
  settlementItem?: BattleSettlementItem | null;
  now?: number;
}) {
  const {
    battle,
    myRole,
    myAction = "",
    currentUserId,
    settlementItem,
    now = Math.floor(Date.now() / 1000),
  } = params;

  // 这里把文档里的按钮态规则收敛成一个函数，PC/手机端都走同一套判断。
  const currentUserIdText = currentUserId === undefined || currentUserId === null || currentUserId === "" ? "" : String(currentUserId);
  const bankerUserIdText = String(battle.bankerUserId);
  const matchedBankerById = currentUserIdText !== "" && bankerUserIdText === currentUserIdText;
  const hasChallengeFootprint = myAction !== "" || Boolean(settlementItem);

  let isBanker: boolean;
  let isChallenger: boolean;

  if (myRole === "banker") {
    isBanker = true;
    isChallenger = false;
  } else if (myRole === "challenger") {
    isBanker = matchedBankerById;
    isChallenger = !isBanker;
  } else if (myRole === "none") {
    isBanker = matchedBankerById;
    isChallenger = false;
  } else {
    // 详情等未带 myRole 的场景，回退 bankerUserId / 挑战痕迹推断。
    isBanker = matchedBankerById;
    isChallenger =
      !isBanker && currentUserIdText !== "" && hasChallengeFootprint;
  }
  const pendingDeadline = resolvePendingDeadlineSeconds(battle);
  const confirmDeadline = resolveConfirmDeadlineSeconds(battle);
  const inPendingWindow = typeof pendingDeadline === "number" ? now <= pendingDeadline : true;
  const inConfirmWindow = typeof confirmDeadline === "number" ? now <= confirmDeadline : true;

  const permissions: BattleActionPermissions = {
    isBanker,
    isChallenger,
    canJoin: battle.status === "open" && !isBanker,
    canBankerAddStake: isBanker && battle.status === "open",
    canDeclare: isBanker && battle.status === "pending" && !battle.result && inPendingWindow,
    canConfirm: isChallenger && battle.status === "pending" && Boolean(battle.result) && myAction === "" && inConfirmWindow,
    canDispute: isChallenger && battle.status === "pending" && Boolean(battle.result) && myAction === "" && inConfirmWindow,
    canWithdraw: battle.status === "settled" && Boolean(settlementItem) && settlementItem?.withdrawn === false,
  };

  return permissions;
}
