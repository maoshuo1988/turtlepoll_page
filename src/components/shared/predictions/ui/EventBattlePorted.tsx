import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { PetSkin } from '@/data/mock_data';
import type { PredictionCardItem } from './predictionCard';
import './EventBattlePorted.css';

type CommentSide = 'A' | 'B';

interface EventBattleProps {
  news: PredictionCardItem;
  onBack: () => void;
  userSide: 'A' | 'B' | null;
  onBet?: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => void;
  bettingMarketId?: number | null;
  equippedSkin?: PetSkin | null;
}

type StageComment = {
  id: string;
  author: string;
  time: string;
  text: string;
  likes?: string;
  replies?: Array<{ user: string; text: string }>;
};

type StageFeedItem = {
  id: string;
  side: CommentSide;
  text: string;
};

const FALLBACK_AVATAR = '/games/event-battle/img/tx.png';

function formatVotes(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN');
}

function clampPct(value: number) {
  return Math.max(8, Math.min(92, value));
}

function buildLeftComments(optionA: string, optionB: string): StageComment[] {
  return [
    {
      id: 'left-1',
      author: '战神·狂飙',
      time: '1分钟前',
      text: `兄弟们冲啊！这一波团战直接拿下，${optionA} 必胜！`,
      likes: '1.2k',
    },
    {
      id: 'left-2',
      author: '策略大师',
      time: '5分钟前',
      text: `${optionB} 的防御已经破绽百出了，现在是反击的最佳时刻。`,
      likes: '452',
      replies: [
        { user: '暗夜', text: '同意，等一个大招进场。' },
        { user: '红队铁粉', text: '稳住别浪，我们要赢！' },
      ],
    },
    {
      id: 'left-3',
      author: '路人甲',
      time: '10分钟前',
      text: '这一场 PK 真的太精彩了，旗鼓相当啊。',
    },
    {
      id: 'left-4',
      author: '红色闪电',
      time: '12分钟前',
      text: '红色能量槽已满，全军出击！',
    },
  ];
}

function buildRightComments(optionA: string, optionB: string): StageComment[] {
  return [
    {
      id: 'right-1',
      author: '深海指挥官',
      time: '刚刚',
      text: `${optionB} 的家人们，把“反攻”扣在公屏上！我们还没输！`,
      likes: '2.5k',
    },
    {
      id: 'right-2',
      author: '极光·掠夺者',
      time: '3分钟前',
      text: `${optionB} 的防守反击战术即将启动，大家配合好。`,
    },
    {
      id: 'right-3',
      author: '冰霜之吻',
      time: '8分钟前',
      text: `虽然暂时落后，但 ${optionB} 的韧性是 ${optionA} 比不了的。`,
      replies: [
        { user: '路人', text: `确实，${optionB} 后期很强。` },
      ],
    },
  ];
}

function buildFeed(optionA: string, optionB: string): StageFeedItem[] {
  return [
    { id: 'feed-1', side: 'A', text: `用户992 加入了 ${optionA}` },
    { id: 'feed-2', side: 'B', text: `电竞高手 加入了 ${optionB}` },
    { id: 'feed-3', side: 'A', text: `情报员“黄金猎手”正在为 ${optionA} 聚拢热度` },
    { id: 'feed-4', side: 'B', text: `${optionB} 阵营完成了一波反攻集结` },
  ];
}

function buildSupporters(seed: string) {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `${seed}-${index}`,
    rank: index < 3 ? index + 1 : null,
  }));
}

function AvatarStack({ rank }: { rank: number | null }) {
  return (
    <div className={`avatar-wrap ${rank ? `rank-${rank}` : ''}`}>
      <img src={FALLBACK_AVATAR} alt="" />
      {rank ? <span className="badge">{rank}</span> : null}
    </div>
  );
}

