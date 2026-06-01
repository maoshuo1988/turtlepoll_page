/** 文件说明：个人中心帖子流，复用线报 TopicPostCard 展示与交互。 */
import { useMemo, useState } from 'react';
import type { UseInfiniteQueryResult } from 'react-query';
import { TopicPostCard } from '@/pages/forum/components/TopicPostCard';
import type { PredictionCardItem } from '@/pages/forum/components/predictionCards';
import { EmptyDataPage } from '@/components/common/state/PageState';
import type { CursorResult, TopicResponse } from '@/hooks/topicTypes';
import {
  useRequestFavoriteTopic,
  useRequestLikeEntity,
  useRequestUnlikeEntity,
} from '@/hooks/useTopicRequests';
import { useMutateUserTopicHide, useMutateUserTopicUnhide } from '@/hooks/useUserCenterRequests';
import { useMutateDislikeTopic, useMutateUndislikeTopic } from '@/hooks/useDislikeRequests';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { showOperationErrorFromUnknown } from '@/utils/operationToast';

type ProfileTopicFeedQuery = Pick<
  UseInfiniteQueryResult<CursorResult<TopicResponse>>,
  'isLoading' | 'isError' | 'error' | 'hasNextPage' | 'isFetchingNextPage' | 'isFetching' | 'fetchNextPage'
>;

interface ProfileTopicFeedProps {
  topics: TopicResponse[];
  query: ProfileTopicFeedQuery;
  empty: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  loadingLabel?: string;
  errorLabel?: string;
  /** 自己的帖子 Tab：展示隐藏入口 */
  enableHideOwnPost?: boolean;
  /** 已隐藏 Tab：展示取消隐藏 */
  enableUnhide?: boolean;
  onRequireAuth?: () => void;
  className?: string;
}

function buildLinkedPrediction(
  post: TopicResponse,
): PredictionCardItem | null {
  const context = post.context;
  if (!context || typeof context.marketId !== 'number') return null;

  return {
    id: `market-${context.marketId}`,
    marketId: context.marketId,
    title: context.eventName || post.title || `事件 #${context.marketId}`,
    summary: context.detail || post.summary || '进入事件页查看最新赔率、讨论和下注入口。',
    image: context.imageUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    votes: {
      A: context.proVoteCount ?? 0,
      B: context.conVoteCount ?? 0,
    },
    optionA: context.proText || '支持',
    optionB: context.conText || '反对',
    oddsA: 1.8,
    oddsB: 1.8,
    status: 'open',
  };
}

