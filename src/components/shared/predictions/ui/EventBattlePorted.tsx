import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Crosshair,
  Flame,
  MessageCircleReply,
  Radio,
  Send,
  Shield,
  Sparkles,
  Swords,
  ThumbsUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useRequestUserCurrent } from '@/hook/useRequest';
import { useRequestCoinMe } from '@/hook/useCoinRequest';
import {
  type CommentResponse,
  useRequestCommentComments,
  useRequestCommentReplies,
  useRequestCreateComment,
} from '@/hook/useCommentRequest';
import { useRequestLikeEntity, useRequestUnlikeEntity } from '@/hook/useTopicRequest';
import type { PetSkin } from '@/data/mock_data';
import type { PredictionCardItem } from './predictionCard';
import './EventBattlePorted.css';

type CommentSide = 'A' | 'B';

interface EventBattleProps {
  news: PredictionCardItem;
  onBack: () => void;
  userSide: 'A' | 'B' | null;
  onBet?: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => void;
  bettingMarketId?: number | null;
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

const ENTITY_PREDICT_A = 'predictA';
const ENTITY_PREDICT_B = 'predictB';
const FALLBACK_AVATAR = '/games/event-battle/img/tx.png';

function hasValue(value: unknown) {
  return value !== undefined && value !== null && value !== '';
}

function formatVotes(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN');
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

function getCommentUserName(comment?: CommentResponse | null) {
  return comment?.user?.nickname || comment?.user?.username || `用户${comment?.user?.id ?? ''}` || '匿名用户';
}

function getCommentAvatar(comment?: CommentResponse | null) {
  return comment?.user?.avatar || comment?.user?.smallAvatar || FALLBACK_AVATAR;
}

function mapCommentToBattleComment(comment: CommentResponse): BattleComment {
  return {
    id: String(comment.id),
    author: getCommentUserName(comment),
    avatar: getCommentAvatar(comment),
    time: formatBattleTime(comment.createTime),
    text: comment.content || '',
    likes: comment.likeCount ?? 0,
    liked: Boolean(comment.liked),
    replyCount: comment.replyCount ?? 0,
    ipLocation: comment.ipLocation,
  };
}

function mapReplyToBattleReply(comment: CommentResponse): BattleReply {
  return {
    id: String(comment.id),
    author: getCommentUserName(comment),
    avatar: getCommentAvatar(comment),
    time: formatBattleTime(comment.createTime),
    text: comment.content || '',
    likes: comment.likeCount ?? 0,
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

function buildInitialFeed(news: PredictionCardItem, commentsA: BattleComment[], commentsB: BattleComment[]) {
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
  onToggleLike: (comment: BattleComment, side: CommentSide) => void;
  onOpenReply: (comment: BattleComment, side: CommentSide) => void;
  isReplying: boolean;
  replyDraft: string;
  onReplyDraftChange: (value: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  replySubmitting: boolean;
  likePending: boolean;
  latestReplyEvent: LatestReplyEvent | null;
}

const BattleCommentCard: React.FC<BattleCommentCardProps> = ({
  comment,
  side,
  onToggleLike,
  onOpenReply,
  isReplying,
  replyDraft,
  onReplyDraftChange,
  onSubmitReply,
  onCancelReply,
  replySubmitting,
  likePending,
  latestReplyEvent,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replyCursor, setReplyCursor] = useState<number | string>(0);
  const [repliesState, setRepliesState] = useState<BattleReply[]>([]);
  const repliesQuery = useRequestCommentReplies({
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
    <div className={`comment-item ${side === 'A' ? 'comment-red' : 'comment-blue'} ${likePending ? 'comment-busy' : ''}`}>
      <div className="c-left">
        <img className="c-avatar" src={comment.avatar || FALLBACK_AVATAR} alt={comment.author} />
      </div>
      <div className="c-content">
        <div className="c-user-info">
          <span className="c-nickname">{comment.author}</span>
          <span className="c-time">{comment.time}</span>
        </div>
        <div className="c-meta-line">
          <span className={`c-side-tag ${side === 'A' ? 'tag-red' : 'tag-blue'}`}>{side === 'A' ? '红方' : '蓝方'}</span>
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
          <button type="button" className="action-btn" onClick={() => onOpenReply(comment, side)}>
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

export const EventBattle: React.FC<EventBattleProps> = ({
  news,
  onBack,
  userSide,
  onBet,
  bettingMarketId,
  equippedSkin,
  onRequireAuth,
}) => {
  const battleEntityId = useMemo(() => news.marketId ?? news.id, [news.id, news.marketId]);
  const currentUserQuery = useRequestUserCurrent();
  const coinMeQuery = useRequestCoinMe();
  const createCommentMutation = useRequestCreateComment();
  const likeMutation = useRequestLikeEntity();
  const unlikeMutation = useRequestUnlikeEntity();
  const [cursorA, setCursorA] = useState<number | string>(0);
  const [cursorB, setCursorB] = useState<number | string>(0);
  const [commentsAState, setCommentsAState] = useState<BattleComment[]>([]);
  const [commentsBState, setCommentsBState] = useState<BattleComment[]>([]);
  const [selectedSide, setSelectedSide] = useState<CommentSide>(userSide ?? 'A');
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; side: CommentSide } | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [latestReplyEvent, setLatestReplyEvent] = useState<LatestReplyEvent | null>(null);
  const [showBetPanel, setShowBetPanel] = useState(true);
  const [betIntent, setBetIntent] = useState<CommentSide>(userSide ?? 'A');
  const [betAmount, setBetAmount] = useState('100');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likePendingIds, setLikePendingIds] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement>(null);
  const currentUserName = currentUserQuery.data?.nickname || currentUserQuery.data?.username || '你';

  const commentsAQuery = useRequestCommentComments({
    entityType: ENTITY_PREDICT_A,
    entityId: battleEntityId,
    cursor: cursorA,
    enabled: hasValue(battleEntityId),
  });
  const commentsBQuery = useRequestCommentComments({
    entityType: ENTITY_PREDICT_B,
    entityId: battleEntityId,
    cursor: cursorB,
    enabled: hasValue(battleEntityId),
  });

  const canComment = Boolean(currentUserQuery.data?.id);
  const balance = coinMeQuery.data?.balance ?? 0;
  const numericBetAmount = Number(betAmount);
  const leftVotes = news.votes?.A ?? 0;
  const rightVotes = news.votes?.B ?? 0;
  const totalVotes = Math.max(1, leftVotes + rightVotes);
  const leftPct = clampPct(Math.round((leftVotes / totalVotes) * 100));
  const isBetting = typeof news.marketId === 'number' && bettingMarketId === news.marketId;
  const canPlaceBet = typeof onBet === 'function' && news.status === 'open';
  const activeBetOdds = betIntent === 'A' ? news.oddsA : news.oddsB;
  const estimatedPayout = Number.isFinite(numericBetAmount) && numericBetAmount > 0
    ? Math.floor(numericBetAmount * activeBetOdds)
    : 0;

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

  useEffect(() => {
    const mapped = (commentsAQuery.data?.results ?? []).map(mapCommentToBattleComment);
    if (mapped.length === 0) {
      if (cursorA === 0) setCommentsAState([]);
      return;
    }
    setCommentsAState((prev) => (cursorA === 0 ? mapped : mergeById(prev, mapped)));
  }, [commentsAQuery.data, cursorA]);

  useEffect(() => {
    const mapped = (commentsBQuery.data?.results ?? []).map(mapCommentToBattleComment);
    if (mapped.length === 0) {
      if (cursorB === 0) setCommentsBState([]);
      return;
    }
    setCommentsBState((prev) => (cursorB === 0 ? mapped : mergeById(prev, mapped)));
  }, [commentsBQuery.data, cursorB]);

  useEffect(() => {
    setCursorA(0);
    setCursorB(0);
    setCommentsAState([]);
    setCommentsBState([]);
    setSelectedSide(userSide ?? 'A');
    setBetIntent(userSide ?? 'A');
    setDraft('');
    setReplyDraft('');
    setReplyingTo(null);
    setFeedItems([]);
    setLatestReplyEvent(null);
    setShowBetPanel(true);
  }, [battleEntityId, news.id, userSide]);

  useEffect(() => {
    if (feedItems.length > 0) return;
    setFeedItems(buildInitialFeed(news, commentsAState, commentsBState));
  }, [commentsAState, commentsBState, feedItems.length, news]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = 0;
  }, [feedItems]);

  const leftComments = commentsAState;
  const rightComments = commentsBState;
  const leftSupporters = useMemo(() => buildSupporters(leftComments, 'left'), [leftComments]);
  const rightSupporters = useMemo(() => buildSupporters(rightComments, 'right'), [rightComments]);
  const leftHeat = useMemo(() => calcSideHeat(leftComments), [leftComments]);
  const rightHeat = useMemo(() => calcSideHeat(rightComments), [rightComments]);
  const totalHeat = Math.max(1, leftHeat + rightHeat);
  const leftHeatPct = clampPct(Math.round((leftHeat / totalHeat) * 100));
  const rightHeatPct = 100 - leftHeatPct;
  const leaderSide: CommentSide = leftHeat >= rightHeat ? 'A' : 'B';
  const leaderName = leaderSide === 'A' ? news.optionA : news.optionB;
  const combatDiff = Math.abs(leftHeat - rightHeat);
  const leftMomentum = Math.min(99, Math.round((leftVotes + leftHeat + leftComments.length * 12) / Math.max(1, totalVotes + totalHeat) * 100));
  const rightMomentum = Math.min(99, Math.round((rightVotes + rightHeat + rightComments.length * 12) / Math.max(1, totalVotes + totalHeat) * 100));
  const leftRole = userSide === 'A' ? '你当前在红方阵营' : '意见领袖';
  const rightRole = userSide === 'B' ? '你当前在蓝方阵营' : '破光杀手';
  const liveText = replyingTo
    ? `正在回复 @${replyingTo.authorName}`
    : feedItems[feedItems.length - 1]?.text || 'LIVE 实时对战中';

  const handleOpenReply = useCallback((comment: BattleComment, side: CommentSide) => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    setReplyingTo({ commentId: comment.id, authorName: comment.author, side });
    setReplyDraft('');
  }, [canComment, ensureAuth]);

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

    const nextLiked = !comment.liked;
    const nextLikes = Math.max(0, comment.likes + (nextLiked ? 1 : -1));
    setLikePendingIds((prev) => new Set(prev).add(comment.id));
    updateCommentList(side, (items) =>
      items.map((item) => (item.id === comment.id ? { ...item, liked: nextLiked, likes: nextLikes } : item)),
    );

    try {
      if (nextLiked) {
        await likeMutation.mutateAsync({ entityType: 'comment', entityId: comment.id });
        appendFeed(side, `${comment.author} 获得了一次热度加持`);
      } else {
        await unlikeMutation.mutateAsync({ entityType: 'comment', entityId: comment.id });
      }
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
  }, [appendFeed, canComment, ensureAuth, likeMutation, unlikeMutation, updateCommentList]);

  const handleSubmitReply = useCallback(async () => {
    const text = replyDraft.trim();
    if (!replyingTo || !text) return;
    if (!canComment) {
      ensureAuth();
      return;
    }

    try {
      const createdReply = await createCommentMutation.mutateAsync({
        entityType: 'comment',
        entityId: replyingTo.commentId,
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
      void commentsAQuery.refetch();
      void commentsBQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [
    appendFeed,
    canComment,
    commentsAQuery,
    commentsBQuery,
    createCommentMutation,
    currentUserName,
    ensureAuth,
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

    try {
      const createdComment = await createCommentMutation.mutateAsync({
        entityType: selectedSide === 'A' ? ENTITY_PREDICT_A : ENTITY_PREDICT_B,
        entityId: battleEntityId,
        content: text,
      });

      const mapped = mapCommentToBattleComment(createdComment);
      updateCommentList(selectedSide, (items) => [mapped, ...items.filter((item) => item.id !== mapped.id)]);
      setDraft('');
      appendFeed(selectedSide, `${currentUserName} 为${selectedSide === 'A' ? news.optionA : news.optionB}阵营发起了新评论`);
      void commentsAQuery.refetch();
      void commentsBQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [
    appendFeed,
    battleEntityId,
    canComment,
    commentsAQuery,
    commentsBQuery,
    createCommentMutation,
    currentUserName,
    draft,
    ensureAuth,
    news.optionA,
    news.optionB,
    selectedSide,
    updateCommentList,
  ]);

  const handleBet = useCallback(() => {
    if (!onBet) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!Number.isFinite(numericBetAmount) || numericBetAmount <= 0 || numericBetAmount > balance) return;
    onBet(news.id, betIntent, activeBetOdds, numericBetAmount);
    appendFeed(betIntent, `${currentUserName} 为${betIntent === 'A' ? news.optionA : news.optionB}阵营追加了 ${formatVotes(numericBetAmount)} 龟币`);
  }, [
    activeBetOdds,
    appendFeed,
    balance,
    betIntent,
    canComment,
    currentUserName,
    ensureAuth,
    news.id,
    news.optionA,
    news.optionB,
    numericBetAmount,
    onBet,
  ]);

  return (
    <div className="pk-page live-upgraded">
      <div className="pk-page-top">
        <button type="button" className="pk-page-back" onClick={onBack}>
          <ChevronLeft size={16} />
          返回
        </button>
        <img src="/games/event-battle/img/top.jpg" alt={news.title} className="top-img" />
        <div className="top-noise" />
        <div className="battle-hero-copy">
          <div className="hero-kicker">
            <Radio size={14} />
            LIVE CONFLICT ROOM
          </div>
          <h1>{news.title}</h1>
          <p>{news.summary || '选择阵营，下注、发言、回复和点赞都会推动战场声量。'}</p>
          <div className="hero-stats">
            <span><Activity size={13} /> 战况差值 {formatVotes(combatDiff)}</span>
            <span><Trophy size={13} /> 领先阵营 {leaderName}</span>
            <span><Crosshair size={13} /> 总火力 {formatVotes(leftHeat + rightHeat)}</span>
          </div>
        </div>
      </div>

      <div className="team-group-main">
        <div className="arena-ambient" aria-hidden="true">
          <span className="ambient-beam beam-red" />
          <span className="ambient-beam beam-blue" />
          <span className="spark spark-1" />
          <span className="spark spark-2" />
          <span className="spark spark-3" />
          <span className="spark spark-4" />
          <span className="spark spark-5" />
          <span className="laser laser-red" />
          <span className="laser laser-blue" />
          <span className="shock-ring ring-1" />
          <span className="shock-ring ring-2" />
        </div>
        <div className="pk-page-container">
          <div className="kuang">
            <img src="/games/event-battle/img/kuang.png" alt="" className="kuang-img" />
            <div className="kuang-con">
              <span className="brief-label">BATTLE BRIEF</span>
              {news.summary || news.title}
            </div>
          </div>

          <div className="team-group">
            <div className="team-red">
              <div className="team_tx">
                <img src={FALLBACK_AVATAR} alt={news.optionA} />
              </div>
              <div className="team-info text-start">
                <span className="team-chip red-chip"><Flame size={12} /> RED SIDE</span>
                <div className="t_name">{news.optionA}</div>
                <span>{leftRole}</span>
                <strong>压制指数 {leftMomentum}</strong>
              </div>
            </div>
            <div className="versus-core">
              <Swords size={30} />
              <span>VS</span>
            </div>
            <div className="team-blue">
              <div className="team-info text-end">
                <span className="team-chip blue-chip"><Shield size={12} /> BLUE SIDE</span>
                <div className="t_name">{news.optionB}</div>
                <span>{rightRole}</span>
                <strong>反击指数 {rightMomentum}</strong>
              </div>
              <div className="team_tx">
                <img src={FALLBACK_AVATAR} alt={news.optionB} />
              </div>
            </div>
          </div>

          <div className="pk-container">
            <div className="team-names-row">
              <div className="team-label-wrap label-red">
                <div className="top-duel-avatar top-red-avatar">
                  <img src={FALLBACK_AVATAR} alt={news.optionA} />
                  <span />
                </div>
                <div>
                  <div className="team-label name-red">{news.optionA}</div>
                  <div className="team-label-sub">{formatVotes(leftVotes)} 票 · {formatVotes(leftHeat)} 火力</div>
                </div>
              </div>
              <div className="team-label-wrap label-blue">
                <div>
                  <div className="team-label name-blue">{news.optionB}</div>
                  <div className="team-label-sub">{formatVotes(rightVotes)} 票 · {formatVotes(rightHeat)} 火力</div>
                </div>
                <div className="top-duel-avatar top-blue-avatar">
                  <img src={FALLBACK_AVATAR} alt={news.optionB} />
                  <span />
                </div>
              </div>
            </div>

            <div className="bar-outer">
              <div className="bar-energy-bg" />
              <div className="bar-red" style={{ width: `${leftPct}%` }} />
              <div className="divider-line" style={{ left: `${leftPct}%` }}>
                <img src="/games/event-battle/img/fire.png" alt="" className="divider-fire" />
              </div>
              <div className="bar-blue" />
              <span className="bar-lightning lightning-one" />
              <span className="bar-lightning lightning-two" />
              <span className="bar-impact" style={{ left: `${leftPct}%` }} />
              <span className="bar-shockwave" style={{ left: `${leftPct}%` }} />
            </div>

            <div className="score-row">
              <div className="score-val score-red">{formatVotes(leftVotes)}</div>
              <div className="score-mid">
                <span>{formatVotes(leftHeat)} 火力</span>
                <span>{formatVotes(rightHeat)} 火力</span>
              </div>
              <div className="score-val score-blue">{formatVotes(rightVotes)}</div>
            </div>
          </div>
        </div>

        <div className="title-wrap">
          <img src="/games/event-battle/img/title01.png" alt="撕裂带" className="title-img" />
          <div className="title-copy">
            <span>声量、回复、点赞实时结算为战场火力</span>
          </div>
        </div>

        <div className="pinglun-main">
          <div className="pl-box red_left">
            <div className="pl-header">
              <div className="team-info">
                <span className="team-name">{news.optionA}</span>
                <span className="team-score">{formatVotes(leftVotes)}</span>
              </div>
              <div className="side-pressure">
                <span>火力占比</span>
                <strong>{leftHeatPct}%</strong>
              </div>
            </div>

            <div className="pl-users-section">
              <div className="section-title">
                <span>活跃成员</span>
                <span className="user-count">{formatVotes(leftSupporters.length)}</span>
              </div>
              <div className="users-scroll-area">
                {leftSupporters.length > 0 ? (
                  <div className="user-grid">
                    {leftSupporters.map((supporter) => (
                      <div key={supporter.id} className="grid-item">
                        <AvatarStack supporter={supporter} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="member-empty">暂无评论成员</div>
                )}
              </div>
            </div>

            <div className="pl-comment-area">
              {leftComments.length === 0 ? (
                <div className="empty-comment">红方还在集结中，抢先发出第一条战场评论吧。</div>
              ) : (
                leftComments.map((comment, index) => (
                  <div key={comment.id} style={{ animationDelay: `${Math.min(index, 7) * 0.05}s` }}>
                    <BattleCommentCard
                      comment={comment}
                      side="A"
                      onToggleLike={handleToggleLike}
                      onOpenReply={handleOpenReply}
                      isReplying={replyingTo?.commentId === comment.id}
                      replyDraft={replyDraft}
                      onReplyDraftChange={setReplyDraft}
                      onSubmitReply={handleSubmitReply}
                      onCancelReply={() => {
                        setReplyDraft('');
                        setReplyingTo(null);
                      }}
                      replySubmitting={createCommentMutation.isLoading}
                      likePending={likePendingIds.has(comment.id)}
                      latestReplyEvent={latestReplyEvent}
                    />
                  </div>
                ))
              )}
              {commentsAQuery.data?.hasMore ? (
                <button type="button" className="load-more-btn" onClick={() => setCursorA(commentsAQuery.data?.cursor ?? 0)}>
                  加载更多红方评论
                </button>
              ) : null}
            </div>
          </div>

          <div className="pl-center">
            <div className="live-status">
              <div className="pulse-icon" />
              <span className="live-text">{liveText}</span>
            </div>

            <div className={`clash-meter leader-${leaderSide}`}>
              <div className="clash-meter-head">
                <div className="clash-side clash-red">
                  <span>RED STRIKE</span>
                  <strong>{news.optionA}</strong>
                </div>
                <div className="clash-core">
                  <Swords size={18} />
                  <span>{leftPct}% : {100 - leftPct}%</span>
                </div>
                <div className="clash-side clash-blue">
                  <span>BLUE COUNTER</span>
                  <strong>{news.optionB}</strong>
                </div>
              </div>
              <div className="bar-outer arena-bar">
                <div className="bar-energy-bg" />
                <div className="bar-red" style={{ width: `${leftPct}%` }} />
                <div className="divider-line" style={{ left: `${leftPct}%` }}>
                  <img src="/games/event-battle/img/fire.png" alt="" className="divider-fire" />
                </div>
                <div className="bar-blue" />
                <span className="bar-lightning lightning-one" />
                <span className="bar-lightning lightning-two" />
                <span className="bar-impact" style={{ left: `${leftPct}%` }} />
                <span className="bar-shockwave" style={{ left: `${leftPct}%` }} />
              </div>
              <div className="clash-meter-foot">
                <span>{formatVotes(leftVotes)} 票仓 · {formatVotes(leftHeat)} 火力</span>
                <span>{formatVotes(rightVotes)} 票仓 · {formatVotes(rightHeat)} 火力</span>
              </div>
            </div>

            <div className={`command-deck leader-${leaderSide}`}>
              <div className="command-card red-command">
                <span>RED FIREPOWER</span>
                <strong>{formatVotes(leftHeat)}</strong>
                <em style={{ width: `${leftHeatPct}%` }} />
              </div>
              <div className="command-vs">
                <Swords size={18} />
                <span>{leaderName} 正在压场</span>
              </div>
              <div className="command-card blue-command">
                <span>BLUE FIREPOWER</span>
                <strong>{formatVotes(rightHeat)}</strong>
                <em style={{ width: `${rightHeatPct}%` }} />
              </div>
            </div>

            <div className="battle-report">
              <div className="scan-line" />
              <div ref={feedRef} className="report-scroll-content">
                {feedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`report-item new-entry ${item.side === 'A' ? 'report-red' : 'report-blue'}`}
                    style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
                  >
                    {item.side === 'A' ? '🔥' : '⚡'}
                    <span className={`r-name ${item.side === 'A' ? 'r-red' : 'r-blue'}`}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="battle-tishi">
              <img src="/games/event-battle/img/kuang2.png" alt="" className="ts-bj" />
              <div className="battle-ts-box">
                <img src="/games/event-battle/img/hj.png" alt="" className="battle-icon" />
                <h5>{equippedSkin ? `${equippedSkin.name} 上场` : '战场情报已接入'}</h5>
                <p>
                  情报员 <span>{currentUserName}</span> 正在为
                  <span>{selectedSide === 'A' ? news.optionA : news.optionB}</span> 汇聚战场声量
                </p>
              </div>
            </div>

            <div className="vs-players">
              <div className="p-card red-p">
                <div className="p-avatar-wrap">
                  <img src={FALLBACK_AVATAR} alt={news.optionA} />
                  <div className="mvp-icon" />
                </div>
                <div className="p-info">
                  <div className="p-name">{news.optionA}</div>
                  <div className="p-level">意见领袖</div>
                </div>
              </div>

              <div className="vs-mid-icon">
                <img src="/games/event-battle/img/vs2.png" alt="VS" />
              </div>

              <div className="p-card blue-p">
                <div className="p-avatar-wrap">
                  <img src={FALLBACK_AVATAR} alt={news.optionB} />
                </div>
                <div className="p-info">
                  <div className="p-name">{news.optionB}</div>
                  <div className="p-level">破光杀手</div>
                </div>
              </div>
            </div>

            <div className="props-section">
              <div className="props-title">战场实时技能</div>
              <div className="props-grid">
                <div className="prop-card red-prop">
                  <div className="prop-icon-box">
                    <Flame size={24} />
                    <span className="prop-tag">RED</span>
                  </div>
                  <div className="prop-info">
                    <div className="prop-name">爆燃声浪</div>
                    <div className="prop-desc">新评论入场<br />立刻推高阵营火力</div>
                  </div>
                </div>

                <div className="prop-card blue-prop">
                  <div className="prop-icon-box">
                    <Shield size={24} />
                    <span className="prop-tag">BLUE</span>
                  </div>
                  <div className="prop-info">
                    <div className="prop-name">棱镜反击</div>
                    <div className="prop-desc">回复扩散观点<br />形成反打护城河</div>
                  </div>
                </div>

                <div className="prop-card neutral-prop">
                  <div className="prop-icon-box">
                    <Zap size={24} />
                    <span className="prop-tag">ALL</span>
                  </div>
                  <div className="prop-info">
                    <div className="prop-name">脉冲增幅</div>
                    <div className="prop-desc">点赞触发战报<br />刷新实时热区</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bet-panel">
              <button type="button" className="bet-panel-toggle" onClick={() => setShowBetPanel(true)}>
                <div>
                  <div className="bet-title">立即下注 · 火控台</div>
                  <div className="bet-subtitle">
                    余额 {formatVotes(balance)} · 当前选择 {betIntent === 'A' ? news.optionA : news.optionB} · 赔率 {activeBetOdds.toFixed(2)}x
                  </div>
                </div>
                <span className="bet-live-pill">下注入口</span>
              </button>

              <div className={`bet-panel-body ${showBetPanel ? 'bet-panel-open' : ''}`}>
                  <div className="bet-live-data">
                    <div>
                      <span>账户余额</span>
                      <strong>{formatVotes(balance)}</strong>
                    </div>
                    <div>
                      <span>预计派奖</span>
                      <strong>{formatVotes(estimatedPayout)}</strong>
                    </div>
                    <div>
                      <span>市场状态</span>
                      <strong>{canPlaceBet ? '可下注' : '已暂停'}</strong>
                    </div>
                  </div>
                  <div className="bet-grid">
                    <button
                      type="button"
                      className={`bet-side-btn ${betIntent === 'A' ? 'bet-side-active red-side' : ''}`}
                      onClick={() => setBetIntent('A')}
                    >
                      <span>{news.optionA}</span>
                      <strong>{news.oddsA.toFixed(2)}x</strong>
                    </button>
                    <button
                      type="button"
                      className={`bet-side-btn ${betIntent === 'B' ? 'bet-side-active blue-side' : ''}`}
                      onClick={() => setBetIntent('B')}
                    >
                      <span>{news.optionB}</span>
                      <strong>{news.oddsB.toFixed(2)}x</strong>
                    </button>
                  </div>

                  <div className="quick-amounts">
                    {[100, 300, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className="quick-btn"
                        onClick={() => setBetAmount(String(amount))}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>

                  <div className="bet-input-row">
                    <span className="bet-input-label">Coins</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={betAmount}
                      onChange={(event) => setBetAmount(event.target.value)}
                      className="bet-input"
                      placeholder="输入下注金额"
                    />
                    <button
                      type="button"
                      className={`bet-confirm-btn ${betIntent === 'A' ? 'red-side' : 'blue-side'}`}
                      onClick={handleBet}
                      disabled={!canPlaceBet || isBetting || !Number.isFinite(numericBetAmount) || numericBetAmount <= 0 || numericBetAmount > balance}
                    >
                      <Zap size={13} />
                      {isBetting ? '下注中...' : '确认下注'}
                    </button>
                  </div>

                  <div className="battle-hud-note">
                    <span>预计派奖 {formatVotes(estimatedPayout)}</span>
                    <span>{canPlaceBet ? '当前可下注' : '当前不可下注'}</span>
                  </div>
                </div>
            </div>

            <div className="center-footer">
              {replyingTo ? (
                <div className="replying-banner">
                  正在回复 <span>@{replyingTo.authorName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyDraft('');
                      setReplyingTo(null);
                    }}
                  >
                    取消
                  </button>
                </div>
              ) : null}

              <div className={`side-switch-row side-${selectedSide}`}>
                <button
                  type="button"
                  className={`side-switch-btn ${selectedSide === 'A' ? 'side-switch-active red-side' : ''}`}
                  onClick={() => setSelectedSide('A')}
                >
                  评论红方
                </button>
                <button
                  type="button"
                  className={`side-switch-btn ${selectedSide === 'B' ? 'side-switch-active blue-side' : ''}`}
                  onClick={() => setSelectedSide('B')}
                >
                  评论蓝方
                </button>
              </div>

              <div className={`input-wrap side-${selectedSide}`}>
                <input
                  type="text"
                  placeholder={canComment ? `为${selectedSide === 'A' ? news.optionA : news.optionB}阵营加一把火...` : '登录后可发表评论'}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmitComment();
                    }
                  }}
                />
                <button
                  type="button"
                  className={`send-btn ${createCommentMutation.isLoading ? 'sending' : ''}`}
                  onClick={() => void handleSubmitComment()}
                  disabled={!draft.trim() || createCommentMutation.isLoading}
                >
                  <Send size={13} />
                  发表
                </button>
              </div>

              <div className="footer-icons">
                <div className="footer-hint">
                  <Sparkles size={14} />
                  <span>评论、回复、点赞都会实时写入战报</span>
                </div>

                <div className="f-icon has-popup">
                  <img src="/games/event-battle/img/lw.png" alt="" className="f-icon-img" />
                  <div className="footer-popup report-popup">
                    <div className="popup-header">我的战报</div>
                    <div className="popup-body">
                      <div className="popup-stats">
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(leftComments.length + rightComments.length)}</span>
                          <span className="fi_text">评论数</span>
                        </div>
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(leftVotes + rightVotes)}</span>
                          <span className="fi_text">总票仓</span>
                        </div>
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(leftComments.reduce((sum, item) => sum + item.likes, 0))}</span>
                          <span className="fi_text">红方点赞</span>
                        </div>
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(rightComments.reduce((sum, item) => sum + item.likes, 0))}</span>
                          <span className="fi_text">蓝方点赞</span>
                        </div>
                      </div>
                    </div>
                    <div className="popup-arrow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pl-box blue_right">
            <div className="pl-header">
              <div className="team-info">
                <span className="team-name">{news.optionB}</span>
                <span className="team-score">{formatVotes(rightVotes)}</span>
              </div>
              <div className="side-pressure">
                <span>火力占比</span>
                <strong>{rightHeatPct}%</strong>
              </div>
            </div>

            <div className="pl-users-section">
              <div className="section-title">
                <span>活跃成员</span>
                <span className="user-count">{formatVotes(rightSupporters.length)}</span>
              </div>
              <div className="users-scroll-area">
                {rightSupporters.length > 0 ? (
                  <div className="user-grid">
                    {rightSupporters.map((supporter) => (
                      <div key={supporter.id} className="grid-item">
                        <AvatarStack supporter={supporter} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="member-empty">暂无评论成员</div>
                )}
              </div>
            </div>

            <div className="pl-comment-area">
              {rightComments.length === 0 ? (
                <div className="empty-comment">蓝方还在蓄势待发，发一条评论把他们点燃。</div>
              ) : (
                rightComments.map((comment, index) => (
                  <div key={comment.id} style={{ animationDelay: `${Math.min(index, 7) * 0.05}s` }}>
                    <BattleCommentCard
                      comment={comment}
                      side="B"
                      onToggleLike={handleToggleLike}
                      onOpenReply={handleOpenReply}
                      isReplying={replyingTo?.commentId === comment.id}
                      replyDraft={replyDraft}
                      onReplyDraftChange={setReplyDraft}
                      onSubmitReply={handleSubmitReply}
                      onCancelReply={() => {
                        setReplyDraft('');
                        setReplyingTo(null);
                      }}
                      replySubmitting={createCommentMutation.isLoading}
                      likePending={likePendingIds.has(comment.id)}
                      latestReplyEvent={latestReplyEvent}
                    />
                  </div>
                ))
              )}
              {commentsBQuery.data?.hasMore ? (
                <button type="button" className="load-more-btn" onClick={() => setCursorB(commentsBQuery.data?.cursor ?? 0)}>
                  加载更多蓝方评论
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
