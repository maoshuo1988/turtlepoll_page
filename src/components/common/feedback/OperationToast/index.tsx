/** 文件说明：全局顶部操作 Toast 宿主。 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  subscribeOperationToast,
  type OperationToastPayload,
  type OperationToastTone,
} from '@/utils/operationToast';
import styles from './index.module.scss';

function getToastToneClass(tone: OperationToastTone) {
  if (tone === 'success') return styles.toastSuccess;
  if (tone === 'info') return styles.toastInfo;
  return styles.toastError;
}

export function OperationToastHost() {
  const [toast, setToast] = useState<OperationToastPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeOperationToast(setToast), []);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [toast]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.host} aria-live="polite" aria-atomic="true">
      {toast ? (
        <div
          className={`${styles.toast} ${getToastToneClass(toast.tone)} ${visible ? '' : styles.toastHidden}`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
