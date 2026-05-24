/**
 * 文件说明：Topic Post Card，论坛线报页面组件。
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  BadgeCheck,
  Bookmark,
  CornerDownRight,
  SendHorizonal,
  TrendingUp,
  Flame,
  X,
  ChevronLeft,
  ChevronRight,
  EyeClosed,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { TopicResponse } from '@/hooks/topicTypes';
import { getForumTagClass } from './forumTags';
import { SERVER_ASSET_ORIGIN } from '@/config';
import { resolveGeneratedUserAvatarUrl } from '@/utils/userAvatar';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import { type CommentResponse, useRequestCommentComments, useRequestCommentReplies, useRequestCreateComment } from '@/hooks/useCommentRequests';
import type { PredictionCardItem } from './predictionCards';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const DISLIKE_ICON_SRC = '/image/cai.svg';

export type TopicPostTag = string;

export type TopicPostCardData = Partial<TopicResponse> & {
  id: string;
  tag?: TopicPostTag;
  likes?: number;
  favoriteCount?: number;
  content?: string;
  time?: string;
  images?: string[];
  author?: {
    name: string;
    handle: string;
    avatar: string;
    avatarUrl?: string;
    verified?: boolean;
  };
};

interface TopicPostCardProps {
  post: TopicPostCardData;
  index: number;
  linkedPrediction?: PredictionCardItem | null;
  onOpenLinkedPrediction?: (item: PredictionCardItem) => void;
  onLike?: (postId: string) => void | Promise<void>;
  onUnlike?: (postId: string) => void | Promise<void>;
  /** 点踩（可选，未接接口时仅在本地切换展示） */
  onDislike?: (postId: string) => void | Promise<void>;
  onUndislike?: (postId: string) => void | Promise<void>;
  onToggleFavorite?: (postId: string, nextFavorited: boolean) => void | Promise<void>;
  onHideTopic?: (postId: string) => void | Promise<void>;
  isHidingTopic?: boolean;
}

const mergeComments = (prev: CommentResponse[], next: CommentResponse[]) => {
  const map = new Map<string, CommentResponse>();
  [...prev, ...next].forEach((item) => {
    map.set(String(item.id), item);
  });
  return Array.from(map.values());
};

const formatCount = (n: number) => {
  const value = Math.max(0, Number.isFinite(n) ? n : 0);
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
};

const formatTopicTime = (createTime?: number, fallbackTime?: string) => {
  if (fallbackTime) return fallbackTime;
  if (!createTime) return '刚刚';
  return dayjs(createTime).fromNow();
};

const formatCommentTime = (timestamp?: number) => {
  if (!timestamp) return '刚刚';
  const value = String(timestamp).length <= 10 ? timestamp * 1000 : timestamp;
  return dayjs(value).fromNow();
};

const resolveTag = (post: TopicPostCardData): TopicPostTag => {
  if (post.tag) return post.tag;
  const firstTag = post.tags?.[0]?.name ?? '';
  if (firstTag) return firstTag;
  if (post.recommend || /爆料|独家|快讯/.test(firstTag)) return '爆料';
  if (/分析|研判|复盘/.test(firstTag)) return '分析';
  return '讨论';
};

const resolveAssetUrl = (src?: string) => {
  if (!src) return '';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  if (src.startsWith('/')) {
    return `${SERVER_ASSET_ORIGIN}${src}`;
  }
  return `${SERVER_ASSET_ORIGIN}/${src}`;
};

const looksLikeRemoteAvatar = (src?: string) => {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return true;
  }
  if (trimmed.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(trimmed);
};

const getUserDisplayName = (comment?: CommentResponse | null) =>
  comment?.user?.nickname || comment?.user?.username || `用户 ${comment?.user?.id ?? ''}`.trim() || '匿名用户';

/** 列表九宫格最多展示张数，与发帖配图上限一致；超出时在末格显示 +N */
const TOPIC_IMAGE_GRID_MAX_VISIBLE = 9;

