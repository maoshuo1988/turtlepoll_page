/**
 * 文件说明：rivalry Mock Data，开撕台页面组件和数据。
 */
export type RivalryNewsItem = {
  id: string;
  title: string;
  summary: string;
  image: string;
  type: 'rivalry';
  votes: { A: number; B: number };
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  status: 'open' | 'closed';
};

export type PKPhase = 'betting' | 'locked' | 'cooldown';

export interface PKRoundResult {
  round: number;
  heatA: number;
  heatB: number;
  winner: 'A' | 'B';
  betCountA: number;
  betCountB: number;
  commentCount: number;
  likeCount: number;
}

export interface PKSeason {
  season: number;
  startDate: string;
  endDate: string;
  totalRounds: number;
  winsA: number;
  winsB: number;
  champion: 'A' | 'B' | null;
}

export interface PKHistory {
  totalRounds: number;
  totalWinsA: number;
  totalWinsB: number;
  longestStreakA: number;
  longestStreakB: number;
  currentStreakSide: 'A' | 'B';
  currentStreak: number;
  seasons: PKSeason[];
}

export interface PKTopicState {
  id: string;
  newsItem: RivalryNewsItem;
  currentRound: number;
  phase: PKPhase;
  roundStartTime: number;
  roundEndTime: number;
  lockTime: number;
  nextRoundTime?: number;
  currentHeatA: number;
  currentHeatB: number;
  roundHistory: PKRoundResult[];
  season: PKSeason;
  history: PKHistory;
  lastRoundWinner?: 'A' | 'B';
}

function genRounds(pattern: Array<'A' | 'B'>): PKRoundResult[] {
  return pattern.map((winner, index) => ({
    round: index + 1,
    heatA: winner === 'A' ? 800 + Math.floor(Math.random() * 400) : 500 + Math.floor(Math.random() * 300),
    heatB: winner === 'B' ? 800 + Math.floor(Math.random() * 400) : 500 + Math.floor(Math.random() * 300),
    winner,
    betCountA: 100 + Math.floor(Math.random() * 200),
    betCountB: 100 + Math.floor(Math.random() * 200),
    commentCount: 50 + Math.floor(Math.random() * 150),
    likeCount: 200 + Math.floor(Math.random() * 500),
  }));
}

function calcStreak(rounds: PKRoundResult[]) {
  let longestA = 0;
  let longestB = 0;
  let currentA = 0;
  let currentB = 0;

  for (const round of rounds) {
    if (round.winner === 'A') {
      currentA += 1;
      currentB = 0;
      longestA = Math.max(longestA, currentA);
    } else {
      currentB += 1;
      currentA = 0;
      longestB = Math.max(longestB, currentB);
    }
  }

  const lastRound = rounds[rounds.length - 1];
  return {
    longestA,
    longestB,
    side: lastRound?.winner ?? 'A',
    count: lastRound?.winner === 'A' ? currentA : currentB,
  };
}

export const mockRivalryHero: RivalryNewsItem = {
  id: 'pk-hero',
  title: '世纪之争：梅西 vs C罗，谁才是足球史上最伟大的球员？',
  summary: '这场跨越二十年的 GOAT 之争，至今仍在全球球迷中引发最激烈的论战。荣誉、数据、观赏性、领导力，你站哪一边？',
  image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
  type: 'rivalry',
  votes: { A: 24873, B: 23156 },
  optionA: '梅西更强',
  optionB: 'C罗更强',
  oddsA: 1.93,
  oddsB: 2.08,
  status: 'open',
};

