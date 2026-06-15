/** 文件说明：房间号/邀请码查到的私人赌局预览弹框。 */
import { Clock3, Lock, Swords, X } from 'lucide-react';
import styles from './index.module.scss';
import { formatCoins, formatTimestampLabel, type DuelItem } from '../battlePlazaDuelModel';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function getStatusBadgeClass(duel: DuelItem) {
  if (duel.rawStatus === 'sealed' || duel.capacityFull) return css('badge', 'badgeSealed');
  if (duel.rawStatus === 'pending' || duel.rawStatus === 'settled' || duel.rawStatus === 'disputed') {
    return css('badge', 'badgePending');
  }
  return css('badge');
}

function getJoinDisabledReason(duel: DuelItem) {
  if (duel.canJoin) return undefined;
  if (duel.banker.isMe) return '你是本局庄家，不能作为挑战者下注。';
  if (duel.rawStatus === 'sealed' || duel.capacityFull) return '本局已满额封盘，暂不可加入。';
  if (duel.rawStatus === 'pending') return '本局已进入待宣判阶段，暂不可加入。';
  if (duel.rawStatus === 'disputed') return '本局争议处理中，暂不可加入。';
  if (duel.rawStatus === 'settled') return '本局已结算，暂不可加入。';
  return '当前阶段不可下注。';
}

export interface BattlePlazaPrivateEntryPreviewModalProps {
  open: boolean;
  loading?: boolean;
  duel?: DuelItem | null;
  onClose: () => void;
  onJoin: () => void;
}

export function BattlePlazaPrivateEntryPreviewModal({
  open,
  loading = false,
  duel,
  onClose,
  onJoin,
}: BattlePlazaPrivateEntryPreviewModalProps) {
  if (!open) return null;

  const remainingCapacity = duel ? Math.max(0, duel.wager - duel.currentPool) : 0;
  const capacityPct = duel && duel.wager > 0 ? Math.min(100, Math.round((duel.currentPool / duel.wager) * 100)) : 0;
  const joinDisabledReason = duel ? getJoinDisabledReason(duel) : undefined;

  return (
    <div className={css('overlay')} onClick={onClose} role="presentation">
      <div
        className={css('modal')}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-entry-preview-title"
      >
        <div className={css('head')}>
          <div className={css('title-block')}>
            <h2 id="private-entry-preview-title" className={css('title')}>
              {loading ? '正在查询赌局…' : duel?.topic ?? '私人赌局'}
            </h2>
            {!loading && duel ? (
              <>
                <p className={css('subtitle')}>确认对战信息后再下注</p>
                <span className={getStatusBadgeClass(duel)}>{duel.statusBadge.label}</span>
              </>
            ) : null}
          </div>
          <button type="button" className={css('close')} aria-label="关闭" onClick={onClose}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {loading ? (
          <div className={css('loading')}>正在加载对战数据…</div>
        ) : duel ? (
          <>
            <div className={css('body')}>
              <div className={css('meta-row')}>
                {duel.roomNumberDisplay ? (
                  <span className={css('meta-pill')}>
                    <Lock size={12} aria-hidden />
                    房间号 <strong>{duel.roomNumberDisplay}</strong>
                  </span>
                ) : null}
                <span className={css('meta-pill')}>
                  <Clock3 size={12} aria-hidden />
                  结算 <strong>{duel.settleText || formatTimestampLabel(duel.settleTime)}</strong>
                </span>
                <span className={css('meta-pill')}>
                  庄家 <strong>{duel.banker.name}</strong>
                </span>
              </div>

              <div className={css('opinion', 'opinionBanker')}>
                <div className={css('opinion-label')}>庄家立场</div>
                <div className={css('opinion-text')}>{duel.banker.stance}</div>
              </div>

              <div className={css('vs')}>— VS —</div>

              <div className={css('opinion', 'opinionChallenger')}>
                <div className={css('opinion-label')}>挑战者立场（加入即站此方）</div>
                <div className={css('opinion-text')}>{duel.challengerSideText}</div>
              </div>

              {duel.showCapacity ? (
                <div className={css('capacity')}>
                  <div className={css('capacity-head')}>
                    <span>挑战者容量</span>
                    <span className={css('capacity-nums')}>
                      {formatCoins(duel.currentPool)} / {formatCoins(duel.wager)}
                    </span>
                  </div>
                  <div className={css('capacity-bar')}>
                    <div className={css('capacity-fill')} style={{ width: `${Math.max(capacityPct, capacityPct > 0 ? 4 : 0)}%` }} />
                  </div>
                  <p className={css('note')}>
                    {duel.capacityFull
                      ? '已满额封盘'
                      : `剩余可挑战 ${formatCoins(remainingCapacity)} 龟币 · 私人局无入场费`}
                  </p>
                </div>
              ) : null}

              {joinDisabledReason ? <p className={css('note')}>{joinDisabledReason}</p> : null}
              {duel.resultText ? <p className={css('note')}>{duel.resultText}</p> : null}
            </div>

            <div className={css('foot')}>
              <button type="button" className={css('btn', 'btnCancel')} onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                className={css('btn', 'btnJoin')}
                disabled={!duel.canJoin}
                onClick={onJoin}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Swords size={16} aria-hidden />
                  下注挑战
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className={css('loading')}>未找到可展示的赌局数据。</div>
        )}
      </div>
    </div>
  );
}
