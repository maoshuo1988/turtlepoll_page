// ══════════════════════════════════════════════════════════
// equipment-runtime.ts — 装备运行时 hook 注册表
// 战斗事件 (onHit / onTurnBegin / onDeath) 触发已挂装备的副作用
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';
import { applyHeal } from './skill-handlers';

export interface HitContext {
  attacker: Fighter;
  target: Fighter;
  dmg: number;          // 实际造成的伤害 (hpLoss + shieldAbs)
  isCrit: boolean;
}

export interface TurnContext { actor: Fighter; }
export interface DeathContext { deceased: Fighter; killer: Fighter | null; }

export type OnHitHandler = (owner: Fighter, ctx: HitContext) => void;
export type OnTurnBeginHandler = (owner: Fighter, ctx: TurnContext) => void;
export type OnDeathHandler = (owner: Fighter, ctx: DeathContext) => void;

/**
 * 装备效果注册表 — 装备 id → 各事件回调
 * 装备 apply 阶段把 fighter 上的 _equipX 标志置位; 这里订阅事件并查标志触发副作用
 */
export interface EquipBehavior {
  onHit?: OnHitHandler;            // 攻击命中后 (owner 是攻击者; 反伤式装备订阅 onHitAsTarget)
  onHitAsTarget?: OnHitHandler;    // 被命中后 (owner 是受击方)
  onTurnBegin?: OnTurnBeginHandler;
  onDeath?: OnDeathHandler;
}