export const EventBattle: React.FC<EventBattleProps> = ({
  news,
  onBack,
  userSide,
  equippedSkin,
}) => {
  const [draft, setDraft] = useState('');

  const leftVotes = news.votes?.A ?? 0;
  const rightVotes = news.votes?.B ?? 0;
  const totalVotes = Math.max(1, leftVotes + rightVotes);
  const leftPct = clampPct(Math.round((leftVotes / totalVotes) * 100));

  const leftComments = useMemo(() => buildLeftComments(news.optionA, news.optionB), [news.optionA, news.optionB]);
  const rightComments = useMemo(() => buildRightComments(news.optionA, news.optionB), [news.optionA, news.optionB]);
  const feeds = useMemo(() => buildFeed(news.optionA, news.optionB), [news.optionA, news.optionB]);
  const leftSupporters = useMemo(() => buildSupporters('left'), []);
  const rightSupporters = useMemo(() => buildSupporters('right'), []);

  const leftRole = userSide === 'A' ? '你当前在红方阵营' : '意见领袖';
  const rightRole = userSide === 'B' ? '你当前在蓝方阵营' : '破光杀手';

  return (
    <div className="pk-page">
      <div className="pk-page-top">
        <button type="button" className="pk-page-back" onClick={onBack}>
          <ChevronLeft size={16} />
          返回
        </button>
        <img src="/games/event-battle/img/top.jpg" alt={news.title} className="top-img" />
      </div>

      <div className="team-group-main">
        <div className="pk-page-container">
          <div className="kuang">
            <img src="/games/event-battle/img/kuang.png" alt="" className="kuang-img" />
            <div className="kuang-con">
              {news.summary || news.title}
            </div>
          </div>

          <div className="team-group">
            <div className="team-red">
              <div className="team_tx">
                <img src={FALLBACK_AVATAR} alt={news.optionA} />
              </div>
              <div className="team-info text-start">
                <div className="t_name">{news.optionA}</div>
                <span>{leftRole}</span>
              </div>
            </div>
            <div className="team-blue">
              <div className="team-info text-end">
                <div className="t_name">{news.optionB}</div>
                <span>{rightRole}</span>
              </div>
              <div className="team_tx">
                <img src={FALLBACK_AVATAR} alt={news.optionB} />
              </div>
            </div>
          </div>

          <div className="pk-container">
            <div className="team-names-row">
              <div className="team-label name-red">{news.optionA}</div>
              <div className="team-label name-blue">{news.optionB}</div>
            </div>

            <div className="bar-outer">
              <div className="bar-red" style={{ width: `${leftPct}%` }} />
              <div className="divider-line" style={{ left: `${leftPct}%` }}>
                <img src="/games/event-battle/img/fire.png" alt="" className="divider-fire" />
              </div>
              <div className="bar-blue" />
            </div>

            <div className="score-row">
              <div className="score-val score-red">{formatVotes(leftVotes)}</div>
              <div className="score-val score-blue">{formatVotes(rightVotes)}</div>
            </div>
          </div>
        </div>

        <div className="title-wrap">
          <img src="/games/event-battle/img/title01.png" alt="评论战场" className="title-img" />
        </div>

        <div className="pinglun-main">
          <div className="pl-box red_left">
            <div className="pl-header">
              <div className="team-info">
                <span className="team-name">{news.optionA}</span>
                <span className="team-score">{formatVotes(leftVotes)}</span>
              </div>
            </div>

            <div className="pl-users-section">
              <div className="section-title">
                <span>活跃成员</span>
                <span className="user-count">2.5k</span>
              </div>
              <div className="users-scroll-area">
                <div className="user-grid">
                  {leftSupporters.map((item) => (
                    <div key={item.id} className="grid-item">
                      <AvatarStack rank={item.rank} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pl-comment-area">
              {leftComments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="c-left">
                    <img className="c-avatar" src={FALLBACK_AVATAR} alt={comment.author} />
                  </div>
                  <div className="c-content">
                    <div className="c-user-info">
                      <span className="c-nickname">{comment.author}</span>
                      <span className="c-time">{comment.time}</span>
                    </div>
                    <p className="c-text">{comment.text}</p>
                    {comment.likes ? (
                      <div className="c-actions">
                        <span className="action-btn active">❤ {comment.likes}</span>
                        <span className="action-btn">回复</span>
                        <span className="action-btn">举报</span>
                      </div>
                    ) : null}
                    {comment.replies ? (
                      <div className="reply-box">
                        {comment.replies.map((reply) => (
                          <div key={`${comment.id}-${reply.user}`} className="r-item">
                            <span className="r-user">{reply.user}:</span>{' '}
                            <span className="r-text">{reply.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pl-center">
            <div className="live-status">
              <div className="pulse-icon" />
              <span className="live-text">LIVE 实时对战中</span>
            </div>

            <div className="battle-report">
              <div className="scan-line" />
              <div className="report-scroll-content">
                {feeds.map((item) => (
                  <div key={item.id} className="report-item new-entry">
                    {item.side === 'A' ? '🔥' : '⚡'}{' '}
                    <span className={`r-name ${item.side === 'A' ? 'r-red' : 'r-blue'}`}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="battle-tishi">
              <img src="/games/event-battle/img/kuang2.png" alt="" className="ts-bj" />
              <div className="battle-ts-box">
                <img src="/games/event-battle/img/hj.png" alt="" className="battle-icon" />
                <h5>{equippedSkin ? `${equippedSkin.name} 上场` : '巨鳄上场'}</h5>
                <p>
                  情报员 <span>{userSide === 'A' ? news.optionA : userSide === 'B' ? news.optionB : '黄金猎手'}</span>{' '}
                  正在为 <span>{userSide === 'A' ? news.optionA : news.optionB}</span> 汇聚战场声量
                </p>
              </div>
            </div>

            <div className="vs-players">
              <div className="p-card red-p">
                <div className="p-avatar-wrap">
                  <img src={FALLBACK_AVATAR} alt={news.optionA} />
                  <div className="mvp-icon" />
                </div>
                <div className="p-info">
                  <div className="p-name">{news.optionA}</div>
                  <div className="p-level">意见领袖</div>
                </div>
              </div>

              <div className="vs-mid-icon">
                <img src="/games/event-battle/img/vs2.png" alt="VS" />
              </div>

              <div className="p-card blue-p">
                <div className="p-avatar-wrap">
                  <img src={FALLBACK_AVATAR} alt={news.optionB} />
                </div>
                <div className="p-info">
                  <div className="p-name">{news.optionB}</div>
                  <div className="p-level">破光杀手</div>
                </div>
              </div>
            </div>

            <div className="props-section">
              <div className="props-title">战场实时道具</div>
              <div className="props-grid">
                <div className="prop-card red-prop">
                  <div className="prop-icon-box">
                    <span className="emoji">🔥</span>
                    <span className="prop-tag">RED</span>
                  </div>
                  <div className="prop-info">
                    <div className="prop-name">狂暴药剂</div>
                    <div className="prop-desc">攻击力+50%<br />持续30秒</div>
                  </div>
                </div>

                <div className="prop-card blue-prop">
                  <div className="prop-icon-box">
                    <span className="emoji">🛡️</span>
                    <span className="prop-tag">BLUE</span>
                  </div>
                  <div className="prop-info">
                    <div className="prop-name">寒冰护盾</div>
                    <div className="prop-desc">吸收2k伤害<br />减速反伤</div>
                  </div>
                </div>

                <div className="prop-card neutral-prop">
                  <div className="prop-icon-box">
                    <span className="emoji">⚡</span>
                    <span className="prop-tag">ALL</span>
                  </div>
                  <div className="prop-info">
                    <div className="prop-name">电磁干扰</div>
                    <div className="prop-desc">冷却+10%<br />全场生效</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="center-footer">
              <div className="input-wrap">
                <input
                  type="text"
                  placeholder="聊点什么吧..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="button" className="send-btn">
                  发表
                </button>
              </div>

              <div className="footer-icons">
                <div className="f-icon has-popup">
                  <img src="/games/event-battle/img/lw.png" alt="" className="f-icon-img" />
                  <div className="footer-popup report-popup">
                    <div className="popup-header">我的战报</div>
                    <div className="popup-body">
                      <div className="popup-stats">
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(leftComments.length + rightComments.length)}</span>
                          <span className="fi_text">评论数</span>
                        </div>
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(leftVotes + rightVotes)}</span>
                          <span className="fi_text">总票仓</span>
                        </div>
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(leftVotes)}</span>
                          <span className="fi_text">红方票数</span>
                        </div>
                        <div className="popup-stat">
                          <span className="fi_nums">{formatVotes(rightVotes)}</span>
                          <span className="fi_text">蓝方票数</span>
                        </div>
                      </div>
                    </div>
                    <div className="popup-arrow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pl-box blue_right">
            <div className="pl-header">
              <div className="team-info">
                <span className="team-name">{news.optionB}</span>
                <span className="team-score">{formatVotes(rightVotes)}</span>
              </div>
            </div>

            <div className="pl-users-section">
              <div className="section-title">
                <span>活跃成员</span>
                <span className="user-count">2.5k</span>
              </div>
              <div className="users-scroll-area">
                <div className="user-grid">
                  {rightSupporters.map((item) => (
                    <div key={item.id} className="grid-item">
                      <AvatarStack rank={item.rank} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pl-comment-area">
              {rightComments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="c-left">
                    <img className="c-avatar" src={FALLBACK_AVATAR} alt={comment.author} />
                  </div>
                  <div className="c-content">
                    <div className="c-user-info">
                      <span className="c-nickname">{comment.author}</span>
                      <span className="c-time">{comment.time}</span>
                    </div>
                    <p className="c-text">{comment.text}</p>
                    {comment.likes ? (
                      <div className="c-actions">
                        <span className="action-btn active blue-action">❤ {comment.likes}</span>
                        <span className="action-btn">回复</span>
                      </div>
                    ) : null}
                    {comment.replies ? (
                      <div className="reply-box">
                        {comment.replies.map((reply) => (
                          <div key={`${comment.id}-${reply.user}`} className="r-item">
                            <span className="r-user">{reply.user}:</span>{' '}
                            <span className="r-text">{reply.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TODO:
          这里先按你给的 pk 页面做 React 还原。
          原 EventBattle 里的评论查询、发评论、回复、下注联动接口暂时不接到这版 UI，
          后面需要恢复时，可从 legacy EventBattle.tsx 继续按模块搬回来。 */}
    </div>
  );
};
