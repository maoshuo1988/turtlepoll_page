# Group 1 审计 (basic/stone/bamboo/angel/ice)

> 三方交叉: 描述 `src/data/pets.ts` ↔ 实现 `src/engine/skill-handlers.ts` / `passive-triggers.ts` / `BattleScene.ts` ↔ 审计 `skill-audit.json` / `passive-audit.json`。
> 重要审计台前提 (`src/dev/skill-audit.ts`): dummy = **rarity C, 0 防/魔抗, HP 1,000,000**, caster 关暴击 (crit=0)。
> 故 `dmgToPrimary` 巨大值 = **%最大/当前生命缩放** 或 **判定/审判类被动 (% 当前 HP)** 命中海量 HP 木桩的正常结果, 不是 bug。

---

## 小龟 (basic)

### 被动: 不屈 (basicTurtle) — ✓ — 攻击时按目标稀有度 +%伤害, 在 `damage.ts:60-64` 单次应用 (bonusMap[rarity])。验证: 攻击 0.7×40×2=56 基础, audit dmgToPrimary=68 = 28×1.2×2 (C级 +20%) 正好命中, 加成确实生效 (`skill-handlers.ts` calcDamage 路径)。passive-audit 显示"无变化"是该 harness 无法隔离 bonusMap, 非 bug。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 攻击 | physical | 2段物理 共140%ATK | 68物理/单体/touched1 (28×1.2×2) | ✓ | physical handler `skill-handlers.ts:543`; dealPhysical 记 'phy' :342 |
| 龟盾 | turtleShieldBash | 70%ATK+目标已损HP20% 物理, 获80%伤害值永久盾, 击飞 | 34物理, casterShield=27 (≈34×0.8), 全HP木桩故已损HP=0 | ✓ | `skill-handlers.ts:641,651-652,757`; 永久盾直写 caster.shield :759 |
| 打击 | basicBarrage | 10道随机分布 共310%ATK 物理 | dmgToAll=150, touched=3 (10弹平摊3木桩), dmgToPrimary=30 | ✓ | `skill-handlers.ts:800,803-805`; perHit=3.1×40/10 physical |
| 龟派气波 | basicChiWave | 自获+25%暴/+20%爆/+10%吸/+0.1ATK穿甲(本回合), 横排3段共230%ATK 物理, 击飞 | dmgToPrimary=120, casterBuffsAfter=chiWaveActive:0/1 | ✓ | `skill-handlers.ts:879,890-894`; buff 立即 recalc, duration1(本回合) |
| 过肩摔 | basicSlam | 主目标 70%ATK+26%目标最大HP; 其余 20%ATK+19%主目标最大HP, 物理, 击飞 | dmgToPrimary=312034 (=0.7×40+0.26×1e6), dmgToAll=768054, touched=3 | ✓ | `skill-handlers.ts:1068,1148-1149,1165-1166`; %最大HP 缩放正确, 巨值=木桩HP |

---

## 石头龟 (stone)

### 被动: 坚壁 (stoneWall) — ✓ — 反伤: pct = 5% + 1%×DEF + 0.5%×MR (`passive-triggers.ts:140-147`), passive-audit `atk:[hp-24]` 与 stone(def18/mr15→30.5%) 自洽。每回合永久 +护甲(=initDef×100%/6, 上限 initDef) 写 baseDef, 带换龟防重触发守卫 (`BattleScene.ts:5108-5128`)。反伤记 'phy' :135。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 打击 | physical | 2段 共70%ATK+150%DEF+80%MR 物理 | 64物理/单体 (defScale0.75 mrScale0.4 = 70%ATK等) | ✓ | physical handler 读 defScale/mrScale `skill-handlers.ts:546-547,564-566` |
| 岩石护甲 | shield(aoeAlly) | 全体友军 24%ATK+5%最大HP 护盾 | casterShield=33 (0.24×36≈9 + 5%×480=24) shield:33/3 | ✓ | `skill-handlers.ts:1180,1190-1191`; applyShield 永久, buff仅状态图标计时 |
| 磐石 | heal(无atkScale) | 单友军 +20%DEF护甲 +20%MR魔抗 3回合 (按石头龟自身属性), 无治疗 | defUp:4/4,mrUp:3/4 (0.2×18=3.6→4, 0.2×15=3) 无回血 | ✓ | `skill-handlers.ts:5744,5749(无atkScale不回血),5776-5787`; 用 caster.baseDef/baseMr |
| 磐石之躯 | rockShockwave | 一横排 (50%DEF+50%MR)×(1+4%×岩层) 物理 + 1%×层眩晕, 击飞 | 17物理 (无岩层 mult=1: 0.5×18+0.5×15=16.5→17), 无眩晕(层0) | ✓ | `skill-handlers.ts:2419,2421-2434`; 岩层来自 _rockLayers, 审计无层故基线 |
| 嘲讽 | stoneTaunt | 嘲讽3回合(单体伤害转移) + 100%ATK 永久盾 | redirectAll:1/3, casterShield=36 (1.0×36) | ✓ | `skill-handlers.ts:2464-2476`; redirect 消费在 BattleScene; 永久盾 |