const TopicImageLightbox: React.FC<{
  urls: string[];
  index: number | null;
  onChangeIndex: (next: number | null) => void;
}> = ({ urls, index, onChangeIndex }) => {
  const count = urls.length;
  const safeIndex = index !== null && index >= 0 && index < count ? index : null;

  const indexRef = useRef(index);
  indexRef.current = index;
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    if (safeIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onChangeIndex(null);
        return;
      }
      const i = indexRef.current;
      const n = countRef.current;
      if (i === null) return;
      if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        onChangeIndex(i - 1);
      }
      if (e.key === 'ArrowRight' && i < n - 1) {
        e.preventDefault();
        onChangeIndex(i + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [safeIndex, onChangeIndex]);

  if (safeIndex === null) return null;

  const resolved = resolveAssetUrl(urls[safeIndex]);
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < count - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="查看大图"
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-black/55 p-4 backdrop-blur-[10px]"
      onClick={() => onChangeIndex(null)}
    >
      <button
        type="button"
        aria-label="关闭"
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/12 text-white shadow-lg transition hover:bg-white/22"
        onClick={() => onChangeIndex(null)}
      >
        <X size={20} strokeWidth={2} />
      </button>

      <div
        className="relative w-full max-w-[min(96vw,920px)] px-11 sm:px-14"
        onClick={(e) => e.stopPropagation()}
      >
        {count > 1 && (
          <button
            type="button"
            aria-label="上一张"
            disabled={!canPrev}
            className="absolute left-0 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-25"
            onClick={() => {
              if (canPrev) onChangeIndex(safeIndex - 1);
            }}
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2} aria-hidden />
          </button>
        )}
        {count > 1 && (
          <button
            type="button"
            aria-label="下一张"
            disabled={!canNext}
            className="absolute right-0 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-25"
            onClick={() => {
              if (canNext) onChangeIndex(safeIndex + 1);
            }}
          >
            <ChevronRight className="h-7 w-7" strokeWidth={2} aria-hidden />
          </button>
        )}
        <img
          src={resolved}
          alt={`配图 ${safeIndex + 1}/${count}`}
          className="mx-auto max-h-[min(85vh,900px)] max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-white/15"
        />
        {count > 1 && (
          <p className="mt-3 text-center text-[13px] font-medium tabular-nums text-zinc-300">
            {safeIndex + 1} / {count}
          </p>
        )}
      </div>

      <p className="mt-2 text-center text-[12px] text-zinc-500">
        {count > 1 ? '点击空白处关闭 · Esc · ← → 切换' : '点击空白处关闭 · Esc'}
      </p>
    </div>
  );
};

const ImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const visible = images.slice(0, TOPIC_IMAGE_GRID_MAX_VISIBLE);
  const overflow = images.length > TOPIC_IMAGE_GRID_MAX_VISIBLE;
  const lastSlot = TOPIC_IMAGE_GRID_MAX_VISIBLE - 1;

  return (
    <>
      <div
        className="mt-2.5 md:mt-3 grid grid-cols-3 gap-2 overflow-hidden rounded-[20px] border border-white/8 bg-[#11161d] md:rounded-2xl md:border-slate-200 dark:md:border-rdark-border md:grid-cols-4"
        onClick={(e) => e.stopPropagation()}
      >
        {visible.map((src, i) => (
          <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden bg-[#09182f]">
            <button
              type="button"
              aria-label={overflow && i === lastSlot ? `查看配图，另有 ${images.length - TOPIC_IMAGE_GRID_MAX_VISIBLE} 张` : `查看大图 ${i + 1}`}
              className="relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 text-left outline-none ring-emerald-400/0 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(i);
              }}
            >
              <img
                src={resolveAssetUrl(src)}
                alt=""
                loading="lazy"
                className="pointer-events-none h-full w-full object-cover"
              />
              {overflow && i === lastSlot && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 text-2xl font-bold text-white">
                  +{images.length - TOPIC_IMAGE_GRID_MAX_VISIBLE}
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
      <TopicImageLightbox urls={images} index={lightboxIndex} onChangeIndex={setLightboxIndex} />
    </>
  );
};

const CommentImageGrid: React.FC<{ urls: string[] }> = ({ urls }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <>
      <div
        className="!mt-3 grid grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-white/8 md:grid-cols-4"
        onClick={(e) => e.stopPropagation()}
      >
        {urls.map((src, i) => (
          <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden bg-[#111111]">
            <button
              type="button"
              aria-label={`查看评论配图 ${i + 1}`}
              className="relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none ring-emerald-400/0 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(i);
              }}
            >
              <img
                src={resolveAssetUrl(src)}
                alt=""
                loading="lazy"
                className="pointer-events-none h-full w-full object-cover"
              />
            </button>
          </div>
        ))}
      </div>
      <TopicImageLightbox urls={urls} index={lightboxIndex} onChangeIndex={setLightboxIndex} />
    </>
  );
};

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  count?: string;
  hoverColor: string;
  active?: boolean;
  activeColor?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ icon, count, hoverColor, active, activeColor, onClick }) => (
  <button
    onClick={onClick}
    className={`group flex min-w-0 flex-1 items-center justify-center gap-1 cursor-pointer rounded-full border-0 bg-transparent py-1 transition-colors md:flex-none md:justify-start md:rounded-none md:py-0 ${
      active && activeColor ? activeColor : 'text-slate-500 dark:text-rdark-text2'
    }`}
  >
    <div className={`p-2 rounded-full transition-colors ${active ? '' : `group-hover:${hoverColor}`}`}>
      {icon}
    </div>
    {count !== undefined && (
      <span className={`min-w-0 truncate text-[12px] md:text-[13px] -ml-0.5 transition-colors ${active ? '' : `group-hover:${hoverColor.replace('bg-', 'text-').replace('/20', '').replace('/10', '').replace('50', '500')}`}`}>
        {count}
      </span>
    )}
  </button>
);

