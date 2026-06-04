# AUDIT-EQUIPMENT — 38 装备 1:1 JS audit (P58, 2026-05-19)

完成 28 龟 1:1 line-by-line (P30-P57) 后, 进入装备 audit. 装备列表 38 件:
- 6 stat boost (e_blade/carapace/pearl/tooth/hammer/piercer)
- 12 special (e_star/urchin/fire/jelly/anemone/ghost/octo/conch/ripple/dragon_egg/mini_crystal/mini_crystal_b)
- 11 misc (e_thunder_shell/hourglass/dumbbell/fpga/amplifier/candle/revolver/laser_blade/doll/dart/wave)
- 8 consumable (c_heal/speed/bomb/rage/emergency/firstaid/cleanse/mark)
- 1 special (c_candy_jar — passive equipment with break-action)

JS 引用: `games/turtle-battle/js/engine.js:60-380 EQUIP_POOL`
PoC 引用: `poc-phaser/src/data/equipment.ts` (apply) + `poc-phaser/src/engine/equipment-runtime.ts` (runtime hooks)

## Stat boost (6) — 全部 1:1 (apply 同款数值, 同款 _equipXxx 字段名)

| Item | JS apply | PoC apply | Status |
|------|---------|-----------|--------|
| e_blade | +20 ATK + _equipBladeBleed=2 | 同 | ✓ MATCH |
| e_carapace | +60 maxHp + _equipCarapaceCap=20 + ShieldGiven=false | 同 | ✓ MATCH (multi-stack cap +20/件) |
| e_pearl | +20 maxHp +4 def/mr + _equipPearl | 同 | ✓ MATCH |
| e_tooth | +8 ATK +5 armorPen +25% crit | 同 | ✓ MATCH |
| e_hammer | +100 maxHp + _equipHammer count | 同 (recalcStats per-stack) | ✓ MATCH |
| e_piercer | +8 ATK +6 armorPen +6 magicPen | 同 | ✓ MATCH |

## Special effect (12)

| Item | JS spec | PoC impl | Fix needed |
|------|---------|----------|-----------|
| e_star | +12% lifesteal + overflow 50% → shield | applyHeal hook 1:1 | ✓ |
| e_urchin | +50 maxHp + 10% reflect | onHitAsTarget reflect 1:1 | ✓ |
| e_fire | +50 maxHp + 命中后 20 burn 3t | onHit push burn 1:1 | ✓ |
| e_jelly | +20 maxHp +5 def + 25% 命中眩晕 1t | onHit 25% chance stun | ✓ |
| e_anemone | +5 def +10 mr + 回合开始 8% maxHp HoT | onTurnBegin heal 1:1 | ✓ |
| e_ghost | +20 maxHp +15% dodge + 闪避 +20 shield | onHitAsTarget 15% chance shield (**P1**: 应检 dodge 而非概率) | P1 |
| e_octo | +15 ATK + 后排目标 +20% dmg | onHit 检 `target._position === 'back'` | ✓ (依赖 _position 字段) |
| e_conch | +100 maxHp + 死亡变小虫 | onDeath 转 150HP/20ATK/0 def 小虫 | ✓ (P15 完整) |
| e_ripple | +100 maxHp + 30% heal amp + 3% 队友 lost HoT | onTurnBegin (仅自己, **P1**: 应全队) | P1 (无 team hook) |
| e_dragon_egg | +8 ATK +5 magicPen + 3 stacks 喷火龙 | BattleScene.processComplexEquipEffects | ✓ (P88 移至 BattleScene) |
| e_mini_crystal A | +7 ATK +20 maxHp +5 magicPen + 2 段 magic + crystal stack | BattleScene 处理 | ✓ |
| e_mini_crystal B | +7 ATK +20 maxHp +3 magicPen + 红光扫敌 | BattleScene 处理 | ✓ |

## Misc (11)

