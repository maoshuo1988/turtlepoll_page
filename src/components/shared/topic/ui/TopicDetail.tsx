import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { ArrowLeft, CornerDownRight, Flame, MessageSquare, SendHorizonal } from 'lucide-react';
import { HeroPrediction } from '../../predictions/ui/HeroPrediction';
import type { PlaceBetResult } from '@/hook/coinType';
import type { SidebarHotTopic } from '@/components/shared/layout';
import { usePredictionCardItems, type PredictionCardItem } from '../../predictions/ui/predictionCard';
import { SERVER_API } from '@/constant';
import { useRequestUserCurrent } from '@/hook/useRequest';
import { type CommentResponse, useRequestCommentComments, useRequestCommentReplies, useRequestCreateComment } from '@/hook/useCommentRequest';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const card =
  '!p-4 rounded-xl bg-[linear-gradient(180deg,#141414_0%,#0d0d0d_100%)] border border-white/8 shadow-[0_10px_28px_rgba(0,0,0,0.24)]';

function fmtHeat(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const resolveAssetUrl = (src?: string) => {
  if (!src) return '';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('/')) return `${SERVER_API}${src}`;
  return `${SERVER_API}/${src}`;
};

const mergeComments = (prev: CommentResponse[], next: CommentResponse[]) => {
  const map = new Map<string, CommentResponse>();
  [...prev, ...next].forEach((item) => {
    map.set(String(item.id), item);
  });
  return Array.from(map.values());
};

const formatCommentTime = (timestamp?: number) => {
  if (!timestamp) return '刚刚';
  const value = String(timestamp).length <= 10 ? timestamp * 1000 : timestamp;
  return dayjs(value).fromNow();
};

const getUserDisplayName = (comment?: CommentResponse | null) =>
  comment?.user?.nickname || comment?.user?.username || `用户 ${comment?.user?.id ?? ''}`.trim() || '匿名用户';

const getEntityId = (topic: SidebarHotTopic | null) => topic?.context?.id ?? topic?.context?.marketId ?? null;

type CommentComposerProps = {
  placeholder: string;
  submitting: boolean;
  disabled?: boolean;
  compact?: boolean;
  onFocusRequireAuth?: () => void;
  onSubmit: (content: string) => Promise<void>;
};

