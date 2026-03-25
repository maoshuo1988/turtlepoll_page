export interface PetInfo {
  name: string;
  status: string;
  level: number;
  avatar: string; // emoji
  stamina: number;    // 0-maxStamina
  maxStamina: number; // default 10
}

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  effect: { type: 'stamina'; value: number };
}

export interface User {
  name: string;
  balance: number;
  winStreak: number;
  petInfo: PetInfo;
}

export interface RankUser {
  rank: number;
  name: string;
  avatar: string;
  coins: number;
  winRate: number;
  streak?: number;
  isMe?: boolean;
}

export const mockUser: User = {
  name: '路边社社长',
  balance: 8888,
  winStreak: 7,
  petInfo: {
    name: '龟仙人',
    status: '精神饱满',
    level: 42,
    avatar: '🐢',
    stamina: 8,
    maxStamina: 10,
  },
};

export const petDialogues = {
  idle: [
    '今日情报已备好，主人请过目~',
    '路边社最新爆料来了！',
    '有人在评论区反驳你，要去看看吗？',
    '龟币行情看涨，是时候出手了~',
    '我嗅到了一个大新闻的味道...',
  ],
  bet: [
    '主人好气魄！这波稳了！',
    '赌上我的龟壳，这把一定赢！',
    '好大的手笔！你是认真的吧？',
    '龟仙人看好你！冲冲冲！',
    '投得漂亮！让他们见识一下！',
  ],
  win: [
    '恭喜主人！又赢了！',
    '这波分析到位，佩服佩服~',
  ],
  battle: [
    '对局开始！这波谁赢不好说~',
    '好家伙，真金白银的对决！',
    '龟仙人搬好小板凳看戏了！',
    '赌上龟壳，你一定能赢！',
    '这对局有意思，我押你赢！',
  ],
  chat: [
    '这个问题有点超纲了，让龟仙人想想...',
    '主人可以问我具体的预测事件哦，比如"收购"、"机器人"~',
    '龟壳里的数据库暂时查不到这个，换一个事件试试？',
    '嗯...这个龟仙人还不太了解，问点热门话题吧！',
    '龟仙人擅长分析预测事件，给我一个关键词试试~',
  ],
};

export const heroNews = {
  id: 'hero-1',
  marketId: 1,
  title: '重磅：某科技巨头被曝将收购知名社交平台',
  summary: '据路边社独家消息，一场改变互联网格局的世纪收购正在秘密谈判中。知情人士透露，交易金额可能高达千亿级别。这将是科技史上最大的并购案之一。',
  image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
  type: 'tech',
  votes: { A: 3847, B: 2156 },
  optionA: '会成功',
  optionB: '不会',
  oddsA: 2.1,
  oddsB: 1.8,
  status: 'open',
};

