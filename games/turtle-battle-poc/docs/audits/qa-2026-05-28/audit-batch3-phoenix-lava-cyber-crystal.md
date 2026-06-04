# 审计 Batch3 — 凤凰 / 熔岩 / 赛博 / 水晶（换形/复杂龟）

审计日期 2026-05-29。比对 `src/data/pets.ts` 描述（含 `volcanoSkills` 形态技能组）vs 实际代码行为。仅发现，不改源码。

文件缩写：`pets`=src/data/pets.ts，`SH`=src/engine/skill-handlers.ts，`PT`=src/engine/passive-triggers.ts，`BS`=src/scenes/BattleScene.ts，`DMG`=src/engine/damage.ts，`dot`=src/engine/dot.ts，`fighter`=src/engine/fighter.ts。
JS 参考路径：`games/turtle-battle/js/`。

## 基线复核（27 号 C/D 组）
- **熔岩之心变身 AOE**（C 组 🔴，原 `transformAoeDmgScale=0.5`）→ **已修**。pets:2506 现为 `1.2`，BS:5846 `?? 1.2`，AOE = `f.atk(=1.2×base) × 1.2 = 1.44×base`，与 desc token `{M:ATK*1.2+ATK*0.2*1.2}`(=1.44×base) 一致。✅
- **熔岩喷射 aoe:true 只打单体**（C 组 🔴）→ **已修**。SH:2811-2812 `isAoe ? getEnemies : [target]`，真·全体。✅
- **赛博·强化浮游炮 机甲 +3×炮数 护甲/魔抗未实装**（D 组 🔴）→ **已修**。BS:4363-4364 `_cyberEnhanced ? 3*dc : 0`，与 JS action.js:369 `dc*3` 1:1。✅
- 糖果/缩头的 `selfHpPct`/`selfDefUpPct` 未读（C/D 组）→ **已修**（SH:563、SH:587），与本批无关但顺带确认通用 physical handler 现已读。

---

## 凤凰龟 (phoenix) — pets:2375
基础：HP 430 / ATK 42 / DEF 12 / MR 15 / crit 0.25。被动 涅槃(phoenixRebirth)。技能池：灼烧 / 熔岩盾 / 烫伤 / 强化涅槃(passive) / 火焰净化。默认 [0,1,2]。

| 描述声明 | 代码实现 | 判定 |
|---|---|---|
| 涅槃：首次死亡 30% maxHp 复活（强化 100%+永久+20%ATK） | BS:4037-4056，`_rebirthUsed` 一次性，30%/100%，enhanced +20% baseAtk | ✅ |
| 涅槃：对全体敌灼烧 `{0.67*ATK}` + 治疗削减-50%，持续3回合 | BS:4063 `applyDotStacks burn defaultBurnStacks`(=round atk×0.67)；BS:4069 healReduce value50 duration3 | ⚠️ 见 D1 |
| 灼烧(basic)：`{M:0.9*ATK}` 魔法 + `{0.53*ATK}` 灼烧 | SH:2035-2041，base atk×0.9 dealMagic；dot=round(atk×0.53) | ✅ |
| 熔岩盾：`{S:0.75*ATK}` 护盾4回合 + 在盾时受击反击 `{M:0.14*ATK}` | SH:2049-2056，shield atk×0.75；counter buff dur=4+1；PT 仅 shield>0 触发 | ✅ |
| 烫伤：破盾50%(含泡泡盾) + `{M:0.7*ATK}` + atk/def/mr-15% 4回合 + `{0.67*ATK}`灼烧 + 治疗削减，均4回合 | SH:2060-2089，三 debuff `turns+1`(=5)；burn defaultBurnStacks；healReduce duration5(=4回合) | ✅ |
| 强化涅槃 | BS:4039-4051 经 `_passiveSkills` 检测 | ✅ |
| 火焰净化：清友方全部减益，每清1个回10%maxHp | SH:2092-2107，debuff 列表+chilled/stun，每个10%×maxHp | ✅ |

