/** 文件说明：世界杯专题页面，体育转播 HUD 风格 —— 预测板、暗盘赛程、最新消息等。 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Coins,
  Crosshair,
  Flame,
  Goal,
  Hash,
  MessageCircleMore,
  Mic2,
  Newspaper,
  Radio,
  Send,
  Sparkles,
  Swords,
  ThumbsUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { PredictionBetModal } from '@/pages/home/components/PredictionBetModal';
import type { PredictionCardItem } from '@/pages/home/components/predictionCards';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { useRequestFootballMarketsByTag } from '@/hooks/usePredictionRequests';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useHomeLayoutContext } from '@/layouts/context';
import { WorldCupCardPitchTexture, WorldCupPitchBackdropLayers } from './WorldCupPitchBackdrop';

type FixtureOdds = {
  home: number;
  draw: number;
  away: number;
};

type Fixture = {
  id: string;
  time: string;
  stage: string;
  home: string;
  homeFlag: string;
  away: string;
  awayFlag: string;
  odds: FixtureOdds;
  pool: string;
  heat: number;
  signal: string;
  signalTone: 'gold' | 'rose' | 'sky';
  predictionItem?: PredictionCardItem;
};

type FeaturedMarket = {
  title: string;
  tag: string;
  sideA: { label: string; accent: string; pct: number };
  sideB: { label: string; accent: string; pct: number };
  heat: string;
  pool: string;
  predictionItem?: PredictionCardItem;
};

const fallbackFeaturedMarkets: FeaturedMarket[] = [
  {
    title: '谁会捧起大力神杯？',
    tag: '冠军归属',
    sideA: { label: '巴西', accent: '南美桑巴', pct: 42 },
    sideB: { label: '法国', accent: '欧洲铁卫', pct: 35 },
    heat: '18.6w',
    pool: '128.4k',
  },
  {
    title: '决赛会不会进入加时？',
    tag: '决赛剧本',
    sideA: { label: '90 分钟见胜负', accent: '常规时间', pct: 61 },
    sideB: { label: '加时或点球', accent: '剧本拉满', pct: 39 },
    heat: '9.8w',
    pool: '64.8k',
  },
  {
    title: '金靴属于谁的锋线？',
    tag: '球员荣誉',
    sideA: { label: '南美前锋', accent: '维尼修斯 / 内马尔', pct: 48 },
    sideB: { label: '欧洲前锋', accent: '哈兰德 / 姆巴佩', pct: 52 },
    heat: '12.4w',
    pool: '88.1k',
  },
];

const fallbackTodayFixtures: Fixture[] = [
  {
    id: 'arg-mar',
    time: '今晚 22:00',
    stage: '小组赛 · A 组',
    home: '阿根廷',
    homeFlag: '🇦🇷',
    away: '摩洛哥',
    awayFlag: '🇲🇦',
    odds: { home: 1.62, draw: 3.8, away: 5.2 },
    pool: '46.2k',
    heat: 92,
    signal: '临场热盘 · 资金涌入',
    signalTone: 'gold',
  },
  {
    id: 'eng-jpn',
    time: '明天 02:00',
    stage: '小组赛 · B 组',
    home: '英格兰',
    homeFlag: '🏴',
    away: '日本',
    awayFlag: '🇯🇵',
    odds: { home: 1.85, draw: 3.5, away: 4.1 },
    pool: '32.8k',
    heat: 74,
    signal: '进球数分歧 · 大小球热',
    signalTone: 'sky',
  },
  {
    id: 'ger-por',
    time: '周日 23:00',
    stage: '淘汰赛 · 1/8',
    home: '德国',
    homeFlag: '🇩🇪',
    away: '葡萄牙',
    awayFlag: '🇵🇹',
    odds: { home: 2.4, draw: 3.1, away: 2.85 },
    pool: '58.6k',
    heat: 88,
    signal: '胜负拉扯 · 押宝分散',
    signalTone: 'rose',
  },
  {
    id: 'bra-cro',
    time: '周一 04:00',
    stage: '淘汰赛 · 1/8',
    home: '巴西',
    homeFlag: '🇧🇷',
    away: '克罗地亚',
    awayFlag: '🇭🇷',
    odds: { home: 1.55, draw: 3.9, away: 6.0 },
    pool: '41.0k',
    heat: 81,
    signal: '南美桑巴起势',
    signalTone: 'gold',
  },
  {
    id: 'fra-pol',
    time: '周一 23:00',
    stage: '淘汰赛 · 1/8',
    home: '法国',
    homeFlag: '🇫🇷',
    away: '波兰',
    awayFlag: '🇵🇱',
    odds: { home: 1.42, draw: 4.2, away: 7.5 },
    pool: '37.3k',
    heat: 69,
    signal: '冷门窗口 · 波兰看客',
    signalTone: 'sky',
  },
];

/** 侧栏「开撕台」展示开关（暂时关闭，改为 true 可恢复）。 */
const SHOW_WORLD_CUP_DEBATE_STAGE = false;

const debates = [
  {
    title: '梅西还是 C 罗，才是这个时代真正的 GOAT？',
    sideA: { label: '#7 梅西', pct: 54 },
    sideB: { label: '#7 C 罗', pct: 46 },
    heat: '23.4w',
    quote: '“梅西捧起大力神杯那一刻，这场争论已经写下注脚。”',
    spice: '🔥🔥🔥🔥',
  },
  {
    title: '哈兰德能复制英超效率到世界杯吗？',
    sideA: { label: '炸裂派', pct: 41 },
    sideB: { label: '挪威无缘', pct: 59 },
    heat: '11.8w',
    quote: '“没有大赛舞台，再多进球也只是英超 KPI。”',
    spice: '🔥🔥🔥',
  },
  {
    title: '皇马与巴萨，谁才是西班牙国家队真正的支柱？',
    sideA: { label: '皇马帮', pct: 58 },
    sideB: { label: '巴萨帮', pct: 42 },
    heat: '8.6w',
    quote: '“看看大名单里皇马的人数就懂了。”',
    spice: '🔥🔥',
  },
];

type NewsCategory = 'breaking' | 'official' | 'insider' | 'rumor';

type NewsComment = {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
};

type NewsItem = {
  id: string;
  source: string;
  sourceAvatar: string;
  time: string;
  category: NewsCategory;
  categoryLabel: string;
  headline: string;
  body: string;
  likes: number;
  comments: NewsComment[];
};

const newsCategoryStyle: Record<NewsCategory, string> = {
  breaking: 'border-rose-400/45 bg-rose-400/15 text-rose-300',
  official: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
  insider: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  rumor: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
};

