# 审计 A 组：basic / stone / bamboo / angel / ice / ninja / two_head

审计对象：`src/data/pets.ts` 描述 vs `src/engine/skill-handlers.ts` / `src/engine/passive-triggers.ts` / `src/scenes/BattleScene.ts` 实际行为。
分类：NUMERIC（数值）/ BEHAVIOR（行为）/ EDGE（边界bug）/ UNDOCUMENTED（未写明）/ DESC-GAP（描述含糊）。

---

## 小龟 (basic)

- **被动「不屈」(basicTurtle)** ✅ 一致 — bonusMap C20/B23/A26/S29/SS32/SSS34 与描述逐项相符；攻击命中按目标稀有度乘 `(1+pct/100)`，见 `skill-handlers.ts:620-624`（turtleShieldBash 内）。
  - ⚠️ DESC-GAP（低）：增伤仅在显式读取 `basicTurtle.bonusMap` 的 handler（如 turtleShieldBash:620）生效；通用 `dealPhysical` 是否对所有技能都应用此加成需依赖 `passiveDmgMult`，描述「攻击时」未限定技能。多数小龟技能走 `dealPhysical`，应已覆盖，但 turtleShieldBash 手动重算了一遍（潜在与 dealPhysical 路径重复/不一致风险）。
- **攻击 (physical, hits2 atkScale0.7)** ✅ 一致 — 2 段 × 0.7×ATK = 1.4×ATK，`skill-handlers.ts:547-593`。
- **龟盾 (turtleShieldBash)** ✅ 一致 — `0.7×ATK + 20%目标已损HP` 物理（`:613-614`），护盾 = `80%×伤害` 永久盾（`:715-717`），击飞（`:683`）。
- **打击 (basicBarrage, hits10 atkScale3.1)** ✅ 一致 — `total = atk×3.1`，10 段平摊随机分布存活敌（`:761-763, 784`）。
- **龟派气波 (basicChiWave)** ✅ 一致 — 自身 1 回合 critUp25/critDmg20/lifesteal10/穿甲(0.1×ATK)（`:846-852`）；对「目标所在横排」3 连，`2.3×ATK/3` 每段（`:858-861`）。注：代码用 `sameColumnFighters`，按 `slot-helpers.ts:7` 注释该函数即屏上横排，命名易误解但语义正确。
- **过肩摔 (basicSlam)** ✅ 一致 — 主目标 `0.7×ATK + 26%目标最大HP`（`:1094-1095`），其余敌 `0.2×ATK + 19%主目标最大HP`（`:1111-1112`），击飞。
  - ⚠️ DESC-GAP（低）：溅射伤害 `splashHpPct` 基于**主目标**最大HP（描述已写明「主目标最大生命值」），代码 `:1112` 用 `target.maxHp` 正确，无误。

---

## 石头龟 (stone)

- **被动「坚壁」(stoneWall)** ✅ 一致 — 每回合 `initDef/capTurns`（分数累加 round 差值），上限 `initDef×100%`（`BattleScene.ts:4970-4988`）；反弹 `5 + 1×DEF + 0.5×MR (%)`（`passive-triggers.ts:141-146`）。
- **打击 (physical, atkScale0.35 defScale0.75 mrScale0.4, hits2)** ✅ 一致 — 每段 `0.35ATK+0.75DEF+0.4MR`，2 段合计 `0.7ATK+1.5DEF+0.8MR`（physical handler 逐段加 def/mr，`:567-570`）。
- **岩石护甲 (shield, aoeAlly, shieldAtkScale0.24 shieldHpPct5)** ✅ 一致 — 全友军 `0.24ATK + 5%最大HP` 护盾（`:1135-1136`），buff 持续 3 回合。
- **磐石 (heal, defUpPct20/3 mrUpPct20/3)**
  - ⚠️ **BEHAVIOR（中）**：描述「以**自身**的防御属性为其加固，提升 `{D:DEF*0.2}` 护甲和 `{M:MR*0.2}` 魔抗」——`{D:DEF}` 应为石头龟自身 DEF。但 `heal` handler `:5653` 用 **目标(tgt)** 的 `baseDef × 20%`、`:5659` 用目标 `baseMr × 20%`，即基于**接受者**属性而非施法者。石头龟高防、队友低防时实际加成远低于描述暗示。
  - ⚠️ **UNDOCUMENTED（中）**：磐石 `type:"heal"` 且无 `hot`，故触发即时治疗分支 `:5627`，治疗量 = `caster.atk × (atkScale??1.0)`（atkScale 未定义→默认 1.0），即**额外回目标约 1×ATK 生命值**。描述完全未提治疗，只写护甲/魔抗增益。
