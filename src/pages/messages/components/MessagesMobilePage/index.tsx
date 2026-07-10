/**
 * 文件说明：移动端「消息」Tab 页（系统通知与互动提醒，不含线报广场）。
 */
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { getAuthToken } from '@/utils/authStorage';
import { useRequestUserMsgRecent } from '@/hooks/useAuthRequests';
import { useHomeLayoutContext } from '@/layouts/context';
import styles from './index.module.scss';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

type RecentMessage = {
  id?: number;
  title?: string;
  content?: string;
  createTime?: number;
  detailUrl?: string;
  from?: {
    nickname?: string;
    username?: string;
  };
};

export function MessagesMobilePage() {
  const { onOpenAuth } = useHomeLayoutContext();
  const isAuthenticated = Boolean(getAuthToken());
  const msgQuery = useRequestUserMsgRecent();
  const messages = Array.isArray((msgQuery.data as { messages?: RecentMessage[] } | undefined)?.messages)
    ? ((msgQuery.data as { messages: RecentMessage[] }).messages)
    : [];

  const renderBody = () => {
    if (!isAuthenticated) {
      return (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>登录后查看消息</p>
          <button type="button" className={styles.emptyAction} onClick={onOpenAuth}>
            去登录
          </button>
        </div>
      );
    }

    if (msgQuery.isLoading) {
      return <div className={styles.emptyCard}>加载消息中...</div>;
    }

    if (msgQuery.isError) {
      return (
        <div className={styles.emptyCard}>
          {msgQuery.error instanceof Error ? msgQuery.error.message : '消息加载失败'}
        </div>
      );
    }

    if (!messages.length) {
      return (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>暂无新消息</p>
          <p className={styles.emptySub}>点赞、评论和系统通知会出现在这里</p>
        </div>
      );
    }

    return (
      <div className={styles.messageList}>
        {messages.map((item) => {
          const sender = item.from?.nickname || item.from?.username || '系统通知';
          const timeLabel = item.createTime ? dayjs(item.createTime).fromNow() : '';
          return (
            <article key={String(item.id)} className={styles.messageCard}>
              <div className={styles.messageHead}>
                <span className={styles.messageSender}>{sender}</span>
                {timeLabel ? <span className={styles.messageTime}>{timeLabel}</span> : null}
              </div>
              {item.title ? <h3 className={styles.messageTitle}>{item.title}</h3> : null}
              {item.content ? <p className={styles.messageContent}>{item.content}</p> : null}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div>
        <h1 className={styles.pageTitle}>消息</h1>
        <p className={styles.pageSub}>互动提醒与系统通知</p>
      </div>
      {renderBody()}
    </div>
  );
}
