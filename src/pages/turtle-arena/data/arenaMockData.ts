/**
 * 文件说明：龟战 Arena 本地预览数据，包含龟队、技能树、排位段位、公会、市场、任务等占位数据。
 * 真实接口接入前，所有 Section 都基于此文件渲染，便于按概念图先把视觉跑通。
 */

export type ArenaRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface ArenaTurtle {
  /** 与 /public/games/turtle-battle/assets/avatars/{id}.png 文件名对应 */
  id: string;
  /** 中文龟种名称（来自龟龟对战 pets.js） */
  name: string;
  /** 卡片上显示的「定位」描述 */
  title: string;
  /** PNG 头像绝对路径 */
  avatar: string;
  /** 稀有度（沿用龟龟对战 C/B/A/S/SS/SSS 体系） */
  rarity: ArenaRarity;
  level: number;
  hp: number;
  atk: number;
  def: number;
  /** 魔抗，沿用龟龟对战 mr 字段 */
  spd: number;
  /** 是否在当前 3 龟出战阵容中 */
  equipped: boolean;
  /** 卡片渐变主色调，与稀有度松绑、按龟种气质命中 */
  tone: 'amber' | 'sky' | 'rose' | 'emerald' | 'violet' | 'cyan';
}

/** 龟种气质色 → 卡片渐变背景（同时供详情弹框与列表卡复用） */
export const TURTLE_TONE_BG: Record<'amber' | 'sky' | 'rose' | 'emerald' | 'violet' | 'cyan', string> = {
  amber: 'linear-gradient(135deg,#1f1408 0%,#42230b 60%,#7c3f0f 100%)',
  sky: 'linear-gradient(135deg,#06192a 0%,#0e3a55 60%,#1e6a92 100%)',
  rose: 'linear-gradient(135deg,#220812 0%,#4a0f24 60%,#8a1f3f 100%)',
  emerald: 'linear-gradient(135deg,#06201a 0%,#0a4a3a 60%,#157a5e 100%)',
  violet: 'linear-gradient(135deg,#1a0a2a 0%,#3a1c5e 60%,#5e2da6 100%)',
  cyan: 'linear-gradient(135deg,#03242b 0%,#0a5a6a 60%,#168aa0 100%)',
};

/** 龟种气质色 → 详情弹框背景柔光 rgba */
export const TURTLE_TONE_GLOW: Record<'amber' | 'sky' | 'rose' | 'emerald' | 'violet' | 'cyan', string> = {
  amber: 'rgba(245,158,11,0.34)',
  sky: 'rgba(14,165,233,0.32)',
  rose: 'rgba(244,63,94,0.36)',
  emerald: 'rgba(16,185,129,0.34)',
  violet: 'rgba(167,139,250,0.34)',
  cyan: 'rgba(6,182,212,0.32)',
};

/** 稀有度 → 通用 RGB tone（用于徽章颜色与背景渐变兜底） */
export const RARITY_TONE: Record<string, string> = {
  C: 'border-zinc-400/40 bg-zinc-500/12 text-zinc-200',
  B: 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200',
  A: 'border-sky-400/40 bg-sky-500/12 text-sky-200',
  S: 'border-amber-400/45 bg-amber-500/14 text-amber-200',
  SS: 'border-violet-400/45 bg-violet-500/14 text-violet-200',
  SSS: 'border-rose-400/50 bg-rose-500/16 text-rose-200',
  N: 'border-zinc-400/40 bg-zinc-500/12 text-zinc-200',
  R: 'border-sky-400/40 bg-sky-500/12 text-sky-200',
  SR: 'border-violet-400/45 bg-violet-500/14 text-violet-200',
  SSR: 'border-amber-400/45 bg-amber-500/14 text-amber-200',
  UR: 'border-rose-400/50 bg-rose-500/16 text-rose-200',
};

const TURTLE_BATTLE_AVATAR_BASE = '/games/turtle-battle/assets/avatars';

