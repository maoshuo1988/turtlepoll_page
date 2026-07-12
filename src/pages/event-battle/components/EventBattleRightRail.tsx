/** 文件说明：暗盘撕裂带右侧栏（热度榜、下注面板、我的贡献），对齐开撕台撕裂带布局。 */
import React from 'react';
import { Flame, Lock, Shield, Trophy } from 'lucide-react';
import type { EventBattleTheme } from './eventBattleThemes';
import './EventBattleRightRail.css';

type CommentSide = 'A' | 'B';

export type EventBattleRankRow = {
  id: string;
  name: string;
  avatar: string;
  rank: number | null;
  score: number;
  side: CommentSide;
};

export type EventBattleRightRailProps = {
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  balance: number;
  betAmount: string;
  quickAmounts: number[];
  hasMarketBet: boolean;
  myBetSide?: CommentSide;
  marketBetAmount: number;
  isBettingOpen: boolean;
  canPlaceBet: boolean;
  isBetting: boolean;
  estimatedPayout: number;
  rankMode: 'all' | 'side';
  onRankModeChange: (mode: 'all' | 'side') => void;
  rankRows: EventBattleRankRow[];
  rankLoading?: boolean;
  personalStats: {
    likeCount: number;
    commentCount: number;
    betAmount: number;
    heatScore: number;
    side?: CommentSide | null;
  };
  visualTheme: EventBattleTheme;
  onBetAmountChange: (value: string) => void;
  onQuickAmount: (amount: number) => void;
  onOpenBet: (side: CommentSide) => void;
  onConfirmBet?: () => void;
  canTearSettle?: boolean;
  isTearSettling?: boolean;
  onTearSettle?: () => void;
  tearRemainLabel?: string;
  winnerOptionLabel?: string;
  className?: string;
};

function formatVotes(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN');
}

function formatOdds(odds: number) {
  if (!Number.isFinite(odds) || odds <= 0) return '--';
  return `${odds.toFixed(1)}x`;
}

function sideColor(theme: EventBattleTheme, side: CommentSide) {
  return side === 'A' ? theme.sideA.accent : theme.sideB.accent;
}

function sideName(optionA: string, optionB: string, side?: CommentSide | null) {
  if (side === 'A') return optionA;
  if (side === 'B') return optionB;
  return '未选边';
}

