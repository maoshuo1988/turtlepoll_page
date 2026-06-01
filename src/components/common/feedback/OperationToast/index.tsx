/** 文件说明：全局操作失败 Toast 宿主，仅展示一行失败文案。 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeOperationErrorToast } from '@/utils/operationToast';
import styles from './index.module.scss';

export function OperationToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeOperationErrorToast(setMessage), []);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [message]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.host} aria-live="polite" aria-atomic="true">
      {message ? (
        <div className={`${styles.toast} ${visible ? '' : styles.toastHidden}`} role="status">
          {message}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
