import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Share, BarChart2, MoreHorizontal, BadgeCheck, Bookmark, CornerDownRight, SendHorizonal } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { TopicResponse } from '@/hook/topicType';
import { FORUM_TAGS } from '../../../data/mock_data';
import { SERVER_API } from '@/constant';
import { useRequestUserCurrent } from '@/hook/useRequest';
import { type CommentResponse, useRequestCommentComments, useRequestCommentReplies, useRequestCreateComment } from '@/hook/useCommentRequest';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export type TopicPostTag = '讨论' | '爆料' | '分析';

export type TopicPostCardData = Partial<TopicResponse> & {
  id: string;
  tag?: TopicPostTag;
  likes?: number;
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
  onLike?: (postId: string) => void | Promise<void>;
  onUnlike?: (postId: string) => void | Promise<void>;
  onToggleFavorite?: (postId: string, nextFavorited: boolean) => void | Promise<void>;
}

const mergeComments = (prev: CommentResponse[], next: CommentResponse[]) => {
  const map = new Map<string, CommentResponse>();
  [...prev, ...next].forEach((item) => {
    map.set(String(item.id), item);
  });
  return Array.from(map.values());
};

const formatCount = (n: number) => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n > 0 ? String(n) : '';
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
    return `${SERVER_API}${src}`;
  }
  return `${SERVER_API}/${src}`;
};

const getUserDisplayName = (comment?: CommentResponse | null) =>
  comment?.user?.nickname || comment?.user?.username || `用户 ${comment?.user?.id ?? ''}`.trim() || '匿名用户';

const ImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  if (images.length === 0) return null;

  return (
    <div className="mt-2.5 md:mt-3 grid grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-rdark-border md:grid-cols-4">
      {images.slice(0, 8).map((src, i) => (
        <div key={i} className="relative aspect-square overflow-hidden bg-[#09182f]">
          <img
            src={resolveAssetUrl(src)}
            alt=""
            loading="lazy"
            className="h-full w-full cursor-pointer object-cover transition-opacity hover:opacity-95"
          />
          {i === 7 && images.length > 8 && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-2xl font-bold text-white">
              +{images.length - 8}
            </div>
          )}
        </div>
      ))}
    </div>
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
    className={`group flex items-center gap-1 cursor-pointer border-0 bg-transparent transition-colors ${
      active && activeColor ? activeColor : 'text-slate-500 dark:text-rdark-text2'
    }`}
  >
    <div className={`p-2 rounded-full transition-colors ${active ? '' : `group-hover:${hoverColor}`}`}>
      {icon}
    </div>
    {count && (
      <span className={`text-[13px] -ml-0.5 transition-colors ${active ? '' : `group-hover:${hoverColor.replace('bg-', 'text-').replace('/20', '').replace('/10', '').replace('50', '500')}`}`}>
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
    <div className={`rounded-2xl border border-white/8 bg-[#111111] ${compact ? '!p-3' : '!p-4'}`}>
      <div className="flex items-center gap-2">
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
          className="h-[40px] flex-1 rounded-full border border-white/8 bg-black/20 px-4 text-[13px] text-[#ece7de] outline-none placeholder:text-[#7d766d] disabled:cursor-not-allowed disabled:opacity-45"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={disabled || submitting || content.trim().length === 0}
          className="inline-flex h-[40px] items-center gap-1 rounded-full border border-[#5d5245] bg-[#181716] !px-4 text-[12px] font-bold text-[#f1e6d2] transition hover:border-[#8a7457] hover:text-[#fff0d7] disabled:cursor-not-allowed disabled:opacity-40"
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
    <div className="!mt-3 border-t border-white/8 !pt-3">
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
  onLike,
  onUnlike,
  onToggleFavorite,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.favorited));
  const [cursor, setCursor] = useState<number | string>(0);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const currentUserQuery = useRequestUserCurrent();
  const createCommentMutation = useRequestCreateComment();
  const commentsQuery = useRequestCommentComments({
    entityType: 'topic',
    entityId: post.id,
    cursor,
    enabled: expanded,
  });

  useEffect(() => {
    if (!expanded) return;
    setCursor(0);
    setComments([]);
  }, [expanded, post.id]);

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
  const avatarUrl = resolveAssetUrl(post.user?.avatar || post.user?.smallAvatar || post.author?.avatarUrl);
  const content = post.content || [post.title, post.summary].filter(Boolean).join('\n').trim() || '该帖子暂无正文内容';
  const images =
    post.images ??
    post.imageList?.map((item) => item.url || item.preview).filter((item): item is string => Boolean(item)) ??
    [];
  const tag = resolveTag(post);
  const displayTime = formatTopicTime(post.createTime, post.time);
  const displayLikes = post.likeCount ?? post.likes ?? 0;
  const commentCount = Math.max(typeof post.commentCount === 'number' ? post.commentCount : 0, comments.length);
  const viewCount = typeof post.viewCount === 'number' ? post.viewCount : displayLikes * 14 + commentCount * 42;
  const canComment = Boolean(currentUserQuery.data?.id);

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
  const canExpandText = content.length > 52;

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className="legacy-forum-post !py-3 border-b border-slate-100 dark:border-rdark-border hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
    >
      <div className="legacy-forum-post-row flex gap-3">
        <div className="shrink-0 pt-0.5">
          <div className="legacy-forum-post-avatar w-15 h-15 rounded-full bg-slate-100 dark:bg-rdark-input grid place-items-center text-xl cursor-pointer hover:opacity-80 transition-opacity">
            {avatarUrl ? (
              <img src={avatarUrl} alt={nickname} className="h-full w-full rounded-full object-cover" />
            ) : (
              avatarText
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-[15px] font-bold text-slate-900 dark:text-rdark-text truncate cursor-pointer hover:underline">
                {nickname}
              </span>
              {Boolean(post.recommend || post.author?.verified) && (
                <BadgeCheck size={16} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />
              )}
              <span className="text-[14px] text-slate-500 dark:text-rdark-text2 truncate">
                {handle}
              </span>
              <span className="text-slate-400 dark:text-rdark-text2">·</span>
              <span className="text-[14px] text-slate-500 dark:text-rdark-text2 cursor-pointer hover:underline shrink-0">
                {displayTime}
              </span>
            </div>
            <button className="p-1.5 -mr-1.5 -mt-0.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 dark:text-rdark-text2 hover:text-blue-500 cursor-pointer border-0 bg-transparent transition-colors shrink-0">
              <MoreHorizontal size={17} />
            </button>
          </div>

          <span className={`inline-block text-[10px] md:text-[11px] font-semibold px-2 !py-1 md:!py-2 rounded-full mt-0.5 mb-1 ${FORUM_TAGS[tag] ?? FORUM_TAGS['讨论']}`}>
            #{tag}
          </span>

          {post.title && (
            <div className="text-[15px] font-semibold text-slate-900 dark:text-rdark-text">
              {post.title}
            </div>
          )}

          <p className={`legacy-forum-post-text !py-1.5 md:!py-2 text-[14px] md:text-[15px] text-slate-900 dark:text-rdark-text leading-[1.5] whitespace-pre-wrap ${textExpanded ? '' : 'line-clamp-2 md:line-clamp-none'}`}>
            {content}
          </p>
          {canExpandText && (
            <button
              type="button"
              onClick={() => setTextExpanded((v) => !v)}
              className="md:hidden text-[12px] font-semibold text-blue-500 hover:text-blue-600 bg-transparent border-0 p-0"
            >
              {textExpanded ? '收起' : '展开'}
            </button>
          )}

          {images.length > 0 && <ImageGrid images={images} />}

          <div className="legacy-forum-post-actions flex items-center !mt-3 md:!mt-4 -ml-1 md:-ml-2 max-w-full md:max-w-[450px] gap-1.5 md:gap-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <ActionBtn
              icon={<MessageCircle size={17} className="group-hover:text-blue-500 transition-colors" />}
              count={formatCount(commentCount)}
              hoverColor="bg-blue-50 dark:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            />
            <ActionBtn
              icon={<Repeat2 size={17} className="group-hover:text-green-500 transition-colors" />}
              count={formatCount(Math.floor(displayLikes * 0.3))}
              hoverColor="bg-green-50 dark:bg-green-900/20"
            />
            <button
              onClick={(e) => { e.stopPropagation(); void handleLike(); }}
              className={`group flex items-center gap-1 cursor-pointer border-0 bg-transparent transition-colors ${
                liked ? 'text-pink-600' : 'text-slate-500 dark:text-rdark-text2'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${liked ? '' : 'group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20'}`}>
                <motion.div animate={liked ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Heart size={17} fill={liked ? 'currentColor' : 'none'} className={liked ? '' : 'group-hover:text-pink-600 transition-colors'} />
                </motion.div>
              </div>
              <span className={`text-[13px] -ml-0.5 transition-colors ${liked ? '' : 'group-hover:text-pink-600'}`}>
                {formatCount(likeCount)}
              </span>
            </button>
            <ActionBtn
              icon={<BarChart2 size={17} className="group-hover:text-blue-500 transition-colors" />}
              count={formatCount(viewCount)}
              hoverColor="bg-blue-50 dark:bg-blue-900/20"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextFavorited = !bookmarked;
                setBookmarked(nextFavorited);
                void Promise.resolve(onToggleFavorite?.(post.id, nextFavorited)).catch(() => {
                  setBookmarked(!nextFavorited);
                });
              }}
              className={`group cursor-pointer border-0 bg-transparent transition-colors ${
                bookmarked ? 'text-blue-500' : 'text-slate-500 dark:text-rdark-text2'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${bookmarked ? '' : 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
                <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} className={bookmarked ? '' : 'group-hover:text-blue-500 transition-colors'} />
              </div>
            </button>
            <button className="group cursor-pointer border-0 bg-transparent text-slate-500 dark:text-rdark-text2 transition-colors">
              <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                <Share size={17} className="group-hover:text-blue-500 transition-colors" />
              </div>
            </button>
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
                <div className="legacy-forum-comments mt-2 pt-2.5 md:pt-3 border-t border-slate-100 dark:border-rdark-border">
                  <CommentComposer
                    disabled={!canComment}
                    placeholder={canComment ? '写下你的评论...' : '登录后可参与评论'}
                    submitting={createCommentMutation.isLoading}
                    onSubmit={handleCreateComment}
                  />

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
                                  <div className="!mt-3 grid grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-white/8 md:grid-cols-4">
                                    {comment.imageList.map((image, imageIndex) => (
                                      <div key={`${String(comment.id)}-${imageIndex}`} className="aspect-square overflow-hidden bg-[#111111]">
                                        <img src={resolveAssetUrl(image.url || image.preview)} alt="" className="h-full w-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
};