export const mockNews = [
  {
    id: 'n1',
    marketId: 2,
    title: '全球首款通用人形机器人即将量产？',
    summary: '多位业内人士证实，某头部AI公司的人形机器人已通过最终测试，预计明年Q2开始量产。',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80',
    type: 'tech',
    votes: { A: 2341, B: 1876 },
    optionA: '能量产',
    optionB: '吹牛',
    oddsA: 1.9,
    oddsB: 2.0,
    status: 'open',
  },
  {
    id: 'n2',
    marketId: 3,
    title: '知名导演新片口碑两极分化',
    summary: '该片上映首周票房破10亿，但评分仅5.2。观众吵翻了。',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
    type: 'entertainment',
    votes: { A: 5623, B: 4102 },
    optionA: '最终破30亿',
    optionB: '破不了',
    oddsA: 2.4,
    oddsB: 1.6,
    status: 'open',
  },
  {
    id: 'n3',
    marketId: 4,
    title: '某顶流明星被曝秘密结婚',
    summary: '路边社情报员在某海岛拍到疑似婚礼照片。经纪公司拒绝回应。',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    type: 'entertainment',
    votes: { A: 8901, B: 3254 },
    optionA: '是真的',
    optionB: '假瓜',
    oddsA: 1.3,
    oddsB: 3.5,
    status: 'open',
  },
  {
    id: 'n4',
    marketId: 5,
    title: '数字货币监管新规或将落地',
    summary: '据可靠消息来源，监管机构正在制定全新的数字货币管理办法，预计年底前发布。',
    image: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=600&q=80',
    type: 'finance',
    votes: { A: 1987, B: 2543 },
    optionA: '年底出台',
    optionB: '继续拖',
    oddsA: 2.2,
    oddsB: 1.7,
    status: 'open',
  },
  {
    id: 'n5',
    marketId: 6,
    title: '国足新帅首秀迎来关键之战',
    summary: '新任主教练将在下周的世预赛中完成首秀，对手实力不俗。球迷又开始许愿了。',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80',
    type: 'sports',
    votes: { A: 1234, B: 6789 },
    optionA: '能赢',
    optionB: '不能',
    oddsA: 4.5,
    oddsB: 1.2,
    status: 'open',
  },
  {
    id: 'n6',
    marketId: 7,
    title: 'AI写的小说拿了文学大奖，评委全程不知情',
    summary: '某知名文学奖揭晓后，获奖作者承认作品由AI辅助完成。主办方陷入两难，正在紧急讨论是否撤销奖项。',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
    type: 'tech',
    votes: { A: 4210, B: 3876 },
    optionA: '应该撤销',
    optionB: '不用撤',
    oddsA: 1.8,
    oddsB: 2.1,
    status: 'open',
  },
  {
    id: 'n7',
    marketId: 8,
    title: '某一线城市宣布取消限购政策',
    summary: '继多个二线城市之后，又一超大城市被曝即将全面放开住房限购。地产股闻风大涨。',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
    type: 'finance',
    votes: { A: 6543, B: 2187 },
    optionA: '房价要涨',
    optionB: '没影响',
    oddsA: 1.5,
    oddsB: 2.8,
    status: 'open',
  },
  {
    id: 'n8',
    marketId: 9,
    title: '奥运会新增电竞为正式比赛项目？',
    summary: '国际奥委会内部文件流出，显示电子竞技有望成为2032年奥运会正式比赛项目。多国电竞协会表态支持。',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80',
    type: 'sports',
    votes: { A: 7891, B: 1543 },
    optionA: '会通过',
    optionB: '不会',
    oddsA: 1.4,
    oddsB: 3.2,
    status: 'open',
  },
  {
    id: 'n9',
    marketId: 10,
    title: '某顶级车企宣布全面停产燃油车',
    summary: '该品牌CEO在发布会上语出惊人，宣布2027年前彻底停产所有燃油车型。股价盘后暴跌8%。',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    type: 'tech',
    votes: { A: 2876, B: 4321 },
    optionA: '说到做到',
    optionB: '打脸',
    oddsA: 2.6,
    oddsB: 1.5,
    status: 'open',
  },
  {
    id: 'n10',
    marketId: 11,
    title: '知名综艺节目被曝全面造假',
    summary: '前工作人员实名爆料，称某王牌综艺节目投票数据全部由后台操控，嘉宾排名早已内定。',
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&q=80',
    type: 'entertainment',
    votes: { A: 9102, B: 1876 },
    optionA: '实锤了',
    optionB: '炒作',
    oddsA: 1.2,
    oddsB: 4.0,
    status: 'open',
  },
  {
    id: 'n11',
    marketId: 12,
    title: '某国突然宣布与邻国断交',
    summary: '据外交消息，两国因领土争议谈判破裂，一方率先召回大使并关闭边境。国际社会紧急斡旋。',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&q=80',
    type: 'politics',
    votes: { A: 3456, B: 5678 },
    optionA: '一个月内复交',
    optionB: '长期僵持',
    oddsA: 2.3,
    oddsB: 1.7,
    status: 'open',
  },
  {
    id: 'n12',
    marketId: 13,
    title: 'NBA总决赛：黑马球队能否创造历史？',
    summary: '常规赛排名第八的球队一路过关斩将杀入总决赛，将对阵卫冕冠军。全联盟都在看这场奇迹能否延续。',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
    type: 'sports',
    votes: { A: 4567, B: 5432 },
    optionA: '黑马夺冠',
    optionB: '卫冕成功',
    oddsA: 3.5,
    oddsB: 1.3,
    status: 'open',
  },
  {
    id: 'n13',
    marketId: 14,
    title: '全球最大加密货币交易所被查',
    summary: '多国监管机构联合行动，冻结该交易所数十亿美元资产。比特币一小时内暴跌15%。',
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80',
    type: 'finance',
    votes: { A: 3210, B: 6789 },
    optionA: '能挺过去',
    optionB: '要凉',
    oddsA: 3.0,
    oddsB: 1.4,
    status: 'open',
  },
];