### 详情
- **D1（DESC-GAP，低）** 涅槃灼烧"持续3回合"措辞：灼烧是层数衰减模型（dot.ts duration:999，每回合×2/3 衰减，BS:7594-7595），并非定长3回合。"持续3回合"仅精确描述同时施加的"治疗削减"（BS:4069 duration3）。灼烧数值 `{0.67*ATK}` 一致。沿用 27 号判定，非新问题。
  - 附注：涅槃 healReduce 用 `duration:3`（非 `turns+1`），因在死亡时刻（回合中）施加，且 JS state.js:172 同款 duration3。与"持续3回合"基本一致，不计偏差。

---

## 熔岩龟 / 火山龟 (lava) — pets:2486（换形龟，含 volcanoSkills）
基础：HP 390 / ATK 40 / DEF 14 / MR 16 / crit 0.25。被动 熔岩之心(lavaRage)。小形态技能：熔岩弹/地裂/岩浆涌动/熔岩喷射/强化熔岩之心(passive)。`volcanoSkills`：烈焰重击/熔岩铠甲/火山爆发/岩浆践踏/强化熔岩之心(passive)。默认 [0,1,2]。

| 描述声明 | 代码实现 | 判定 |
|---|---|---|
| 怒气：造伤25% + 受伤(hpLoss)20%，满100变身 | PT:256-269，rageDmgPct25 / rageTakenPct20（打盾不积） | ✅ |
| 变身加成：maxHp `+{H:ATK*2.5}`、atk/def/mr 各 `+{*:ATK*0.2}`，6回合 | BS:5794-5809，基于 preAtk；transformDuration 6 倒计时 | ✅ |
| 变身 AOE：全体 `{M:ATK*1.2+ATK*0.2*1.2}`(≈1.44×base) 魔法 + 灼烧 + 每令一敌灼烧回8%已损HP | BS:5846-5877，aoeScale1.2 × postAtk(1.2×base)=1.44×base；burnImmune 不施不回；回8%已损 | ✅（基线🔴已修） |
| 熔岩弹：`{M:0.9*ATK}` + 8%目标maxHp 魔法（HP段不过魔抗）+ 灼烧4回合 | SH:2746-2768，mainDmg 过魔抗 + hpBonus 不过 + applyBurn dur5 | ✅ |
| 地裂：全体 `{M:0.6*ATK}` 魔法 + 魔抗-20% 3回合(max-merge) | SH:2772-2792 | ✅ |
| 岩浆涌动：`{M:1.5*ATK}` 魔法 + `{S:0.8*ATK}` 永久护盾 | SH:2794-2804 applyShield 无 duration | ✅ |
| 熔岩喷射：全体3段共 `{M:0.2*ATK*3}` 魔法 + 灼烧4回合（aoe:true） | SH:2809-2827，isAoe→getEnemies 真全体 | ✅（基线🔴已修） |
| 强化熔岩之心：开局100怒气立即变身（火山形态少一槽） | BS:1273-1277 设 `_lavaRage=100/_lavaRageReady` | ⚠️ 见 L1（"少一槽"未实现） |

### 火山形态技能 (volcanoSkills)
| 描述声明 | 代码实现 | 判定 |
|---|---|---|
| 烈焰重击：`{N:1.3*ATK}` + 8%自身maxHp 物理 + 20%吸血 | SH:4525-4551 | ✅ |
| 熔岩铠甲：`{S:0.9*ATK}` 盾 + 甲/抗+20% 3回合 + 回15%已损 | SH:4643-4668，defGain=baseDef×20%，turns+1 | ✅ |
| 火山爆发：全体5段共 `{M:(0.22*ATK+HP*0.03)*5}` 魔法 + 灼烧 + 总伤15%吸血 | SH:4556-4596 | ✅ |
| 岩浆践踏：全体 `{M:0.8*ATK}` 魔法 + 各40%概率眩晕1回合 + 回10%已损 | SH:4600-4639 | ✅（handler 正确，但见 L1：该技能在换形后通常无法被选用） |

