/**
 * 文件说明：宠物在撕裂带里的技能规则映射。
 */
import type { BattlePetSkillDefinition } from '@/components/common/pet/petTypes';

const defaultBattlePetSkills: BattlePetSkillDefinition[] = [
  { name: '话术增幅', icon: '🗣️', activeDesc: '评论火力+20%', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
  { name: '龟甲护盾', icon: '🛡️', activeDesc: '抵挡 1 次踩踏', inactiveDesc: '获 5 赞解锁', activation: 'likes', threshold: 5 },
  { name: '预言之眼', icon: '🔮', activeDesc: '赔率洞察+10%', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
];

const battlePetSkillLoadouts: Record<string, BattlePetSkillDefinition[]> = {
  sk1: defaultBattlePetSkills,
  sk2: [
    { name: '金甲镇场', icon: '🥇', activeDesc: '护甲值提升，踩踏伤害减半', inactiveDesc: '获 5 赞激活护甲', activation: 'likes', threshold: 5 },
    { name: '重装压评', icon: '💥', activeDesc: '高质量评论威慑+25%', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '黄金赔率', icon: '💰', activeDesc: '高赔率战场额外加成', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
  sk3: [
    { name: '影分身嘴炮', icon: '🥷', activeDesc: '评论连击速度+20%', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '烟幕闪避', icon: '🌫️', activeDesc: '规避一次对手反击', inactiveDesc: '获 5 赞激活烟幕', activation: 'likes', threshold: 5 },
    { name: '暗影读秒', icon: '⏱️', activeDesc: '临近封盘洞察提升', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
  sk4: [
    { name: '赛博扫描', icon: '🤖', activeDesc: '实时识别场上强势观点', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '量子护盾', icon: '🧿', activeDesc: '护盾过载抵消一次踩踏', inactiveDesc: '获 5 赞解锁', activation: 'likes', threshold: 5 },
    { name: '算法预判', icon: '📡', activeDesc: '赔率预测修正+12%', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
  sk5: [
    { name: '节日号召', icon: '🎄', activeDesc: '评论氛围带动全场', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '礼物护佑', icon: '🎁', activeDesc: '护体祝福抵消 1 次伤害', inactiveDesc: '获 5 赞解锁', activation: 'likes', threshold: 5 },
    { name: '铃响预言', icon: '🔔', activeDesc: '赔率波动预警更敏锐', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
  sk6: [
    { name: '海盗挑衅', icon: '🏴‍☠️', activeDesc: '挑衅成功，评论冲突升级', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '舷侧护板', icon: '⚓', activeDesc: '抵挡一轮火力打击', inactiveDesc: '获 5 赞解锁', activation: 'likes', threshold: 5 },
    { name: '藏宝雷达', icon: '🗺️', activeDesc: '高赔率宝藏位感知开启', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
  sk7: [
    { name: '轨道嘴炮', icon: '🚀', activeDesc: '高空火力打击+25%', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '宇宙护膜', icon: '🪐', activeDesc: '星环护盾抵挡 1 次踩踏', inactiveDesc: '获 5 赞解锁', activation: 'likes', threshold: 5 },
    { name: '星图预见', icon: '🌌', activeDesc: '赔率路线推演启动', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
  sk8: [
    { name: '花粉扩散', icon: '🌺', activeDesc: '评论感染力持续扩散', inactiveDesc: '发 3 条评论解锁', activation: 'comments', threshold: 3 },
    { name: '藤蔓护体', icon: '🌿', activeDesc: '藤蔓防护吸收一次踩踏', inactiveDesc: '获 5 赞解锁', activation: 'likes', threshold: 5 },
    { name: '春芽预兆', icon: '🌱', activeDesc: '赔率预兆感知+10%', inactiveDesc: '贡献达到 50 解锁', activation: 'contribution', threshold: 50 },
  ],
};

export function getBattlePetSkillsForSkin(skinId?: string) {
  return battlePetSkillLoadouts[skinId || ''] ?? defaultBattlePetSkills;
}