export const mockRankUsers: RankUser[] = [
  { rank: 1, name: 'LionMaster', avatar: '🦁', coins: 18420, winRate: 0.89, streak: 8 },
  { rank: 2, name: 'DragonSeer', avatar: '🐉', coins: 12850, winRate: 0.83, streak: 5 },
  { rank: 3, name: 'EagleEye', avatar: '🦅', coins: 9310, winRate: 0.71 },
  { rank: 4, name: 'CryptoWolf', avatar: '🐺', coins: 6720, winRate: 0.63 },
  { rank: 5, name: 'TigerBet', avatar: '🐯', coins: 5140, winRate: 0.60, streak: 3 },
  { rank: 6, name: 'SharkFin', avatar: '🦈', coins: 4380, winRate: 0.58 },
  { rank: 7, name: 'PandaPro', avatar: '🐼', coins: 3920, winRate: 0.55 },
  { rank: 12, name: '你', avatar: '🦊', coins: 2480, winRate: 0.68, streak: 5, isMe: true },
];

/* ── Forum types ── */
export interface ForumAuthor {
  name: string;
  handle: string;
  avatar: string;
  avatarUrl?: string;
  verified?: boolean;
  title?: string;
}

export interface ForumComment {
  id: string;
  author: ForumAuthor;
  content: string;
  time: string;
  likes: number;
}

export type ForumTag = '讨论' | '爆料' | '分析';

export interface MockForumEntry {
  id: string;
  author: ForumAuthor;
  tag: ForumTag;
  title?: string;
  content: string;
  images?: string[];
  time: string;
  likes: number;
  comments: ForumComment[];
  commentCount?: number;
  viewCount?: number;
  liked?: boolean;
  favorited?: boolean;
  sticky?: boolean;
  recommend?: boolean;
  ipLocation?: string;
  relatedNewsId?: string;
}
export const FORUM_TAGS: Record<ForumTag, string> = {
  讨论: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  爆料: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  分析: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
  'https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=600&q=80',
];