export const mockRivalryItems: RivalryNewsItem[] = [
  {
    id: 'pk-1',
    title: '四代女团门面之争：张元英 vs 柳智敏，谁是五代女一？',
    summary: '颜值、舞台、人气、商业价值，谁才是新生代女团的绝对 C 位？',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
    type: 'rivalry',
    votes: { A: 18934, B: 17621 },
    optionA: '张元英',
    optionB: '柳智敏',
    oddsA: 1.93,
    oddsB: 2.07,
    status: 'open',
  },
  {
    id: 'pk-2',
    title: '未来世界格局：中国 vs 美国，谁才是 21 世纪真正的超级大国？',
    summary: '科技竞赛、经济总量、军事实力、文化影响力，两个超级大国的角力将决定未来走向。',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
    type: 'rivalry',
    votes: { A: 31245, B: 28976 },
    optionA: '中国',
    optionB: '美国',
    oddsA: 1.93,
    oddsB: 2.07,
    status: 'open',
  },
  {
    id: 'pk-3',
    title: '手机阵营终极对决：iPhone vs 安卓，谁才是手机之王？',
    summary: '封闭生态 vs 开放自由，年年吵年年战，你口袋里的手机就是你的立场。',
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80',
    type: 'rivalry',
    votes: { A: 15678, B: 19432 },
    optionA: 'iPhone',
    optionB: '安卓',
    oddsA: 2.25,
    oddsB: 1.8,
    status: 'open',
  },
  {
    id: 'pk-4',
    title: '漫威 vs DC：谁才是超级英雄宇宙的真正王者？',
    summary: '钢铁侠还是蝙蝠侠，票房说话还是口碑为王？',
    image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&q=80',
    type: 'rivalry',
    votes: { A: 22341, B: 12876 },
    optionA: '漫威',
    optionB: 'DC',
    oddsA: 1.58,
    oddsB: 2.73,
    status: 'open',
  },
  {
    id: 'pk-5',
    title: '电竞 GOAT 之争：Faker vs Uzi，谁是 LOL 历史第一人？',
    summary: '三冠王大魔王 vs 永不言弃的狂小狗，荣誉和情怀的终极碰撞。',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80',
    type: 'rivalry',
    votes: { A: 19876, B: 14532 },
    optionA: 'Faker',
    optionB: 'Uzi',
    oddsA: 1.73,
    oddsB: 2.37,
    status: 'open',
  },
  {
    id: 'pk-6',
    title: '猫 vs 狗：谁才是人类最好的伙伴？',
    summary: '猫奴 vs 狗党，这场战争从互联网诞生之日就开始了。',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80',
    type: 'rivalry',
    votes: { A: 28765, B: 31234 },
    optionA: '猫猫',
    optionB: '狗狗',
    oddsA: 2.09,
    oddsB: 1.92,
    status: 'open',
  },
];

const heroHistoryPattern: Array<'A' | 'B'> = [
  'A', 'A', 'B', 'A', 'B', 'B', 'A', 'A', 'A', 'B',
  'A', 'B', 'A', 'A', 'B', 'A', 'B', 'B', 'A', 'A',
  'B', 'A', 'B', 'A', 'A', 'B', 'A', 'A', 'B', 'A',
];
const heroRounds = genRounds(heroHistoryPattern);
const heroStreak = calcStreak(heroRounds);

