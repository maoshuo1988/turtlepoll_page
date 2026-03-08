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
  --red:#ef4444; --red-dim:rgba(239,68,68,.12); --red-glow:rgba(239,68,68,.26);
  --blue:#3b82f6; --blue-dim:rgba(59,130,246,.12); --blue-glow:rgba(59,130,246,.26);
  --gold:#eab308; --gold-dim:rgba(234,179,8,.12);
  --surface:#f8fbff; --surface2:#eef5ff; --surface3:#e7effa;
  --ink:#10243e; --muted:#5e738f;
  --border:rgba(16,36,62,.12); --border2:rgba(16,36,62,.24);
  background:radial-gradient(circle at 20% -20%, rgba(59,130,246,.18), transparent 45%), #eef4ff;
}
html.dark #page-battle{
  --red:#ff4d5f; --red-dim:rgba(255,77,95,.12); --red-glow:rgba(255,77,95,.32);
  --blue:#3b8dff; --blue-dim:rgba(59,141,255,.13); --blue-glow:rgba(59,141,255,.32);
  --gold:#f7ca56; --gold-dim:rgba(247,202,86,.12);
  --surface:#08152c; --surface2:#0a1a34; --surface3:#0e2244;
  --ink:#e8f3ff; --muted:#8da4c4;
  --border:rgba(73,146,255,.28); --border2:rgba(73,146,255,.45);
  background:radial-gradient(circle at 18% -24%, rgba(59,141,255,.18), transparent 45%), #071225;
}
#page-battle{
  position:relative;
  padding:12px;
  color:var(--ink);
  background:var(--surface);
}
#page-battle *{box-sizing:border-box}
#page-battle::before{
  content:"";
  position:absolute; inset:0;
  pointer-events:none;
  background:
    linear-gradient(90deg, rgba(99,102,241,.04), transparent 18%, transparent 82%, rgba(236,72,153,.04)),
    repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.02) 3px 4px);
}
.page-hero-battle{
  position:relative;
  border:1px solid var(--border2);
  border-radius:14px;
  padding:18px 24px 20px;
  background:linear-gradient(180deg, rgba(8,24,50,.88), rgba(8,18,38,.88));
  box-shadow:inset 0 0 0 1px rgba(59,141,255,.15), 0 0 24px rgba(59,141,255,.12);
}
.phb-label{font-size:14px;color:var(--muted);font-weight:700}
.phb-title{margin-top:4px;font-size:44px;line-height:1;font-weight:900;letter-spacing:.02em}
.phb-title span{color:#41e2cb}
.phb-sub{margin-top:8px;color:var(--muted);font-size:16px}
.phb-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.phb-stat{
  border:1px solid var(--border);
  background:rgba(255,255,255,.06);
  color:#dce9ff;
  border-radius:999px;
  padding:6px 12px;
  font-size:18px;font-weight:700;
}
.compose-battle,.battle-sort,.challenge-card,.battle-card{
  margin-top:12px;
  border:1px solid var(--border2);
  border-radius:14px;
  background:linear-gradient(180deg, rgba(10,26,52,.9), rgba(9,19,39,.9));
  box-shadow:inset 0 0 0 1px rgba(59,141,255,.12);
}
.cb-header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)}
.cb-ava{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#f97316;font-size:22px}
.cb-placeholder{flex:1;color:var(--muted);font-size:22px;cursor:pointer}
.cb-btn{
  border:0;border-radius:12px;padding:10px 18px;cursor:pointer;
  background:#ff4d5f;color:#fff;font-weight:800;font-size:18px;
}
.cb-quick-actions{display:flex;gap:18px;align-items:center;padding:10px 16px}
.cqa{font-size:17px;color:var(--muted);cursor:pointer}
.compose-full{display:none;padding:14px 16px;border-top:1px solid var(--border)}
.compose-full.open{display:block}
.cf-input,.cf-cat-sel,.cf-side-ta,.badd-cmt-inp{
  width:100%; border:1px solid var(--border); border-radius:10px; background:var(--surface3); color:var(--ink);
}
.cf-input{height:42px;padding:0 12px;font-size:16px}
.cf-sides{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.cf-side-inp{border:1px solid var(--border);border-radius:12px;padding:10px;background:rgba(255,255,255,.04)}
.cf-side-label{font-size:14px;font-weight:700;margin-bottom:6px;color:#dce9ff}
.cf-side-ta{min-height:92px;padding:10px;resize:vertical;font-size:14px}
.cf-footer{display:flex;align-items:center;gap:8px;margin-top:10px}
.cf-cat-sel{height:36px;padding:0 8px;width:180px}
.cf-cancel,.cf-post{
  border:0;border-radius:10px;height:36px;padding:0 12px;font-weight:700;cursor:pointer
}
.cf-cancel{background:rgba(255,255,255,.08);color:#dbeafe}
.cf-post{background:#22c55e;color:#082018}
.bm-amts{display:flex;gap:6px}
.bm-amt{min-width:48px;height:30px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--border);cursor:pointer;color:var(--muted)}
.bm-amt.on{background:var(--blue-dim);color:#cfe4ff;border-color:var(--blue)}
.m-choices{display:flex;gap:6px}
.m-ch{padding:6px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--muted)}
.m-ch.cy{background:var(--red-dim);border-color:var(--red);color:#ffd7dc}
.m-ch.cn{background:var(--blue-dim);border-color:var(--blue);color:#cfe4ff}
.battle-sort{display:flex;gap:8px;align-items:center;padding:8px 10px;flex-wrap:wrap}
.bst{padding:8px 12px;border-radius:10px;color:var(--muted);font-size:16px;font-weight:700;cursor:pointer}
.bst.on{background:rgba(255,255,255,.08);color:#fff;border:1px solid var(--border)}
.bsort-sep{width:1px;height:24px;background:var(--border);margin:0 4px}
.challenge-card{display:flex;align-items:center;gap:12px;padding:14px 16px}
.cc-icon{font-size:30px}
.cc-info{flex:1}
.cc-title{font-size:30px;font-weight:900;color:#f2f8ff}
.cc-sub{font-size:18px;color:var(--muted);margin-top:4px}
.cc-btn{
  border:0;border-radius:12px;padding:10px 18px;background:linear-gradient(135deg,#ffe07a,#f4be3f);
  color:#2b1e00;font-weight:800;font-size:18px;cursor:pointer
}
.battle-card{overflow:hidden}
.bc-top{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border)}
.bc-cat,.bc-badge{padding:4px 10px;border-radius:999px;font-size:14px;font-weight:800}
.bc-cat{background:rgba(239,68,68,.18);color:#ffb4be}
.bc-badge{margin-left:auto;background:rgba(255,77,95,.2);color:#ffb4be}
.bc-q{font-size:33px;font-weight:900;color:#eef5ff}
.versus-area{display:grid;grid-template-columns:1fr 64px 1fr;align-items:stretch}
.vs-side{padding:14px;cursor:pointer}
.vs-r{border-right:1px solid var(--border)}
.vs-b{border-left:1px solid var(--border)}
.vs-side-header{display:flex;align-items:center;gap:10px}
.vs-ava{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);font-size:20px}
.vs-name{font-size:30px;font-weight:900;color:#eef5ff}
.vs-streak{font-size:16px;color:var(--muted)}
.vs-coins-badge{margin-left:auto;font-size:16px;font-weight:800;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.07)}
.vs-argument{font-size:32px;color:#f4f8ff;margin:12px 0 10px}
.vs-bet-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.vs-direction{font-size:30px;font-weight:900}
.dir-r{color:#ff5d72}.dir-b{color:#4aa1ff}
.vs-support-btn{border:1px solid;border-radius:10px;padding:8px 12px;font-size:18px;font-weight:800;background:transparent;cursor:pointer}
.sup-r{border-color:rgba(255,93,114,.35);color:#ff7d8d}
.sup-b{border-color:rgba(74,161,255,.35);color:#6bb4ff}
.vs-mid{display:grid;place-items:center;background:rgba(0,0,0,.18);border-left:1px solid var(--border);border-right:1px solid var(--border)}
.vs-label{font-size:42px;font-weight:900;color:#fff;line-height:1}
.vs-odds-pair{display:grid;gap:6px;margin-top:6px}
.vs-odd{border-radius:8px;padding:4px 8px;font-size:16px;font-weight:800;text-align:center}
.odd-r{background:var(--red-dim);color:#ff8a9a}.odd-b{background:var(--blue-dim);color:#7fc0ff}
.vote-meter-wrap{padding:10px 14px;border-top:1px solid var(--border)}
.vm-bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06)}
.vm-fill-r{background:#ff4d5f}.vm-fill-b{background:#3b8dff}
.vm-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.vm-r-pct,.vm-b-pct{font-size:26px;font-weight:900}
.vm-r-pct{color:#ff5d72}.vm-b-pct{color:#4aa1ff}
.vm-meta{font-size:17px;color:var(--muted)}
.bc-foot{display:flex;align-items:center;gap:16px;padding:10px 14px;border-top:1px solid var(--border)}
.bc-foot-btn{font-size:16px;color:var(--muted);cursor:pointer}
.bc-foot-btn.liked{color:#ff8ca1}
.bc-time{margin-left:auto;font-size:14px;color:var(--muted)}
.battle-cmt-thread{max-height:0;overflow:hidden;transition:max-height .25s ease}
.battle-cmt-thread.open{max-height:200px}
.bct-inner{padding:8px 14px;border:1px solid var(--border);border-top:0;border-radius:0 0 12px 12px;background:var(--surface2)}
.bcmt{display:flex;gap:10px}
.bcmt-ava{font-size:24px}
.bcmt-head{display:flex;gap:8px;align-items:center}
.bcmt-name{font-weight:800}
.bcmt-side{font-size:12px;padding:2px 8px;border-radius:999px}
.bside-r{background:var(--red-dim);color:#ff7588}
.bcmt-time{font-size:12px;color:var(--muted)}
.bcmt-text{margin-top:4px;color:var(--ink)}
.bcmt-acts{margin-top:4px;color:var(--muted);font-size:14px}
.badd-cmt{display:flex;gap:8px;align-items:center;margin-top:8px}
.badd-cmt-ava{font-size:20px}
.badd-cmt-inp{height:34px;padding:0 10px}
.badd-cmt-send{height:34px;width:34px;border:0;border-radius:10px;background:#3b8dff;color:#fff;cursor:pointer}
.battle-overlay{position:fixed;inset:0;background:rgba(2,8,20,.58);display:grid;place-items:center;z-index:60}
.battle-modal{
  width:min(560px,92vw);border-radius:16px;border:1px solid var(--border2);background:var(--surface);
  box-shadow:0 20px 80px rgba(2,8,20,.45);padding:18px;position:relative
}
.bm-close{position:absolute;right:12px;top:10px;cursor:pointer;color:var(--muted)}
.bm-title{font-size:24px;font-weight:900}
.bm-sub{margin-top:4px;color:var(--muted);font-size:14px}
.bm-label{margin-top:12px;margin-bottom:6px;font-size:14px;font-weight:700}
.bm-sides{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.bm-side{border:1px solid var(--border);border-radius:12px;padding:10px;cursor:pointer}
.bm-side-ico{font-size:20px}.bm-side-lbl{font-size:16px;font-weight:800}.bm-side-sub{font-size:13px;color:var(--muted)}
.bm-side.red-sel{border-color:var(--red);background:var(--red-dim)}
.bm-side.blue-sel{border-color:var(--blue);background:var(--blue-dim)}
.bm-cta{margin-top:14px;width:100%;height:42px;border:0;border-radius:12px;background:#22c55e;color:#06270f;font-weight:900;cursor:pointer}
.toast{position:fixed;left:50%;top:74px;transform:translateX(-50%);padding:10px 14px;border-radius:10px;background:rgba(5,16,32,.92);border:1px solid var(--border2);display:flex;gap:8px;z-index:80;color:#eef6ff}
@media (max-width: 980px){
  .phb-title{font-size:34px}
  .phb-sub{font-size:14px}
  .phb-stat{font-size:13px}
  .cb-placeholder{font-size:14px}
  .cb-btn,.cc-btn{font-size:14px}
  .battle-sort{gap:4px}
  .bst{font-size:13px;padding:6px 9px}
  .cc-title{font-size:18px}
  .cc-sub{font-size:12px}
  .bc-q{font-size:20px}
  .versus-area{grid-template-columns:1fr}
  .vs-mid{display:none}
  .vs-name{font-size:20px}
  .vs-argument{font-size:18px}
  .vs-direction{font-size:16px}
  .vm-r-pct,.vm-b-pct{font-size:16px}
  .vm-meta{font-size:12px}
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
