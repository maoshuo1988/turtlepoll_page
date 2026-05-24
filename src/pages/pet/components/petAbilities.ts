/**
 * 文件说明：pet Abilities，维护龟种特殊能力展示映射。
 */
import type { PetEquipInfo } from '@/hooks/petTypes';
import { normalizePetRarityGrade } from '@/components/common/pet/petRarity';

export type TurtleAbilityInfo = {
  id: string;
  name: string;
  rarity: string;
  ability: string;
};

const TURTLE_ABILITIES: Record<string, TurtleAbilityInfo> = {
  basic: { id: 'basic', name: '小龟', rarity: 'C', ability: '新用户默认形象，注册时赠送 500 龟币；无等级加成' },
  stone: { id: 'stone', name: '石头龟', rarity: 'C', ability: '每日登录额外奖励 +25 龟币' },
  bamboo: { id: 'bamboo', name: '竹叶龟', rarity: 'C', ability: '每日登录额外奖励 +25 龟币' },
  angel: { id: 'angel', name: '天使龟', rarity: 'B', ability: '每日登录额外奖励 +40 龟币' },
  ice: { id: 'ice', name: '寒冰龟', rarity: 'B', ability: '每日登录额外奖励 +40 龟币' },
  ninja: { id: 'ninja', name: '忍者龟', rarity: 'B', ability: '每日登录额外奖励 +15 龟币；抽奖消耗龟币 -5%' },
  two_head: { id: 'two_head', name: '双头龟', rarity: 'B', ability: '龟势对决贡献值 +15% × (1 + 10% × 当前等级)；满级 Lv.10 贡献值加成为 +30%' },
  ghost: { id: 'ghost', name: '幽灵龟', rarity: 'B', ability: '投票下注手续费减免 (5% + 0.3% × 等级)；每日减免上限 (300 + 5 × 等级) 龟币' },
  diamond: { id: 'diamond', name: '钻石龟', rarity: 'B', ability: '赛季结算时排名百分比额外提升 (1.7% + 0.05% × 等级)；满级为 2.2%' },
  fortune: { id: 'fortune', name: '财神龟', rarity: 'B', ability: '每日首次投票下注后额外获得 50 龟币' },
  dice: { id: 'dice', name: '骰子龟', rarity: 'B', ability: '每日登录自动触发「幸运骰」，随机获得 0~(90 + 2 × 等级) 龟币；满级上限为 110 龟币' },
  rainbow: { id: 'rainbow', name: '彩虹龟', rarity: 'A', ability: '每日登录额外奖励 +60 龟币' },
  gambler: { id: 'gambler', name: '赌神龟', rarity: 'A', ability: '暗盘单次下注金额 ≥ 100 龟币时标记「赌神奖励」；赢得结算时额外获得 (50 + 2 × 等级) 龟币，同一事件仅计一次，每日总上限 300 龟币；满级单次奖励 70 龟币' },
  hunter: { id: 'hunter', name: '猎人龟', rarity: 'A', ability: '下注时事件胜率 < 35% 且最终结算获胜，奖励额外 +15% × (1 + 3% × 等级)；满级为 +19.5%' },
  pirate: { id: 'pirate', name: '海盗龟', rarity: 'A', ability: '地下赌场私人赌局 1 对 1 获胜时，额外窃取输家输掉龟币的 (10% + 0.7% × 等级)；满级为 17%；余额不足取全部' },
  candy: { id: 'candy', name: '糖果龟', rarity: 'A', ability: '购买龟粮价格 -20%，即 4 龟币/个' },
  bubble: { id: 'bubble', name: '泡泡龟', rarity: 'A', ability: '抽奖消耗龟币 -(10% + 1% × 等级)；满级折扣为 -20%' },
  line: { id: 'line', name: '线条龟', rarity: 'A', ability: '龟势对决贡献值 +25% × (1 + 10% × 当前等级)；满级 Lv.10 贡献值加成为 +50%' },
  lightning: { id: 'lightning', name: '闪电龟', rarity: 'A', ability: '欠账上限 -300 龟币，每日补贴欠款额的 (20% + 0.5% × 等级)；满级补贴为 25%；欠款未还清时禁止切换龟种，错误码 DEBT_UNPAID' },
  phoenix: { id: 'phoenix', name: '凤凰龟', rarity: 'S', ability: '每日登录额外奖励 +100 龟币' },
  lava: { id: 'lava', name: '熔岩龟', rarity: 'S', ability: '每日登录总奖励（基础 100 + 火花加成 y）× (1.3 + 0.03 × 等级)；满级倍率为 1.6×；翻倍额外部分上限 400 龟币/天' },
  cyber: { id: 'cyber', name: '赛博龟', rarity: 'S', ability: '地下赌场私人赌局 1 对 1 获胜时，额外窃取输家输掉龟币的 (15% + 0.7% × 等级)；满级为 22%；余额不足取全部' },
  crystal: { id: 'crystal', name: '水晶龟', rarity: 'S', ability: '抽奖消耗龟币 -(18% + 0.9% × 等级)；满级折扣为 -27%' },
  chest: { id: 'chest', name: '宝箱龟', rarity: 'S', ability: 'PvE 模式龟币奖励 × (1 + 5% × 等级) + 25 基础；龟势对决奖励同公式；满级两者均为 +75%' },
  space: { id: 'space', name: '星际龟', rarity: 'S', ability: '余额 > 0 时每日自动生息 3%，上限 1000 龟币/天；龟势对决贡献值 +15% × (1 + 10% × 当前等级)，满级为 +30%' },
  hiding: { id: 'hiding', name: '缩头乌龟', rarity: 'SS', ability: '龟势对决获胜时获得完整赢方奖励；失败时获得 min[失败方贡献占比 × 赢方 PK 总奖励 × (40% + 2% × 等级), 400] 的系统补偿；满级系数为 60%' },
  headless: { id: 'headless', name: '无头龟', rarity: 'SS', ability: 'AI 对话体力消耗 -1，即 -4 体力/次；每日登录额外奖励 +50 龟币' },
  shell: { id: 'shell', name: '龟壳', rarity: 'SSS', ability: '欠款补贴 (18% + 0.5% × 等级)，满级为 23%；存款生息 5%，上限 1000 龟币/天' },
};

