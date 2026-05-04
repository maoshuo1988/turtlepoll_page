/**
 * 文件说明：Forum，论坛线报相关共享组件。
 */
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { ForumCompose } from './ForumCompose';
import { TopicPostCard } from './TopicPostCard';
import type { TopicPostTag } from './TopicPostCard';
import type { TopicNodeNav } from '@/hook/topicType';
import { useInfiniteRequestTopicTopics, useRequestCreateTopic, useRequestFavoriteTopic, useRequestLikeEntity, useRequestTopicNodeNavs, useRequestUnlikeEntity } from '@/hook/useTopicRequest';
import type { PredictionCardItem } from '../../predictions/ui/predictionCard';


dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

type ForumTopTab = TopicNodeNav & {
  key: string;
  label: string;
  nodeId: number;
};

interface ForumProps {
  newsByMarketId?: Map<number, PredictionCardItem>;
  onOpenLinkedPrediction?: (item: PredictionCardItem) => void;
  showComposer?: boolean;
  composerOpenSignal?: number;
  onCloseComposer?: () => void;
  forcedActiveTab?: 'latest' | 'recommend' | 'following';
  hideTopTabs?: boolean;
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

export const Forum: React.FC<ForumProps> = ({
  newsByMarketId,
  onOpenLinkedPrediction,
  showComposer = true,
  composerOpenSignal,
  onCloseComposer,
  forcedActiveTab,
  hideTopTabs = false,
  mobileBottomSheetComposer = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>('latest');
  const nodeNavsQuery = useRequestTopicNodeNavs();

  
  const createTopicMutation = useRequestCreateTopic();
  const favoriteTopicMutation = useRequestFavoriteTopic();
  const likeEntityMutation = useRequestLikeEntity();
  const unlikeEntityMutation = useRequestUnlikeEntity();

  const topTabs = useMemo<ForumTopTab[]>(() => {
    const navs = nodeNavsQuery.data ?? [];
    const latestNav = navs.find((nav) => nav.id === 0 || nav.name === '最新');
    const recommendNav = navs.find((nav) => nav.id === -1 || nav.name === '推荐');
    const followingNav = navs.find((nav) => nav.id === -2 || nav.name === '关注');

    // 顶部展示内置流和默认节点，接口返回的节点信息完整保留，便于直接使用 logo/description。
    const builtInTabs: ForumTopTab[] = [
      { ...(latestNav ?? { id: 0, name: '最新' }), key: 'latest', label: latestNav?.name || '最新', nodeId: 0 },
      { ...(recommendNav ?? { id: -1, name: '推荐' }), key: 'recommend', label: recommendNav?.name || '推荐', nodeId: -1 },
      { ...(followingNav ?? { id: -2, name: '关注' }), key: 'following', label: followingNav?.name || '关注', nodeId: -2 },
    ];
   

    return [...builtInTabs];
  }, [nodeNavsQuery.data]);

  useEffect(() => {
    if (forcedActiveTab) {
      setActiveTab(forcedActiveTab);
      return;
    }
    if (!topTabs.some((tab) => tab.key === activeTab) && topTabs.length > 0) {
      setActiveTab(topTabs[0].key);
    }
  }, [activeTab, forcedActiveTab, topTabs]);

  // tab 只负责切换 nodeId，下面的列表请求会跟着这个值变化。
  const activeNodeId = topTabs.find((tab) => tab.key === activeTab)?.nodeId ?? 0;
  const createNodeId = useMemo(() => {
    // 发帖需要落到真实节点，内置流（最新/推荐/关注）没有可写 nodeId。
    if (activeNodeId > 0) return activeNodeId;
    const firstCustomNode = (nodeNavsQuery.data ?? []).find((nav) => nav.id > 0);
    return firstCustomNode?.id ?? 1;
  }, [activeNodeId, nodeNavsQuery.data]);



  const topicFeedQuery = useInfiniteRequestTopicTopics(activeNodeId);

  const posts = useMemo(
    () => (topicFeedQuery.data?.pages ?? []).flatMap((page) => page.results ?? []),
    [topicFeedQuery.data],
  );


  const handleCreatePost = async (content: string, tag: TopicPostTag, images: string[]) => {
    await createTopicMutation.mutateAsync({
      type: 1,
      nodeId: createNodeId,
      title: content.slice(0, 40),
      content,
      contentType: 'text',
      hideContent: '',
      tags: [tag],
      imageList: images.map((url) => ({ url })),
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
    <div className="legacy-forum relative min-h-screen bg-[#080808] md:border-x md:border-white/8 md:bg-[#090909] dark:md:border-rdark-border dark:md:bg-rdark-card">
      {/*
        Mobile forum top tabs:
        手机端首页现在直接复用社区流，所以“最新 / 推荐 / 关注”固定挂在这里。
        这组 tab 只负责切换帖子流，不再承载发帖动作。
      */}
      {!hideTopTabs && (
        <div className="legacy-forum-tabs sticky top-[58px] z-30 w-full bg-[#080808]/94 px-0 pb-2 backdrop-blur-xl md:top-0 md:border-b md:border-white/8 md:bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.05),transparent_44%),linear-gradient(180deg,#0b0b0c_0%,#101114_100%)] md:px-0 md:pb-0 dark:md:border-rdark-border">
          <div className="legacy-forum-tabs-row mx-auto flex h-[46px] rounded-full border border-white/8 bg-[#111214]/92 p-1 shadow-[0_8px_20px_rgba(0,0,0,0.28)] md:h-[50px] md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            {topTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`legacy-forum-tab relative flex-1 cursor-pointer rounded-full border-0 bg-transparent py-2 text-[15px] tracking-[0.01em] transition-colors md:py-3.5 md:text-[16px] md:rounded-none ${
                  activeTab === tab.key
                    ? 'legacy-forum-tab-on bg-white/8 font-extrabold text-[#e6f7ff] md:bg-transparent md:text-[#e6f7ff]'
                    : 'font-semibold text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="!mt-2 legacy-forum-tab-indicator absolute bottom-0 left-1/2 hidden h-[3px] w-[112px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.28)] md:block" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {showComposer && (
        <div className="px-0 pb-2 pt-0 md:border-b md:border-white/8 md:bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,0.04),transparent_42%),linear-gradient(180deg,#101114_0%,#0d0d0f_100%)] md:px-3 md:py-2.5">
          <ForumCompose
            onPost={handleCreatePost}
            posting={createTopicMutation.isLoading}
            openSignal={composerOpenSignal}
            onCloseComposer={onCloseComposer}
            showEntryButton={!mobileBottomSheetComposer}
            mobileBottomSheet={mobileBottomSheetComposer}
          />
        </div>
      )}

      <div className="space-y-3 pb-3 md:space-y-0 md:pb-0">
        {topicFeedQuery.isFetching && posts.length > 0 && (
          <div className="px-5 py-3 text-center text-[13px] text-zinc-500">正在刷新当前分区...</div>
        )}

        {topicFeedQuery.isLoading && posts.length === 0 && (
          <div className="px-5 py-8 text-center text-[14px] text-zinc-400">正在加载社区广场...</div>
        )}

        {topicFeedQuery.isError && posts.length === 0 && (
          <div className="px-5 py-8 text-center text-[14px] text-rose-300">
            {topicFeedQuery.error instanceof Error ? topicFeedQuery.error.message : '帖子加载失败'}
          </div>
        )}

        {!topicFeedQuery.isLoading && !topicFeedQuery.isError && posts.length === 0 && (
          <div className="px-5 py-10 text-center text-[14px] text-zinc-500">这个分区还没有内容，发第一条试试。</div>
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

        <div className="legacy-forum-loadmore py-8 text-center">
          {topicFeedQuery.hasNextPage ? (
            <button
              onClick={() => topicFeedQuery.fetchNextPage()}
              disabled={topicFeedQuery.isFetchingNextPage}
              className="legacy-forum-loadmore-btn cursor-pointer border-0 bg-transparent text-[14px] font-medium text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {topicFeedQuery.isFetchingNextPage ? '加载中...' : '加载更多'}
            </button>
          ) : (
            posts.length > 0 && <div className="text-[13px] text-zinc-500">已经到底了</div>
          )}
        </div>
      </div>
    </div>
  );
};