### Form / cross-path 检查（lava）
- **L1（BEHAVIOR/BUG，中）— 换形后技能集不按装备槽配对，恒取前3个，且不缩减槽位。**
  - desc：强化熔岩之心 detail（pets:2585）"火山形态少一个技能槽"。
  - JS 参考（state.js:592-601）：`f.skills = equippedIdxs.filter(i < volcanoSkills.length && !passiveSkill).map(i => volcanoSkills[i]).slice(0,3)` —— **按玩家装备的同一 index 1:1 配对到 volcanoSkills**。
  - Phaser（BS:5811-5818）：`f.skills = petDef.volcanoSkills.filter(!passiveSkill).slice(0,3)` —— **无视 `_equippedIdxs`，永远取前3个火山主动**（烈焰重击/熔岩铠甲/火山爆发）。
  - 后果：
    1. 玩家的小形态技能选择不会跨形态带过去。例：装 `[0,1,3]`（熔岩弹/地裂/熔岩喷射），JS 变身后给 volcano[0,1,3]=烈焰重击/熔岩铠甲/**岩浆践踏**；Phaser 给 volcano[0,1,2]=烈焰重击/熔岩铠甲/**火山爆发**。**岩浆践踏 (volcanoStomp) 在任何装配下几乎永远拿不到**（它是 index 3，slice(0,3) 截掉）。
    2. 装备 `lavaEnhancedRage`(index4) 时，JS 因 4 是 passiveSkill 被 filter 掉 → 火山形态只剩 2 个主动（兑现"少一个技能槽"）；Phaser 仍恒给 3 个 → **"火山形态少一个技能槽"未实现**。
  - 仅在默认装配 `[0,1,2]` 时两者结果巧合一致（都给 volcano[0,1,2]），所以默认体验看不出来。
  - 建议修复：照 JS state.js:596-601，按 `f._equippedIdxs`（fighter.ts:69 已存）做 index 配对 + 过滤 passiveSkill + slice(0,3)，并保留 length===0 的 fallback。
- 形态被动是否被 createFighter 漏扫：**否**。`lavaEnhancedRage` 同时存在于 skillPool[4] 与 volcanoSkills[4]；setup 循环（BS:1178-1277）扫的是 `pet.skillPool[i]`，装 index4 时能命中 skillPool[4]，正常设 flag。
- 换形羁绊消费点：变身时 BS:5843 调 `grantShiftSynergy`→`applyShiftSynergy`（synergies.ts:219）正确发盾 + 首次额外 ATK（`_synergyShiftedOnce` 一次性）。多次变身（revert 后 `_lavaSpent=false`）盾每次发、首次ATK仅一次，符合"首次换形"。✅
- 还原路径：变身存 `_lavaSmallSkills=[...f.skills]`（BS:5789），到期还原（BS:5769）+ 撤回 HP/ATK/DEF/MR + 贴图。✅

---

## 赛博龟 (cyber) — pets:2675（换形龟，机甲组装）
基础：HP 460 / ATK 47 / DEF 14 / MR 13 / crit 0.25。被动 浮游炮(cyberDrone)。技能池：激光枪/能量大炮/部署/强化浮游炮(passive)/浮游联防。默认 [0,1,2]。

| 描述声明 | 代码实现 | 判定 |
|---|---|---|
| 浮游炮：每回合生成1（上限10），每炮对随机敌 `{N:ATK*0.25}` 物理；阵亡组装机甲 | BS:6912-6970 spawn+fire；dronesPerTurn/maxDrones/droneScale 读 passive | ⚠️ 见 C1/C2 |
| 机甲：HP=(30+2Lv)×炮数、ATK=(4.5+0.1Lv)×炮数、暴击25%、甲抗0、每回合打最低HP敌150%×ATK | BS:4347-4380；atkScale1.5、def/mr=0(非强化)、crit0.25、mechAttack 锁最低HP | ✅ |
| 激光枪：5段共 `{N:0.15*ATK*5}` + 12%目标maxHp 物理 | SH:547-595 physical，base=atk×0.15 + maxHp×2.4%，5段 | ✅ |
| 能量大炮：横排(同column)每敌 2段物理共 `{N:ATK}` + 2段真伤共 `{T:0.10*ATK*droneCount}`（强化3.5%/段） | SH:3110-3315，physScale0.5×2=1.0；trueScale/2×count×2段；enhanced 0.07 | ✅ |
| 部署：立即3炮，每炮每回合 `{N:ATK*0.18}` 物理；上限10/强化20 | SH:5649-5670 push 3，封顶 10/20 | ⚠️ 见 C3 |
| 强化浮游炮：上限10→20、每回合1→2、伤害25%→12%；机甲额外 +3×炮数 甲/抗 | BS:1332-1338 改 passive；BS:4363-4364 机甲 `3*dc` | ✅（基线🔴已修） |
| 浮游联防：全友永久盾 = (0.6+0.15×炮数)×ATK（强化0.10） | SH:5875-5894 | ✅ |

### 详情
- **C1（DESC-GAP，低）** 浮游炮第1回合只 spawn 不 fire（BS:6934 `turn<=1 continue`），描述未提"首回合不射"。沿用 27 号判定。
- **C2（DESC-GAP，低）** 无人机伤害走简化护甲公式（BS:6947-6949 `round(atk×scale)` 仅减护甲、不吃暴击），描述"造成物理伤害"未说明无暴击。沿用 27 号判定。
- **C3（DESC-GAP，低，新增）** 部署描述写"每炮每回合 `{N:ATK*0.18}` 物理"（18%），但部署只是把炮 push 进 `_drones[]`（SH:5666），实际开火由浮游炮被动按 `droneScale` 结算 = **25%（强化12%）**，不是18%。即部署的"18%"是过时/错误数字，与被动实际倍率不符。建议把部署文案的 18% 改成 25%（或删该数字，引向被动）。

### Form / cross-path 检查（cyber）
- 机甲组装：BS:4347 死亡钩子检测 `passive.type==='cyberDrone' && !_mechFormed`，无人机数>0 才组装；swapTexture + mechBody 假被动 + 单技能 `physical atkScale1.5`。✅
- 形态被动漏扫：**否**。`cyberEnhancedDrone` 在 skillPool[3]，setup 循环命中后设 `_cyberEnhanced` 并改 passive 字段（BS:1332-1338）。机甲组装（BS:4363）、能量大炮（SH:3125）、部署上限（SH:5657）、联防倍率（SH:5878）全读 `_cyberEnhanced`。✅
- 换形羁绊：BS:4417 机甲组装后调 `grantShiftSynergy`。✅
- 无人机/机甲击杀归属：BS:6942、BS:5849 设 `currentAttacker = f`，死亡被动归赛博主。✅

---

## 水晶龟 (crystal) — pets:2779（水晶球/结晶被动）
基础：HP 482 / ATK 44 / DEF 21 / MR 23 / crit 0.25。被动 水晶共鸣(crystalResonance)。技能池：水晶刺/水晶壁垒/碎晶爆破/水晶球(passive)/不朽(passive)。默认 [0,1,2]。

| 描述声明 | 代码实现 | 判定 |
|---|---|---|
| 水晶共鸣：受魔法额外减免20%；每段攻击叠1层结晶，满4引爆 19%目标maxHp 魔法 + 魔抗-20% 3回合，引爆清零 | DMG:184-186 magicAbsorb20；PT:204-205 + applyCrystallizeStack(PT:89-119) max4/hp19/mrDown20/turns3+1 | ✅ |
| 水晶刺：2段共 `{M:0.5*ATK*2}` + 6%目标maxHp 魔法，每段叠1层 | SH:3023-3039，base=atk×0.5 + maxHp×3%，2段；dealMagic→触发结晶 | ✅ |
| 水晶壁垒：`{S:0.9*ATK}` 盾 + 全友甲/抗+15% 3回合 | SH:3046-3062，defGain=baseDef×15% flat，turns+1 | ✅ |
| 碎晶爆破：全体3段共 `{M:0.233*ATK*3}` 魔法 + `{T:0.033*ATK*3}` 真实，每段叠1层(满4自动引爆) | SH:3065-3095，结晶仅 dealMagic 触发一次/段（真伤段不重复触发） | ✅ |
| 水晶球：登场召唤(HP=50%本体maxHp，ATK=100%本体)，友方都行动后射2段共 `{M:ATK}` 魔法沿目标列，每段叠结晶，共享层数；本体亡球亡 | BS:5989-6032 spawn(0 def/mr/crit)；BS:6134-6185 fire segDmg=ball.atk×0.5×2，沿 aimCol；共享 `_crystallize` 经 owner passive 引爆 | ✅ |
| 不朽：存活到第10回合 +5000 maxHp + 400 ATK（一次性） | BS:5266-5279 `_crystalImmortal && turn>=10` 一次性 | ✅ |

### Form / loadout 检查（crystal）
- 水晶球/不朽均为 `passiveSkill`，**仅在玩家装备(选入5选3的对应槽)时生效**。`_passiveSkills` 只收已装备 index 的 passiveSkill（fighter.ts:54-58），`processBattleStartSummons` 遍历 `f.passive + _passiveSkills`（BS:5895-5926）召唤水晶球，turn 循环（BS:5267）读 `_crystalImmortal` flag（BS:1281-1283 setup 设）。装备门控正确，未"无条件常驻"。✅
- 结晶层数共享 + 不双叠：碎晶爆破真伤段刻意不再 `triggerOnHitEffects`（SH:3084-3086 注释），避免每段双叠引爆过快；水晶球光线用 `applyCrystallizeStack(crystalOwner,...)`（BS:6179）与本体共享同一 `target._crystallize`。✅
- 迷你水晶/水晶球槽位：`_savedCrystalBallSlot`（BS:1077）预存玩家在选龟界面拖的位置，spawn 优先用（BS:5996-6001），满阵不召唤并提示。✅

---

## 小结

判定计数（本批 4 龟，约 30 项技能+被动+形态路径）：
- 🔴 严重：**0**（27 号两个 🔴 — 熔岩变身AOE 0.5、赛博机甲甲抗 — 均已修并复核通过）
- ⚠️ 偏差：**5**
  - **L1（中）** 熔岩换形技能集不按装备槽 index 配对、恒取 volcanoSkills 前3个：①玩家技能选择跨形态丢失、岩浆践踏几乎永不可用；②装强化熔岩之心时"火山形态少一槽"未兑现。与 JS state.js:596-601 不符。**本批最重要发现。**
  - C3（低，新增）赛博·部署文案"每炮18%"与被动实际 25%/12% 不符。
  - D1（低）凤凰涅槃"灼烧持续3回合"措辞与层数衰减模型不符（沿用基线）。
  - C1（低）赛博浮游炮首回合不射，描述未提（沿用基线）。
  - C2（低）赛博无人机不吃暴击/简化护甲，描述未提（沿用基线）。
- ✅ 其余全部数值与行为与描述一致。

**最重要发现：L1（熔岩换形技能配对）** —— `BS:5811-5818` 用无条件 `slice(0,3)` 取火山技能，丢弃了 JS 的 `_equippedIdxs` 索引配对逻辑。导致玩家在小形态选的技能（尤其 index 3 的熔岩喷射→岩浆践踏配对）无法带入火山形态，且装备「强化熔岩之心」时未按描述减少一个技能槽。建议照 JS 1:1 用 `f._equippedIdxs` 做 index 映射。
