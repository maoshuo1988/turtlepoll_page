import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Share, BarChart2, MoreHorizontal, BadgeCheck, Bookmark } from 'lucide-react';
import type { ForumPost as ForumPostType } from '../../../data/mock_data';
import { FORUM_TAGS } from '../../../data/mock_data';

interface ForumPostProps {
  post: ForumPostType;
  index: number;
  onLike?: (postId: string) => void | Promise<void>;
  onUnlike?: (postId: string) => void | Promise<void>;
  onToggleFavorite?: (postId: string, nextFavorited: boolean) => void | Promise<void>;
  onLikeComment?: (postId: string, commentId: string) => void;
  onAddComment?: (postId: string, content: string) => void;
}

const formatCount = (n: number) => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n > 0 ? String(n) : '';
};

/* ── Image Grid (X / Twitter style) ── */
const ImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  const count = images.length;
  if (count === 0) return null;

  const baseClass = 'w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity';

  if (count === 1) {
    return (
      <div className="mt-2.5 md:mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-rdark-border">
        <img src={images[0]} alt="" loading="lazy" className={`${baseClass} max-h-[220px] sm:max-h-[320px] md:max-h-[510px]`} />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-2.5 md:mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-rdark-border grid grid-cols-2 gap-0.5 h-[156px] sm:h-[220px] md:h-[286px]">
        <img src={images[0]} alt="" loading="lazy" className={baseClass} />
        <img src={images[1]} alt="" loading="lazy" className={baseClass} />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-2.5 md:mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-rdark-border grid grid-cols-2 grid-rows-2 gap-0.5 h-[156px] sm:h-[220px] md:h-[286px]">
        <div className="row-span-2">
          <img src={images[0]} alt="" loading="lazy" className={`${baseClass} h-full`} />
        </div>
        <img src={images[1]} alt="" loading="lazy" className={baseClass} />
        <img src={images[2]} alt="" loading="lazy" className={baseClass} />
      </div>
    );
  }

  return (
    <div className="mt-2.5 md:mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-rdark-border grid grid-cols-2 grid-rows-2 gap-0.5 h-[156px] sm:h-[220px] md:h-[286px]">
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="relative overflow-hidden">
          <img src={src} alt="" loading="lazy" className={baseClass} />
          {i === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/50 grid place-items-center text-white text-2xl font-bold cursor-pointer">
              +{images.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ── Action Button ── */
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

/* ── Main Post Card ── */
export const ForumPostCard: React.FC<ForumPostProps> = ({
  post,
  index,
  onLike,
  onUnlike,
  onToggleFavorite,
  onLikeComment,
  onAddComment,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.favorited));

  const commentCount = typeof post.commentCount === 'number' ? post.commentCount : post.comments.length;
  const viewCount = typeof post.viewCount === 'number' ? post.viewCount : post.likes * 14 + post.comments.length * 42;
  const canReply = typeof onAddComment === 'function';
  const hasCommentThread = post.comments.length > 0 || canReply;

  const handleLike = async () => {
    if (liked) {
      if (!onUnlike) return;
      await onUnlike(post.id);
      setLiked(false);
      return;
    }

    if (!onLike) return;
    await onLike(post.id);
    setLiked(true);
  };

  const handleReply = () => {
    if (!onAddComment) return;
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onAddComment(post.id, trimmed);
    setReplyText('');
  };

  const likeBase = post.likes - (post.liked ? 1 : 0);
  const likeCount = likeBase + (liked ? 1 : 0);
  const canExpandText = post.content.length > 52;

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className="legacy-forum-post !py-3 border-b border-slate-100 dark:border-rdark-border hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
    >
      <div className="legacy-forum-post-row flex gap-3">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          <div className="legacy-forum-post-avatar w-15 h-15 rounded-full bg-slate-100 dark:bg-rdark-input grid place-items-center text-xl cursor-pointer hover:opacity-80 transition-opacity">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              post.author.avatar
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: name / handle / time / more */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-[15px] font-bold text-slate-900 dark:text-rdark-text truncate cursor-pointer hover:underline">
                {post.author.name}
              </span>
              {post.author.verified && (
                <BadgeCheck size={16} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />
              )}
              <span className="text-[14px] text-slate-500 dark:text-rdark-text2 truncate">
                {post.author.handle}
              </span>
              <span className="text-slate-400 dark:text-rdark-text2">·</span>
              <span className="text-[14px] text-slate-500 dark:text-rdark-text2 cursor-pointer hover:underline shrink-0">
                {post.time}
              </span>
            </div>
            <button className="p-1.5 -mr-1.5 -mt-0.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 dark:text-rdark-text2 hover:text-blue-500 cursor-pointer border-0 bg-transparent transition-colors shrink-0">
              <MoreHorizontal size={17} />
            </button>
          </div>

          {/* Tag badge */}
          <span className={`inline-block text-[10px] md:text-[11px] font-semibold px-2 !py-1 md:!py-2 rounded-full mt-0.5 mb-1 ${FORUM_TAGS[post.tag] ?? FORUM_TAGS['讨论']}`}>
            #{post.tag}
          </span>

          {/* Post text */}
          <p className={`legacy-forum-post-text !py-1.5 md:!py-2 text-[14px] md:text-[15px] text-slate-900 dark:text-rdark-text leading-[1.5] whitespace-pre-wrap ${textExpanded ? '' : 'line-clamp-2 md:line-clamp-none'}`}>
            {post.content}
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

          {/* Images */}
          {post.images && post.images.length > 0 && <ImageGrid images={post.images} />}

          {/* Action bar */}
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
              count={formatCount(Math.floor(post.likes * 0.3))}
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
                void onToggleFavorite?.(post.id, nextFavorited);
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

          {/* ── Comments thread ── */}
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
                  {!hasCommentThread && (
                    <p className="text-[13px] text-slate-400 dark:text-rdark-text2 mb-3">评论详情接口还没接入，这里先展示评论数。</p>
                  )}
                  {hasCommentThread && post.comments.length === 0 && (
                    <p className="text-[13px] text-slate-400 dark:text-rdark-text2 mb-3">还没有回复，来抢沙发！</p>
                  )}
                  {post.comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5 py-3 border-b border-slate-50 dark:border-rdark-border/40 last:border-b-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-rdark-input grid place-items-center text-sm shrink-0 cursor-pointer">
                        {c.author.avatarUrl ? (
                          <img src={c.author.avatarUrl} alt={c.author.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          c.author.avatar
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-bold text-slate-900 dark:text-rdark-text cursor-pointer hover:underline">{c.author.name}</span>
                          <span className="text-[12px] text-slate-500 dark:text-rdark-text2">{c.author.handle}</span>
                          <span className="text-slate-300 dark:text-rdark-text2">·</span>
                          <span className="text-[12px] text-slate-500 dark:text-rdark-text2">{c.time}</span>
                        </div>
                        <p className="text-[14px] text-slate-800 dark:text-rdark-text leading-snug mt-0.5">{c.content}</p>
                        <div className="flex items-center gap-5 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onLikeComment?.(post.id, c.id); }}
                            className="group flex items-center gap-1 text-[12px] text-slate-400 dark:text-rdark-text2 hover:text-pink-500 cursor-pointer transition-colors border-0 bg-transparent"
                          >
                            <Heart size={13} /> {c.likes}
                          </button>
                          <button className="text-[12px] text-slate-400 dark:text-rdark-text2 hover:text-blue-500 cursor-pointer transition-colors border-0 bg-transparent">
                            <MessageCircle size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reply compose */}
                  {canReply && (
                    <div className="flex items-center gap-2 pt-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 dark:bg-rdark-input grid place-items-center text-xs md:text-sm shrink-0">
                        🦊
                      </div>
                      <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-rdark-border rounded-full px-3 md:px-4 py-1.5 md:py-2 focus-within:border-blue-500 transition-colors">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="发布你的回复"
                          className="flex-1 bg-transparent border-0 outline-none text-[13px] md:text-[14px] text-slate-800 dark:text-rdark-text placeholder:text-slate-400 dark:placeholder:text-rdark-text2"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReply(); }}
                          disabled={!replyText.trim()}
                          className="px-3 md:px-4 py-1 rounded-full text-[12px] md:text-[13px] font-bold bg-blue-500 text-white border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                        >
                          回复
                        </button>
                      </div>
                    </div>
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