export const mockCommunityPosts: MockForumEntry[] = [
  {
    id: 'fp1',
    author: { name: 'LionMaster', handle: '@lion_master', avatar: '🦁', verified: true, title: '龟币榜 TOP1' },
    tag: '分析',
    content: '关于科技巨头收购案，我做了一个详细的分析。从过去3年的并购数据来看，这种规模的交易成功率大约在65%左右。但考虑到当前的监管环境，我个人偏向于"不会成功"。大家怎么看？',
    images: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    ],
    time: '10分钟前',
    likes: 42,
    comments: [
      { id: 'c1', author: { name: 'DragonSeer', handle: '@dragon_seer', avatar: '🐉' }, content: '同意你的分析，监管是最大的不确定因素。', time: '8分钟前', likes: 12 },
      { id: 'c2', author: { name: 'EagleEye', handle: '@eagle_eye', avatar: '🦅' }, content: '但如果拆分方案通过呢？之前有先例的。', time: '5分钟前', likes: 7 },
    ],
    relatedNewsId: 'hero-1',
  },
  {
    id: 'fp2',
    author: { name: '路边社情报员', handle: '@roadside_spy', avatar: '🕵️', verified: true, title: '认证情报员' },
    tag: '爆料',
    content: '刚从可靠渠道得到消息：那个人形机器人项目内部已经开始裁员了，量产可能要推迟到明年Q4。利空出尽了兄弟们！',
    images: [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80',
    ],
    time: '25分钟前',
    likes: 89,
    comments: [
      { id: 'c3', author: { name: 'CryptoWolf', handle: '@crypto_wolf', avatar: '🐺' }, content: '消息来源靠谱吗？我刚all in了"能量产"...', time: '20分钟前', likes: 23 },
    ],
    relatedNewsId: 'n1',
  },
  {
    id: 'fp3',
    author: { name: '吃瓜群众小王', handle: '@wang_melon', avatar: '🍉' },
    tag: '讨论',
    content: '顶流结婚这个瓜也太大了吧！照片看起来是真的，但经纪公司不回应也很蹊跷。大家觉得是真是假？我已经押了500龟币在"是真的"上了。',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80',
    ],
    time: '1小时前',
    likes: 156,
    comments: [
      { id: 'c4', author: { name: '八卦小能手', handle: '@gossip_pro', avatar: '🎭' }, content: '照片角度太刁钻了，感觉是路人偷拍的，真实度很高。', time: '50分钟前', likes: 34 },
      { id: 'c5', author: { name: 'LionMaster', handle: '@lion_master', avatar: '🦁' }, content: '经纪公司不回应 = 默认了，这是行业潜规则。', time: '45分钟前', likes: 28 },
      { id: 'c6', author: { name: '你', handle: '@me_fox', avatar: '🦊' }, content: '我也押了"是真的"，冲！', time: '30分钟前', likes: 5 },
    ],
    relatedNewsId: 'n3',
  },
  {
    id: 'fp4',
    author: { name: 'DragonSeer', handle: '@dragon_seer', avatar: '🐉', verified: true, title: '预言家' },
    tag: '分析',
    content: '数字货币新规这个事，我研究了一下政策走向。个人判断年底前一定会出台，但力度可能没大家想的那么大。建议保守押注。',
    time: '2小时前',
    likes: 67,
    comments: [],
    relatedNewsId: 'n4',
  },
  {
    id: 'fp5',
    author: { name: '快乐球迷', handle: '@happy_fan', avatar: '⚽' },
    tag: '讨论',
    content: '国足新帅首秀，说句实话...我觉得这次真的有戏！新教练的战术体系很不错，训练赛表现也挺好的。虽然每次都被打脸，但这次我选择相信！赔率4.5x太香了！',
    images: [
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80',
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80',
    ],
    time: '3小时前',
    likes: 231,
    comments: [],
    relatedNewsId: 'n5',
  },
];



/* ── Battle types ── */
export type BattleSide = 'A' | 'B';
export type BattleStatus = 'waiting' | 'active' | 'resolved';

export interface BattleParticipant {
  name: string;
  avatar: string;
  side: BattleSide;
}

export interface Battle {
  id: string;
  topic: string;
  optionA: string;
  optionB: string;
  creator: BattleParticipant;
  challenger: BattleParticipant | null;
  wager: number;
  status: BattleStatus;
  winner: BattleSide | null;
  createdTime: string;
  relatedNewsId?: string;
}

export const BATTLE_STATUS_LABELS: Record<BattleStatus, string> = {
  waiting: '等待应战',
  active: '对局中',
  resolved: '已结算',
};

export const BATTLE_STATUS_COLORS: Record<BattleStatus, string> = {
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  active: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-slate-100 text-slate-500 dark:bg-rdark-input dark:text-rdark-text2',
};

export const mockBattles: Battle[] = [
  {
    id: 'bt1',
    topic: '科技巨头收购案会成功吗？',
    optionA: '会成功',
    optionB: '不会成功',
    creator: { name: 'LionMaster', avatar: '🦁', side: 'A' },
    challenger: { name: 'DragonSeer', avatar: '🐉', side: 'B' },
    wager: 500,
    status: 'active',
    winner: null,
    createdTime: '30分钟前',
    relatedNewsId: 'hero-1',
  },
  {
    id: 'bt2',
    topic: '国足新帅首秀能赢吗？',
    optionA: '能赢',
    optionB: '不能赢',
    creator: { name: '快乐球迷', avatar: '⚽', side: 'A' },
    challenger: null,
    wager: 200,
    status: 'waiting',
    winner: null,
    createdTime: '1小时前',
    relatedNewsId: 'n5',
  },
  {
    id: 'bt3',
    topic: '顶流明星结婚是真瓜还是假瓜？',
    optionA: '真瓜',
    optionB: '假瓜',
    creator: { name: '吃瓜群众小王', avatar: '🍉', side: 'A' },
    challenger: { name: 'CryptoWolf', avatar: '🐺', side: 'B' },
    wager: 300,
    status: 'resolved',
    winner: 'A',
    createdTime: '3小时前',
    relatedNewsId: 'n3',
  },
  {
    id: 'bt4',
    topic: '人形机器人年底前能量产吗？',
    optionA: '能量产',
    optionB: '不能',
    creator: { name: 'EagleEye', avatar: '🦅', side: 'B' },
    challenger: null,
    wager: 1000,
    status: 'waiting',
    winner: null,
    createdTime: '2小时前',
    relatedNewsId: 'n1',
  },
];

