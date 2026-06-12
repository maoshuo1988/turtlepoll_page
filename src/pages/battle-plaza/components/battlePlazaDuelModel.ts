/** 文件说明：地下钱庄赌局卡片的数据映射、类型与展示常量。 */
import {
  getBattleActionPermissions,
  getBattleResultLabel,
  normalizeBattleResult,
  type Battle,
  type BattleDetailResponse,
  type BattleListItem,
  type BattleMyAction,
  type BattleResult,
} from '@/hooks/battleTypes';
import type { CommentResponse } from '@/hooks/useCommentRequests';
import { createUserAvatarUrl } from '@/utils/userAvatar';

export type PlazaTab = 'plaza' | 'private' | 'my-banker' | 'my-challenger';
export type DuelStatus = 'open' | 'sealed' | 'pending' | 'settled' | 'private' | 'disputing';
export type DuelCategory = 'wc' | 'hot' | 'ai' | 'ent' | 'finance' | 'tech';

export interface DuelComment {
  id: string;
  avatar: string;
  name: string;
  side: 'banker' | 'challenger';
  time: string;
  text: string;
  likes: number;
}

export interface DuelChallenger {
  id: string;
  avatar: string;
  name: string;
  amount: number;
  feeText: string;
  highlight?: string;
}

export interface DuelItem {
  id: string;
  battleId: number;
  topic: string;
  category: DuelCategory;
  banker: {
    name: string;
    avatar: string;
    avatarUrl?: string;
    stance: string;
    isMe?: boolean;
  };
  challengerSideText: string;
  status: DuelStatus;
  wager: number;
  currentPool: number;
  challengerCount: number;
  visibility: 'public' | 'private';
  comments: DuelComment[];
  commentCount: number;
  likes: number;
  settleText: string;
  settleCountdown?: string;
  timeAgoShort: string;
  resultText?: string;
  settledResult?: BattleResult;
  declaredResult?: BattleResult;
  disputeText?: string;
  inviteCode?: string;
  challengerList?: DuelChallenger[];
  footerActionLabel?: string;
  footerActionTone?: 'blue' | 'orange' | 'gold' | 'red';
  myChallengeInfo?: string;
  myChallengeState?: 'info' | 'confirm';
  myAction?: BattleMyAction;
  canJoin?: boolean;
  canBankerAddStake?: boolean;
  canDeclare?: boolean;
  canConfirm?: boolean;
  canDispute?: boolean;
  canWithdraw?: boolean;
  rawStatus?: Battle['status'];
  createdAt?: number;
  settleTime?: number;
}

export const DEFAULT_USER_AVATAR = '/image/default-header.png';

export const CATEGORY_META: Record<DuelCategory, { label: string; className: string }> = {
  wc: { label: '世界杯', className: 'bcat-wc' },
  hot: { label: '热点', className: 'bcat-hot' },
  ai: { label: 'AI', className: 'bcat-ai' },
  ent: { label: '娱乐', className: 'bcat-ent' },
  finance: { label: '财经', className: 'bcat-finance' },
  tech: { label: '科技', className: 'bcat-tech' },
};

export const STATUS_META: Record<DuelStatus, { label: string; className: string }> = {
  open: { label: '进行中', className: 'dbadge-open' },
  sealed: { label: '已封盘', className: 'dbadge-sealed' },
  pending: { label: '待宣布', className: 'dbadge-pending' },
  settled: { label: '已结算', className: 'dbadge-settled' },
  private: { label: '进行中', className: 'dbadge-open' },
  disputing: { label: '争议中', className: 'dbadge-disputing' },
};

export function formatCoins(value: number) {
  return value.toLocaleString('zh-CN');
}

export function formatCoinLabel(amount: number) {
  return `${formatCoins(amount)}龟币`;
}