export interface ArenaSkillNode {
  id: string;
  name: string;
  icon: string;
  level: number;
  maxLevel: number;
  unlocked: boolean;
  description: string;
  branch: 'attack' | 'defense' | 'support';
}

export interface ArenaEquipment {
  id: string;
  name: string;
  slot: '武器' | '护甲' | '饰品' | '坐骑';
  rarity: ArenaRarity;
  icon: string;
  equipped: boolean;
  bonus: string;
}

export interface ArenaSeasonReward {
  id: string;
  tier: string;
  label: string;
  icon: string;
  tone: 'amber' | 'sky' | 'violet' | 'rose';
}

export interface ArenaQueueState {
  status: 'idle' | 'matching' | 'found';
  elapsedSeconds: number;
  estimatedSeconds: number;
  mode: '快速匹配' | '野生对局' | '排位赛' | '休闲混战';
}

export interface ArenaGuildMember {
  id: string;
  name: string;
  rank: '会长' | '副会' | '精英' | '成员';
  power: number;
  online: boolean;
}

export interface ArenaMarketItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  currency: '龟币' | '荣誉';
  desc: string;
  stockLeft?: number;
}

export interface ArenaTask {
  id: string;
  title: string;
  reward: string;
  progress: number;
  total: number;
  category: 'daily' | 'weekly' | 'season';
}

/**
 * 完整 28 只龟种，与 /public/games/turtle-battle/js/pets.js 一一对应。
 * 头像走 PNG（/games/turtle-battle/assets/avatars/{id}.png），属性来自 pets.js。
 * 出战阵容默认勾选三种代表性高稀有度：龟壳(SSS) / 缩头乌龟(SS) / 凤凰龟(S)。
 */
