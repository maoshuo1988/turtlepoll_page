/**
 * 文件说明：Profile Page，个人主页页面组件。
 */
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  LogIn,
  MessageSquarePlus,
  Moon,
  Plus,
  Settings2,
  Sun,
} from 'lucide-react';
import type { TopicResponse } from '@/hooks/topicTypes';
import type { OwnedPetItem } from '@/hooks/petTypes';
import { useInfiniteRequestTopicUserTopics } from '@/hooks/useTopicRequests';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import {
  type MockForumEntry,
  type ForumComment,
  type PetInfo,
  type PetSkin,
} from '@/data/mockData';
import { ProfilePetArchive } from './ProfilePetArchive';

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
  darkMode: boolean;
  onBack: () => void;
  onOpenForum: () => void;
  onOpenAuth: () => void;
  onToggleTheme: () => void;
  ownedPets?: OwnedPetItem[];
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
  <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-8 text-center md:min-h-[420px] md:!px-6 md:!py-10">
    {emptyArt}
    <h3 className="mt-6 text-[22px] font-black tracking-[-0.02em] text-white md:!mt-7 md:text-[24px]">{title}</h3>
    {description && <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#7e8790] md:text-[14px] md:leading-7">{description}</p>}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-5 rounded-full bg-[#115bdb] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1d67e5]"
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
    className={`shrink-0 rounded-full !px-4 !py-2.5 text-[14px] font-bold transition-all ${
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
  darkMode,
  onBack,
  onOpenForum,
  onOpenAuth,
  onToggleTheme,
  ownedPets,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [sort, setSort] = useState<FeedSort>('new');
  const userPostsQuery = useInfiniteRequestTopicUserTopics({ userId: userId, cursor: 0 });
  const isAuthenticated = Boolean(getAuthToken());
  const storedUser = getStoredUserInfo();

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
  const equippedSkin = useMemo(
    () => skins.find((skin) => skin.equipped) ?? skins.find((skin) => skin.owned) ?? null,
    [skins],
  );

  const renderOverview = () => (
    <>
      <div className="rounded-[20px] bg-black/70 px-4 py-4 text-white">
        <button className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#cad2d9]" />
            <span className="text-[15px] font-semibold">显示所有内容</span>
          </div>
          <ChevronRight size={18} className="text-[#cad2d9]" />
        </button>
      </div>

      <div className="mt-4 hidden flex-wrap items-center gap-3 xl:flex">
        <button
          onClick={onOpenForum}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/6"
        >
          <Plus size={18} />
          创建帖子
        </button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#cad2d9] transition-colors hover:bg-white/6">
          <Settings2 size={18} />
        </button>
      </div>

      <div className="mt-6 hidden gap-3 sm:grid-cols-3 md:grid">
        {overviewStats.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="text-[13px] text-[#7e8790]">{item.label}</div>
            <div className="mt-2 text-[28px] font-black text-white">{item.value}</div>
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
        <div className="mt-5 grid gap-3 md:mt-6 md:gap-4">
          {userPosts.slice(0, 3).map((post) => (
            <article key={post.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 md:p-5">
              <div className="flex items-center gap-2 text-[12px] text-[#7e8790]">
                <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] text-white/80">{post.tag}</span>
                <span>{post.time}</span>
              </div>
              <p className="mt-3 line-clamp-3 text-[14px] leading-6 text-[#d9dee3] md:text-[15px] md:leading-7">{post.content}</p>
              {post.images?.[0] && (
                <div className="mt-4 flex items-center gap-2 text-[12px] text-[#7e8790]">
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
      <div className="rounded-[20px] bg-black/70 px-4 py-4 text-white">
        <button className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#cad2d9]" />
            <span className="text-[15px] font-semibold">显示所有帖子</span>
          </div>
          <ChevronRight size={18} className="text-[#cad2d9]" />
        </button>
      </div>

      <div className="mt-4 hidden flex-wrap items-center gap-3 xl:flex">
        <button
          onClick={onOpenForum}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/6"
        >
          <Plus size={18} />
          创建帖子
        </button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#cad2d9] transition-colors hover:bg-white/6">
          <Settings2 size={18} />
        </button>
      </div>

      {userPostsQuery.isLoading && profileTopics.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] p-5 text-[14px] text-[#8fa0b2] md:mt-6 md:p-6">
          正在加载帖子...
        </div>
      ) : userPostsQuery.isError && profileTopics.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-rose-400/20 bg-rose-500/8 p-5 text-[14px] text-rose-200 md:mt-6 md:p-6">
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
        <div className="mt-5 grid gap-3 md:mt-6 md:gap-4">
          {profileTopics.map((post) => (
            <article key={post.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[12px] text-[#7e8790]">
                  {post.node?.name && (
                    <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] text-white/80">{post.node.name}</span>
                  )}
                  <span>{post.createTime ? new Date(post.createTime).toLocaleString() : '刚刚'}</span>
                </div>
                <span className="text-[12px] text-[#7e8790]">{post.commentCount ?? 0} 条评论</span>
              </div>
              {post.title && <div className="mt-3 text-[15px] font-semibold text-white md:text-[16px]">{post.title}</div>}
              <p className="mt-3 text-[14px] leading-6 text-[#d9dee3] md:text-[15px] md:leading-7">{post.summary || post.content || '暂无正文内容'}</p>
              {post.imageList && post.imageList.length > 0 && (
                <div className="mt-4 flex items-center gap-2 text-[12px] text-[#7e8790]">
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
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="rounded-[20px] bg-black/70 px-4 py-4 text-white">
        <button className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#cad2d9]" />
            <span className="text-[15px] font-semibold">显示所有评论</span>
          </div>
          <ChevronRight size={18} className="text-[#cad2d9]" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] text-[#8e98a0]">
        <button
          onClick={() => setSort('new')}
          className={`rounded-full px-3 py-1.5 transition-colors ${sort === 'new' ? 'bg-white/8 text-white' : 'hover:bg-white/6'}`}
        >
          新
        </button>
        <button
          onClick={() => setSort('hot')}
          className={`rounded-full px-3 py-1.5 transition-colors ${sort === 'hot' ? 'bg-white/8 text-white' : 'hover:bg-white/6'}`}
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
        <div className="mt-5 grid gap-3 md:mt-6 md:gap-4">
          {(sort === 'hot'
            ? [...userComments].sort((a, b) => b.likes - a.likes)
            : userComments
          ).map((comment) => (
            <article key={comment.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 md:p-5">
              <div className="text-[12px] text-[#7e8790]">{comment.time}</div>
              <p className="mt-3 text-[14px] leading-6 text-[#d9dee3] md:text-[15px] md:leading-7">{comment.content}</p>
              <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#7e8790]">原帖：{comment.postTitle}</p>
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
    <section className={`w-full min-w-0 overflow-x-hidden text-white ${cardClass}`}>
      <div className="xl:hidden min-w-0 overflow-x-hidden px-4 py-4">
        <div className="min-w-0 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={onBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-[#b8c0c7]"
            >
              <ArrowLeft size={18} />
            </button>
            <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-[#b8c0c7]">
              <Settings2 size={18} />
            </button>
          </div>

          <div className="mt-4 flex min-w-0 items-start gap-3">
            <div className="relative shrink-0">
              <div className="grid h-[72px] w-[72px] place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#1c1d22] to-[#0f1013] text-[26px] font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
                {avatar}
              </div>
              <div className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-4 border-[#101214] bg-[#252a2f] text-[#dde4ea]">
                <ImageIcon size={14} />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h1 className="truncate text-[24px] font-black tracking-[-0.03em] text-[#d5dee5]">{userName}</h1>
              <div className="mt-1 text-[13px] font-semibold text-[#8a949d]">{userHandle}</div>
              <div className="mt-2 text-[12px] leading-5 text-[#8a949d]">
                在社区里记录观点、评论和宠物日常。
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {overviewStats.map((item) => (
              <div key={item.label} className="rounded-[18px] bg-black/25 px-2 py-2.5 text-center">
                <div className="text-[10px] text-[#7e8790]">{item.label}</div>
                <div className="mt-1 text-[16px] font-black text-white">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button
              onClick={onOpenForum}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f3f4f6] px-4 text-[14px] font-bold text-[#111315]"
            >
              <MessageSquarePlus size={18} />
              发微博式帖子
            </button>
            <div className="inline-flex h-11 max-w-[42vw] min-w-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[12px] font-bold text-[#d5dee5]">
              <span className="truncate">
              {equippedSkin ? `${equippedSkin.avatar} ${equippedSkin.name}` : '未装备皮肤'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 min-w-0 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-white">{pet.name}</div>
              <div className="mt-1 text-[12px] text-[#8a949d]">{pet.status}</div>
            </div>
            <div className="rounded-full bg-emerald-400/12 px-3 py-1 text-[11px] font-bold text-emerald-300">
              Lv.{pet.level}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-black/25 px-3 py-3">
              <div className="text-[11px] text-[#7e8790]">体力</div>
              <div className="mt-2 text-[18px] font-black text-white">{pet.stamina}/{pet.maxStamina}</div>
            </div>
            <div className="rounded-[18px] bg-black/25 px-3 py-3">
              <div className="text-[11px] text-[#7e8790]">龟币</div>
              <div className="mt-2 text-[18px] font-black text-white">{balance.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 min-w-0 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-bold text-white">设置与入口</div>
              <div className="mt-1 text-[12px] text-[#8a949d]">顶部右侧功能已移到这里</div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold text-[#c6cfd6]">
              我的
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-[#15161a] text-white">
                  {storedUser?.avatar?.length ? (
                    <img src={storedUser.avatar} alt={storedUser.avatar} className="h-full w-full object-cover" />
                  ) : isAuthenticated ? (
                    <span className="text-[14px] font-black">
                      {storedUser?.nickname ? storedUser.nickname.slice(0, 1).toUpperCase() : 'G'}
                    </span>
                  ) : (
                    <LogIn size={16} className="text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {isAuthenticated ? '账号与登录' : '点击登录'}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-[#8a949d]">
                    {isAuthenticated ? (storedUser?.nickname || '已登录账号') : '原来右上角入口已移到这里'}
                  </div>
                </div>
              </div>
              <ChevronRight size={17} className="shrink-0 text-[#8a949d]" />
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#15161a] text-zinc-200">
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white">亮暗模式</div>
                  <div className="mt-1 text-[11px] text-[#8a949d]">
                    当前为{darkMode ? '深色模式' : '浅色模式'}
                  </div>
                </div>
              </div>
              <div className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                切换
              </div>
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15">
          <div className="flex min-w-max gap-2 pb-1">
            {PROFILE_TABS.map((tab) => (
              <ProfileTabButton
                key={tab.key}
                active={activeTab === tab.key}
                label={tab.label}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 min-w-0 border-t border-white/10 pt-4">
          {renderContent()}
        </div>
      </div>

      <div className="hidden xl:flex xl:min-h-[calc(100vh-140px)] xl:w-full xl:flex-col xl:overflow-hidden xl:px-8 xl:py-7">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-[#b8c0c7] transition-colors hover:bg-white/8 hover:text-white"
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

            <div className="min-w-0 pt-1">
              <h1 className="truncate text-[28px] font-black tracking-[-0.03em] text-[#d5dee5]">{userName}</h1>
              <div className="mt-1 text-[14px] font-semibold text-[#8a949d]">{userHandle}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {PROFILE_TABS.map((tab) => (
            <ProfileTabButton
              key={tab.key}
              active={activeTab === tab.key}
              label={tab.label}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>

        <div className="mt-8 flex min-h-0 flex-1 flex-col border-t border-white/10 pt-8 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
          <div className="min-w-0 min-h-0 overflow-y-auto pr-1">{renderContent()}</div>
          <aside className="mt-8 min-h-0 overflow-y-auto xl:mt-0 xl:px-4 xl:py-4">
            <div>
              <ProfilePetArchive pet={pet} ownedPets={ownedPets} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