export function formatTimestampLabel(timestamp?: number) {
  if (!timestamp) return '待定';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '待定';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatTimeAgoShort(timestamp?: number) {
  if (!timestamp) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return '1m';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function formatSettleCountdown(settleTime?: number) {
  if (!settleTime) return '';
  const diff = settleTime - Math.floor(Date.now() / 1000);
  if (diff <= 0) return '已到期';
  if (diff < 3600) return `${Math.ceil(diff / 60)}m 后失效`;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, '0')} 后失效`;
}

export function getDuelSettledResultTag(result: BattleResult) {
  switch (result) {
    case 'banker_wins':
      return {
        label: '庄家获胜',
        background: 'rgba(34,197,94,.12)',
        color: '#22c55e',
        border: '1px solid rgba(34,197,94,.24)',
      };
    case 'banker_loses':
      return {
        label: '挑战者获胜',
        background: 'rgba(239,68,68,.1)',
        color: '#f87171',
        border: '1px solid rgba(239,68,68,.22)',
      };
    case 'void':
      return {
        label: '本局作废',
        background: 'rgba(245,158,11,.1)',
        color: '#fbbf24',
        border: '1px solid rgba(245,158,11,.22)',
      };
    default:
      return null;
  }
}

function getDefaultBankerName(battle: Battle, currentUserId?: number | string | null) {
  return String(battle.bankerUserId) === String(currentUserId ?? '') ? '你' : `庄家 #${battle.bankerUserId}`;
}

function getDefaultBankerAvatar(battle: Battle, currentUserId?: number | string | null) {
  return String(battle.bankerUserId) === String(currentUserId ?? '') ? '🦊' : '🎲';
}

export function deriveCategory(topic: string): DuelCategory {
  if (topic.includes('世界杯')) return 'wc';
  if (topic.includes('AI') || topic.includes('Claude') || topic.includes('GPT')) return 'ai';
  if (topic.includes('比特币') || topic.includes('指数') || topic.includes('股')) return 'finance';
  if (topic.includes('专辑') || topic.includes('明星') || topic.includes('电影') || topic.includes('贺岁')) return 'ent';
  if (topic.includes('苹果') || topic.includes('机器人') || topic.includes('科技')) return 'tech';
  return 'hot';
}

function getCommentAuthorName(comment?: CommentResponse | null) {
  return comment?.user?.nickname || comment?.user?.username || `用户 ${comment?.user?.id ?? ''}`.trim() || '匿名用户';
}

function getCommentAvatarSeed(comment?: CommentResponse | null) {
  const name = getCommentAuthorName(comment).trim();
  return name.slice(0, 1).toUpperCase() || '评';
}