| Item | JS spec | PoC impl | Fix needed |
|------|---------|----------|-----------|
| e_thunder_shell | +15 ATK + 回合末 1×ATK 真伤随机敌 | **P58 fix**: equipment-runtime stub 删 (moved to BattleScene processSideEnd 4938-) | ✓ FIXED |
| e_hourglass | apply 永久 -1 cd | **P58 fix**: equipment-runtime stub 删 (apply 阶段 -1 cd in equipment.ts:170-174 已对; 旧版多 +5% crit 错) | ✓ FIXED |
| e_dumbbell | +100 maxHp +3 def/mr + 回合末 +25 maxHp + 5% maxHp 物理扔随机敌 | onTurnBegin +1 ATK +2 maxHp (**P0**: 公式完全错, 应是 +25 maxHp 永久, 投掷另算) | P0 deferred |
| e_fpga | +50 maxHp + 4-state 随机 (00 heal+def/mr / 01 atk+lifesteal / 10 +15% dmg / 11 -25% taken) | onTurnBegin 仅 -1 cd (**P0**: 完全错形, 应是 4-state random 系统) | P0 deferred |
| e_amplifier | +50 maxHp + 回合开始 16~24% temp dmg buff | onHit +15% dmg (**P1**: 范围错 + 时机错) | P1 deferred |
| e_candle | +10 ATK +50 maxHp + 3 阶段循环 (熄灭/微弱 20HP+10/燃烧 30魔法+20灼烧) | onTurnBegin 仅 cycle phase (**P1**: 阶段无效果) | P1 deferred |
| e_revolver | +10 ATK +5 armorPen + 6 子弹 + 回合末 40 物理 + 敌死 +1 (cap 6) | onTurnBegin 仅 bullets-- (**P0**: 无 fire 实现, 无 enemy-death +1) | P0 deferred |
| e_laser_blade | +15 ATK + push '横扫' 技能 | apply pushes skill ✓ | ✓ (laserSweep handler 已实现) |
| e_doll | +5 ATK +30 maxHp + 回合末小熊 30 物理 + 5 stack 召唤大熊 | onHitAsTarget 10% +30 shield (**P0**: 完全错形, 应是 turn-end 小熊 + 大熊召唤) | P0 deferred |
| e_dart | +15 ATK + "靶子" 状态 + 回合末向靶子敌 50 物理 + 20 流血 | onTurnBegin 3 stacks +3 ATK (**P0**: 完全错形, 应是 "靶子" 状态触发) | P0 deferred |
| e_wave | +50 maxHp +10% heal amp + 3 stacks 巨浪 (己方 +20 shield + 2 def/mr 永久; 敌 20 魔法 + -2 def/mr 永久) | onTurnBegin +20 shield + 2 def/mr (**P1**: 简化为单方 buff, 缺敌方 debuff + stacks) | P1 deferred |

## Consumables (8) — apply() one-shot

| Item | JS | PoC | Status |
|------|---|-----|--------|
| c_heal | applyHeal(50 + 10% maxHp, '治疗药水') | 同 | ✓ |
| c_speed | 所有 skill cdLeft -1 (min 0) | 同 | ✓ |
| c_bomb | 拖到敌 → 80 魔法 + AoE 周围 (40 魔法) | (需 verify BattleScene 实现) | check |
| c_rage | +30% ATK 3 回合 | (need verify) | check |
| c_emergency | +50% maxHp shield 3 回合 | (need verify) | check |
| c_firstaid | applyHeal(80 + 15% lost) | (need verify) | check |
| c_cleanse | 清所有 debuff | (need verify) | check |
| c_mark | "必中" buff 3 回合 (next hit guaranteed crit) | (need verify) | check |

## Special (1)

| Item | JS | PoC | Status |
|------|---|-----|--------|
| c_candy_jar | actionable: 打碎按钮 → 回合相关奖励 | sweetTrap passiveSkill (糖果龟 P46 deferred) | deferred |

## 修复 (P58 batch)
1. e_thunder_shell: 删 onHitAsTarget 5 真伤 stub (JS 是 self回合末 1×ATK 真伤, BattleScene processSideEnd 4938 已正确处理)
2. e_hourglass: 删 onTurnBegin per-turn -1 cd + 5% crit (apply() 永久 -1 cd 已对; 旧版 per-turn 累积重复扣 cd + JS 无 crit 加成)

## P58 待修 (P0/P1):
- e_dumbbell: 完整 turn-end 投掷 + 累计 +25 maxHp
- e_fpga: 4-state 随机系统 (BattleScene complex effect 候选)
- e_amplifier: 16-24% temp dmg per turn (vs +15% on-hit 错形)
- e_candle: 3 阶段实际效果
- e_revolver: turn-end 40 物理 fire + enemy-death +1 bullet
- e_doll: turn-end 小熊 30 物理 + 5 stacks 召唤大熊
- e_dart: "靶子" 状态系统 + 回合末 50 物理 + 20 流血
- e_wave: 3 stacks + 全队 buff/debuff
- e_ghost: 检 dodge 而非随机概率
- e_ripple: 全队 hook (3% lost HoT)

工作量大, 留 P59+ 后续 commit (按用户工作流: 1 件 1 commit).

## 结论
P58 修复 2 件 (thunder_shell, hourglass), 验证 6 stat-boost + 大部分 special-effect 已 1:1.
剩 ~10 件复杂装备 deferred 至 P59+ 后续 commits.
P58 已交付: 装备 audit doc + 2 个高优先级修复.
