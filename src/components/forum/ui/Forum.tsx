import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { ForumCompose } from './ForumCompose';
import { TopicPostCard } from './TopicPostCard';
import type { TopicPostTag } from './TopicPostCard';
import type { TopicNodeNav } from '@/hook/topicType';
import { useInfiniteRequestTopicTopics, useRequestCreateTopic, useRequestFavoriteTopic, useRequestLikeEntity, useRequestTopicNodeNavs, useRequestUnlikeEntity } from '@/hook/useTopicRequest';


dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

type ForumTopTab = TopicNodeNav & {
  key: string;
  label: string;
  nodeId: number;
};

export const Forum: React.FC = () => {
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
    if (!topTabs.some((tab) => tab.key === activeTab) && topTabs.length > 0) {
      setActiveTab(topTabs[0].key);
    }
  }, [activeTab, topTabs]);

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
    <div className="legacy-forum relative min-h-screen border-x border-white/8 bg-[#090909] dark:border-rdark-border dark:bg-rdark-card">
      <div className="legacy-forum-tabs sticky top-0 z-30 w-full border-b border-white/8 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.05),transparent_44%),linear-gradient(180deg,#0b0b0c_0%,#101114_100%)] backdrop-blur-xl dark:border-rdark-border">
        <div className="legacy-forum-tabs-row mx-auto flex h-[50px]">
          {topTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`legacy-forum-tab relative flex-1 cursor-pointer border-0 bg-transparent py-3.5 text-[16px] tracking-[0.02em] transition-colors ${
                activeTab === tab.key
                  ? 'legacy-forum-tab-on font-extrabold text-[#e6f7ff]'
                  : 'font-semibold text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="!mt-2 legacy-forum-tab-indicator absolute bottom-0 left-1/2 h-[3px] w-[112px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.28)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,0.04),transparent_42%),linear-gradient(180deg,#101114_0%,#0d0d0f_100%)] px-3 py-2.5">
        <ForumCompose
          onPost={handleCreatePost}
          posting={createTopicMutation.isLoading}
        />
      </div>

      <div>
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

        {posts.map((post, i) => (
          <TopicPostCard
            key={post.id}
            post={post}
            index={i}
            onLike={handleLike}
            onUnlike={handleUnlike}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}

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