- **磐石之躯 (stoneShield, shieldHpPct20)** ✅ 一致 — 自身 `20%最大HP` 永久护盾（`:2354-2356`）。描述「持续3回合」实为永久盾（仅状态图标显示用），属常规约定。
- **嘲讽 (stoneTaunt, redirectTurns3 selfShieldAtkScale1)** ✅ 一致 — 加 `redirectAll` buff 3 回合 + `1.0×ATK` 永久盾（`:2369-2374`）；单体转移、AoE 不受影响由 BattleScene redirect 消费逻辑处理。

---

## 竹叶龟 (bamboo)

- **被动「生长」(bambooCharge)** ✅ 一致 — 每 2 回合充能（`BattleScene.ts:5047-5054`）；充能攻击 `75%ATK+8%HP` 魔法、回 `8%HP`、永久 `+60%ATK` 最大HP（`fireBambooChargeIfReady:3024-3064`，`chargeDmgType:"magic"` → `calcDamage(...,'magic')`）。
  - ⚠️ UNDOCUMENTED（低）：充能回血受 `healReduce` 削减（`:3058-3060`），描述未提（治疗削减通用规则，可接受）。
- **一叶刃 (bambooLeaf, hits3 atkScale0.21 selfHpPct6)** ✅ 一致 — 每段 `0.21ATK + 6%最大HP`，3 段（`:2403`）。
- **自然恢复 (bambooHeal, healPct10 shieldPct12/3 soloHealPct15)** ✅ 一致 — 有队友：自回 `10%HP` + 每友军 `12%HP` 护盾 3 回合；无队友：自回 `15%HP`（`:2421-2447`）。
- **竹击 (bambooSmack, atkScale1 chilled1 knockToFront ignoreRow)** ✅ 一致 — `1.0×ATK` 物理 + 冰寒 1 回合(-20%ATK) + 后排空位则击至前排（`:2456-2486`），可任意目标。
- **强化生长 (bambooCharged, passiveSkill)** ✅ 一致 — 装备后切高数值 atkPct→100、selfHpPct→13、healSelfHpPct→12、hpGainAtkPct→105（`BattleScene.ts:1313-1315` + `:3024-3027`），与描述 `ATK+HP*0.13` / `HP*0.12` / `ATK*1.05` 完全对应。
- **竹刺阵 (bambooSpikes, aoe hits5 atkScale0.18 selfHpPct3)** ✅ 一致 — 全敌每段 `0.18ATK + 3%最大HP`，5 段（`:2500-2509`）。

---

## 天使龟 (angel)

- **被动「审判」(judgement, hpPct11)**
  - ✅ 数值一致 — 命中额外 `目标当前HP × 11%` 魔法（`passive-triggers.ts:496-507`），用 `target.hp`（当前生命）正确，且不吃暴击（描述「独立结算」一致）。
  - ⚠️ **BEHAVIOR（中）**：描述「该额外伤害**不触发其他被动**」，但代码 `:509` 对审判伤害再调 `applyTargetReflect`（触发石头龟反伤等），且 `:512-521` 对审判伤害也吸血。注释明确这是用户特意要的（审判要吃反伤+吸血），故与当前描述文字相矛盾——应更新描述或视为已知特例。