export const EQUIP_BEHAVIORS: Record<string, EquipBehavior> = {
  // P91 1:1 修双发: 旧 PoC equipment-runtime.ts hooks 跟 passive-triggers.ts 同时触发, 重复装备效果.
  //   blade/urchin/fire/jelly 的 JS-parity 在 passive-triggers.ts:362-414 (6n-6r).
  //   tooth/piercer/laser_blade/doll/dart/wave 是 JS 纯属性装备, 这里 fabricate 都是自创.
  //   octo 的真实公式是"伤害前 ×1.2", 单独处理. revolver 的 turn-begin 跟 side-end 双消, 删 turn-begin.
  e_blade: { /* moved to passive-triggers.ts:362-370 (6n) — JS combat.js:747-749 */ },
  e_carapace: {
    // P92 1:1 JS combat.js:972-996 — 每次受击 +1 def/+1 mr (不论件数), cap 随件数累计
    //   旧 PoC: N 件时每次 +N → 20 次击满, 跟 JS (cap N×20 次击满) 不同步.
    onHitAsTarget: (owner) => {
      const cap = (owner._equipCarapaceCap as number) || 20;
      const cur = (owner._equipCarapaceGain as number) || 0;
      if (cur >= cap) return;
      const after = Math.min(cap, cur + 1);  // P92: 始终 +1 per hit (JS 1:1)
      const inc = after - cur;
      owner._equipCarapaceGain = after;
      owner.baseDef = (owner.baseDef || 0) + inc;
      owner.def = owner.baseDef;
      owner.baseMr = (owner.baseMr || owner.baseDef) + inc;
      owner.mr = owner.baseMr;
      // 满 cap 一次性给护盾 (每件 +40)
      if (after >= cap && !owner._equipCarapaceShieldGiven) {
        owner._equipCarapaceShieldGiven = true;
        const pieces = Math.max(1, Math.round(cap / 20));
        const bonus = 40 * pieces;
        owner.shield = (owner.shield || 0) + bonus;
        owner._carapaceMaxedBonus = bonus;
      }
    },
  },
  e_pearl: {
    onHitAsTarget: (owner, { target }) => {
      // v0.9.5.A88: HP <50% 触发一次 (回血 20% maxHp + 销毁 + 火球敌人)
      if (!owner._equipPearl) return;
      if (target.hp / target.maxHp >= 0.5) return;
      owner._equipPearl = false;
      // 修(2026-05-30 Agent C): 旧直写 owner.hp = min(...) 绕过 applyHeal → 漏潮汐涟漪/海浪 healAmp /
      //   治疗削减 / e_star 溢出转护盾 / 守护羁绊 加成。改走 applyHeal。
      const heal = Math.round(owner.maxHp * 0.2);
      applyHeal(owner, heal, owner);
      owner._pearlTriggered = true;
      // 火球: BattleScene 检测 _pearlFireballPending → 对随机敌火 8% target maxHp + 30 灼烧
      owner._pearlFireballPending = true;
    },
  },
  // P1(20260528): e_star 生命偷取(+12% _lifestealPct)现由通用 on-hit 吸血统一消费 (recalc 已折入 lifestealPct),
  //   溢出转护盾(_equipStarOverflow=50%)也收口到 passive-triggers 通用吸血块 → 此处不再单独吸 (原会双吸)。
  e_star: { /* moved to passive-triggers 通用吸血 (含 _equipStarOverflow 溢出转盾) */ },
  e_urchin: { /* P91 moved to passive-triggers.ts:404-414 (6r) — JS combat.js:775-787 */ },
  // ── Phase C 扩展 ──
  // P92 e_anemone: JS turn.js:564-568 全局每回合 1 次 HoT, NOT per-actor-action
  //   旧 PoC fireOnTurnBegin 每个 actor 行动前都触发 → 多动龟一回合内堆叠. JS 全局单次.
  //   移到 BattleScene.processRoundStartHook 全队过一遍 (HoT _equipHot 字段)
  e_anemone: { /* P92 moved to BattleScene.processRoundStartHook — JS turn.js:564-568 */ },
  e_fire: { /* P91 moved to passive-triggers.ts:372-380 (6o) — JS combat.js:751-756 */ },
  e_jelly: { /* P91 moved to passive-triggers.ts:382-390 (6p) — JS combat.js:757-764 */ },
  // P60 e_ghost 1:1 JS combat.js:89-97 — 闪避时给 20 × ghostCount 永久护盾
  //   逻辑移至 rollDodge (skill-handlers.ts) — 闪避成功时触发, 不是随机受击
  //   旧 onHitAsTarget 15% 概率 完全错形, 删除
  e_ghost: { /* moved to skill-handlers.ts rollDodge */ },
  // P91 e_octo: JS combat.js:33-34 + 168-169 在 calcDamage 之前 ×(1+20%) 后排目标
  //   PoC 应在 damage.ts calcDamage 内读 attacker._equipBackrowBonus + target._position === 'back'
  //   旧 onHit hook 跳过 armor 直接扣 HP — 完全错路径, 删除. 真正实现在 damage.ts.
  e_octo: { /* P91 moved to damage.ts calcDamage — JS combat.js:33-34/168-169 */ },
  // P91 e_revolver: JS state.js:375-384 在敌人死亡时 replenish, PoC 之前 turn-begin -1 重复扣
  //   side-end 已实现 (BattleScene.ts:5457). 这里仅删 turn-begin double-consume.
  e_revolver: { /* P91 turn-begin 重复扣 bullets 删除. side-end 在 BattleScene.processSideEnd 处理 */ },
  // #8 低#12: 删死代码 — 旧 onTurnBegin 写 _candlePhase 但无人读 (真实蜡烛逻辑用 _equipCandleStage,
  //   在 BattleScene.processSideEndEquipment 三阶段循环). 此 onTurnBegin 是无效冗余。
  e_candle: { /* moved to BattleScene.processSideEndEquipment (用 _equipCandleStage) */ },
  // P58 e_thunder_shell 1:1 JS engine.js:200 — 自回合末雷击, NOT 受击雷反
  //   JS: 携带者自己回合结束时 zap 1 名随机敌人 1×ATK 真伤
  //   PoC processSideEnd 已实现 (BattleScene.ts:4938) — 这里 noop 占位
  e_thunder_shell: { /* moved to BattleScene.processSideEnd */ },
  // ── v0.6 扩展 10 件 ────────────────────────────────────
  // P(2026-05-30): e_hammer ATK 加成 (4% maxHp × 件数) 收口到 stats-recalc.recalcStats。
  //   原 onTurnBegin `atk = baseAtk + bonus` 会被紧随其后的 processTurnBeginPassives→recalcStats 重置抹掉
  //   (用户报"重击锤没正确施加攻击力"), 且会覆盖 atkUp/atkDown buff。apply() 只 +100maxHp + 计数。
  e_hammer: { /* moved to stats-recalc.recalcStats — ATK = base + 4%maxHp×件数 (整合进 recalc 链) */ },
  // P91: e_tooth/e_piercer 是 JS 纯属性装备 (apply() 加 ATK/crit/pen 后无 hook), 之前 PoC 自创 hooks 全删
  e_tooth: { /* P91 JS 纯属性, 无 on-hit. apply() 已加 +8 ATK +5 armorPen +25% crit */ },
  e_piercer: { /* P91 JS 纯属性, 无 on-hit. apply() 已加 +8 ATK +6 armorPen +6 magicPen */ },
  // 清(2026-05-30 Agent C): e_conch onDeath 完整逻辑 (含技能换 wormBite + 召唤物级联清理) 在 BattleScene.processDeathPassives:4337,
  //   且 fireOnDeath 在 alive 检查之后才调 → BattleScene 先转完 (alive=true) 后这里永不到达。原 hook 死代码已删。
  e_conch: { /* moved to BattleScene.processDeathPassives (转小虫 + skill 换 + 召唤物清理 + flag) */ },
  // P61 e_ripple 1:1 JS turn.js:570-583 — 每回合给全体友方回已损 HP × allyHotPct%
  //   旧 PoC onTurnBegin 只摸自己 (无 team 上下文) — 错形
  //   BattleScene.processComplexEquipEffects 实装全队 hook
  e_ripple: { /* moved to BattleScene.processComplexEquipEffects */ },
  // v0.9.5.A88: e_dragon_egg / e_mini_crystal / e_mini_crystal_b 改由
  // BattleScene.processComplexEquipEffects 处理 (需要 team 上下文 + 视觉)
  e_dragon_egg: { /* moved to BattleScene */ },
  e_mini_crystal: { /* moved to BattleScene */ },
  // P59 e_dumbbell 1:1 JS equip-effects.js:607-627 — turn-END +25 maxHp + 投掷 5% maxHp 物理
  //   BattleScene.processSideEndEquipment:5307-5326 已正确实现 (turn-end timing)
  //   旧 onTurnBegin +1 ATK+2 maxHp 完全错形, 删除
  e_dumbbell: { /* moved to BattleScene.processSideEndEquipment */ },

  // P59 e_fpga 1:1 JS engine.js:227-232 — 4-state 2-bit random per turn
  //   00: heal 5% maxHp + 永久 +2 def/mr
  //   01: 永久 +5 ATK + 永久 +4% lifesteal
  //   10: 本回合 +15% 增伤
  //   11: 本回合 -25% 受伤 (不抵真伤)
  //   BattleScene.processComplexEquipEffects 已实现 (4-state 完整)
  //   旧 onTurnBegin 仅 -1 cd 完全错形, 删除
  e_fpga: { /* moved to BattleScene.processComplexEquipEffects */ },

  // P59 e_amplifier 1:1 JS engine.js:233-238 — 每回合开始 16-24% temp dmg buff
  //   BattleScene.processComplexEquipEffects 已实现
  //   旧 onHit +15% extra 错时机+错值, 删除
  e_amplifier: { /* moved to BattleScene.processComplexEquipEffects */ },
  // ── v0.7 收尾: 剩余 6 件 ────────────────────────────
  // P91 e_dart: JS turn-end 命中击飞敌人 (BattleScene.ts:5431-5450 已实现 side-end). 旧 +3 ATK 是自创, 删
  e_dart: { /* P91 moved to BattleScene.processSideEndEquipment — JS equip-effects.js:796-812 */ },
  // P91 e_doll: JS 仅 side-end 提供盾 (BattleScene.ts:5552-5582). 旧 onHitAsTarget 10% +30 盾自创, 删
  e_doll: { /* P91 moved to BattleScene.processSideEndEquipment — JS equip-effects.js:737-793 */ },
  // P58 e_hourglass 1:1 JS engine.js:206 — apply() 时永久 -1 cd, 不是 per-turn
  //   apply 阶段已 -1 (equipment.ts:170-174), 此处不再 per-turn -1 (会 cd 归 0 累积错)
  //   JS 也无 crit 加成 — 删除 5% crit
  e_hourglass: { /* permanent -1 cd applied in equipment.ts apply() */ },
  // P91 e_laser_blade: JS apply +laserSweep skill (equip-effects.js:469-495 column AOE).
  //   PoC data/equipment.ts:221-225 注册 skill type:'laserSweep' 但无 handler 注册 → 死代码.
  //   旧 onHit +8 真伤 完全自创, 先删. laserSweep handler TODO: 单独 commit 注册.
  e_laser_blade: { /* P91 onHit +8 true 删除 (自创). laserSweep skill handler 待注册 */ },
  e_mini_crystal_b: { /* moved to BattleScene */ },
  // P91 e_wave: JS 仅 side-end 3-stack→sweep 攻击 (BattleScene.ts:5469-5509 已实现).
  //   旧 onTurnBegin +20 盾 +2 防/抗 是自创, 删
  e_wave: { /* P91 moved to BattleScene.processSideEndEquipment — JS equip-effects.js:330-466 */ },
};

