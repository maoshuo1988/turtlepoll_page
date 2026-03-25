import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  MessageSquarePlus,
  Plus,
  Settings2,
} from 'lucide-react';
import type { TopicResponse } from '@/hook/topicType';
import { useInfiniteRequestTopicUserTopics } from '@/hook/useTopicRequest';
import {
  type MockForumEntry,
  type ForumComment,
  type PetInfo,
  type PetSkin,
} from '../../../data/mock_data';
import { ProfilePetRail } from './ProfilePetRail';

type ProfileTab = 'overview' | 'posts' | 'comments' | 'saved' | 'history' | 'hidden' | 'upvoted' | 'downvoted';
type FeedSort = 'new' | 'hot';

interface ProfilePageProps {
  userId: number | string ;
  userName: string;
  userHandle: string;
  avatar: string;
  posts: MockForumEntry[];
  pet: PetInfo;
  skins: PetSkin[];
  balance: number;
  onBack: () => void;
  onOpenForum: () => void;
}

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: '概述' },
  { key: 'posts', label: '帖子' },
  { key: 'comments', label: '评论' },
  { key: 'saved', label: '已保存' },
  { key: 'history', label: '历史记录' },
  { key: 'hidden', label: '已隐藏' },
  { key: 'upvoted', label: '已点赞' },
  { key: 'downvoted', label: '已点踩' },
];

const cardClass =
  'rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#111315_0%,#0b0c0e_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.28)]';

const emptyArt = (
  <div className="relative h-[116px] w-[116px]">
    <div className="absolute inset-x-[18px] bottom-[10px] h-[58px] rounded-[32px] bg-[radial-gradient(circle_at_50%_16%,#ffffff_0%,#f3f7fb_36%,#dce5ec_72%,#d0d6df_100%)] shadow-[0_10px_24px_rgba(255,255,255,0.07)]" />
    <div className="absolute left-[7px] top-[28px] h-[34px] w-[34px] rounded-full bg-[radial-gradient(circle_at_40%_30%,#f7fbff_0%,#dbe7ef_78%,#c7d1db_100%)]" />
    <div className="absolute right-[7px] top-[28px] h-[34px] w-[34px] rounded-full bg-[radial-gradient(circle_at_40%_30%,#f7fbff_0%,#dbe7ef_78%,#c7d1db_100%)]" />
    <div className="absolute left-[30px] top-[50px] h-[21px] w-[21px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffb25b_0%,#ff5c1c_44%,#ff3a00_100%)] shadow-[0_0_16px_rgba(255,92,28,0.55)]" />
    <div className="absolute right-[30px] top-[50px] h-[21px] w-[21px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffb25b_0%,#ff5c1c_44%,#ff3a00_100%)] shadow-[0_0_16px_rgba(255,92,28,0.55)]" />
    <div className="absolute left-[37px] top-[57px] h-[7px] w-[7px] rounded-full bg-white/75" />
    <div className="absolute right-[37px] top-[57px] h-[7px] w-[7px] rounded-full bg-white/75" />
    <div className="absolute left-[59px] top-[14px] h-[26px] w-[8px] rounded-full bg-[#3b2e35]" />
    <div className="absolute left-[59px] top-[10px] h-[24px] w-[24px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#eef5fa_38%,#d4e1ea_100%)] shadow-[0_4px_12px_rgba(255,255,255,0.12)]" />
  </div>
);