export const mockArenaTurtles: ArenaTurtle[] = [
  { id: 'shell',     name: '龟壳',     title: '终极王牌',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/shell.png`,     rarity: 'SSS', level: 60, hp: 414, atk: 48, def: 21, spd: 21, equipped: true,  tone: 'rose' },
  { id: 'hiding',    name: '缩头乌龟', title: '硬核坦克',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/hiding.png`,    rarity: 'SS',  level: 55, hp: 426, atk: 39, def: 25, spd: 24, equipped: true,  tone: 'violet' },
  { id: 'headless',  name: '无头龟',   title: '亡灵狂战士', avatar: `${TURTLE_BATTLE_AVATAR_BASE}/headless.png`,  rarity: 'SS',  level: 54, hp: 350, atk: 39, def: 13, spd: 12, equipped: true,  tone: 'violet' },
  { id: 'phoenix',   name: '凤凰龟',   title: '不灭烈焰',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/phoenix.png`,   rarity: 'S',   level: 48, hp: 330, atk: 42, def: 12, spd: 15, equipped: false, tone: 'rose' },
  { id: 'lava',      name: '熔岩龟',   title: '近战 DPS',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/lava.png`,      rarity: 'S',   level: 47, hp: 290, atk: 40, def: 14, spd: 16, equipped: false, tone: 'rose' },
  { id: 'cyber',     name: '赛博龟',   title: '机械刺客',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/cyber.png`,     rarity: 'S',   level: 46, hp: 360, atk: 47, def: 14, spd: 13, equipped: false, tone: 'cyan' },
  { id: 'crystal',   name: '水晶龟',   title: '魔法守护',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/crystal.png`,   rarity: 'S',   level: 46, hp: 382, atk: 44, def: 21, spd: 23, equipped: false, tone: 'violet' },
  { id: 'chest',     name: '宝箱龟',   title: '财宝侵略者', avatar: `${TURTLE_BATTLE_AVATAR_BASE}/chest.png`,     rarity: 'S',   level: 45, hp: 345, atk: 40, def: 16, spd: 14, equipped: false, tone: 'amber' },
  { id: 'space',     name: '星际龟',   title: '星辉真伤',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/space.png`,     rarity: 'S',   level: 45, hp: 349, atk: 45, def: 13, spd: 15, equipped: false, tone: 'sky' },
  { id: 'rainbow',   name: '彩虹龟',   title: '七彩万能',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/rainbow.png`,   rarity: 'A',   level: 38, hp: 360, atk: 40, def: 15, spd: 17, equipped: false, tone: 'rose' },
  { id: 'gambler',   name: '赌神龟',   title: '极致暴击',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/gambler.png`,   rarity: 'A',   level: 38, hp: 329, atk: 47, def: 11, spd: 11, equipped: false, tone: 'amber' },
  { id: 'hunter',    name: '猎人龟',   title: '远程射手',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/hunter.png`,    rarity: 'A',   level: 37, hp: 339, atk: 43, def: 13, spd: 11, equipped: false, tone: 'emerald' },
  { id: 'pirate',    name: '海盗龟',   title: '掠夺战士',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/pirate.png`,    rarity: 'A',   level: 36, hp: 371, atk: 41, def: 15, spd: 13, equipped: false, tone: 'amber' },
  { id: 'candy',     name: '糖果龟',   title: '甜蜜辅助',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/candy.png`,     rarity: 'A',   level: 36, hp: 360, atk: 40, def: 15, spd: 16, equipped: false, tone: 'rose' },
  { id: 'bubble',    name: '泡泡龟',   title: '泡沫法师',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/bubble.png`,    rarity: 'A',   level: 35, hp: 350, atk: 39, def: 18, spd: 19, equipped: false, tone: 'cyan' },
  { id: 'line',      name: '线条龟',   title: '极速突击',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/line.png`,      rarity: 'A',   level: 34, hp: 332, atk: 46, def: 10, spd: 11, equipped: false, tone: 'sky' },
  { id: 'lightning', name: '闪电龟',   title: '雷霆爆破',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/lightning.png`, rarity: 'A',   level: 34, hp: 329, atk: 42, def: 10, spd: 13, equipped: false, tone: 'amber' },
  { id: 'angel',     name: '天使龟',   title: '神圣治疗',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/angel.png`,     rarity: 'B',   level: 28, hp: 340, atk: 41, def: 13, spd: 16, equipped: false, tone: 'sky' },
  { id: 'ice',       name: '寒冰龟',   title: '冰封控制',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/ice.png`,       rarity: 'B',   level: 28, hp: 381, atk: 41, def: 16, spd: 18, equipped: false, tone: 'cyan' },
  { id: 'ninja',     name: '忍者龟',   title: '影袭刺杀',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/ninja.png`,     rarity: 'B',   level: 27, hp: 329, atk: 47, def: 9,  spd: 7,  equipped: false, tone: 'violet' },
  { id: 'two_head',  name: '双头龟',   title: '双形态战士', avatar: `${TURTLE_BATTLE_AVATAR_BASE}/two_head.png`,  rarity: 'B',   level: 27, hp: 302, atk: 50, def: 11, spd: 12, equipped: false, tone: 'violet' },
  { id: 'ghost',     name: '幽灵龟',   title: '幽冥诅咒',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/ghost.png`,     rarity: 'B',   level: 26, hp: 319, atk: 43, def: 10, spd: 10, equipped: false, tone: 'violet' },
  { id: 'diamond',   name: '钻石龟',   title: '坚硬反伤',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/diamond.png`,   rarity: 'B',   level: 26, hp: 361, atk: 38, def: 21, spd: 18, equipped: false, tone: 'cyan' },
  { id: 'fortune',   name: '财神龟',   title: '招财开运',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/fortune.png`,   rarity: 'B',   level: 25, hp: 385, atk: 39, def: 19, spd: 16, equipped: false, tone: 'amber' },
  { id: 'dice',      name: '骰子龟',   title: '概率玩家',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/dice.png`,      rarity: 'B',   level: 24, hp: 330, atk: 41, def: 11, spd: 10, equipped: false, tone: 'rose' },
  { id: 'basic',     name: '小龟',     title: '不屈新兵',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/basic.png`,     rarity: 'C',   level: 12, hp: 350, atk: 40, def: 14, spd: 13, equipped: false, tone: 'emerald' },
  { id: 'stone',     name: '石头龟',   title: '坚壁岩盾',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/stone.png`,     rarity: 'C',   level: 12, hp: 380, atk: 36, def: 18, spd: 15, equipped: false, tone: 'sky' },
  { id: 'bamboo',    name: '竹叶龟',   title: '生长治疗',   avatar: `${TURTLE_BATTLE_AVATAR_BASE}/bamboo.png`,    rarity: 'C',   level: 12, hp: 318, atk: 40, def: 10, spd: 11, equipped: false, tone: 'emerald' },
];

