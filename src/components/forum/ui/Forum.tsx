import React, { useState } from 'react';
import { ForumCompose } from './ForumCompose';
import { ForumPostCard } from './ForumPost';
import type { ForumPost } from '../../../data/mock_data';

interface ForumProps {
  posts: ForumPost[];
  onNewPost: (content: string, tag: ForumPost['tag'], images: string[]) => void;
  onLikePost: (postId: string) => void;
  onLikeComment: (postId: string, commentId: string) => void;
  onAddComment: (postId: string, content: string) => void;
}

type FeedTab = 'recommend' | 'following';

export const Forum: React.FC<ForumProps> = ({
  posts,
  onNewPost,
  onLikePost,
  onLikeComment,
  onAddComment,
}) => {
  const [activeTab, setActiveTab] = useState<FeedTab>('recommend');

  return (
    <div className="legacy-forum relative min-h-screen border-x border-white/8 bg-[#090909] dark:border-rdark-border dark:bg-rdark-card">
      {/* ── Sticky tab header ── */}
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
      {/* ── Compose area ── */}
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,0.04),transparent_42%),linear-gradient(180deg,#101114_0%,#0d0d0f_100%)] px-3 py-2.5">
        <ForumCompose onPost={onNewPost} />
      </div>

      {/* ── Timeline ── */}
      <div>
        {posts.map((post, i) => (
          <ForumPostCard
            key={post.id}
            post={post}
            index={i}
            onLike={onLikePost}
            onLikeComment={onLikeComment}
            onAddComment={onAddComment}
          />
        ))}

        {/* Load more indicator */}
        <div className="legacy-forum-loadmore py-8 text-center">
          <button className="legacy-forum-loadmore-btn cursor-pointer border-0 bg-transparent text-[14px] font-medium text-zinc-400 transition-colors hover:text-white">
            加载更多
          </button>
        </div>
      </div>
    </div>
  );
};
