/**
 * 文件说明：开撕台撕裂带直播页核心实现（仅接 PK 开撕台接口）。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Crosshair,
  MessageCircleReply,
  Radio,
  Send,
  Shield,
  Swords,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import {
  type CommentResponse,
} from '@/hooks/useCommentRequests';
import { useRequestCoinMe } from '@/hooks/useCoinRequests';
import {
  useRequestPKBet,
  useRequestPKCommentReplies,
  useRequestPKComments,
  useRequestPKCreateComment,
  useRequestPKDownvote,
  useRequestPKHeat,
  useRequestPKHeatMe,
  useRequestPKHeatRank,
  useRequestPKLike,
  // useRequestPKMyBets,
  useRequestPKOddsCurrent,
  useRequestPKRecordOption,
  useRequestPKReplyComment,
  useRequestPKSettle,
  useRequestPKTopic,
} from '@/hooks/usePkRequests';
import type { PKBet } from '@/hooks/pkTypes';
import type { PetSkin } from '@/components/common/pet/petTypes';
import type { RivalryBattleNewsItem } from '../types';
import { RivalryBattleEnergyBar, buildRivalryBattleEnergyBarBubbles } from './RivalryBattleEnergyBar/index';
import { RivalryBattleRightRail } from './RivalryBattleRightRail';
import { resolveRivalryBattleTheme } from './rivalryBattleThemes';
import './RivalryBattleLiveRoom.css';

type CommentSide = 'A' | 'B';
type BetOption = 'A' | 'B';
type ParticleStyle = React.CSSProperties & Record<`--${string}`, string>;
type ThemeStyle = React.CSSProperties & Record<`--${string}`, string>;

interface RivalryBattleProps {
  news: RivalryBattleNewsItem;
  onBack: () => void;
  userSide: 'A' | 'B' | null;
  equippedSkin?: PetSkin | null;
  onRequireAuth?: () => void;
}

type BattleComment = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
  downvotes: number;
  downvoted: boolean;
  replyCount: number;
  ipLocation?: string;
};

type BattleReply = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
};

type FeedItem = {
  id: string;
  side: CommentSide;
  text: string;
};

type BarrageItem = {
  id: string;
  side: CommentSide;
  author: string;
  text: string;
  likes: number;
};

type PkParticle = {
  id: string;
  style: ParticleStyle;
};

type Supporter = {
  id: string;
  avatar: string;
  rank: number | null;
  name: string;
};

type LatestReplyEvent = {
  token: number;
  commentId: string;
  reply: CommentResponse;
  side: CommentSide;
};

const FALLBACK_AVATAR = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#1b8dff"/>
      <stop offset="1" stop-color="#ff344a"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="48" fill="#07101f"/>
  <circle cx="48" cy="35" r="18" fill="url(#g)"/>
  <path d="M18 86c5-20 18-32 30-32s25 12 30 32" fill="url(#g)" opacity=".86"/>
</svg>
`)}`;
const DEFAULT_BATTLE_IMAGE = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80';

function hasValue(value: unknown) {
  return value !== undefined && value !== null && value !== '';
}

function createRequestId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatVotes(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN');
}

function formatWan(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2)}万`;
  return formatVotes(value);
}

function clampPct(value: number) {
  return Math.max(8, Math.min(92, value));
}

function calcSideHeat(comments: BattleComment[]) {
  return comments.reduce((sum, comment) => sum + comment.likes + comment.replyCount * 2 + 8, 0);
}

function formatBattleTime(timestamp?: number) {
  if (!timestamp) return '刚刚';
  const ms = String(timestamp).length <= 10 ? timestamp * 1000 : timestamp;
  const diff = Date.now() - ms;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  return `${Math.floor(diff / day)}天前`;
}

function parseCommentTime(value: CommentResponse['createTime'] | CommentResponse['createdAt'] | CommentResponse['createAt']) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getCommentBase(comment?: CommentResponse | null) {
  return comment?.comment ?? comment ?? null;
}

function getCommentText(comment?: CommentResponse | null) {
  const base = getCommentBase(comment);
  return (
    base?.content ||
    base?.text ||
    base?.commentContent ||
    base?.contentText ||
    base?.body ||
    base?.message ||
    comment?.content ||
    comment?.text ||
    comment?.commentContent ||
    comment?.contentText ||
    comment?.body ||
    comment?.message ||
    ''
  );
}

function getCommentUserName(comment?: CommentResponse | null) {
  const base = getCommentBase(comment);
  return base?.user?.nickname || base?.user?.username || comment?.user?.nickname || comment?.user?.username || `用户${base?.user?.id ?? comment?.user?.id ?? ''}` || '匿名用户';
}

function getCommentAvatar(comment?: CommentResponse | null) {
  const base = getCommentBase(comment);
  return base?.user?.avatar || base?.user?.smallAvatar || comment?.user?.avatar || comment?.user?.smallAvatar || FALLBACK_AVATAR;
}

function mapCommentToBattleComment(comment: CommentResponse): BattleComment {
  const pkComment = comment as import('@/hooks/pkTypes').PKCommentResponse;
  const base = getCommentBase(comment);
  return {
    id: String(base?.id ?? comment.id),
    author: getCommentUserName(comment),
    avatar: getCommentAvatar(comment),
    time: formatBattleTime(parseCommentTime(base?.createTime ?? base?.createdAt ?? base?.createAt ?? comment.createTime ?? comment.createdAt ?? comment.createAt)),
    text: getCommentText(comment) || '这条评论暂时没有正文。',
    likes: base?.likeCount ?? comment.likeCount ?? base?.likes ?? comment.likes ?? 0,
    liked: Boolean(base?.liked ?? comment.liked),
    downvotes: pkComment.downvoteCount ?? 0,
    downvoted: Boolean(pkComment.downvoted),
    replyCount: base?.replyCount ?? comment.replyCount ?? base?.replies ?? comment.replies ?? 0,
    ipLocation: base?.ipLocation ?? comment.ipLocation,
  };
}

function mapReplyToBattleReply(comment: CommentResponse): BattleReply {
  const base = getCommentBase(comment);
  return {
    id: String(base?.id ?? comment.id),
    author: getCommentUserName(comment),
    avatar: getCommentAvatar(comment),
    time: formatBattleTime(parseCommentTime(base?.createTime ?? base?.createdAt ?? base?.createAt ?? comment.createTime ?? comment.createdAt ?? comment.createAt)),
    text: getCommentText(comment) || '这条回复暂时没有正文。',
    likes: base?.likeCount ?? comment.likeCount ?? base?.likes ?? comment.likes ?? 0,
  };
}

function mergeById<T extends { id: string }>(base: T[], incoming: T[]) {
  const map = new Map<string, T>();
  [...base, ...incoming].forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function buildSupporters(comments: BattleComment[], seed: string): Supporter[] {
  const unique = new Map<string, Supporter & { score: number }>();

  comments.forEach((comment) => {
    const score = comment.likes + comment.replyCount * 2;
    const userKey = `${comment.author}-${comment.avatar || FALLBACK_AVATAR}`;
    const prev = unique.get(userKey);
    if (!prev || prev.score < score) {
      unique.set(userKey, {
        id: `${seed}-${comment.id}`,
        avatar: comment.avatar || FALLBACK_AVATAR,
        rank: null,
        name: comment.author,
        score,
      });
    }
  });

  return Array.from(unique.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item, index) => ({
      id: item.id,
      avatar: item.avatar,
      rank: index < 3 ? index + 1 : null,
      name: item.name,
    }));
}

function buildInitialFeed(news: RivalryBattleNewsItem, commentsA: BattleComment[], commentsB: BattleComment[]) {
  return [
    {
      id: `feed-init-a-${news.id}`,
      side: 'A' as const,
      text: `${news.optionA} 阵营已汇聚 ${formatVotes(commentsA.length)} 条声量评论`,
    },
    {
      id: `feed-init-b-${news.id}`,
      side: 'B' as const,
      text: `${news.optionB} 阵营已汇聚 ${formatVotes(commentsB.length)} 条声量评论`,
    },
    {
      id: `feed-init-mid-${news.id}`,
      side: (commentsA.length >= commentsB.length ? 'A' : 'B') as CommentSide,
      text: `${commentsA.length >= commentsB.length ? news.optionA : news.optionB} 当前掌握更多战场热度`,
    },
  ];
}

function AvatarStack({ supporter }: { supporter: Supporter }) {
  return (
    <div className={`avatar-wrap ${supporter.rank ? `rank-${supporter.rank}` : ''}`} title={supporter.name}>
      <img src={supporter.avatar || FALLBACK_AVATAR} alt={supporter.name} />
      {supporter.rank ? <span className="badge">{supporter.rank}</span> : null}
    </div>
  );
}

interface BattleCommentCardProps {
  comment: BattleComment;
  side: CommentSide;
  sideLabel: string;
  sideAccent: string;
  useNeutralStyle: boolean;
  canInteract: boolean;
  canDownvote: boolean;
  onToggleLike: (comment: BattleComment, side: CommentSide) => void;
  onToggleDownvote: (comment: BattleComment, side: CommentSide) => void;
  onOpenReply: (comment: BattleComment, side: CommentSide) => void;
  isReplying: boolean;
  replyDraft: string;
  onReplyDraftChange: (value: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  replySubmitting: boolean;
  likePending: boolean;
  downvotePending: boolean;
  latestReplyEvent: LatestReplyEvent | null;
}

const BattleCommentCard: React.FC<BattleCommentCardProps> = ({
  comment,
  side,
  sideLabel,
  sideAccent,
  useNeutralStyle,
  canInteract,
  canDownvote,
  onToggleLike,
  onToggleDownvote,
  onOpenReply,
  isReplying,
  replyDraft,
  onReplyDraftChange,
  onSubmitReply,
  onCancelReply,
  replySubmitting,
  likePending,
  downvotePending,
  latestReplyEvent,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replyCursor, setReplyCursor] = useState<number | string>(0);
  const [repliesState, setRepliesState] = useState<BattleReply[]>([]);
  const repliesQuery = useRequestPKCommentReplies({
    commentId: comment.id,
    cursor: replyCursor,
    enabled: showReplies || isReplying || latestReplyEvent?.commentId === comment.id,
  });

  useEffect(() => {
    const mapped = (repliesQuery.data?.results ?? []).map(mapReplyToBattleReply);
    if (mapped.length === 0) return;
    const timer = window.setTimeout(() => {
      setRepliesState((prev) => (replyCursor === 0 ? mapped : mergeById(prev, mapped)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [replyCursor, repliesQuery.data]);

  useEffect(() => {
    if (!latestReplyEvent || latestReplyEvent.commentId !== comment.id) return;
    const mapped = mapReplyToBattleReply(latestReplyEvent.reply);
    const timer = window.setTimeout(() => {
      setShowReplies(true);
      setRepliesState((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [comment.id, latestReplyEvent]);

  const totalReplies = Math.max(comment.replyCount, repliesState.length);

  return (
    <div
      className={`comment-item ${useNeutralStyle ? 'comment-neutral' : 'comment-themed'} ${likePending || downvotePending ? 'comment-busy' : ''}`}
      style={useNeutralStyle ? undefined : { ['--comment-side-accent' as string]: sideAccent }}
    >
      <div className="c-left">
        <img className="c-avatar" src={comment.avatar || FALLBACK_AVATAR} alt={comment.author} />
      </div>
      <div className="c-content">
        <div className="c-user-info">
          <span className="c-nickname">{comment.author}</span>
          <span className="c-time">{comment.time}</span>
        </div>
        <div className="c-meta-line">
          <span className="c-side-tag">{sideLabel}</span>
          {comment.ipLocation ? <span className="c-location">{comment.ipLocation}</span> : null}
        </div>
        <p className="c-text">{comment.text}</p>

        <div className="c-actions">
          <button
            type="button"
            className={`action-btn ${comment.liked ? 'active liked' : ''}`}
            onClick={() => onToggleLike(comment, side)}
            disabled={likePending}
          >
            <ThumbsUp size={12} />
            {formatVotes(comment.likes)}
          </button>
          <button
            type="button"
            className={`action-btn ${comment.downvoted ? 'active downvoted' : ''}`}
            onClick={() => onToggleDownvote(comment, side)}
            disabled={!canDownvote || downvotePending}
          >
            <ThumbsDown size={12} />
            {formatVotes(comment.downvotes)}
          </button>
          <button type="button" className="action-btn" onClick={() => onOpenReply(comment, side)} disabled={!canInteract}>
            <MessageCircleReply size={12} />
            回复
          </button>
          {totalReplies > 0 ? (
            <button
              type="button"
              className="action-btn reply-toggle"
              onClick={() => {
                setShowReplies((prev) => !prev);
                if (!showReplies) setReplyCursor(0);
              }}
            >
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showReplies ? '收起回复' : `查看回复 ${formatVotes(totalReplies)}`}
            </button>
          ) : null}
        </div>

        {showReplies ? (
          <div className="reply-box">
            {repliesState.length === 0 && repliesQuery.isLoading ? (
              <div className="reply-empty">回复加载中...</div>
            ) : repliesState.length === 0 ? (
              <div className="reply-empty">还没有回复，来抢沙发吧。</div>
            ) : (
              <>
                {repliesState.map((reply, index) => (
                  <div
                    key={reply.id}
                    className="r-item"
                    style={{ animationDelay: `${Math.min(index, 5) * 0.04}s` }}
                  >
                    <img src={reply.avatar || FALLBACK_AVATAR} alt={reply.author} className="r-avatar" />
                    <div className="r-main">
                      <div className="r-head">
                        <span className="r-user">{reply.author}</span>
                        <span className="r-time">{reply.time}</span>
                      </div>
                      <span className="r-text">{reply.text}</span>
                    </div>
                  </div>
                ))}
                {repliesQuery.data?.hasMore ? (
                  <button
                    type="button"
                    className="load-more-btn load-more-inline"
                    onClick={() => setReplyCursor(repliesQuery.data?.cursor ?? 0)}
                  >
                    加载更多回复
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {isReplying ? (
          <div className="reply-editor">
            <input
              type="text"
              value={replyDraft}
              onChange={(event) => onReplyDraftChange(event.target.value)}
              placeholder={`回复 @${comment.author}...`}
              className="reply-input"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void onSubmitReply();
                }
              }}
            />
            <div className="reply-editor-actions">
              <button type="button" className="reply-cancel" onClick={onCancelReply}>
                取消
              </button>
              <button
                type="button"
                className="reply-send"
                onClick={() => void onSubmitReply()}
                disabled={!replyDraft.trim() || replySubmitting}
              >
                {replySubmitting ? '发送中...' : '发送回复'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const RivalryBattle: React.FC<RivalryBattleProps> = ({
  news,
  onBack,
  userSide,
  onRequireAuth,
}) => {
  const navigate = useNavigate();
  const pkTopicId = Number(news.marketId || news.id);
  const hasPkTopic = Number.isFinite(pkTopicId) && pkTopicId > 0;
  const currentUserQuery = useRequestUserCurrent();
  const coinMeQuery = useRequestCoinMe();
  const pkLikeMutation = useRequestPKLike();
  const pkDownvoteMutation = useRequestPKDownvote();
  const pkRecordOptionMutation = useRequestPKRecordOption();
  const pkSettleMutation = useRequestPKSettle();
  const [cursorA, setCursorA] = useState<number | string>(0);
  const [cursorB, setCursorB] = useState<number | string>(0);
  const [commentsAState, setCommentsAState] = useState<BattleComment[]>([]);
  const [commentsBState, setCommentsBState] = useState<BattleComment[]>([]);
  const [selectedSide, setSelectedSide] = useState<CommentSide>(userSide ?? 'A');
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; side: CommentSide } | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [latestReplyEvent, setLatestReplyEvent] = useState<LatestReplyEvent | null>(null);
  const [betIntent, setBetIntent] = useState<BetOption>(userSide ?? 'A');
  const [betAmount, setBetAmount] = useState('100');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likePendingIds, setLikePendingIds] = useState<Set<string>>(new Set());
  const [downvotePendingIds, setDownvotePendingIds] = useState<Set<string>>(new Set());
  const recordOptionAttemptedRef = useRef<Set<string>>(new Set());
  const viewRecordedTopicRef = useRef<number | null>(null);
  const [countdownLeft, setCountdownLeft] = useState(0);
  const activeTab: string = '全部';
  const [mobileActiveSide, setMobileActiveSide] = useState<CommentSide>(userSide ?? 'A');
  const [rankMode, setRankMode] = useState<'all' | 'side'>('all');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [betDialogSide, setBetDialogSide] = useState<BetOption | null>(null);
  const [optimisticPkBet, setOptimisticPkBet] = useState<PKBet | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentUserName = currentUserQuery.data?.nickname || currentUserQuery.data?.username || '你';
  const pkDetailQuery = useRequestPKTopic({ topicId: pkTopicId, enabled: hasPkTopic });
  const pkHeatQuery = useRequestPKHeat({ topicId: pkTopicId, enabled: hasPkTopic });
  const pkCommentsAQuery = useRequestPKComments({
    topicId: pkTopicId,
    side: 'A',
    cursor: cursorA,
    sort: activeTab === '热门' || activeTab === '精华' ? 'heat' : 'time',
    enabled: hasPkTopic,
  });
  const pkCommentsBQuery = useRequestPKComments({
    topicId: pkTopicId,
    side: 'B',
    cursor: cursorB,
    sort: activeTab === '热门' || activeTab === '精华' ? 'heat' : 'time',
    enabled: hasPkTopic,
  });
  const pkCreateCommentMutation = useRequestPKCreateComment();
  const pkReplyCommentMutation = useRequestPKReplyComment();
  const pkBetMutation = useRequestPKBet();
  const pkHeatMeQuery = useRequestPKHeatMe({
    topicId: pkTopicId,
    enabled: hasPkTopic && Boolean(currentUserQuery.data?.id),
  });
  const pkHeatRankQuery = useRequestPKHeatRank({
    topicId: pkTopicId,
    scope: rankMode === 'side' ? 'MY_SIDE' : 'ALL',
    page: 1,
    pageSize: 20,
    enabled: hasPkTopic,
  });
  const pkOddsQuery = useRequestPKOddsCurrent({
    topicId: pkTopicId,
    roundId: pkHeatQuery.data?.roundId ?? pkDetailQuery.data?.round?.id,
    enabled: hasPkTopic,
  });
  // 我的下注记录：暂时隐藏，恢复时取消注释
  // const pkMyBetsQuery = useRequestPKMyBets({
  //   page: 1,
  //   pageSize: 20,
  //   enabled: hasPkTopic && Boolean(currentUserQuery.data?.id),
  // });
  const pkDetail = pkDetailQuery.data;
  const pkTopic = pkDetail?.topic;
  const pkRound = pkDetail?.round;
  const pkHeat = pkHeatQuery.data;
  const pkPhase = pkHeat?.phase ?? pkRound?.phase;
  const pkMyBet = optimisticPkBet ?? pkDetail?.myBet ?? null;
  const hasPkBet = Boolean(pkDetail?.hasBet ?? (pkMyBet && hasValue(pkMyBet.id)));
  const myBetSide = useMemo((): CommentSide | undefined => {
    const fromBet = pkMyBet?.side;
    if (fromBet === 'A' || fromBet === 'B') return fromBet;
    const fromDetail = pkDetail?.mySide;
    if (fromDetail === 'A' || fromDetail === 'B') return fromDetail;
    return undefined;
  }, [pkDetail?.mySide, pkMyBet?.side]);
  const useNeutralCommentStyle = !hasPkBet;
  const shouldUsePkBet = hasPkTopic && hasValue(pkPhase) && !pkDetailQuery.isError && !pkHeatQuery.isError;
  const canCommentOnSide = useCallback((side: CommentSide) => {
    if (!hasPkBet) return true;
    return myBetSide === side;
  }, [hasPkBet, myBetSide]);
  const canOpenBetSide = useCallback((side: CommentSide) => {
    if (pkPhase !== 'betting' || !shouldUsePkBet || hasPkBet) return false;
    return side === 'A' || side === 'B';
  }, [hasPkBet, pkPhase, shouldUsePkBet]);
  const canDownvoteOnSide = useCallback((side: CommentSide) => {
    if (!hasPkBet || !myBetSide) return false;
    return side !== myBetSide;
  }, [hasPkBet, myBetSide]);
  const canPkSettle = Boolean(pkDetail?.canSettle);
  const optionA = pkTopic?.sideAName || news.optionA;
  const optionB = pkTopic?.sideBName || news.optionB;
  const battleTitle = pkTopic?.title || news.title;
  const oddsA = pkOddsQuery.data?.oddsA ?? pkDetail?.oddsA ?? news.oddsA;
  const oddsB = pkOddsQuery.data?.oddsB ?? pkDetail?.oddsB ?? news.oddsB;
  const pkCountdownSeconds = pkHeat?.countdownSeconds ?? pkDetail?.countdownSeconds;
  const pkHeatA = Number(pkHeat?.heatA ?? pkRound?.heatA);
  const pkHeatB = Number(pkHeat?.heatB ?? pkRound?.heatB);

  const canComment = Boolean(currentUserQuery.data?.id);
  const balance = coinMeQuery.data?.balance ?? 0;
  const numericBetAmount = Number(betAmount);
  const leftVotes = Number.isFinite(pkHeatA) ? Math.round(pkHeatA) : news.votes?.A ?? 0;
  const rightVotes = Number.isFinite(pkHeatB) ? Math.round(pkHeatB) : news.votes?.B ?? 0;
  const totalVotes = Math.max(1, leftVotes + rightVotes);
  const leftPct = clampPct(Math.round((leftVotes / totalVotes) * 100));
  const rightPct = 100 - leftPct;
  const leftEnergyDuration = 1.8 + (leftPct / 100) * 3.2;
  const rightEnergyDuration = 1.8 + (rightPct / 100) * 3.2;
  const leftEnergyBubbles = useMemo(
    () => buildRivalryBattleEnergyBarBubbles('A', leftPct, leftEnergyDuration),
    [leftEnergyDuration, leftPct],
  );
  const rightEnergyBubbles = useMemo(
    () => buildRivalryBattleEnergyBarBubbles('B', rightPct, rightEnergyDuration),
    [rightEnergyDuration, rightPct],
  );
  const effectiveBetAmount = Number.isFinite(numericBetAmount) && numericBetAmount > 0 ? numericBetAmount : 0;
  const isBetting = pkBetMutation.isLoading;
  const canPlaceBet = shouldUsePkBet ? pkPhase === 'betting' && !hasPkBet : false;
  const showDrawBet = false;
  const pkBetAmount = Number(pkMyBet?.amount ?? 0);
  const resolveBetOdds = useCallback((side: BetOption) => {
    if (side === 'A') return oddsA;
    return oddsB;
  }, [oddsA, oddsB]);
  const activeBetOdds = resolveBetOdds(betIntent);
  const estimatedPayout = pkHeatMeQuery.data?.estimatedPayout
    ?? (Number.isFinite(effectiveBetAmount) && effectiveBetAmount > 0
      ? Math.floor(effectiveBetAmount * activeBetOdds)
      : 0);
  const dialogBetOdds = betDialogSide ? resolveBetOdds(betDialogSide) : 0;
  const dialogBetName = betDialogSide
    ? betDialogSide === 'A'
      ? optionA
      : optionB
    : '';
  const dialogEstimatedPayout = Number.isFinite(effectiveBetAmount) && effectiveBetAmount > 0
    ? Math.floor(effectiveBetAmount * dialogBetOdds)
    : 0;
  const betStatusText = shouldUsePkBet
    ? hasPkBet
      ? `已下注 ${formatVotes(pkBetAmount || effectiveBetAmount)}`
      : pkPhase === 'betting'
        ? '进行中'
        : '已暂停'
    : '已暂停';
  const displayNews = useMemo<RivalryBattleNewsItem>(() => ({
    ...news,
    image: pkTopic?.cover?.trim() || news.image,
    listImage: pkTopic?.listImage?.trim() || news.listImage,
    sideABgImage: pkTopic?.sideABgImage?.trim() || news.sideABgImage,
    sideBBgImage: pkTopic?.sideBBgImage?.trim() || news.sideBBgImage,
    sideABgColor: pkTopic?.sideABgColor?.trim() || news.sideABgColor,
    sideBBgColor: pkTopic?.sideBBgColor?.trim() || news.sideBBgColor,
    title: battleTitle,
    optionA,
    optionB,
    oddsA,
    oddsB,
    votes: { A: leftVotes, B: rightVotes },
  }), [battleTitle, leftVotes, news, oddsA, oddsB, optionA, optionB, pkTopic, rightVotes]);
  const liveTopicEyebrow = useMemo(() => {
    const t = battleTitle.trim();
    if (!t) return '正在直播';
    if (/[：:？?！!。.]$/.test(t)) return t;
    return `${t}：`;
  }, [battleTitle]);
  const liveTopicSub = useMemo(
    () => displayNews.summary?.trim() ?? '',
    [displayNews.summary],
  );
  const visualTheme = useMemo(
    () => resolveRivalryBattleTheme(displayNews.marketId ?? displayNews.id, displayNews.optionA, displayNews.optionB, {
      sideAImage: displayNews.sideABgImage,
      sideBImage: displayNews.sideBBgImage,
      sideAColor: displayNews.sideABgColor,
      sideBColor: displayNews.sideBBgColor,
    }),
    [
      displayNews.id,
      displayNews.marketId,
      displayNews.optionA,
      displayNews.optionB,
      displayNews.sideABgColor,
      displayNews.sideABgImage,
      displayNews.sideBBgColor,
      displayNews.sideBBgImage,
    ],
  );
  const themeStyle = useMemo<ThemeStyle>(() => ({
    '--rb-blue': visualTheme.sideA.primary,
    '--rb-blue-soft': visualTheme.sideA.accent,
    '--rb-blue-deep': visualTheme.sideA.deep,
    '--rb-blue-rgb': visualTheme.sideA.rgb,
    '--rb-red': visualTheme.sideB.primary,
    '--rb-red-soft': visualTheme.sideB.accent,
    '--rb-red-deep': visualTheme.sideB.deep,
    '--rb-red-rgb': visualTheme.sideB.rgb,
    '--rb-left-button-gradient': visualTheme.sideA.buttonGradient,
    '--rb-right-button-gradient': visualTheme.sideB.buttonGradient,
    '--rb-left-hero-glow': visualTheme.sideA.heroGlow,
    '--rb-right-hero-glow': visualTheme.sideB.heroGlow,
  }), [visualTheme]);

  const appendFeed = useCallback((side: CommentSide, text: string) => {
    setFeedItems((prev) => [
      ...prev.slice(-7),
      {
        id: `${side}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        side,
        text,
      },
    ]);
  }, []);

  const ensureAuth = useCallback(() => {
    onRequireAuth?.();
  }, [onRequireAuth]);

  const submitRecordOption = useCallback(async (
    side: CommentSide,
    actionType: string,
    entityType = 'pk_option',
    entityId?: number | string,
  ) => {
    if (!hasPkTopic || !canComment) return;
    const roundId = pkHeatQuery.data?.roundId ?? pkDetail?.round?.id ?? pkTopic?.currentRoundId;
    if (!roundId && entityId === undefined) return;
    const dedupeKey = `${pkTopicId}-${actionType}-${side}-${entityId ?? roundId ?? ''}`;
    if (recordOptionAttemptedRef.current.has(dedupeKey)) return;
    recordOptionAttemptedRef.current.add(dedupeKey);
    try {
      await pkRecordOptionMutation.mutateAsync({
        topicId: pkTopicId,
        roundId,
        option: side,
        actionType,
        requestId: createRequestId(`pk-record-${dedupeKey}`),
        entityType,
        entityId: entityId ?? roundId,
      });
    } catch {
      // 失败后保持去重标记，避免轮询或 effect 重跑导致重复请求
    }
  }, [canComment, hasPkTopic, pkDetail?.round?.id, pkHeatQuery.data?.roundId, pkRecordOptionMutation, pkTopic?.currentRoundId, pkTopicId]);

  useEffect(() => {
    if (!hasPkTopic || !canComment || hasPkBet) return;
    const roundId = pkHeatQuery.data?.roundId ?? pkDetail?.round?.id ?? pkTopic?.currentRoundId;
    if (!roundId) return;
    if (viewRecordedTopicRef.current === pkTopicId) return;
    viewRecordedTopicRef.current = pkTopicId;
    void submitRecordOption(selectedSide, 'view');
  }, [
    canComment,
    hasPkBet,
    hasPkTopic,
    pkDetail?.round?.id,
    pkHeatQuery.data?.roundId,
    pkTopic?.currentRoundId,
    pkTopicId,
    selectedSide,
    submitRecordOption,
  ]);

  useEffect(() => {
    const source = pkCommentsAQuery.data?.results ?? [];
    const mapped = source.map(mapCommentToBattleComment);
    if (mapped.length === 0) {
      if (cursorA === 0) setCommentsAState([]);
      return;
    }
    setCommentsAState((prev) => (cursorA === 0 ? mapped : mergeById(prev, mapped)));
  }, [cursorA, pkCommentsAQuery.data]);

  useEffect(() => {
    const source = pkCommentsBQuery.data?.results ?? [];
    const mapped = source.map(mapCommentToBattleComment);
    if (mapped.length === 0) {
      if (cursorB === 0) setCommentsBState([]);
      return;
    }
    setCommentsBState((prev) => (cursorB === 0 ? mapped : mergeById(prev, mapped)));
  }, [cursorB, pkCommentsBQuery.data]);

  useEffect(() => {
    setCursorA(0);
    setCursorB(0);
    setCommentsAState([]);
    setCommentsBState([]);
    setSelectedSide(userSide ?? 'A');
    setMobileActiveSide(userSide ?? 'A');
    setRankMode('all');
    setBetIntent(userSide ?? 'A');
    setDraft('');
    setReplyDraft('');
    setReplyingTo(null);
    setFeedItems([]);
    setLatestReplyEvent(null);
    setMobilePanelOpen(false);
    setOptimisticPkBet(null);
    recordOptionAttemptedRef.current.clear();
    viewRecordedTopicRef.current = null;
  }, [news.id, pkTopicId, userSide]);

  useEffect(() => {
    if (!hasPkBet && rankMode === 'side') {
      setRankMode('all');
    }
  }, [hasPkBet, rankMode]);

  useEffect(() => {
    if (!myBetSide) return;
    setSelectedSide(myBetSide);
    setMobileActiveSide(myBetSide);
    setBetIntent(myBetSide);
  }, [myBetSide]);

  useEffect(() => {
    if (feedItems.length > 0) return;
    if (commentsAState.length === 0 && commentsBState.length === 0) return;
    setFeedItems(buildInitialFeed(displayNews, commentsAState, commentsBState));
  }, [commentsAState, commentsBState, displayNews, feedItems.length]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = 0;
  }, [feedItems]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownLeft((prev) => {
        if (typeof pkCountdownSeconds === 'number') return prev <= 0 ? 0 : prev - 1;
        return prev <= 0 ? 8136 : prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pkCountdownSeconds]);

  useEffect(() => {
    setCountdownLeft(typeof pkCountdownSeconds === 'number' ? Math.max(0, Math.floor(pkCountdownSeconds)) : 0);
  }, [pkTopicId, pkCountdownSeconds]);

  const leftComments = commentsAState;
  const rightComments = commentsBState;
  const hasMoreCommentsA = Boolean(pkCommentsAQuery.data?.hasMore);
  const hasMoreCommentsB = Boolean(pkCommentsBQuery.data?.hasMore);
  const nextCursorA = pkCommentsAQuery.data?.cursor;
  const nextCursorB = pkCommentsBQuery.data?.cursor;
  const leftSupporters = useMemo(() => buildSupporters(leftComments, 'left'), [leftComments]);
  const rightSupporters = useMemo(() => buildSupporters(rightComments, 'right'), [rightComments]);
  const commentLeftHeat = useMemo(() => calcSideHeat(leftComments), [leftComments]);
  const commentRightHeat = useMemo(() => calcSideHeat(rightComments), [rightComments]);
  const leftHeat = Number.isFinite(pkHeatA) ? pkHeatA : commentLeftHeat;
  const rightHeat = Number.isFinite(pkHeatB) ? pkHeatB : commentRightHeat;
  const totalHeat = Math.max(1, leftHeat + rightHeat);
  const leftHeatPct = clampPct(Math.round((leftHeat / totalHeat) * 100));
  const rightHeatPct = 100 - leftHeatPct;
  const leaderSide: CommentSide = leftHeat >= rightHeat ? 'A' : 'B';
  const leaderName = leaderSide === 'A' ? optionA : optionB;
  const combatDiff = Math.abs(leftHeat - rightHeat);
  const leftRole = myBetSide === 'A' ? `已支持 ${optionA}` : optionA;
  const rightRole = myBetSide === 'B' ? `已支持 ${optionB}` : optionB;

  const handleOpenReply = useCallback((comment: BattleComment, side: CommentSide) => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!canCommentOnSide(side)) return;
    setReplyingTo({ commentId: comment.id, authorName: comment.author, side });
    setReplyDraft('');
  }, [canComment, canCommentOnSide, ensureAuth]);

  const updateCommentList = useCallback((side: CommentSide, updater: (items: BattleComment[]) => BattleComment[]) => {
    if (side === 'A') {
      setCommentsAState((prev) => updater(prev));
      return;
    }
    setCommentsBState((prev) => updater(prev));
  }, []);

  const handleToggleLike = useCallback(async (comment: BattleComment, side: CommentSide) => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (comment.liked) return;

    setLikePendingIds((prev) => new Set(prev).add(comment.id));
    updateCommentList(side, (items) =>
      items.map((item) => (item.id === comment.id ? { ...item, liked: true, likes: item.likes + 1 } : item)),
    );

    try {
      await pkLikeMutation.mutateAsync({
        commentId: comment.id,
        requestId: createRequestId(`pk-like-${comment.id}`),
      });
      appendFeed(side, `${comment.author} 获得了一次热度加持`);
      void pkHeatQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
      updateCommentList(side, (items) =>
        items.map((item) => (item.id === comment.id ? { ...item, liked: comment.liked, likes: comment.likes } : item)),
      );
    } finally {
      setLikePendingIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  }, [appendFeed, canComment, ensureAuth, pkHeatQuery, pkLikeMutation, updateCommentList]);

  const handleToggleDownvote = useCallback(async (comment: BattleComment, side: CommentSide) => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!canDownvoteOnSide(side) || comment.downvoted) return;

    setDownvotePendingIds((prev) => new Set(prev).add(comment.id));
    updateCommentList(side, (items) =>
      items.map((item) => (item.id === comment.id ? { ...item, downvoted: true, downvotes: item.downvotes + 1 } : item)),
    );

    try {
      await pkDownvoteMutation.mutateAsync({
        commentId: comment.id,
        requestId: createRequestId(`pk-downvote-${comment.id}`),
      });
      appendFeed(side, `${comment.author} 的评论被拉踩了`);
      void pkHeatQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
      updateCommentList(side, (items) =>
        items.map((item) => (item.id === comment.id ? { ...item, downvoted: comment.downvoted, downvotes: comment.downvotes } : item)),
      );
    } finally {
      setDownvotePendingIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  }, [appendFeed, canComment, canDownvoteOnSide, ensureAuth, pkDownvoteMutation, pkHeatQuery, updateCommentList]);

  const handlePkSettle = useCallback(async () => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!canPkSettle || !pkTopicId) return;
    try {
      await pkSettleMutation.mutateAsync({
        topicId: pkTopicId,
        requestId: createRequestId(`pk-settle-${pkTopicId}`),
        snapshotType: 'SETTLE',
        freezeSource: 'ON_DEMAND',
      });
      navigate(`/settlement/pk/${pkTopicId}?action=view`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [canComment, canPkSettle, ensureAuth, navigate, pkSettleMutation, pkTopicId]);

  const handleSubmitReply = useCallback(async () => {
    const text = replyDraft.trim();
    if (!replyingTo || !text) return;
    if (!canComment) {
      ensureAuth();
      return;
    }

    if (!canCommentOnSide(replyingTo.side)) return;

    try {
      const createdReply = await pkReplyCommentMutation.mutateAsync({
        commentId: replyingTo.commentId,
        content: text,
      });

      setLatestReplyEvent({
        token: Date.now(),
        commentId: replyingTo.commentId,
        reply: createdReply,
        side: replyingTo.side,
      });
      updateCommentList(replyingTo.side, (items) =>
        items.map((item) =>
          item.id === replyingTo.commentId
            ? { ...item, replyCount: item.replyCount + 1 }
            : item,
        ),
      );
      appendFeed(replyingTo.side, `${currentUserName} 回复了 @${replyingTo.authorName}`);
      setReplyDraft('');
      setReplyingTo(null);
      void pkCommentsAQuery.refetch();
      void pkCommentsBQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [
    appendFeed,
    canComment,
    canCommentOnSide,
    currentUserName,
    ensureAuth,
    pkCommentsAQuery,
    pkCommentsBQuery,
    pkReplyCommentMutation,
    replyDraft,
    replyingTo,
    updateCommentList,
  ]);

  const handleSubmitComment = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    if (!canComment) {
      ensureAuth();
      return;
    }

    if (!canCommentOnSide(selectedSide)) return;

    try {
      const createdComment = await pkCreateCommentMutation.mutateAsync({
        topicId: pkTopicId,
        side: selectedSide,
        content: text,
      });

      const mapped = mapCommentToBattleComment(createdComment);
      updateCommentList(selectedSide, (items) => [mapped, ...items.filter((item) => item.id !== mapped.id)]);
      setDraft('');
      appendFeed(selectedSide, `${currentUserName} 为${selectedSide === 'A' ? optionA : optionB}阵营发起了新评论`);
      void submitRecordOption(selectedSide, 'comment', 'comment', createdComment.id);
      void pkCommentsAQuery.refetch();
      void pkCommentsBQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [
    appendFeed,
    canComment,
    canCommentOnSide,
    currentUserName,
    draft,
    ensureAuth,
    optionA,
    optionB,
    pkCommentsAQuery,
    pkCommentsBQuery,
    pkCreateCommentMutation,
    pkTopicId,
    selectedSide,
    submitRecordOption,
    updateCommentList,
  ]);

  const handleBet = useCallback(async (sideOverride?: BetOption) => {
    if (!shouldUsePkBet || !pkTopicId) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    const targetSide = sideOverride ?? betIntent;
    if (!canOpenBetSide(targetSide)) return;
    try {
      const result = await pkBetMutation.mutateAsync({
        topicId: pkTopicId,
        side: targetSide,
        amount: effectiveBetAmount,
        requestId: createRequestId(`pk-bet-${pkTopicId}`),
      });
      if (result.bet) {
        setOptimisticPkBet(result.bet);
        setBetIntent((result.bet.side as BetOption | undefined) ?? targetSide);
        if (result.bet.amount) setBetAmount(String(result.bet.amount));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
      return;
    }
    setBetDialogSide(null);
    setMobilePanelOpen(false);
    const targetLabel = targetSide === 'A' ? optionA : optionB;
    appendFeed(targetSide, `${currentUserName} 为${targetLabel}追加了 ${formatVotes(effectiveBetAmount)} 龟币`);
  }, [
    appendFeed,
    betIntent,
    canComment,
    canOpenBetSide,
    currentUserName,
    effectiveBetAmount,
    ensureAuth,
    optionA,
    optionB,
    pkBetMutation,
    pkTopicId,
    shouldUsePkBet,
  ]);

  const openBetDialog = useCallback((side: BetOption) => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!canOpenBetSide(side)) return;
    setBetIntent(side);
    setBetDialogSide(side);
    void submitRecordOption(side, 'bet_intent');
  }, [canComment, canOpenBetSide, ensureAuth, submitRecordOption]);

  const confirmBetDialog = useCallback(async () => {
    if (!betDialogSide) return;
    await handleBet(betDialogSide);
  }, [betDialogSide, handleBet]);

  const countdownText = useMemo(() => {
    const d = Math.floor(countdownLeft / 86400);
    const h = Math.floor((countdownLeft % 86400) / 3600);
    const m = Math.floor((countdownLeft % 3600) / 60);
    const s = countdownLeft % 60;
    const timeText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return d > 0 ? `${d}天 ${timeText}` : timeText;
  }, [countdownLeft]);

  const leftScore = leftVotes;
  const rightScore = rightVotes;
  const scoreDiff = Math.abs(leftScore - rightScore);
  const leftHeroImage = visualTheme.sideA.imageUrl || displayNews.image || DEFAULT_BATTLE_IMAGE;
  const rightHeroImage = visualTheme.sideB.imageUrl || displayNews.image || DEFAULT_BATTLE_IMAGE;
  const pkParticles = useMemo<PkParticle[]>(() => Array.from({ length: 28 }, (_, index) => {
    const angle = (index / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
    const distance = 78 + Math.random() * 112;
    const midDistance = distance * (0.28 + Math.random() * 0.22);
    const curve = (Math.random() - 0.5) * 74;
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance * 0.78;
    const midX = Math.cos(angle) * midDistance - Math.sin(angle) * curve;
    const midY = Math.sin(angle) * midDistance * 0.78 + Math.cos(angle) * curve * 0.46;
    const isWhite = index % 5 === 0 || Math.random() > 0.78;
    const color = isWhite
      ? '#ffffff'
      : endX < 0
        ? ['#08a7ff', '#39cfff', '#6de6ff'][index % 3]
        : ['#ff2835', '#ff4d55', '#ff7075'][index % 3];

    return {
      id: `pk-particle-${index}`,
      style: {
        '--x': `${endX.toFixed(1)}px`,
        '--y': `${endY.toFixed(1)}px`,
        '--mx': `${midX.toFixed(1)}px`,
        '--my': `${midY.toFixed(1)}px`,
        '--sx': `${(Math.cos(angle) * (18 + Math.random() * 18)).toFixed(1)}px`,
        '--sy': `${(Math.sin(angle) * (14 + Math.random() * 16)).toFixed(1)}px`,
        '--r': `${(angle * 180 / Math.PI).toFixed(1)}deg`,
        '--size': `${(2.2 + Math.random() * 3.2).toFixed(1)}px`,
        '--trail': `${(6 + Math.random() * 18).toFixed(1)}px`,
        '--duration': `${(0.58 + Math.random() * 0.42).toFixed(2)}s`,
        '--delay': `${(-1 + Math.random()).toFixed(2)}s`,
        color,
      },
    };
  }), []);
  const sideBarrages = useMemo<{ A: BarrageItem[]; B: BarrageItem[] }>(() => {
    const buildSideList = (
      side: CommentSide,
      comments: BattleComment[],
    ): BarrageItem[] => {
      const sorted = [...comments]
        .sort((a, b) => (b.likes + b.replyCount * 2) - (a.likes + a.replyCount * 2))
        .slice(0, 3)
        .map((comment) => ({
          id: `comment-barrage-${side}-${comment.id}`,
          side,
          author: comment.author,
          text: comment.text,
          likes: comment.likes,
        }));

      if (sorted.length >= 3) return sorted;

      return sorted;
    };

    return {
      A: buildSideList('A', leftComments),
      B: buildSideList('B', rightComments),
    };
  }, [leftComments, rightComments]);
  const getDisplayComments = useCallback((side: CommentSide, comments: BattleComment[]) => {
    let next = comments;
    if (activeTab === '只看我方' && userSide && side !== userSide) next = [];
    if (activeTab === '只看对方' && userSide && side === userSide) next = [];
    if (activeTab === '热门' || activeTab === '精华') {
      next = [...next].sort((a, b) => (b.likes + b.replyCount * 2) - (a.likes + a.replyCount * 2));
    }
    if (activeTab === '精华') {
      next = next.filter((comment) => comment.likes > 0 || comment.replyCount > 0);
    }
    return next;
  }, [activeTab, userSide]);
  const leaderBoard = useMemo(() => {
    const list = pkHeatRankQuery.data?.list ?? [];
    if (list.length === 0) return [];
    return list.slice(0, 8).map((row) => ({
      id: String(row.userId ?? row.rank ?? Math.random()),
      name: row.nickname || row.username || `用户${row.userId ?? ''}`,
      avatar: row.avatar || FALLBACK_AVATAR,
      rank: row.rank ?? null,
      score: row.heat ?? row.totalHeat ?? 0,
      side: (row.option === 'B' ? 'B' : 'A') as CommentSide,
    }));
  }, [pkHeatRankQuery.data?.list]);
  const personalContribution = useMemo(() => {
    const me = pkHeatMeQuery.data;
    const side = me?.myOption === 'A' || me?.myOption === 'B' ? me.myOption : myBetSide;
    return {
      side,
      commentCount: me?.myCommentCount ?? 0,
      likeCount: me?.receivedLikeCount ?? 0,
      betAmount: me?.myBetAmount ?? pkBetAmount,
      score: me?.myHeat ?? 0,
    };
  }, [myBetSide, pkBetAmount, pkHeatMeQuery.data]);
  // const topicMyBetRecords = useMemo(() => {
  //   const list = pkMyBetsQuery.data?.list ?? [];
  //   const filtered = list.filter((item) => String(item.topic?.id ?? item.bet?.topicId ?? '') === String(pkTopicId));
  //   return filtered.length > 0 ? filtered : list.slice(0, 5);
  // }, [pkMyBetsQuery.data?.list, pkTopicId]);
  const quickAmounts = [100, 300, 500, 1000];

  return (
    <div className="rb-live-page" style={themeStyle}>
      <div className="rb-main">
        <section className="rb-arena-card">
          <button type="button" className="rb-back" onClick={onBack}>
            <ChevronLeft size={16} />
            返回
          </button>
          <div className="rb-barrage-layer">
            <div className="rb-barrage-lane rb-barrage-lane-blue">
              {sideBarrages.A.map((item, index) => (
                <div
                  key={item.id}
                  className={`rb-barrage rb-barrage-blue rb-barrage-blue-${index + 1}`}
                >
                  <b>{item.author}</b>
                  <span>{item.text}</span>
                  <em>🔥 x{Math.max(1, item.likes || 1)}</em>
                </div>
              ))}
            </div>
            <div className="rb-barrage-lane rb-barrage-lane-red">
              {sideBarrages.B.map((item, index) => (
                <div
                  key={item.id}
                  className={`rb-barrage rb-barrage-red rb-barrage-red-${index + 1}`}
                >
                  <b>{item.author}</b>
                  <span>{item.text}</span>
                  <em>🔥 x{Math.max(1, item.likes || 1)}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="rb-player rb-player-left">
            <img src={leftHeroImage} alt={displayNews.optionA} />
          </div>
          <div className="rb-player rb-player-right">
            <img src={rightHeroImage} alt={displayNews.optionB} />
          </div>

          <div className="rb-hero-stats rb-left-stats">
            <h2>{displayNews.optionA}阵营</h2>
            <strong>{formatVotes(leftScore)}</strong>
            <span>热度值</span>
            <em>
              {leftScore === rightScore
                ? `战平 ${formatVotes(0)}`
                : `${leftScore > rightScore ? '领先' : '落后'} ${formatVotes(scoreDiff)}`}
            </em>
          </div>
          <div className="rb-hero-stats rb-right-stats">
            <h2>{displayNews.optionB}阵营</h2>
            <strong>{formatVotes(rightScore)}</strong>
            <span>热度值</span>
            <em>
              {leftScore === rightScore
                ? `战平 ${formatVotes(0)}`
                : `${rightScore > leftScore ? '领先' : '落后'} ${formatVotes(scoreDiff)}`}
            </em>
          </div>

          <div className="rb-headline-stack">
            <div className="rb-countdown">
              <span>战斗倒计时</span>
              <strong>{countdownText}</strong>
              <em>差值 {formatVotes(combatDiff)}</em>
            </div>
            <div className="rb-live-topic" aria-live="polite">
              <p className="rb-live-topic-kicker">
                <Radio size={14} strokeWidth={2.4} className="rb-live-topic-kicker-ico" aria-hidden />
                <span className="rb-live-topic-kicker-text">{liveTopicEyebrow}</span>
              </p>
              <p className="rb-live-topic-vs">
                <span className="rb-live-topic-side">{displayNews.optionA}</span>
                <span className="rb-live-topic-vs-sep">vs</span>
                <span className="rb-live-topic-side">{displayNews.optionB}</span>
              </p>
              {liveTopicSub ? <p className="rb-live-topic-sub">{liveTopicSub}</p> : null}
            </div>
          </div>

          <div className="rb-energy-panel">
            <RivalryBattleEnergyBar
              leftPct={leftPct}
              rightPct={rightPct}
              leftEnergyDuration={leftEnergyDuration}
              rightEnergyDuration={rightEnergyDuration}
              leftBubbles={leftEnergyBubbles}
              rightBubbles={rightEnergyBubbles}
              pkParticles={pkParticles}
            />
            <div className="rb-energy-foot">
              <span>{displayNews.oddsA.toFixed(2)}倍</span>
              <span className="rb-energy-side-meta rb-energy-side-meta-blue">
                <Shield size={14} />
                {leftRole}
                <strong>{formatVotes(leftHeat)}</strong>
              </span>
              <span><Swords size={16} /> {leaderName} 压场</span>
              <span className="rb-energy-side-meta rb-energy-side-meta-red">
                <Crosshair size={14} />
                {rightRole}
                <strong>{formatVotes(rightHeat)}</strong>
              </span>
              <span>{displayNews.oddsB.toFixed(2)}倍</span>
            </div>
          </div>

          <div className={`rb-bet-row ${showDrawBet ? 'rb-bet-row-three' : ''}`}>
            <button
              type="button"
              className={`rb-support rb-support-blue ${hasPkBet && myBetSide !== 'A' ? 'is-hidden-slot' : ''} ${hasPkBet && myBetSide === 'A' ? 'is-readonly' : ''}`}
              onClick={() => {
                if (!hasPkBet) openBetDialog('A');
              }}
              disabled={hasPkBet || !canOpenBetSide('A') || isBetting}
            >
              <span>{hasPkBet && myBetSide === 'A' ? `已支持${displayNews.optionA}` : `支持${displayNews.optionA}`}</span>
              <em>{hasPkBet && myBetSide === 'A' ? `${displayNews.oddsA.toFixed(1)}x` : '投币助威'}</em>
            </button>
            <div className="rb-bet-row-center" aria-hidden="true" />
            <button
              type="button"
              className={`rb-support rb-support-red ${hasPkBet && myBetSide !== 'B' ? 'is-hidden-slot' : ''} ${hasPkBet && myBetSide === 'B' ? 'is-readonly' : ''}`}
              onClick={() => {
                if (!hasPkBet) openBetDialog('B');
              }}
              disabled={hasPkBet || !canOpenBetSide('B') || isBetting}
            >
              <span>{hasPkBet && myBetSide === 'B' ? `已支持${displayNews.optionB}` : `支持${displayNews.optionB}`}</span>
              <em>{hasPkBet && myBetSide === 'B' ? `${displayNews.oddsB.toFixed(1)}x` : '投币助威'}</em>
            </button>
          </div>
        </section>

        <nav className="rb-tabs rb-tabs-hidden-gap pointer-events-none" aria-hidden="true">
          {/* {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab || (!activeTab && index === 2) ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
              tabIndex={-1}
            >
              {tab}
            </button>
          ))} */}
          <button type="button" className="rb-sort" tabIndex={-1}>最新评论 <ChevronDown size={14} /></button>
        </nav>

        <div className="rb-mobile-side-switch" role="tablist" aria-label="切换阵营评论">
          {[
            { side: 'A' as const, label: displayNews.optionA, pct: leftHeatPct, count: leftSupporters.length + leftComments.length },
            { side: 'B' as const, label: displayNews.optionB, pct: rightHeatPct, count: rightSupporters.length + rightComments.length },
          ].map((item) => (
            <button
              key={item.side}
              type="button"
              role="tab"
              aria-selected={mobileActiveSide === item.side}
              className={`${item.side === 'A' ? 'side-blue' : 'side-red'} ${mobileActiveSide === item.side ? 'active' : ''}`}
              onClick={() => {
                setMobileActiveSide(item.side);
                setSelectedSide(item.side);
                if (!hasPkBet) void submitRecordOption(item.side, 'select_side');
              }}
            >
              <span>{item.label}</span>
              <strong>{item.pct}% · {formatWan(item.count)}</strong>
            </button>
          ))}
        </div>

        <section className={`rb-comments-grid ${mobileActiveSide === 'A' ? 'rb-mobile-show-blue' : 'rb-mobile-show-red'}`}>
          {[
            { side: 'A' as const, title: `${displayNews.optionA}阵营`, count: leftSupporters.length + leftComments.length, comments: leftComments, color: 'blue' },
            { side: 'B' as const, title: `${displayNews.optionB}阵营`, count: rightSupporters.length + rightComments.length, comments: rightComments, color: 'red' },
          ].map((column) => {
            const displayComments = getDisplayComments(column.side, column.comments);
            const supporters = column.side === 'A' ? leftSupporters : rightSupporters;
            const sideLabel = column.side === 'A' ? displayNews.optionA : displayNews.optionB;
            const sideAccent = column.side === 'A' ? visualTheme.sideA.accent : visualTheme.sideB.accent;
            const columnCanComment = canCommentOnSide(column.side);
            const columnCanDownvote = canDownvoteOnSide(column.side);

            return (
            <div key={column.side} className={`rb-comment-column rb-${column.color}-column`}>
              <div className="rb-column-head">
                <h3>{column.title} <span>支持者 {formatWan(column.count)}</span></h3>
                <strong>{column.side === 'A' ? `🔥 火力 ${leftHeatPct}%` : `🔥 火力 ${rightHeatPct}%`}</strong>
              </div>
              <div className="rb-supporter-strip">
                {supporters.length === 0 ? (
                  <span>等待首批阵营成员加入</span>
                ) : (
                  supporters.slice(0, 10).map((supporter) => <AvatarStack key={supporter.id} supporter={supporter} />)
                )}
              </div>
              <div className="rb-comment-list">
                {displayComments.length === 0 ? (
                  <div className="rb-empty">该阵营还在集结，抢先发出第一条弹幕。</div>
                ) : displayComments.slice(0, 8).map((comment, index) => (
                  <div className="rb-comment-card-wrap" key={comment.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <BattleCommentCard
                      comment={comment}
                      side={column.side}
                      sideLabel={sideLabel}
                      sideAccent={sideAccent}
                      useNeutralStyle={useNeutralCommentStyle}
                      canInteract={columnCanComment}
                      canDownvote={columnCanDownvote}
                      onToggleLike={handleToggleLike}
                      onToggleDownvote={handleToggleDownvote}
                      onOpenReply={handleOpenReply}
                      isReplying={replyingTo?.commentId === comment.id}
                      replyDraft={replyingTo?.commentId === comment.id ? replyDraft : ''}
                      onReplyDraftChange={setReplyDraft}
                      onSubmitReply={handleSubmitReply}
                      onCancelReply={() => {
                        setReplyingTo(null);
                        setReplyDraft('');
                      }}
                      replySubmitting={pkReplyCommentMutation.isLoading}
                      likePending={likePendingIds.has(comment.id)}
                      downvotePending={downvotePendingIds.has(comment.id)}
                      latestReplyEvent={latestReplyEvent}
                    />
                  </div>
                ))}
                {column.side === 'A' && hasMoreCommentsA ? (
                  <button type="button" className="rb-load-more" onClick={() => setCursorA(nextCursorA ?? 0)}>加载更多</button>
                ) : null}
                {column.side === 'B' && hasMoreCommentsB ? (
                  <button type="button" className="rb-load-more" onClick={() => setCursorB(nextCursorB ?? 0)}>加载更多</button>
                ) : null}
              </div>
              <div className={`rb-input-row ${!columnCanComment ? 'is-locked' : ''}`}>
                <input
                  value={selectedSide === column.side ? draft : ''}
                  placeholder={columnCanComment ? `为${column.title}发声...` : hasPkBet ? '仅可评论你支持的一方' : '为阵营发声...'}
                  onFocus={() => setSelectedSide(column.side)}
                  onChange={(event) => {
                    setSelectedSide(column.side);
                    setDraft(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSubmitComment();
                  }}
                />
                <button
                  type="button"
                  className="send-btn"
                  onClick={() => void handleSubmitComment()}
                  disabled={!columnCanComment || selectedSide !== column.side || !draft.trim()}
                >
                  <Send size={15} />
                  发送
                </button>
              </div>
            </div>
          );
          })}
        </section>
      </div>

      <section className="rb-mobile-info-panels" aria-label="场内数据">
        <RivalryBattleRightRail
          optionA={displayNews.optionA}
          optionB={displayNews.optionB}
          oddsA={displayNews.oddsA}
          oddsB={displayNews.oddsB}
          balance={balance}
          betAmount={betAmount}
          quickAmounts={quickAmounts}
          hasPkBet={hasPkBet}
          myBetSide={myBetSide}
          pkBetAmount={pkBetAmount}
          pkPhase={pkPhase}
          canPlaceBet={canPlaceBet}
          isBetting={isBetting}
          estimatedPayout={estimatedPayout}
          rankMode={rankMode}
          onRankModeChange={setRankMode}
          rankRows={leaderBoard}
          rankLoading={pkHeatRankQuery.isLoading}
          personalStats={{
            likeCount: personalContribution.likeCount,
            commentCount: personalContribution.commentCount,
            betAmount: personalContribution.betAmount,
            heatScore: personalContribution.score,
            side: personalContribution.side,
          }}
          visualTheme={visualTheme}
          onBetAmountChange={setBetAmount}
          onQuickAmount={(amount) => setBetAmount(String(amount))}
          onOpenBet={openBetDialog}
          onConfirmBet={() => openBetDialog(betIntent)}
          canPkSettle={canPkSettle}
          isSettling={pkSettleMutation.isLoading}
          onSettle={() => void handlePkSettle()}
          // myBetRecords={topicMyBetRecords}
          // myBetsLoading={pkMyBetsQuery.isLoading}
        />
      </section>

      {betDialogSide ? (
        <div className="rb-bet-dialog-mask" role="presentation" onMouseDown={() => setBetDialogSide(null)}>
          <div
            className={`rb-bet-dialog ${betDialogSide === 'A' ? 'dialog-blue' : betDialogSide === 'B' ? 'dialog-red' : 'dialog-neutral'}`}
            role="dialog"
            aria-modal="true"
            aria-label="确认下注"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="rb-bet-dialog-head">
              <span>确认投币助威</span>
              <button type="button" onClick={() => setBetDialogSide(null)}>×</button>
            </div>
            <div className="rb-bet-dialog-side">
              <small>支持阵营</small>
              <strong>{dialogBetName}</strong>
              <em>{dialogBetOdds.toFixed(2)}倍</em>
            </div>
            <div className="rb-bet-dialog-grid">
              <div>
                <span>下注金额</span>
                <strong>{formatVotes(effectiveBetAmount)} 龟币</strong>
              </div>
              <div>
                <span>预计派奖</span>
                <strong>{formatVotes(dialogEstimatedPayout)}</strong>
              </div>
              <div>
                <span>账户余额</span>
                <strong>{formatVotes(balance)}</strong>
              </div>
            </div>
            <div className="rb-bet-dialog-actions">
              <button type="button" className="cancel" onClick={() => setBetDialogSide(null)}>再想想</button>
              <button
                type="button"
                className="confirm"
                onClick={() => void confirmBetDialog()}
                disabled={isBetting || (betDialogSide ? !canOpenBetSide(betDialogSide) : true)}
              >
                {isBetting ? '下注中...' : '确认下注'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="rb-mobile-panel-trigger"
        onClick={() => setMobilePanelOpen(true)}
      >
        <span>下注助威</span>
        <strong>{betStatusText}</strong>
      </button>

      {mobilePanelOpen ? (
        <button
          type="button"
          className="rb-mobile-panel-backdrop"
          aria-label="关闭移动端操作面板"
          onClick={() => setMobilePanelOpen(false)}
        />
      ) : null}

      <aside className={`rb-sidebar ${mobilePanelOpen ? 'rb-sidebar-mobile-open' : ''}`}>
        <div className="rb-mobile-panel-head">
          <div>
            <span>下注助威</span>
            <strong>{hasPkBet ? '本场已下注' : '选择阵营 · 输入龟币'}</strong>
          </div>
          <button type="button" onClick={() => setMobilePanelOpen(false)}>×</button>
        </div>
        <RivalryBattleRightRail
          optionA={displayNews.optionA}
          optionB={displayNews.optionB}
          oddsA={displayNews.oddsA}
          oddsB={displayNews.oddsB}
          balance={balance}
          betAmount={betAmount}
          quickAmounts={quickAmounts}
          hasPkBet={hasPkBet}
          myBetSide={myBetSide}
          pkBetAmount={pkBetAmount}
          pkPhase={pkPhase}
          canPlaceBet={canPlaceBet}
          isBetting={isBetting}
          estimatedPayout={estimatedPayout}
          rankMode={rankMode}
          onRankModeChange={setRankMode}
          rankRows={leaderBoard}
          rankLoading={pkHeatRankQuery.isLoading}
          personalStats={{
            likeCount: personalContribution.likeCount,
            commentCount: personalContribution.commentCount,
            betAmount: personalContribution.betAmount,
            heatScore: personalContribution.score,
            side: personalContribution.side,
          }}
          visualTheme={visualTheme}
          onBetAmountChange={setBetAmount}
          onQuickAmount={(amount) => setBetAmount(String(amount))}
          onOpenBet={openBetDialog}
          onConfirmBet={() => openBetDialog(betIntent)}
          canPkSettle={canPkSettle}
          isSettling={pkSettleMutation.isLoading}
          onSettle={() => void handlePkSettle()}
          // myBetRecords={topicMyBetRecords}
          // myBetsLoading={pkMyBetsQuery.isLoading}
        />
      </aside>
    </div>
  );
};