/* ── Announcement types ── */
export interface Announcement {
  id: string;
  icon: string;
  text: string;
  highlight?: boolean;
}

export const mockAnnouncements: Announcement[] = [
  { id: 'a1', icon: '🎉', text: '周末双倍龟币活动开启中', highlight: true },
  { id: 'a2', icon: '⚔️', text: '对局功能正式上线！快来挑战' },
  { id: 'a3', icon: '🏆', text: '本周排行榜奖励已发放' },
];

export const TYPE_LABELS = {
  politics: '时政',
  tech: '科技',
  sports: '体育',
  entertainment: '娱乐',
  finance: '财经',
};

export const TYPE_COLORS = {
  politics: 'bg-red-100/70 text-red-600',
  tech: 'bg-blue-100/70 text-blue-600',
  sports: 'bg-green-100/70 text-green-600',
  entertainment: 'bg-purple-100/70 text-purple-600',
  finance: 'bg-amber-100/70 text-amber-700',
};

/* ── Pet Page types & mock data ── */

export type PetMood = '开心' | '兴奋' | '平静' | '困倦' | '饥饿';
export type PetRarity = 'N' | 'R' | 'SR' | 'SSR';
export type SkillType = 'passive' | 'active';

export interface PetSkill {
  id: string;
  name: string;
  icon: string;
  type: SkillType;
  description: string;
  level: number;
  maxLevel: number;
  effect: string;
  cooldown?: string;
  unlocked: boolean;
}

export interface PetTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  total: number;
  reward: number;
  rewardType: 'coin' | 'xp' | 'item';
  completed: boolean;
  category: 'daily' | 'weekly' | 'story';
}

export interface PetAchievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedTime?: string;
  rarity: PetRarity;
}

export interface PetSkin {
  id: string;
  name: string;
  avatar: string;
  description: string;
  rarity: PetRarity;
  owned: boolean;
  equipped: boolean;
  price?: number;
  source: string;
}

export interface PetMemory {
  id: string;
  type: 'prediction' | 'battle' | 'milestone' | 'dialogue';
  title: string;
  description: string;
  time: string;
  icon: string;
  highlight?: boolean;
}

export const mockPetSkills: PetSkill[] = [
  { id: 'ps1', name: '龟壳护盾', icon: '🛡️', type: 'passive', description: '每日首次预测失败时，返还 30% 龟币', level: 3, maxLevel: 5, effect: '返还 30% 龟币', unlocked: true },
  { id: 'ps2', name: '情报嗅觉', icon: '👃', type: 'passive', description: '热点新闻更新时优先通知，比普通用户早 10 分钟', level: 2, maxLevel: 5, effect: '早 10 分钟通知', unlocked: true },
  { id: 'ps3', name: '幸运龟甲', icon: '🍀', type: 'passive', description: '每日签到额外获得 10% 龟币奖励', level: 4, maxLevel: 5, effect: '+10% 签到奖励', unlocked: true },
  { id: 'ps4', name: '龟速分析', icon: '🔍', type: 'active', description: '消耗 50 体力值，对指定事件进行深度分析并给出胜率预测', level: 2, maxLevel: 3, effect: '深度分析预测', cooldown: '30分钟', unlocked: true },
  { id: 'ps5', name: '龟仙冥想', icon: '🧘', type: 'active', description: '消耗 200 龟币，快速恢复全部体力值', level: 1, maxLevel: 3, effect: '恢复全部体力', cooldown: '2小时', unlocked: true },
  { id: 'ps6', name: '千年龟息', icon: '💤', type: 'active', description: '进入休眠模式，每小时自动获得少量龟币', level: 0, maxLevel: 3, effect: '自动挂机收益', cooldown: '12小时', unlocked: false },
  { id: 'ps7', name: '龟壳共鸣', icon: '✨', type: 'passive', description: '与好友同时下注相同选项时，赔率额外 +5%', level: 0, maxLevel: 5, effect: '+5% 赔率', unlocked: false },
];