const newsItems: NewsItem[] = [
  {
    id: 'n-fifa-tickets',
    source: 'FIFA 官方',
    sourceAvatar: '🏆',
    time: '5 分钟前',
    category: 'breaking',
    categoryLabel: '突发',
    headline: '决赛门票第二轮抽签明晚开启',
    body: '10 万张门票将在明日 20:00 通过官方平台开放抽签，注册用户均可参与。系统在峰值时段开启排队机制。',
    likes: 528,
    comments: [
      { id: 'c1', user: '老李在球场', avatar: '🐢', text: '终于等到了！这次必须抽到 🙏', time: '2 分钟前' },
      { id: 'c2', user: '阿根廷之眼', avatar: '🇦🇷', text: '希望别再卡服务器了，上次直接 502', time: '4 分钟前' },
    ],
  },
  {
    id: 'n-arg-lineup',
    source: '阿根廷国家队',
    sourceAvatar: '🇦🇷',
    time: '23 分钟前',
    category: 'official',
    categoryLabel: '官方公告',
    headline: '梅西今晚出战摩洛哥，担任队长',
    body: '官方公告确认梅西完全康复，将作为队长率领阿根廷出战 22:00 的小组赛。位置：前腰。',
    likes: 1283,
    comments: [
      { id: 'c1', user: '桑巴鼓手', avatar: '🥁', text: '老梅状态我看好', time: '15 分钟前' },
    ],
  },
  {
    id: 'n-c7-talk',
    source: '球场记者老李',
    sourceAvatar: '📡',
    time: '1 小时前',
    category: 'insider',
    categoryLabel: '内部消息',
    headline: 'C 罗与教练长谈 20 分钟争取首发',
    body: '葡萄牙更衣室外目击 C 罗与主教练长谈 20 分钟，疑似争取首发位置。今晚淘汰赛主帅决定将公开。',
    likes: 488,
    comments: [
      { id: 'c1', user: '葡萄牙球迷会', avatar: '⚽', text: '哥，再苟一波', time: '40 分钟前' },
      { id: 'c2', user: '葡式蛋挞', avatar: '🍮', text: 'CR7 永远滴神', time: '50 分钟前' },
    ],
  },
  {
    id: 'n-bra-injury',
    source: '南美深喉',
    sourceAvatar: '🛰️',
    time: '2 小时前',
    category: 'rumor',
    categoryLabel: '传闻',
    headline: '巴西后防疑似有伤情未公开',
    body: '消息源称巴西首发名单中的某位中卫存在轻微伤情，是否上场尚未确定。押南美桑巴看小心点。',
    likes: 261,
    comments: [
      { id: 'c1', user: '黑马观察员', avatar: '🐎', text: '建议押克罗地亚冷门', time: '1 小时前' },
    ],
  },
];

const danmakuMessages = [
  { user: '🐢老李', text: '梅西今晚必入！押阿根廷' },
  { user: '⚽小张', text: 'C罗求首发，葡萄牙必赢' },
  { user: '📡深喉', text: '英格兰大热必死 笑死' },
  { user: '🍻掌柜', text: '葡萄牙 yyds 上线' },
  { user: '🔥火球', text: '摩洛哥赔率28 起飞！' },
  { user: '💸老王', text: '巴西稳了 满仓押' },
  { user: '🚀阿杰', text: '德国今晚怕是要爆冷' },
  { user: '🎯狙击手', text: '荷兰大小球分歧大' },
  { user: '🍀彩民', text: '法国稳如老狗' },
  { user: '👀线人', text: '阿根廷训练加练任意球' },
  { user: '🥁桑巴', text: '维尼修斯今天发挥神了' },
  { user: '🎩西装', text: '哈兰德进不了大赛真可惜' },
];

const mapHotspots: { name: string; x: number; y: number; top?: boolean }[] = [
  { name: '巴西', x: 108, y: 125, top: true },
  { name: '法国', x: 198, y: 42 },
  { name: '阿根廷', x: 105, y: 148 },
  { name: '西班牙', x: 185, y: 50 },
  { name: '英格兰', x: 188, y: 32 },
  { name: '德国', x: 208, y: 38 },
  { name: '葡萄牙', x: 180, y: 52 },
  { name: '荷兰', x: 200, y: 35 },
  { name: '比利时', x: 198, y: 40 },
  { name: '摩洛哥', x: 188, y: 72 },
];

const continentPaths = [
  'M30 30 L70 22 L110 28 L125 50 L115 72 L90 82 L60 80 L35 65 L28 50 Z',
  'M95 85 L115 82 L122 92 L110 95 Z',
  'M102 95 L122 95 L135 110 L130 138 L110 152 L95 155 L82 130 L88 105 Z',
  'M145 18 L162 18 L165 32 L148 36 Z',
  'M178 28 L220 26 L230 44 L218 60 L192 65 L178 50 Z',
  'M192 70 L240 68 L252 96 L245 130 L222 148 L200 145 L188 120 L185 90 Z',
  'M232 25 L320 22 L358 42 L365 64 L340 80 L308 85 L278 75 L248 60 L232 45 Z',
  'M270 85 L295 83 L293 110 L280 108 Z',
  'M312 95 L332 96 L332 105 L312 105 Z',
  'M320 122 L365 120 L360 145 L326 147 Z',
  'M358 50 L368 48 L365 65 L357 63 Z',
];

type Trend = 'up' | 'down' | 'flat';

const championshipOdds: {
  rank: number;
  flag: string;
  team: string;
  odds: number;
  trend: Trend;
  delta: string;
}[] = [
  { rank: 1, flag: '🇧🇷', team: '巴西', odds: 4.2, trend: 'up', delta: '+0.3' },
  { rank: 2, flag: '🇫🇷', team: '法国', odds: 5.0, trend: 'down', delta: '-0.2' },
  { rank: 3, flag: '🇦🇷', team: '阿根廷', odds: 5.5, trend: 'up', delta: '+0.1' },
  { rank: 4, flag: '🇪🇸', team: '西班牙', odds: 7.0, trend: 'flat', delta: '0' },
  { rank: 5, flag: '🏴', team: '英格兰', odds: 8.0, trend: 'up', delta: '+0.5' },
  { rank: 6, flag: '🇩🇪', team: '德国', odds: 10, trend: 'down', delta: '-1.0' },
  { rank: 7, flag: '🇵🇹', team: '葡萄牙', odds: 12, trend: 'flat', delta: '0' },
  { rank: 8, flag: '🇳🇱', team: '荷兰', odds: 14, trend: 'up', delta: '+1.0' },
  { rank: 9, flag: '🇧🇪', team: '比利时', odds: 18, trend: 'down', delta: '-2.0' },
  { rank: 10, flag: '🇲🇦', team: '摩洛哥', odds: 28, trend: 'up', delta: '+3.5' },
];

