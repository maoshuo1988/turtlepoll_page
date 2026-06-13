/** 文件说明：私人赌局邀请码生成结果弹框。 */
import { useEffect, useState } from 'react';
import { ClipboardCopy, Hourglass, Ticket, X } from 'lucide-react';
import styles from './index.module.scss';

const INVITE_VALID_SECONDS = 48 * 3600;

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function formatInviteCodeDisplay(code: string) {
  return code
    .replace(/\s/g, '')
    .toUpperCase()
    .split('')
    .join(' ');
}

function formatCountdownHms(deadline: number, now: number) {
  const diff = Math.max(0, deadline - now);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface BattlePlazaInviteCodeModalProps {
  open: boolean;
  inviteCode: string;
  roomNumberDisplay: string;
  expireAt?: number;
  onClose: () => void;
  onCopy?: () => void;
}

export function BattlePlazaInviteCodeModal({
  open,
  inviteCode,
  roomNumberDisplay,
  expireAt,
  onClose,
  onCopy,
}: BattlePlazaInviteCodeModalProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const resolvedExpireAt = expireAt ?? now + INVITE_VALID_SECONDS;

  useEffect(() => {
    if (!open) return undefined;
    setNow(Math.floor(Date.now() / 1000));
    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, expireAt]);

  if (!open) return null;

  const countdown = formatCountdownHms(resolvedExpireAt, now);

  const handleCopy = () => {
    const normalized = inviteCode.replace(/\s/g, '').toUpperCase();
    void navigator.clipboard?.writeText(normalized).then(
      () => onCopy?.(),
      () => undefined,
    );
  };

  return (
    <div className={css('overlay')} onClick={onClose} role="presentation">
      <div
        className={css('modal')}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-code-modal-title"
      >
        <div className={css('head')}>
          <div className={css('title-block')}>
            <div className={css('title-row')} id="invite-code-modal-title">
              <Ticket size={20} className={css('title-ico')} aria-hidden />
              <span>邀请码已生成</span>
            </div>
            <p className={css('subtitle')}>把邀请码发给好友，48 小时内有效</p>
          </div>
          <button type="button" className={css('close')} aria-label="关闭" onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className={css('body')}>
          <div className={css('code-box')}>
            <span className={css('code-label')}>邀请码</span>
            <div className={css('code-value')}>{formatInviteCodeDisplay(inviteCode)}</div>
          </div>

          <div className={css('info-box')}>
            <div className={css('info-row')}>
              <span className={css('info-left')}>
                <Hourglass size={14} className={css('info-left-ico')} aria-hidden />
                剩余有效时间
              </span>
              <span className={css('info-countdown')}>{countdown}</span>
            </div>
            <div className={css('info-row')}>
              <span className={css('info-left')}>所属房间号</span>
              <span className={css('info-room')}>{roomNumberDisplay}</span>
            </div>
          </div>

          <button type="button" className={css('copy-btn')} onClick={handleCopy}>
            <ClipboardCopy size={16} aria-hidden />
            复制邀请码
          </button>

          <p className={css('foot-note')}>
            邀请码失效后房主可重新生成；房间号长期有效，与赌局绑定。
          </p>
        </div>
      </div>
    </div>
  );
}