const NAME_TO_ID: Record<string, string> = {
  小龟: 'basic',
  基础小龟: 'basic',
  石头龟: 'stone',
  竹叶龟: 'bamboo',
  天使龟: 'angel',
  寒冰龟: 'ice',
  忍者龟: 'ninja',
  双头龟: 'two_head',
  幽灵龟: 'ghost',
  钻石龟: 'diamond',
  财神龟: 'fortune',
  骰子龟: 'dice',
  彩虹龟: 'rainbow',
  赌神龟: 'gambler',
  猎人龟: 'hunter',
  海盗龟: 'pirate',
  糖果龟: 'candy',
  泡泡龟: 'bubble',
  气泡龟: 'bubble',
  线条龟: 'line',
  闪电龟: 'lightning',
  凤凰龟: 'phoenix',
  熔岩龟: 'lava',
  赛博龟: 'cyber',
  水晶龟: 'crystal',
  宝箱龟: 'chest',
  星际龟: 'space',
  缩头乌龟: 'hiding',
  无头龟: 'headless',
  龟壳: 'shell',
};

function normalizeKey(value?: string | number | null) {
  return String(value ?? '').trim().toLowerCase();
}

export function getTurtleAbility(input?: Pick<PetEquipInfo, 'petKey' | 'petName' | 'rarity' | 'level'> | null, fallbackName?: string) {
  const petKey = normalizeKey(input?.petKey);
  const name = input?.petName ?? fallbackName;
  const mappedId = petKey && TURTLE_ABILITIES[petKey] ? petKey : name ? NAME_TO_ID[name.replace(/v1$/, '')] : undefined;
  const ability = mappedId ? TURTLE_ABILITIES[mappedId] : TURTLE_ABILITIES.basic;

  return {
    ...ability,
    displayName: input?.petName ?? ability.name,
    displayRarity: normalizePetRarityGrade(input?.rarity ?? ability.rarity),
    level: input?.level ?? 1,
  };
}