export const EventBattleRightRail: React.FC<EventBattleRightRailProps> = ({
  optionA,
  optionB,
  oddsA,
  oddsB,
  balance,
  betAmount,
  quickAmounts,
  hasMarketBet,
  myBetSide,
  marketBetAmount,
  isBettingOpen,
  canPlaceBet,
  isBetting,
  estimatedPayout,
  rankMode,
  onRankModeChange,
  rankRows,
  rankLoading,
  personalStats,
  visualTheme,
  onBetAmountChange,
  onQuickAmount,
  onOpenBet,
  onConfirmBet,
  canTearSettle,
  isTearSettling,
  onTearSettle,
  tearRemainLabel,
  winnerOptionLabel,
  className = '',
}) => {
  const sideLocked = hasMarketBet && (myBetSide === 'A' || myBetSide === 'B');
  const activeSide = sideLocked ? myBetSide : undefined;
  const activeOption = activeSide === 'A' ? optionA : activeSide === 'B' ? optionB : '';
  const activeOdds = activeSide === 'A' ? oddsA : activeSide === 'B' ? oddsB : 0;
  const activeColor = activeSide ? sideColor(visualTheme, activeSide) : undefined;

  return (
    <div className={`eb-right-rail ${className}`.trim()}>
      <section className="eb-right-card eb-right-rank-card">
        <div className="eb-right-card-head">
          <div className="eb-right-card-title">
            <Trophy size={16} />
            <span>热度贡献榜</span>
          </div>
          <div className="eb-right-rank-tabs" role="tablist" aria-label="切换热度榜">
            <button
              type="button"
              role="tab"
              aria-selected={rankMode === 'all'}
              className={rankMode === 'all' ? 'active' : ''}
              onClick={() => onRankModeChange('all')}
            >
              总榜
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rankMode === 'side'}
              className={rankMode === 'side' ? 'active' : ''}
              disabled={!hasMarketBet}
              onClick={() => {
                if (!hasMarketBet) return;
                onRankModeChange('side');
              }}
            >
              本方榜
              {!hasMarketBet ? <Lock size={12} /> : null}
            </button>
          </div>
        </div>
        {!hasMarketBet ? <p className="eb-right-rank-hint">选边后解锁本方榜</p> : null}
        <div className="eb-right-rank-list">
          {rankLoading ? (
            <div className="eb-right-empty">榜单加载中...</div>
          ) : rankRows.length === 0 ? (
            <div className="eb-right-empty">暂无热度贡献数据</div>
          ) : (
            rankRows.slice(0, 8).map((item, index) => (
              <div
                key={item.id}
                className="eb-right-rank-item"
                style={{ ['--rank-side-color' as string]: sideColor(visualTheme, item.side) }}
              >
                <i>{item.rank ?? index + 1}</i>
                <img src={item.avatar} alt={item.name} />
                <b>{item.name}</b>
                <strong>
                  <Flame size={12} />
                  {formatVotes(item.score)}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="eb-right-card eb-right-bet-card">
        <div className="eb-right-card-head">
          <div className="eb-right-card-title">
            <span>下注面板</span>
            {isBettingOpen ? (
              <span className={`eb-right-status-pill ${sideLocked ? 'is-locked' : 'is-open'}`}>
                {sideLocked ? `已下注 · ${activeOption}` : '开放下注'}
              </span>
            ) : (
              <span className="eb-right-status-pill is-paused">已暂停</span>
            )}
          </div>
          <span className="eb-right-balance">余额 {formatVotes(balance)}</span>
        </div>

        <p className="eb-right-bet-desc">{optionA} vs {optionB}</p>

        {sideLocked && activeSide ? (
          <div className="eb-right-bet-locked">
            <div
              className="eb-right-bet-single is-readonly"
              style={{ backgroundColor: activeColor, borderColor: activeColor }}
            >
              <span>已支持 {activeOption}</span>
              <em>{formatOdds(activeOdds)}</em>
            </div>
            <p className="eb-right-bet-note">
              已投入 {formatVotes(marketBetAmount)} 龟币支持「{activeOption}」
              {estimatedPayout > 0 ? `，预计派奖 ${formatVotes(estimatedPayout)}` : ''}
              。本局仅可下注一次。
            </p>
          </div>
        ) : (
          <div className="eb-right-bet-open">
            <div className="eb-right-bet-options">
              <button
                type="button"
                className="eb-right-bet-option"
                style={{ borderColor: sideColor(visualTheme, 'A'), color: sideColor(visualTheme, 'A') }}
                disabled={!canPlaceBet || isBetting}
                onClick={() => onOpenBet('A')}
              >
                <span>{optionA}</span>
                <em>{formatOdds(oddsA)}</em>
              </button>
              <button
                type="button"
                className="eb-right-bet-option"
                style={{ borderColor: sideColor(visualTheme, 'B'), color: sideColor(visualTheme, 'B') }}
                disabled={!canPlaceBet || isBetting}
                onClick={() => onOpenBet('B')}
              >
                <span>{optionB}</span>
                <em>{formatOdds(oddsB)}</em>
              </button>
            </div>
            <div className="eb-right-quick-amounts">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={Number(betAmount) === amount ? 'active' : ''}
                  onClick={() => onQuickAmount(amount)}
                  disabled={!canPlaceBet}
                >
                  {formatVotes(amount)}
                </button>
              ))}
            </div>
            <label className="eb-right-bet-input">
              <input
                value={betAmount}
                inputMode="numeric"
                placeholder="输入下注龟币数量"
                disabled={!canPlaceBet}
                onChange={(event) => onBetAmountChange(event.target.value.replace(/[^\d]/g, ''))}
              />
              <span>龟币</span>
            </label>
            <button
              type="button"
              className="eb-right-bet-confirm"
              disabled={!canPlaceBet || isBetting}
              onClick={() => onConfirmBet?.()}
            >
              {isBetting ? '下注中...' : '确认下注'}
            </button>
          </div>
        )}
      </section>

      {canTearSettle ? (
        <section className="eb-right-card">
          <div className="eb-right-card-title">
            <Trophy size={16} />
            <span>撕裂带奖励</span>
          </div>
          <p className="eb-right-bet-note">
            {winnerOptionLabel ? `胜方 ${winnerOptionLabel}` : '市场已结算'}
            {tearRemainLabel ? ` · ${tearRemainLabel}` : '，可领取撕裂带评论奖励。'}
          </p>
          <button
            type="button"
            className="eb-right-bet-confirm"
            disabled={isTearSettling}
            onClick={() => onTearSettle?.()}
          >
            {isTearSettling ? '领取中...' : '领取撕裂带奖励'}
          </button>
        </section>
      ) : null}

      <section className="eb-right-card eb-right-me-card">
        <div className="eb-right-card-title">
          <Shield size={16} />
          <span>我的贡献</span>
          {personalStats.side ? (
            <em style={{ color: sideColor(visualTheme, personalStats.side) }}>
              {sideName(optionA, optionB, personalStats.side)}
            </em>
          ) : null}
        </div>
        <div className="eb-right-me-stats">
          <div>
            <span>收到的点赞</span>
            <strong>{formatVotes(personalStats.likeCount)}</strong>
          </div>
          <div>
            <span>评论数</span>
            <strong>{formatVotes(personalStats.commentCount)}</strong>
          </div>
          <div>
            <span>下注总额</span>
            <strong>{formatVotes(personalStats.betAmount)}</strong>
          </div>
          <div>
            <span>我贡献的热度</span>
            <strong>{formatVotes(personalStats.heatScore)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};