export const mockArenaSkillNodes: ArenaSkillNode[] = [
  { id: 'sk-a1', name: '烈焰冲击', icon: '🔥', level: 3, maxLevel: 5, unlocked: true, description: '对单体造成 240% 攻击力火焰伤害，并附加 2 回合灼烧。', branch: 'attack' },
  { id: 'sk-a2', name: '影袭斩击', icon: '🗡️', level: 2, maxLevel: 5, unlocked: true, description: '突进至目标后方，造成 180% 暴击伤害。', branch: 'attack' },
  { id: 'sk-a3', name: '陨星天降', icon: '☄️', level: 0, maxLevel: 5, unlocked: false, description: '对范围内所有敌人造成 320% 攻击力伤害（需主线 Lv.42）。', branch: 'attack' },
  { id: 'sk-d1', name: '龟甲屏障', icon: '🛡️', level: 4, maxLevel: 5, unlocked: true, description: '为队伍提供等同 12% 最大生命值的护盾，持续 3 回合。', branch: 'defense' },
  { id: 'sk-d2', name: '钢筋骨骼', icon: '🦴', level: 2, maxLevel: 5, unlocked: true, description: '自身防御提升 35%，并对反击伤害提升 20%。', branch: 'defense' },
  { id: 'sk-s1', name: '青藤恢复', icon: '🌿', level: 3, maxLevel: 5, unlocked: true, description: '为目标恢复 30% 最大生命值，并清除一个负面状态。', branch: 'support' },
  { id: 'sk-s2', name: '士气号角', icon: '📯', level: 1, maxLevel: 5, unlocked: true, description: '全队攻击 +18%，速度 +10%，持续 2 回合。', branch: 'support' },
  { id: 'sk-s3', name: '虚空回响', icon: '🌀', level: 0, maxLevel: 5, unlocked: false, description: '使队伍下一次技能必定暴击（需公会等级 5）。', branch: 'support' },
];

export const mockArenaEquipment: ArenaEquipment[] = [
  { id: 'eq1', name: '玄铁巨盾', slot: '护甲', rarity: 'SR', icon: '🛡️', equipped: true, bonus: '防御 +120 · 受到伤害 -8%' },
  { id: 'eq2', name: '霜月战弩', slot: '武器', rarity: 'SSR', icon: '🏹', equipped: true, bonus: '攻击 +210 · 暴击率 +12%' },
  { id: 'eq3', name: '熔岩双刃', slot: '武器', rarity: 'SR', icon: '🔥', equipped: false, bonus: '攻击 +180 · 灼烧伤害 +20%' },
  { id: 'eq4', name: '翡翠之心', slot: '饰品', rarity: 'SR', icon: '💚', equipped: true, bonus: '生命 +680 · 治疗效果 +15%' },
  { id: 'eq5', name: '影翼斗篷', slot: '护甲', rarity: 'R', icon: '🪽', equipped: false, bonus: '速度 +24 · 闪避率 +5%' },
  { id: 'eq6', name: '雷霆指环', slot: '饰品', rarity: 'SR', icon: '⚡', equipped: false, bonus: '攻击 +90 · 技能伤害 +10%' },
];

