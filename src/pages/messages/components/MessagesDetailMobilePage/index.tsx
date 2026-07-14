/**
 * 文件说明：移动端消息详情页（像素级对齐设计稿，对接 message-notify 详情接口）。
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from '@umijs/renderer-react';
import { ArrowLeft, ClipboardList, Mail, MoreHorizontal } from 'lucide-react';
import { getAuthToken } from '@/utils/authStorage';
import {
  useMutateMessageNotifyRead,
  useRequestMessageNotifyDetail,
} from '@/hooks/useMessageNotifyRequests';
import { useHomeLayoutContext } from '@/layouts/context';
import {
  formatMessageDetailTime,
  resolveMessageBusinessMeta,
  resolveMessageDetailFields,
  resolveMessageDetailStatusBadge,
  resolveMessagePrimaryAction,
  resolveMessageSceneTitle,
  resolveMessageTimeline,
} from '../messageNotifyModel';
import { MessageNotifyCategoryIcon } from '../MessageNotifyCategoryIcon';
import { MessageDetailTimelineIcon } from '../MessageDetailTimelineIcon';
import styles from './index.module.scss';

export function MessagesDetailMobilePage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { onOpenAuth } = useHomeLayoutContext();
  const isAuthenticated = Boolean(getAuthToken());
  const messageId = Number(params.id);
  const validId = Number.isFinite(messageId) && messageId > 0 ? messageId : undefined;

  const detailQuery = useRequestMessageNotifyDetail(validId);
  const readMutation = useMutateMessageNotifyRead();
  const markedRef = useRef<number | null>(null);

  const record = detailQuery.data;

  useEffect(() => {
    if (!isAuthenticated || !record || record.status !== 0) return;
    if (markedRef.current === record.id) return;
    markedRef.current = record.id;
    void readMutation.mutateAsync(record.id).catch(() => {
      markedRef.current = null;
    });
  }, [isAuthenticated, readMutation, record]);

  const meta = useMemo(
    () => resolveMessageBusinessMeta(record?.businessCode),
    [record?.businessCode],
  );
  const sceneTitle = useMemo(
    () => (record ? resolveMessageSceneTitle(record) : ''),
    [record],
  );
  const timeLabel = useMemo(
    () => formatMessageDetailTime(record?.createTime),
    [record?.createTime],
  );
  const statusBadge = useMemo(
    () => (record ? resolveMessageDetailStatusBadge(record) : ''),
    [record],
  );
  const detailFields = useMemo(
    () => (record ? resolveMessageDetailFields(record) : []),
    [record],
  );
  const timeline = useMemo(
    () => (record ? resolveMessageTimeline(record) : []),
    [record],
  );
  const primaryAction = useMemo(
    () => (record ? resolveMessagePrimaryAction(record) : { label: '返回消息中心', path: null }),
    [record],
  );

  const handleBack = useCallback(() => {
    navigate('/messages');
  }, [navigate]);

  const handlePrimary = useCallback(() => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    if (!primaryAction.path) {
      navigate('/messages');
      return;
    }
    if (/^https?:\/\//i.test(primaryAction.path)) {
      window.location.href = primaryAction.path;
      return;
    }
    navigate(primaryAction.path);
  }, [isAuthenticated, navigate, onOpenAuth, primaryAction.path]);

  if (!isAuthenticated) {
    return (
      <div className={styles.root}>
        <header className={styles.pageHead}>
          <button type="button" className={styles.headBtn} onClick={handleBack} aria-label="返回">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1 className={styles.pageTitle}>消息详情</h1>
          <span className={styles.headBtnPlaceholder} />
        </header>
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>登录后查看消息详情</p>
          <button type="button" className={styles.emptyAction} onClick={onOpenAuth}>
            去登录
          </button>
        </div>
      </div>
    );
  }

  if (!validId) {
    return (
      <div className={styles.root}>
        <header className={styles.pageHead}>
          <button type="button" className={styles.headBtn} onClick={handleBack} aria-label="返回">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1 className={styles.pageTitle}>消息详情</h1>
          <span className={styles.headBtnPlaceholder} />
        </header>
        <div className={styles.emptyCard}>无效的消息链接</div>
      </div>
    );
  }

  if (detailQuery.isLoading && !record) {
    return (
      <div className={styles.root}>
        <header className={styles.pageHead}>
          <button type="button" className={styles.headBtn} onClick={handleBack} aria-label="返回">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1 className={styles.pageTitle}>消息详情</h1>
          <span className={styles.headBtnPlaceholder} />
        </header>
        <div className={styles.emptyCard}>加载消息详情中...</div>
      </div>
    );
  }

  if (detailQuery.isError || !record) {
    return (
      <div className={styles.root}>
        <header className={styles.pageHead}>
          <button type="button" className={styles.headBtn} onClick={handleBack} aria-label="返回">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1 className={styles.pageTitle}>消息详情</h1>
          <span className={styles.headBtnPlaceholder} />
        </header>
        <div className={styles.emptyCard}>
          {detailQuery.error instanceof Error ? detailQuery.error.message : '消息不存在或无权查看'}
          <button type="button" className={styles.emptyAction} onClick={handleBack}>
            返回消息中心
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.pageHead}>
        <button type="button" className={styles.headBtn} onClick={handleBack} aria-label="返回">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <h1 className={styles.pageTitle}>消息详情</h1>
        <button type="button" className={styles.headBtn} aria-label="更多" disabled>
          <MoreHorizontal size={18} strokeWidth={2.2} />
        </button>
      </header>

      <section className={styles.mainCard}>
        <div className={styles.mainHead}>
          <span className={`${styles.bizIcon} ${styles[`bizTone_${meta.tone}`]}`}>
            <MessageNotifyCategoryIcon businessCode={record.businessCode} size={18} />
          </span>
          <div className={styles.bizMeta}>
            <p className={styles.bizTitle}>{sceneTitle}</p>
            {timeLabel ? <p className={styles.bizTime}>{timeLabel}</p> : null}
          </div>
          <span className={styles.statusBadge}>{statusBadge}</span>
        </div>

        <h2 className={styles.subject}>{record.subject || '系统通知'}</h2>
        {record.body ? <p className={styles.body}>{record.body}</p> : null}

        {detailFields.length ? (
          <dl className={styles.fieldList}>
            {detailFields.map((field) => (
              <div key={`${field.label}-${field.value}`} className={styles.fieldRow}>
                <dt>{field.label}</dt>
                <dd className={field.mono ? styles.fieldMono : undefined}>{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {timeline.length ? (
        <section className={styles.timelineCard}>
          <h3 className={styles.sectionTitle}>处理记录</h3>
          <ol className={styles.timelineList}>
            {timeline.map((item, index) => (
              <li key={item.id} className={styles.timelineItem}>
                <span className={styles.timelineRail} aria-hidden>
                  <span className={`${styles.timelineDot} ${styles[`timelineTone_${item.tone}`]}`}>
                    <MessageDetailTimelineIcon icon={item.icon} size={13} />
                  </span>
                  {index < timeline.length - 1 ? <span className={styles.timelineLine} /> : null}
                </span>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineLabel}>{item.label}</p>
                  <p className={styles.timelineTime}>{item.timeLabel}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className={styles.actionDock}>
        {primaryAction.path ? (
          <button type="button" className={styles.primaryBtn} onClick={handlePrimary}>
            <ClipboardList size={16} strokeWidth={2.4} aria-hidden />
            <span>{primaryAction.label}</span>
          </button>
        ) : null}
        <button type="button" className={styles.secondaryBtn} onClick={handleBack}>
          <Mail size={16} strokeWidth={2.4} aria-hidden />
          <span>返回消息中心</span>
        </button>
      </div>
    </div>
  );
}