export const mockPetTasks: PetTask[] = [
  { id: 'pt1', title: '今日签到', description: '完成每日签到', icon: '📅', progress: 1, total: 1, reward: 50, rewardType: 'coin', completed: true, category: 'daily' },
  { id: 'pt2', title: '预测达人', description: '今日完成 3 次预测', icon: '🎯', progress: 2, total: 3, reward: 100, rewardType: 'coin', completed: false, category: 'daily' },
  { id: 'pt3', title: '社区互动', description: '在论坛发帖或评论 2 次', icon: '💬', progress: 1, total: 2, reward: 30, rewardType: 'xp', completed: false, category: 'daily' },
  { id: 'pt4', title: '和龟仙人聊天', description: '与宠物对话 1 次', icon: '🗣️', progress: 0, total: 1, reward: 20, rewardType: 'xp', completed: false, category: 'daily' },
  { id: 'pt5', title: '周预测王', description: '本周累计预测 15 次', icon: '👑', progress: 8, total: 15, reward: 500, rewardType: 'coin', completed: false, category: 'weekly' },
  { id: 'pt6', title: '对局先锋', description: '本周完成 3 场对局', icon: '⚔️', progress: 1, total: 3, reward: 300, rewardType: 'coin', completed: false, category: 'weekly' },
  { id: 'pt7', title: '初入龟途', description: '完成新手引导全部步骤', icon: '🐣', progress: 5, total: 5, reward: 200, rewardType: 'coin', completed: true, category: 'story' },
  { id: 'pt8', title: '百战之龟', description: '累计完成 100 次预测', icon: '🏅', progress: 42, total: 100, reward: 1000, rewardType: 'coin', completed: false, category: 'story' },
];

export const mockPetAchievements: PetAchievement[] = [
  { id: 'pa1', name: '初来乍到', icon: '🎉', description: '完成首次预测', unlocked: true, unlockedTime: '2025-12-01', rarity: 'N' },
  { id: 'pa2', name: '连胜之星', icon: '⭐', description: '达成 5 连胜', unlocked: true, unlockedTime: '2026-01-15', rarity: 'R' },
  { id: 'pa3', name: '万币户', icon: '💰', description: '余额突破 10,000 龟币', unlocked: true, unlockedTime: '2026-02-03', rarity: 'R' },
  { id: 'pa4', name: '预言家', icon: '🔮', description: '连续正确预测 7 次', unlocked: true, unlockedTime: '2026-02-20', rarity: 'SR' },
  { id: 'pa5', name: '社区之光', icon: '🌟', description: '帖子获赞超过 100', unlocked: false, rarity: 'SR' },
  { id: 'pa6', name: '龟仙传人', icon: '🐢', description: '宠物达到 Lv.50', unlocked: false, rarity: 'SSR' },
  { id: 'pa7', name: '赌神', icon: '🎰', description: '单次预测盈利超过 5,000 龟币', unlocked: false, rarity: 'SSR' },
  { id: 'pa8', name: '情报大亨', icon: '🕵️', description: '在 3 个不同领域各预测对 10 次', unlocked: false, rarity: 'SR' },
];

