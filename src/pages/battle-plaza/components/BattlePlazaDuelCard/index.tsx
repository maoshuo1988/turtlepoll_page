/** 文件说明：地下钱庄赌局列表卡片，按 Tab 与赌局状态展示不同视觉。 */
import styles from './index.module.scss';
import { Coins, Copy, FileText, Heart, MessageCircle, Swords } from 'lucide-react';
import {
  STATUS_META,
  formatCoins,
  getDuelSettledResultTag,
  type DuelItem,
  type PlazaTab,
} from '../battlePlazaDuelModel';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function TurtleCoinIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <Coins
      size={size}
      aria-hidden
      className={`inline-block shrink-0 text-emerald-400 ${className ?? ''}`.trim()}
    />
  );
}

function CoinAmount({
  amount,
  iconSize = 14,
  className,
  highlight,
}: {
  amount: number;
  iconSize?: number;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className ?? ''}`.trim()}>
      <span className={highlight ? css('cap-nums-current') : undefined}>{formatCoins(amount)}</span>
      <TurtleCoinIcon size={iconSize} />
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
  viewContext,
  commentsOpen,
  liked,
  onToggleComments,
  onToggleLike,
  onJoin,
  onCopyInvite,
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
  const capacityPct = duel.wager > 0 ? Math.min(100, Math.round((duel.currentPool / duel.wager) * 100)) : 0;
  const status = STATUS_META[duel.status];
  const isPrivate = duel.visibility === 'private';
  const isMyBanker = viewContext === 'my-banker' || duel.banker.isMe;
  const isWaitingChallenger =
    duel.currentPool <= 0 && (duel.status === 'open' || duel.status === 'private') && duel.rawStatus === 'open';
  const remainingCapacity = Math.max(0, duel.wager - duel.currentPool);
  const footerTime = isPrivate ? `私人 · ${duel.timeAgoShort}` : duel.timeAgoShort;

  const bankerDisplayName = isMyBanker ? `${duel.banker.name} (庄家)` : duel.banker.name;

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

  return (
    <article className={css('card', duel.status === 'settled' && 'card-settled')}>
      <header className={css('head')}>
        <h3 className={css('title')}>{duel.topic}</h3>
        <div className={css('head-badges')}>
          {isPrivate ? <span className={css('badge', 'dbadge-private')}>私人</span> : null}
          <span className={css('badge', status.className)}>{status.label}</span>
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
              {(duel.settledResult ?? duel.declaredResult) && (() => {
                const resultTag = getDuelSettledResultTag(duel.settledResult ?? duel.declaredResult!);
                if (!resultTag) return null;
                return (
                  <span
                    className={css('result-tag')}
                    style={{
                      background: resultTag.background,
                      color: resultTag.color,
                      border: resultTag.border,
                    }}
                  >
                    {resultTag.label}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className={css('banker-stake')}>
            <div className={css('banker-stake-amount')}>
              <CoinAmount amount={duel.wager} iconSize={15} />
            </div>
            <span className={css('banker-stake-label')}>/ 庄家押注</span>
          </div>
        </div>

        <div className={css('opinion-box', 'opinion-banker')}>
          <div className={css('opinion-label', 'opinion-label-banker')}>
            <BankerStanceIcon />
            庄家立场
          </div>
          <div className={css('opinion-text')}>{duel.banker.stance}</div>
        </div>

        {duel.challengerSideText ? (
          <>
            <div className={css('vs-label')}>— VS —</div>
            <div className={css('opinion-box', 'opinion-challenger')}>
              <div className={css('opinion-label', 'opinion-label-challenger')}>
                <ChallengerStanceIcon />
                挑战者立场 (加入即站此方)
              </div>
              <div className={css('opinion-text')}>{duel.challengerSideText}</div>
            </div>
          </>
        ) : null}

        {isPrivate && duel.inviteCode ? (
          <div className={css('room-meta')}>
            <button type="button" className={css('room-code')} onClick={() => onCopyInvite(duel.inviteCode ?? '')}>
              房间号 {duel.inviteCode}
              <Copy size={12} aria-hidden />
            </button>
            {duel.settleCountdown ? <span className={css('room-expire')}>· {duel.settleCountdown}</span> : null}
          </div>
        ) : null}

        {duel.disputeText ? (
          <div className={css('callout')}>
            <div className={css('callout-title')}>异议详情</div>
            <div className={css('callout-text')}>{duel.disputeText}</div>
          </div>
        ) : null}

        {viewContext === 'my-challenger' && duel.myChallengeInfo ? (
          <div className={css('my-challenge-box', duel.myChallengeState === 'confirm' && 'my-challenge-box-confirm')}>
            <div>
              <div className={css('my-challenge-label')}>你的挑战信息</div>
              <div className={css('my-challenge-text')}>{duel.myChallengeInfo}</div>
            </div>
            {duel.myChallengeState === 'confirm' && (duel.canConfirm || duel.canDispute) ? (
              <div className={css('my-challenge-actions')}>
                {duel.canConfirm ? (
                  <button type="button" className={css('mini-btn')} onClick={onConfirm}>
                    同意
                  </button>
                ) : null}
                {duel.canDispute ? (
                  <button type="button" className={css('dispute-btn')} onClick={onDispute}>
                    提出异议
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {duel.status !== 'settled' && duel.status !== 'disputing' ? (
        <div className={css('capacity')}>
          <div className={css('cap-header')}>
            <span className={css('cap-label')}>挑战者容量</span>
            <span className={css('cap-nums')}>
              <CoinAmount amount={duel.currentPool} iconSize={13} highlight={duel.currentPool > 0} />
              <span>/</span>
              <CoinAmount amount={duel.wager} iconSize={13} />
            </span>
          </div>
          <div className={css('cap-bar')}>
            {isWaitingChallenger ? (
              <span className={css('cap-waiting')}>等待挑战者加入……</span>
            ) : (
              <div
                className={css('cap-fill', capacityPct >= 100 && 'cap-fill-full')}
                style={{ width: `${Math.max(capacityPct, capacityPct > 0 ? 4 : 0)}%` }}
              />
            )}
          </div>
          <div className={css('cap-detail')}>
            <span>已加入 {duel.challengerCount} 人</span>
            <span className="inline-flex flex-wrap items-center gap-1">
              {capacityPct >= 100 ? (
                '已满额封盘'
              ) : (
                <>
                  剩余容量 <CoinAmount amount={remainingCapacity} iconSize={12} />
                  {isPrivate ? ' · 无入场费' : null}
                </>
              )}
            </span>
            {isPrivate && isWaitingChallenger ? (
              <span className={css('cap-private-note')}>私人房间，仅限持房间号者加入</span>
            ) : null}
          </div>
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
            <button type="button" className={css('foot-join', 'foot-join-gold')} onClick={onWithdraw}>
              提取奖励
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
              + 庄家加注
            </button>
          ) : null}
          {duel.canDeclare ? (
            <>
              <button
                type="button"
                className={css('foot-join', 'foot-join-orange')}
                onClick={() => onDeclare('banker_wins')}
              >
                宣布庄家赢
              </button>
              <button
                type="button"
                className={css('foot-join', 'foot-join-red')}
                onClick={() => onDeclare('banker_loses')}
              >
                宣布庄家输
              </button>
            </>
          ) : null}
          {!duel.canWithdraw && !duel.canJoin && !duel.canBankerAddStake && !duel.canDeclare ? (
            <span className={css('foot-time')}>{footerTime}</span>
          ) : (
            <span className={css('foot-time')}>{footerTime}</span>
          )}
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