const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex min-h-[420px] flex-col items-center justify-center !px-6 !py-10 text-center">
    {emptyArt}
    <h3 className="!mt-7 text-[24px] font-black tracking-[-0.02em] text-white">{title}</h3>
    {description && <p className="!mt-3 max-w-[560px] text-[14px] leading-7 text-[#7e8790]">{description}</p>}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="!mt-5 rounded-full bg-[#115bdb] !px-5 !py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1d67e5]"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const ProfileTabButton: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-full !px-4 !py-2.5 text-[14px] font-bold transition-all ${
      active ? 'bg-[#3a4348] text-white' : 'text-[#d8dde2] hover:bg-white/6'
    }`}
  >
    {label}
  </button>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userId,
  userName,
  userHandle,
  avatar,
  posts,
  pet,
  skins,
  balance,
  onBack,
  onOpenForum,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [sort, setSort] = useState<FeedSort>('new');
  console.log("userId ----- ",userId)
  const userPostsQuery = useInfiniteRequestTopicUserTopics({ userId: userId, cursor: 0 });

  const userPosts = useMemo(
    () => posts.filter((post) => post.author.name === '你' || post.author.handle === '@me_fox'),
    [posts],
  );

  const profileTopics = useMemo<TopicResponse[]>(
    () => (userPostsQuery.data?.pages ?? []).flatMap((page) => page.results ?? []),
    [userPostsQuery.data],
  );

  const userComments = useMemo(
    () =>
      posts.flatMap((post) =>
        post.comments
          .filter((comment: ForumComment) => comment.author.name === '你' || comment.author.handle === '@me_fox')
          .map((comment: ForumComment) => ({ ...comment, postTitle: post.content })),
      ),
    [posts],
  );

  const overviewStats = useMemo(
    () => [
      { label: '帖子', value: userPosts.length },
      { label: '评论', value: userComments.length },
      { label: '获赞', value: userPosts.reduce((sum, post) => sum + post.likes, 0) + userComments.reduce((sum, comment) => sum + comment.likes, 0) },
    ],
    [userComments, userPosts],
  );

  const renderOverview = () => (
    <>
      <div className="rounded-[18px] bg-black/70 !px-4 !py-4 text-white">
        <button className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#cad2d9]" />
            <span className="text-[15px] font-semibold">显示所有内容</span>
          </div>
          <ChevronRight size={18} className="text-[#cad2d9]" />
        </button>
      </div>

      <div className="!mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onOpenForum}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 !px-4 !py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/6"
        >
          <Plus size={18} />
          创建帖子
        </button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#cad2d9] transition-colors hover:bg-white/6">
          <Settings2 size={18} />
        </button>
      </div>

      <div className="!mt-8 grid gap-3 sm:grid-cols-3">
        {overviewStats.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-white/8 bg-white/[0.03] !px-4 !py-4">
            <div className="text-[13px] text-[#7e8790]">{item.label}</div>
            <div className="!mt-2 text-[28px] font-black text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {userPosts.length === 0 ? (
        <div className="!mt-4 border-t border-white/10">
          <EmptyState
            title="你还没有任何帖子"
            description="在社区中发帖后，帖子将显示在此处。如果你想隐藏帖子，请更新设置。"
            actionLabel="更新设置"
            onAction={onOpenForum}
          />
        </div>
      ) : (
        <div className="!mt-6 grid gap-4">
          {userPosts.slice(0, 3).map((post) => (
            <article key={post.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] !p-5">
              <div className="flex items-center gap-2 text-[12px] text-[#7e8790]">
                <span className="rounded-full bg-white/8 !px-2 !py-1 text-[11px] text-white/80">{post.tag}</span>
                <span>{post.time}</span>
              </div>
              <p className="!mt-3 line-clamp-3 text-[15px] leading-7 text-[#d9dee3]">{post.content}</p>
              {post.images?.[0] && (
                <div className="!mt-4 flex items-center gap-2 text-[12px] text-[#7e8790]">
                  <ImageIcon size={14} />
                  <span>{post.images.length} 张配图</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );

  const renderPosts = () => (
    <>
      <div className="rounded-[18px] bg-black/70 !px-4 !py-4 text-white">
        <button className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#cad2d9]" />
            <span className="text-[15px] font-semibold">显示所有帖子</span>
          </div>
          <ChevronRight size={18} className="text-[#cad2d9]" />
        </button>
      </div>

      <div className="!mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onOpenForum}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 !px-4 !py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/6"
        >
          <Plus size={18} />
          创建帖子
        </button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#cad2d9] transition-colors hover:bg-white/6">
          <Settings2 size={18} />
        </button>
      </div>

      {userPostsQuery.isLoading && profileTopics.length === 0 ? (
        <div className="!mt-6 rounded-[20px] border border-white/8 bg-white/[0.03] !p-6 text-[14px] text-[#8fa0b2]">
          正在加载帖子...
        </div>
      ) : userPostsQuery.isError && profileTopics.length === 0 ? (
        <div className="!mt-6 rounded-[20px] border border-rose-400/20 bg-rose-500/8 !p-6 text-[14px] text-rose-200">
          {userPostsQuery.error instanceof Error ? userPostsQuery.error.message : '帖子加载失败'}
        </div>
      ) : profileTopics.length === 0 ? (
        <div className="!mt-4 border-t border-white/10">
          <EmptyState
            title="你还没有任何帖子"
            description="在社区中发帖后，帖子将显示在此处。如果你想隐藏帖子，请更新设置。"
            actionLabel="更新设置"
            onAction={onOpenForum}
          />
        </div>
      ) : (
        <div className="!mt-6 grid gap-4">
          {profileTopics.map((post) => (
            <article key={post.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] !p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[12px] text-[#7e8790]">
                  {post.node?.name && (
                    <span className="rounded-full bg-white/8 !px-2 !py-1 text-[11px] text-white/80">{post.node.name}</span>
                  )}
                  <span>{post.createTime ? new Date(post.createTime).toLocaleString() : '刚刚'}</span>
                </div>
                <span className="text-[12px] text-[#7e8790]">{post.commentCount ?? 0} 条评论</span>
              </div>
              {post.title && <div className="!mt-3 text-[16px] font-semibold text-white">{post.title}</div>}
              <p className="!mt-3 text-[15px] leading-7 text-[#d9dee3]">{post.summary || post.content || '暂无正文内容'}</p>
              {post.imageList && post.imageList.length > 0 && (
                <div className="!mt-4 flex items-center gap-2 text-[12px] text-[#7e8790]">
                  <ImageIcon size={14} />
                  <span>{post.imageList.length} 张配图</span>
                </div>
              )}
            </article>
          ))}

          {userPostsQuery.hasNextPage && (
            <button
              type="button"
              onClick={() => userPostsQuery.fetchNextPage()}
              disabled={userPostsQuery.isFetchingNextPage}
              className="rounded-full border border-white/10 bg-white/[0.04] !px-4 !py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {userPostsQuery.isFetchingNextPage ? '加载中...' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </>
  );

  const renderComments = () => (
    <>
      <div className="rounded-[18px] bg-black/70 !px-4 !py-4 text-white">
        <button className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#cad2d9]" />
            <span className="text-[15px] font-semibold">显示所有评论</span>
          </div>
          <ChevronRight size={18} className="text-[#cad2d9]" />
        </button>
      </div>

      <div className="!mt-4 flex items-center gap-2 text-[13px] text-[#8e98a0]">
        <button
          onClick={() => setSort('new')}
          className={`rounded-full !px-3 !py-1.5 transition-colors ${sort === 'new' ? 'bg-white/8 text-white' : 'hover:bg-white/6'}`}
        >
          新
        </button>
        <button
          onClick={() => setSort('hot')}
          className={`rounded-full !px-3 !py-1.5 transition-colors ${sort === 'hot' ? 'bg-white/8 text-white' : 'hover:bg-white/6'}`}
        >
          热
        </button>
      </div>

      {userComments.length === 0 ? (
        <div className="!mt-4 border-t border-white/10">
          <EmptyState
            title="你还没有任何评论"
            description="在社区中发表评论后，评论将显示在此处。如果你想隐藏评论，请更新设置。"
            actionLabel="更新设置"
            onAction={onOpenForum}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {(sort === 'hot'
            ? [...userComments].sort((a, b) => b.likes - a.likes)
            : userComments
          ).map((comment) => (
            <article key={comment.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] !p-5">
              <div className="text-[12px] text-[#7e8790]">{comment.time}</div>
              <p className="!mt-3 text-[15px] leading-7 text-[#d9dee3]">{comment.content}</p>
              <p className="!mt-3 line-clamp-2 text-[13px] leading-6 text-[#7e8790]">原帖：{comment.postTitle}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );

  const renderStaticEmpty = (
    title: string,
    description: string,
  ) => (
    <div className="border-t border-white/10">
      <EmptyState title={title} description={description} />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'posts':
        return renderPosts();
      case 'comments':
        return renderComments();
      case 'saved':
        return renderStaticEmpty('你似乎尚未保存任何内容', '保存后的帖子、评论或收藏内容会出现在这里。');
      case 'history':
        return renderStaticEmpty('你似乎尚未访问任何帖子', '最近访问过的内容会被记录在这里，方便你快速找回。');
      case 'hidden':
        return renderStaticEmpty('你还没有隐藏任何内容', '被你隐藏的帖子和评论，之后会统一展示在这里。');
      case 'upvoted':
        return renderStaticEmpty('你还没有点赞任何内容', '你点过赞的帖子和评论，之后会出现在这里。');
      case 'downvoted':
        return renderStaticEmpty('你还没有点踩任何内容', '你点踩过的帖子和评论，之后会出现在这里。');
      default:
        return null;
    }
  };

  return (
    <section className={`flex h-[calc(100vh-88px)] w-full flex-col overflow-hidden ${cardClass} !px-5 !py-5 text-white !md:px-8 !md:py-7`}>
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="!mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-[#b8c0c7] transition-colors hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="relative shrink-0">
            <div className="grid h-18 w-18 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#1c1d22] to-[#0f1013] text-xl font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
              {avatar}
            </div>
            <div className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-4 border-[#101214] bg-[#252a2f] text-[#dde4ea]">
              <ImageIcon size={14} />
            </div>
          </div>

          <div className="min-w-0 !pt-1">
            <h1 className="truncate text-[28px] font-black tracking-[-0.03em] text-[#d5dee5]">{userName}</h1>
            <div className="!mt-1 text-[14px] font-semibold text-[#8a949d]">{userHandle}</div>
          </div>
        </div>
      </div>

      <div className="!mt-8 flex flex-wrap gap-2">
        {PROFILE_TABS.map((tab) => (
          <ProfileTabButton
            key={tab.key}
            active={activeTab === tab.key}
            label={tab.label}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      <div className="!mt-8 flex min-h-0 flex-1 flex-col border-t border-white/10 !pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 min-h-0 overflow-y-auto !pr-1">{renderContent()}</div>
        <aside className="!mt-8 min-h-0 overflow-y-auto !lg:mt-0 !lg:px-4 !lg:py-4">
          <div>
            <ProfilePetRail pet={pet} skins={skins} balance={balance} />
          </div>
        </aside>
      </div>

      <div className="!mt-10 flex justify-center md:hidden">
        <button
          onClick={onOpenForum}
          className="inline-flex items-center gap-2 rounded-full bg-white/6 !px-5 !py-3 text-[14px] font-semibold text-white"
        >
          <MessageSquarePlus size={18} />
          去社区发帖
        </button>
      </div>
    </section>
  );
};
