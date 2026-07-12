/**
 * 文件说明：暗盘撕裂带直播页核心实现（仅接预测市场 / 龟币下注）。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { useQueryClient } from 'react-query';
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
  ThumbsUp,
} from 'lucide-react';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import { useRequestCoinMe, useRequestCoinBet } from '@/hooks/useCoinRequests';
import type { CommentResponse } from '@/hooks/useCommentRequests';
import {
  resolveMarketBetSide,
  toPredictCommentOption,
  useRequestPredictComments,
  useRequestPredictCommentReplies,
  useRequestPredictCreateComment,
  useRequestPredictHeat,
  useRequestPredictHeatMe,
  useRequestPredictHeatRank,
  useRequestPredictLike,
  useRequestPredictOddsCurrent,
  useRequestPredictReplyComment,
  useRequestPredictTearSettle,
  useRequestPredictUnlike,
} from '@/hooks/usePredictRequests';
import type { PetSkin } from '@/components/common/pet/petTypes';
import { normalizePredictionCardItem, type PredictionBetOption, type PredictionCardItem } from '@/pages/home/components/predictionCards';
import {
  formatTearRemainLabel,
  formatWinnerOptionLabel,
} from '@/components/common/settlement/predictHeatSettlementModel';
import { EventBattleEnergyBar, buildEventBattleEnergyBarBubbles } from './EventBattleEnergyBar/index';
import { EventBattleRightRail } from './EventBattleRightRail';
import { resolveEventBattleTheme } from './eventBattleThemes';
import './EventBattleLiveRoom.css';

type CommentSide = 'A' | 'B';
type BetOption = PredictionBetOption;
type ParticleStyle = React.CSSProperties & Record<`--${string}`, string>;
type ThemeStyle = React.CSSProperties & Record<`--${string}`, string>;

interface EventBattleProps {
  news: PredictionCardItem;
  onBack: () => void;
  userSide: 'A' | 'B' | null;
  onBet?: (newsId: string, option: BetOption, odds: number, amount?: number) => void;
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

const ENTITY_PREDICT_COMMENT = 'comment';
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

function readStoredMarketBetSide(marketId: number | null): CommentSide | undefined {
  if (!marketId) return undefined;
  try {
    return resolveMarketBetSide(sessionStorage.getItem(`eb-market-bet-side-${marketId}`));
  } catch {
    return undefined;
  }
}

function writeStoredMarketBetSide(marketId: number | null, side: CommentSide) {
  if (!marketId) return;
  try {
    sessionStorage.setItem(`eb-market-bet-side-${marketId}`, side);
  } catch {
    // ignore quota / privacy errors
  }
}

function resolveBattleMarketId(news: Pick<PredictionCardItem, 'id' | 'marketId'>): number | null {
  if (typeof news.marketId === 'number' && Number.isFinite(news.marketId) && news.marketId > 0) {
    return news.marketId;
  }
  const matched = String(news.id ?? '').match(/(\d+)/);
  if (!matched) return null;
  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
    replyCount: base?.commentCount ?? base?.replyCount ?? comment.replyCount ?? base?.replies ?? comment.replies ?? 0,
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
  sideLabel: string;
  sideAccent: string;
  useNeutralStyle: boolean;
  canReply: boolean;
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
  sideLabel,
  sideAccent,
  useNeutralStyle,
  canReply,
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
  const repliesQuery = useRequestPredictCommentReplies({
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
      className={`comment-item ${useNeutralStyle ? 'comment-neutral' : 'comment-themed'} ${likePending ? 'comment-busy' : ''}`}
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
          <button type="button" className="action-btn" onClick={() => onOpenReply(comment, side)} disabled={!canReply}>
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
  news: rawNews,
  onBack,
  userSide,
  onBet,
  bettingMarketId,
  onRequireAuth,
}) => {
  const news = useMemo(() => normalizePredictionCardItem(rawNews), [rawNews]);
  const battleMarketId = useMemo(() => resolveBattleMarketId(news), [news]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUserQuery = useRequestUserCurrent();
  const coinMeQuery = useRequestCoinMe();
  const coinBetMutation = useRequestCoinBet();
  const createCommentMutation = useRequestPredictCreateComment();
  const replyCommentMutation = useRequestPredictReplyComment();
  const likeMutation = useRequestPredictLike();
  const unlikeMutation = useRequestPredictUnlike();
  const tearSettleMutation = useRequestPredictTearSettle();
  const predictHeatQuery = useRequestPredictHeat({
    marketId: battleMarketId ?? undefined,
    enabled: Boolean(battleMarketId),
  });
  const predictHeatMeQuery = useRequestPredictHeatMe({
    marketId: battleMarketId ?? undefined,
    enabled: Boolean(battleMarketId),
  });
  const [rankMode, setRankMode] = useState<'all' | 'side'>('all');
  const predictHeatRankQuery = useRequestPredictHeatRank({
    marketId: battleMarketId ?? undefined,
    scope: rankMode === 'side' ? 'MY_SIDE' : 'ALL',
    page: 1,
    pageSize: 20,
    enabled: Boolean(battleMarketId),
  });
  const predictOddsQuery = useRequestPredictOddsCurrent({
    marketId: battleMarketId ?? undefined,
    enabled: Boolean(battleMarketId),
  });
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
  const [countdownLeft, setCountdownLeft] = useState(() => getCountdownSeconds(news.closeTime));
  const activeTab: string = '全部';
  const [mobileActiveSide, setMobileActiveSide] = useState<CommentSide>(userSide ?? 'A');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [betDialogSide, setBetDialogSide] = useState<BetOption | null>(null);
  const [betDialogError, setBetDialogError] = useState('');
  const [optimisticMarketBet, setOptimisticMarketBet] = useState<{ side: CommentSide; amount: number } | null>(null);
  const [confirmedBetSide, setConfirmedBetSide] = useState<CommentSide | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentUserName = currentUserQuery.data?.nickname || currentUserQuery.data?.username || '你';
  const optionA = news.optionA;
  const optionB = news.optionB;
  const optionDraw = news.optionDraw || '平局';
  const battleTitle = news.title;
  const oddsA = news.oddsA;
  const oddsB = news.oddsB;
  const oddsDraw = news.oddsDraw ?? Number(((Number(oddsA) + Number(oddsB)) / 2).toFixed(1));

  const commentsAQuery = useRequestPredictComments({
    marketId: battleMarketId ?? 0,
    option: 'A',
    cursor: cursorA,
    enabled: Boolean(battleMarketId),
  });
  const commentsBQuery = useRequestPredictComments({
    marketId: battleMarketId ?? 0,
    option: 'B',
    cursor: cursorB,
    enabled: Boolean(battleMarketId),
  });

  const heatMe = predictHeatMeQuery.data;
  const hasMarketBet = Boolean(
    news.hasBet ||
    optimisticMarketBet ||
    (heatMe?.myBetAmount ?? 0) > 0 ||
    heatMe?.myOption === 'A' ||
    heatMe?.myOption === 'B' ||
    heatMe?.myOption === 'DRAW',
  );
  const myBetSide = useMemo((): CommentSide | undefined => {
    const candidates: Array<CommentSide | null | undefined> = [
      optimisticMarketBet?.side,
      confirmedBetSide,
      resolveMarketBetSide(heatMe?.myOption),
      readStoredMarketBetSide(battleMarketId),
      userSide,
    ];
    for (const side of candidates) {
      if (side === 'A' || side === 'B') return side;
    }
    return undefined;
  }, [battleMarketId, confirmedBetSide, heatMe?.myOption, optimisticMarketBet?.side, userSide]);
  const useNeutralCommentStyle = !hasMarketBet;
  const canCommentOnSide = useCallback((side: CommentSide) => {
    if (!hasMarketBet) return true;
    return myBetSide === side;
  }, [hasMarketBet, myBetSide]);
  const marketBetAmount = heatMe?.myBetAmount ?? optimisticMarketBet?.amount ?? 0;
  const isBettingOpen = news.status === 'open';
  const canComment = Boolean(currentUserQuery.data?.id);
  const balance = coinMeQuery.data?.balance ?? 0;
  const numericBetAmount = Number(betAmount);
  const leftVotes = news.votes?.A ?? 0;
  const rightVotes = news.votes?.B ?? 0;
  const totalVotes = Math.max(1, leftVotes + rightVotes);
  const voteLeftPct = clampPct(Math.round((leftVotes / totalVotes) * 100));
  const voteRightPct = 100 - voteLeftPct;
  const effectiveBetAmount = Number.isFinite(numericBetAmount) && numericBetAmount > 0 ? numericBetAmount : 0;
  const isBetting = (typeof news.marketId === 'number' && bettingMarketId === news.marketId) || coinBetMutation.isLoading;
  const canPlaceCoinBet = news.status === 'open' && !hasMarketBet;
  const canPlaceBet = canPlaceCoinBet || (typeof onBet === 'function' && news.status === 'open');
  const canOpenBetSide = useCallback((side: BetOption) => {
    if (hasMarketBet || news.status !== 'open' || !canPlaceCoinBet) return false;
    return side === 'A' || side === 'B';
  }, [canPlaceCoinBet, hasMarketBet, news.status]);
  const oddsFromApi = predictOddsQuery.data;
  const liveOddsA = oddsFromApi?.oddsA ?? oddsA;
  const liveOddsB = oddsFromApi?.oddsB ?? oddsB;
  const liveOddsDraw = oddsFromApi?.oddsDraw ?? oddsDraw;
  const canTearSettle = Boolean(news.tearSettlement?.canSettle) && news.status === 'settled';
  const resolveBetOdds = useCallback((side: BetOption) => {
    if (side === 'A') return liveOddsA;
    if (side === 'B') return liveOddsB;
    return liveOddsDraw;
  }, [liveOddsA, liveOddsB, liveOddsDraw]);
  const activeBetOdds = resolveBetOdds(betIntent);
  const estimatedPayout = hasMarketBet && myBetSide
    ? Math.floor(marketBetAmount * resolveBetOdds(myBetSide))
    : Number.isFinite(effectiveBetAmount) && effectiveBetAmount > 0
      ? Math.floor(effectiveBetAmount * activeBetOdds)
      : 0;
  const dialogBetOdds = betDialogSide ? resolveBetOdds(betDialogSide) : 0;
  const dialogBetName = betDialogSide
    ? betDialogSide === 'A'
      ? optionA
      : betDialogSide === 'B'
        ? optionB
        : optionDraw
    : '';
  const dialogEstimatedPayout = Number.isFinite(effectiveBetAmount) && effectiveBetAmount > 0
    ? Math.floor(effectiveBetAmount * dialogBetOdds)
    : 0;
  const betStatusText = hasMarketBet
    ? `已下注 ${formatVotes(marketBetAmount)}`
    : canPlaceBet ? '进行中' : canTearSettle ? '可领撕裂带奖励' : '已暂停';
  const displayNews = useMemo<PredictionCardItem>(() => ({
    ...news,
    title: battleTitle,
    optionA,
    optionB,
    optionDraw,
    oddsA: liveOddsA,
    oddsB: liveOddsB,
    oddsDraw: liveOddsDraw,
    votes: { A: leftVotes, B: rightVotes, C: news.votes?.C ?? 0 },
  }), [battleTitle, leftVotes, liveOddsA, liveOddsB, liveOddsDraw, news, oddsA, oddsB, oddsDraw, optionA, optionB, optionDraw, rightVotes]);
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
    () => resolveEventBattleTheme(displayNews.marketId ?? displayNews.id, displayNews.optionA, displayNews.optionB, {
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
    '--eb-blue': visualTheme.sideA.primary,
    '--eb-blue-soft': visualTheme.sideA.accent,
    '--eb-blue-deep': visualTheme.sideA.deep,
    '--eb-blue-rgb': visualTheme.sideA.rgb,
    '--eb-red': visualTheme.sideB.primary,
    '--eb-red-soft': visualTheme.sideB.accent,
    '--eb-red-deep': visualTheme.sideB.deep,
    '--eb-red-rgb': visualTheme.sideB.rgb,
    '--eb-left-button-gradient': visualTheme.sideA.buttonGradient,
    '--eb-right-button-gradient': visualTheme.sideB.buttonGradient,
    '--eb-left-hero-glow': visualTheme.sideA.heroGlow,
    '--eb-right-hero-glow': visualTheme.sideB.heroGlow,
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

  useEffect(() => {
    if (!commentsAQuery.isLoading || commentsAQuery.data) {
      const source = commentsAQuery.data?.results ?? [];
      const mapped = source.map(mapCommentToBattleComment);
      if (mapped.length === 0) {
        if (cursorA === 0 && !commentsAQuery.isLoading) setCommentsAState([]);
        return;
      }
      setCommentsAState((prev) => (cursorA === 0 ? mapped : mergeById(prev, mapped)));
    }
  }, [commentsAQuery.data, commentsAQuery.isLoading, cursorA]);

  useEffect(() => {
    if (!commentsBQuery.isLoading || commentsBQuery.data) {
      const source = commentsBQuery.data?.results ?? [];
      const mapped = source.map(mapCommentToBattleComment);
      if (mapped.length === 0) {
        if (cursorB === 0 && !commentsBQuery.isLoading) setCommentsBState([]);
        return;
      }
      setCommentsBState((prev) => (cursorB === 0 ? mapped : mergeById(prev, mapped)));
    }
  }, [commentsBQuery.data, commentsBQuery.isLoading, cursorB]);

  useEffect(() => {
    setCursorA(0);
    setCursorB(0);
    setCommentsAState([]);
    setCommentsBState([]);
    setSelectedSide(userSide ?? 'A');
    setMobileActiveSide(userSide ?? 'A');
    setBetIntent(userSide ?? 'A');
    setDraft('');
    setReplyDraft('');
    setReplyingTo(null);
    setFeedItems([]);
    setLatestReplyEvent(null);
    setMobilePanelOpen(false);
    setBetDialogSide(null);
    setBetDialogError('');
    setOptimisticMarketBet(null);
    setConfirmedBetSide(null);
  }, [battleMarketId, news.id, userSide]);

  useEffect(() => {
    const sideFromHeat = resolveMarketBetSide(heatMe?.myOption);
    if (!sideFromHeat) return;
    if ((heatMe?.myBetAmount ?? 0) > 0 || news.hasBet) {
      setConfirmedBetSide(sideFromHeat);
      writeStoredMarketBetSide(battleMarketId, sideFromHeat);
      setOptimisticMarketBet(null);
    }
  }, [battleMarketId, heatMe?.myBetAmount, heatMe?.myOption, news.hasBet]);

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
        if (news.closeTime) return getCountdownSeconds(news.closeTime);
        return prev <= 0 ? 8136 : prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [news.closeTime]);

  useEffect(() => {
    setCountdownLeft(getCountdownSeconds(news.closeTime));
  }, [battleMarketId, news.closeTime]);

  useEffect(() => {
    if (!hasMarketBet || !myBetSide) return;
    setSelectedSide(myBetSide);
    setMobileActiveSide(myBetSide);
    setBetIntent(myBetSide);
  }, [hasMarketBet, myBetSide]);

  const leftComments = commentsAState;
  const rightComments = commentsBState;
  const hasMoreCommentsA = Boolean(commentsAQuery.data?.hasMore);
  const hasMoreCommentsB = Boolean(commentsBQuery.data?.hasMore);
  const nextCursorA = commentsAQuery.data?.cursor;
  const nextCursorB = commentsBQuery.data?.cursor;
  const leftSupporters = useMemo(() => buildSupporters(leftComments, 'left'), [leftComments]);
  const rightSupporters = useMemo(() => buildSupporters(rightComments, 'right'), [rightComments]);
  const commentLeftHeat = useMemo(() => calcSideHeat(leftComments), [leftComments]);
  const commentRightHeat = useMemo(() => calcSideHeat(rightComments), [rightComments]);
  const apiHeatByOption = useMemo(() => {
    const options = predictHeatQuery.data?.options ?? [];
    const findHeat = (option: string) =>
      options.find((item) => String(item.option ?? '').toUpperCase() === option)?.hTotal ?? 0;
    return {
      A: findHeat('A'),
      B: findHeat('B'),
    };
  }, [predictHeatQuery.data?.options]);
  const leftHeat = predictHeatQuery.data
    ? Math.round(apiHeatByOption.A)
    : commentLeftHeat;
  const rightHeat = predictHeatQuery.data
    ? Math.round(apiHeatByOption.B)
    : commentRightHeat;
  const totalHeat = Math.max(1, leftHeat + rightHeat);
  const leftHeatPct = clampPct(Math.round((leftHeat / totalHeat) * 100));
  const rightHeatPct = 100 - leftHeatPct;
  const displayLeftPct = predictHeatQuery.data ? leftHeatPct : voteLeftPct;
  const displayRightPct = predictHeatQuery.data ? rightHeatPct : voteRightPct;
  const leftEnergyDuration = 1.8 + (displayLeftPct / 100) * 3.2;
  const rightEnergyDuration = 1.8 + (displayRightPct / 100) * 3.2;
  const leftEnergyBubbles = useMemo(
    () => buildEventBattleEnergyBarBubbles('A', displayLeftPct, leftEnergyDuration),
    [displayLeftPct, leftEnergyDuration],
  );
  const rightEnergyBubbles = useMemo(
    () => buildEventBattleEnergyBarBubbles('B', displayRightPct, rightEnergyDuration),
    [displayRightPct, rightEnergyDuration],
  );
  const leaderSide: CommentSide = leftHeat >= rightHeat ? 'A' : 'B';
  const leaderName = leaderSide === 'A' ? optionA : optionB;
  const combatDiff = Math.abs(leftHeat - rightHeat);
  const leftRole = hasMarketBet && myBetSide === 'A' ? '你当前在蓝方阵营' : userSide === 'A' ? '你当前在蓝方阵营' : '意见领袖';
  const rightRole = hasMarketBet && myBetSide === 'B' ? '你当前在红方阵营' : userSide === 'B' ? '你当前在红方阵营' : '破光杀手';

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
        await likeMutation.mutateAsync({ entityType: ENTITY_PREDICT_COMMENT, entityId: comment.id });
        appendFeed(side, `${comment.author} 获得了一次热度加持`);
      } else {
        await unlikeMutation.mutateAsync({ entityType: ENTITY_PREDICT_COMMENT, entityId: comment.id });
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
    if (!replyingTo || !text || !battleMarketId) return;
    if (!canComment) {
      ensureAuth();
      return;
    }

    try {
      const replyOption = hasMarketBet && myBetSide
        ? toPredictCommentOption(myBetSide)
        : toPredictCommentOption(replyingTo.side);
      const createdReply = await replyCommentMutation.mutateAsync({
        commentId: replyingTo.commentId,
        marketId: battleMarketId,
        content: text,
        option: replyOption,
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
    battleMarketId,
    canComment,
    commentsAQuery,
    commentsBQuery,
    currentUserName,
    ensureAuth,
    hasMarketBet,
    myBetSide,
    replyCommentMutation,
    replyDraft,
    replyingTo,
    updateCommentList,
  ]);

  const handleTearSettle = useCallback(async () => {
    if (!battleMarketId) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    try {
      await tearSettleMutation.mutateAsync({ marketId: battleMarketId });
      navigate(`/settlement/tear/${battleMarketId}?action=view`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [battleMarketId, canComment, ensureAuth, navigate, tearSettleMutation]);

  const handleSubmitComment = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!canCommentOnSide(selectedSide)) return;
    if (!battleMarketId) return;

    try {
      const createdComment = await createCommentMutation.mutateAsync({
        marketId: battleMarketId,
        content: text,
        option: toPredictCommentOption(selectedSide),
      });

      const mapped = mapCommentToBattleComment(createdComment);
      updateCommentList(selectedSide, (items) => [mapped, ...items.filter((item) => item.id !== mapped.id)]);
      setDraft('');
      appendFeed(selectedSide, `${currentUserName} 为${selectedSide === 'A' ? optionA : optionB}阵营发起了新评论`);
      void commentsAQuery.refetch();
      void commentsBQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('NotLogin')) ensureAuth();
    }
  }, [
    appendFeed,
    battleMarketId,
    canComment,
    canCommentOnSide,
    commentsAQuery,
    commentsBQuery,
    createCommentMutation,
    currentUserName,
    draft,
    ensureAuth,
    optionA,
    optionB,
    selectedSide,
    updateCommentList,
  ]);

  const handleBet = useCallback(async (sideOverride?: BetOption) => {
    if (hasMarketBet) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    if (!effectiveBetAmount || effectiveBetAmount <= 0) {
      setBetDialogError('请输入有效的下注金额');
      return;
    }

    const targetSide = sideOverride ?? betIntent;
    const targetOdds = resolveBetOdds(targetSide);
    const marketId = battleMarketId ?? news.marketId;
    if (!marketId) {
      setBetDialogError('当前场次缺少 marketId，无法下注');
      return;
    }

    if (canPlaceCoinBet) {
      try {
        setBetDialogError('');
        const betResult = await coinBetMutation.mutateAsync({
          marketId,
          option: targetSide,
          amount: effectiveBetAmount,
        });
        const sideFromResult = resolveMarketBetSide(betResult.bet?.option)
          ?? (targetSide === 'A' || targetSide === 'B' ? targetSide : undefined);
        if (sideFromResult) {
          setConfirmedBetSide(sideFromResult);
          writeStoredMarketBetSide(marketId, sideFromResult);
          setOptimisticMarketBet({ side: sideFromResult, amount: effectiveBetAmount });
        }
        await Promise.all([
          queryClient.invalidateQueries(['requestPredictHeatMe']),
          queryClient.invalidateQueries(['requestPredictHeat']),
          queryClient.invalidateQueries(['requestFootballMarkets']),
        ]);
        void predictHeatMeQuery.refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : '下注失败，请稍后再试';
        if (message.includes('NotLogin')) ensureAuth();
        setBetDialogError(message);
        return;
      }
    } else if (onBet) {
      onBet(news.id, targetSide, targetOdds, effectiveBetAmount);
    } else {
      setBetDialogError('当前场次不可下注');
      return;
    }

    setBetDialogSide(null);
    setBetDialogError('');
    setMobilePanelOpen(false);
    const targetLabel = targetSide === 'A' ? optionA : targetSide === 'B' ? optionB : optionDraw;
    appendFeed(targetSide === 'C' ? 'A' : targetSide, `${currentUserName} 为${targetLabel}追加了 ${formatVotes(effectiveBetAmount)} 龟币`);
  }, [
    appendFeed,
    battleMarketId,
    betIntent,
    canComment,
    canPlaceCoinBet,
    coinBetMutation,
    currentUserName,
    effectiveBetAmount,
    ensureAuth,
    hasMarketBet,
    news.id,
    news.marketId,
    onBet,
    optionA,
    optionB,
    optionDraw,
    predictHeatMeQuery,
    queryClient,
    resolveBetOdds,
  ]);

  const openBetDialog = useCallback((side: BetOption) => {
    if (hasMarketBet) return;
    if (!canComment) {
      ensureAuth();
      return;
    }
    if ((side === 'A' || side === 'B') && !canOpenBetSide(side)) return;
    setBetIntent(side);
    setBetDialogError('');
    setBetDialogSide(side);
  }, [canComment, canOpenBetSide, ensureAuth, hasMarketBet]);

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

  const leftScore = predictHeatQuery.data
    ? leftHeat
    : leftVotes + leftHeat * 120 + leftComments.length * 18000;
  const rightScore = predictHeatQuery.data
    ? rightHeat
    : rightVotes + rightHeat * 120 + rightComments.length * 18000;
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
  const personalContribution = useMemo(() => {
    const heatMe = predictHeatMeQuery.data;
    if (heatMe) {
      const sideFromApi = resolveMarketBetSide(heatMe.myOption);
      const side: CommentSide =
        sideFromApi ?? myBetSide ?? userSide ?? 'A';
      return {
        side,
        commentCount: heatMe.myCommentCount ?? 0,
        likeCount: heatMe.receivedLikeCount ?? 0,
        replyCount: 0,
        score: Math.round(heatMe.myHeat ?? 0),
        betAmount: heatMe.myBetAmount ?? marketBetAmount,
      };
    }

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
    const side = commentCount === 0 ? (myBetSide ?? userSide) : blueCount >= redCount ? 'A' : 'B';

    return {
      side,
      commentCount,
      likeCount,
      replyCount,
      score: commentCount * 8 + likeCount + replyCount * 2,
      betAmount: hasMarketBet ? marketBetAmount : 0,
    };
  }, [currentUserName, hasMarketBet, leftComments, marketBetAmount, myBetSide, predictHeatMeQuery.data, rightComments, userSide]);

  useEffect(() => {
    if (!hasMarketBet && rankMode === 'side') {
      setRankMode('all');
    }
  }, [hasMarketBet, rankMode]);

  const leaderBoard = useMemo(() => {
    const list = predictHeatRankQuery.data?.list ?? [];
    if (list.length === 0) return [];
    return list.slice(0, 8).map((row, index) => ({
      id: String(row.userId ?? row.rank ?? index),
      name: row.nickname || `用户${row.userId ?? index + 1}`,
      avatar: row.avatar || FALLBACK_AVATAR,
      rank: row.rank ?? null,
      score: Math.round(row.totalHeat ?? 0),
      side: (String(row.option ?? '').toUpperCase() === 'B' ? 'B' : 'A') as CommentSide,
    }));
  }, [predictHeatRankQuery.data?.list]);

  const tearWinnerLabel = formatWinnerOptionLabel(
    news.tearSettlement?.winnerOption ?? predictHeatQuery.data?.leaderOption,
    optionA,
    optionB,
    optionDraw,
  );
  const tearRemainLabel = formatTearRemainLabel(news.tearSettlement?.remainSeconds);
  const quickAmounts = [100, 520, 1000, 5000];

  const rightRail = (
    <EventBattleRightRail
      optionA={displayNews.optionA}
      optionB={displayNews.optionB}
      oddsA={displayNews.oddsA}
      oddsB={displayNews.oddsB}
      balance={balance}
      betAmount={betAmount}
      quickAmounts={quickAmounts}
      hasMarketBet={hasMarketBet}
      myBetSide={myBetSide}
      marketBetAmount={marketBetAmount}
      isBettingOpen={isBettingOpen}
      canPlaceBet={canPlaceBet}
      isBetting={isBetting}
      estimatedPayout={estimatedPayout}
      rankMode={rankMode}
      onRankModeChange={setRankMode}
      rankRows={leaderBoard}
      rankLoading={predictHeatRankQuery.isLoading}
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
      onOpenBet={(side) => openBetDialog(side)}
      onConfirmBet={() => openBetDialog(betIntent)}
      canTearSettle={canTearSettle}
      isTearSettling={tearSettleMutation.isLoading}
      onTearSettle={() => void handleTearSettle()}
      tearRemainLabel={tearRemainLabel}
      winnerOptionLabel={tearWinnerLabel}
    />
  );

  return (
    <div className="eb-live-page" style={themeStyle}>
      <div className="eb-main">
        <section className="eb-arena-card">
          <button type="button" className="eb-back" onClick={onBack}>
            <ChevronLeft size={16} />
            返回
          </button>
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
            <img src={leftHeroImage} alt={displayNews.optionA} />
          </div>
          <div className="eb-player eb-player-right">
            <img src={rightHeroImage} alt={displayNews.optionB} />
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

          <div className="eb-headline-stack">
            <div className="eb-countdown">
              <span>战斗倒计时</span>
              <strong>{countdownText}</strong>
              <em>差值 {formatVotes(combatDiff)}</em>
            </div>
            <div className="eb-live-topic" aria-live="polite">
              <p className="eb-live-topic-kicker">
                <Radio size={14} strokeWidth={2.4} className="eb-live-topic-kicker-ico" aria-hidden />
                <span className="eb-live-topic-kicker-text">{liveTopicEyebrow}</span>
              </p>
              <p className="eb-live-topic-vs">
                <span className="eb-live-topic-side">{displayNews.optionA}</span>
                <span className="eb-live-topic-vs-sep">vs</span>
                <span className="eb-live-topic-side">{displayNews.optionB}</span>
              </p>
              {liveTopicSub ? <p className="eb-live-topic-sub">{liveTopicSub}</p> : null}
            </div>
          </div>

          <div className="eb-energy-panel">
            <EventBattleEnergyBar
              leftPct={displayLeftPct}
              rightPct={displayRightPct}
              leftEnergyDuration={leftEnergyDuration}
              rightEnergyDuration={rightEnergyDuration}
              leftBubbles={leftEnergyBubbles}
              rightBubbles={rightEnergyBubbles}
              pkParticles={pkParticles}
            />
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
              className={`eb-support eb-support-blue ${hasMarketBet && myBetSide !== 'A' ? 'is-hidden-slot' : ''} ${hasMarketBet && myBetSide === 'A' ? 'is-readonly' : ''}`}
              onClick={() => {
                if (!hasMarketBet) openBetDialog('A');
              }}
              disabled={hasMarketBet || !canOpenBetSide('A') || isBetting}
            >
              <span>{hasMarketBet && myBetSide === 'A' ? `已支持${displayNews.optionA}` : `支持${displayNews.optionA}`}</span>
              <em>{hasMarketBet && myBetSide === 'A' ? `${displayNews.oddsA.toFixed(1)}x` : '投币助威'}</em>
            </button>
            <div className="eb-bet-row-center" aria-hidden="true" />
            <button
              type="button"
              className={`eb-support eb-support-red ${hasMarketBet && myBetSide !== 'B' ? 'is-hidden-slot' : ''} ${hasMarketBet && myBetSide === 'B' ? 'is-readonly' : ''}`}
              onClick={() => {
                if (!hasMarketBet) openBetDialog('B');
              }}
              disabled={hasMarketBet || !canOpenBetSide('B') || isBetting}
            >
              <span>{hasMarketBet && myBetSide === 'B' ? `已支持${displayNews.optionB}` : `支持${displayNews.optionB}`}</span>
              <em>{hasMarketBet && myBetSide === 'B' ? `${displayNews.oddsB.toFixed(1)}x` : '投币助威'}</em>
            </button>
          </div>
        </section>

        <nav className="eb-tabs eb-tabs-hidden-gap pointer-events-none" aria-hidden="true">
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
          <button type="button" className="eb-sort" tabIndex={-1}>最新评论 <ChevronDown size={14} /></button>
        </nav>

        <div className="eb-mobile-side-switch" role="tablist" aria-label="切换阵营评论">
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
              }}
            >
              <span>{item.side === 'A' ? '蓝方' : '红方'}</span>
              <strong>{item.label}</strong>
              <em>{item.pct}% · {formatWan(item.count)}</em>
            </button>
          ))}
        </div>

        <section className={`eb-comments-grid ${mobileActiveSide === 'A' ? 'eb-mobile-show-blue' : 'eb-mobile-show-red'}`}>
          {[
            { side: 'A' as const, title: `${displayNews.optionA}阵营`, count: leftSupporters.length + leftComments.length, comments: leftComments, color: 'blue' },
            { side: 'B' as const, title: `${displayNews.optionB}阵营`, count: rightSupporters.length + rightComments.length, comments: rightComments, color: 'red' },
          ].map((column) => {
            const displayComments = getDisplayComments(column.side, column.comments);
            const supporters = column.side === 'A' ? leftSupporters : rightSupporters;
            const sideLabel = column.side === 'A' ? displayNews.optionA : displayNews.optionB;
            const sideAccent = column.side === 'A' ? visualTheme.sideA.accent : visualTheme.sideB.accent;
            const columnCanComment = canCommentOnSide(column.side);

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
                {column.side === 'A' && commentsAQuery.isLoading && displayComments.length === 0 ? (
                  <div className="eb-empty">评论加载中...</div>
                ) : column.side === 'B' && commentsBQuery.isLoading && displayComments.length === 0 ? (
                  <div className="eb-empty">评论加载中...</div>
                ) : displayComments.length === 0 ? (
                  <div className="eb-empty">该阵营还在集结，抢先发出第一条弹幕。</div>
                ) : displayComments.slice(0, 8).map((comment, index) => (
                  <div className="eb-comment-card-wrap" key={comment.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <BattleCommentCard
                      comment={comment}
                      side={column.side}
                      sideLabel={sideLabel}
                      sideAccent={sideAccent}
                      useNeutralStyle={useNeutralCommentStyle}
                      canReply={canComment}
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
                      replySubmitting={replyCommentMutation.isLoading}
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
              <div className={`eb-input-row ${!columnCanComment ? 'is-locked' : ''}`}>
                <input
                  value={selectedSide === column.side ? draft : ''}
                  placeholder={columnCanComment ? `为${column.title}发声...` : hasMarketBet ? '仅可评论你支持的一方' : '为阵营发声...'}
                  onFocus={() => setSelectedSide(column.side)}
                  onChange={(event) => {
                    setSelectedSide(column.side);
                    setDraft(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSubmitComment();
                  }}
                  disabled={!columnCanComment}
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

      <section className="eb-mobile-info-panels" aria-label="场内数据">
        {rightRail}
      </section>

      {betDialogSide ? (
        <div className="eb-bet-dialog-mask" role="presentation" onMouseDown={() => { setBetDialogSide(null); setBetDialogError(''); }}>
          <div
            className={`eb-bet-dialog ${betDialogSide === 'A' ? 'dialog-blue' : betDialogSide === 'B' ? 'dialog-red' : 'dialog-neutral'}`}
            role="dialog"
            aria-modal="true"
            aria-label="确认下注"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="eb-bet-dialog-head">
              <span>确认投币助威</span>
              <button type="button" onClick={() => { setBetDialogSide(null); setBetDialogError(''); }}>×</button>
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
            {betDialogError ? (
              <p className="eb-bet-dialog-error">{betDialogError}</p>
            ) : null}
            <div className="eb-bet-dialog-actions">
              <button type="button" className="cancel" onClick={() => { setBetDialogSide(null); setBetDialogError(''); }}>再想想</button>
              <button
                type="button"
                className="confirm"
                onClick={() => void confirmBetDialog()}
                disabled={isBetting || (betDialogSide
                  ? betDialogSide === 'A' || betDialogSide === 'B'
                    ? !canOpenBetSide(betDialogSide)
                    : !canPlaceBet
                  : true)}
              >
                {isBetting ? '下注中...' : '确认下注'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="eb-mobile-panel-trigger"
        onClick={() => setMobilePanelOpen(true)}
      >
        <span>下注助威</span>
        <strong>{betStatusText}</strong>
      </button>

      {mobilePanelOpen ? (
        <button
          type="button"
          className="eb-mobile-panel-backdrop"
          aria-label="关闭移动端操作面板"
          onClick={() => setMobilePanelOpen(false)}
        />
      ) : null}

      <aside className={`eb-sidebar ${mobilePanelOpen ? 'eb-sidebar-mobile-open' : ''}`}>
        <div className="eb-mobile-panel-head">
          <div>
            <span>下注助威</span>
            <strong>{hasMarketBet ? '本场已下注' : '选择阵营 · 输入龟币'}</strong>
          </div>
          <button type="button" onClick={() => setMobilePanelOpen(false)}>×</button>
        </div>
        {rightRail}
      </aside>
    </div>
  );
};