type ComposerProps = {
  compact?: boolean;
  disabled?: boolean;
  placeholder: string;
  submitting: boolean;
  onSubmit: (content: string) => Promise<void>;
};

const CommentComposer: React.FC<ComposerProps> = ({ compact = false, disabled = false, placeholder, submitting, onSubmit }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || disabled || submitting) return;
    await onSubmit(trimmed);
    setContent('');
  };

  return (
    <div className={`rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07] ${compact ? '!p-3' : '!p-4'} dark:bg-white/[0.025]`}>
      <div className={`flex gap-2 ${compact ? 'flex-col md:flex-row md:items-center' : 'items-center'}`}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="h-[40px] min-w-0 flex-1 rounded-full bg-black/25 px-4 text-[13px] text-[#ece7de] outline-none ring-1 ring-inset ring-white/[0.06] placeholder:text-[#7d766d] transition focus:ring-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-45"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={disabled || submitting || content.trim().length === 0}
          className={`inline-flex h-[40px] items-center justify-center gap-1 rounded-full bg-[#181716] px-4 text-[12px] font-bold text-[#f1e6d2] ring-1 ring-[#5d5245]/55 transition hover:ring-[#8a7457]/75 hover:text-[#fff0d7] disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'w-full md:w-auto' : ''}`}
        >
          <SendHorizonal size={13} />
          {submitting ? '发送中' : compact ? '回复' : '评论'}
        </button>
      </div>
    </div>
  );
};

type ReplyThreadProps = {
  comment: CommentResponse;
  canComment: boolean;
};

