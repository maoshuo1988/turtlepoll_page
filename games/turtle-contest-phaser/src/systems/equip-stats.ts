// ══════════════════════════════════════════════════════════
// equip-stats.ts — P115 装备数据统计灰字显示
// 用户 spec: 部分装备 (火珊瑚/雷鸣贝壳/FPGA/小熊玩偶/冰冻水母/小龟剑/小龟壳/小龟帽)
// 在装备图标下方/tooltip 显示实时累计 stat (灰字).
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';

/** 返回该装备在 fighter 上的累计 stat 灰字行. fighter=null 时返回 '尚未装备' 提示. */
export function getEquipStatLine(equipId: string, fighter: Fighter | null): string {
  if (!fighter) {
    // bench 列表 (未装备) — 仅显示装备类型说明
    return '装备到龟身上后, 这里会显示实时统计';
  }
  const f = fighter as Fighter & Record<string, unknown>;
  switch (equipId) {
    case 'e_turtle_helmet':   // 小龟帽: 累计治疗
      return `治疗效果: ${f._turtleHelmetHealStat ?? 0}`;
    case 'e_turtle_sword':    // 小龟剑: 造成伤害 + 治疗
      return `造成伤害: ${f._turtleSwordDmgStat ?? 0} | 治疗效果: ${f._turtleSwordHealStat ?? 0}`;
    case 'e_turtle_shell':    // 小龟壳: 已格挡伤害
      return `已格挡的伤害: ${f._turtleShellBlockedStat ?? 0}`;
    case 'e_thunder_shell':   // 雷鸣贝壳: 造成伤害
      return `造成伤害: ${f._thunderShellDmgStat ?? 0}`;
    case 'e_fire':            // 灼烧珊瑚: 施加灼烧层数
      return `施加的灼烧层数: ${f._fireCoralStacksStat ?? 0}`;
    case 'e_fpga':            // FPGA: 已提供属性 (P130 4-state 全跟踪)
      return `已提供的属性: +${f._fpgaAtkGiven ?? 0} ATK / +${f._fpgaDefGiven ?? 0} 防 / +${f._fpgaMrGiven ?? 0} 抗 / +${f._fpgaLifestealGiven ?? 0}% 生命偷取 | 10/11 触发 ${f._fpgaBuffCount ?? 0} 次`;
    case 'e_doll':            // 小熊玩偶: 小熊造成伤害
      return `小熊已造成伤害: ${f._dollBearDmgStat ?? 0}`;
    case 'e_jelly':           // 冰冻水母: 获得护盾 + 眩晕次数
      return `获得的护盾: ${f._jellyShieldStat ?? 0} | 眩晕次数: ${f._jellyStunStat ?? 0}`;
    case 'e_incubator':       // 孵化器: 进度条 + 临时等级
      return `孵化进度: ${f._incubatorProgress ?? 0}/100 | 临时等级 +${f._incubatorTempLevel ?? 0}`;
    case 'e_stun_baton':      // 电棍: 剩余层数
      return `剩余电击层数: ${f._stunBatonStacks ?? 0}/3`;
    case 'e_bamboo_leaf':     // 竹叶: 充能状态
      return `生长充能: ${f._bambooLeafCharge ?? 0} (已消耗后永久 +100 maxHp)`;
    default:
      return '';   // 其他装备无 stat 跟踪
  }
}
