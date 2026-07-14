/**
 * 文件说明：移动端「消息」Tab 页（主站消息中心，对接 message-notify 接口）。
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { SlidersHorizontal } from 'lucide-react';
import { getAuthToken } from '@/utils/authStorage';
import type { MessageNotifyRecord } from '@/hooks/messageNotifyTypes';
import {
  useInfiniteRequestMessageNotifyList,
  useMutateMessageNotifyRead,
  useRequestMessageNotifyUnreadCount,
} from '@/hooks/useMessageNotifyRequests';
import { useHomeLayoutContext } from '@/layouts/context';
import { IconFont } from '@/components/common/iconfont/IconFont';
import {
  MESSAGE_BUSINESS_META,
  MESSAGE_FILTER_TABS,
  resolveMessageFilterBusinessCode,
  type MessageFilterKey,
} from '../messageNotifyModel';
import { MessageNotifyCategoryIcon } from '../MessageNotifyCategoryIcon';
import { MessagesNotifyCard } from '../MessagesNotifyCard';
import styles from './index.module.scss';

export function MessagesMobilePage() {
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const isAuthenticated = Boolean(getAuthToken());
  const [activeFilter, setActiveFilter] = useState<MessageFilterKey>('all');
  const businessCode = resolveMessageFilterBusinessCode(activeFilter);

  const unreadQuery = useRequestMessageNotifyUnreadCount(isAuthenticated);
  const listQuery = useInfiniteRequestMessageNotifyList({ businessCode, limit: 20 }, isAuthenticated);
  const readMutation = useMutateMessageNotifyRead();

  const messages = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [listQuery.data?.pages],
  );

  const totalUnread = unreadQuery.data?.totalUnread ?? 0;
  const businessUnread = unreadQuery.data?.businessUnread ?? {};

  const summaryItems = useMemo(
    () =>
      MESSAGE_BUSINESS_META.map((meta) => ({
        ...meta,
        count: businessUnread[meta.code] ?? 0,
      })),
    [businessUnread],
  );

  const handleOpenMessage = useCallback(
    async (record: MessageNotifyRecord) => {
      if (!isAuthenticated) {
        onOpenAuth();
        return;
      }
      try {
        if (record.status === 0) {
          await readMutation.mutateAsync(record.id);
        }
      } catch {
        // 已读失败不阻断跳转
      }
      navigate(`/messages/${record.id}`);
    },
    [isAuthenticated, navigate, onOpenAuth, readMutation],
  );

  const renderListBody = () => {
    if (!isAuthenticated) {
      return (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>登录后查看消息</p>
          <p className={styles.emptySub}>暗盘、开撕台、线报、系统和奖励通知都会出现在这里</p>
          <button type="button" className={styles.emptyAction} onClick={onOpenAuth}>
            去登录
          </button>
        </div>
      );
    }

    if (listQuery.isLoading && !messages.length) {
      return <div className={styles.emptyCard}>加载消息中...</div>;
    }

    if (listQuery.isError && !messages.length) {
      return (
        <div className={styles.emptyCard}>
          {listQuery.error instanceof Error ? listQuery.error.message : '消息加载失败'}
        </div>
      );
    }

    if (!messages.length) {
      return (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>暂无消息</p>
          <p className={styles.emptySub}>当前分类下还没有新的通知</p>
        </div>
      );
    }

    return (
      <>
        <div className={styles.messageList}>
          {messages.map((item) => (
            <MessagesNotifyCard key={item.id} record={item} onClick={handleOpenMessage} />
          ))}
        </div>
        {listQuery.hasNextPage ? (
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={listQuery.isFetchingNextPage}
            onClick={() => listQuery.fetchNextPage()}
          >
            {listQuery.isFetchingNextPage ? '加载中…' : '加载更多'}
          </button>
        ) : null}
      </>
    );
  };

  return (
    <div className={styles.root}>
      <header className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <h1 className={styles.pageTitle}>消息</h1>
          <p className={styles.pageSub}>暗盘、开撕台、线报、系统和奖励都在这里</p>
        </div>
        {/* <button
          type="button"
          className={styles.markAllBtn}
          aria-label="全部标记已读"
          disabled={!isAuthenticated || !totalUnread || readAllMutation.isLoading}
          onClick={() => void handleMarkAllRead()}
        >
          <Check size={18} strokeWidth={2.4} />
        </button> */}
      </header>

      {isAuthenticated ? (
        <section className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <span className={styles.summaryIconWrap}>
              <IconFont name="tongzhi" style={{ fontSize: 18 }} />
            </span>
            <span className={styles.summaryLabel}>今日未读</span>
            <span className={styles.summaryCount}>
              {totalUnread}
              <span className={styles.summaryCountUnit}>条</span>
            </span>
          </div>
          <div className={styles.summaryGrid}>
            {summaryItems.map((item) => (
              <div key={item.code} className={`${styles.summaryItem} ${styles[`summaryTone_${item.tone}`]}`}>
                <span className={styles.summaryItemCount}>{item.count}</span>
                <span className={styles.summaryItemLabel}>{item.shortLabel}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isAuthenticated ? (
        <div className={styles.filterRow}>
          {MESSAGE_FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={active ? styles.filterActive : styles.filterIdle}
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.key === 'all' ? (
                  <SlidersHorizontal size={14} strokeWidth={2.2} aria-hidden />
                ) : (
                  <MessageNotifyCategoryIcon businessCode={tab.key} size={14} />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {renderListBody()}
    </div>
  );
}
