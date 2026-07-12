/**
 * 文件说明：移动端首页待结算事件单卡展示。
 */
import type { SettlementRecordItem } from '@/hooks/settlementTypes';
import { IconFont } from '@/components/common/iconfont/IconFont';
import type { HomeMobileSettlementCard } from '../homeMobileSettlementModel';
import {
  resolveBetAmount,
  resolveDisplayOdds,
  resolveExpectedPayout,
  resolveExpectedReturnPct,
  resolvePoolTotal,
  resolveSettlementCountdownLabel,
  resolveSettlementCtaLabel,
  resolveSettlementSourceLabel,
  resolveSettlementStatusLabel,
  resolveSidePercents,
  isTearSettlementRecord,
  resolveTearWinnerLabel,
  resolveTearRemainLabel,
} from '../homeMobileSettlementModel';
import styles from '../HomeMobileHome/index.module.scss';

function formatCoin(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 10000) {
    const wan = value / 10000;
    return `${wan >= 100 ? wan.toFixed(0) : wan.toFixed(1).replace(/\.0$/, '')}万`;
  }
  return String(Math.round(value));
}

export interface HomeMobileSettlementEventCardProps {
  item: HomeMobileSettlementCard;
  onAction: (record: SettlementRecordItem) => void;
}

export function HomeMobileSettlementEventCard({ item, onAction }: HomeMobileSettlementEventCardProps) {
  const { record, card, market } = item;
  const isTear = isTearSettlementRecord(record);
  const { pctA, pctB } = resolveSidePercents(card);
  const pool = resolvePoolTotal(card);
  const betAmount = resolveBetAmount(market);
  const expectedPayout = resolveExpectedPayout(market, card);
  const expectedReturn = resolveExpectedReturnPct(market, card);
  const sideALabel = card?.optionA || '看多';
  const sideBLabel = card?.optionB || '看空';

  return (
    <article className={styles.eventCard}>
      <div className={styles.eventMeta}>
        <div className={styles.eventTags}>
          <span className={styles.tagPrimary}>{resolveSettlementSourceLabel(record)}</span>
          <span className={styles.tagMuted}>{resolveSettlementStatusLabel(item)}</span>
        </div>
        <span className={styles.eventCountdown}>{resolveSettlementCountdownLabel(item)}</span>
      </div>

      <div className={styles.eventMain}>
        <div className={styles.eventCopy}>
          <h3 className={styles.eventTitle}>{card?.title || record.title}</h3>
          <p className={styles.eventSummary}>{card?.summary || record.subtitle}</p>
        </div>
        <div className={styles.eventOdds}>
          <span className={styles.eventOddsLabel}>赔率</span>
          <span className={styles.eventOddsValue}>{resolveDisplayOdds(market, card)}</span>
        </div>
      </div>

      {card ? (
        <div className={styles.sideRow}>
          <button type="button" className={styles.sideBull}>
            <span className={styles.sideTitle}>
              {sideALabel} {pctA}%
            </span>
            <span className={styles.sideSub}>{formatCoin(card.votes.A)}龟币</span>
          </button>
          <button type="button" className={styles.sideBear}>
            <span className={styles.sideTitle}>
              {sideBLabel} {pctB}%
            </span>
            <span className={styles.sideSub}>{formatCoin(card.votes.B)}龟币</span>
          </button>
        </div>
      ) : null}

      <div className={styles.statGrid}>
        {isTear ? (
          <>
            <div className={styles.statItem}>
              <IconFont name="sen018" className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>胜方阵营</div>
                <div className={styles.statValue}>{resolveTearWinnerLabel(market, card)}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <IconFont name="shijian" className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>领取时效</div>
                <div className={styles.statValue}>{resolveTearRemainLabel(market)}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <IconFont name="qianbao" className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>奖励类型</div>
                <div className={styles.statValue}>评论热度奖励</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.statItem}>
              <IconFont name="fenshiqiehuan-panqianpanzhong" className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>我的下注</div>
                <div className={styles.statValue}>{betAmount > 0 ? `${formatCoin(betAmount)} 龟币` : '--'}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <IconFont name="shijian" className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>事件状态</div>
                <div className={styles.statValue}>{resolveSettlementStatusLabel(item)}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <IconFont name="qianbao" className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>预计到账</div>
                <div className={styles.statValue}>
                  {expectedPayout > 0 ? `${formatCoin(expectedPayout)} 龟币` : '--'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={styles.eventFoot}>
        <div className={styles.footStats}>
          {isTear ? (
            <>
              <div>
                <div className={styles.footLabel}>结算状态</div>
                <div className={styles.footValue}>{market?.tearSettlement?.status || 'PENDING'}</div>
              </div>
              <div>
                <div className={styles.footLabel}>奖励说明</div>
                <div className={styles.footGain}>胜方评论瓜分奖池</div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className={styles.footLabel}>资金池</div>
                <div className={styles.footValue}>{pool > 0 ? `${formatCoin(pool)}龟币` : '--'}</div>
              </div>
              <div>
                <div className={styles.footLabel}>预期收益率</div>
                <div className={styles.footGain}>{expectedReturn > 0 ? `+${expectedReturn}%` : '--'}</div>
              </div>
            </>
          )}
        </div>
        <button type="button" className={styles.settleCta} onClick={() => onAction(record)}>
          {resolveSettlementCtaLabel(record, card)}
        </button>
      </div>
    </article>
  );
}
