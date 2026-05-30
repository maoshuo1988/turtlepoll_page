/**
 * 文件说明：Battle Plaza Experience，地下钱庄/战斗广场核心业务实现。
 */
import styles from './index.module.scss';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from 'react-query';
import { battleQueryKeys, fetchBattleDetail, useRequestBattleBankerAddStake, useRequestBattleChallengerConfirm, useRequestBattleChallengerDispute, useRequestBattleCreate, useRequestBattleDeclare, useRequestBattleDetail, useRequestBattleJoin, useRequestBattleList, useRequestBattleStats, useRequestBattleWithdraw } from '@/hooks/useBattleRequests';
import {
  createBattleRequestId,
  getBattleActionPermissions,
  getBattleErrorMessage,
  getBattleResultLabel,
  normalizeBattleResult,
  type Battle,
  type BattleDetailResponse,
  type BattleListItem,
  type BattleMyAction,
  type BattleResult,
} from '@/hooks/battleTypes';
import { useAppSession } from '@/hooks/useAppSession';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import { fetchCommentComments, type CommentResponse, useRequestCreateComment } from '@/hooks/useCommentRequests';
import { useRequestLikeEntity, useRequestUnlikeEntity } from '@/hooks/useTopicRequests';
import { TextEmptyState } from '@/components/common/state/PageState';
import { useRequireAuth } from '@/hooks/useRequireAuth';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function kf(name: string) {
  return styles[name] ?? name;
}

type PlazaTab = 'plaza' | 'my-banker' | 'my-challenger';
type PlazaSort =
  | '最新'
  | '进行中'
  | '待结果'
  | '已结算';
type DuelStatus = 'open' | 'sealed' | 'pending' | 'settled' | 'private' | 'disputing';
type DuelCategory = 'wc' | 'hot' | 'ai' | 'ent' | 'finance' | 'tech';

interface DuelComment {
  id: string;
  avatar: string;
  name: string;
  side: 'banker' | 'challenger';
  time: string;
  text: string;
  likes: number;
}

interface DuelChallenger {
  id: string;
  avatar: string;
  name: string;
  amount: number;
  feeText: string;
  highlight?: string;
}

