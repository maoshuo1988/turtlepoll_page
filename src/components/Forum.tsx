import React, { useState } from 'react';
import { ForumCompose } from './ForumCompose';
import { ForumPostCard } from './ForumPost';
import type { ForumPost } from '../data/mock_data';

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
    <div className="legacy-forum bg-white dark:bg-rdark-card border-x border-slate-100 dark:border-rdark-border min-h-screen">
      {/* ── Sticky tab header ── */}
      <div className="legacy-forum-tabs sticky top-[57px] z-10 bg-white/80 dark:bg-rdark-card/80 backdrop-blur-md border-b border-slate-100 dark:border-rdark-border">
        <div className="legacy-forum-tabs-row flex">
          {(['recommend', 'following'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`legacy-forum-tab flex-1 py-4 text-[15px] cursor-pointer border-0 bg-transparent transition-colors relative hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                activeTab === tab
                  ? 'legacy-forum-tab-on font-extrabold text-slate-900 dark:text-rdark-text'
                  : 'font-medium text-slate-500 dark:text-rdark-text2'
              }`}
            >
              {tab === 'recommend' ? '推荐' : '关注'}
              {activeTab === tab && (
                <div className="legacy-forum-tab-indicator absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Compose area ── */}
      <div className="border-b border-slate-100 dark:border-rdark-border">
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