const signalToneMap = {
  gold: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/35',
  rose: 'text-rose-300 bg-rose-500/10 border-rose-500/35',
  sky: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/35',
} as const;

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function formatCompact(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function formatFixtureTime(value?: number) {
  if (!value) return '待定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '待定';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const dayLabel = isToday ? '今天' : isTomorrow ? '明天' : `${date.getMonth() + 1}/${date.getDate()}`;
  return `${dayLabel} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function calcMarketOdds(item: FootballMarketAggregate) {
  const context = item.context ?? {};
  const votesA = asNumber(context.proVoteCount);
  const votesB = asNumber(context.conVoteCount);
  const poolA = asNumber(item.market.poolA, votesA);
  const poolB = asNumber(item.market.poolB, votesB);
  const baseA = asNumber(item.market.baseA, 500);
  const baseB = asNumber(item.market.baseB, 500);
  const effectiveA = Math.max(1, baseA + poolA);
  const effectiveB = Math.max(1, baseB + poolB);
  const total = effectiveA + effectiveB;

  return {
    oddsA: Number((Math.max(1.2, Math.min(5, total / effectiveA))).toFixed(2)),
    oddsB: Number((Math.max(1.2, Math.min(5, total / effectiveB))).toFixed(2)),
    poolA,
    poolB,
    votesA,
    votesB,
  };
}

function mapFootballMarketToPredictionItem(item: FootballMarketAggregate): PredictionCardItem {
  const context = item.context ?? {};
  const { oddsA, oddsB, votesA, votesB } = calcMarketOdds(item);

  return {
    id: `market-${item.market.id}`,
    marketId: item.market.id,
    title: context.eventName || item.market.title || `世界杯暗盘 #${item.market.id}`,
    summary: context.detail || item.market.title || '查看当前世界杯暗盘双方观点与资金热度。',
    image: context.imageUrl || 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
    votes: { A: votesA, B: votesB },
    optionA: context.proText || '支持',
    optionB: context.conText || '反对',
    oddsA,
    oddsB,
    status:
      item.market.status === 'OPEN'
        ? 'open'
        : item.market.status === 'SETTLED'
          ? 'settled'
          : 'closed',
    hasBet: item.hasBet ?? false,
    betSettleResult: item.betSettleResult,
    closeTime: item.market.closeTime,
  };
}

function mapFootballMarketToFeatured(item: FootballMarketAggregate): FeaturedMarket {
  const context = item.context ?? {};
  const { poolA, poolB, votesA, votesB } = calcMarketOdds(item);
  const totalVotes = Math.max(1, votesA + votesB);
  const pctA = Math.round((votesA / totalVotes) * 100);
  const tags = (context.tags || 'football').split(',').map((tag) => tag.trim()).filter(Boolean);
  const predictionItem = mapFootballMarketToPredictionItem(item);

  return {
    title: predictionItem.title,
    tag: tags[0] || 'football',
    sideA: {
      label: context.proText || '支持',
      accent: '正方热区',
      pct: pctA,
    },
    sideB: {
      label: context.conText || '反对',
      accent: '反方热区',
      pct: 100 - pctA,
    },
    heat: formatCompact(asNumber(context.heat, votesA + votesB)),
    pool: formatCompact(poolA + poolB),
    predictionItem,
  };
}

function mapFootballMarketToFixture(item: FootballMarketAggregate, index: number): Fixture {
  const context = item.context ?? {};
  const { oddsA, oddsB, poolA, poolB, votesA, votesB } = calcMarketOdds(item);
  const heat = Math.min(99, Math.max(18, Math.round(asNumber(context.heat, votesA + votesB) / 1000)));
  const title = context.eventName || item.market.title || `世界杯暗盘 #${item.market.id}`;
  const predictionItem = mapFootballMarketToPredictionItem(item);

  return {
    id: String(item.market.id),
    time: formatFixtureTime(item.market.closeTime),
    stage: (context.tags || 'football').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 2).join(' · ') || '世界杯暗盘',
    home: context.proText || '支持',
    homeFlag: index % 2 === 0 ? '⚽' : '🏟️',
    away: context.conText || '反对',
    awayFlag: index % 2 === 0 ? '🏆' : '🥅',
    odds: {
      home: oddsA,
      draw: Number(((oddsA + oddsB) / 2).toFixed(2)),
      away: oddsB,
    },
    pool: formatCompact(poolA + poolB),
    heat,
    signal: context.detail || title,
    signalTone: index % 3 === 0 ? 'gold' : index % 3 === 1 ? 'sky' : 'rose',
    predictionItem,
  };
}

// HUD 卡片四角装饰

/** 今日赛程 / 暗盘：首屏条数、每次「加载更多」Reveal 条数（与接口 limit 对齐） */
const FIXTURE_VISIBLE_CHUNK = 20;

/** 赛程表主体最大高度，超出后在区域内滚动，避免页面无限拉长 */
const FIXTURE_LIST_MAX_HEIGHT_CLASS = 'max-h-[min(480px,52vh)] md:max-h-[min(560px,58vh)]';

function CornerBrackets() {
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-emerald-400/70" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-emerald-400/70" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-emerald-400/70" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-emerald-400/70" />
    </>
  );
}

