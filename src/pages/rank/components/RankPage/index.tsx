/**
 * 文件说明：Rank Page，排行榜页面组件。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Crosshair,
  Search,
} from 'lucide-react';
import type { CoinLeaderboardItem, CoinLeaderboardResult } from '@/hooks/coinTypes';
import { EmptyDataPage, LoginRequiredPage } from '@/components/common/state/PageState';
import { createUserAvatarUrl } from '@/utils/userAvatar';
import styles from './index.module.scss';

const PAGE_SIZE = 10;

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function CoinAmount({ value, iconSize = 14 }: { value: number; iconSize?: number }) {
  return (
    <span className={css('metric-coin')}>
      <Coins size={iconSize} className="shrink-0 text-emerald-400 dark:text-emerald-500" />
      <span>{value.toLocaleString()}</span>
    </span>
  );
}

function RankAvatar({ userId, nickname, size = 40 }: { userId: string; nickname: string; size?: number }) {
  const avatarUrl = createUserAvatarUrl(userId, size);
  const sizeClass = size <= 36 ? 'h-9 w-9' : 'h-10 w-10';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className={`${sizeClass} shrink-0 rounded-[10px] border border-white/10 object-cover`}
      />
    );
  }

  return (
    <div className={`grid ${sizeClass} shrink-0 place-items-center rounded-[10px] border border-white/10 bg-white/8 text-[13px] font-bold text-slate-200`}>
      {nickname.trim().slice(0, 1).toUpperCase() || '?'}
    </div>
  );
}

function formatWinRate(value: number) {
  if (!Number.isFinite(value)) return '0.0%';
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

function formatUserHandle(user: Pick<CoinLeaderboardItem, 'userId' | 'id'>) {
  if (user.userId > 0) return `@user${user.userId}`;
  const seed = user.id.trim();
  return seed ? `@${seed}` : '@user';
}

function isSameUser(currentUserId?: string | number, item?: Pick<CoinLeaderboardItem, 'id' | 'userId'>) {
  if (currentUserId === undefined || currentUserId === null || !item) return false;
  const left = String(currentUserId).trim();
  if (!left) return false;
  return left === item.id || left === String(item.userId);
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];

  if (currentPage > 3) {
    items.push('ellipsis');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (currentPage < totalPages - 2) {
    items.push('ellipsis');
  }

  if (totalPages > 1) {
    items.push(totalPages);
  }

  return items;
}

interface RankTableRowProps {
  user: CoinLeaderboardItem;
  isMe?: boolean;
}

function RankTableRow({ user, isMe = false }: RankTableRowProps) {
  return (
    <div
      data-rank-me={isMe ? 'true' : undefined}
      className={css('table-row', isMe && 'table-row-me')}
    >
      <div className={css('rank-cell')}>{user.rank}</div>
      <div className={css('user-cell')}>
        <RankAvatar userId={user.id} nickname={user.nickname} />
        <div className={css('user-meta')}>
          <div className={css('user-name')}>{user.nickname}</div>
          <div className={css('user-handle')}>{formatUserHandle(user)}</div>
        </div>
      </div>
      <div className={css('metric-cell')}>
        {isMe ? <span className={css('me-badge')}>我</span> : null}
        <div className={css('metric-value', isMe && 'metric-value-accent')}>{formatWinRate(user.winRate)}</div>
        <div className={css('metric-label')}>胜率</div>
      </div>
      <div className={css('metric-cell')}>
        <div className={css('metric-value')}>{user.predictionCount.toLocaleString()}</div>
        <div className={css('metric-label')}>已预测</div>
      </div>
      <div className={css('metric-cell')}>
        <div className={css('metric-value')}>
          <CoinAmount value={user.balance} iconSize={15} />
        </div>
        <div className={css('metric-label')}>龟币</div>
      </div>
    </div>
  );
}

interface RankMobileRowProps {
  user: CoinLeaderboardItem;
  isMe?: boolean;
}

function RankMobileRow({ user, isMe = false }: RankMobileRowProps) {
  return (
    <article data-rank-me={isMe ? 'true' : undefined} className={css('mobile-row', isMe && 'mobile-row-me')}>
      <div className={css('mobile-top')}>
        <div className={css('rank-cell')}>{user.rank}</div>
        <RankAvatar userId={user.id} nickname={user.nickname} />
        <div className={css('user-meta')}>
          <div className={css('user-name')}>
            {user.nickname}
            {isMe ? <span className="ml-1.5 inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-300">我</span> : null}
          </div>
          <div className={css('user-handle')}>{formatUserHandle(user)}</div>
        </div>
      </div>
      <div className={css('mobile-metrics')}>
        <div className={css('mobile-metric')}>
          <div className={css('metric-value', isMe && 'metric-value-accent')}>{formatWinRate(user.winRate)}</div>
          <div className={css('metric-label')}>胜率</div>
        </div>
        <div className={css('mobile-metric')}>
          <div className={css('metric-value')}>{user.predictionCount.toLocaleString()}</div>
          <div className={css('metric-label')}>已预测</div>
        </div>
        <div className={css('mobile-metric')}>
          <div className={css('metric-value')}>
            <CoinAmount value={user.balance} iconSize={14} />
          </div>
          <div className={css('metric-label')}>龟币</div>
        </div>
      </div>
    </article>
  );
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
  currentUserName = '我',
  onOpenAuth,
  onRetry,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [locatedToMyRank, setLocatedToMyRank] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const filteredList = useMemo(() => {
    const source = data?.items ?? [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return source;
    return source.filter((user) => {
      const nickname = user.nickname.toLowerCase();
      const handle = formatUserHandle(user).toLowerCase();
      return nickname.includes(keyword) || handle.includes(keyword);
    });
  }, [data?.items, search]);

  const totalCount = data?.total && data.total > 0 ? data.total : filteredList.length;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredList.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredList.length);
  const pageItems = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const myRank = data?.myRank ?? null;
  const myBalance = data?.myBalance ?? 0;

  const scrollToMyRow = useCallback(() => {
    window.setTimeout(() => {
      const container = listScrollRef.current;
      const target = container?.querySelector('[data-rank-me="true"]');
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop =
        targetRect.top -
        containerRect.top +
        container.scrollTop -
        container.clientHeight / 2 +
        targetRect.height / 2;

      container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    }, 80);
  }, []);

  const jumpToMyRank = useCallback(() => {
    if (!myRank) return;

    const index = filteredList.findIndex(
      (user) => isSameUser(currentUserId, user) || user.rank === myRank,
    );

    if (index < 0) {
      setLocatedToMyRank(false);
      return;
    }

    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    setPage(targetPage);
    setLocatedToMyRank(true);
    scrollToMyRow();
  }, [currentUserId, filteredList, myRank, scrollToMyRow]);

  useEffect(() => {
    setPage(1);
    setLocatedToMyRank(false);
  }, [search]);

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (isLoginRequired) {
    return (
      <div className={css('state-card')}>
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
      <div className={css('state-card')}>
        <div className="grid min-h-[320px] place-items-center px-6 py-16 text-sm text-zinc-500 md:min-h-[420px]">
          排行榜加载中...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={css('state-card')}>
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

  const paginationItems = getPaginationItems(safePage, totalPages);
  const footNote =
    filteredList.length === 0
      ? `共 ${totalCount.toLocaleString()} 名`
      : `显示 ${pageStart}-${pageEnd}，共 ${totalCount.toLocaleString()} 名${locatedToMyRank ? ' · 已定位到我的排名' : ''}`;

  return (
    <section className={css('page')}>
      <div className={css('page-header')}>
        <h1 className={css('title')}>排行榜</h1>

        <div className={css('search-wrap')}>
          <Search size={16} className={css('search-icon')} aria-hidden />
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索用户名..."
            className={css('search-input')}
            aria-label="搜索用户名"
          />
          <span className={css('search-kbd')} aria-hidden>
            ⌘ K
          </span>
        </div>
      </div>

      <div className={css('page-body')}>
        <div className={css('table-card')}>
          {filteredList.length === 0 ? (
            <EmptyDataPage
              title={search.trim() ? '没有匹配的用户' : '暂无排行榜数据'}
              description={search.trim() ? '换个关键词试试。' : '榜单数据同步后会展示在这里。'}
              className="min-h-[260px]"
            />
          ) : (
            <>
              <div className={`${css('table-head')} max-sm:hidden`}>
                <span className={css('table-head-cell')}>#</span>
                <span className={css('table-head-cell')}>用户</span>
                <span className={css('table-head-cell', 'table-head-metric')}>胜率</span>
                <span className={css('table-head-cell', 'table-head-metric')}>已预测</span>
                <span className={css('table-head-cell', 'table-head-metric')}>龟币</span>
              </div>

              <div ref={listScrollRef} className={css('list-scroll')}>
                <div className={`${css('table-body')} max-sm:hidden`}>
                  {pageItems.map((user) => {
                    const isMe = isSameUser(currentUserId, user);
                    return (
                      <RankTableRow
                        key={`${user.rank}-${user.userId}`}
                        user={user}
                        isMe={isMe}
                      />
                    );
                  })}
                </div>

                <div className={`${css('mobile-list')} hidden max-sm:grid`}>
                  {pageItems.map((user) => {
                    const isMe = isSameUser(currentUserId, user);
                    return (
                      <RankMobileRow
                        key={`${user.rank}-${user.userId}-mobile`}
                        user={user}
                        isMe={isMe}
                      />
                    );
                  })}
                </div>
              </div>

              <div className={css('table-foot')}>
                <p className={css('foot-note')}>{footNote}</p>
                <div className={css('pagination')}>
                  <button
                    type="button"
                    className={css('page-btn')}
                    disabled={safePage <= 1}
                    onClick={() => {
                      setLocatedToMyRank(false);
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    aria-label="上一页"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {paginationItems.map((item, index) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className={css('page-ellipsis')}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={css('page-btn', item === safePage && 'page-btn-active')}
                        onClick={() => {
                          setLocatedToMyRank(false);
                          setPage(item);
                        }}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className={css('page-btn')}
                    disabled={safePage >= totalPages}
                    onClick={() => {
                      setLocatedToMyRank(false);
                      setPage((current) => Math.min(totalPages, current + 1));
                    }}
                    aria-label="下一页"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {myRank ? (
          <div className={css('my-rank-bar')}>
            <div className={css('my-rank-left')}>
              {currentUserId ? (
                <RankAvatar userId={String(currentUserId)} nickname={currentUserName} size={36} />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-[10px] border border-white/10 bg-white/8" />
              )}
              <div className={css('my-rank-meta')}>
                <div className={css('my-rank-top')}>
                  <span className={css('my-rank-label')}>我的排名</span>
                  <span className={css('my-rank-value')}>#{myRank}</span>
                </div>
                <div className={css('my-rank-sub')}>
                  {currentUserName} / {totalCount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className={css('my-rank-balance')}>
              <CoinAmount value={myBalance} iconSize={15} />
            </div>
            <button type="button" className={css('jump-btn')} onClick={jumpToMyRank}>
              <Crosshair size={14} />
              跳转到我的排名
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};