const CommentComposer: React.FC<CommentComposerProps> = ({
  placeholder,
  submitting,
  disabled = false,
  compact = false,
  onFocusRequireAuth,
  onSubmit,
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting || disabled) return;
    await onSubmit(trimmed);
    setContent('');
  };

  return (
    <div className={`rounded-2xl border border-white/8 bg-[#111111] ${compact ? '!p-3' : '!p-4'} shadow-[0_8px_24px_rgba(0,0,0,0.32)]`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => {
          if (disabled) onFocusRequireAuth?.();
        }}
        placeholder={placeholder}
        rows={compact ? 3 : 4}
        className="w-full resize-none border-0 bg-transparent text-[14px] leading-6 text-[#ece7de] outline-none placeholder:text-[#7d766d]"
      />
      <div className="!mt-3 flex items-center justify-between">
        <span className="text-[12px] text-[#8f877d]">{content.trim().length}/280</span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || submitting || content.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-[#5d5245] bg-[linear-gradient(180deg,#2a2825_0%,#161515_100%)] !px-4 !py-2 text-[13px] font-bold text-[#f1e6d2] shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:border-[#8a7457] hover:text-[#fff0d7] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SendHorizonal size={14} />
          {submitting ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

type ReplyThreadProps = {
  comment: CommentResponse;
  canComment: boolean;
  onRequireAuth?: () => void;
};

const ReplyThread: React.FC<ReplyThreadProps> = ({ comment, canComment, onRequireAuth }) => {
  const [cursor, setCursor] = useState<number | string>(0);
  const [replies, setReplies] = useState<CommentResponse[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [quoteTarget, setQuoteTarget] = useState<CommentResponse | null>(null);
  const replyQuery = useRequestCommentReplies({ commentId: comment.id, cursor });
  const createCommentMutation = useRequestCreateComment();

  useEffect(() => {
    setCursor(0);
    setReplies([]);
    setReplyOpen(false);
    setQuoteTarget(null);
  }, [comment.id]);

  useEffect(() => {
    const results = replyQuery.data?.results ?? [];
    if (results.length === 0) {
      if (cursor === 0) setReplies([]);
      return;
    }
    setReplies((prev) => (cursor === 0 ? results : mergeComments(prev, results)));
  }, [cursor, replyQuery.data]);

  const handleReplySubmit = async (content: string) => {
    if (!canComment) {
      onRequireAuth?.();
      return;
    }

    await createCommentMutation.mutateAsync({
      entityType: 'comment',
      entityId: comment.id,
      content,
      quoteId: quoteTarget ? quoteTarget.id : 0,
    });

    setReplyOpen(false);
    setQuoteTarget(null);
    if (cursor === 0) {
      await replyQuery.refetch();
      return;
    }
    setCursor(0);
    setReplies([]);
  };

  const totalReplyCount = Math.max(comment.replyCount ?? 0, replies.length);

  return (
    <div className="!mt-4 border-t border-white/8 !pt-4">
      <div className="flex items-center justify-between text-[12px] text-[#8f877d]">
        <span>回复 {totalReplyCount}</span>
        <button
          type="button"
          onClick={() => {
            setReplyOpen((prev) => !prev);
            setQuoteTarget(null);
          }}
          className="border-0 bg-transparent font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7]"
        >
          {replyOpen ? '收起回复框' : '写回复'}
        </button>
      </div>

      {replyOpen && (
        <div className="!mt-3">
          <CommentComposer
            compact
            disabled={!canComment}
            submitting={createCommentMutation.isLoading}
            onFocusRequireAuth={onRequireAuth}
            placeholder={quoteTarget ? `回复 @${getUserDisplayName(quoteTarget)}` : `回复 @${getUserDisplayName(comment)}`}
            onSubmit={handleReplySubmit}
          />
        </div>
      )}

      {replyQuery.isLoading && replies.length === 0 && (
        <div className="!mt-3 text-[13px] text-slate-400 dark:text-rdark-text2">正在加载回复...</div>
      )}

      {replies.length > 0 && (
        <div className="!mt-3 space-y-3">
          {replies.map((reply) => {
            const replyName = getUserDisplayName(reply);
            const replyAvatar = resolveAssetUrl(reply.user?.avatar || reply.user?.smallAvatar);
            return (
              <div key={String(reply.id)} className="rounded-2xl border border-white/7 bg-[#171717] !p-3">
                <div className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#24201c] text-[13px] font-bold text-[#f0e4d3]">
                    {replyAvatar ? (
                      <img src={replyAvatar} alt={replyName} className="h-full w-full object-cover" />
                    ) : (
                      replyName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-100">{replyName}</span>
                      <span className="text-[12px] text-[#8f877d]">{formatCommentTime(reply.createTime)}</span>
                    </div>
                    {reply.quote?.content && (
                      <div className="!mt-2 rounded-xl border border-[#5d5245]/35 bg-[#201d19] !px-3 !py-2 text-[12px] leading-5 text-[#b7aa99]">
                        @{getUserDisplayName(reply.quote)}：{reply.quote.content}
                      </div>
                    )}
                    <div className="!mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[#e8dfd3]">{reply.content || '这条回复暂时没有内容。'}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyOpen(true);
                        setQuoteTarget(reply);
                      }}
                      className="!mt-2 inline-flex items-center gap-1 border-0 bg-transparent text-[12px] font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7]"
                    >
                      <CornerDownRight size={13} />
                      回复
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {replyQuery.data?.hasMore && (
        <button
          type="button"
          onClick={() => setCursor(replyQuery.data?.cursor ?? 0)}
          disabled={replyQuery.isFetching}
          className="!mt-3 border-0 bg-transparent text-[13px] font-semibold text-[#d0b38a] transition hover:text-[#ecd0a7] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {replyQuery.isFetching ? '加载中...' : '加载更多回复'}
        </button>
      )}
    </div>
  );
};

interface TopicDetailProps {
  topic: SidebarHotTopic | null;
  onBack: () => void;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle: (newsId: string) => void;
}

export const TopicDetail: React.FC<TopicDetailProps> = ({
  topic,
  onBack,
  onBetSuccess,
  onRequireAuth,
  onEnterBattle,
}) => {
  const isAllMode = !topic;
  const entityId = getEntityId(topic);
  const [cursor, setCursor] = useState<number | string>(0);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const currentUserQuery = useRequestUserCurrent();
  const createCommentMutation = useRequestCreateComment();
  const commentQuery = useRequestCommentComments({
    entityType: 'topic',
    entityId: entityId ?? '',
    cursor,
  });
  const { allItems } = usePredictionCardItems(null);

  useEffect(() => {
    setCursor(0);
    setComments([]);
  }, [entityId]);

  useEffect(() => {
    const results = commentQuery.data?.results ?? [];
    if (results.length === 0) {
      if (cursor === 0) setComments([]);
      return;
    }
    setComments((prev) => (cursor === 0 ? results : mergeComments(prev, results)));
  }, [cursor, commentQuery.data]);

  const canComment = Boolean(currentUserQuery.data?.id);

  const detailNews = useMemo<PredictionCardItem | null>(() => {
    if (!topic) return null;

    const matched = allItems.find((item) => item.marketId === topic.context.marketId);
    if (matched) return matched;

    return {
      id: `market-${topic.context.marketId}`,
      marketId: topic.context.marketId,
      title: topic.context.eventName || topic.title,
      summary: topic.context.detail || '查看当前热点争议与讨论风向。',
      image: resolveAssetUrl(topic.context.imageUrl) || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
      votes: {
        A: topic.context.proVoteCount ?? 0,
        B: topic.context.conVoteCount ?? 0,
      },
      optionA: topic.context.proText || '支持',
      optionB: topic.context.conText || '反对',
      oddsA: 1.8,
      oddsB: 1.8,
      status: 'open',
    };
  }, [allItems, topic]);

  const handleCreateComment = async (content: string) => {
    if (!canComment) {
      onRequireAuth?.();
      return;
    }
    if (entityId === null || entityId === undefined) return;

    await createCommentMutation.mutateAsync({
      entityType: 'topic',
      entityId,
      content,
    });

    if (cursor === 0) {
      await commentQuery.refetch();
      return;
    }
    setCursor(0);
    setComments([]);
  };

  return (
    <div className="legacy-topic-page space-y-5">
      <div className={`${card} px-5 py-3.5 flex items-center justify-between`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#968d84] transition hover:text-[#f2e3cb]"
        >
          <ArrowLeft size={18} /> 返回
        </button>
        <h2 className="text-base font-bold text-[#f3eadf]">
          {isAllMode ? '全部热点' : `#${topic.title}`}
        </h2>
        {topic ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-[#d9a35b]">
            <Flame size={14} /> {fmtHeat(topic.heat)}
          </span>
        ) : (
          <span className="text-xs text-[#7f786f]">全部内容</span>
        )}
      </div>

      {detailNews && (
        <HeroPrediction
          news={detailNews}
          selectedTag={null}
          onBetSuccess={onBetSuccess}
          onRequireAuth={onRequireAuth}
          onEnterBattle={onEnterBattle}
        />
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="!py-3.5 border-b border-white/8 flex items-center gap-2">
          <MessageSquare size={16} className="text-[#d0b38a]" />
          <span className="text-sm font-bold text-[#f0e5d8]">
            {isAllMode ? '实时讨论' : '话题讨论'}
          </span>
          <span className="text-xs text-[#847c73]">
            ({comments.length}条)
          </span>
        </div>

        <div className="space-y-4 !py-4">
          <CommentComposer
            placeholder={canComment ? '写下你的判断、观点或补充信息...' : '登录后即可参与评论'}
            disabled={!canComment}
            submitting={createCommentMutation.isLoading}
            onFocusRequireAuth={onRequireAuth}
            onSubmit={handleCreateComment}
          />

          {!hasValue(entityId) && (
            <div className="rounded-2xl border border-[#5d5245] bg-[#1a1714] !px-4 !py-3 text-[13px] text-[#d9b78a]">
              当前热点没有可用的评论实体 ID，暂时无法加载评论。
            </div>
          )}

          {commentQuery.isLoading && comments.length === 0 && hasValue(entityId) && (
            <div className="text-center text-sm text-[#8a8278]">正在加载讨论内容...</div>
          )}

          {commentQuery.isError && comments.length === 0 && (
            <div className="rounded-2xl border border-[#5a3f3f] bg-[#191313] !px-4 !py-3 text-[13px] text-[#d4a1a1]">
              {commentQuery.error instanceof Error ? commentQuery.error.message : '评论加载失败'}
            </div>
          )}

          {comments.length > 0 && (
            <div className="space-y-4">
              {comments.map((comment) => {
                const authorName = getUserDisplayName(comment);
                const avatarUrl = resolveAssetUrl(comment.user?.avatar || comment.user?.smallAvatar);

                return (
                  <article key={String(comment.id)} className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(24,24,24,0.98)_0%,rgba(13,13,13,0.98)_100%)] !p-4 shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
                    <div className="flex gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#24201c] text-sm font-bold text-[#f0e4d3]">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={authorName} className="h-full w-full object-cover" />
                        ) : (
                          authorName.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-bold text-white">{authorName}</span>
                          <span className="text-[12px] text-[#8f877d]">{formatCommentTime(comment.createTime)}</span>
                          {comment.ipLocation && <span className="text-[12px] text-[#746d65]">{comment.ipLocation}</span>}
                        </div>

                        {comment.quote?.content && (
                          <div className="!mt-3 rounded-2xl border border-[#5d5245]/35 bg-[#201d19] !px-3.5 !py-2.5 text-[12px] leading-5 text-[#b7aa99]">
                            @{getUserDisplayName(comment.quote)}：{comment.quote.content}
                          </div>
                        )}

                        <div className="!mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#ece3d6]">
                          {comment.content || '这条评论暂时没有正文。'}
                        </div>

                        {Array.isArray(comment.imageList) && comment.imageList.length > 0 && (
                          <div className="!mt-3 grid grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-white/8 md:grid-cols-4">
                            {comment.imageList.map((image, index) => (
                              <div key={`${String(comment.id)}-${index}`} className="aspect-square overflow-hidden bg-[#111111]">
                                <img src={resolveAssetUrl(image.url || image.preview)} alt="" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <ReplyThread
                          comment={comment}
                          canComment={canComment}
                          onRequireAuth={onRequireAuth}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!commentQuery.isLoading && !commentQuery.isError && comments.length === 0 && hasValue(entityId) && (
            <div className="rounded-2xl border border-white/8 bg-[#151515] !px-5 !py-10 text-center text-sm text-[#8a8278]">
              暂时还没有评论，来抢个沙发。
            </div>
          )}

          {commentQuery.data?.hasMore && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setCursor(commentQuery.data?.cursor ?? 0)}
                disabled={commentQuery.isFetching}
                className="rounded-full border border-[#5d5245] bg-[#181716] !px-4 !py-2 text-[13px] font-semibold text-[#dec19a] transition hover:border-[#8a7457] hover:bg-[#211f1d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {commentQuery.isFetching ? '加载中...' : '加载更多评论'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