export function ProfileTopicFeed({
  topics,
  query,
  empty,
  loadingLabel = '正在加载帖子...',
  errorLabel = '帖子加载失败',
  enableHideOwnPost = false,
  enableUnhide = false,
  onRequireAuth,
  className = '',
}: ProfileTopicFeedProps) {
  const requireAuth = useRequireAuth(onRequireAuth);
  const favoriteTopicMutation = useRequestFavoriteTopic();
  const likeEntityMutation = useRequestLikeEntity();
  const unlikeEntityMutation = useRequestUnlikeEntity();
  const hideTopicMutation = useMutateUserTopicHide();
  const unhideTopicMutation = useMutateUserTopicUnhide();
  const dislikeTopicMutation = useMutateDislikeTopic();
  const undislikeTopicMutation = useMutateUndislikeTopic();
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => new Set());

  const visibleTopics = useMemo(
    () => topics.filter((topic) => !hiddenPostIds.has(String(topic.id))),
    [hiddenPostIds, topics],
  );

  const hidingPostId = hideTopicMutation.isLoading
    ? String(hideTopicMutation.variables?.topicId ?? '')
    : '';
  const unhidingPostId = unhideTopicMutation.isLoading
    ? String(unhideTopicMutation.variables?.topicId ?? '')
    : '';

  const handleToggleFavorite = async (postId: string) => {
    if (!requireAuth()) return;
    try {
      await favoriteTopicMutation.mutateAsync(postId);
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '收藏操作失败' });
      throw error;
    }
  };

  const handleHideTopic = async (postId: string) => {
    if (!requireAuth()) return;

    try {
      await hideTopicMutation.mutateAsync({ topicId: postId });
      setHiddenPostIds((prev) => {
        const next = new Set(prev);
        next.add(String(postId));
        return next;
      });
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '隐藏帖子失败' });
      throw error;
    }
  };

  const handleUnhideTopic = async (postId: string) => {
    if (!requireAuth()) return;

    try {
      await unhideTopicMutation.mutateAsync({ topicId: postId });
      setHiddenPostIds((prev) => {
        const next = new Set(prev);
        next.delete(String(postId));
        return next;
      });
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '取消隐藏失败' });
      throw error;
    }
  };

  const handleLike = async (postId: string) => {
    if (!requireAuth()) return;
    try {
      await likeEntityMutation.mutateAsync({ entityType: 'topic', entityId: postId });
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '点赞失败' });
      throw error;
    }
  };

  const handleUnlike = async (postId: string) => {
    if (!requireAuth()) return;
    try {
      await unlikeEntityMutation.mutateAsync({ entityType: 'topic', entityId: postId });
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '取消点赞失败' });
      throw error;
    }
  };

  const handleDislike = async (postId: string) => {
    if (!requireAuth()) return;
    try {
      await dislikeTopicMutation.mutateAsync({ entityType: 'topic', entityId: postId });
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '点踩失败' });
      throw error;
    }
  };

  const handleUndislike = async (postId: string) => {
    if (!requireAuth()) return;
    try {
      await undislikeTopicMutation.mutateAsync({ entityType: 'topic', entityId: postId });
    } catch (error) {
      showOperationErrorFromUnknown(error, { fallback: '取消点踩失败' });
      throw error;
    }
  };

  if (query.isLoading && topics.length === 0) {
    return (
      <div className={`py-8 text-center text-[14px] text-zinc-400 ${className}`}>
        {loadingLabel}
      </div>
    );
  }

  if (query.isError && topics.length === 0) {
    return (
      <div className={`py-8 text-center text-[14px] text-rose-300 ${className}`}>
        {query.error instanceof Error ? query.error.message : errorLabel}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className={`border-t border-white/10 ${className}`}>
        <EmptyDataPage
          title={empty.title}
          description={empty.description}
          actionLabel={empty.actionLabel}
          onAction={empty.onAction}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-3 pb-2 md:space-y-4 md:pb-4 ${className}`}>
      {query.isFetching && visibleTopics.length > 0 && (
        <div className="py-3 text-center text-[13px] text-zinc-500">正在刷新...</div>
      )}

      {visibleTopics.map((post, index) => (
        <TopicPostCard
          key={String(post.id)}
          post={post}
          index={index}
          linkedPrediction={buildLinkedPrediction(post)}
          onLike={handleLike}
          onUnlike={handleUnlike}
          onDislike={handleDislike}
          onUndislike={handleUndislike}
          onToggleFavorite={handleToggleFavorite}
          onHideTopic={enableHideOwnPost ? handleHideTopic : undefined}
          isHidingTopic={hidingPostId === String(post.id)}
          onUnhideTopic={enableUnhide ? handleUnhideTopic : undefined}
          isUnhidingTopic={unhidingPostId === String(post.id)}
        />
      ))}

      <div className="py-8 text-center">
        {query.hasNextPage ? (
          <button
            type="button"
            onClick={() => {
              void query.fetchNextPage();
            }}
            disabled={query.isFetchingNextPage}
            className="inline-flex min-w-[140px] cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-[13px] font-semibold text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:border-emerald-400/25 hover:bg-emerald-500/10 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {query.isFetchingNextPage ? '加载中…' : '加载更多'}
          </button>
        ) : (
          visibleTopics.length > 0 && (
            <div className="text-[12px] font-medium text-zinc-600">— 已经到底 —</div>
          )
        )}
      </div>
    </div>
  );
}
