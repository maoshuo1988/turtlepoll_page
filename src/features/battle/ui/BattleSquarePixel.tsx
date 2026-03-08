import React, { useEffect, useMemo, useState } from 'react';
import type { Battle, BattleSide } from '../../../data/mock_data';

interface BattleSquarePixelProps {
  battles: Battle[];
  userBalance: number;
  onCreateBattle: (topic: string, optionA: string, optionB: string, side: BattleSide, wager: number) => void;
  onAcceptBattle: (battleId: string) => void;
  onResolveBattle: (battleId: string, winningSide: BattleSide) => void;
}

type BattleModalState = {
  open: boolean;
  title: string;
  redLabel: string;
  blueLabel: string;
  side: 'red' | 'blue' | null;
  amount: number;
};

type CardLite = {
  id: string;
  catClass: string;
  catText: string;
  badgeClass: string;
  badgeText: string;
  title: string;
  left: { avatar: string; name: string; streak: string; coins: string; argument: string; direction: string; supportText: string };
  right: { avatar: string; name: string; streak: string; coins: string; argument: string; direction: string; supportText: string };
  oddsLeft: string;
  oddsRight: string;
  leftPct: number;
  rightPct: number;
  votes: number;
  pool: string;
  comments: number;
  likes: number;
  shares: number;
  time: string;
};

const PRESET_AMTS = [50, 100, 200, 500, 1000];
const THEME_OVERRIDES = `
html:not(.dark) #page-battle{
  --red:#ef4444; --red-dim:rgba(239,68,68,.10); --red-glow:rgba(239,68,68,.22);
  --blue:#2563eb; --blue-dim:rgba(37,99,235,.10); --blue-glow:rgba(37,99,235,.22);
  --gold:#b97a00; --gold-dim:rgba(185,122,0,.10);
  --green:#059669; --orange:#ea580c;
  --surface:#ffffff; --surface2:#f6f8fb; --surface3:#eef2f7;
  --border:rgba(15,23,42,.10); --border2:rgba(15,23,42,.2);
  --ink:#0f172a; --muted:#64748b;
  background:#f3f6fb;
}
html:not(.dark) #page-battle::before{
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(15,23,42,.02) 2px,rgba(15,23,42,.02) 4px);
}
html:not(.dark) #page-battle .page-hero-battle{
  background:linear-gradient(135deg,rgba(239,68,68,.08),rgba(37,99,235,.08));
}
html.dark #page-battle{
  --red:#ff3c3c; --red-dim:rgba(255,60,60,.12); --red-glow:rgba(255,60,60,.25);
  --blue:#3c8eff; --blue-dim:rgba(60,142,255,.12); --blue-glow:rgba(60,142,255,.25);
  --gold:#ffc94d; --gold-dim:rgba(255,201,77,.1);
  --green:#00d68f; --orange:#ff7b2c;
  --surface:#111010; --surface2:#1a1818; --surface3:#222020;
  --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.13);
  --ink:#f0ede8; --muted:#6b6760;
  background:#0a0909;
}
`;

