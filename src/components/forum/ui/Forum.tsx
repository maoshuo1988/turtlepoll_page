import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { ForumCompose } from './ForumCompose';
import { ForumPostCard } from './ForumPost';
import type { ForumPost } from '../../../data/mock_data';
import type { TopicNodeNav, TopicResponse } from '../../../hook/types';
import {
  useInfiniteRequestTopicTopics,
  useRequestCreateTopic,
  useRequestFavoriteTopic,
  useRequestLikeEntity,
  useRequestTopicNodeNavs,
  useRequestUnlikeEntity,
  useRequestUnfavoriteTopic,
} from '../../../hook/useRequest';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

type FeedTab = 'recommend' | 'following';

const tagFromTopic = (topic: TopicResponse): ForumPost['tag'] => {
  const firstTag = topic.tags?.[0]?.name ?? '';
  if (topic.recommend || /爆料|独家|快讯/.test(firstTag)) return '爆料';
  if (/分析|研判|复盘/.test(firstTag)) return '分析';
  return '讨论';
};

const formatTopicTime = (createTime?: number) => {
  if (!createTime) return '刚刚';
  return dayjs.unix(createTime).fromNow();
};

const toForumPost = (topic: TopicResponse): ForumPost => {
  const nickname = topic.user?.nickname || topic.user?.username || '匿名用户';
  const handleSeed = topic.user?.username || topic.user?.id || nickname;
  const handle = handleSeed.startsWith('@') ? handleSeed : `@${handleSeed}`;
  const avatarText = nickname.slice(0, 1).toUpperCase();
  const summaryContent = [topic.title, topic.summary, topic.content]
    .filter(Boolean)
    .join('\n')
    .trim();

  return {
    id: topic.id,
    author: {
      name: nickname,
      handle,
      avatar: avatarText,
      avatarUrl: topic.user?.avatar || topic.user?.smallAvatar,
      verified: Boolean(topic.recommend),
      title: topic.node?.name,
    },
    tag: tagFromTopic(topic),
    title: topic.title,
    content: summaryContent || '该帖子暂无正文内容',
    images: topic.imageList?.map((item) => item.url || item.preview).filter(Boolean) as string[] | undefined,
    time: formatTopicTime(topic.createTime),
    likes: topic.likeCount ?? 0,
    comments: [],
    commentCount: topic.commentCount ?? 0,
    viewCount: topic.viewCount ?? 0,
    liked: Boolean(topic.liked),
    favorited: Boolean(topic.favorited),
    sticky: Boolean(topic.sticky),
    recommend: Boolean(topic.recommend),
    ipLocation: topic.ipLocation,
  };
};

const getCreateNodeId = (navs: TopicNodeNav[] | undefined, activeNodeId: number) => {
  if (activeNodeId > 0) return activeNodeId;
  const firstCustomNode = navs?.find((node) => node.id > 0);
  return firstCustomNode?.id ?? 1;
};

export const Forum: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('recommend');
  const nodeNavsQuery = useRequestTopicNodeNavs();
  const createTopicMutation = useRequestCreateTopic();
  const favoriteTopicMutation = useRequestFavoriteTopic();
  const unfavoriteTopicMutation = useRequestUnfavoriteTopic();
  const likeEntityMutation = useRequestLikeEntity();
  const unlikeEntityMutation = useRequestUnlikeEntity();

  const nodeNavs = useMemo<TopicNodeNav[]>(
    () => (Array.isArray(nodeNavsQuery.data) ? nodeNavsQuery.data : []),
    [nodeNavsQuery.data],
  );

  const activeNodeId = activeTab === 'recommend' ? -1 : -2;

  useEffect(() => {
    if (nodeNavs.length === 0) return;
    const stillExists = nodeNavs.some((node) => node.id === activeNodeId);
    if (!stillExists) {
      setActiveTab('recommend');
    }
  }, [activeNodeId, nodeNavs]);

  const topicFeedQuery = useInfiniteRequestTopicTopics(activeNodeId);

  const posts = useMemo(
    () => (topicFeedQuery.data?.pages ?? []).flatMap((page) => page.results ?? []).map(toForumPost),
    [topicFeedQuery.data],
  );

  const createNodeId = useMemo(() => getCreateNodeId(nodeNavs, activeNodeId), [activeNodeId, nodeNavs]);

  const handleCreatePost = async (content: string, tag: ForumPost['tag'], images: string[]) => {
    await createTopicMutation.mutateAsync({
      type: 1,
      nodeId: createNodeId,
      title: '',
      content,
      contentType: 'text',
      hideContent: '',
      tags: [tag],
      imageList: images.map((url) => ({ url })),
      vote: null,
      captchaId: '',
      captchaCode: '',
      captchaProtocol: 0,
    });
  };

  const handleToggleFavorite = async (postId: string, nextFavorited: boolean) => {
    if (nextFavorited) {
      await favoriteTopicMutation.mutateAsync(postId);
      return;
    }
    await unfavoriteTopicMutation.mutateAsync(postId);
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
          {(['recommend', 'following'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`legacy-forum-tab relative flex-1 cursor-pointer border-0 bg-transparent py-3.5 text-[16px] tracking-[0.02em] transition-colors ${
                activeTab === tab
                  ? 'legacy-forum-tab-on font-extrabold text-[#e6f7ff]'
                  : 'font-semibold text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'recommend' ? '推荐' : '关注'}
              {activeTab === tab && (
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
          <ForumPostCard
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