export const mockPetSkins: PetSkin[] = [
  { id: 'sk1', name: '经典龟仙', avatar: '🐢', description: '初始默认造型', rarity: 'N', owned: true, equipped: true, source: '初始赠送' },
  { id: 'sk2', name: '黄金甲', avatar: '🐢', description: '金光闪闪的龟壳铠甲', rarity: 'SR', owned: true, equipped: false, source: '签到 30 天' },
  { id: 'sk3', name: '忍者龟', avatar: '🥷', description: '隐秘行动，暗影忍者', rarity: 'SR', owned: true, equipped: false, source: '成就「预言家」解锁' },
  { id: 'sk4', name: '赛博龟', avatar: '🤖', description: '来自未来的机械龟仙', rarity: 'SSR', owned: false, equipped: false, price: 2000, source: '商店购买' },
  { id: 'sk5', name: '圣诞龟', avatar: '🎅', description: 'Ho Ho Ho! 圣诞限定', rarity: 'SR', owned: false, equipped: false, price: 1500, source: '圣诞限定活动' },
  { id: 'sk6', name: '海盗龟', avatar: '🏴‍☠️', description: '扬帆起航，寻找宝藏', rarity: 'R', owned: false, equipped: false, price: 800, source: '商店购买' },
  { id: 'sk7', name: '太空龟', avatar: '🚀', description: '探索宇宙的龟航员', rarity: 'SSR', owned: false, equipped: false, source: '成就「赌神」解锁' },
  { id: 'sk8', name: '花园龟', avatar: '🌺', description: '在花丛中悠闲漫步', rarity: 'R', owned: true, equipped: false, source: '签到 7 天' },
];

export const mockPetMemories: PetMemory[] = [
  { id: 'pm1', type: 'milestone', title: '龟仙人来到你身边', description: '你领养了龟仙人，开始了一段奇妙的预测之旅', time: '2025-12-01', icon: '🎊', highlight: true },
  { id: 'pm2', type: 'prediction', title: '首次预测成功', description: '「科技巨头收购案」选择「会成功」—— 赢得 210 龟币', time: '2025-12-05', icon: '🎯' },
  { id: 'pm3', type: 'battle', title: '首次对局胜利', description: '在「国足世预赛」话题中击败 CryptoWolf', time: '2026-01-10', icon: '⚔️' },
  { id: 'pm4', type: 'milestone', title: '达成 5 连胜', description: '连续 5 次预测全部正确，获得「连胜之星」成就', time: '2026-01-15', icon: '⭐', highlight: true },
  { id: 'pm5', type: 'dialogue', title: '龟仙人的预言', description: '「主人，我感觉人形机器人这个话题有大变数...」—— 次日果然爆冷', time: '2026-02-01', icon: '💬' },
  { id: 'pm6', type: 'milestone', title: '余额突破万币', description: '龟币余额首次突破 10,000，距离龟仙传人更近一步', time: '2026-02-03', icon: '💰', highlight: true },
  { id: 'pm7', type: 'prediction', title: '史诗级翻盘', description: '「顶流结婚瓜」以 3.5x 赔率押中，一把赚 3,500 龟币', time: '2026-02-15', icon: '🎰', highlight: true },
  { id: 'pm8', type: 'battle', title: '连胜被终结', description: '在「数字货币新规」对局中惜败 DragonSeer', time: '2026-02-18', icon: '💔' },
];

/* ── Shop: Apple items ── */
export const shopApples: ShopItem[] = [
  { id: 'apple1', name: '小苹果', icon: '🍎', description: '补充少量体力', price: 50, effect: { type: 'stamina', value: 2 } },
  { id: 'apple2', name: '大苹果', icon: '🍏', description: '补充中等体力', price: 100, effect: { type: 'stamina', value: 5 } },
  { id: 'apple3', name: '黄金苹果', icon: '✨', description: '完全恢复体力', price: 180, effect: { type: 'stamina', value: 10 } },
];

/* ── Duplicate skin refund values ── */
export const DUPE_REFUND: Record<PetRarity, number> = { N: 20, R: 50, SR: 150, SSR: 500 };