const FALLBACK_CARDS: CardLite[] = [
  {
    id: 'bbc1',
    catClass: 'bcat-wc',
    catText: '⚽ 世界杯',
    badgeClass: 'bhot-badge',
    badgeText: '🔥 激战',
    title: '2026世界杯决赛 —— 巴西 vs 法国，谁拿冠军？',
    left: {
      avatar: '🦁',
      name: 'LionMaster',
      streak: '🔥 8连胜 · 正方',
      coins: '+1,200🪙',
      argument: '巴西阵容深度冠绝全球，维尼修斯+罗德里戈+卡塞米罗黄金组合。2022年教训已被吸收，#大赛经验 无人能及。法国依赖姆巴佩单核，一旦被针对则全线崩溃。',
      direction: '🔴 押巴西夺冠',
      supportText: '支持此方 ⚔️',
    },
    right: {
      avatar: '🐉',
      name: 'DragonSeer',
      streak: '🔥 5连胜 · 反方',
      coins: '+900🪙',
      argument: '法国中场控制力无人能及。姆巴佩+格里兹曼+坎特的阵容在任何体系下都能压制对手。巴西历史大赛心理素质存疑。',
      direction: '🔵 押法国夺冠',
      supportText: '支持此方 ⚔️',
    },
    oddsLeft: '3.8×',
    oddsRight: '4.5×',
    leftPct: 57,
    rightPct: 43,
    votes: 24757,
    pool: '68,200🪙',
    comments: 84,
    likes: 312,
    shares: 67,
    time: '⏱ 5个月后结算',
  },
  {
    id: 'bbc2',
    catClass: 'bcat-ai',
    catText: '🤖 AI',
    badgeClass: 'bhot-badge',
    badgeText: '🔥 激战',
    title: 'Claude 4 vs GPT-5 —— 2026年谁才是真正的AI王者？',
    left: {
      avatar: '🐺',
      name: 'CryptoWolf',
      streak: '胜率 63%',
      coins: '+480🪙',
      argument: 'Claude 4 在代码、推理、安全性上全面领先，研发节奏已远超 OpenAI。',
      direction: '🔴 Claude 4 登顶',
      supportText: '支持 Claude',
    },
    right: {
      avatar: '🦔',
      name: 'HedgehogFan',
      streak: '胜率 58%',
      coins: '+320🪙',
      argument: 'OpenAI 的数据规模、用户基础、商业资源都占优。GPT-5 一旦发布会扭转格局。',
      direction: '🔵 GPT-5 称霸',
      supportText: '支持 GPT-5',
    },
    oddsLeft: '1.59×',
    oddsRight: '2.70×',
    leftPct: 63,
    rightPct: 37,
    votes: 11420,
    pool: '29,800🪙',
    comments: 31,
    likes: 148,
    shares: 29,
    time: '⏱ 12个月后结算',
  },
];

function fmt(n: number) {
  return n.toLocaleString('zh');
}