- **裁决 (physical, hits4 atkScale0.35)** ✅ 一致 — 4 段 × 0.35 = 1.4×ATK。
- **祝福 (angelBless, shieldScale1.2 defBoostScale0.15)** ✅ 一致 — 单友军 `1.2×ATK` 护盾 + `0.15×ATK` 护甲&魔抗 4 回合（`:1182-1196`）。描述护盾「持续3回合」实为永久盾（约定）。
- **平等 (angelEquality)** ✅ 一致 — 2 段 `1.0×ATK` 物理 + A 级以上追加第 3 段真伤 `0.5×ATK + 10%目标已损HP` + 本次施法 10% 生命偷取（含审判与第3段，`:5374-5440`）。
- **圣光 (angelRevive, passiveSkill)** ✅ 一致 — 首次死亡以 `25%最大HP` 自复活一次，`_angelReviveUsed` 防多次（`BattleScene.ts:3932-3940`）。
  - 注：`skill-handlers.ts:5356` 的同名 active handler（复活已死队友）为死代码，passiveSkill 不会作为主动技释放，玩家不可见。
- **神罚 (angelSmite, waveCount3 atkScale1.5)** ✅ 一致 — 对 `_dmgDealt` 最高敌 3 道 × `1.5×ATK` 物理，施加冰寒/治疗削减各 3 回合，永久偷 `3+0.2×(LV-1)` 护甲魔抗（`:1204-1265`）。

---

## 寒冰龟 (ice)

- **被动「冰寒」(frostAura, atkDownPct20 atkDownTurns6, bonus lava/phoenix +20%)**
  - ✅ 登场冰寒部分一致 — 全敌 atkDown20% × 6 回合（`BattleScene.ts:4831-4838`）。
  - ⚠️ **BEHAVIOR（中）**：描述「对熔岩龟和凤凰龟造成额外 +20% 伤害」，但 `bonusDmgPct` 仅在**部分** handler 中读取（turtleShieldBash `:626-629`、iceSpike 物理段 `:3572-3575`）；`iceFrost`(`:3470`)、`iceFreeze`(`:3521`) 等寒冰龟自身主力技能**未应用**此克制加成。即对熔岩/凤凰的 +20% 并非全技能生效。
- **冰锥 (iceSpike, hits6 totalScale1.4)** ✅ 一致 — 6 段交替物理(i偶)/魔法(i奇)，各 3 段，合计物理 `0.7×ATK` + 魔法 `0.7×ATK`（= `1.4×ATK×0.5` 各，`:3551-3553`）。
- **极寒 (iceBurnImmune, passiveSkill)** ✅ 一致 — 装备后免疫灼烧 + 把 frostAura 克制 20%→40%（`BattleScene.ts:1206-1213`）。同上克制仅部分技能生效的限制。
- **冰霜 (iceFrost, hits10 atkScale0.18 mrDown25/4)** 
  - ✅ 数值一致 — 先全敌 -25% 魔抗，再 10 段 × `0.18×ATK` 魔法 = `1.8×ATK`（`:3473-3514`）。
  - ⚠️ **EDGE（中）**：mrDown buff 写 `duration: mrDown.turns`（=4，`:3486`），**未** +1，而项目内其它 debuff（armorBreak/healReduce/chilled/defDown 等）均用 `turns+1` 抵消回合末 -1。故冰霜减抗实际有效回合比描述「4回合」少一回合（off-by-one 偏短）。
  - ⚠️ **EDGE（低）**：`:3488` 立即手动 `e.mr -= baseMr×25%`，同时又 push mrDown buff（recalc 时通常会再依据 buff 重算）。若 recalc 重新基于 buff 应用减抗，存在与立即扣减叠加/双扣的风险，建议核查 `recalcStats` 是否会重置 mr 后再按 buff 减。
