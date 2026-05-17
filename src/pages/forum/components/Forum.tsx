/**
 * 文件说明：Forum，论坛线报页面组件。
 */
import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { ForumCompose, type ForumComposeSubmitPayload } from './ForumCompose';
import { TopicPostCard } from './TopicPostCard';
import {
  useInfiniteRequestTopicTopics,
  useRequestCreateTopic,
  useRequestFavoriteTopic,
  useRequestLikeEntity,
  useRequestTopicNodeNavs,
  useRequestUnlikeEntity,
} from '@/hooks/useTopicRequests';
import type { PredictionCardItem } from './predictionCards';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface ForumProps {
  newsByMarketId?: Map<number, PredictionCardItem>;
  onOpenLinkedPrediction?: (item: PredictionCardItem) => void;
  showComposer?: boolean;
  composerOpenSignal?: number;
  composerFocusSignal?: number;
  onCloseComposer?: () => void;
  mobileBottomSheetComposer?: boolean;
}

type PredictionContextLike = {
  marketId?: number;
  eventName?: string;
  detail?: string;
  imageUrl?: string;
  proText?: string;
  conText?: string;
  proVoteCount?: number;
  conVoteCount?: number;
};

function buildLinkedPrediction(
  post: { title?: string; summary?: string; context?: PredictionContextLike | null },
  matched?: PredictionCardItem,
): PredictionCardItem | null {
  if (matched) return matched;
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

/** 帖子流固定为「最新」内置频道 nodeId = 0 */
const LATEST_NODE_ID = 0;

export const Forum: React.FC<ForumProps> = ({
  newsByMarketId,
  onOpenLinkedPrediction,
  showComposer = true,
  composerOpenSignal,
  composerFocusSignal,
  onCloseComposer,
  mobileBottomSheetComposer = false,
}) => {
  const nodeNavsQuery = useRequestTopicNodeNavs();

  const createTopicMutation = useRequestCreateTopic();
  const favoriteTopicMutation = useRequestFavoriteTopic();
  const likeEntityMutation = useRequestLikeEntity();
  const unlikeEntityMutation = useRequestUnlikeEntity();

  const createNodeId = useMemo(() => {
    const firstCustomNode = (nodeNavsQuery.data ?? []).find((nav) => nav.id > 0);
    return firstCustomNode?.id ?? 1;
  }, [nodeNavsQuery.data]);

  const topicFeedQuery = useInfiniteRequestTopicTopics(LATEST_NODE_ID);

  const posts = useMemo(
    () => (topicFeedQuery.data?.pages ?? []).flatMap((page) => page.results ?? []),
    [topicFeedQuery.data],
  );

  const handleCreatePost = async (payload: ForumComposeSubmitPayload) => {
    const rawTitle = payload.title.trim();
    const rawContent = payload.content.trim();
    let topicTitle = rawTitle.slice(0, 120);
    let topicContent = rawContent.slice(0, 4000);
    if (!topicContent && rawTitle) topicContent = rawTitle;
    if (!topicTitle && topicContent) topicTitle = topicContent.slice(0, 80);
    if (!topicTitle && !topicContent && payload.images.length > 0) {
      topicTitle = '图片分享';
      topicContent = '分享了配图';
    }

    await createTopicMutation.mutateAsync({
      type: 1,
      nodeId: createNodeId,
      title: topicTitle,
      content: topicContent,
      contentType: 'text',
      hideContent: '',
      tags: [payload.tag],
      imageList: payload.images.map((url) => ({ url })),
      vote: null,
      captchaId: '',
      captchaCode: '',
      captchaProtocol: 2,
    });

    await topicFeedQuery.refetch();
  };

  const handleToggleFavorite = async (postId: string, _nextFavorited: boolean) => {
    await favoriteTopicMutation.mutateAsync(postId);
  };

  const handleLike = async (postId: string) => {
    await likeEntityMutation.mutateAsync({ entityType: 'topic', entityId: postId });
  };

  const handleUnlike = async (postId: string) => {
    await unlikeEntityMutation.mutateAsync({ entityType: 'topic', entityId: postId });
  };

  return (
    <div className="legacy-forum relative min-h-screen bg-[#080808] md:bg-[#090909] dark:md:bg-rdark-card">
      {showComposer && (
        <div id="forum-compose-anchor" className="pb-2 pt-1 md:pb-3 md:pt-1 scroll-mt-16 md:scroll-mt-20">
          <ForumCompose
            onPost={handleCreatePost}
            posting={createTopicMutation.isLoading}
            openSignal={composerOpenSignal}
            focusComposerSignal={composerFocusSignal}
            onCloseComposer={onCloseComposer}
            showEntryButton={!mobileBottomSheetComposer}
            mobileBottomSheet={mobileBottomSheetComposer}
          />
        </div>
      )}

      <div className="space-y-3 pb-6 pt-2 md:space-y-4 md:pb-10 md:pt-4">
        {topicFeedQuery.isFetching && posts.length > 0 && (
          <div className="py-3 text-center text-[13px] text-zinc-500">正在刷新...</div>
        )}

        {topicFeedQuery.isLoading && posts.length === 0 && (
          <div className="py-8 text-center text-[14px] text-zinc-400">正在加载社区广场...</div>
        )}

        {topicFeedQuery.isError && posts.length === 0 && (
          <div className="py-8 text-center text-[14px] text-rose-300">
            {topicFeedQuery.error instanceof Error ? topicFeedQuery.error.message : '帖子加载失败'}
          </div>
        )}

        {!topicFeedQuery.isLoading && !topicFeedQuery.isError && posts.length === 0 && (
          <div className="py-10 text-center text-[14px] text-zinc-500">还没有内容，发第一条试试。</div>
        )}

        {posts.map((post, i) => {
          const linkedPrediction = buildLinkedPrediction(
            post,
            typeof post.context?.marketId === 'number' ? newsByMarketId?.get(post.context.marketId) : undefined,
          );

          return (
            <TopicPostCard
              key={post.id}
              post={post}
              index={i}
              linkedPrediction={linkedPrediction}
              onOpenLinkedPrediction={onOpenLinkedPrediction}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onToggleFavorite={handleToggleFavorite}
            />
          );
        })}

        <div className="legacy-forum-loadmore py-10 text-center">
          {topicFeedQuery.hasNextPage ? (
            <button
              type="button"
              onClick={() => topicFeedQuery.fetchNextPage()}
              disabled={topicFeedQuery.isFetchingNextPage}
              className="inline-flex min-w-[140px] cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-[13px] font-semibold text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:border-emerald-400/25 hover:bg-emerald-500/10 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {topicFeedQuery.isFetchingNextPage ? '加载中…' : '加载更多'}
            </button>
          ) : (
            posts.length > 0 && (
              <div className="text-[12px] font-medium text-zinc-600">
                — 已经到底 —
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
