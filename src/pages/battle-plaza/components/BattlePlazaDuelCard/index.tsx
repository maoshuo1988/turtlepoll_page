/** 文件说明：地下钱庄赌局列表卡片，按 Tab 与赌局状态展示不同视觉。 */
import { useEffect, useState } from 'react';
import styles from './index.module.scss';
import {
  Check,
  Coins,
  Copy,
  FileText,
  Flag,
  Heart,
  Hourglass,
  Info,
  Lock,
  Megaphone,
  MessageCircle,
  Plus,
  RefreshCw,
  Swords,
  Ticket,
  Trophy,
  Wallet,
} from 'lucide-react';
import { formatCoins, formatCountdownHms, formatTimestampLabel, type DuelItem, type PlazaTab } from '../battlePlazaDuelModel';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function TurtleCoinIcon({ size = 14, className, tone = 'emerald' }: { size?: number; className?: string; tone?: 'emerald' | 'gold' }) {
  return (
    <Coins
      size={size}
      aria-hidden
      className={`inline-block shrink-0 ${tone === 'gold' ? 'text-amber-400' : 'text-emerald-400'} ${className ?? ''}`.trim()}
    />
  );
}

function CoinAmount({
  amount,
  iconSize = 14,
  className,
  highlight,
  fullHighlight,
  coinTone = 'emerald',
}: {
  amount: number;
  iconSize?: number;
  className?: string;
  highlight?: boolean;
  fullHighlight?: boolean;
  coinTone?: 'emerald' | 'gold';
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className ?? ''}`.trim()}>
      <span className={fullHighlight ? css('cap-nums-full') : highlight ? css('cap-nums-current') : undefined}>
        {formatCoins(amount)}
      </span>
      <TurtleCoinIcon size={iconSize} tone={coinTone} />
    </span>
  );
}

function BankerStanceIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3.5 w-3.5 shrink-0">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5.5h6M5 8h6M5 10.5h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

function useLiveCountdownHms(deadline?: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!deadline) return undefined;
    setNow(Math.floor(Date.now() / 1000));
    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return formatCountdownHms(deadline, now);
}

function ChallengerStanceIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3.5 w-3.5 shrink-0">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M2.8 8h10.4M8 2.8a8.5 8.5 0 0 1 0 10.4M8 2.8a8.5 8.5 0 0 0 0 10.4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface BattlePlazaDuelCardProps {
  duel: DuelItem;
  viewContext: PlazaTab;
  commentsOpen: boolean;
  liked: boolean;
  onToggleComments: () => void;
  onToggleLike: () => void;
  onJoin: () => void;
  onCopyInvite: (code: string) => void;
  onGenerateInvite: () => void;
  onAddStake: () => void;
  onViewDetail: () => void;
  onDeclare: (result: 'banker_wins' | 'banker_loses') => void;
  onConfirm: () => void;
  onDispute: () => void;
  onWithdraw: () => void;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  commentSubmitting: boolean;
}

export function BattlePlazaDuelCard({
  duel,
  commentsOpen,
  liked,
  onToggleComments,
  onToggleLike,
  onJoin,
  onCopyInvite,
  onGenerateInvite,
  onAddStake,
  onViewDetail,
  onDeclare,
  onConfirm,
  onDispute,
  onWithdraw,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  commentSubmitting,
}: BattlePlazaDuelCardProps) {
  const liveCountdown = useLiveCountdownHms(duel.countdownDeadline);
  const showDeclareCountdownBox =
    Boolean(duel.countdownLabel) &&
    Boolean(duel.countdownDeadline) &&
    (duel.displayPhase === 'pending-await-declare' || duel.displayPhase === 'sealed-await-declare');
  const footerCountdownText =
    duel.footerCountdownPrefix && duel.countdownDeadline
      ? `${duel.footerCountdownPrefix} ${liveCountdown}`
      : duel.footerCountdownPrefix && !duel.countdownDeadline
        ? duel.displayPhase === 'pending-await-declare' || duel.displayPhase === 'sealed-await-declare'
          ? `宣布截止 ${formatTimestampLabel(duel.pendingDeadline)}`
          : undefined
        : undefined;
  const capacityPct = duel.wager > 0 ? Math.min(100, Math.round((duel.currentPool / duel.wager) * 100)) : 0;
  const isPrivate = duel.visibility === 'private';
  const isPrivateOwnerOpen = duel.displayPhase === 'open-private-owner';
  const isPrivateGuestOpen = duel.displayPhase === 'open-private-guest';
  const isPrivateOpen = isPrivateOwnerOpen || isPrivateGuestOpen;
  const isMyBanker = duel.banker.isMe === true;
  const isWaitingChallenger =
    duel.currentPool <= 0 &&
    (duel.displayPhase === 'open-active' || isPrivateOpen);
  const remainingCapacity = Math.max(0, duel.wager - duel.currentPool);
  const bankerDisplayName = isMyBanker ? `${duel.banker.name}（庄家）` : duel.banker.name;

  let bankerTagLabel = '庄家';
  let bankerTagClass = css('banker-tag', 'banker-tag-public');
  if (isMyBanker) {
    bankerTagLabel = '我做庄';
    bankerTagClass = css('banker-tag', 'banker-tag-me');
  } else if (isPrivate) {
    bankerTagLabel = '私人庄';
    bankerTagClass = css('banker-tag', 'banker-tag-private');
  }

  const avatarClass = isMyBanker
    ? css('banker-ava', 'banker-ava-me')
    : isPrivate
      ? css('banker-ava', 'banker-ava-private')
      : css('banker-ava');

  const bankerWins = duel.winningSide === 'banker';
  const challengerWins = duel.winningSide === 'challenger';

  return (
    <article
      className={css(
        'card',
        isPrivateOpen && 'card-private-open',
        duel.displayPhase.startsWith('settled-') && duel.displayPhase !== 'settled-void' && 'card-settled',
      )}
    >
      <header className={css('head')}>
        <h3 className={css('title')}>{duel.topic}</h3>
        <div className={css('head-badges')}>
          <span className={css('badge', duel.statusBadge.className)}>
            {isPrivateOwnerOpen ? (
              <span className={css('badge-ico')} aria-hidden>
                🦊
              </span>
            ) : null}
            {isPrivateGuestOpen ? <Lock size={11} aria-hidden className={css('badge-lock-ico')} /> : null}
            {duel.statusBadge.label}
          </span>
        </div>
      </header>

      <div className={css('body')}>
        <div className={css('banker-row')}>
          <div className={avatarClass}>
            {duel.banker.avatarUrl ? (
              <img src={duel.banker.avatarUrl} alt="" className={css('banker-ava-img')} />
            ) : (
              duel.banker.avatar
            )}
          </div>
          <div className={css('banker-info')}>
            <div className={css('banker-name')}>
              {bankerDisplayName}
              <span className={bankerTagClass}>{bankerTagLabel}</span>
            </div>
          </div>
          <div className={css('banker-stake')}>
            <div className={css('banker-stake-amount')}>
              <CoinAmount amount={duel.wager} iconSize={15} coinTone="gold" />
            </div>
            <span className={css('banker-stake-label')}>/ 庄家押注</span>
          </div>
        </div>

        <div className={css('opinion-box', 'opinion-banker', bankerWins && 'opinion-winner')}>
          <div className={css('opinion-label-row')}>
            <div className={css('opinion-label', 'opinion-label-banker')}>
              <BankerStanceIcon />
              庄家立场
            </div>
            {bankerWins ? (
              <span className={css('opinion-win-badge')}>
                <Check size={12} aria-hidden />
                本局获胜
              </span>
            ) : null}
          </div>
          <div className={css('opinion-text')}>{duel.banker.stance}</div>
        </div>

        {duel.challengerSideText ? (
          <>
            <div className={css('vs-label')}>— VS —</div>
            <div className={css('opinion-box', 'opinion-challenger', challengerWins && 'opinion-winner')}>
              <div className={css('opinion-label-row')}>
                <div className={css('opinion-label', 'opinion-label-challenger')}>
                  <ChallengerStanceIcon />
                  挑战者立场 (加入即站此方)
                </div>
                {challengerWins ? (
                  <span className={css('opinion-win-badge')}>
                    <Check size={12} aria-hidden />
                    本局获胜
                  </span>
                ) : null}
              </div>
              <div className={css('opinion-text')}>{duel.challengerSideText}</div>
            </div>
          </>
        ) : null}

        {isPrivateOpen && duel.roomNumberDisplay ? (
          <div className={css('room-meta', 'room-meta-open')}>
            <button
              type="button"
              className={css('room-code', 'room-code-open')}
              onClick={() => onCopyInvite(duel.roomNumberDisplay ?? '')}
            >
              <Lock size={12} aria-hidden className={css('room-code-lock')} />
              <span>房间号 {duel.roomNumberDisplay}</span>
              <Copy size={12} aria-hidden className={css('room-code-copy')} />
            </button>
          </div>
        ) : null}

        {duel.disputeText ? (
          <div className={css('callout')}>
            <div className={css('callout-title')}>异议详情</div>
            <div className={css('callout-text')}>{duel.disputeText}</div>
          </div>
        ) : null}
      </div>

      {duel.showCapacity ? (
        <div className={css('capacity', isPrivateOpen && 'capacity-private-open')}>
          <div className={css('cap-header')}>
            <span className={css('cap-label')}>挑战者容量</span>
            <span className={css('cap-nums')}>
              <CoinAmount
                amount={duel.currentPool}
                iconSize={13}
                coinTone="gold"
                highlight={duel.currentPool > 0 && !duel.capacityFull}
                fullHighlight={duel.capacityFull}
              />
              <span>/</span>
              <CoinAmount amount={duel.wager} iconSize={13} coinTone="gold" fullHighlight={duel.capacityFull} />
            </span>
          </div>
          <div className={css('cap-bar', isPrivateOpen && isWaitingChallenger && 'cap-bar-waiting-open')}>
            {isWaitingChallenger ? (
              <span className={css('cap-waiting')}>
                <Hourglass size={12} aria-hidden />
                等待挑战者加入……
              </span>
            ) : (
              <div
                className={css(
                  'cap-fill',
                  duel.capacityFull && 'cap-fill-sealed',
                  capacityPct >= 100 && !duel.capacityFull && 'cap-fill-full',
                )}
                style={{ width: `${Math.max(capacityPct, capacityPct > 0 ? 4 : 0)}%` }}
              />
            )}
          </div>
          {isPrivateOpen && duel.privateRoomNote ? (
            <p className={css('private-room-note')}>{duel.privateRoomNote}</p>
          ) : null}
          {!isPrivateOpen && !duel.capacityNote ? (
            <div className={css('cap-detail')}>
              <span>已加入 {duel.challengerCount} 人</span>
              <span className="inline-flex flex-wrap items-center gap-1">
                {duel.capacityFull ? (
                  '已满额封盘'
                ) : (
                  <>
                    剩余容量 <CoinAmount amount={remainingCapacity} iconSize={12} />
                    {isPrivate ? ' · 无入场费' : null}
                  </>
                )}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {isPrivateOwnerOpen && duel.showInviteGenerator ? (
        <div className={css('invite-gen-box', 'invite-gen-box-owner')}>
          <span className={css('invite-gen-text')}>
            <Ticket size={14} aria-hidden className={css('invite-gen-text-ico')} />
            房主可生成 4 位邀请码，48 小时内有效，分享给好友快速进入
          </span>
          <button type="button" className={css('invite-gen-btn')} onClick={onGenerateInvite}>
            <Ticket size={14} aria-hidden />
            生成邀请码
          </button>
        </div>
      ) : null}

      {duel.capacityNote ? <p className={css('capacity-note')}>{duel.capacityNote}</p> : null}

      {showDeclareCountdownBox ? (
        <div className={css('countdown-box')}>
          <span className={css('countdown-box-label')}>
            <Hourglass size={15} aria-hidden />
            {duel.countdownLabel}
          </span>
          <span className={css('countdown-box-value')}>{liveCountdown}</span>
        </div>
      ) : null}

      {duel.phaseNote ? <p className={css('phase-note')}>{duel.phaseNote}</p> : null}

      {duel.declareResultLabel ? (
        <div className={css('declare-result-box')}>
          <span className={css('declare-result-left')}>
            <Megaphone size={14} aria-hidden />
            {duel.declareResultLabel}
          </span>
          {duel.declareResultHint ? (
            <span className={css('declare-result-right')}>{duel.declareResultHint}</span>
          ) : null}
        </div>
      ) : null}

      {duel.settlementSummary ? <p className={css('settlement-summary')}>{duel.settlementSummary}</p> : null}

      {duel.settlementBarLeft ? (
        <div
          className={css(
            'settlement-bar',
            duel.displayPhase === 'settled-challenger-wins' ? 'settlement-bar-challenger' : 'settlement-bar-banker',
          )}
        >
          <span className={css('settlement-bar-left')}>
            <Trophy size={14} aria-hidden />
            {duel.settlementBarLeft}
          </span>
          {duel.settlementBarRight ? (
            <span className={css('settlement-bar-right')}>{duel.settlementBarRight}</span>
          ) : null}
        </div>
      ) : null}

      {duel.voidInfoText ? (
        <div className={css('void-info-box')}>
          <Info size={14} className={css('void-info-icon')} aria-hidden />
          <span>{duel.voidInfoText}</span>
        </div>
      ) : null}

      <footer className={css('foot')}>
        <button type="button" className={css('foot-btn')} onClick={onToggleComments}>
          <MessageCircle size={15} aria-hidden />
          <span>{duel.commentCount}</span>
        </button>
        <button
          type="button"
          className={css('foot-btn', liked && 'foot-btn-liked')}
          onClick={onToggleLike}
        >
          <Heart size={15} aria-hidden fill={liked ? 'currentColor' : 'none'} />
          <span>{duel.likes + (liked ? 1 : 0)}</span>
        </button>
        <button type="button" className={css('foot-btn')} onClick={onViewDetail}>
          <FileText size={15} aria-hidden />
          <span>详情</span>
        </button>

        <div className={css('foot-action')}>
          {duel.canWithdraw ? (
            <button
              type="button"
              className={css(
                'foot-join',
                duel.displayPhase === 'settled-void' ? 'foot-join-muted' : 'foot-join-gold',
              )}
              onClick={onWithdraw}
            >
              {duel.displayPhase === 'settled-void' ? (
                <RefreshCw size={15} aria-hidden />
              ) : (
                <Wallet size={15} aria-hidden />
              )}
              {duel.withdrawLabel ?? '提取奖励'}
            </button>
          ) : null}
          {duel.canConfirm ? (
            <button type="button" className={css('foot-join', 'foot-join-green')} onClick={onConfirm}>
              <Check size={15} aria-hidden />
              同意宣判
            </button>
          ) : null}
          {duel.canDispute ? (
            <button type="button" className={css('foot-join', 'foot-join-pink')} onClick={onDispute}>
              <Flag size={15} aria-hidden />
              提出异议
            </button>
          ) : null}
          {duel.canJoin ? (
            <button type="button" className={css('foot-join', 'foot-join-blue')} onClick={onJoin}>
              <Swords size={15} aria-hidden />
              {duel.footerActionLabel ?? '挑战庄家'}
            </button>
          ) : null}
          {duel.canBankerAddStake ? (
            <button type="button" className={css('foot-join', 'foot-join-orange')} onClick={onAddStake}>
              <Plus size={15} aria-hidden />
              庄家加注
            </button>
          ) : null}
          {duel.canDeclare ? (
            <>
              <button
                type="button"
                className={css('foot-join', 'foot-join-green')}
                onClick={() => onDeclare('banker_wins')}
              >
                <Megaphone size={15} aria-hidden />
                宣布庄家赢
              </button>
              <button
                type="button"
                className={css('foot-join', 'foot-join-pink')}
                onClick={() => onDeclare('banker_loses')}
              >
                <Megaphone size={15} aria-hidden />
                宣布庄家输
              </button>
            </>
          ) : null}
          <span
            className={css(
              'foot-time',
              isPrivateGuestOpen && 'foot-time-private',
              isPrivateOwnerOpen && 'foot-time-owner',
              duel.displayPhase === 'pending-await-confirm' && 'foot-time-confirm',
              (duel.displayPhase === 'pending-await-declare' || duel.displayPhase === 'sealed-await-declare') &&
                'foot-time-declare',
            )}
          >
            {footerCountdownText ? (
              <>
                {duel.displayPhase === 'pending-await-confirm' ? <Hourglass size={12} aria-hidden /> : null}
                {footerCountdownText}
              </>
            ) : isPrivateGuestOpen ? (
              <>
                <Lock size={12} aria-hidden />
                {duel.footerTimeLabel}
              </>
            ) : (
              duel.footerTimeLabel
            )}
          </span>
        </div>
      </footer>

      {commentsOpen ? (
        <div className={css('cmt-thread')}>
          <div className={css('cmt-inner')}>
            {duel.comments.map((comment) => (
              <div key={comment.id} className={css('cmt-item')}>
                <div className={css('cmt-ava')}>{comment.avatar}</div>
                <div className={css('cmt-body')}>
                  <div className={css('cmt-head')}>
                    <div className={css('cmt-name')}>{comment.name}</div>
                    <div className={css('cmt-time')}>{comment.time}</div>
                  </div>
                  <div className={css('cmt-text')}>{comment.text}</div>
                </div>
              </div>
            ))}
            <div className={css('add-cmt')}>
              <input
                className={css('add-cmt-inp')}
                placeholder="加入讨论…"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
              />
              <button
                className={css('add-cmt-send')}
                type="button"
                onClick={onSubmitComment}
                disabled={commentSubmitting}
                style={commentSubmitting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