- **冰封 (iceFreeze, atkScale0.6 stun100%)** ✅ 一致 — `0.6×ATK` 魔法 + 必中眩晕 1 回合（`:3523-3542`，buff duration2 = 1 有效回合）。
- **团队护盾 (commonTeamShield, shieldScale0.5)** ✅ 一致 — 全友军 `0.5×ATK` 护盾 3 回合（`:1147-1158`）。

---

## 忍者龟 (ninja)

- **被动「忍术」(ninjaInstinct, crit+30 critDmg+20 armorPen+8)** ✅ 一致 — 开局永久 +30% 暴击、+20% 暴击伤害、+8 穿甲（`BattleScene.ts:1162-1167`）。
- **冲击 (ninjaImpact, atkScale1.3 behindScale0.8)** ✅ 一致 — 首目标 `1.3×ATK`，正后方 `0.8×ATK`（`:1495-1496` + mid-flight 命中）。
- **手里剑 (ninjaShuriken, atkScale1.6)** ✅ 一致 — `1.6×ATK` 物理；暴击时 `min(100, 40+2×LV)%` 转真伤（`:1727-1730`）。token `{40+2*LV}%` 在 LV1=42% 与代码一致。
- **炸弹 (ninjaBomb, atkScale1.1 armorBreak25/3)** ✅ 一致 — 全敌 `1.1×ATK` 物理 + -25% 护甲 3 回合（`turns+1`，`:1858-1863`）。
- **背刺 (ninjaBackstab, hits3 atkScale0.6667 armorPenBuff5/1 ignoreRow)** ✅ 一致 — +5 穿甲 1 回合后闪现背刺 3 段 × `0.6667×ATK` ≈ `2.0×ATK`，可越前排（`:1891-1948`）。
- **忍者足 (ninjaFeet, passiveSkill)** ✅ 一致 — 装备后 +25% 闪避、+40% 暴击（`BattleScene.ts:1177-1181`）。

---

## 双头龟 (two_head)

- **被动「双生」(twoHeadDual, hpScale1.5 defScale0.25 atkLossScale0.3 shieldScale1.1)** ✅ 一致 — 纯换形被动，无每回合 ATK 增长（`BattleScene.ts:5035` 注释确认删除自创增长）；切近战属性变化由 twoHeadSwitch handler 实现，数值与描述对应。
- **魔法波 (twoHeadMagicWave, hits4 atkScale0.4)** ✅ 一致 — 4 段交替物理(2)/真伤(2)，各 `0.4×ATK×2`（`:3881-3911`）。
- **灵能冲击 (physical, aoe atkScale0.85 hpPct15)** ✅ 一致 — 全敌 `0.85×ATK + 15%目标最大HP` 物理（physical handler `:570`）。
- **切换近战 (twoHeadSwitch→melee, switchAtkScale1.2)**
  - ✅ 切换属性一致 — +1.5×ATK 最大HP/+0.25×ATK 护甲/魔抗(=defGain)/-0.3×ATK 攻击/+1.1×ATK 护盾（`:3963-3989`）。
  - ⚠️ **BEHAVIOR（中）**：描述「并对**目标**造成 `{N:ATK*1.2}` 物理」，但 melee 分支 `:3993-3998` 攻击的是**当前 HP 最低的敌人**（`enemies.reduce(min hp)`），而非玩家选定 target。（注：切换远程分支 `:4021` 则正确打选定 target。）两个切换技攻击目标逻辑不一致。
