/**
 * 文件说明：结算详情页（热度对决 / 派奖 / 榜单），按状态像素级展示。
 */
import React, { useMemo, useState } from 'react';
import { Check, Coins } from 'lucide-react';
import type { SettlementDetailViewModel } from '@/hooks/settlementTypes';
import { campColor, formatSettlementHeat } from '../settlementModel';
import styles from './index.module.scss';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

interface SettlementDetailViewProps {
  model: SettlementDetailViewModel;
  loading?: boolean;
  errorText?: string;
  onBack: () => void;
}

export const SettlementDetailView: React.FC<SettlementDetailViewProps> = ({
  model,
  loading = false,
  errorText,
  onBack,
}) => {
  const [rankTab, setRankTab] = useState<'all' | 'side'>('all');
  const rightHeatPct = 100 - model.heatLeftPct;

  const visibleLeaderboard = useMemo(() => {
    if (rankTab === 'side' && !model.leaderboardSideLocked && model.userCampSide !== 'unknown') {
      return model.leaderboardRows.filter(
        (row) => row.isMe || row.side === model.userCampSide,
      );
    }
    return model.leaderboardRows;
  }, [model.leaderboardRows, model.leaderboardSideLocked, model.userCampSide, rankTab]);

  return (
    <div className={css('root')}>
      <div className={css('grid')}>
        <div className={css('col-left')}>
          <section className={css('summary-card', model.headlineAccent === 'pink' && 'summary-card-pink')}>
            <p className={css('eyebrow')}>{model.eyebrow}</p>
            <h3 className={css('headline', model.headlineAccent === 'pink' && 'headline-pink')}>{model.headline}</h3>
            <p className={css('description')}>{model.description}</p>
          </section>

          {model.showHeatDuel ? (
            <section className={css('heat-card')}>
              <div className={css('heat-head')}>
                <span className={css('heat-title')}>热度对决</span>
                <span
                  className={css(
                    'heat-badge',
                    model.heatBadgeTone === 'pink' && 'heat-badge-pink',
                    model.heatBadgeTone === 'gold' && 'heat-badge-gold',
                  )}
                >
                  {model.heatBadge}
                </span>
              </div>
              <div className={css('heat-vs-row')}>
                <div className={css('heat-side')}>
                  <span className={css('heat-side-label')}>
                    <i className={css('dot', 'dot-a')} />
                    蓝方
                  </span>
                  <strong>{formatSettlementHeat(model.heatLeftValue)}</strong>
                </div>
                <span className={css('heat-vs')}>VS</span>
                <div className={css('heat-side', 'heat-side-right')}>
                  <span className={css('heat-side-label')}>
                    <i className={css('dot', 'dot-b')} />
                    红方
                  </span>
                  <strong>{formatSettlementHeat(model.heatRightValue)}</strong>
                </div>
              </div>
              <div className={css('heat-bar')}>
                <span className={css('heat-bar-a')} style={{ width: `${model.heatLeftPct}%` }} />
                <span className={css('heat-bar-b')} style={{ width: `${rightHeatPct}%` }} />
              </div>
              <p className={css('heat-footnote')}>{model.heatFootnote}</p>
            </section>
          ) : null}

          {model.showHeatReward ? (
            <section className={css('reward-card')}>
              <p className={css('reward-title')}>
                {model.settlementKind === 'tear' ? '撕裂带评论奖励' : '热度对决奖励 (仅阵营方)'}
              </p>
              {model.heatRewardEmpty ? (
                <>
                  <p className={css('reward-empty')}>无热度奖励</p>
                  <p className={css('reward-note')}>{model.heatRewardEmptyText}</p>
                </>
              ) : (
                <>
                  <p className={css('reward-amount')}>
                    + <Coins size={18} className={css('coin-icon')} aria-hidden />
                    {formatSettlementHeat(model.heatRewardAmount)} 龟币
                  </p>
                  <p className={css('reward-note')}>{model.heatRewardNote}</p>
                  {model.rewardPool ? (
                    <p className={css('reward-note')}>奖励池 {formatSettlementHeat(model.rewardPool)} 龟币</p>
                  ) : null}
                  <div className={css('reward-progress')}>
                    <span style={{ width: `${model.heatRewardProgressPct}%` }} />
                  </div>
                  <p className={css('reward-progress-label')}>我的贡献占比 {model.heatRewardProgressPct}%</p>
                </>
              )}
            </section>
          ) : null}
        </div>

        <div className={css('col-right')}>
          {loading ? (
            <section className={css('bet-card')}>
              <p className={css('loading-text')}>正在结算，请稍候…</p>
            </section>
          ) : errorText ? (
            <section className={css('bet-card')}>
              <p className={css('error-text')}>{errorText}</p>
            </section>
          ) : model.showBetPanel ? (
            <section className={css('bet-card')}>
              <p className={css('bet-title')}>{model.betPanelTitle}</p>
              <div className={css('bet-rows')}>
                <div className={css('bet-row')}>
                  <span>下注选项</span>
                  <strong>
                    <i
                      className={css('chip')}
                      style={{ backgroundColor: campColor(model.userCampSide) }}
                      aria-hidden
                    />
                    {model.betOptionLabel}
                  </strong>
                </div>
                <div className={css('bet-row')}>
                  <span>本金</span>
                  <strong>
                    <Coins size={14} className={css('coin-icon')} aria-hidden />
                    {formatSettlementHeat(model.betPrincipal)}
                  </strong>
                </div>
                <div className={css('bet-row')}>
                  <span>赔率</span>
                  <strong>{model.betOdds > 0 ? `${model.betOdds}x` : '—'}</strong>
                </div>
                <div className={css('bet-row')}>
                  <span>赛果</span>
                  <strong className={css(model.betHit ? 'result-hit' : 'result-miss')}>
                    {model.betHit ? (
                      <>
                        命中 <Check size={14} strokeWidth={3} />
                      </>
                    ) : (
                      <>未命中 ×</>
                    )}
                  </strong>
                </div>
              </div>
              <div className={css('bet-payout')}>
                <span>派奖</span>
                <strong className={css(model.betHit ? 'payout-hit' : 'payout-miss')}>
                  {model.betHit ? '+' : ''}
                  <Coins size={18} className={css('coin-icon')} aria-hidden />
                  {formatSettlementHeat(model.betPayout)}
                </strong>
              </div>
              <p className={css('bet-footnote')}>{model.betFootnote}</p>
            </section>
          ) : null}

          {model.showLeaderboard ? (
            <section className={css('rank-card')}>
              <div className={css('rank-head')}>
                <span>个人贡献 & 榜单</span>
                <div className={css('rank-tabs')}>
                  <button
                    type="button"
                    className={css(rankTab === 'all' && 'rank-tab-active')}
                    onClick={() => setRankTab('all')}
                  >
                    总榜
                  </button>
                  <button
                    type="button"
                    className={css(rankTab === 'side' && 'rank-tab-active')}
                    disabled={model.leaderboardSideLocked}
                    onClick={() => setRankTab('side')}
                  >
                    本方榜{model.leaderboardSideLocked ? ' · 选边后解锁' : ''}
                  </button>
                </div>
              </div>
              <ul className={css('rank-list')}>
                {visibleLeaderboard.map((row) => (
                  <li key={`${row.rank}-${row.name}`} className={css('rank-item', row.isMe && 'rank-item-me')}>
                    <span className={css('rank-no')}>{row.isMe && row.rank === 0 ? '—' : row.rank}</span>
                    <i
                      className={css('rank-chip')}
                      style={{ backgroundColor: campColor(row.side) }}
                      aria-hidden
                    />
                    <span className={css('rank-name')}>{row.name}</span>
                    <strong>{formatSettlementHeat(row.score)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <button type="button" className={css('back-btn')} onClick={onBack}>
            返回结算区 →
          </button>
        </div>
      </div>
    </div>
  );
};