---

## 竹叶龟 (bamboo)

### 被动: 生长 (bambooCharge) — ✓ — 隔回合充能, 释放技能后追加强化攻击: 魔法 75%ATK+8%最大HP, 回 8%最大HP, 永久 +60%ATK 最大HP (`BattleScene.ts:3128-3207`, 记 'mag' :3173)。强化生长(bambooCharged passiveSkill) 转 100%ATK+13%HP / 回12% / +105%ATK HP (`BattleScene.ts:1335-1338, 3153-3157`)。仅技能后触发, 故不在 skill-audit / passive-audit 体现 (harness 不连放)。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 一叶刃 | bambooLeaf | 3段 每段 21%ATK+6%最大HP 物理 | 99物理/单体 ((0.21×40+0.06×418)×3≈100) | ✓ | `skill-handlers.ts:2491,2501-2502`; dealPhysical 记'phy' |
| 自然恢复 | bambooHeal | 自回10%最大HP + 队友12%最大HP永久盾; 无队友改回15% | dmg0/盾0/hpDelta0 (audit caster满HP且无友军→solo回血但满血=0) | ⚠️ | `skill-handlers.ts:2516-2545`; 逻辑正确, 但 audit 无友军/满血故护盾·治疗均不可见 → **队友护盾/治疗 待眼验** |
| 竹击 | bambooSmack | 100%ATK 物理 + 冰寒1回合(-20%ATK) + 后排空则击至前排 | 40物理, chilled:1/2 | ✓ | `skill-handlers.ts:2552-2563`; chilled -20%ATK 见 stats-recalc.ts:33 |
| 强化生长 | bambooCharged | (passiveSkill) — | (不测) | ✓ | stub `skill-handlers.ts:5832`; 实逻辑在 bambooCharge 被动 (上) |
| 竹刺阵 | bambooSpikes | 全体5段 每段 18%ATK+3%最大HP 物理 | dmgToPrimary=100, dmgToAll=300, touched=3 ((0.18×40+0.03×418)×5≈99) | ✓ | `skill-handlers.ts:2584-2599`; AOE 全敌, 记'phy' |

---

## 天使龟 (angel)

### 被动: 审判 (judgement) — ✓ — 每段命中额外 11%目标当前生命魔法伤害, 独立结算不暴击, 经魔抗减免, 会触发反伤+吸血 (`passive-triggers.ts:497-526`, 记 'mag' :508)。passive-audit `tgt:[hp-11000]` = 11%×100000 正好。这是裁决/平等/神罚审计中巨额 dmgToPrimary 的主因 (% 当前 HP × 海量 HP 木桩)。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 裁决 | physical | 3段 共140%ATK 物理 | dmgToPrimary=295079 (物理~59 + 审判3段×11%当前HP≈295000) | ✓ | physical handler; 物理记'phy', 审判记'mag' 分型 (passive-triggers:508) |
| 祝福 | angelBless | 单友军 120%ATK 永久盾 + 15%ATK 护甲&魔抗 4回合 | dmgToPrimary=-50(目标获盾50=1.2×42), defUp:6/5,mrUp:6/5(0.15×42=6, 4+1) | ✓ | `skill-handlers.ts:1242,1248-1252`; 永久盾(shieldTurns不消费) |
| 平等 | angelEquality | 2段物理(100%ATK/段) + 本次10%吸血; 目标A级以上追加真伤 50%ATK+10%已损HP | dmgToPrimary=207970(物理~84+审判2段), touched=2[目标,自身]; **C级木桩→无第3段真伤** | ✓ | `skill-handlers.ts:5495,5502,5513-5557`; phy/真伤分型记 :5523/:5547; antiHighRarity 门控正确(C不触发) |
| 圣光 | angelRevive | (passiveSkill) 首次死亡25%最大HP重生1次 | (不测; stub) | ✓ | stub :5491; 复生在 `BattleScene.ts:4144-4153` (_angelReviveUsed 防多次, hpPct25) |
| 神罚 | angelSmite | 自动选伤害最高敌, 3道波 各150%ATK 物理 + 冰寒+治疗削减(各3回合) + 永久偷 3+0.2(LV-1) 护甲魔抗 | dmgToPrimary=0(自动选非主目标), dmgToAll=295181(3波物理+审判), touched=2 | ✓ | `skill-handlers.ts:1264,1277-1320`; phy记'phy':1289; chilled/healReduce/偷甲见:1297-1320。dmgToPrimary=0 是auto-target随机命中其他木桩, 非bug |