export const BattleSquarePixel: React.FC<BattleSquarePixelProps> = ({
  battles,
  userBalance,
  onCreateBattle,
}) => {
  const [sortText, setSortText] = useState('🔥 激战中');
  const [openCompose, setOpenCompose] = useState(false);
  const [topic, setTopic] = useState('');
  const [red, setRed] = useState('');
  const [blue, setBlue] = useState('');
  const [cat, setCat] = useState('⚽ 世界杯');
  const [pickedAmt, setPickedAmt] = useState(100);
  const [pickedSide, setPickedSide] = useState<BattleSide>('A');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [votesLive, setVotesLive] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ icon: string; text: string } | null>(null);
  const [modal, setModal] = useState<BattleModalState>({
    open: false,
    title: '押注对战',
    redLabel: '正方',
    blueLabel: '反方',
    side: null,
    amount: 100,
  });

  useEffect(() => {
    const id = 'legacy-battle-style';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = '/legacy/style.css';
    document.head.appendChild(link);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const cards = useMemo<CardLite[]>(() => {
    if (battles.length === 0) return FALLBACK_CARDS;
    return battles.slice(0, 6).map((b, i) => {
      const leftPct = 52 + (i % 3) * 6;
      return {
        id: b.id,
        catClass: 'bcat-hot',
        catText: '🔥 今日热点',
        badgeClass: b.status === 'resolved' ? 'bend-badge' : 'bhot-badge',
        badgeText: b.status === 'resolved' ? '⚡ 已结算' : '🔥 激战',
        title: b.topic,
        left: {
          avatar: b.creator.avatar,
          name: b.creator.name,
          streak: b.creator.side === 'A' ? '正方' : '反方',
          coins: `+${Math.floor(b.wager * 1.8)}🪙`,
          argument: b.optionA,
          direction: `🔴 ${b.optionA}`,
          supportText: '支持此方 ⚔️',
        },
        right: {
          avatar: b.challenger?.avatar ?? '❓',
          name: b.challenger?.name ?? '等待接战…',
          streak: b.challenger ? (b.challenger.side === 'A' ? '正方' : '反方') : '反方空缺',
          coins: `+${Math.floor(b.wager * 1.5)}🪙`,
          argument: b.optionB,
          direction: `🔵 ${b.optionB}`,
          supportText: b.challenger ? '支持此方 ⚔️' : '接战',
        },
        oddsLeft: `${(1.6 + i * 0.2).toFixed(1)}×`,
        oddsRight: `${(2.2 + i * 0.25).toFixed(1)}×`,
        leftPct,
        rightPct: 100 - leftPct,
        votes: 6000 + i * 2300,
        pool: `${(b.wager * 42).toLocaleString('zh')}🪙`,
        comments: 20 + i * 8,
        likes: 80 + i * 25,
        shares: 12 + i * 5,
        time: b.status === 'resolved' ? '⏱ 已结算' : '⏱ 进行中',
      };
    });
  }, [battles]);

  useEffect(() => {
    const init: Record<string, number> = {};
    cards.forEach((c) => {
      init[c.id] = votesLive[c.id] ?? c.votes;
    });
    setVotesLive(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setVotesLive((prev) => {
        const next = { ...prev };
        cards.forEach((c) => {
          const curr = next[c.id] ?? c.votes;
          next[c.id] = curr + Math.floor(Math.random() * 3) + 1;
        });
        return next;
      });
    }, 4000);
    return () => window.clearInterval(iv);
  }, [cards]);

  const openBetModal = (title: string, redLabel: string, blueLabel: string) => {
    setModal({ open: true, title, redLabel, blueLabel, side: null, amount: 100 });
  };

  const submitCompose = () => {
    if (!topic.trim() || !red.trim()) {
      setToast({ icon: '⚠️', text: '请先填写话题和正方观点' });
      return;
    }
    onCreateBattle(topic.trim(), red.trim(), (blue || '暂未填写').trim(), pickedSide, pickedAmt);
    setTopic('');
    setRed('');
    setBlue('');
    setOpenCompose(false);
    setToast({ icon: '⚔️', text: '对战话题发布成功！' });
  };

  return (
    <>
      <style>{THEME_OVERRIDES}</style>
      <div id="page-battle">
        <div className="page-hero-battle">
          <div className="phb-label">⚔️ 专题广场</div>
          <div className="phb-title">开<span>战</span>广场</div>
          <div className="phb-sub">发起对决 · 捍卫立场 · 押注赢龟币</div>
          <div className="phb-stats">
            <div className="phb-stat">🔥 今日 {cards.length * 8} 场对战</div>
            <div className="phb-stat">💰 流通 {fmt(cards.reduce((s, c) => s + (votesLive[c.id] ?? c.votes), 0))} 龟币</div>
            <div className="phb-stat">👥 {320 + cards.length * 7} 人在线</div>
            <div className="phb-stat">⚡ {Math.max(2, cards.length)} 场激战中</div>
          </div>
        </div>

        <div className="compose-battle" id="battle-compose-area">
          <div className="cb-header">
            <div className="cb-ava">🦊</div>
            <div className="cb-placeholder" onClick={() => setOpenCompose(true)}>你有什么观点想开战？点击发起一场对决…</div>
            <button className="cb-btn" onClick={() => setOpenCompose(true)}>⚔️ 发起对战</button>
          </div>
          <div className="cb-quick-actions">
            <div className="cqa" onClick={() => setOpenCompose(true)}>⚔️ 对战话题</div>
            <div className="cqa" onClick={() => setToast({ icon: '📊', text: '投票话题创建中！' })}>📊 创建投票</div>
            <div className="cqa" onClick={() => setToast({ icon: '💬', text: '普通帖子创建中！' })}>💬 发帖讨论</div>
            <div className="cqa" onClick={() => setToast({ icon: '🎯', text: '悬赏话题创建中！' })}>🎯 发布悬赏</div>
          </div>

          <div className={`compose-full ${openCompose ? 'open' : ''}`} id="battle-compose-full">
            <div className="cf-body">
              <input className="cf-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="你的话题主张（例：C罗会出战2026世界杯）" />
              <div className="cf-sides">
                <div className="cf-side-inp red-s">
                  <div className="cf-side-label">🔴 正方 / 支持方</div>
                  <textarea className="cf-side-ta" value={red} onChange={(e) => setRed(e.target.value)} placeholder="写出你的理由，说服大家站你这边…" />
                </div>
                <div className="cf-side-inp blue-s">
                  <div className="cf-side-label">🔵 反方 / 对立方</div>
                  <textarea className="cf-side-ta" value={blue} onChange={(e) => setBlue(e.target.value)} placeholder="反方观点（也可留空，等对手接战）…" />
                </div>
              </div>
              <div className="cf-footer">
                <select className="cf-cat-sel" value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option>⚽ 世界杯</option>
                  <option>🔥 今日热点</option>
                  <option>🤖 AI 专题</option>
                  <option>💻 科技</option>
                  <option>🎬 娱乐</option>
                  <option>📈 财经</option>
                </select>
                <button className="cf-cancel" onClick={() => setOpenCompose(false)}>取消</button>
                <button className="cf-post" onClick={submitCompose}>⚔️ 开战！</button>
              </div>
              <div className="cf-footer" style={{ marginTop: 8 }}>
                <div className="bm-amts" style={{ marginBottom: 0 }}>
                  {PRESET_AMTS.map((a) => (
                    <div key={a} className={`bm-amt ${pickedAmt === a ? 'on' : ''}`} onClick={() => setPickedAmt(a)}>{a}</div>
                  ))}
                </div>
                <div className="m-choices" style={{ marginLeft: 'auto' }}>
                  <div className={`m-ch ${pickedSide === 'A' ? 'cy' : ''}`} onClick={() => setPickedSide('A')}>正方</div>
                  <div className={`m-ch ${pickedSide === 'B' ? 'cn' : ''}`} onClick={() => setPickedSide('B')}>反方</div>
                </div>
                <div style={{ color: 'var(--gold)', fontWeight: 700, marginLeft: 10 }}>{userBalance.toLocaleString('zh')} 🪙</div>
              </div>
            </div>
          </div>
        </div>

        <div className="battle-sort">
          {['🔥 激战中', '⚡ 最新', '🏆 赔率最高', '💰 资金最多', '⏱ 快结束'].map((t) => (
            <div key={t} className={`bst ${sortText === t ? 'on' : ''}`} onClick={() => setSortText(t)}>{t}</div>
          ))}
          <div className="bsort-sep" />
          {['⚽ 世界杯', '🤖 AI', '📈 财经', '🎬 娱乐'].map((t) => (
            <div key={t} className={`bst ${sortText === t ? 'on' : ''}`} onClick={() => setSortText(t)}>{t}</div>
          ))}
        </div>

        <div className="challenge-card">
          <div className="cc-icon">🎯</div>
          <div className="cc-info">
            <div className="cc-title">LionMaster 向你发出挑战！</div>
            <div className="cc-sub">话题：「巴西 vs 法国 —— 本届世界杯真正的统治者是谁？」押注 500 🪙</div>
          </div>
          <div className="cc-btn" onClick={() => setToast({ icon: '⚡', text: '挑战已接受（演示）' })}>接受挑战 ⚡</div>
        </div>

        {cards.map((c) => {
          const isOpen = !!openComments[c.id];
          const likeNum = likes[c.id] ?? c.likes;
          const isLiked = !!liked[c.id];
          return (
            <React.Fragment key={c.id}>
              <div className={`battle-card ${c.id === 'bbc1' ? 'pinned' : ''}`} id={c.id}>
                <div className="bc-top">
                  <div className={`bc-cat ${c.catClass}`}>{c.catText}</div>
                  <div className="bc-q">{c.title}</div>
                  <div className={`bc-badge ${c.badgeClass}`}>{c.badgeText}</div>
                </div>
                <div className="versus-area">
                  <div className="vs-side vs-r" onClick={() => openBetModal(c.title, c.left.direction.replace('🔴 ', ''), c.right.direction.replace('🔵 ', ''))}>
                    <div className="vs-side-header">
                      <div className="vs-ava">{c.left.avatar}</div>
                      <div className="vs-user-info">
                        <div className="vs-name">{c.left.name}</div>
                        <div className="vs-streak">{c.left.streak}</div>
                      </div>
                      <div className="vs-coins-badge">{c.left.coins}</div>
                    </div>
                    <div className="vs-argument">{c.left.argument}</div>
                    <div className="vs-bet-row">
                      <div className="vs-direction dir-r">{c.left.direction}</div>
                      <button
                        className="vs-support-btn sup-r"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBetModal(c.title, c.left.direction.replace('🔴 ', ''), c.right.direction.replace('🔵 ', ''));
                        }}
                      >
                        {c.left.supportText}
                      </button>
                    </div>
                  </div>
                  <div className="vs-mid">
                    <div className="vs-label">VS</div>
                    <div className="vs-odds-pair"><div className="vs-odd odd-r">{c.oddsLeft}</div><div className="vs-odd odd-b">{c.oddsRight}</div></div>
                  </div>
                  <div className="vs-side vs-b" onClick={() => openBetModal(c.title, c.left.direction.replace('🔴 ', ''), c.right.direction.replace('🔵 ', ''))}>
                    <div className="vs-side-header">
                      <div className="vs-ava">{c.right.avatar}</div>
                      <div className="vs-user-info">
                        <div className="vs-name">{c.right.name}</div>
                        <div className="vs-streak">{c.right.streak}</div>
                      </div>
                      <div className="vs-coins-badge">{c.right.coins}</div>
                    </div>
                    <div className="vs-argument">{c.right.argument}</div>
                    <div className="vs-bet-row">
                      <div className="vs-direction dir-b">{c.right.direction}</div>
                      <button
                        className="vs-support-btn sup-b"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBetModal(c.title, c.left.direction.replace('🔴 ', ''), c.right.direction.replace('🔵 ', ''));
                        }}
                      >
                        {c.right.supportText}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="vote-meter-wrap">
                  <div className="vm-bar">
                    <div className="vm-fill-r" style={{ width: `${c.leftPct}%` }} />
                    <div className="vm-fill-b" style={{ width: `${c.rightPct}%` }} />
                  </div>
                  <div className="vm-row">
                    <div className="vm-r-pct">🔴 {c.leftPct}%</div>
                    <div className="vm-meta">{fmt(votesLive[c.id] ?? c.votes)} 人参与 · 流通 <span style={{ color: '#ffc94d' }}>{c.pool}</span></div>
                    <div className="vm-b-pct">{c.rightPct}% 🔵</div>
                  </div>
                </div>
                <div className="bc-foot">
                  <div className="bc-foot-btn" onClick={() => setOpenComments((s) => ({ ...s, [c.id]: !s[c.id] }))}>💬 <span>{c.comments}</span> 评论</div>
                  <div
                    className={`bc-foot-btn ${isLiked ? 'liked' : ''}`}
                    onClick={() => {
                      setLiked((s) => ({ ...s, [c.id]: !isLiked }));
                      setLikes((s) => ({ ...s, [c.id]: isLiked ? likeNum - 1 : likeNum + 1 }));
                    }}
                  >
                    {isLiked ? '❤️' : '🤍'} <span>{likeNum}</span>
                  </div>
                  <div className="bc-foot-btn" onClick={() => setToast({ icon: '🔁', text: '转发成功！' })}>🔁 <span>{c.shares}</span></div>
                  <div className="bc-foot-btn" onClick={() => setToast({ icon: '⚔️', text: '约战功能即将开放！' })}>⚔️ 约战</div>
                  <div className="bc-time">{c.time}</div>
                </div>
              </div>

              <div className={`battle-cmt-thread ${isOpen ? 'open' : ''}`}>
                <div className="bct-inner">
                  <div className="bcmt">
                    <div className="bcmt-ava">🦅</div>
                    <div className="bcmt-body">
                      <div className="bcmt-head"><div className="bcmt-name">EagleEye</div><div className="bcmt-side bside-r">正方</div><div className="bcmt-time">23min</div></div>
                      <div className="bcmt-text">这场对决信息量很大，赔率和舆论都在快速变化。</div>
                      <div className="bcmt-acts"><span className="bca blike-r">❤️ 28</span></div>
                    </div>
                  </div>
                  <div className="badd-cmt">
                    <div className="badd-cmt-ava">🦊</div>
                    <input className="badd-cmt-inp" placeholder="发表你的分析…" onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setToast({ icon: '💬', text: '评论发布成功！' });
                        (e.currentTarget as HTMLInputElement).value = '';
                      }
                    }} />
                    <button className="badd-cmt-send" onClick={() => setToast({ icon: '💬', text: '评论发送成功！' })}>↑</button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {modal.open && (
        <div className="battle-overlay show" onClick={() => setModal((s) => ({ ...s, open: false }))}>
          <div className="battle-modal" onClick={(e) => e.stopPropagation()}>
            <span className="bm-close" onClick={() => setModal((s) => ({ ...s, open: false }))}>✕</span>
            <div className="bm-title" id="bm-title">{modal.title}</div>
            <div className="bm-sub">选择你支持的一方，押注龟币赢取赔率奖励</div>
            <div className="bm-label">选择立场</div>
            <div className="bm-sides">
              <div className={`bm-side ${modal.side === 'red' ? 'red-sel' : ''}`} onClick={() => setModal((s) => ({ ...s, side: 'red' }))}>
                <div className="bm-side-ico">🔴</div>
                <div className="bm-side-lbl">{modal.redLabel}</div>
                <div className="bm-side-sub">赔率 3.8×</div>
              </div>
              <div className={`bm-side ${modal.side === 'blue' ? 'blue-sel' : ''}`} onClick={() => setModal((s) => ({ ...s, side: 'blue' }))}>
                <div className="bm-side-ico">🔵</div>
                <div className="bm-side-lbl">{modal.blueLabel}</div>
                <div className="bm-side-sub">赔率 4.5×</div>
              </div>
            </div>
            <div className="bm-label">押注金额 <span style={{ color: '#6b6760', fontWeight: 400 }}>（余额 {userBalance.toLocaleString('zh')} 🪙）</span></div>
            <div className="bm-amts">
              {PRESET_AMTS.map((amt) => (
                <div key={amt} className={`bm-amt ${modal.amount === amt ? 'on' : ''}`} onClick={() => setModal((s) => ({ ...s, amount: amt }))}>{amt}</div>
              ))}
            </div>
            <button
              className="bm-cta"
              onClick={() => {
                if (!modal.side) {
                  setToast({ icon: '⚠️', text: '请先选择立场！' });
                  return;
                }
                setModal((s) => ({ ...s, open: false }));
                const side = modal.side === 'red' ? modal.redLabel : modal.blueLabel;
                setToast({ icon: '🎉', text: `押注成功！${modal.amount} 🪙 押「${side}」` });
              }}
            >
              ⚔️ 确认押注 {modal.amount} 龟币
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast show" id="tst"><span>{toast.icon}</span><span>{toast.text}</span></div>
      )}
    </>
  );
};