export function WorldCupPage() {
  const location = useLocation();
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postedComments, setPostedComments] = useState<Record<string, NewsComment[]>>({});
  const [footballPage, setFootballPage] = useState(1);
  const [visibleFixtureCount, setVisibleFixtureCount] = useState(FIXTURE_VISIBLE_CHUNK);
  const [loadedFootballMarkets, setLoadedFootballMarkets] = useState<FootballMarketAggregate[]>([]);
  const [betModal, setBetModal] = useState<{ item: PredictionCardItem; option: 'A' | 'B' } | null>(null);
  const [localBetSides, setLocalBetSides] = useState<Record<string, 'A' | 'B'>>({});
  const { onOpenAuth } = useHomeLayoutContext();
  const navigate = useNavigate();
  const footballMarketsQuery = useRequestFootballMarketsByTag({
    tag: 'football',
    page: footballPage,
    limit: FIXTURE_VISIBLE_CHUNK,
  });
  const footballMarketsPage = footballMarketsQuery.data?.list ?? [];

  useEffect(() => {
    if (!footballMarketsPage.length) return;

    setLoadedFootballMarkets((prev) => {
      const next = footballPage === 1 ? [] : [...prev];
      footballMarketsPage.forEach((item) => {
        const existingIndex = next.findIndex((current) => current.market.id === item.market.id);
        if (existingIndex >= 0) {
          next[existingIndex] = item;
          return;
        }
        next.push(item);
      });
      return next;
    });
  }, [footballMarketsPage, footballPage]);

  useEffect(() => {
    if (footballPage === 1 && footballMarketsPage.length > 0) {
      setVisibleFixtureCount(FIXTURE_VISIBLE_CHUNK);
    }
  }, [footballPage, footballMarketsPage.length]);

  const footballMarkets = loadedFootballMarkets.length > 0 ? loadedFootballMarkets : footballMarketsPage;
  const footballTotal = footballMarketsQuery.data?.total ?? footballMarkets.length;
  const hasMoreFootballMarkets = footballMarkets.length > 0 && footballMarkets.length < footballTotal;
  const featuredMarkets = useMemo(
    () => (footballMarkets.length > 0 ? footballMarkets.slice(0, 3).map(mapFootballMarketToFeatured) : fallbackFeaturedMarkets),
    [footballMarkets],
  );
  const todayFixtures = useMemo(
    () => (footballMarkets.length > 0 ? footballMarkets.map(mapFootballMarketToFixture) : fallbackTodayFixtures),
    [footballMarkets],
  );
  const visibleTodayFixtures = todayFixtures.slice(0, visibleFixtureCount);
  const canRevealLoadedFixtures = visibleFixtureCount < todayFixtures.length;
  const canViewMoreFixtures = canRevealLoadedFixtures || hasMoreFootballMarkets;

  const openPredictionBet = (item: PredictionCardItem | undefined, option: 'A' | 'B') => {
    if (!item || item.status !== 'open' || item.hasBet || localBetSides[item.id]) return;
    setBetModal({ item, option });
  };

  /** 首页撕裂带按 marketId 拉齐数据；state 直达 EventBattle，避免 Hero 仍错用默认列表 */
  const goToTearZone = useCallback((item: PredictionCardItem | undefined) => {
    if (!item?.marketId) return;
    navigate(`/event-battle?market=${item.marketId}`, {
      state: {
        openBattleNews: item,
        returnTo: `${location.pathname}${location.search || ''}`,
      },
    });
  }, [location.pathname, location.search, navigate]);

  const handleBetSuccess = (item: PredictionCardItem, option: 'A' | 'B', _result: PlaceBetResult) => {
    setLocalBetSides((prev) => ({ ...prev, [item.id]: option }));
  };

  const handleLoadMoreMarkets = () => {
    if (canRevealLoadedFixtures) {
      setVisibleFixtureCount((count) =>
        Math.min(count + FIXTURE_VISIBLE_CHUNK, todayFixtures.length),
      );
      return;
    }
    if (!hasMoreFootballMarkets || footballMarketsQuery.isLoading) return;
    setFootballPage((page) => page + 1);
  };

  const submitComment = (newsId: string) => {
    const text = (commentDrafts[newsId] ?? '').trim();
    if (!text) return;
    const newComment: NewsComment = {
      id: `posted-${newsId}-${Date.now()}`,
      user: '我',
      avatar: '🐢',
      text,
      time: '刚刚',
    };
    setPostedComments((prev) => ({
      ...prev,
      [newsId]: [...(prev[newsId] ?? []), newComment],
    }));
    setCommentDrafts((prev) => ({ ...prev, [newsId]: '' }));
  };

  return (
    <section className="relative overflow-x-hidden bg-transparent page-frame page-frame-wide view-world-cup pb-8 pt-[10px] font-mono text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(260px,32vh)] bg-[radial-gradient(ellipse_130%_90%_at_50%_120%,rgba(16,185,129,0.28),rgba(52,211,153,0.08)_48%,transparent_70%)]"
      />
      {/* Hero —— HUD 顶部直播看板 */}
      <div className="relative isolate overflow-hidden rounded-[20px] border border-emerald-400/30 shadow-[0_0_40px_rgba(52,255,139,0.12),0_20px_60px_rgba(0,0,0,0.55)]">
        {/* 基底 */}
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#08111a,#06151b_55%,#040b0f)]" />
        {/* 网格 */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* 高光 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(52,255,139,0.18),transparent_42%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.18),transparent_38%),radial-gradient(circle_at_60%_92%,rgba(255,46,99,0.10),transparent_45%)]" />
        {/* 扫描线 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 3px)',
          }}
        />
        <WorldCupPitchBackdropLayers />
        <CornerBrackets />

        {/* 大屏弹幕 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[72px] overflow-hidden">
          <style>{`
            @keyframes wc-danmaku-flow {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
          `}</style>
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex flex-col gap-1.5 px-2 pt-2">
            {[
              danmakuMessages.slice(0, 4),
              danmakuMessages.slice(4, 8),
              danmakuMessages.slice(8, 12),
            ].map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="flex w-max gap-6 whitespace-nowrap will-change-transform"
                style={{
                  animation: `wc-danmaku-flow ${26 + rowIdx * 7}s linear infinite`,
                }}
              >
                {[...row, ...row, ...row].map((d, i) => (
                  <span
                    key={`${rowIdx}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/22 bg-black/55 px-3 py-0.5 text-[11px] backdrop-blur"
                  >
                    <span className="font-black text-emerald-300">{d.user}</span>
                    <span className="text-zinc-200">{d.text}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
          {/* 左右淡出 */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#06151b] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#06151b] to-transparent" />
        </div>

        <div className="relative grid gap-6 px-5 pb-6 pt-20 md:px-8 md:pb-8 md:pt-24 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
          <div className="min-w-0 xl:flex xl:flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-sm border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                <span className="relative h-2 w-2 rounded-full bg-rose-400" />
              </span>
              LIVE · WORLD CUP HUD
            </div>
            <h1 className="mt-5 max-w-[720px] font-sans font-black uppercase leading-[0.95] tracking-tight text-[40px] md:text-[60px] [text-shadow:0_0_24px_rgba(52,255,139,0.18)]">
              <span className="block text-zinc-100">PREDICT</span>
              <span className="block text-emerald-400">THE FINAL</span>
            </h1>
            <p className="mt-4 max-w-[640px] text-[13px] leading-7 text-zinc-400 md:text-[14px]">
              全场直播看板 · 实时赔率推送 · 资金流热区追踪。
              从小组赛到决赛,一块屏看完世界杯所有暗盘信号。
            </p>
            {/* 动态世界地图 */}
            <div
              className="relative mt-6 w-full overflow-hidden rounded-[10px] border border-cyan-400/25 bg-black/55 aspect-[400/110] xl:aspect-auto xl:min-h-[120px] xl:flex-1"
            >
              {/* 角标 */}
              <div className="pointer-events-none absolute left-3 top-2 z-10 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
                // GLOBAL HEAT MAP
              </div>
              <div className="pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/90">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                LIVE
              </div>
              {/* 经纬线网格 */}
              <div
                className="absolute inset-0 opacity-[0.22]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(34,211,238,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.18) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <svg
                viewBox="0 0 400 160"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <defs>
                  <pattern id="wc-map-dots" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
                    <circle cx="2.5" cy="2.5" r="0.5" fill="rgba(34,211,238,0.45)" />
                  </pattern>
                </defs>
                <g>
                  {continentPaths.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill="url(#wc-map-dots)"
                      stroke="rgba(52,255,139,0.45)"
                      strokeWidth={0.5}
                    />
                  ))}
                </g>
              </svg>
              {/* 国家热点 */}
              {mapHotspots.map((h) => (
                <div
                  key={h.name}
                  className="absolute"
                  style={{
                    left: `${(h.x / 400) * 100}%`,
                    top: `${(h.y / 160) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inset-0 animate-ping rounded-full ${h.top ? 'bg-emerald-400/85' : 'bg-cyan-400/70'}`}
                    />
                    <span
                      className={`relative h-2 w-2 rounded-full ${h.top ? 'bg-emerald-300 shadow-[0_0_10px_rgba(52,255,139,0.7)]' : 'bg-cyan-300'}`}
                    />
                  </span>
                  {h.top && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-emerald-400/40 bg-black/65 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur">
                      {h.name} · 夺冠热门
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 大屏统计 */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-3">
              <div className="relative flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-emerald-400/25 bg-black/55 px-1.5 py-2 backdrop-blur sm:block sm:p-4">
                <div className="hidden h-[3px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 sm:block" />
                <div className="shrink-0 whitespace-nowrap text-[9.5px] font-black uppercase tracking-0 text-emerald-300/75 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]">
                  <span className="sm:hidden">总龟币量</span>
                  <span className="hidden sm:inline">TOTAL TURTLE COIN · 总龟币量</span>
                </div>
                <div className="shrink-0 whitespace-nowrap font-sans text-[15px] font-black leading-none tracking-tight text-emerald-300 [text-shadow:0_0_14px_rgba(52,255,139,0.45)] sm:mt-1 sm:text-[30px]">
                  2.88M
                </div>
              </div>
              <div className="relative flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-cyan-400/25 bg-black/55 px-1.5 py-2 backdrop-blur sm:block sm:p-4">
                <div className="hidden h-[3px] rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 sm:block" />
                <div className="shrink-0 whitespace-nowrap text-[9.5px] font-black uppercase tracking-0 text-cyan-300/75 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]">
                  <span className="sm:hidden">开盘数</span>
                  <span className="hidden sm:inline">OPEN MARKETS · 开盘数</span>
                </div>
                <div className="shrink-0 whitespace-nowrap font-sans text-[15px] font-black leading-none tracking-tight text-cyan-300 [text-shadow:0_0_14px_rgba(34,211,238,0.4)] sm:mt-1 sm:text-[30px]">
                  36
                </div>
              </div>
              <div className="relative flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-rose-400/25 bg-black/55 px-1.5 py-2 backdrop-blur sm:block sm:p-4">
                <div className="hidden h-[3px] rounded-full bg-gradient-to-r from-rose-400 to-amber-300 sm:block" />
                <div className="shrink-0 whitespace-nowrap text-[9.5px] font-black uppercase tracking-0 text-rose-300/75 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]">
                  <span className="sm:hidden">爆冷率</span>
                  <span className="hidden sm:inline">UPSET RATE · 爆冷率</span>
                </div>
                <div className="shrink-0 whitespace-nowrap font-sans text-[15px] font-black leading-none tracking-tight text-rose-300 [text-shadow:0_0_14px_rgba(255,46,99,0.4)] sm:mt-1 sm:text-[30px]">
                  19%
                </div>
              </div>
            </div>
          </div>

          {/* 夺冠赔率排行榜 TOP 10 */}
          <div className="relative overflow-hidden rounded-[14px] border border-emerald-400/30 bg-black/55 p-4 backdrop-blur-md">
            <WorldCupCardPitchTexture />
            <CornerBrackets />
            <header className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-400/40 bg-emerald-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  <Trophy size={11} />
                  CHAMPION TOP 10
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-sm border border-rose-400/35 bg-rose-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-rose-400" />
                </span>
                LIVE ODDS
              </span>
            </header>
            <div className="relative mt-2 flex items-end justify-between">
              <h3 className="font-sans text-[15px] font-black uppercase tracking-tight text-white">
                夺冠赔率 / 实时榜
              </h3>
              <span className="text-[9.5px] font-black uppercase tracking-[0.18em] text-cyan-300/70">
                // UPDATED 30s AGO
              </span>
            </div>

            <ul className="relative mt-3 overflow-hidden rounded-[8px] border border-cyan-400/15 bg-black/45 divide-y divide-cyan-400/10">
              <li className="grid grid-cols-[28px_1fr_70px_60px] items-center gap-2 border-b border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/70">
                <span>#</span>
                <span>TEAM</span>
                <span className="text-right">ODDS</span>
                <span className="text-right">24H</span>
              </li>
              {championshipOdds.map((row) => {
                const rankTone =
                  row.rank === 1
                    ? 'text-emerald-300 [text-shadow:0_0_10px_rgba(52,255,139,0.6)]'
                    : row.rank === 2
                      ? 'text-cyan-300'
                      : row.rank === 3
                        ? 'text-amber-300'
                        : 'text-zinc-500';
                const rowBg =
                  row.rank === 1
                    ? 'bg-emerald-400/[0.07] hover:bg-emerald-400/[0.12]'
                    : row.rank === 2
                      ? 'bg-cyan-400/[0.05] hover:bg-cyan-400/[0.10]'
                      : row.rank === 3
                        ? 'bg-amber-400/[0.05] hover:bg-amber-400/[0.10]'
                        : 'hover:bg-white/[0.04]';
                const trendCls =
                  row.trend === 'up'
                    ? 'text-emerald-300'
                    : row.trend === 'down'
                      ? 'text-rose-300'
                      : 'text-zinc-500';
                const trendIcon = row.trend === 'up' ? '▲' : row.trend === 'down' ? '▼' : '—';
                return (
                  <li
                    key={row.rank}
                    className={`grid grid-cols-[28px_1fr_70px_60px] items-center gap-2 px-3 py-1.5 transition-colors ${rowBg}`}
                  >
                    <span className={`font-sans text-[14px] font-black tabular-nums ${rankTone}`}>
                      {row.rank.toString().padStart(2, '0')}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-[18px] leading-none">{row.flag}</span>
                      <span className="truncate font-sans text-[13px] font-black text-white">
                        {row.team}
                      </span>
                      {row.rank === 1 && (
                        <span className="rounded-sm border border-emerald-400/40 bg-emerald-400/15 px-1 py-px text-[8.5px] font-black tracking-wider text-emerald-300">
                          TOP
                        </span>
                      )}
                    </span>
                    <span className="text-right font-sans text-[14px] font-black tabular-nums text-white">
                      × {row.odds.toFixed(1)}
                    </span>
                    <span
                      className={`flex items-center justify-end gap-0.5 font-sans text-[10.5px] font-black tabular-nums ${trendCls}`}
                    >
                      <span className="text-[9px] leading-none">{trendIcon}</span>
                      {row.delta}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="relative mt-2 flex items-center justify-between text-[9.5px] font-black uppercase tracking-[0.18em] text-cyan-300/65">
              <span className="inline-flex items-center gap-1">
                <Goal size={10} />
                数据来自 36 个公开盘口聚合
              </span>
              <button
                type="button"
                onClick={handleLoadMoreMarkets}
                disabled={!hasMoreFootballMarkets || footballMarketsQuery.isLoading}
                className="inline-flex items-center gap-0.5 text-emerald-300/85 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {footballMarketsQuery.isLoading ? '加载中' : hasMoreFootballMarkets ? '加载更多' : '已加载'}
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主 + 侧栏 */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* 主栏 */}
        <div className="grid gap-5">
          {/* 预测板 */}
          <section>
            <header className="flex items-center justify-between px-1">
              <div>
                <div className="inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.22em] text-emerald-400">
                  <Sparkles size={12} />
                  // PREDICTION DECK
                </div>
                <h2 className="mt-1 font-sans text-[24px] font-black uppercase tracking-tight text-white">
                  热门预测盘
                </h2>
                <p className="mt-1 text-[11.5px] uppercase tracking-wider text-zinc-500">
                  REAL-TIME STAKE DISTRIBUTION · CLICK TO ENTER
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadMoreMarkets}
                disabled={!hasMoreFootballMarkets || footballMarketsQuery.isLoading}
                className="hidden items-center gap-1 rounded-sm border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex"
              >
                {footballMarketsQuery.isLoading ? 'LOADING' : canViewMoreFixtures ? 'VIEW MORE' : 'ALL LOADED'}
                <ChevronRight size={13} />
              </button>
            </header>

            <div className="mt-3 grid gap-3">
              {featuredMarkets.map((market) => (
                <article
                  key={market.title}
                  className="relative overflow-hidden rounded-[14px] border border-emerald-400/22 bg-[linear-gradient(150deg,rgba(6,21,27,0.92),rgba(4,11,15,0.96)_60%)] p-5 shadow-[0_0_24px_rgba(52,255,139,0.08),0_18px_42px_rgba(0,0,0,0.35)]"
                >
                  <WorldCupCardPitchTexture />
                  <CornerBrackets />
                  <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(52,255,139,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,255,139,0.4) 1px, transparent 1px)',
                      backgroundSize: '28px 28px',
                    }}
                  />
                  <div className="absolute right-4 top-4 text-emerald-400/[0.06]">
                    <Crosshair size={56} />
                  </div>
                  <div className="relative flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-400/35 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                        <Trophy size={11} />
                        {market.tag}
                      </div>
                      <h3 className="mt-2.5 font-sans text-[19px] font-black leading-tight text-white md:text-[21px]">
                        {market.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-sm border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-rose-300">
                        <Flame size={11} />
                        {market.heat}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-emerald-300">
                        <Coins size={11} />
                        {market.pool}
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-5 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openPredictionBet(market.predictionItem, 'A')}
                      disabled={!market.predictionItem || market.predictionItem.status !== 'open' || market.predictionItem.hasBet || Boolean(market.predictionItem && localBetSides[market.predictionItem.id])}
                      className="group relative overflow-hidden rounded-[10px] border border-emerald-400/35 bg-emerald-400/8 p-4 text-left transition-all hover:border-emerald-400/70 hover:bg-emerald-400/16 hover:shadow-[0_0_18px_rgba(52,255,139,0.3)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/65">
                            {market.sideA.accent}
                          </div>
                          <div className="mt-0.5 font-sans text-[16px] font-black text-white">
                            {market.sideA.label}
                          </div>
                        </div>
                        <span className="font-sans text-[28px] font-black tracking-tight text-emerald-300 [text-shadow:0_0_14px_rgba(52,255,139,0.5)]">
                          {market.sideA.pct}%
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-black/55">
                        <div
                          className="h-full rounded-sm bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(52,255,139,0.6)]"
                          style={{ width: `${market.sideA.pct}%` }}
                        />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openPredictionBet(market.predictionItem, 'B')}
                      disabled={!market.predictionItem || market.predictionItem.status !== 'open' || market.predictionItem.hasBet || Boolean(market.predictionItem && localBetSides[market.predictionItem.id])}
                      className="group relative overflow-hidden rounded-[10px] border border-rose-400/35 bg-rose-400/8 p-4 text-left transition-all hover:border-rose-400/70 hover:bg-rose-400/16 hover:shadow-[0_0_18px_rgba(255,46,99,0.3)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-300/65">
                            {market.sideB.accent}
                          </div>
                          <div className="mt-0.5 font-sans text-[16px] font-black text-white">
                            {market.sideB.label}
                          </div>
                        </div>
                        <span className="font-sans text-[28px] font-black tracking-tight text-rose-300 [text-shadow:0_0_14px_rgba(255,46,99,0.5)]">
                          {market.sideB.pct}%
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-black/55">
                        <div
                          className="h-full rounded-sm bg-gradient-to-r from-rose-400 to-amber-300 shadow-[0_0_10px_rgba(255,46,99,0.6)]"
                          style={{ width: `${market.sideB.pct}%` }}
                        />
                      </div>
                    </button>
                  </div>
                  {market.predictionItem?.marketId ? (
                    <button
                      type="button"
                      onClick={() => goToTearZone(market.predictionItem)}
                      className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-400/30 bg-cyan-400/[0.08] py-2.5 text-[11px] font-black uppercase tracking-wider text-cyan-200 transition-colors hover:bg-cyan-400/16"
                    >
                      <MessageCircleMore size={14} />
                      进入撕裂带
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          {/* 今日赛程暗盘 */}
          <section>
            <header className="flex items-center justify-between px-1">
              <div>
                <div className="inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.22em] text-cyan-400">
                  <CalendarClock size={12} />
                  // FIXTURE SCHEDULE · TODAY
                </div>
                <h2 className="mt-1 font-sans text-[24px] font-black uppercase tracking-tight text-white">
                  今日赛程 / 暗盘
                </h2>
                <p className="mt-1 text-[11.5px] uppercase tracking-wider text-zinc-500">
                  TAP A ROW TO OPEN STAKE TERMINAL
                </p>
              </div>
              <span className="hidden items-center gap-1 rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wider text-cyan-300 md:inline-flex">
                <Radio size={11} />
                {visibleTodayFixtures.length}/{todayFixtures.length} TABLES
              </span>
            </header>

            <div className={`relative mt-3 flex flex-col overflow-hidden rounded-[14px] border border-cyan-400/22 bg-[linear-gradient(160deg,rgba(6,21,27,0.96),rgba(4,11,15,0.98))] shadow-[0_0_24px_rgba(34,211,238,0.08),0_18px_42px_rgba(0,0,0,0.32)] ${FIXTURE_LIST_MAX_HEIGHT_CLASS}`}>
              <WorldCupCardPitchTexture />
              <div className="grid shrink-0 grid-cols-[110px_1fr_auto] items-center gap-3 border-b border-cyan-400/15 bg-black/40 px-4 py-2.5 text-[9.5px] font-black uppercase tracking-[0.22em] text-cyan-300/65">
                <span>TIME / STAGE</span>
                <span>MATCH · SIGNAL</span>
                <span className="pr-1">ODDS · STAKE</span>
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-cyan-400/10 overflow-y-auto overflow-x-hidden overscroll-contain">
                {visibleTodayFixtures.map((fixture) => (
                  <li key={fixture.id}>
                    <div className="grid w-full grid-cols-[110px_1fr_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-400/[0.06]">
                      <div className="min-w-0">
                        <div className="font-sans text-[13px] font-black text-emerald-300">
                          {fixture.time}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-wider text-zinc-500">
                          {fixture.stage}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-sans text-[15px] font-black text-white">
                          <span className="text-[20px] leading-none">{fixture.homeFlag}</span>
                          <span className="truncate">{fixture.home}</span>
                          <span className="px-1 text-cyan-400/50">vs</span>
                          <span className="text-[20px] leading-none">{fixture.awayFlag}</span>
                          <span className="truncate">{fixture.away}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${signalToneMap[fixture.signalTone]}`}
                          >
                            <Zap size={10} />
                            {fixture.signal}
                          </span>
                          <span className="hidden items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-500 sm:inline-flex">
                            <Coins size={10} />
                            POOL {fixture.pool}
                          </span>
                          <span className="hidden items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-500 md:inline-flex">
                            <Activity size={10} />
                            HEAT {fixture.heat}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden flex-col items-end text-right font-sans text-[10.5px] tabular-nums text-zinc-400 sm:flex">
                          <span>主 <span className="text-emerald-300">{fixture.odds.home}</span></span>
                          <span>客 <span className="text-rose-300">{fixture.odds.away}</span></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPredictionBet(fixture.predictionItem, 'A')}
                          disabled={!fixture.predictionItem || fixture.predictionItem.status !== 'open' || fixture.predictionItem.hasBet || Boolean(fixture.predictionItem && localBetSides[fixture.predictionItem.id])}
                          className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/45 bg-emerald-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-400/25 hover:shadow-[0_0_14px_rgba(52,255,139,0.4)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none"
                        >
                          <Swords size={11} />
                          主队
                        </button>
                        <button
                          type="button"
                          onClick={() => openPredictionBet(fixture.predictionItem, 'B')}
                          disabled={!fixture.predictionItem || fixture.predictionItem.status !== 'open' || fixture.predictionItem.hasBet || Boolean(fixture.predictionItem && localBetSides[fixture.predictionItem.id])}
                          className="inline-flex items-center gap-1 rounded-sm border border-rose-400/45 bg-rose-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-rose-300 transition-all hover:bg-rose-400/25 hover:shadow-[0_0_14px_rgba(255,46,99,0.34)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none"
                        >
                          <Swords size={11} />
                          客队
                        </button>
                        {fixture.predictionItem?.marketId ? (
                          <button
                            type="button"
                            onClick={() => goToTearZone(fixture.predictionItem)}
                            title="进入对应预测的撕裂带"
                            className="inline-flex items-center gap-0.5 rounded-sm border border-cyan-400/35 bg-cyan-400/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-200 transition-colors hover:bg-cyan-400/18"
                          >
                            <MessageCircleMore size={12} />
                            撕裂带
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="shrink-0 border-t border-cyan-400/15 bg-[rgba(4,11,15,0.85)] px-4 py-3 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={handleLoadMoreMarkets}
                  disabled={!canViewMoreFixtures || footballMarketsQuery.isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-400/16 hover:shadow-[0_0_12px_rgba(34,211,238,0.22)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none"
                >
                  {footballMarketsQuery.isLoading
                    ? 'LOADING · 加载中'
                    : canRevealLoadedFixtures
                      ? `VIEW MORE · 再看 ${Math.min(FIXTURE_VISIBLE_CHUNK, todayFixtures.length - visibleFixtureCount)} 条`
                      : hasMoreFootballMarkets
                        ? 'LOAD NEXT PAGE · 加载下一页'
                        : 'ALL LOADED · 已全部展示'}
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* 侧栏 */}
        <aside className="grid content-start gap-4">
          {SHOW_WORLD_CUP_DEBATE_STAGE ? (
          <section className="relative overflow-hidden rounded-[14px] border border-rose-400/25 bg-[linear-gradient(160deg,rgba(20,4,10,0.92),rgba(4,11,15,0.97)_60%)] shadow-[0_0_24px_rgba(255,46,99,0.10),0_18px_42px_rgba(0,0,0,0.38)]">
            <CornerBrackets />
            <header className="relative flex items-center justify-between border-b border-rose-400/20 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mic2 size={18} className="text-rose-400" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300/80">
                    // DEBATE STAGE
                  </div>
                  <h2 className="font-sans text-[17px] font-black uppercase tracking-tight text-white">
                    开撕台
                  </h2>
                </div>
              </div>
              <button className="rounded-sm border border-rose-400/35 bg-rose-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-300 transition-all hover:bg-rose-400/20 hover:shadow-[0_0_12px_rgba(255,46,99,0.4)]">
                + 发起开撕
              </button>
            </header>
            <ul className="divide-y divide-rose-400/12">
              {debates.map((debate) => (
                <li key={debate.title} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex-1 font-sans text-[14px] font-black leading-snug text-white">
                      {debate.title}
                    </h3>
                    <span className="shrink-0 text-[12px]">{debate.spice}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 border-l-2 border-rose-400/50 pl-2 text-[11px] italic leading-5 text-zinc-400">
                    {debate.quote}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <button className="rounded-sm border border-emerald-400/30 bg-emerald-400/8 px-2 py-1.5 text-left text-[11px] font-black text-emerald-200 transition-all hover:bg-emerald-400/16 hover:shadow-[0_0_10px_rgba(52,255,139,0.3)]">
                      <div className="flex items-center justify-between">
                        <span className="truncate uppercase tracking-wider">{debate.sideA.label}</span>
                        <span className="font-sans tabular-nums text-emerald-300">{debate.sideA.pct}%</span>
                      </div>
                    </button>
                    <button className="rounded-sm border border-rose-400/30 bg-rose-400/8 px-2 py-1.5 text-left text-[11px] font-black text-rose-200 transition-all hover:bg-rose-400/16 hover:shadow-[0_0_10px_rgba(255,46,99,0.3)]">
                      <div className="flex items-center justify-between">
                        <span className="truncate uppercase tracking-wider">{debate.sideB.label}</span>
                        <span className="font-sans tabular-nums text-rose-300">{debate.sideB.pct}%</span>
                      </div>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} />
                      {debate.heat} 参战
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-300">
                      加入开撕
                      <ChevronRight size={11} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          ) : null}

          {/* 最新消息 */}
          <section className="relative overflow-hidden rounded-[14px] border border-cyan-400/25 bg-[linear-gradient(165deg,rgba(4,18,24,0.92),rgba(4,11,15,0.98)_62%)] shadow-[0_0_24px_rgba(34,211,238,0.10),0_18px_42px_rgba(0,0,0,0.4)]">
            <CornerBrackets />
            <header className="relative flex items-center justify-between border-b border-cyan-400/20 px-5 py-4">
              <div className="flex items-center gap-2">
                <Newspaper size={18} className="text-cyan-300" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/80">
                    // NEWS WIRE
                  </div>
                  <h2 className="font-sans text-[17px] font-black uppercase tracking-tight text-white">
                    最新消息
                  </h2>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-sm border border-rose-400/35 bg-rose-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-rose-400" />
                </span>
                LIVE
              </span>
            </header>
            <ul className="divide-y divide-cyan-400/12">
              {newsItems.map((news) => {
                const isExpanded = expandedNewsId === news.id;
                const allComments = [...news.comments, ...(postedComments[news.id] ?? [])];
                const draft = commentDrafts[news.id] ?? '';
                return (
                  <li key={news.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-cyan-400/30 bg-black/55 text-[18px] shadow-[inset_0_0_10px_rgba(34,211,238,0.18)]">
                        {news.sourceAvatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-sans text-[13px] font-black text-white">
                            {news.source}
                          </span>
                          <span
                            className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${newsCategoryStyle[news.category]}`}
                          >
                            {news.categoryLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                          <Hash className="mr-0.5 inline" size={9} />
                          {news.time}
                        </div>
                        <h3 className="mt-2 font-sans text-[14px] font-black leading-snug text-white">
                          {news.headline}
                        </h3>
                        <p className="mt-1.5 font-sans text-[12px] leading-5 text-zinc-300">
                          {news.body}
                        </p>
                        <div className="mt-2.5 flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                          <button
                            onClick={() => setExpandedNewsId(isExpanded ? null : news.id)}
                            className={`inline-flex items-center gap-1 transition-colors ${isExpanded ? 'text-cyan-300' : 'hover:text-cyan-300'}`}
                          >
                            <MessageCircleMore size={11} />
                            {allComments.length}
                          </button>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp size={11} />
                            {news.likes}
                          </span>
                          <button
                            onClick={() => setExpandedNewsId(isExpanded ? null : news.id)}
                            className={`ml-auto inline-flex items-center gap-1 transition-colors ${isExpanded ? 'text-cyan-300' : 'text-cyan-300/85 hover:text-cyan-300'}`}
                          >
                            {isExpanded ? '收起' : '评论'}
                            <ChevronRight
                              size={11}
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 rounded-[8px] border border-cyan-400/20 bg-black/45 p-3 shadow-[inset_0_0_18px_rgba(34,211,238,0.06)]">
                            <div className="text-[9.5px] font-black uppercase tracking-[0.22em] text-cyan-300/65">
                              // {allComments.length} COMMENTS
                            </div>
                            {allComments.length > 0 ? (
                              <ul className="mt-2 space-y-2.5">
                                {allComments.map((c) => (
                                  <li key={c.id} className="flex items-start gap-2">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-cyan-400/25 bg-black/55 text-[12px]">
                                      {c.avatar}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-2">
                                        <span className="truncate font-sans text-[11.5px] font-black text-cyan-200">
                                          {c.user}
                                        </span>
                                        <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                          {c.time}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 font-sans text-[11.5px] leading-[1.5] text-zinc-200">
                                        {c.text}
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-[11px] text-zinc-500">
                                还没有人评论 · 留下第一条
                              </p>
                            )}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                submitComment(news.id);
                              }}
                              className="mt-3 flex items-center gap-2"
                            >
                              <input
                                value={draft}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [news.id]: e.target.value,
                                  }))
                                }
                                placeholder="// 写下你的评论"
                                className="flex-1 rounded-sm border border-cyan-400/25 bg-black/55 px-2.5 py-1.5 font-sans text-[11.5px] text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-cyan-400/60 focus:bg-black/70"
                              />
                              <button
                                type="submit"
                                disabled={!draft.trim()}
                                className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/45 bg-emerald-400/15 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-400/25 hover:shadow-[0_0_10px_rgba(52,255,139,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
                              >
                                <Send size={11} />
                                发送
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-cyan-400/15 px-5 py-3 text-center text-[11px] font-black uppercase tracking-wider text-cyan-300/85 transition-colors hover:bg-cyan-400/[0.06]">
              VIEW ALL · 查看全部消息 →
            </div>
          </section>
        </aside>
      </div>

      <PredictionBetModal
        open={Boolean(betModal)}
        item={betModal?.item ?? null}
        option={betModal?.option ?? null}
        onClose={() => setBetModal(null)}
        onSuccess={handleBetSuccess}
        onRequireAuth={onOpenAuth}
      />
    </section>
  );
}
