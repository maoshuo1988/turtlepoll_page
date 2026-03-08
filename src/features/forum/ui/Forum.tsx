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
    <div className="legacy-forum relative min-h-screen border-x border-slate-200 bg-slate-50 dark:border-rdark-border dark:bg-rdark-card">
      {/* ── Sticky tab header ── */}
      <div className="legacy-forum-tabs sticky top-0 z-30 w-full border-b border-cyan-500/20 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.18),transparent_46%),linear-gradient(180deg,#071329_0%,#091a34_100%)] backdrop-blur-xl dark:border-rdark-border">
        <div className="legacy-forum-tabs-row mx-auto flex ">
          {(['recommend', 'following'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`legacy-forum-tab relative flex-1 cursor-pointer border-0 bg-transparent py-3.5 text-[24px] tracking-[0.02em] transition-colors ${
                activeTab === tab
                  ? 'legacy-forum-tab-on font-extrabold text-[#e6f7ff]'
                  : 'font-semibold text-[#9bb4d6] hover:text-[#c7ddf5]'
              }`}
            >
              {tab === 'recommend' ? '推荐' : '关注'}
              {activeTab === tab && (
                <div className="legacy-forum-tab-indicator absolute bottom-0 left-1/2 h-[3px] w-[112px] -translate-x-1/2 rounded-full bg-[#2ce8d4] shadow-[0_0_12px_rgba(44,232,212,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>
      {/* ── Compose area ── */}
      <div className="border-b border-cyan-500/20 bg-[radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.15),transparent_44%),linear-gradient(180deg,#091a34_0%,#0a1b36_100%)] px-3 py-2.5">
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
          <button className="legacy-forum-loadmore-btn text-[14px] text-blue-500 hover:text-blue-600 font-medium cursor-pointer border-0 bg-transparent transition-colors">
            加载更多
          </button>
        </div>
      </div>
    </div>
  );
};