/** 触发 hit 事件 — attacker 装备的 onHit + target 装备的 onHitAsTarget */
export function fireOnHit(attacker: Fighter, target: Fighter, dmg: number, isCrit: boolean): void {
  const ctx: HitContext = { attacker, target, dmg, isCrit };
  for (const eq of attacker.equipment) {
    const b = EQUIP_BEHAVIORS[eq.id];
    if (b?.onHit) b.onHit(attacker, ctx);
  }
  for (const eq of target.equipment) {
    const b = EQUIP_BEHAVIORS[eq.id];
    if (b?.onHitAsTarget) b.onHitAsTarget(target, ctx);
  }
}

/** 触发回合开始事件 */
export function fireOnTurnBegin(actor: Fighter): void {
  const ctx: TurnContext = { actor };
  for (const eq of actor.equipment) {
    const b = EQUIP_BEHAVIORS[eq.id];
    if (b?.onTurnBegin) b.onTurnBegin(actor, ctx);
  }
}

/** 触发死亡事件 */
export function fireOnDeath(deceased: Fighter, killer: Fighter | null): void {
  const ctx: DeathContext = { deceased, killer };
  for (const eq of deceased.equipment) {
    const b = EQUIP_BEHAVIORS[eq.id];
    if (b?.onDeath) b.onDeath(deceased, ctx);
  }
}

// ── Buff 工具 (简易, 战斗内 DoT/stun/shield 等) ──────────
function addBuff(f: Fighter, type: string, value: number, duration: number) {
  f.buffs.push({ type, value, duration });
}