export const mockPKStates: PKTopicState[] = [
  {
    id: 'pk-hero',
    newsItem: mockRivalryHero,
    currentRound: 8,
    phase: 'betting',
    roundStartTime: Date.now() - 18 * 3600000,
    roundEndTime: Date.now() + 54 * 3600000,
    lockTime: Date.now() + 30 * 3600000,
    currentHeatA: 487.3,
    currentHeatB: 452.1,
    roundHistory: heroRounds.slice(0, 7),
    season: { season: 3, startDate: '03-15', endDate: '04-14', totalRounds: 10, winsA: 6, winsB: 4, champion: null },
    history: {
      totalRounds: heroRounds.length + 7,
      totalWinsA: heroHistoryPattern.filter((winner) => winner === 'A').length + 6,
      totalWinsB: heroHistoryPattern.filter((winner) => winner === 'B').length + 4,
      longestStreakA: Math.max(heroStreak.longestA, 4),
      longestStreakB: Math.max(heroStreak.longestB, 3),
      currentStreakSide: 'A',
      currentStreak: 2,
      seasons: [
        { season: 1, startDate: '01-15', endDate: '02-14', totalRounds: 10, winsA: 6, winsB: 4, champion: 'A' },
        { season: 2, startDate: '02-15', endDate: '03-14', totalRounds: 10, winsA: 4, winsB: 6, champion: 'B' },
        { season: 3, startDate: '03-15', endDate: '04-14', totalRounds: 10, winsA: 6, winsB: 4, champion: null },
      ],
    },
    lastRoundWinner: 'A',
  },
  {
    id: 'pk-1',
    newsItem: mockRivalryItems[0],
    currentRound: 5,
    phase: 'locked',
    roundStartTime: Date.now() - 52 * 3600000,
    roundEndTime: Date.now() + 20 * 3600000,
    lockTime: Date.now() - 4 * 3600000,
    currentHeatA: 612.8,
    currentHeatB: 589.4,
    roundHistory: genRounds(['A', 'B', 'A', 'A']),
    season: { season: 2, startDate: '03-20', endDate: '04-19', totalRounds: 10, winsA: 3, winsB: 1, champion: null },
    history: {
      totalRounds: 14,
      totalWinsA: 9,
      totalWinsB: 5,
      longestStreakA: 4,
      longestStreakB: 2,
      currentStreakSide: 'A',
      currentStreak: 2,
      seasons: [
        { season: 1, startDate: '02-20', endDate: '03-19', totalRounds: 10, winsA: 6, winsB: 4, champion: 'A' },
        { season: 2, startDate: '03-20', endDate: '04-19', totalRounds: 10, winsA: 3, winsB: 1, champion: null },
      ],
    },
    lastRoundWinner: 'A',
  },
  {
    id: 'pk-2',
    newsItem: mockRivalryItems[1],
    currentRound: 12,
    phase: 'cooldown',
    roundStartTime: Date.now() - 72 * 3600000,
    roundEndTime: Date.now() - 600000,
    lockTime: Date.now() - 24 * 3600000,
    nextRoundTime: Date.now() + 300000,
    currentHeatA: 923.6,
    currentHeatB: 887.2,
    roundHistory: genRounds(['A', 'B', 'A', 'A', 'B', 'A', 'B', 'A', 'A', 'B', 'A']),
    season: { season: 4, startDate: '03-05', endDate: '04-04', totalRounds: 10, winsA: 7, winsB: 4, champion: null },
    history: {
      totalRounds: 41,
      totalWinsA: 23,
      totalWinsB: 18,
      longestStreakA: 5,
      longestStreakB: 3,
      currentStreakSide: 'A',
      currentStreak: 1,
      seasons: [
        { season: 1, startDate: '01-05', endDate: '02-04', totalRounds: 10, winsA: 5, winsB: 5, champion: 'A' },
        { season: 2, startDate: '02-05', endDate: '03-04', totalRounds: 10, winsA: 6, winsB: 4, champion: 'A' },
        { season: 3, startDate: '03-05', endDate: '04-04', totalRounds: 10, winsA: 5, winsB: 5, champion: 'B' },
        { season: 4, startDate: '04-05', endDate: '05-04', totalRounds: 10, winsA: 7, winsB: 4, champion: null },
      ],
    },
    lastRoundWinner: 'A',
  },
  {
    id: 'pk-3',
    newsItem: mockRivalryItems[2],
    currentRound: 6,
    phase: 'betting',
    roundStartTime: Date.now() - 12 * 3600000,
    roundEndTime: Date.now() + 60 * 3600000,
    lockTime: Date.now() + 36 * 3600000,
    currentHeatA: 345.2,
    currentHeatB: 398.7,
    roundHistory: genRounds(['B', 'A', 'B', 'A', 'B']),
    season: { season: 2, startDate: '03-10', endDate: '04-09', totalRounds: 10, winsA: 2, winsB: 3, champion: null },
    history: {
      totalRounds: 15,
      totalWinsA: 6,
      totalWinsB: 9,
      longestStreakA: 2,
      longestStreakB: 3,
      currentStreakSide: 'B',
      currentStreak: 1,
      seasons: [
        { season: 1, startDate: '02-10', endDate: '03-09', totalRounds: 10, winsA: 4, winsB: 6, champion: 'B' },
        { season: 2, startDate: '03-10', endDate: '04-09', totalRounds: 10, winsA: 2, winsB: 3, champion: null },
      ],
    },
    lastRoundWinner: 'B',
  },
  {
    id: 'pk-4',
    newsItem: mockRivalryItems[3],
    currentRound: 9,
    phase: 'betting',
    roundStartTime: Date.now() - 20 * 3600000,
    roundEndTime: Date.now() + 52 * 3600000,
    lockTime: Date.now() + 28 * 3600000,
    currentHeatA: 567.4,
    currentHeatB: 312.1,
    roundHistory: genRounds(['A', 'A', 'B', 'A', 'A', 'A', 'B', 'A']),
    season: { season: 3, startDate: '03-08', endDate: '04-07', totalRounds: 10, winsA: 6, winsB: 2, champion: null },
    history: {
      totalRounds: 28,
      totalWinsA: 19,
      totalWinsB: 9,
      longestStreakA: 4,
      longestStreakB: 2,
      currentStreakSide: 'A',
      currentStreak: 1,
      seasons: [
        { season: 1, startDate: '01-08', endDate: '02-07', totalRounds: 10, winsA: 7, winsB: 3, champion: 'A' },
        { season: 2, startDate: '02-08', endDate: '03-07', totalRounds: 10, winsA: 6, winsB: 4, champion: 'A' },
        { season: 3, startDate: '03-08', endDate: '04-07', totalRounds: 10, winsA: 6, winsB: 2, champion: null },
      ],
    },
    lastRoundWinner: 'A',
  },
  {
    id: 'pk-5',
    newsItem: mockRivalryItems[4],
    currentRound: 4,
    phase: 'betting',
    roundStartTime: Date.now() - 16 * 3600000,
    roundEndTime: Date.now() + 56 * 3600000,
    lockTime: Date.now() + 32 * 3600000,
    currentHeatA: 444.5,
    currentHeatB: 502.8,
    roundHistory: genRounds(['A', 'B', 'B']),
    season: { season: 1, startDate: '03-28', endDate: '04-26', totalRounds: 10, winsA: 1, winsB: 2, champion: null },
    history: {
      totalRounds: 13,
      totalWinsA: 6,
      totalWinsB: 7,
      longestStreakA: 2,
      longestStreakB: 3,
      currentStreakSide: 'B',
      currentStreak: 2,
      seasons: [{ season: 1, startDate: '03-28', endDate: '04-26', totalRounds: 10, winsA: 1, winsB: 2, champion: null }],
    },
    lastRoundWinner: 'B',
  },
  {
    id: 'pk-6',
    newsItem: mockRivalryItems[5],
    currentRound: 7,
    phase: 'locked',
    roundStartTime: Date.now() - 50 * 3600000,
    roundEndTime: Date.now() + 22 * 3600000,
    lockTime: Date.now() - 2 * 3600000,
    currentHeatA: 701.1,
    currentHeatB: 744.9,
    roundHistory: genRounds(['B', 'A', 'B', 'B', 'A', 'B']),
    season: { season: 2, startDate: '03-18', endDate: '04-17', totalRounds: 10, winsA: 2, winsB: 4, champion: null },
    history: {
      totalRounds: 22,
      totalWinsA: 10,
      totalWinsB: 12,
      longestStreakA: 2,
      longestStreakB: 3,
      currentStreakSide: 'B',
      currentStreak: 1,
      seasons: [
        { season: 1, startDate: '02-18', endDate: '03-17', totalRounds: 10, winsA: 4, winsB: 6, champion: 'B' },
        { season: 2, startDate: '03-18', endDate: '04-17', totalRounds: 10, winsA: 2, winsB: 4, champion: null },
      ],
    },
    lastRoundWinner: 'B',
  },
];