function formatCommentTime(timestamp?: number) {
  if (!timestamp) return '刚刚';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export function mapCommentToDuelComment(comment: CommentResponse): DuelComment {
  return {
    id: String(comment.id),
    avatar: getCommentAvatarSeed(comment),
    name: getCommentAuthorName(comment),
    side: 'challenger',
    time: formatCommentTime(comment.createTime),
    text: comment.content || '这条评论暂时没有正文。',
    likes: comment.likeCount ?? 0,
  };
}

export function mapBattleToDuel(
  item: BattleListItem,
  currentUserId?: number | string | null,
  detail?: BattleDetailResponse,
  comments: DuelComment[] = [],
  roleHint?: 'banker' | 'challenger',
): DuelItem {
  const battle = detail?.battle ? { ...item.battle, ...detail.battle } : item.battle;
  const myAction = detail?.myAction ?? item.myAction;
  const settlementItem = detail?.settlement?.myItem ?? null;
  const permissions = getBattleActionPermissions({
    battle,
    myAction,
    currentUserId,
    settlementItem,
    roleHint,
  });

  let status: DuelStatus;
  switch (battle.status) {
    case 'open':
      status = battle.isPublic ? 'open' : 'private';
      break;
    case 'sealed':
      status = 'sealed';
      break;
    case 'pending':
      status = 'pending';
      break;
    case 'disputed':
      status = 'disputing';
      break;
    case 'settled':
    default:
      status = 'settled';
      break;
  }

  const normalizedBattleResult = normalizeBattleResult(battle.result);
  const normalizedSettlementResult = normalizeBattleResult(detail?.settlement?.settlement?.result);
  const effectiveResult =
    battle.status === 'settled'
      ? normalizedSettlementResult ?? normalizedBattleResult
      : normalizedBattleResult;

  const resultText =
    battle.status === 'settled' && effectiveResult
      ? `结果已生效：${getBattleResultLabel(effectiveResult)}`
      : battle.status === 'pending' && effectiveResult
        ? `已宣判：${getBattleResultLabel(effectiveResult)}`
        : settlementItem?.payoutAmount
          ? `你可提取 ${formatCoinLabel(settlementItem.payoutAmount)}`
          : undefined;

  const myChallengeInfo =
    !permissions.isBanker
      ? battle.status === 'sealed'
        ? '本局已封盘，不再接受新的挑战者加入。'
        : battle.status === 'pending'
          ? battle.result
            ? myAction
              ? `你已提交${myAction === 'confirm' ? '确认' : '异议'}，等待系统处理。`
              : '庄家已宣判，当前等待你确认结果或发起异议。'
            : '结算时间已到，当前等待庄家在 24h 内宣布结果。'
          : battle.status === 'settled'
            ? settlementItem
              ? settlementItem.withdrawn
                ? `你的结算奖励已提取，到账 ${formatCoinLabel(settlementItem.payoutAmount)}。`
                : `你有 ${formatCoinLabel(settlementItem.payoutAmount)} 可提取。`
              : '本局已结算。'
            : battle.status === 'disputed'
              ? '你已参与本局，当前进入争议仲裁阶段。'
              : '你已参与本局，等待后续结算流程。'
      : undefined;

  const bankerAvatarUrl = createUserAvatarUrl(battle.bankerUserId, 88) || DEFAULT_USER_AVATAR;
  const timeAgoShort = formatTimeAgoShort(battle.createTime ?? battle.updateTime);
  const settleCountdown = !battle.isPublic ? formatSettleCountdown(battle.settleTime) : undefined;

  return {
    id: String(battle.id),
    battleId: battle.id,
    topic: battle.title,
    category: deriveCategory(battle.title),
    banker: {
      name: permissions.isBanker ? '你' : item.bankerNickname || getDefaultBankerName(battle, currentUserId),
      avatar: permissions.isBanker ? '🦊' : getDefaultBankerAvatar(battle, currentUserId),
      avatarUrl: bankerAvatarUrl,
      stance: battle.bankerSide,
      isMe: permissions.isBanker,
    },
    challengerSideText: battle.challengerSide,
    status,
    wager: battle.bankerStakeTotal,
    currentPool: battle.challengerStakeTotal,
    challengerCount: battle.challengerStakeTotal > 0 ? 1 : 0,
    visibility: battle.isPublic ? 'public' : 'private',
    comments,
    commentCount: Math.max(item.commentCount ?? 0, comments.length),
    likes: Math.max(0, item.likeCount ?? 0),
    settleText:
      battle.status === 'settled'
        ? `${formatTimestampLabel(battle.resultTime || detail?.settlement?.settlement?.createdAt)} 结算完毕`
        : battle.status === 'pending'
          ? battle.result
            ? `确认截止 ${formatTimestampLabel(battle.confirmDeadline)}`
            : `宣布截止 ${formatTimestampLabel(battle.pendingDeadline)}`
          : battle.status === 'disputed'
            ? `仲裁截止 ${formatTimestampLabel(battle.disputeDeadline)}`
            : battle.status === 'sealed'
              ? `已封盘 · 结算 ${formatTimestampLabel(battle.settleTime)}`
              : `结算 ${formatTimestampLabel(battle.settleTime)}`,
    settleCountdown,
    timeAgoShort,
    resultText,
    settledResult: battle.status === 'settled' ? effectiveResult : undefined,
    declaredResult: battle.status === 'pending' ? effectiveResult : undefined,
    disputeText:
      battle.status === 'disputed'
        ? '本局存在挑战者异议，当前等待管理员裁决。'
        : undefined,
    inviteCode: battle.isPublic ? undefined : battle.inviteCode,
    challengerList: battle.challengerStakeTotal > 0
      ? [
          {
            id: `${battle.id}-challenger`,
            avatar: permissions.isBanker ? '⚔️' : '🧿',
            name: battle.challengerStakeTotal >= battle.bankerStakeTotal ? '挑战方已满额' : '已有挑战者加入',
            amount: battle.challengerStakeTotal,
            feeText: battle.isPublic ? '公开场累计挑战额' : '私密场累计挑战额',
          },
        ]
      : [],
    footerActionLabel: permissions.canJoin ? '挑战庄家' : undefined,
    footerActionTone: permissions.canJoin ? 'blue' : permissions.canBankerAddStake ? 'orange' : undefined,
    myChallengeInfo,
    myChallengeState: permissions.canConfirm || permissions.canDispute ? 'confirm' : myChallengeInfo ? 'info' : undefined,
    myAction,
    canJoin: permissions.canJoin,
    canBankerAddStake: permissions.canBankerAddStake,
    canDeclare: permissions.canDeclare,
    canConfirm: permissions.canConfirm,
    canDispute: permissions.canDispute,
    canWithdraw: permissions.canWithdraw,
    rawStatus: battle.status,
    createdAt: battle.createTime,
    settleTime: battle.settleTime,
  };
}
