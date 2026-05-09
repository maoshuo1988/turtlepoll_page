/**
 * 文件说明：Event Battle Live Room，预测市场和撕裂带页面组件。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Crosshair,
  Flame,
  MessageCircleReply,
  Radio,
  Send,
  Shield,
  Swords,
  ThumbsUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import { useRequestCoinMe } from '@/hooks/useCoinRequests';
import {
  type CommentResponse,
  useRequestCommentComments,
  useRequestCommentReplies,
  useRequestCreateComment,
} from '@/hooks/useCommentRequests';
import {
  useRequestPKBet,
  useRequestPKComments,
  useRequestPKCreateComment,
  useRequestPKHeat,
  useRequestPKReplyComment,
  useRequestPKTopic,
} from '@/hooks/usePkRequests';
import { useRequestLikeEntity, useRequestUnlikeEntity } from '@/hooks/useTopicRequests';
import type { PetSkin } from '@/data/mockData';
import type { PredictionCardItem } from './predictionCards';
import './EventBattleLiveRoom.css';

type CommentSide = 'A' | 'B';
type ParticleStyle = React.CSSProperties & Record<`--${string}`, string>;

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

const pseudoRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

const buildEnergyBubbles = (
  side: CommentSide,
  pct: number,
  duration: number,
): PkParticle[] => {
  const count = Math.min(26, Math.max(8, Math.round(pct / 4) + 6));
  const salt = side === 'A' ? 17 : 43;

  return Array.from({ length: count }, (_, index) => {
    const top = 16 + pseudoRandom(index + salt) * 68;
    const size = 3 + pseudoRandom(index + salt + 100) * 4;
    const delay = -pseudoRandom(index + salt + 200) * duration;

    return {
      id: `${side}-energy-bubble-${index}`,
      style: {
        '--top': `${top.toFixed(1)}%`,
        '--size': `${size.toFixed(1)}px`,
        '--delay': `${delay.toFixed(2)}s`,
      },
    };
  });
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

function getCountdownSeconds(closeTime?: number) {
  if (!closeTime) return 8136;
  const closeMs = String(closeTime).length <= 10 ? closeTime * 1000 : closeTime;
  const diff = Math.max(0, closeMs - Date.now());
  return Math.floor(diff / 1000);
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
  const base = getCommentBase(comment);
  return {
    id: String(base?.id ?? comment.id),
    author: getCommentUserName(comment),
    avatar: getCommentAvatar(comment),
    time: formatBattleTime(parseCommentTime(base?.createTime ?? base?.createdAt ?? base?.createAt ?? comment.createTime ?? comment.createdAt ?? comment.createAt)),
    text: getCommentText(comment) || '这条评论暂时没有正文。',
    likes: base?.likeCount ?? comment.likeCount ?? base?.likes ?? comment.likes ?? 0,
    liked: Boolean(base?.liked ?? comment.liked),
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
    <div className={`comment-item ${side === 'A' ? 'comment-blue' : 'comment-red'} ${likePending ? 'comment-busy' : ''}`}>
      <div className="c-left">
        <img className="c-avatar" src={comment.avatar || FALLBACK_AVATAR} alt={comment.author} />
      </div>
      <div className="c-content">
        <div className="c-user-info">
          <span className="c-nickname">{comment.author}</span>
          <span className="c-time">{comment.time}</span>
        </div>
        <div className="c-meta-line">
          <span className={`c-side-tag ${side === 'A' ? 'tag-blue' : 'tag-red'}`}>{side === 'A' ? '蓝方' : '红方'}</span>
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
  const [betIntent, setBetIntent] = useState<CommentSide>(userSide ?? 'A');
  const [betAmount, setBetAmount] = useState('100');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [likePendingIds, setLikePendingIds] = useState<Set<string>>(new Set());
  const [countdownLeft, setCountdownLeft] = useState(() => getCountdownSeconds(news.closeTime));
  const [activeTab, setActiveTab] = useState('全部');
  const [betBurst, setBetBurst] = useState<{ side: CommentSide; token: number } | null>(null);
  const [betDialogSide, setBetDialogSide] = useState<CommentSide | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentUserName = currentUserQuery.data?.nickname || currentUserQuery.data?.username || '你';
  const pkTopicId = typeof news.marketId === 'number' && news.marketId > 0 ? news.marketId : undefined;
  const hasPkTopic = hasValue(pkTopicId);
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
  const pkDetail = pkDetailQuery.data;
  const pkTopic = pkDetail?.topic;
  const pkRound = pkDetail?.round;
  const pkHeat = pkHeatQuery.data;
  const pkPhase = pkHeat?.phase ?? pkRound?.phase;
  const pkMyBet = pkDetail?.myBet;
  const hasPkBet = Boolean(pkMyBet && hasValue(pkMyBet.id));
  const shouldUsePkBet = hasPkTopic && hasValue(pkPhase) && !pkDetailQuery.isError && !pkHeatQuery.isError;
  const optionA = pkTopic?.sideAName || news.optionA;
  const optionB = pkTopic?.sideBName || news.optionB;
  const battleTitle = pkTopic?.title || news.title;
  const oddsA = pkDetail?.oddsA ?? news.oddsA;
  const oddsB = pkDetail?.oddsB ?? news.oddsB;
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
  const energyTrackStyle: ParticleStyle = {
    '--left-pct': `${leftPct}%`,
    '--left-energy-duration': `${leftEnergyDuration.toFixed(2)}s`,
    '--right-energy-duration': `${rightEnergyDuration.toFixed(2)}s`,
    '--left-charge-duration': `${(leftEnergyDuration + 0.8).toFixed(2)}s`,
    '--right-charge-duration': `${(rightEnergyDuration + 0.8).toFixed(2)}s`,
  };
  const leftEnergyBubbles = useMemo(
    () => buildEnergyBubbles('A', leftPct, leftEnergyDuration),
    [leftEnergyDuration, leftPct],
  );
  const rightEnergyBubbles = useMemo(
    () => buildEnergyBubbles('B', rightPct, rightEnergyDuration),
    [rightEnergyDuration, rightPct],
  );
  const effectiveBetAmount = shouldUsePkBet ? 100 : numericBetAmount;
  const isBetting = (typeof news.marketId === 'number' && bettingMarketId === news.marketId) || pkBetMutation.isLoading;
  const canPlaceBet = shouldUsePkBet
    ? pkPhase === 'betting' && !hasPkBet
    : typeof onBet === 'function' && news.status === 'open';
  const activeBetOdds = betIntent === 'A' ? oddsA : oddsB;
  const estimatedPayout = Number.isFinite(effectiveBetAmount) && effectiveBetAmount > 0
    ? Math.floor(effectiveBetAmount * activeBetOdds)
    : 0;
  const dialogBetOdds = betDialogSide === 'A' ? oddsA : oddsB;
  const dialogBetName = betDialogSide === 'A' ? optionA : optionB;
  const dialogEstimatedPayout = Number.isFinite(effectiveBetAmount) && effectiveBetAmount > 0
    ? Math.floor(effectiveBetAmount * dialogBetOdds)
    : 0;
  const displayNews = useMemo<PredictionCardItem>(() => ({
    ...news,
    title: battleTitle,
    optionA,
    optionB,
    oddsA,
    oddsB,
    votes: { A: leftVotes, B: rightVotes },
  }), [battleTitle, leftVotes, news, oddsA, oddsB, optionA, optionB, rightVotes]);

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
    const source = pkCommentsAQuery.data?.results?.length
      ? pkCommentsAQuery.data.results
      : commentsAQuery.data?.results ?? [];
    const mapped = source.map(mapCommentToBattleComment);
    if (mapped.length === 0) {
      if (cursorA === 0) setCommentsAState([]);
      return;
    }
    setCommentsAState((prev) => (cursorA === 0 ? mapped : mergeById(prev, mapped)));
  }, [commentsAQuery.data, cursorA, pkCommentsAQuery.data]);

  useEffect(() => {
    const source = pkCommentsBQuery.data?.results?.length
      ? pkCommentsBQuery.data.results
      : commentsBQuery.data?.results ?? [];
    const mapped = source.map(mapCommentToBattleComment);
    if (mapped.length === 0) {
      if (cursorB === 0) setCommentsBState([]);
      return;
    }
    setCommentsBState((prev) => (cursorB === 0 ? mapped : mergeById(prev, mapped)));
  }, [commentsBQuery.data, cursorB, pkCommentsBQuery.data]);

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
  }, [battleEntityId, news.id, userSide]);

  useEffect(() => {
    if (feedItems.length > 0) return;
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
        if (news.closeTime) return getCountdownSeconds(news.closeTime);
        return prev <= 0 ? 8136 : prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [news.closeTime, pkCountdownSeconds]);

  useEffect(() => {
    setCountdownLeft(typeof pkCountdownSeconds === 'number' ? Math.max(0, Math.floor(pkCountdownSeconds)) : getCountdownSeconds(news.closeTime));
  }, [battleEntityId, news.closeTime, pkCountdownSeconds]);

  const leftComments = commentsAState;
  const rightComments = commentsBState;
  const hasMoreCommentsA = Boolean(pkCommentsAQuery.data?.hasMore || commentsAQuery.data?.hasMore);
  const hasMoreCommentsB = Boolean(pkCommentsBQuery.data?.hasMore || commentsBQuery.data?.hasMore);
  const nextCursorA = pkCommentsAQuery.data?.hasMore ? pkCommentsAQuery.data?.cursor : commentsAQuery.data?.cursor;
  const nextCursorB = pkCommentsBQuery.data?.hasMore ? pkCommentsBQuery.data?.cursor : commentsBQuery.data?.cursor;
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
  const leftRole = userSide === 'A' ? '你当前在蓝方阵营' : '意见领袖';
  const rightRole = userSide === 'B' ? '你当前在红方阵营' : '破光杀手';
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
      const createdReply = hasPkTopic
        ? await pkReplyCommentMutation.mutateAsync({
            commentId: replyingTo.commentId,
            content: text,
          })
        : await createCommentMutation.mutateAsync({
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
      void pkCommentsAQuery.refetch();
      void pkCommentsBQuery.refetch();
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
    hasPkTopic,
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

    try {
      const createdComment = hasPkTopic && pkTopicId
        ? await pkCreateCommentMutation.mutateAsync({
            topicId: pkTopicId,
            side: selectedSide,
            content: text,
          })
        : await createCommentMutation.mutateAsync({
            entityType: selectedSide === 'A' ? ENTITY_PREDICT_A : ENTITY_PREDICT_B,
            entityId: battleEntityId,
            content: text,
          });

      const mapped = mapCommentToBattleComment(createdComment);
      updateCommentList(selectedSide, (items) => [mapped, ...items.filter((item) => item.id !== mapped.id)]);
      setDraft('');
      appendFeed(selectedSide, `${currentUserName} 为${selectedSide === 'A' ? optionA : optionB}阵营发起了新评论`);
      void commentsAQuery.refetch();
      void commentsBQuery.refetch();
      void pkCommentsAQuery.refetch();
      void pkCommentsBQuery.refetch();
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
    hasPkTopic,
    optionA,
    optionB,
    pkCommentsAQuery,
    pkCommentsBQuery,
    pkCreateCommentMutation,
    pkTopicId,
    selectedSide,
    updateCommentList,
  ]);

  const handleBet = useCallback(async (sideOverride?: CommentSide) => {
    if (!hasPkTopic && !onBet) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    const targetSide = sideOverride ?? betIntent;
    const targetOdds = targetSide === 'A' ? oddsA : oddsB;
    if (!Number.isFinite(effectiveBetAmount) || effectiveBetAmount <= 0 || effectiveBetAmount > balance) return;
    if (shouldUsePkBet && pkTopicId) {
      try {
        await pkBetMutation.mutateAsync({
          topicId: pkTopicId,
          side: targetSide,
          requestId: createRequestId(`pk-bet-${pkTopicId}`),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('NotLogin')) ensureAuth();
        return;
      }
    } else {
      onBet?.(news.id, targetSide, targetOdds, effectiveBetAmount);
    }
    setBetBurst({ side: targetSide, token: Date.now() });
    appendFeed(targetSide, `${currentUserName} 为${targetSide === 'A' ? optionA : optionB}阵营追加了 ${formatVotes(effectiveBetAmount)} 龟币`);
  }, [
    appendFeed,
    balance,
    betIntent,
    canComment,
    currentUserName,
    effectiveBetAmount,
    ensureAuth,
    news.id,
    oddsA,
    oddsB,
    onBet,
    optionA,
    optionB,
    pkBetMutation,
    pkTopicId,
    shouldUsePkBet,
  ]);

  const openBetDialog = useCallback((side: CommentSide) => {
    if (!canComment) {
      ensureAuth();
      return;
    }
    setBetIntent(side);
    setBetDialogSide(side);
  }, [canComment, ensureAuth]);

  const confirmBetDialog = useCallback(async () => {
    if (!betDialogSide) return;
    await handleBet(betDialogSide);
    setBetDialogSide(null);
  }, [betDialogSide, handleBet]);

  const countdownText = useMemo(() => {
    const d = Math.floor(countdownLeft / 86400);
    const h = Math.floor((countdownLeft % 86400) / 3600);
    const m = Math.floor((countdownLeft % 3600) / 60);
    const s = countdownLeft % 60;
    const timeText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return d > 0 ? `${d}天 ${timeText}` : timeText;
  }, [countdownLeft]);

  const leftScore = leftVotes + leftHeat * 120 + leftComments.length * 18000;
  const rightScore = rightVotes + rightHeat * 120 + rightComments.length * 18000;
  const scoreDiff = Math.abs(leftScore - rightScore);
  const liveEvents = feedItems.slice(-5).reverse();
  const heroImage = news.image || DEFAULT_BATTLE_IMAGE;
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
  const pkSparkShards = useMemo<PkParticle[]>(() => Array.from({ length: 18 }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 96 + Math.random() * 126;
    const midDistance = distance * (0.2 + Math.random() * 0.28);
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance * 0.68;
    const midX = Math.cos(angle) * midDistance + (Math.random() - 0.5) * 42;
    const midY = Math.sin(angle) * midDistance * 0.68 + (Math.random() - 0.5) * 30;
    const color = index % 4 === 0
      ? '#ffffff'
      : endX < 0
        ? ['#19b8ff', '#5fe2ff'][index % 2]
        : ['#ff2c36', '#ff6167'][index % 2];

    return {
      id: `pk-spark-shard-${index}`,
      style: {
        '--x': `${endX.toFixed(1)}px`,
        '--y': `${endY.toFixed(1)}px`,
        '--mx': `${midX.toFixed(1)}px`,
        '--my': `${midY.toFixed(1)}px`,
        '--r': `${(angle * 180 / Math.PI).toFixed(1)}deg`,
        '--len': `${(14 + Math.random() * 26).toFixed(1)}px`,
        '--duration': `${(0.42 + Math.random() * 0.34).toFixed(2)}s`,
        '--delay': `${(-0.76 + Math.random() * 0.76).toFixed(2)}s`,
        color,
      },
    };
  }), []);
  const sideBarrages = useMemo<{ A: BarrageItem[]; B: BarrageItem[] }>(() => {
    const buildSideList = (
      side: CommentSide,
      comments: BattleComment[],
      sideLabel: string,
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

      const fallbackSeeds: Array<{ author: string; text: string; likes: number }> = side === 'A'
        ? [
            { author: `${sideLabel}情报员`, text: `${sideLabel}阵营节奏稳了 👑`, likes: 99 },
            { author: '阵营前线', text: `支持${sideLabel}！现在就要超越对面 🔥`, likes: 88 },
            { author: '直播间', text: `${sideLabel}全军出击 💪`, likes: 66 },
          ]
        : [
            { author: `${sideLabel}情报员`, text: `${sideLabel}阵营反击中 ⚡`, likes: 99 },
            { author: '阵营前线', text: `${sideLabel}才是真正的斗士 🛡`, likes: 88 },
            { author: '直播间', text: `${sideLabel}永不言败 🔥`, likes: 66 },
          ];

      const fallbacks: BarrageItem[] = fallbackSeeds.map((seed, index) => ({
        id: `fallback-barrage-${side}-${index}`,
        side,
        author: seed.author,
        text: seed.text,
        likes: seed.likes,
      }));

      return [...sorted, ...fallbacks].slice(0, 3);
    };

    return {
      A: buildSideList('A', leftComments, optionA),
      B: buildSideList('B', rightComments, optionB),
    };
  }, [leftComments, optionA, optionB, rightComments]);
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
  const leaderBoard = [...leftSupporters, ...rightSupporters]
    .slice(0, 8)
    .map((supporter, index) => ({
      ...supporter,
      score: [56232, 45678, 28901, 23456, 18765, 15432, 12345, 11234][index] ?? Math.max(8000, leftHeat + rightHeat - index * 800),
      side: index % 2 === 0 ? 'A' : 'B',
    }));
  const personalContribution = useMemo(() => {
    const myName = currentUserName.trim();
    const mine = [
      ...leftComments.map((comment) => ({ ...comment, side: 'A' as const })),
      ...rightComments.map((comment) => ({ ...comment, side: 'B' as const })),
    ].filter((comment) => comment.author === myName);
    const commentCount = mine.length;
    const likeCount = mine.reduce((sum, comment) => sum + comment.likes, 0);
    const replyCount = mine.reduce((sum, comment) => sum + comment.replyCount, 0);
    const blueCount = mine.filter((comment) => comment.side === 'A').length;
    const redCount = commentCount - blueCount;
    const side = commentCount === 0 ? userSide : blueCount >= redCount ? 'A' : 'B';

    return {
      side,
      commentCount,
      likeCount,
      replyCount,
      score: commentCount * 8 + likeCount + replyCount * 2,
    };
  }, [currentUserName, leftComments, rightComments, userSide]);
  const fallbackLeaders = ['MessiKing', '罗总裁', 'CR7_GOAT', '巴萨信仰', '曼联传奇', '球王梅西10', '蓝白永不倒', '绝代双骄CR7'];
  const quickAmounts = [100, 520, 1000, 5000];
  const tabs = ['战报', '弹幕 99+', '全部', '热门', '只看我方', '只看对方', '精华'];

  return (
    <div className="eb-live-page">
      <div className="eb-main">
        <section className="eb-arena-card">
          <button type="button" className="eb-back" onClick={onBack}>
            <ChevronLeft size={16} />
            返回
          </button>
          <div className="eb-top-ticker">
            <span><Radio size={15} /> 正在直播：{displayNews.title}</span>
            <strong><Flame size={15} /> {liveText}</strong>
          </div>
          <div className="eb-barrage-layer">
            <div className="eb-barrage-lane eb-barrage-lane-blue">
              {sideBarrages.A.map((item, index) => (
                <div
                  key={item.id}
                  className={`eb-barrage eb-barrage-blue eb-barrage-blue-${index + 1}`}
                >
                  <b>{item.author}</b>
                  <span>{item.text}</span>
                  <em>🔥 x{Math.max(1, item.likes || ([99, 88, 66][index] ?? 36))}</em>
                </div>
              ))}
            </div>
            <div className="eb-barrage-lane eb-barrage-lane-red">
              {sideBarrages.B.map((item, index) => (
                <div
                  key={item.id}
                  className={`eb-barrage eb-barrage-red eb-barrage-red-${index + 1}`}
                >
                  <b>{item.author}</b>
                  <span>{item.text}</span>
                  <em>🔥 x{Math.max(1, item.likes || ([99, 88, 66][index] ?? 36))}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="eb-player eb-player-left">
            <img src={heroImage} alt={displayNews.optionA} />
          </div>
          <div className="eb-player eb-player-right">
            <img src={heroImage} alt={displayNews.optionB} />
          </div>

          <div className="eb-hero-stats eb-left-stats">
            <h2>{displayNews.optionA}阵营</h2>
            <strong>{formatVotes(leftScore)}</strong>
            <span>热度值</span>
            <em>
              {leftScore === rightScore
                ? `战平 ${formatVotes(0)}`
                : `${leftScore > rightScore ? '领先' : '落后'} ${formatVotes(scoreDiff)}`}
            </em>
          </div>
          <div className="eb-hero-stats eb-right-stats">
            <h2>{displayNews.optionB}阵营</h2>
            <strong>{formatVotes(rightScore)}</strong>
            <span>热度值</span>
            <em>
              {leftScore === rightScore
                ? `战平 ${formatVotes(0)}`
                : `${rightScore > leftScore ? '领先' : '落后'} ${formatVotes(scoreDiff)}`}
            </em>
          </div>

          <div className="eb-countdown">
            <span>战斗倒计时</span>
            <strong>{countdownText}</strong>
            <em>差值 {formatVotes(combatDiff)}</em>
          </div>
          <div className="eb-pk-core">
            <span className="eb-pk-letter-blue">P</span><span className="eb-pk-letter-red">K</span>
            <i className="eb-pk-ring eb-pk-ring-one" />
            <i className="eb-pk-ring eb-pk-ring-two" />
            <div className="eb-pk-particles" aria-hidden="true">
              {pkParticles.map((particle) => (
                <i key={particle.id} style={particle.style} />
              ))}
            </div>
            <div className="eb-pk-spark-shards" aria-hidden="true">
              {pkSparkShards.map((spark) => (
                <i key={spark.id} style={spark.style} />
              ))}
            </div>
          </div>

          <div className="eb-energy-panel">
            <div className="eb-energy-track" style={energyTrackStyle}>
              <div className="eb-energy-blue" style={{ width: `${leftPct}%` }} />
              <div className="eb-energy-red" />
              <div className="eb-energy-bubbles eb-energy-bubbles-blue" aria-hidden="true">
                {leftEnergyBubbles.map((bubble) => (
                  <i key={bubble.id} style={bubble.style} />
                ))}
              </div>
              <div className="eb-energy-bubbles eb-energy-bubbles-red" aria-hidden="true">
                {rightEnergyBubbles.map((bubble) => (
                  <i key={bubble.id} style={bubble.style} />
                ))}
              </div>
              <span className="eb-energy-crash" style={{ left: `${leftPct}%` }} />
            </div>
            <div className="eb-energy-foot">
              <span>{displayNews.oddsA.toFixed(2)}倍</span>
              <span className="eb-energy-side-meta eb-energy-side-meta-blue">
                <Shield size={14} />
                {leftRole}
                <strong>{formatVotes(leftHeat)}</strong>
              </span>
              <span><Swords size={16} /> {leaderName} 压场</span>
              <span className="eb-energy-side-meta eb-energy-side-meta-red">
                <Crosshair size={14} />
                {rightRole}
                <strong>{formatVotes(rightHeat)}</strong>
              </span>
              <span>{displayNews.oddsB.toFixed(2)}倍</span>
            </div>
          </div>

          <div className="eb-bet-row">
            <button
              type="button"
              className="eb-support eb-support-blue"
              onClick={() => {
                openBetDialog('A');
              }}
              disabled={!canPlaceBet || isBetting}
            >
              <span>支持{displayNews.optionA}</span>
              <em>投币助威</em>
              <b>⚽️</b>
            </button>
            <div className={`eb-gift-flight ${betBurst ? `eb-gift-${betBurst.side === 'A' ? 'blue' : 'red'}` : ''}`} key={betBurst?.token ?? 'idle'}>
              <span>{currentUserName} 投入 {formatVotes(numericBetAmount || 100)} 龟币</span>
              <strong>热度 +50,000</strong>
              <i>💰</i><i>💰</i><i>💰</i><i>💰</i><i>💰</i><i>💰</i>
            </div>
            <button
              type="button"
              className="eb-support eb-support-red"
              onClick={() => {
                openBetDialog('B');
              }}
              disabled={!canPlaceBet || isBetting}
            >
              <span>支持{displayNews.optionB}</span>
              <em>投币助威</em>
              <b>⚽️</b>
            </button>
          </div>
        </section>

        <nav className="eb-tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab || (!activeTab && index === 2) ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <button type="button" className="eb-sort">最新评论 <ChevronDown size={14} /></button>
        </nav>

        <section className="eb-comments-grid">
          {[
            { side: 'A' as const, title: `${displayNews.optionA}阵营`, count: leftSupporters.length + leftComments.length, comments: leftComments, color: 'blue' },
            { side: 'B' as const, title: `${displayNews.optionB}阵营`, count: rightSupporters.length + rightComments.length, comments: rightComments, color: 'red' },
          ].map((column) => {
            const displayComments = getDisplayComments(column.side, column.comments);
            const supporters = column.side === 'A' ? leftSupporters : rightSupporters;

            return (
            <div key={column.side} className={`eb-comment-column eb-${column.color}-column`}>
              <div className="eb-column-head">
                <h3>{column.title} <span>支持者 {formatWan(column.count)}</span></h3>
                <strong>{column.side === 'A' ? `🔥 火力 ${leftHeatPct}%` : `🔥 火力 ${rightHeatPct}%`}</strong>
              </div>
              <div className="eb-supporter-strip">
                {supporters.length === 0 ? (
                  <span>等待首批阵营成员加入</span>
                ) : (
                  supporters.slice(0, 10).map((supporter) => <AvatarStack key={supporter.id} supporter={supporter} />)
                )}
              </div>
              <div className="eb-comment-list">
                {displayComments.length === 0 ? (
                  <div className="eb-empty">该阵营还在集结，抢先发出第一条弹幕。</div>
                ) : displayComments.slice(0, 8).map((comment, index) => (
                  <div className="eb-comment-card-wrap" key={comment.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <BattleCommentCard
                      comment={comment}
                      side={column.side}
                      onToggleLike={handleToggleLike}
                      onOpenReply={handleOpenReply}
                      isReplying={replyingTo?.commentId === comment.id}
                      replyDraft={replyingTo?.commentId === comment.id ? replyDraft : ''}
                      onReplyDraftChange={setReplyDraft}
                      onSubmitReply={handleSubmitReply}
                      onCancelReply={() => {
                        setReplyingTo(null);
                        setReplyDraft('');
                      }}
                      replySubmitting={createCommentMutation.isLoading || pkReplyCommentMutation.isLoading}
                      likePending={likePendingIds.has(comment.id)}
                      latestReplyEvent={latestReplyEvent}
                    />
                  </div>
                ))}
                {column.side === 'A' && hasMoreCommentsA ? (
                  <button type="button" className="eb-load-more" onClick={() => setCursorA(nextCursorA ?? 0)}>加载更多</button>
                ) : null}
                {column.side === 'B' && hasMoreCommentsB ? (
                  <button type="button" className="eb-load-more" onClick={() => setCursorB(nextCursorB ?? 0)}>加载更多</button>
                ) : null}
              </div>
              <div className="eb-input-row">
                <input
                  value={selectedSide === column.side ? draft : ''}
                  placeholder={`为${column.title}发声...`}
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
                  disabled={selectedSide !== column.side || !draft.trim()}
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

      {betDialogSide ? (
        <div className="eb-bet-dialog-mask" role="presentation" onMouseDown={() => setBetDialogSide(null)}>
          <div
            className={`eb-bet-dialog ${betDialogSide === 'A' ? 'dialog-blue' : 'dialog-red'}`}
            role="dialog"
            aria-modal="true"
            aria-label="确认下注"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="eb-bet-dialog-head">
              <span>确认投币助威</span>
              <button type="button" onClick={() => setBetDialogSide(null)}>×</button>
            </div>
            <div className="eb-bet-dialog-side">
              <small>支持阵营</small>
              <strong>{dialogBetName}</strong>
              <em>{dialogBetOdds.toFixed(2)}倍</em>
            </div>
            <div className="eb-bet-dialog-grid">
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
            <div className="eb-bet-dialog-actions">
              <button type="button" className="cancel" onClick={() => setBetDialogSide(null)}>再想想</button>
              <button
                type="button"
                className="confirm"
                onClick={() => void confirmBetDialog()}
                disabled={isBetting || !canPlaceBet || effectiveBetAmount > balance}
              >
                {isBetting ? '下注中...' : '确认下注'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="eb-sidebar">
        <section className="eb-side-card">
          <div className="eb-side-title"><Trophy size={18} /> 热度贡献榜 <span>总榜</span><span>本方榜</span></div>
          <div className="eb-rank-list">
            {(leaderBoard.length ? leaderBoard : fallbackLeaders.map((name, index) => ({
              id: name,
              name,
              avatar: FALLBACK_AVATAR,
              rank: index + 1,
              score: [56232, 45678, 28901, 23456, 18765, 15432, 12345, 11234][index],
              side: index % 2 === 0 ? 'A' : 'B',
            }))).map((item, index) => (
              <div className="eb-rank-item" key={item.id}>
                <i>{index + 1}</i>
                <img src={item.avatar || FALLBACK_AVATAR} alt={item.name} />
                <b>{item.name}</b>
                <strong>{formatVotes(item.score)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="eb-side-card eb-events-card">
          <div className="eb-side-title"><Crosshair size={18} /> 直播事件</div>
          <div ref={feedRef} className="eb-event-list">
            {(liveEvents.length ? liveEvents : buildInitialFeed(displayNews, leftComments, rightComments)).map((item, index) => (
              <div className="eb-event-item" key={item.id}>
                <span>23:{25 - index}</span>
                <img src={FALLBACK_AVATAR} alt="" />
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="eb-side-card eb-bet-side-card">
          <div className="eb-side-title"><Zap size={18} /> 下注助威 <span>{canPlaceBet ? '进行中' : '已暂停'}</span></div>
          <div className={`eb-bet-panel ${betIntent === 'A' ? 'bet-blue' : 'bet-red'}`}>
            <div className="eb-bet-switch">
              <button
                type="button"
                className={betIntent === 'A' ? 'active' : ''}
                onClick={() => setBetIntent('A')}
              >
                <span>{displayNews.optionA}</span>
                <strong>{displayNews.oddsA.toFixed(2)}倍</strong>
              </button>
              <button
                type="button"
                className={betIntent === 'B' ? 'active' : ''}
                onClick={() => setBetIntent('B')}
              >
                <span>{displayNews.optionB}</span>
                <strong>{displayNews.oddsB.toFixed(2)}倍</strong>
              </button>
            </div>
            <div className="eb-bet-live">
              <div>
                <span>当前支持</span>
                <strong>{betIntent === 'A' ? displayNews.optionA : displayNews.optionB}</strong>
              </div>
              <div>
                <span>账户余额</span>
                <strong>{formatVotes(balance)}</strong>
              </div>
              <div>
                <span>预计派奖</span>
                <strong>{formatVotes(estimatedPayout)}</strong>
              </div>
            </div>
            <div className="eb-quick-amounts">
              {quickAmounts.map((amount) => (
                <button
                  type="button"
                  key={amount}
                  className={Number(betAmount) === amount ? 'active' : ''}
                  onClick={() => setBetAmount(String(amount))}
                >
                  {formatVotes(amount)}
                </button>
              ))}
            </div>
            <label className="eb-bet-input-row">
              <span>龟币</span>
              <input
                value={betAmount}
                inputMode="numeric"
                onChange={(event) => setBetAmount(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="输入金额"
              />
            </label>
            <button
              type="button"
              className="eb-bet-submit"
              onClick={() => openBetDialog(betIntent)}
              disabled={!canPlaceBet || isBetting || !Number.isFinite(effectiveBetAmount) || effectiveBetAmount <= 0 || effectiveBetAmount > balance}
            >
              {isBetting ? '下注中...' : `支持${betIntent === 'A' ? displayNews.optionA : displayNews.optionB}`}
            </button>
            {betBurst ? (
              <div className={`eb-side-coin-burst ${betBurst.side === 'A' ? 'burst-blue' : 'burst-red'}`} key={`side-${betBurst.token}`}>
                <i>🪙</i><i>🪙</i><i>🪙</i>
              </div>
            ) : null}
          </div>
        </section>

        <section className="eb-side-card eb-personal-card">
          <div className="eb-side-title">
            <Shield size={18} /> 个人贡献
            <span>{personalContribution.side === 'A' ? '蓝方' : personalContribution.side === 'B' ? '红方' : '未站队'}</span>
          </div>
          <div className="eb-personal-profile">
            <img src={FALLBACK_AVATAR} alt={currentUserName} />
            <div>
              <b>{currentUserName}</b>
              <span>本场互动贡献</span>
            </div>
            <strong>{formatVotes(personalContribution.score)}</strong>
          </div>
          <div className="eb-personal-stats">
            <div>
              <MessageCircleReply size={15} />
              <span>评论数</span>
              <strong>{formatVotes(personalContribution.commentCount)}</strong>
            </div>
            <div>
              <ThumbsUp size={15} />
              <span>获赞数</span>
              <strong>{formatVotes(personalContribution.likeCount)}</strong>
            </div>
            <div>
              <Flame size={15} />
              <span>回复互动</span>
              <strong>{formatVotes(personalContribution.replyCount)}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
};
