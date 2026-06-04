// ══════════════════════════════════════════════════════════
// rules.ts — 战斗规则 (自定义模式 + Codex 规则 tab 共用)
// ══════════════════════════════════════════════════════════

export interface BattleRule {
  id: string;
  name: string;
  emoji: string;
  icon: string;        // 配图路径 (相对 public/); 显示用, emoji 作 fallback
  desc: string;
  color: number;       // 0xRRGGBB
}

// E3/33: 跟 JS battle-setup.js:7 BATTLE_RULES 1:1 (7 项, 不含自创 '深海之日')
// 顺序也对齐 JS: fire/thunder/shield/rage/equip/rain/normal
export const BATTLE_RULES: BattleRule[] = [
  { id: 'fire',    name: '烈焰之日', emoji: '🔥',  icon: 'rules/fire.png',    desc: '所有伤害附带灼烧 (4 回合)。', color: 0xff6633 },
  { id: 'thunder', name: '雷暴之日', emoji: '⚡',  icon: 'rules/thunder.png', desc: '全体暴击率 +20%。', color: 0xfbbf24 },
  { id: 'shield',  name: '铁壁之日', emoji: '🛡️', icon: 'rules/shield.png',  desc: '所有护盾效果 +30%。', color: 0x4cc9f0 },
  { id: 'rage',    name: '狂暴之日', emoji: '⚔️', icon: 'rules/rage.png',    desc: '全体攻击力 +20%, 护甲和魔抗 -15%。', color: 0xef4444 },
  { id: 'equip',   name: '装备之日', emoji: '🎁',  icon: 'rules/equip.png',   desc: '每 3 回合双方各选 1 件装备。', color: 0xc77dff },
  { id: 'rain',    name: '下雨天',   emoji: '🌧',  icon: 'rules/rain.png',    desc: '每回合对所有单位 5×N 魔法伤害 + 永久 -N 甲/抗 (N = 当前回合数)。', color: 0x06b6d4 },
  { id: 'normal',  name: '正常对局', emoji: '🎲',  icon: 'rules/normal.png',  desc: '无额外规则。', color: 0x888888 },
];