---

## 寒冰龟 (ice)

### 被动: 冰寒 (frostAura) — ✓ — 登场对全敌施冰寒(=-20%ATK) `atkDownTurns`(6)+1 回合 (`BattleScene.ts:5060-5066`); 对熔岩/凤凰 +20% (`damage.ts`/handler frostAura 检查)。登场效果, 不在 per-hit harness 体现。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 冰锥 | iceSpike | 6段交替 共70%ATK物理 + 70%ATK魔法 (totalScale1.4) | 60/单体 (1.4×42=58.8, 半物理半魔法) | ✓ | `skill-handlers.ts:3649,3652-3653`; 偶数段物理记'phy':3680, 奇数段魔法记'mag':3695 分型正确 |
| 极寒 | iceBurnImmune | (passiveSkill) 免疫灼烧 + 对熔岩/凤凰改+40% | (不测; stub) | ✓ | stub :5918; _burnImmune flag (dot.ts:22) + frostAura.bonusDmgPct 20→40 (`BattleScene.ts:1222-1228`) |
| 冰霜 | iceFrost | 全敌 -25%魔抗 4回合, 后全敌10段 共180%ATK 魔法 | mrDown:25/5(4+1), touched=3, dmgToPrimary=80(10×0.18×42), dmgToAll=240 | ✓ | `skill-handlers.ts:3566,3576-3588,3594-3614`; 全段魔法记'mag':3606 |
| 冰封 | iceFreeze | 60%ATK 魔法 + 必中眩晕1回合 | 25魔法(0.6×42=25.2), stun:1/2 | ✓ | `skill-handlers.ts:3620-3640`; 记'mag':3631, 必中stun |
| 团队护盾 | commonTeamShield | 全体友方 50%ATK "永久护盾" | casterShield=21(0.5×42), shield:21/4 | ✓ (盾值永久; 状态图标计时) | `skill-handlers.ts:1207-1218`; applyShield 永久写 f.shield, shield buff(dur4)仅状态图标——tickBuffsDuration 到期只删buff不扣shield(stats-recalc.ts:104-112), 故"永久"语义成立 |

---

## 本组问题清单

无 ✗Bug。所有主动技能的伤害类型、段数/AOE、buff/护盾/治疗/吸血、混合伤害分型统计、%缩放公式、被动均与描述一致, 审计数值可解释。

- [低] **竹叶·自然恢复 (bambooHeal)** ⚠️: 审计 harness 无友军且 caster 满血, 故"队友12%永久护盾"与"自回血"在 audit 中均不可见 (dmg0/盾0/hpDelta0)。代码逻辑正确 (`skill-handlers.ts:2516-2545`), 但**队友护盾施加 + 无友军时自回血 待实战/眼验**。
- [低] **寒冰·团队护盾 (commonTeamShield)** ⚠️(已澄清非bug): 描述写"永久护盾", 实现 push 一个带 `duration=4` 的 shield buff (`skill-handlers.ts:1215`)。经查 `tickBuffsDuration` (stats-recalc.ts:104-112) 到期只移除 buff、**不扣减 `f.shield`** → 盾值实际永久, buff 仅驱动状态栏图标计时显示。语义与"永久"一致; **唯状态栏图标在 N 回合后消失而盾仍在, 属显示口径, 显示待眼验**。(同理 stone 岩石护甲。)
- [低] **天使·神罚 / 平等 touched 计数**: 二者 return `[target, caster]`(神罚)/`[target, caster]`(平等) 使 audit `touched=2`, 但实为单体技能 (caster 入列仅为吸血/偷甲结算)。非 bug, 仅审计 touched 字段口径需知悉; 显示/飘字待眼验。

### 关键确认 (易被误判为 bug 的项)
- 过肩摔 312034 / 裁决 295079 / 平等 207970 / 神罚 295181 等巨值 = %最大或%当前HP缩放 + 审判被动命中 1,000,000 HP 木桩的**正确结果**。
- 神罚 dmgToPrimary=0 = 自动选"伤害最高敌", 木桩 _dmgDealt 全0 平局随机命中非主目标 → 正确。
- 混合伤害分型记统计全部正确: 冰锥 phy+mag、平等 phy+true、审判额外伤害 mag 均各走各的 `battleStats.recordDamage(...,'phy'/'mag'/'tru')`。