export const mockArenaSeasonRewards: ArenaSeasonReward[] = [
  { id: 'r-gold', tier: '黄金', label: '黄金宝箱 · 限定皮肤', icon: '🥇', tone: 'amber' },
  { id: 'r-diamond', tier: '钻石', label: '钻石宝箱 · 史诗装备', icon: '💎', tone: 'sky' },
  { id: 'r-master', tier: '大师', label: '大师礼包 · 头像框', icon: '🏆', tone: 'violet' },
  { id: 'r-king', tier: '王者', label: '王者印记 · 全服展示', icon: '👑', tone: 'rose' },
];

export const mockArenaGuildMembers: ArenaGuildMember[] = [
  { id: 'g1', name: '梁海龟王', rank: '会长', power: 18420, online: true },
  { id: 'g2', name: '深海罗刹', rank: '副会', power: 16380, online: true },
  { id: 'g3', name: '青藤先知', rank: '精英', power: 14250, online: true },
  { id: 'g4', name: '熔岩之拳', rank: '精英', power: 13890, online: false },
  { id: 'g5', name: '霜月行者', rank: '成员', power: 11220, online: true },
  { id: 'g6', name: '岩心铁壁', rank: '成员', power: 10560, online: false },
];

export const mockArenaMarketItems: ArenaMarketItem[] = [
  { id: 'm1', name: '限定皮肤 · 梅西之龟', icon: '⚽', price: 4800, currency: '荣誉', desc: '开撕台胜利阵营专属联动皮肤', stockLeft: 42 },
  { id: 'm2', name: '荣誉宝箱 (Lv.10)', icon: '🎁', price: 2400, currency: '荣誉', desc: '必出 SR 及以上装备', stockLeft: 128 },
  { id: 'm3', name: '体力恢复药剂 ×5', icon: '🧪', price: 480, currency: '龟币', desc: '快速恢复 250 点体力', stockLeft: 999 },
  { id: 'm4', name: '高级头像框 · 烽火', icon: '🖼️', price: 1800, currency: '荣誉', desc: '限时 30 天展示', stockLeft: 86 },
  { id: 'm5', name: '排位保护券', icon: '🛡️', price: 720, currency: '龟币', desc: '本周失败 1 次不掉星', stockLeft: 999 },
  { id: 'm6', name: '皮肤碎片 · 紫晶', icon: '🔮', price: 320, currency: '荣誉', desc: '集齐 30 块兑换紫晶皮肤', stockLeft: 999 },
];

export const mockArenaTasks: ArenaTask[] = [
  { id: 'tk1', title: '完成 3 场快速匹配', reward: '+200 龟币 · +50 荣誉', progress: 2, total: 3, category: 'daily' },
  { id: 'tk2', title: '使用 3 个不同龟种出战', reward: '+1 荣誉宝箱', progress: 1, total: 3, category: 'daily' },
  { id: 'tk3', title: '排位赛累计胜利 5 场', reward: '+500 龟币 · +1 段位券', progress: 3, total: 5, category: 'weekly' },
  { id: 'tk4', title: '解锁 1 个新技能节点', reward: '+200 荣誉', progress: 0, total: 1, category: 'weekly' },
  { id: 'tk5', title: '本赛季打到黄金 I', reward: '+黄金宝箱 · +限定皮肤', progress: 3, total: 4, category: 'season' },
  { id: 'tk6', title: '本赛季累计 100 场对战', reward: '+赛季冠军头像框', progress: 42, total: 100, category: 'season' },
];

export const initialArenaQueue: ArenaQueueState = {
  status: 'matching',
  elapsedSeconds: 12,
  estimatedSeconds: 45,
  mode: '快速匹配',
};

export const ARENA_SEASON = {
  name: 'S1 赛季',
  range: '2024.06.01 - 2024.08.31',
  myRank: '黄金 III',
  myPoints: 2480,
  pointsToNext: 2800,
  globalRank: 1245,
  onlinePlayers: 12421,
  dailyMatchesLeft: 8,
  dailyMatchesMax: 10,
};
