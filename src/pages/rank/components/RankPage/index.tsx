/**
 * 文件说明：Rank Page，排行榜页面组件。
 */
import React from 'react';
import { Coins, Flame } from 'lucide-react';
import type { CoinLeaderboardItem, CoinLeaderboardResult } from '@/hooks/coinTypes';
import { EmptyDataPage, LoginRequiredPage } from '@/components/common/state/PageState';
import { createUserAvatarUrl } from '@/utils/userAvatar';
import styles from './index.module.scss';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

const medalColor: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-amber-700 dark:text-amber-500',
};

function CoinAmount({ value, iconSize = 14 }: { value: number; iconSize?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Coins size={iconSize} className="shrink-0 text-emerald-400 dark:text-emerald-500" />
      <span>{value.toLocaleString()}</span>
    </span>
  );
}

function RankAvatar({ userId, nickname }: { userId: string; nickname: string }) {
  const avatarUrl = createUserAvatarUrl(userId, 32);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover md:h-10 md:w-10"
      />
    );
  }

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-[13px] font-bold text-slate-200 md:h-10 md:w-10">
      {nickname.trim().slice(0, 1).toUpperCase() || '?'}
    </div>
  );
}

function formatWinRate(value: number) {
  if (!Number.isFinite(value)) return '0%';
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

interface RankRowProps {
  user: CoinLeaderboardItem;
  isMe?: boolean;
  variant: 'desktop' | 'mobile';
}

function RankRow({ user, isMe = false, variant }: RankRowProps) {
  const streak = user.currentWinStreak > 0 ? user.currentWinStreak : undefined;

  if (variant === 'mobile') {
    return (
      <article
        className={css(`page-card p-4 ${isMe ? 'border-emerald-400/30 bg-emerald-500/10' : ''}`)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 text-center text-[18px] font-black ${medalColor[user.rank] ?? 'text-slate-500 dark:text-rdark-text2'}`}>
            #{user.rank}
          </div>
          <RankAvatar userId={user.id} nickname={user.nickname} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-slate-800 dark:text-rdark-text">{user.nickname}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-rdark-text2">胜率 {formatWinRate(user.winRate)}</div>
          </div>
          <div className="text-right text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400">
            <CoinAmount value={user.balance} />
          </div>
        </div>
        {streak ? (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[12px] font-bold text-orange-400">
            <Flame size={12} /> {streak} 连胜
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 dark:border-rdark-border/70 ${
        isMe ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''
      }`}
    >
      <div className={`w-8 text-center text-[16px] font-black ${medalColor[user.rank] ?? 'text-slate-500 dark:text-rdark-text2'}`}>
        #{user.rank}
      </div>
      <RankAvatar userId={user.id} nickname={user.nickname} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-slate-800 dark:text-rdark-text">{user.nickname}</div>
        <div className="text-xs text-slate-500 dark:text-rdark-text2">胜率 {formatWinRate(user.winRate)}</div>
      </div>
      {streak ? (
        <div className="hidden sm:flex items-center gap-1 text-[12px] font-bold text-orange-500">
          <Flame size={12} /> {streak} 连胜
        </div>
      ) : (
        <div className="hidden sm:block w-[72px]" />
      )}
      <div className="text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400">
        <CoinAmount value={user.balance} />
      </div>
    </div>
  );
}

function isSameUser(currentUserId?: string | number, item?: Pick<CoinLeaderboardItem, 'id' | 'userId'>) {
  if (currentUserId === undefined || currentUserId === null || !item) return false;
  const left = String(currentUserId).trim();
  if (!left) return false;
  return left === item.id || left === String(item.userId);
}

interface RankPageProps {
  isLoginRequired: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  data: CoinLeaderboardResult | null;
  currentUserId?: string | number;
  currentUserName?: string;
  onOpenAuth: () => void;
  onRetry: () => void;
}

export const RankPage: React.FC<RankPageProps> = ({
  isLoginRequired,
  isLoading,
  isError,
  errorMessage,
  data,
  currentUserId,
  onOpenAuth,
  onRetry,
}) => {
  if (isLoginRequired) {
    return (
      <div className={css('page-card')}>
        <LoginRequiredPage
          title="登录后查看排行榜"
          description="账户余额排行榜需要登录后才能查看。"
          actionLabel="去登录"
          onAction={onOpenAuth}
          className="min-h-[320px] md:min-h-[420px]"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={css('page-card')}>
        <div className="grid min-h-[320px] place-items-center px-6 py-16 text-sm text-slate-500 dark:text-rdark-text2 md:min-h-[420px]">
          排行榜加载中...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={css('page-card')}>
        <EmptyDataPage
          title="排行榜加载失败"
          description={errorMessage || '请稍后重试。'}
          actionLabel="重新加载"
          onAction={onRetry}
          className="min-h-[320px] md:min-h-[420px]"
        />
      </div>
    );
  }

  const rankList = data?.items ?? [];
  return (
    <section className="grid gap-4">
      <div className={css('page-card hidden overflow-hidden md:block')}>
        {rankList.length === 0 ? (
          <EmptyDataPage title="暂无排行榜数据" description="榜单数据同步后会展示在这里。" />
        ) : (
          rankList.map((user) => (
            <RankRow
              key={`${user.rank}-${user.userId}`}
              user={user}
              isMe={isSameUser(currentUserId, user)}
              variant="desktop"
            />
          ))
        )}
      </div>

      <div className="grid gap-3 md:hidden">
        {rankList.length === 0 ? (
          <div className={css('page-card')}>
            <EmptyDataPage title="暂无排行榜数据" description="榜单数据同步后会展示在这里。" className="min-h-[260px] md:min-h-[320px]" />
          </div>
        ) : (
          rankList.map((user) => (
            <RankRow
              key={`${user.rank}-${user.userId}-mobile`}
              user={user}
              isMe={isSameUser(currentUserId, user)}
              variant="mobile"
            />
          ))
        )}
      </div>

      {data ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/60 dark:bg-emerald-900/10">
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {data?.myRank
              ? `我的排名：第 ${data.myRank} 名`
              : '我的排名：暂未上榜'}
            {' · '}
            <CoinAmount value={data?.myBalance ?? 0} />
          </div>
        </div>
      ) : null}
    </section>
  );
};