const ReplyThread: React.FC<ReplyThreadProps> = ({ comment, canComment }) => {
  const [cursor, setCursor] = useState<number | string>(0);
  const [replies, setReplies] = useState<CommentResponse[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [quoteTarget, setQuoteTarget] = useState<CommentResponse | null>(null);
  const repliesQuery = useRequestCommentReplies({ commentId: comment.id, cursor, enabled: true });
  const createCommentMutation = useRequestCreateComment();

  useEffect(() => {
    setCursor(0);
    setReplies([]);
    setReplyOpen(false);
    setQuoteTarget(null);
  }, [comment.id]);

  useEffect(() => {
    const results = repliesQuery.data?.results ?? [];
    if (results.length === 0) {
      if (cursor === 0) setReplies([]);
      return;
    }
    setReplies((prev) => (cursor === 0 ? results : mergeComments(prev, results)));
  }, [cursor, repliesQuery.data]);

  const handleCreateReply = async (content: string) => {
    if (!canComment) return;

    await createCommentMutation.mutateAsync({
      entityType: 'comment',
      entityId: comment.id,
      content,
      quoteId: quoteTarget ? quoteTarget.id : 0,
    });

    setReplyOpen(false);
    setQuoteTarget(null);
    if (cursor === 0) {
      await repliesQuery.refetch();
      return;
    }
    setCursor(0);
    setReplies([]);
  };

  return (
    <div className="!mt-3 !pt-3">
      <div className="flex items-center justify-between text-[12px] text-[#8f877d]">
        <span>回复 {Math.max(comment.replyCount ?? 0, replies.length)}</span>
        <button
          type="button"
          onClick={() => {
            setReplyOpen((prev) => !prev);
            setQuoteTarget(null);
          }}
          className="border-0 bg-transparent font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7]"
        >
          {replyOpen ? '收起' : '回复'}
        </button>
      </div>

      {replyOpen && (
        <div className="!mt-3">
          <CommentComposer
            compact
            disabled={!canComment}
            placeholder={quoteTarget ? `回复 @${getUserDisplayName(quoteTarget)}` : `回复 @${getUserDisplayName(comment)}`}
            submitting={createCommentMutation.isLoading}
            onSubmit={handleCreateReply}
          />
        </div>
      )}

      {repliesQuery.isLoading && replies.length === 0 && (
        <div className="!mt-3 text-[12px] text-[#8a8278]">正在加载回复...</div>
      )}

      {replies.length > 0 && (
        <div className="!mt-3 space-y-2">
          {replies.map((reply) => {
            const replyName = getUserDisplayName(reply);
            const avatarUrl = resolveAssetUrl(reply.user?.avatar || reply.user?.smallAvatar);
            return (
              <div key={String(reply.id)} className="rounded-2xl border border-white/8 bg-black/20 !p-3">
                <div className="flex gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#24201c] text-[12px] font-bold text-[#f0e4d3]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={replyName} className="h-full w-full object-cover" />
                    ) : (
                      replyName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-slate-100">{replyName}</span>
                      <span className="text-[11px] text-[#8f877d]">{formatCommentTime(reply.createTime)}</span>
                    </div>
                    {reply.quote?.content && (
                      <div className="!mt-1.5 rounded-xl border border-[#5d5245]/35 bg-[#201d19] !px-2.5 !py-2 text-[12px] leading-5 text-[#b7aa99]">
                        @{getUserDisplayName(reply.quote)}：{reply.quote.content}
                      </div>
                    )}
                    <div className="!mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[#e8dfd3]">{reply.content || '这条回复暂时没有内容。'}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyOpen(true);
                        setQuoteTarget(reply);
                      }}
                      className="!mt-1.5 inline-flex items-center gap-1 border-0 bg-transparent text-[12px] font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7]"
                    >
                      <CornerDownRight size={12} />
                      回复
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {repliesQuery.data?.hasMore && (
        <button
          type="button"
          onClick={() => setCursor(repliesQuery.data?.cursor ?? 0)}
          disabled={repliesQuery.isFetching}
          className="!mt-3 border-0 bg-transparent text-[12px] font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {repliesQuery.isFetching ? '加载中...' : '加载更多回复'}
        </button>
      )}
    </div>
  );
};

export const TopicPostCard: React.FC<TopicPostCardProps> = ({
  post,
  index,
  linkedPrediction,
  onOpenLinkedPrediction,
  onLike,
  onUnlike,
  onDislike,
  onUndislike,
  onToggleFavorite,
  onHideTopic,
  isHidingTopic = false,
}) => {
  const [remoteAvatarFailed, setRemoteAvatarFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [disliked, setDisliked] = useState(Boolean(post.disliked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.favorited));
  const [cursor, setCursor] = useState<number | string>(0);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const currentUserQuery = useRequestUserCurrent();
  const createCommentMutation = useRequestCreateComment();
  const commentsQuery = useRequestCommentComments({
    entityType: 'topic',
    entityId: post.id,
    cursor,
    enabled: expanded,
  });

  useEffect(() => {
    setBookmarked(Boolean(post.favorited));
  }, [post.favorited, post.id]);

  useEffect(() => {
    setDisliked(Boolean(post.disliked));
  }, [post.disliked, post.id]);

  const handleHideTopic = async () => {
    if (isHidingTopic || !onHideTopic) return;
    try {
      await onHideTopic(post.id);
    } catch {
      // 失败提示由页面层处理
    }
  };

  useEffect(() => {
    if (!expanded) return;
    setCursor(0);
    setComments([]);
  }, [expanded, post.id]);

  useEffect(() => {
    if (!expanded) {
      setCommentComposerOpen(false);
    }
  }, [expanded]);

  useEffect(() => {
    const results = commentsQuery.data?.results ?? [];
    if (results.length === 0) {
      if (cursor === 0) setComments([]);
      return;
    }
    setComments((prev) => (cursor === 0 ? results : mergeComments(prev, results)));
  }, [commentsQuery.data, cursor]);

  const nickname = post.user?.nickname || post.user?.username || post.author?.name || '匿名用户';
  const handleSeed = post.user?.username || post.user?.id || post.author?.handle || nickname;
  const handle = handleSeed.startsWith('@') ? handleSeed : `@${handleSeed}`;
  const avatarText = post.author?.avatar || nickname.slice(0, 1).toUpperCase();
  const remoteAvatarRaw = post.user?.avatar || post.user?.smallAvatar || post.author?.avatarUrl;
  const remoteAvatarUrl = looksLikeRemoteAvatar(remoteAvatarRaw) ? resolveAssetUrl(remoteAvatarRaw) : '';
  const generatedAvatarUrl = resolveGeneratedUserAvatarUrl(
    {
      id: post.user?.id,
      username: post.user?.username,
      nickname: post.user?.nickname,
    },
    handleSeed,
  );
  const displayAvatarUrl = remoteAvatarFailed
    ? generatedAvatarUrl
    : remoteAvatarUrl || generatedAvatarUrl;

  useEffect(() => {
    setRemoteAvatarFailed(false);
  }, [post.id, remoteAvatarUrl, generatedAvatarUrl]);
  const content = post.content || [post.title, post.summary].filter(Boolean).join('\n').trim() || '该帖子暂无正文内容';
  const images =
    post.images ??
    post.imageList?.map((item) => item.url || item.preview).filter((item): item is string => Boolean(item)) ??
    [];
  const tag = resolveTag(post);
  const displayTime = formatTopicTime(post.createTime, post.time);
  const displayLikes = post.likeCount ?? post.likes ?? 0;
  const displayDislikes = post.dislikeCount ?? 0;
  const displayFavorites = post.favoriteCount ?? (post as { favorite_count?: number }).favorite_count ?? 0;
  const commentCount = Math.max(typeof post.commentCount === 'number' ? post.commentCount : 0, comments.length);
  const canComment = Boolean(currentUserQuery.data?.id);
  const isOwnPost = Boolean(
    currentUserQuery.data?.id &&
      post.user?.id &&
      String(currentUserQuery.data.id) === String(post.user.id),
  );

  const handleLike = async () => {
    if (liked) {
      if (!onUnlike) return;
      try {
        await onUnlike(post.id);
        setLiked(false);
      } catch {
        return;
      }
      return;
    }

    if (!onLike) return;
    try {
      await onLike(post.id);
      setLiked(true);
    } catch {
      return;
    }
  };

  const handleDislike = async () => {
    if (disliked) {
      if (onUndislike) {
        try {
          await onUndislike(post.id);
          setDisliked(false);
        } catch {
          return;
        }
        return;
      }
      setDisliked(false);
      return;
    }

    if (onDislike) {
      try {
        await onDislike(post.id);
        setDisliked(true);
      } catch {
        return;
      }
      return;
    }

    setDisliked(true);
  };

  const handleCreateComment = async (contentValue: string) => {
    if (!canComment) return;

    await createCommentMutation.mutateAsync({
      entityType: 'topic',
      entityId: post.id,
      content: contentValue,
    });

    if (cursor === 0) {
      await commentsQuery.refetch();
      return;
    }
    setCursor(0);
    setComments([]);
  };

  const likeBase = displayLikes - (post.liked ? 1 : 0);
  const likeCount = likeBase + (liked ? 1 : 0);
  const dislikeBase = displayDislikes - (post.disliked ? 1 : 0);
  const dislikeCount = dislikeBase + (disliked ? 1 : 0);
  const favoriteBase = displayFavorites - (post.favorited ? 1 : 0);
  const favoriteCount = favoriteBase + (bookmarked ? 1 : 0);
  const canExpandText = content.length > 52;
  const renderCommentsPanel = (className: string) => (
    <div className={className}>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setCommentComposerOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-3 text-left ring-1 ring-white/[0.07] transition hover:ring-emerald-400/22"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#14212d] text-sm text-cyan-300">
            💬
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white">写评论</div>
            <div className="mt-0.5 text-[12px] text-zinc-500">
              {canComment ? '说说你的判断、观点或补充信息' : '登录后即可参与评论'}
            </div>
          </div>
        </button>
      </div>

      <div className="hidden md:block">
        <CommentComposer
          disabled={!canComment}
          placeholder={canComment ? '写下你的评论...' : '登录后可参与评论'}
          submitting={createCommentMutation.isLoading}
          onSubmit={handleCreateComment}
        />
      </div>

      {commentsQuery.isLoading && comments.length === 0 && (
        <p className="!mt-3 text-[13px] text-[#8a8278]">正在加载评论...</p>
      )}

      {!commentsQuery.isLoading && comments.length === 0 && (
        <p className="!mt-3 text-[13px] text-[#8a8278]">还没有评论，来抢沙发！</p>
      )}

      {comments.length > 0 && (
        <div className="!mt-3 space-y-3">
          {comments.map((comment) => {
            const authorName = getUserDisplayName(comment);
            const commentAvatar = resolveAssetUrl(comment.user?.avatar || comment.user?.smallAvatar);
            return (
              <div key={String(comment.id)} className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(24,24,24,0.98)_0%,rgba(13,13,13,0.98)_100%)] !p-4 shadow-[0_10px_26px_rgba(0,0,0,0.24)]">
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#24201c] text-sm font-bold text-[#f0e4d3]">
                    {commentAvatar ? (
                      <img src={commentAvatar} alt={authorName} className="h-full w-full object-cover" />
                    ) : (
                      authorName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-[#f5efe6]">{authorName}</span>
                      <span className="text-[11px] text-[#8f877d]">{formatCommentTime(comment.createTime)}</span>
                      {comment.ipLocation && <span className="text-[11px] text-[#746d65]">{comment.ipLocation}</span>}
                    </div>

                    {comment.quote?.content && (
                      <div className="!mt-2 rounded-xl border border-[#5d5245]/35 bg-[#201d19] !px-3 !py-2 text-[12px] leading-5 text-[#b7aa99]">
                        @{getUserDisplayName(comment.quote)}：{comment.quote.content}
                      </div>
                    )}

                    <div className="!mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[#e8dfd3]">
                      {comment.content || '这条评论暂时没有正文。'}
                    </div>

                    {Array.isArray(comment.imageList) && comment.imageList.length > 0 && (
                      <CommentImageGrid
                        urls={comment.imageList
                          .map((image) => image.url || image.preview)
                          .filter((u): u is string => Boolean(u))}
                      />
                    )}

                    <ReplyThread comment={comment} canComment={canComment} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {commentsQuery.data?.hasMore && (
        <button
          type="button"
          onClick={() => setCursor(commentsQuery.data?.cursor ?? 0)}
          disabled={commentsQuery.isFetching}
          className="!mt-3 border-0 bg-transparent text-[12px] font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {commentsQuery.isFetching ? '加载中...' : '加载更多评论'}
        </button>
      )}
    </div>
  );

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className="legacy-forum-post mx-0 w-full rounded-[22px] border border-white/10 bg-[#0f1013] px-4 py-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.28)] transition-colors md:rounded-2xl md:border md:border-white/[0.09] md:bg-[linear-gradient(165deg,rgba(18,19,24,0.92)_0%,rgba(12,13,17,0.96)_100%)] md:px-5 md:py-4 md:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_44px_rgba(0,0,0,0.35)] md:hover:border-emerald-400/12 md:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_48px_rgba(0,0,0,0.42)] dark:md:border-white/10"
    >
      <div className="legacy-forum-post-row">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="legacy-forum-post-avatar grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#14212d] text-xl text-cyan-300 cursor-pointer transition-opacity hover:opacity-80 md:h-15 md:w-15 md:bg-slate-100 dark:md:bg-rdark-input">
              {displayAvatarUrl ? (
                <img
                  src={displayAvatarUrl}
                  alt={nickname}
                  className="h-full w-full rounded-full object-cover"
                  onError={() => {
                    if (remoteAvatarUrl && generatedAvatarUrl && !remoteAvatarFailed) {
                      setRemoteAvatarFailed(true);
                    }
                  }}
                />
              ) : (
                avatarText
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold text-white dark:text-rdark-text truncate cursor-pointer hover:underline">
                {nickname}
              </span>
              {Boolean(post.recommend || post.author?.verified) && (
                <BadgeCheck size={16} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />
              )}
              <span className="text-[13px] text-zinc-500 dark:text-rdark-text2 truncate md:text-[14px]">
                {handle}
              </span>
              <span className="text-slate-400 dark:text-rdark-text2">·</span>
              <span className="text-[13px] text-zinc-500 dark:text-rdark-text2 cursor-pointer hover:underline shrink-0 md:text-[14px]">
                {displayTime}
              </span>
            </div>
          </div>
          {/* 列表右上角菜单入口暂未接入，先隐藏 */}
          {/* <button className="rounded-full border-0 bg-transparent p-1.5 text-zinc-500 transition-colors hover:bg-white/6 hover:text-cyan-300 md:-mr-1.5 md:-mt-0.5 md:hover:bg-blue-50 md:hover:text-blue-500 dark:md:text-rdark-text2 dark:md:hover:bg-blue-900/20 shrink-0">
            <MoreHorizontal size={17} />
          </button> */}
        </div>

        <div className="mt-2 min-w-0">
          <span className={`inline-block text-[10px] md:text-[11px] font-semibold px-2 !py-1 md:!py-2 rounded-full mt-1 mb-1.5 ${getForumTagClass(tag)}`}>
            #{tag}
          </span>

          {post.title && (
            <div className="text-[15px] font-semibold leading-6 text-white dark:text-rdark-text">
              {post.title}
            </div>
          )}

          <p className={`legacy-forum-post-text py-1.5 md:!py-2 text-[15px] md:text-[15px] text-[#e7e9ec] dark:text-rdark-text leading-[1.65] whitespace-pre-wrap ${textExpanded ? '' : 'line-clamp-3 md:line-clamp-none'}`}>
            {content}
          </p>
          {canExpandText && (
            <button
              type="button"
              onClick={() => setTextExpanded((v) => !v)}
              className="border-0 bg-transparent p-0 text-[12px] font-semibold text-cyan-300 hover:text-cyan-200 md:hidden"
            >
              {textExpanded ? '收起' : '展开'}
            </button>
          )}

          {images.length > 0 && <ImageGrid images={images} />}

          {linkedPrediction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLinkedPrediction?.(linkedPrediction);
              }}
              className="mt-3 w-full overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,rgba(11,17,26,0.96)_0%,rgba(10,24,22,0.98)_52%,rgba(9,13,16,0.98)_100%)] text-left ring-1 ring-emerald-400/18 shadow-[0_16px_36px_rgba(0,0,0,0.2)] transition-all hover:ring-emerald-400/28 hover:shadow-[0_20px_44px_rgba(0,0,0,0.28)]"
            >
              <div className="flex flex-col gap-4 px-4 pb-4 pt-3 md:flex-row md:items-start md:justify-between md:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-emerald-300">
                    <TrendingUp size={12} />
                    关联事件
                  </div>
                  <div className="mt-2 line-clamp-2 text-[15px] font-black leading-5 text-white">
                    {linkedPrediction.title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-zinc-400">
                    这条帖子正在讨论该事件，点击可直接进入下注页。
                  </div>
                </div>

                <div className="shrink-0 self-start rounded-2xl bg-white/[0.04] px-3 py-2 text-right ring-1 ring-white/[0.08] md:self-auto">
                  <div className="text-[10px] text-zinc-500">最高赔率</div>
                  <div className="mt-1 text-[16px] font-black text-white">
                    {Math.max(linkedPrediction.oddsA, linkedPrediction.oddsB).toFixed(1)}x
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                <div className="rounded-2xl bg-emerald-500/8 px-3 py-3 ring-1 ring-emerald-400/18">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                    <Flame size={12} />
                    正方入口
                  </div>
                  <div className="mt-1 text-[13px] font-bold text-white">{linkedPrediction.optionA}</div>
                  <div className="mt-1 text-[12px] text-emerald-200/75">{linkedPrediction.oddsA.toFixed(1)}x</div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] px-3 py-3 ring-1 ring-white/[0.08]">
                  <div className="text-[11px] font-semibold text-zinc-400">反方入口</div>
                  <div className="mt-1 text-[13px] font-bold text-white">{linkedPrediction.optionB}</div>
                  <div className="mt-1 text-[12px] text-zinc-400">{linkedPrediction.oddsB.toFixed(1)}x</div>
                </div>
              </div>
            </button>
          )}

          <div className="legacy-forum-post-actions mt-3 grid max-w-full grid-cols-6 gap-1 md:!mt-4 md:flex md:max-w-[450px]">
            <ActionBtn
              icon={<MessageCircle size={17} className="group-hover:text-blue-500 transition-colors" />}
              count={formatCount(commentCount)}
              hoverColor="bg-blue-50 dark:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            />
            {/* <ActionBtn
              icon={<Repeat2 size={17} className="group-hover:text-green-500 transition-colors" />}
              count={formatCount(Math.floor(displayLikes * 0.3))}
              hoverColor="bg-green-50 dark:bg-green-900/20"
            /> */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void handleLike(); }}
              className={`group flex min-w-0 items-center justify-center gap-1 rounded-full py-1 cursor-pointer border-0 bg-transparent transition-colors md:flex-none md:justify-start md:rounded-none md:py-0 ${
                liked ? 'text-pink-600' : 'text-slate-500 dark:text-rdark-text2'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${liked ? '' : 'group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20'}`}>
                <motion.div animate={liked ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Heart size={17} fill={liked ? 'currentColor' : 'none'} className={liked ? '' : 'group-hover:text-pink-600 transition-colors'} />
                </motion.div>
              </div>
              <span className={`min-w-0 truncate text-[12px] md:text-[13px] -ml-0.5 transition-colors ${liked ? '' : 'group-hover:text-pink-600'}`}>
                {formatCount(likeCount)}
              </span>
            </button>
            {/* <ActionBtn
              icon={<BarChart2 size={17} className="group-hover:text-blue-500 transition-colors" />}
              count={formatCount(viewCount)}
              hoverColor="bg-blue-50 dark:bg-blue-900/20"
            /> */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextFavorited = !bookmarked;
                setBookmarked(nextFavorited);
                void Promise.resolve(onToggleFavorite?.(post.id, nextFavorited)).catch(() => {
                  setBookmarked(!nextFavorited);
                });
              }}
              className={`group flex min-w-0 items-center justify-center gap-1 rounded-full py-1 cursor-pointer border-0 bg-transparent transition-colors md:flex-none md:justify-start md:rounded-none md:py-0 ${
                bookmarked ? 'text-blue-500' : 'text-slate-500 dark:text-rdark-text2'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${bookmarked ? '' : 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
                <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} className={bookmarked ? '' : 'group-hover:text-blue-500 transition-colors'} />
              </div>
              <span className={`min-w-0 truncate text-[12px] md:text-[13px] -ml-0.5 transition-colors ${bookmarked ? '' : 'group-hover:text-blue-500'}`}>
                {formatCount(favoriteCount)}
              </span>
            </button>
            {/* <button className="group flex items-center justify-center rounded-full py-1 cursor-pointer border-0 bg-transparent text-slate-500 dark:text-rdark-text2 transition-colors md:block md:rounded-none md:py-0">
              <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                <Share size={17} className="group-hover:text-blue-500 transition-colors" />
              </div>
            </button> */}
            {!isOwnPost ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleDislike();
              }}
              className={`group flex min-w-0 items-center justify-center gap-1 rounded-full py-1 cursor-pointer border-0 bg-transparent transition-colors md:flex-none md:justify-start md:rounded-none md:py-0 ${
                disliked ? 'text-yellow-400' : 'text-slate-500 dark:text-rdark-text2'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${disliked ? '' : 'group-hover:bg-yellow-400/10 dark:group-hover:bg-yellow-400/15'}`}>
                <motion.div animate={disliked ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.3 }}>
                  <img
                    src={DISLIKE_ICON_SRC}
                    alt="踩"
                    width={17}
                    height={17}
                    draggable={false}
                    style={
                      disliked
                        ? {
                            filter:
                              'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(1686%) hue-rotate(359deg) brightness(103%) contrast(101%)',
                          }
                        : undefined
                    }
                    className={`h-[17px] w-[17px] object-contain transition-[opacity,filter] duration-200 ${disliked ? 'opacity-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.45)]' : 'opacity-55 group-hover:opacity-90'}`}
                  />
                </motion.div>
              </div>
              <span className={`min-w-0 truncate text-[12px] md:text-[13px] -ml-0.5 transition-colors ${disliked ? 'text-yellow-400' : 'group-hover:text-yellow-600 dark:group-hover:text-yellow-500'}`}>
                {formatCount(dislikeCount)}
              </span>
            </button>
            ) : null}
            {isOwnPost ? (
              <button
                type="button"
                title="隐藏帖子"
                disabled={isHidingTopic}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleHideTopic();
                }}
                className="group flex items-center justify-center rounded-full border-0 bg-transparent py-1 text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:text-rdark-text2 md:block md:rounded-none md:py-0"
              >
                <div className="rounded-full p-2 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                  <EyeClosed size={17} className="transition-colors group-hover:text-blue-500" />
                </div>
              </button>
            ) : null}
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {renderCommentsPanel(
                  'legacy-forum-comments mt-3 rounded-2xl bg-[#111318]/70 p-3 ring-1 ring-white/[0.06] backdrop-blur-sm md:mt-4 md:rounded-none md:bg-transparent md:p-0 md:pt-4 md:ring-0 md:backdrop-blur-none',
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {commentComposerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden"
              >
                <div className="flex h-full items-end">
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                    className="flex max-h-[82vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/8 bg-[#0d0e11] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex justify-center pt-2.5">
                      <div className="h-1.5 w-12 rounded-full bg-white/16" />
                    </div>
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                      <div className="flex items-center gap-2 text-[15px] font-bold text-white">
                        <MessageCircle size={16} />
                        发布评论
                      </div>
                      <button
                        type="button"
                        onClick={() => setCommentComposerOpen(false)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[max(16px,env(safe-area-inset-bottom))]">
                      <CommentComposer
                        disabled={!canComment}
                        placeholder={canComment ? '写下你的评论...' : '登录后可参与评论'}
                        submitting={createCommentMutation.isLoading}
                        onSubmit={async (value) => {
                          await handleCreateComment(value);
                          setCommentComposerOpen(false);
                        }}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
};
