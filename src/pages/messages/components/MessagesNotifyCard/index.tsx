/** 文件说明：消息中心单条通知卡片。 */
import type { MessageNotifyRecord } from '@/hooks/messageNotifyTypes';
import {
  formatMessageRelativeTime,
  resolveMessageBusinessMeta,
  resolveMessageStatusLabel,
} from '../messageNotifyModel';
import { MessageNotifyCategoryIcon } from '../MessageNotifyCategoryIcon';
import styles from './index.module.scss';

interface MessagesNotifyCardProps {
  record: MessageNotifyRecord;
  onClick: (record: MessageNotifyRecord) => void;
}

export function MessagesNotifyCard({ record, onClick }: MessagesNotifyCardProps) {
  const meta = resolveMessageBusinessMeta(record.businessCode);
  const statusLabel = resolveMessageStatusLabel(record);
  const isUnread = record.status === 0;
  const timeLabel = formatMessageRelativeTime(record.createTime);

  return (
    <button type="button" className={styles.card} onClick={() => onClick(record)}>
      <span className={`${styles.iconWrap} ${styles[`iconTone_${meta.tone}`]}`}>
        <MessageNotifyCategoryIcon businessCode={record.businessCode} size={18} />
      </span>

      <span className={styles.main}>
        <span className={styles.topRow}>
          <span className={styles.subject}>{record.subject || '系统通知'}</span>
          {timeLabel ? <span className={styles.time}>{timeLabel}</span> : null}
        </span>
        {record.body ? <span className={styles.body}>{record.body}</span> : null}
        <span className={styles.bottomRow}>
          <span
            className={`${styles.statusTag} ${isUnread ? styles.statusUnread : styles[`statusTone_${meta.tone}`]}`}
          >
            {statusLabel}
          </span>
        </span>
      </span>
    </button>
  );
}