export const RARITY_COLORS: Record<PetRarity, string> = {
  N: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  R: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  SR: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  SSR: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

export const RARITY_BORDER_COLORS: Record<PetRarity, string> = {
  N: 'border-slate-200 dark:border-slate-700',
  R: 'border-blue-200 dark:border-blue-800',
  SR: 'border-purple-200 dark:border-purple-800',
  SSR: 'border-amber-300 dark:border-amber-700',
};

/* ── Event Battle Comment types ── */
export type CommentSide = 'A' | 'B';
export type EggStatus = 'egg' | 'turtle' | 'destroyed';

export interface EventReply {
  id: string;
  author: { name: string; avatar: string };
  side: CommentSide;
  content: string;
  time: string;
  likes: number;
}

export interface EventComment {
  id: string;
  newsId: string;
  side: CommentSide;
  author: { name: string; avatar: string };
  content: string;
  time: string;
  likes: number;
  dislikes?: number;
  replies?: EventReply[];
  eggStatus: EggStatus;
  posX: number;
  posY: number;
}

export const mockEventComments: EventComment[] = [
  {
    id: 'ec1', newsId: 'hero-1', side: 'A', author: { name: 'LionMaster', avatar: '🦁' },
    content: '绝对会成功，这种量级的收购不可能半途而废！', time: '5分钟前', likes: 23,
    eggStatus: 'turtle', posX: 20, posY: 35,
    replies: [
      { id: 'er1', author: { name: 'DragonSeer', avatar: '🐉' }, side: 'B', content: '你这是盲目乐观，数据不支持你的观点', time: '4分钟前', likes: 5 },
      { id: 'er2', author: { name: '吃瓜群众小王', avatar: '🍉' }, side: 'A', content: '说得对！加大力度！', time: '3分钟前', likes: 8 },
    ],
  },
  {
    id: 'ec2', newsId: 'hero-1', side: 'B', author: { name: 'DragonSeer', avatar: '🐉' },
    content: '监管压力太大了，看看之前被否的案例吧', time: '4分钟前', likes: 15,
    eggStatus: 'turtle', posX: 65, posY: 30,
    replies: [
      { id: 'er3', author: { name: 'EagleEye', avatar: '🦅' }, side: 'A', content: '你看看最新内部消息再来评价', time: '3分钟前', likes: 3 },
    ],
  },
  { id: 'ec3', newsId: 'hero-1', side: 'A', author: { name: '吃瓜群众小王', avatar: '🍉' }, content: '我押了500龟币在成功上，这波稳了', time: '3分钟前', likes: 7, eggStatus: 'egg', posX: 55, posY: 60 },
  {
    id: 'ec4', newsId: 'hero-1', side: 'B', author: { name: 'CryptoWolf', avatar: '🐺' },
    content: '反垄断法会阻止这笔交易，信我', time: '3分钟前', likes: 12,
    eggStatus: 'turtle', posX: 30, posY: 55,
    replies: [
      { id: 'er4', author: { name: 'TigerBet', avatar: '🐯' }, side: 'A', content: '反垄断法？这次完全不同的情况好吧', time: '2分钟前', likes: 7 },
    ],
  },
  { id: 'ec5', newsId: 'hero-1', side: 'A', author: { name: 'EagleEye', avatar: '🦅' }, content: '消息面看好，内部人士已经在庆祝了', time: '2分钟前', likes: 4, eggStatus: 'egg', posX: 75, posY: 40 },
  { id: 'ec6', newsId: 'hero-1', side: 'B', author: { name: '八卦小能手', avatar: '🎭' }, content: '上次也是这么说的，结果黄了', time: '2分钟前', likes: 2, eggStatus: 'destroyed', posX: 45, posY: 70 },
  { id: 'ec7', newsId: 'hero-1', side: 'A', author: { name: 'TigerBet', avatar: '🐯' }, content: '双方都有意愿，只是时间问题', time: '1分钟前', likes: 8, eggStatus: 'egg', posX: 35, posY: 25 },
  { id: 'ec8', newsId: 'hero-1', side: 'B', author: { name: 'SharkFin', avatar: '🦈' }, content: '股东大会还没过呢，别太乐观', time: '1分钟前', likes: 5, eggStatus: 'egg', posX: 50, posY: 45 },
  { id: 'ec9', newsId: 'hero-1', side: 'A', author: { name: '你', avatar: '🦊' }, content: '看好这次收购，all in!', time: '刚刚', likes: 1, eggStatus: 'egg', posX: 80, posY: 55 },
  { id: 'ec10', newsId: 'hero-1', side: 'B', author: { name: 'PandaPro', avatar: '🐼' }, content: '冷静分析一下，风险还是很大的', time: '刚刚', likes: 3, eggStatus: 'egg', posX: 20, posY: 65 },
];
