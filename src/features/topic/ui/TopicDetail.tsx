import React from 'react';
import { ArrowLeft, Flame, MessageSquare } from 'lucide-react';
import { HeroPrediction } from '../../predictions/ui/HeroPrediction';
import { ForumPostCard } from '../../forum/ui/ForumPost';
import type { HotTopic, NewsItem, ForumPost } from '../../../data/mock_data';

const card =
  '!p-4 rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

function fmtHeat(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

interface TopicDetailProps {
  topic: HotTopic | null;
  relatedNews: NewsItem | null;
  relatedPosts: ForumPost[];
  onBack: () => void;
  onBet: (newsId: string, option: 'A' | 'B', odds: number) => void;
  onEnterBattle: (newsId: string) => void;
  onLikePost: (postId: string) => void;
  onLikeComment: (postId: string, commentId: string) => void;
  onAddComment: (postId: string, content: string) => void;
}

export const TopicDetail: React.FC<TopicDetailProps> = ({
  topic,
  relatedNews,
  relatedPosts,
  onBack,
  onBet,
  onEnterBattle,
  onLikePost,
  onLikeComment,
  onAddComment,
}) => {
  const isAllMode = !topic;

  return (
    <div className="legacy-topic-page space-y-5">
      {/* ━━━ Header bar ━━━ */}
      <div className={`${card} px-5 py-3.5 flex items-center justify-between`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-rdark-text2 hover:text-slate-700 dark:hover:text-rdark-text transition"
        >
          <ArrowLeft size={18} /> 返回
        </button>
        <h2 className="text-base font-bold text-slate-800 dark:text-rdark-text">
          {isAllMode ? '全部热点' : `#${topic.title}`}
        </h2>
        {topic ? (
          <span className="flex items-center gap-1 text-sm text-orange-500 font-semibold">
            <Flame size={14} /> {fmtHeat(topic.heat)}
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-rdark-text2">全部内容</span>
        )}
      </div>

      {/* ━━━ Related prediction event (hero card) ━━━ */}
      {relatedNews && (
        <HeroPrediction
          news={relatedNews}
          onBet={onBet}
          onEnterBattle={onEnterBattle}
        />
      )}

      {/* ━━━ Related forum posts ━━━ */}
      <div className={`${card} overflow-hidden`}>
        <div className="!py-3.5 border-b border-slate-100 dark:border-rdark-border flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-rdark-text">
            {isAllMode ? '全部讨论' : '相关讨论'}
          </span>
          <span className="text-xs text-slate-400 dark:text-rdark-text2">
            ({relatedPosts.length}条)
          </span>
        </div>

        {relatedPosts.length > 0 ? (
          <div>
            {relatedPosts.map((post, i) => (
              <ForumPostCard
                key={post.id}
                post={post}
                index={i}
                onLike={onLikePost}
                onLikeComment={onLikeComment}
                onAddComment={onAddComment}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 !py-12 text-center text-sm text-slate-400 dark:text-rdark-text2">
            暂无相关讨论，快来发第一条帖子吧!
          </div>
        )}
      </div>
    </div>
  );
};