- **精神干扰 (twoHeadMindBlast, atkScale1 healReduce50/3 shieldBreak50)** ✅ 一致 — `1.0×ATK` 魔法 + 破 50% 护盾 + 治疗削减 50% × 3 回合（`:3918-3947`）。
- **融合 (twoHeadFusion, passiveSkill, 与切换近战互斥)** ✅ 一致 — 常驻获得近战形态 +1.5×ATK HP / +0.25×ATK 甲抗 / +1.1×ATK 盾（`BattleScene.ts:1218-1231`）。
- **锤击 (twoHeadHammer, atkScale1.4 shieldFromDmgPct50)** ✅ 一致 — `1.4×ATK` 物理 + `50%伤害` 永久盾（`:3854-3875`）。
- **吸收 (twoHeadAbsorb, atkScale0.6 hpPct8 healAtkPct40 healLostPct18)** ✅ 一致 — `0.6×ATK + 8%目标最大HP` 物理，回 `40%ATK + 18%自身已损HP`（`:4036-4065`）。
  - ⚠️ UNDOCUMENTED（低）：回血直接加 `caster.hp` 不走 `applyHeal`，故**不吃治疗削减**（描述未涉及，但与多数回血规则不一致）。
- **切换远程 (twoHeadSwitch→ranged, atkScale1.4 defReduction25/4)** ✅ 一致 — 还原属性 + 对目标 `1.4×ATK` 物理 + -25% 护甲 4 回合（`:4000-4026`）。
- **双头坚韧 (twoHeadResilience, passiveSkill)**
  - ✅ 行为基本一致 — 每受一段攻击 +1 护甲+1 魔抗，上限 20（实际生效逻辑在 `passive-triggers.ts:212-225`，用 `_twoHeadResStacks`；`BattleScene.ts:1236` 置 `_twoHeadResilience=true`）。
  - ⚠️ **EDGE/DESC-GAP（中）**：detail 文本 token `{resilienceDef}`/`{resilienceMr}` 绑定到 `_resilienceDefGain`/`_resilienceMrGain`（`skill-text.ts:135-136`），但真正的叠层逻辑写的是 `_twoHeadResStacks` 字段；`_resilienceDefGain` 从未被初始化/递增（`passive-triggers.ts:273` 的 6d 块因 `!== undefined` 永不触发，是死代码）。结果：详情面板「已获得 X 护甲和 Y 魔抗」**永远显示 0**，与实际叠加值不符。

---

## 小结（本组最高优先级问题）

1. **石头龟·磐石 BEHAVIOR（中）**：描述说按「自身」DEF/MR 加固，代码却按**接受者**的 baseDef/baseMr 算（`skill-handlers.ts:5653/5659`）——高防石头龟给低防队友加固时远弱于描述预期。
2. **石头龟·磐石 UNDOCUMENTED（中）**：磐石额外即时治疗目标约 `1×ATK` 生命（`heal` handler 默认 atkScale=1.0，`:5627`），描述只字未提治疗。
3. **双头龟·切换近战 BEHAVIOR（中）**：描述「对目标造成 1.2×ATK」，实际打**HP 最低敌人**而非选定目标（`:3993-3998`）；与切换远程的目标逻辑不一致。
4. **双头龟·双头坚韧 EDGE（中）**：面板计数 token 绑到从未更新的字段，「已获得 X 护甲/魔抗」恒显示 0（`skill-text.ts:135-136` vs `passive-triggers.ts:212`），实际叠层正常但 UI 误导。
5. **寒冰龟·冰寒被动 BEHAVIOR（中）**：「对熔岩/凤凰 +20%」克制仅部分技能读取，iceFrost/iceFreeze 等主力技未生效（`bonusDmgPct` 仅 turtleShieldBash/iceSpike 检查）。
6. **寒冰龟·冰霜 EDGE（中）**：mrDown buff duration 缺 +1（`:3486`），减抗有效回合比描述「4回合」少一回合；另立即扣减 + buff 可能双扣，需核查 recalc。
7. **天使龟·审判 BEHAVIOR（中）**：描述「不触发其他被动」，但实际触发目标反伤并吸血（`passive-triggers.ts:509/512`）——已知特例，建议同步描述。