interface DuelItem {
  id: string;
  battleId: number;
  topic: string;
  category: DuelCategory;
  banker: {
    name: string;
    avatar: string;
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
}

type JoinModalState = {
  duelId: number;
  title: string;
  max: number;
  visibility: 'public' | 'private';
};

function getDuelSettledResultTag(result: BattleResult) {
  switch (result) {
    case 'banker_wins':
      return {
        label: '🏆 庄家获胜',
        background: 'rgba(0,214,143,.1)',
        color: 'var(--green)',
        border: '1px solid rgba(0,214,143,.2)',
      };
    case 'banker_loses':
      return {
        label: '😞 挑战者获胜',
        background: 'rgba(255,60,60,.1)',
        color: 'var(--red)',
        border: '1px solid rgba(255,60,60,.2)',
      };
    case 'void':
      return {
        label: '⚖️ 本局作废',
        background: 'rgba(245,158,11,.1)',
        color: 'var(--amber)',
        border: '1px solid rgba(245,158,11,.2)',
      };
    default:
      return null;
  }
}

type AddStakeModalState = {
  duelId: number;
  title: string;
};

const PLAZA_SORTS: PlazaSort[] = [
  '最新',
  '进行中',
  '待结果',
  '已结算',
];

const WAGER_OPTIONS = [100, 500, 1000, 2000, 5000, 10000];

const CATEGORY_META: Record<DuelCategory, { label: string; className: string }> = {
  wc: { label: '⚽ 世界杯', className: 'bcat-wc' },
  hot: { label: '🔥 热点', className: 'bcat-hot' },
  ai: { label: '🤖 AI', className: 'bcat-ai' },
  ent: { label: '🎬 娱乐', className: 'bcat-ent' },
  finance: { label: '📈 财经', className: 'bcat-finance' },
  tech: { label: '💻 科技', className: 'bcat-tech' },
};

const STATUS_META: Record<DuelStatus, { label: string; className: string }> = {
  open: { label: '🟢 进行中', className: 'dbadge-open' },
  sealed: { label: '🔒 已封盘', className: 'dbadge-sealed' },
  pending: { label: '⏳ 待宣布', className: 'dbadge-pending' },
  settled: { label: '✅ 已结算', className: 'dbadge-settled' },
  private: { label: '🔒 私人', className: 'dbadge-private' },
  disputing: { label: '⚠️ 争议中', className: 'dbadge-disputing' },
};


function formatCoins(value: number) {
  return value.toLocaleString('zh-CN');
}

function clampAmount(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

// battle 后端给的是秒级时间戳，这里统一转成页面里的短时间文案。
function formatTimestampLabel(timestamp?: number) {
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

function getDefaultBankerName(battle: Battle, currentUserId?: number | string | null) {
  return String(battle.bankerUserId) === String(currentUserId ?? '') ? '你' : `庄家 #${battle.bankerUserId}`;
}

function getDefaultBankerAvatar(battle: Battle, currentUserId?: number | string | null) {
  return String(battle.bankerUserId) === String(currentUserId ?? '') ? '🦊' : '🎲';
}

function deriveCategory(topic: string): DuelCategory {
  if (topic.includes('世界杯')) return 'wc';
  if (topic.includes('AI') || topic.includes('Claude') || topic.includes('GPT')) return 'ai';
  if (topic.includes('比特币') || topic.includes('指数') || topic.includes('股')) return 'finance';
  if (topic.includes('专辑') || topic.includes('明星') || topic.includes('电影')) return 'ent';
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

function mapCommentToDuelComment(comment: CommentResponse): DuelComment {
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

// 真实 battle 接口字段和旧页面的 DuelCard 展示结构并不一致。
// 这里集中做一次映射，后面页面 UI 只消费 DuelItem。
function mapBattleToDuel(
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

  // 页面视觉状态和后端状态不是 1:1 命名，这里做一层展示态转换。
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
          ? `你可提取 ${formatCoins(settlementItem.payoutAmount)}🪙`
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
                ? `你的结算奖励已提取，到账 ${formatCoins(settlementItem.payoutAmount)}🪙。`
                : `你有 ${formatCoins(settlementItem.payoutAmount)}🪙 可提取。`
              : '本局已结算。'
            : battle.status === 'disputed'
              ? '你已参与本局，当前进入争议仲裁阶段。'
              : '你已参与本局，等待后续结算流程。'
      : undefined;

  return {
    id: String(battle.id),
    battleId: battle.id,
    topic: battle.title,
    category: deriveCategory(battle.title),
    banker: {
      name: permissions.isBanker ? '你' : item.bankerNickname || getDefaultBankerName(battle, currentUserId),
      avatar: permissions.isBanker ? '🦊' : getDefaultBankerAvatar(battle, currentUserId),
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
        ? `✅ ${formatTimestampLabel(battle.resultTime || detail?.settlement?.settlement?.createdAt)} 结算完毕`
        : battle.status === 'pending'
          ? battle.result
            ? `⏱ 确认截止 ${formatTimestampLabel(battle.confirmDeadline)}`
            : `⏱ 宣布截止 ${formatTimestampLabel(battle.pendingDeadline)}`
          : battle.status === 'disputed'
            ? `⚠️ 仲裁截止 ${formatTimestampLabel(battle.disputeDeadline)}`
          : battle.status === 'sealed'
              ? `🔒 已封盘 · 结算时间 ${formatTimestampLabel(battle.settleTime)}`
              : `⏱ 结算时间 ${formatTimestampLabel(battle.settleTime)}`,
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
  };
}

function RuleCard({ title, text, accent }: { title: string; text: React.ReactNode; accent?: string }) {
  return (
    <div className={css("pr-item")} style={accent ? { borderColor: accent } : undefined}>
      <div className={css("pr-item-title")} style={accent ? { color: accent.includes('0,214,143') ? 'var(--green)' : undefined } : undefined}>
        {title}
      </div>
      <div className={css("pr-item-text")}>{text}</div>
    </div>
  );
}

function DuelCard({
  duel,
  commentsOpen,
  liked,
  onToggleComments,
  onToggleLike,
  onJoin,
  onCopyInvite,
  onAddStake,
  onViewDetail,
  onDeclare,
  onConfirm,
  onDispute,
  onWithdraw,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  commentSubmitting,
}: {
  duel: DuelItem;
  commentsOpen: boolean;
  liked: boolean;
  onToggleComments: () => void;
  onToggleLike: () => void;
  onJoin: () => void;
  onCopyInvite: (code: string) => void;
  onAddStake: () => void;
  onViewDetail: () => void;
  onDeclare: (result: 'banker_wins' | 'banker_loses') => void;
  onConfirm: () => void;
  onDispute: () => void;
  onWithdraw: () => void;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  commentSubmitting: boolean;
}) {
  // 庄家押注额就是挑战池上限，所以容量条直接按 challengerStakeTotal / bankerStakeTotal 算。
  const capacityPct = duel.wager > 0 ? Math.min(100, Math.round((duel.currentPool / duel.wager) * 100)) : 0;
  const category = CATEGORY_META[duel.category];
  const status = STATUS_META[duel.status];

  return (
    <div className={css("duel-card")} style={duel.status === 'settled' ? { opacity: 0.78 } : undefined}>
      <div className={css("duel-status-bar")}>
        <div className={css(`duel-cat ${category.className}`)}>{category.label}</div>
        <div className={css("duel-title")}>{duel.topic}</div>
        {duel.visibility === 'private' && <div className={css("duel-badge dbadge-private")}>🔒 私人</div>}
        <div className={css(`duel-badge ${status.className}`)}>{status.label}</div>
      </div>

      <div className={css("duel-banker-area")}>
        <div className={css("duel-banker-row")}>
          <div
            className={css("duel-banker-ava")}
            style={
              duel.visibility === 'private'
                ? { borderColor: 'rgba(199,125,255,.3)', background: 'rgba(199,125,255,.08)' }
                : undefined
            }
          >
            {duel.banker.avatar}
          </div>
          <div className={css("duel-banker-info")}>
            <div className={css("duel-banker-name")}>
              {duel.banker.name}
              <span
                className={css("duel-banker-tag")}
                style={
                  duel.visibility === 'private'
                    ? {
                        background: 'rgba(199,125,255,.12)',
                        color: 'var(--purple)',
                        borderColor: 'rgba(199,125,255,.2)',
                      }
                    : undefined
                }
              >
                庄家{duel.visibility === 'private' ? ' · 私人' : ''}
              </span>
              {(duel.settledResult ?? duel.declaredResult) && (() => {
                const resultTag = getDuelSettledResultTag(duel.settledResult ?? duel.declaredResult!);
                if (!resultTag) return null;
                return (
                  <span
                    className={css('duel-result-tag')}
                    style={{
                      background: resultTag.background,
                      color: resultTag.color,
                      border: resultTag.border,
                    }}
                  >
                    {resultTag.label}
                  </span>
                );
              })()}
            </div>
            <div className={css("duel-banker-meta")}>{duel.resultText ?? `${duel.visibility === 'private' ? '私人' : '公开'}赌局 · ${status.label.replace(/[^\u4e00-\u9fa5]/g, '')}`}</div>
          </div>
          <div className={css("duel-banker-stake")}>
            {formatCoins(duel.wager)}🪙<small>庄家押注</small>
          </div>
        </div>

        <div
          className={css("duel-opinion-box")}
          style={duel.visibility === 'private' ? { borderColor: 'rgba(199,125,255,.15)' } : undefined}
        >
          <div
            className={css("duel-opinion-label")}
            style={duel.visibility === 'private' ? { color: 'var(--purple)' } : undefined}
          >
            🔴 庄家立场
          </div>
          <div className={css("duel-opinion-text")}>{duel.banker.stance}</div>
        </div>

        {duel.challengerSideText ? (
          <>
            <div className={css("duel-vs-label")}>—— VS ——</div>
            <div className={css("duel-challenger-opinion")}>
              <div className={css("duel-challenger-label")}>🔵 挑战者立场（加入即站此方）</div>
              <div className={css("duel-opinion-text")}>{duel.challengerSideText}</div>
            </div>
          </>
        ) : null}

        {duel.inviteCode ? (
          <div style={{ textAlign: 'center' }}>
            <span className={css("duel-invite-code")} onClick={() => onCopyInvite(duel.inviteCode ?? '')}>
              邀请码: {duel.inviteCode} 📋
            </span>
          </div>
        ) : null}

        {duel.disputeText ? (
          <div className={css("duel-callout")} style={{ marginTop: 10, border: '1px solid rgba(255,60,60,.15)', background: 'rgba(255,60,60,.06)' }}>
            <div className={css("pr-warn-title")} style={{ marginBottom: 4 }}>⚠️ 异议详情</div>
            <div className={css("pr-item-text")}>{duel.disputeText}</div>
          </div>
        ) : null}

        {duel.myChallengeInfo ? (
          <div className={css(`duel-my-challenge-box ${duel.myChallengeState === 'confirm' ? 'confirm' : ''}`)}>
            <div>
              <div className={css("duel-my-challenge-label")}>你的挑战信息</div>
              <div className={css("duel-my-challenge-text")}>{duel.myChallengeInfo}</div>
            </div>
            {duel.myChallengeState === 'confirm' && (duel.canConfirm || duel.canDispute) ? (
              <div className={css("duel-my-challenge-actions")}>
                {duel.canConfirm ? <div className={css("duel-mini-btn")} onClick={onConfirm}>✅ 同意</div> : null}
                {duel.canDispute ? <div className={css("duel-dispute-btn")} onClick={onDispute}>⚠️ 提出异议</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {duel.status !== 'settled' && duel.status !== 'disputing' && (
        <div className={css("duel-capacity")}>
          <div className={css("duel-cap-header")}>
            <div className={css("duel-cap-label")}>挑战者容量</div>
            <div className={css("duel-cap-nums")}>
              {formatCoins(duel.currentPool)} / {formatCoins(duel.wager)} 🪙
              {capacityPct >= 100 ? ' (满额)' : ''}
            </div>
          </div>
          {/* 进度条先隐藏，保留文案 */}
          {/* <div className={css("duel-cap-bar")}>
            <div className={css(`duel-cap-fill ${capacityPct >= 100 ? 'full' : ''}`)} style={{ width: `${capacityPct}%` }} />
          </div> */}
          <div className={css("duel-cap-detail")}>
            <span>已加入 {duel.challengerCount} 人</span>
            <span>
              {duel.visibility === 'private'
                ? `剩余容量 ${formatCoins(Math.max(0, duel.wager - duel.currentPool))}🪙 · 无入场费`
                : capacityPct >= 100
                  ? '已满额封盘'
                  : `剩余容量 ${formatCoins(Math.max(0, duel.wager - duel.currentPool))}🪙`}
            </span>
          </div>
        </div>
      )}

      {duel.challengerList && duel.challengerList.length > 0 && duel.status !== 'settled' && (
        <div className={css("duel-challengers")}>
          <div className={css("duel-ch-title")}>挑战者 ({duel.challengerList.length}人)</div>
          <div className={css("duel-ch-list")}>
            {duel.challengerList.map((challenger) => (
              <div key={challenger.id} className={css("duel-ch-row")}>
                <div className={css("duel-ch-ava")}>{challenger.avatar}</div>
                <div className={css("duel-ch-name")}>
                  {challenger.name}
                  {challenger.highlight ? <span className={css("duel-highlight")}>{challenger.highlight}</span> : null}
                </div>
                <div className={css("duel-ch-amt")}>{formatCoins(challenger.amount)}🪙</div>
                <div className={css("duel-ch-fee")}>{challenger.feeText}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={css("duel-foot")}>
        <div className={css("duel-foot-btn")} onClick={onToggleComments}>💬 <span>{duel.commentCount}</span></div>
        <div
          className={css("duel-foot-btn")}
          onClick={onToggleLike}
          style={liked ? { color: 'var(--red)' } : undefined}
        >
          {liked ? '❤️' : '🤍'} <span>{duel.likes + (liked ? 1 : 0)}</span>
        </div>
        <div className={css("duel-foot-btn")} onClick={onViewDetail}>📄 <span>详情</span></div>
        {duel.canWithdraw ? (
          <button className={css("duel-foot-join gold")} onClick={onWithdraw}>
            💰 提取奖励
          </button>
        ) : null}
        {duel.canJoin ? (
          <button
            className={css(`duel-foot-join ${duel.footerActionTone ?? ''}`)}
            onClick={onJoin}
          >
            {duel.footerActionLabel ?? '⚔️ 挑战庄家'}
          </button>
        ) : null}
        {duel.canBankerAddStake ? (
          <button className={css("duel-foot-join orange")} onClick={onAddStake}>
            ➕ 庄家加注
          </button>
        ) : null}
        {duel.canDeclare ? (
          <>
            <button
              className={css("duel-foot-join")}
              onClick={() => onDeclare('banker_wins')}
              style={{ background: 'rgba(255,123,44,.12)', color: 'var(--orange)', borderColor: 'rgba(255,123,44,.3)' }}
            >
              📢 宣布庄家赢
            </button>
            <button
              className={css("duel-foot-join")}
              onClick={() => onDeclare('banker_loses')}
              style={{ background: 'rgba(255,60,60,.12)', color: 'var(--red)', borderColor: 'rgba(255,60,60,.3)' }}
            >
              📢 宣布庄家输
            </button>
          </>
        ) : null}
        <div className={css("duel-foot-time")} style={duel.status === 'pending' || duel.status === 'disputing' ? { color: duel.status === 'pending' ? 'var(--orange)' : 'var(--red)' } : undefined}>
          {duel.settleText}
        </div>
      </div>

      {commentsOpen && (
        <div className={css("duel-cmt-thread")}>
          <div className={css("bct-inner")}>
            {duel.comments.length > 0 ? (
              duel.comments.map((comment) => (
                <div key={comment.id} className={css("bcmt")}>
                  <div className={css("bcmt-ava")}>{comment.avatar}</div>
                  <div className={css("bcmt-body")}>
                    <div className={css("bcmt-head")}>
                      <div className={css("bcmt-name")}>{comment.name}</div>
                      <div
                        className={css(`bcmt-side ${comment.side === 'banker' ? 'bside-r' : 'bside-b lg:hidden'}`)}
                      >
                        {comment.side === 'banker' ? '庄家' : '挑战者'}
                      </div>
                      <div className={css("bcmt-time")}>{comment.time}</div>
                    </div>
                    <div className={css("bcmt-text")}>{comment.text}</div>
                    <div className={css("bcmt-acts")}><span className={css("bca")}>❤️ {comment.likes}</span></div>
                  </div>
                </div>
              ))
            ) : null}
            <div className={css("badd-cmt")}>
              <div className={css("badd-cmt-ava")}>🦊</div>
              <input
                className={css("badd-cmt-inp")}
                placeholder="加入讨论…"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
              />
              <button
                className={css("badd-cmt-send")}
                type="button"
                onClick={onSubmitComment}
                disabled={commentSubmitting}
                style={commentSubmitting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const BattlePlazaPage: React.FC = () => {
  const { user, coin } = useAppSession();
  const authToken = getAuthToken();
  const storedUser = getStoredUserInfo() as { id?: number | string };
  const currentUserId = user?.id ?? storedUser?.id ?? null;
  const userBalance = coin?.balance ?? 0;
  // 登录提示按 token 判断，避免“已登录但 userInfo 还在加载”时误闪未登录提示。
  const isAuthenticated = Boolean(authToken);
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();
  const plazaQuery = useRequestBattleList({ page: 1, pageSize: 50 }, { enabled: isAuthenticated });
  const battleStatsQuery = useRequestBattleStats({ enabled: isAuthenticated });
  const myBankerQuery = useRequestBattleList({ page: 1, pageSize: 50, role: 'banker' }, { enabled: isAuthenticated });
  const myChallengerQuery = useRequestBattleList({ page: 1, pageSize: 50, role: 'challenger' }, { enabled: isAuthenticated });
  const createBattleMutation = useRequestBattleCreate();
  const joinBattleMutation = useRequestBattleJoin();
  const addStakeMutation = useRequestBattleBankerAddStake();
  const declareBattleMutation = useRequestBattleDeclare();
  const confirmBattleMutation = useRequestBattleChallengerConfirm();
  const disputeBattleMutation = useRequestBattleChallengerDispute();
  const withdrawBattleMutation = useRequestBattleWithdraw();
  const createCommentMutation = useRequestCreateComment();
  const likeBattleMutation = useRequestLikeEntity();
  const unlikeBattleMutation = useRequestUnlikeEntity();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PlazaTab>('plaza');
  const [activeSort, setActiveSort] = useState<PlazaSort>('最新');
  const [topic, setTopic] = useState('');
  const [bankerOpinion, setBankerOpinion] = useState('');
  const [challengerOpinion, setChallengerOpinion] = useState('');
  const [wager, setWager] = useState(1000);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [settleTime, setSettleTime] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [joinAmount, setJoinAmount] = useState(500);
  const [joinModal, setJoinModal] = useState<JoinModalState | null>(null);
  const [addStakeAmount, setAddStakeAmount] = useState(500);
  const [addStakeModal, setAddStakeModal] = useState<AddStakeModalState | null>(null);
  const [detailBattleId, setDetailBattleId] = useState<number | null>(null);
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentDraftMap, setCommentDraftMap] = useState<Record<string, string>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const lastPopupMessageRef = useRef<string>('');
  const detailBattleQuery = useRequestBattleDetail(detailBattleId ?? undefined, { enabled: detailBattleId !== null });

  const myRoleBattleItems = useMemo(() => {
    const map = new Map<number, BattleListItem>();
    [...(myBankerQuery.data?.list ?? []), ...(myChallengerQuery.data?.list ?? [])].forEach((item) => {
      map.set(item.battle.id, item);
    });
    return Array.from(map.values());
  }, [myBankerQuery.data?.list, myChallengerQuery.data?.list]);
  const myBankerBattleIds = useMemo(
    () => new Set((myBankerQuery.data?.list ?? []).map((item) => item.battle.id)),
    [myBankerQuery.data?.list],
  );
  const myChallengerBattleIds = useMemo(
    () => new Set((myChallengerQuery.data?.list ?? []).map((item) => item.battle.id)),
    [myChallengerQuery.data?.list],
  );

  // 列表接口不带 settlement，只有“我的庄局 / 我的挑战”页才补详情查询。
  // 这样可以保住首页请求量，同时又能在我的页面正确计算 withdraw / confirm / dispute 按钮态。
  const myDetailQueries = useQueries(
    myRoleBattleItems.map((item) => ({
      queryKey: battleQueryKeys.detail(item.battle.id),
      queryFn: async () => fetchBattleDetail(item.battle.id),
      enabled: activeTab !== 'plaza' && isAuthenticated,
    })),
  ) as Array<{ data?: BattleDetailResponse }>;

  const allBattleItems = useMemo(() => {
    const map = new Map<number, BattleListItem>();
    [...(plazaQuery.data?.list ?? []), ...myRoleBattleItems].forEach((item) => {
      map.set(item.battle.id, item);
    });
    return Array.from(map.values());
  }, [myRoleBattleItems, plazaQuery.data?.list]);

  const commentQueries = useQueries(
    allBattleItems.map((item) => {
      const isOpen = Boolean(commentOpen[String(item.battle.id)]);

      return {
        queryKey: ['requestCommentComments', { entityType: 'battle', entityId: item.battle.id }],
        queryFn: () => fetchCommentComments({
          entityType: 'battle',
          entityId: item.battle.id,
        }),
        enabled: isAuthenticated && isOpen,
      };
    }),
  ) as Array<{ data?: { results?: CommentResponse[] } }>;

  const commentMap = useMemo(() => {
    const map = new Map<number, DuelComment[]>();
    allBattleItems.forEach((item, index) => {
      const results = commentQueries[index]?.data?.results ?? [];
      map.set(item.battle.id, results.map(mapCommentToDuelComment));
    });
    return map;
  }, [allBattleItems, commentQueries]);

  const detailMap = useMemo(() => {
    const map = new Map<number, BattleDetailResponse>();
    myRoleBattleItems.forEach((item, index) => {
      const detail = myDetailQueries[index]?.data;
      if (detail) map.set(item.battle.id, detail);
    });
    return map;
  }, [myDetailQueries, myRoleBattleItems]);

  // 广场与“我的”两个 tab 共享同一套 DuelItem 映射，保证 PC/手机端展示逻辑一致。
  // 广场 Tab 下详情查询是禁用的，但若用户曾进过「我的」页，缓存里的 detail 仍会参与合并并盖住列表字段，
  // 导致点击刷新后列表已更新、卡片仍显示旧盘口/状态；广场展示一律以列表接口为准。
  const plazaDuels = useMemo(
    () =>
      (plazaQuery.data?.list ?? []).map((item) =>
        mapBattleToDuel(
          item,
          currentUserId,
          undefined,
          commentMap.get(item.battle.id) ?? [],
          myBankerBattleIds.has(item.battle.id) ? 'banker' : myChallengerBattleIds.has(item.battle.id) ? 'challenger' : undefined,
        ),
      ),
    [plazaQuery.data?.list, currentUserId, commentMap, myBankerBattleIds, myChallengerBattleIds],
  );
  const myBankerDuels = useMemo(
    () => (myBankerQuery.data?.list ?? []).map((item) => mapBattleToDuel(item, currentUserId, detailMap.get(item.battle.id), commentMap.get(item.battle.id) ?? [], 'banker')),
    [myBankerQuery.data?.list, currentUserId, detailMap, commentMap],
  );
  const myChallengerDuels = useMemo(
    () => (myChallengerQuery.data?.list ?? []).map((item) => mapBattleToDuel(item, currentUserId, detailMap.get(item.battle.id), commentMap.get(item.battle.id) ?? [], 'challenger')),
    [myChallengerQuery.data?.list, currentUserId, detailMap, commentMap],
  );

  const sortedPlazaDuels = useMemo(() => {
    const list = [...plazaDuels];
    switch (activeSort) {
      case '最新':
        return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      case '进行中':
        return list.filter((duel) => duel.rawStatus === 'open');
      case '待结果':
        return list.filter((duel) => duel.rawStatus === 'pending');
      case '已结算':
        return list.filter((duel) => duel.rawStatus === 'settled');
      default:
        return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  }, [activeSort, plazaDuels]);

  const fallbackUnsettledItems = useMemo(
    () => (plazaQuery.data?.list ?? []).filter((item) => item.battle.status !== 'settled'),
    [plazaQuery.data?.list],
  );
  const fallbackPoolTotal = useMemo(
    () => fallbackUnsettledItems.reduce((sum, item) => sum + item.battle.poolPrincipalTotal, 0),
    [fallbackUnsettledItems],
  );
  const fallbackPendingCount = useMemo(
    () => (plazaQuery.data?.list ?? []).filter((item) => item.battle.status === 'pending').length,
    [plazaQuery.data?.list],
  );
  const fallbackUnsettledCount = fallbackUnsettledItems.length;
  const fallbackBankerCount = useMemo(
    () => new Set(fallbackUnsettledItems.map((item) => item.battle.bankerUserId)).size,
    [fallbackUnsettledItems],
  );
  const totalFrozen = battleStatsQuery.data?.poolTotal ?? fallbackPoolTotal;
  const totalPendingCount = battleStatsQuery.data?.pendingCount ?? fallbackPendingCount;
  const totalBattleCount = battleStatsQuery.data?.unsettledCount ?? fallbackUnsettledCount;
  const totalBankerCount = battleStatsQuery.data?.bankerCount ?? fallbackBankerCount;

  const battleListRefreshing =
    plazaQuery.isFetching || battleStatsQuery.isFetching || myBankerQuery.isFetching || myChallengerQuery.isFetching;

  const refetchBattleLists = () => {
    void (async () => {
      await Promise.all([
        queryClient.invalidateQueries(battleQueryKeys.lists()),
        queryClient.invalidateQueries(battleQueryKeys.details()),
        queryClient.invalidateQueries(battleQueryKeys.stats()),
      ]);
    })();
  };

  const joinModalMax = joinModal ? Math.max(100, Math.min(joinModal.max, userBalance)) : 100;
  const normalizedJoinAmount = joinModal ? clampAmount(joinAmount, 100, joinModalMax) : 100;
  const normalizedAddStakeAmount = clampAmount(addStakeAmount, 100, Math.max(100, userBalance));
  const canSubmitCreate =
    isAuthenticated &&
    !createBattleMutation.isLoading &&
    topic.trim().length > 0 &&
    bankerOpinion.trim().length > 0 &&
    challengerOpinion.trim().length > 0 &&
    Number.isFinite(wager) &&
    wager >= 100 &&
    wager <= userBalance &&
    Boolean(settleTime) &&
    (visibility === 'public' || inviteInput.trim().length > 0);
  const canSubmitJoin =
    isAuthenticated &&
    !joinBattleMutation.isLoading &&
    Boolean(joinModal) &&
    normalizedJoinAmount >= 100 &&
    normalizedJoinAmount <= joinModalMax &&
    normalizedJoinAmount <= userBalance &&
    (joinModal?.visibility !== 'private' || inviteInput.trim().length > 0);
  const canSubmitAddStake =
    isAuthenticated &&
    !addStakeMutation.isLoading &&
    Boolean(addStakeModal) &&
    normalizedAddStakeAmount >= 100 &&
    normalizedAddStakeAmount <= userBalance;

  const pushFeedback = (tone: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ tone, text });
    if (tone === 'error' && typeof window !== 'undefined' && lastPopupMessageRef.current !== text) {
      lastPopupMessageRef.current = text;
      window.alert(text);
      window.setTimeout(() => {
        if (lastPopupMessageRef.current === text) {
          lastPopupMessageRef.current = '';
        }
      }, 0);
    }
  };

  const setMappedError = (error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    pushFeedback('error', getBattleErrorMessage(message));
  };

  useEffect(() => {
    if (!plazaQuery.isError || !isAuthenticated) return;
    setMappedError(plazaQuery.error);
  }, [isAuthenticated, plazaQuery.error, plazaQuery.isError]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'my-banker' || !myBankerQuery.isError) return;
    setMappedError(myBankerQuery.error);
  }, [activeTab, isAuthenticated, myBankerQuery.error, myBankerQuery.isError]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'my-challenger' || !myChallengerQuery.isError) return;
    setMappedError(myChallengerQuery.error);
  }, [activeTab, isAuthenticated, myChallengerQuery.error, myChallengerQuery.isError]);

  // 创建前先在页面层挡一轮基础校验，避免无意义请求直接打后端。
  const handleOpenCompose = () => {
    if (!requireAuth()) return;
    setComposeOpen(true);
  };

  const handleTabChange = (tab: PlazaTab) => {
    if (tab !== 'plaza' && !requireAuth()) return;
    setActiveTab(tab);
  };

  const handleCreate = async () => {
    if (!requireAuth()) return;
    if (!topic.trim() || !bankerOpinion.trim() || !challengerOpinion.trim()) {
      pushFeedback('error', '请先完整填写议题和双方立场。');
      return;
    }
    if (!settleTime) {
      pushFeedback('error', '请选择结算时间。');
      return;
    }

    const settleTimestamp = Math.floor(new Date(settleTime).getTime() / 1000);
    if (!Number.isFinite(settleTimestamp) || settleTimestamp <= 0) {
      pushFeedback('error', '结算时间格式不正确。');
      return;
    }
    if (wager < 100) {
      pushFeedback('error', '开战金额不能低于 100。');
      return;
    }
    if (wager > userBalance) {
      pushFeedback('error', '当前余额不足，无法创建该赌局。');
      return;
    }
    if (visibility === 'private' && inviteInput.trim().length === 0) {
      pushFeedback('error', '私密场必须填写邀请码。');
      return;
    }
    if (settleTimestamp <= Math.floor(Date.now() / 1000)) {
      pushFeedback('error', '结算时间必须晚于当前时间。');
      return;
    }

    try {
      await createBattleMutation.mutateAsync({
        title: topic.trim(),
        bankerSide: bankerOpinion.trim(),
        challengerSide: challengerOpinion.trim(),
        stakeAmount: wager,
        isPublic: visibility === 'public',
        inviteCode: visibility === 'private' ? inviteInput.trim() : '',
        settleTime: settleTimestamp,
        requestId: createBattleRequestId('battle-create'),
      });
      setTopic('');
      setBankerOpinion('');
      setChallengerOpinion('');
      setSettleTime('');
      setVisibility('public');
      setComposeOpen(false);
      pushFeedback('success', '赌局已创建，广场列表已刷新。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleJoinBattle = async () => {
    if (!joinModal) return;
    if (!requireAuth()) return;
    if (joinModal.visibility === 'private' && inviteInput.trim().length === 0) {
      pushFeedback('error', '私密赌局需要先填写邀请码。');
      return;
    }
    if (normalizedJoinAmount > userBalance) {
      pushFeedback('error', '余额不足，无法完成挑战。');
      return;
    }
    if (normalizedJoinAmount > joinModal.max) {
      pushFeedback('error', `挑战金额超过剩余额度，当前最多 ${formatCoins(joinModal.max)}🪙。`);
      return;
    }
    try {
      await joinBattleMutation.mutateAsync({
        battleId: joinModal.duelId,
        amount: normalizedJoinAmount,
        requestId: createBattleRequestId(`battle-join-${joinModal.duelId}`),
        inviteCode: joinModal.visibility === 'private' ? inviteInput.trim() : '',
      });
      setJoinModal(null);
      pushFeedback('success', '已成功加入赌局。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleBankerAddStake = async () => {
    if (!addStakeModal) return;
    if (!requireAuth()) return;
    if (normalizedAddStakeAmount > userBalance) {
      pushFeedback('error', '余额不足，无法追加押注。');
      return;
    }
    try {
      await addStakeMutation.mutateAsync({
        battleId: addStakeModal.duelId,
        amount: normalizedAddStakeAmount,
        requestId: createBattleRequestId(`battle-banker-add-${addStakeModal.duelId}`),
      });
      setAddStakeModal(null);
      pushFeedback('success', '庄家追加押注成功。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleDeclareResult = async (duel: DuelItem, result: 'banker_wins' | 'banker_loses') => {
    if (!requireAuth()) return;
    try {
      const battle = await declareBattleMutation.mutateAsync({ battleId: duel.battleId, result });
      const declared = normalizeBattleResult(battle.result);
      const declaredLabel = declared ? getBattleResultLabel(declared) : '未知';
      const expectedLabel = getBattleResultLabel(result);
      pushFeedback(
        'success',
        declared === result
          ? `宣判已提交：${declaredLabel}`
          : `宣判已提交，但服务端记录为「${declaredLabel}」（你提交的是「${expectedLabel}」）`,
      );
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleChallengeConfirm = async (duel: DuelItem) => {
    if (!requireAuth()) return;
    try {
      await confirmBattleMutation.mutateAsync({
        battleId: duel.battleId,
        requestId: createBattleRequestId(`battle-confirm-${duel.battleId}`),
        remark: '前端确认结果',
      });
      pushFeedback('success', '你已确认本局结果。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleChallengeDispute = async (duel: DuelItem) => {
    if (!requireAuth()) return;
    try {
      await disputeBattleMutation.mutateAsync({
        battleId: duel.battleId,
        requestId: createBattleRequestId(`battle-dispute-${duel.battleId}`),
        remark: '前端发起异议',
      });
      pushFeedback('success', '异议已提交，等待管理员仲裁。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleWithdraw = async (duel: DuelItem) => {
    if (!requireAuth()) return;
    try {
      await withdrawBattleMutation.mutateAsync({
        battleId: duel.battleId,
        requestId: createBattleRequestId(`battle-withdraw-${duel.battleId}`),
      });
      pushFeedback('success', '奖励已提取到你的龟币账户。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleToggleBattleLike = async (duel: DuelItem) => {
    if (!requireAuth()) return;

    const nextLiked = !likedMap[duel.id];
    setLikedMap((prev) => ({ ...prev, [duel.id]: nextLiked }));

    try {
      if (nextLiked) {
        await likeBattleMutation.mutateAsync({ entityType: 'battle', entityId: duel.battleId });
      } else {
        await unlikeBattleMutation.mutateAsync({ entityType: 'battle', entityId: duel.battleId });
      }
    } catch (error) {
      setLikedMap((prev) => ({ ...prev, [duel.id]: !nextLiked }));
      setMappedError(error);
    }
  };

  const handleCreateBattleComment = async (duel: DuelItem) => {
    const draft = commentDraftMap[duel.id]?.trim() ?? '';
    if (!requireAuth()) return;
    if (!draft) {
      pushFeedback('error', '评论内容不能为空。');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        entityType: 'battle',
        entityId: duel.battleId,
        content: draft,
      });
      setCommentDraftMap((prev) => ({ ...prev, [duel.id]: '' }));
      pushFeedback('success', '评论已发布。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const renderList = (items: DuelItem[], emptyText = '暂无赌局') =>
    items.length > 0 ? (
      items.map((duel) => (
        <DuelCard
          key={duel.id}
          duel={duel}
          commentsOpen={!!commentOpen[duel.id]}
          liked={!!likedMap[duel.id]}
          onToggleComments={() => {
            if (!requireAuth()) return;
            setCommentOpen((prev) => ({ ...prev, [duel.id]: !prev[duel.id] }));
          }}
          onToggleLike={() => void handleToggleBattleLike(duel)}
          onJoin={() => {
            if (!requireAuth()) return;
            setJoinModal({
              duelId: duel.battleId,
              title: duel.topic,
              max: Math.max(0, duel.wager - duel.currentPool),
              visibility: duel.visibility,
            });
          }}
          onCopyInvite={(code) => {
            void navigator.clipboard?.writeText(code);
          }}
          onAddStake={() => {
            if (!requireAuth()) return;
            setAddStakeModal({
              duelId: duel.battleId,
              title: duel.topic,
            });
          }}
          onViewDetail={() => setDetailBattleId(duel.battleId)}
          onDeclare={(result) => void handleDeclareResult(duel, result)}
          onConfirm={() => void handleChallengeConfirm(duel)}
          onDispute={() => void handleChallengeDispute(duel)}
          onWithdraw={() => void handleWithdraw(duel)}
          commentDraft={commentDraftMap[duel.id] ?? ''}
          onCommentDraftChange={(value) => setCommentDraftMap((prev) => ({ ...prev, [duel.id]: value }))}
          onSubmitComment={() => void handleCreateBattleComment(duel)}
          commentSubmitting={createCommentMutation.isLoading}
        />
      ))
    ) : (
      <TextEmptyState text={emptyText} className="min-h-[180px] md:min-h-[220px]" />
    );

  const detailBattle = detailBattleQuery.data?.battle ?? null;
  const detailSettlement = detailBattleQuery.data?.settlement?.settlement ?? null;
  const detailMyItem = detailBattleQuery.data?.settlement?.myItem ?? null;
  const detailMyAction = detailBattleQuery.data?.myAction ?? '';
  const detailStatusLabel = detailBattle
    ? detailBattle.status === 'pending'
      ? '待宣布'
      : detailBattle.status === 'settled'
        ? '已结算'
        : detailBattle.status === 'disputed'
          ? '争议中'
          : detailBattle.status === 'sealed'
            ? '已封盘'
            : '进行中'
    : '';
  const detailNormalizedResult = detailBattle?.result
    ? normalizeBattleResult(detailBattle.result)
    : undefined;
  const detailResultLabel = detailNormalizedResult
    ? getBattleResultLabel(detailNormalizedResult)
    : '待宣布';

  return (
    <>
      <div
        id="page-battle-square"
        className={css("page-battle-square legacy-battle-square relative min-h-full bg-transparent px-0 py-0 md:rounded-none")}
      >
        <div className={css("bp-wrap")}>
          {!isAuthenticated ? (
            <div
              className={css("duel-compose")}
              style={{
                borderColor: 'rgba(245,158,11,.22)',
                background: 'linear-gradient(135deg, rgba(24,24,27,.96), rgba(15,23,42,.94))',
                boxShadow: '0 18px 40px rgba(0,0,0,.28)',
                cursor: 'pointer',
              }}
              onClick={() => requireAuth()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  requireAuth();
                }
              }}
            >
              <div className={css("dc-header")}>
                <div className={css("dc-ava")}>🔐</div>
                <div className={css("dc-placeholder")} style={{ cursor: 'pointer', color: '#f8d27a' }}>
                  当前未登录。登录后可浏览赌局广场，并进行创建、挑战、评论等操作。
                </div>
              </div>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={css("duel-compose")}
              style={{
                borderColor:
                  feedback.tone === 'error'
                    ? 'rgba(239,68,68,.22)'
                    : feedback.tone === 'success'
                      ? 'rgba(16,185,129,.22)'
                      : undefined,
              }}
            >
              <div className={css("dc-header")}>
                <div className={css("dc-ava")}>{feedback.tone === 'error' ? '⚠️' : feedback.tone === 'success' ? '✅' : 'ℹ️'}</div>
                <div
                  className={css("dc-placeholder")}
                  style={{
                    cursor: 'default',
                    color:
                      feedback.tone === 'error'
                        ? 'var(--red)'
                        : feedback.tone === 'success'
                          ? 'var(--green)'
                          : 'var(--ink)',
                  }}
                >
                  {feedback.text}
                </div>
                <button type="button" className={css("dc-cancel")} onClick={() => setFeedback(null)}>
                  关闭
                </button>
              </div>
            </div>
          ) : null}

          <div className={css("bp-hub")}>
            <div className={css("bp-hub-metrics")}>
              <div className={css("phb-stats")}>
                <div className={css("phb-metric")}>
                  <span className={css("phb-metric-ico")} aria-hidden>
                    🔥
                  </span>
                  <span className={css("phb-metric-val")}>{totalBattleCount}</span>
                  <span className={css("phb-metric-lbl")}>当前赌局</span>
                </div>
                <div className={css("phb-metric")}>
                  <span className={css("phb-metric-ico")} aria-hidden>
                    💰
                  </span>
                  <span className={css("phb-metric-val")}>{formatCoins(totalFrozen)}</span>
                  <span className={css("phb-metric-lbl")}>冻结龟币</span>
                </div>
                <div className={css("phb-metric")}>
                  <span className={css("phb-metric-ico")} aria-hidden>
                    👥
                  </span>
                  <span className={css("phb-metric-val")}>{totalBankerCount}</span>
                  <span className={css("phb-metric-lbl")}>庄家人数</span>
                </div>
                <div className={css("phb-metric")}>
                  <span className={css("phb-metric-ico")} aria-hidden>
                    ⚡
                  </span>
                  <span className={css("phb-metric-val")}>{totalPendingCount}</span>
                  <span className={css("phb-metric-lbl")}>等待结算</span>
                </div>
              </div>
            </div>

            <div className={css("bp-hub-divider")} aria-hidden />

            <div className={css("duel-compose")}>
              <div className={css("dc-header")}>
                <div className={css("dc-ava")}>🦊</div>
                <div className={css("dc-placeholder")} onClick={handleOpenCompose}>想开一局？点击做庄，设定议题和押注…</div>
                <button type="button" className={css("dc-btn")} onClick={handleOpenCompose}>我要做庄</button>
              </div>
              {composeOpen && (
                <div className={css("dc-form")}>
                  <div className={css("dc-row")}>
                    <div className={css("dc-label")}>议题（事件标题）</div>
                    <input className={css("dc-input")} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例：2026 世界杯决赛巴西夺冠" />
                  </div>
                  <div className={css("dc-row")}>
                    <div className={css("dc-label")}>🔴 庄家立场</div>
                    <textarea className={css("dc-textarea")} value={bankerOpinion} onChange={(e) => setBankerOpinion(e.target.value)} placeholder="写出你的立场和理由…" />
                  </div>
                  <div className={css("dc-row")}>
                    <div className={css("dc-label")}>🔵 挑战者立场</div>
                    <textarea className={css("dc-textarea")} value={challengerOpinion} onChange={(e) => setChallengerOpinion(e.target.value)} placeholder="反方立场…" />
                  </div>
                  <div className={css("dc-inline")}>
                    <div className={css("dc-row")}>
                      <div className={css("dc-label")}>押注金额</div>
                      <div className={css("dc-stake-opts")}>
                        {WAGER_OPTIONS.map((amount) => (
                          <div key={amount} className={css(`dc-stake-opt ${wager === amount ? 'on' : ''}`)} onClick={() => setWager(amount)}>
                            {formatCoins(amount)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={css("dc-row")}>
                      <div className={css("dc-label")}>公开/私人</div>
                      <div className={css("dc-vis-toggle")}>
                        <div className={css(`dc-vis-btn ${visibility === 'public' ? 'on' : ''}`)} onClick={() => setVisibility('public')}>🌐 公开</div>
                        <div className={css(`dc-vis-btn ${visibility === 'private' ? 'on' : ''}`)} onClick={() => setVisibility('private')}>🔒 私人</div>
                      </div>
                    </div>
                  </div>
                  <div className={css("dc-row")} style={{ marginTop: 12 }}>
                    <div className={css("dc-label")}>结算时间</div>
                    <input className={css("dc-input")} type="datetime-local" value={settleTime} onChange={(e) => setSettleTime(e.target.value)} />
                  </div>
                  {visibility === 'private' ? (
                    <div className={css("dc-row")}>
                      <div className={css("dc-label")}>邀请码</div>
                      <input className={css("dc-input")} value={inviteInput} onChange={(e) => setInviteInput(e.target.value.toUpperCase())} placeholder="私密场必须填写邀请码" />
                    </div>
                  ) : null}
                  <div className={css("dc-footer")}>
                    <div className={css("dc-fee-hint")}>
                      {visibility === 'public' ? '公开赌局：挑战者支付 5% 入场费给庄家' : '私人赌局：挑战者无入场费'}
                      {` · 当前余额 ${formatCoins(userBalance)}🪙`}
                    </div>
                    <button type="button" className={css("dc-cancel")} onClick={() => setComposeOpen(false)}>取消</button>
                    <button
                      type="button"
                      className={css("dc-submit")}
                      onClick={() => void handleCreate()}
                      disabled={!canSubmitCreate}
                      style={!canSubmitCreate ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                    >
                      {createBattleMutation.isLoading ? '提交中...' : `确认开局 · 冻结 ${formatCoins(wager)}🪙`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={css("bp-hub-divider")} aria-hidden />

            <div className={css("plaza-rules")}>
              <div className={css("plaza-rules-header")} onClick={() => setRulesOpen((prev) => !prev)}>
                <div>📜</div>
                <div className={css("plaza-rules-title")}>广场规则 · 开局前必读</div>
                <div className={css(`plaza-rules-chev ${rulesOpen ? 'open' : ''}`)}>▸</div>
              </div>
              {rulesOpen && (
                <div className={css("plaza-rules-body")}>
                  <div className={css("rules-section")}>
                    <div className={css("rules-title")}>基本机制</div>
                    <div className={css("pr-grid")}>
                      <RuleCard title="🎲 做庄（1v多）" text="庄家自定议题和双方立场，押注 100 起。所有加入的人自动站对立面，形成一个庄家对多个挑战者。" />
                      <RuleCard title="⚔️ 挑战庄家" text="公开赌局收 5% 入场费给庄家，私人赌局无入场费。挑战者冻结总额不得超过庄家押注，满额自动封盘。" />
                    </div>
                  </div>
                  <div className={css("rules-section")}>
                    <div className={css("rules-title")}>结算流程</div>
                    <div className={css("rules-steps")}>
                      1. 到达结算时间后自动封盘。<br />
                      2. 庄家 24h 内宣布结果，超时系统自动判庄家输。<br />
                      3. 挑战者 24h 内确认，未操作视为同意。<br />
                      4. 任一人异议则进入管理员仲裁。
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={css("bp-hub-divider")} aria-hidden />

            <div className={css("invite-entry")}>
              <span className={css("bp-invite-ico")} aria-hidden>
                🔒
              </span>
              <div className={css("invite-entry-info")}>
                <div className={css("invite-entry-title")}>私人赌局邀请码</div>
                <div className={css("invite-entry-sub")}>挑战私密场时会优先带上此处保存的邀请码</div>
              </div>
              <input className={css("invite-entry-input")} value={inviteInput} onChange={(e) => setInviteInput(e.target.value.toUpperCase())} placeholder="邀请码" maxLength={20} />
              <button
                type="button"
                className={css("invite-entry-btn")}
                onClick={() => pushFeedback('info', '邀请码已保存，点击具体私密赌局时会自动带上。')}
              >
                保存
              </button>
            </div>
          </div>

          <div className={css("bp-toolbar")}>
            <div className={css("bp-segmented")} role="tablist" aria-label="赌局列表视图">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'plaza'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('plaza')}
              >
                赌局广场
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'my-banker'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('my-banker')}
              >
                我做的庄
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'my-challenger'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('my-challenger')}
              >
                我的挑战
              </button>
            </div>
            {activeTab === 'plaza' ? (
              <div className={css("bp-plaza-controls")}>
                <label htmlFor="bp-plaza-sort" className={css("bp-sort-label")}>
                  排序
                </label>
                <select
                  id="bp-plaza-sort"
                  className={css("bp-sort-select")}
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value as PlazaSort)}
                >
                  {PLAZA_SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                      {sort}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={css("bp-refresh-icon-btn")}
                  aria-label={battleListRefreshing ? '刷新中' : '刷新列表'}
                  disabled={battleListRefreshing}
                  onClick={refetchBattleLists}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      animation: battleListRefreshing ? `${kf('bp-spin')} 0.9s linear infinite` : undefined,
                    }}
                  >
                    ⟳
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {activeTab === 'plaza' && (
            <>
              {!isAuthenticated ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>🔐</div>
                  <div className={css("empty-title")}>请先登录</div>
                  <div className={css("empty-sub")}>登录后可查看赌局广场与最新对战列表。</div>
                  <button type="button" className={css("dc-btn")} style={{ marginTop: 16 }} onClick={() => requireAuth()}>
                    去登录
                  </button>
                </div>
              ) : plazaQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>开战广场加载中</div>
                  <div className={css("empty-sub")}>正在同步最新赌局数据…</div>
                </div>
              ) : plazaQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>广场加载失败</div>
                  <div className={css("empty-sub")}>请稍后重试，或刷新页面重新拉取 battle 列表。</div>
                </div>
              ) : (
                renderList(
                  sortedPlazaDuels,
                  activeSort === '最新' ? '暂无赌局' : `当前「${activeSort}」筛选下暂无赌局`,
                )
              )}
            </>
          )}

          {activeTab === 'my-banker' && (
            <>
              <div className={css("banker-tips")}>
                <div className={css("bt-header")}>
                  <div style={{ fontSize: 22 }}>💡</div>
                  <div className={css("bt-title")}>做庄小贴士</div>
                </div>
                <div className={css("bt-list")}>
                  <div className={css("bt-tip")}><div>📌</div><div>议题要明确，避免模糊表述，否则可能被判作废。</div></div>
                  <div className={css("bt-tip")}><div>⏰</div><div>结算时间到后 24h 内必须宣布结果，超时系统自动判输。</div></div>
                  <div className={css("bt-tip")}><div>💰</div><div>公开赌局可赚取入场费，但虚报结果也会触发处罚。</div></div>
                </div>
              </div>
              <div className={css("banker-overview")}>
                <div className={css("bo-item")}><div className={css("bo-num")}>{myBankerDuels.filter((d) => d.status !== 'settled').length}</div><div className={css("bo-label")}>进行中</div></div>
                <div className={css("bo-item")}><div className={css("bo-num")}>{myBankerDuels.filter((d) => d.status === 'settled').length}</div><div className={css("bo-label")}>已结算</div></div>
                <div className={css("bo-item")}><div className={css("bo-num")}>{formatCoins(myBankerDuels.reduce((sum, duel) => sum + duel.currentPool, 0))}</div><div className={css("bo-label")}>挑战总额</div></div>
              </div>
              {myBankerQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>正在加载我的庄局</div>
                  <div className={css("empty-sub")}>稍等一下，我们正在拉取你的做庄记录。</div>
                </div>
              ) : !isAuthenticated ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>🔐</div>
                  <div className={css("empty-title")}>请先登录</div>
                  <div className={css("empty-sub")}>登录后可查看和管理你的做庄记录。</div>
                  <button type="button" className={css("dc-btn")} style={{ marginTop: 16 }} onClick={() => requireAuth()}>
                    去登录
                  </button>
                </div>
              ) : myBankerQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>我的庄局加载失败</div>
                  <div className={css("empty-sub")}>当前无法同步你的 battle 数据，请稍后再试。</div>
                </div>
              ) : (
                renderList(myBankerDuels, '暂无做庄记录')
              )}
            </>
          )}

          {activeTab === 'my-challenger' && (
            <>
              <div className={css("challenger-tips")}>
                <div className={css("ct-title")}>⚔️ 我的挑战</div>
                <div className={css("bt-list")}>
                  <div className={css("bt-tip")}><div>👀</div><div>关注结算时间，庄家宣布结果后你有 24h 确认窗口。</div></div>
                  <div className={css("bt-tip")}><div>⚠️</div><div>异议要有理有据，恶意异议会被扣冻结额 10% 罚金。</div></div>
                </div>
              </div>
              {myChallengerQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>正在加载我的挑战</div>
                  <div className={css("empty-sub")}>稍等一下，我们正在拉取你参与过的赌局。</div>
                </div>
              ) : !isAuthenticated ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>🔐</div>
                  <div className={css("empty-title")}>请先登录</div>
                  <div className={css("empty-sub")}>登录后可查看你参与过的挑战记录。</div>
                  <button type="button" className={css("dc-btn")} style={{ marginTop: 16 }} onClick={() => requireAuth()}>
                    去登录
                  </button>
                </div>
              ) : myChallengerQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>我的挑战加载失败</div>
                  <div className={css("empty-sub")}>当前无法同步你的 challenge 记录，请稍后再试。</div>
                </div>
              ) : (
                renderList(myChallengerDuels, '暂无挑战记录')
              )}
            </>
          )}
        </div>

        {detailBattleId !== null && (
          <div className={css("duel-overlay")} onClick={() => setDetailBattleId(null)}>
            <div className={css("duel-modal")} onClick={(e) => e.stopPropagation()}>
              <div className={css("dm-close")} onClick={() => setDetailBattleId(null)}>✕</div>
              <div className={css("dm-title")}>赌局详情</div>
              <div className={css("dm-sub")}>Battle #{detailBattleId}</div>

              {detailBattleQuery.isLoading ? (
                <div className={css("dm-fee-note")}>正在加载详情…</div>
              ) : detailBattleQuery.isError ? (
                <div className={css("dm-fee-note")} style={{ color: 'var(--red)' }}>
                  详情加载失败，请稍后重试。
                </div>
              ) : detailBattle ? (
                <>
                  <div className={css("dm-info-grid")}>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>当前状态</div>
                      <div className={css("dm-info-value")}>{detailStatusLabel}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>当前结果</div>
                      <div className={css("dm-info-value")}>{detailResultLabel}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>我的动作</div>
                      <div className={css("dm-info-value")}>{detailMyAction ? detailMyAction : '未操作'}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>宣判方式</div>
                      <div className={css("dm-info-value")}>{detailBattle.resultBy || '待判定'}</div>
                    </div>
                  </div>

                  <div className={css("dm-fee-note")}>
                    {detailBattle.pendingDeadline ? `庄家宣判截止：${formatTimestampLabel(detailBattle.pendingDeadline)}` : '当前没有庄家宣判截止时间。'}
                    <br />
                    {detailBattle.confirmDeadline ? `挑战者确认截止：${formatTimestampLabel(detailBattle.confirmDeadline)}` : '当前没有挑战者确认截止时间。'}
                    <br />
                    {detailBattle.resultTime ? `结果生效时间：${formatTimestampLabel(detailBattle.resultTime)}` : '结果尚未生效。'}
                  </div>

                  <div className={css("dm-info-grid")}>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>结算记录</div>
                      <div className={css("dm-info-value")}>
                        {detailSettlement ? `${detailSettlement.result} · ${formatTimestampLabel(detailSettlement.createdAt || detailSettlement.createTime)}` : '未结算'}
                      </div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>我的奖金</div>
                      <div className={css("dm-info-value gold")}>{detailMyItem ? `${formatCoins(detailMyItem.payoutAmount)} 🪙` : '暂无'}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>提取状态</div>
                      <div className={css("dm-info-value")}>{detailMyItem ? (detailMyItem.withdrawn ? '已提取' : '待提取') : '无'}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>提取时间</div>
                      <div className={css("dm-info-value")}>{detailMyItem?.withdrawTime ? formatTimestampLabel(detailMyItem.withdrawTime) : '未提取'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={css("dm-fee-note")}>当前没有可展示的详情。</div>
              )}
            </div>
          </div>
        )}

        {joinModal && (
          <div className={css("duel-overlay")} onClick={() => setJoinModal(null)}>
            <div className={css("duel-modal")} onClick={(e) => e.stopPropagation()}>
              <div className={css("dm-close")} onClick={() => setJoinModal(null)}>✕</div>
              <div className={css("dm-title")}>挑战庄家</div>
              <div className={css("dm-sub")}>{joinModal.title}</div>
              <div className={css("dm-info-grid")}>
                <div className={css("dm-info-item")}>
                  <div className={css("dm-info-label")}>剩余可挑战</div>
                  <div className={css("dm-info-value gold")}>{formatCoins(joinModalMax)} 🪙</div>
                </div>
                <div className={css("dm-info-item")}>
                  <div className={css("dm-info-label")}>模式</div>
                  <div className={css("dm-info-value")}>{joinModal.visibility === 'public' ? '公开' : '私人'}</div>
                </div>
              </div>
              <div className={css("dm-label")}>押注金额</div>
              <input className={css("dm-stake-input")} type="number" min={100} max={joinModalMax} value={joinAmount} onChange={(e) => setJoinAmount(Number(e.target.value || 0))} />
              <div className={css("dm-amts")}>
                {[100, 500, 1000, 2000].map((amount) => (
                  <div key={amount} className={css(`dm-amt ${normalizedJoinAmount === amount ? 'on' : ''}`)} onClick={() => setJoinAmount(clampAmount(amount, 100, joinModalMax))}>
                    {amount}
                  </div>
                ))}
              </div>
              <div className={css("dm-fee-note")}>
                {joinModal.visibility === 'public' ? '公开赌局会收取 5% 入场费，剩余 95% 进入冻结池。' : '私人赌局不收取入场费，全部金额进入冻结池。'}
                {` 当前将提交 ${formatCoins(normalizedJoinAmount)}🪙。`}
              </div>
              <button
                className={css("dm-cta")}
                onClick={() => void handleJoinBattle()}
                disabled={!canSubmitJoin}
                style={!canSubmitJoin ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                {joinBattleMutation.isLoading ? '提交中...' : `⚔️ 确认挑战 ${formatCoins(normalizedJoinAmount)} 龟币`}
              </button>
            </div>
          </div>
        )}

        {addStakeModal && (
          <div className={css("duel-overlay")} onClick={() => setAddStakeModal(null)}>
            <div className={css("duel-modal")} onClick={(e) => e.stopPropagation()}>
              <div className={css("dm-close")} onClick={() => setAddStakeModal(null)}>✕</div>
              <div className={css("dm-title")}>庄家追加押注</div>
              <div className={css("dm-sub")}>{addStakeModal.title}</div>
              <div className={css("dm-info-grid")}>
                <div className={css("dm-info-item")}>
                  <div className={css("dm-info-label")}>当前余额</div>
                  <div className={css("dm-info-value gold")}>{formatCoins(userBalance)} 🪙</div>
                </div>
                <div className={css("dm-info-item")}>
                  <div className={css("dm-info-label")}>说明</div>
                  <div className={css("dm-info-value")}>扩大可挑战额度</div>
                </div>
              </div>
              <div className={css("dm-label")}>追加金额</div>
              <input className={css("dm-stake-input")} type="number" min={100} max={Math.max(100, userBalance)} value={addStakeAmount} onChange={(e) => setAddStakeAmount(Number(e.target.value || 0))} />
              <div className={css("dm-amts")}>
                {[100, 500, 1000, 2000].map((amount) => (
                  <div key={amount} className={css(`dm-amt ${normalizedAddStakeAmount === amount ? 'on' : ''}`)} onClick={() => setAddStakeAmount(clampAmount(amount, 100, Math.max(100, userBalance)))}>
                    {amount}
                  </div>
                ))}
              </div>
              <div className={css("dm-fee-note")}>
                追加押注只允许庄家在 `open` 阶段操作，成功后 battle 容量会同步扩大。
                {` 当前将追加 ${formatCoins(normalizedAddStakeAmount)}🪙。`}
              </div>
              <button
                className={css("dm-cta")}
                onClick={() => void handleBankerAddStake()}
                disabled={!canSubmitAddStake}
                style={!canSubmitAddStake ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                {addStakeMutation.isLoading ? '提交中...' : `➕ 确认加注 ${formatCoins(normalizedAddStakeAmount)} 龟币`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
