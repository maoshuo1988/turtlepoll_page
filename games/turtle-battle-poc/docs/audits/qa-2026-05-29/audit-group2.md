# Group 2 审计 (ninja/two_head/ghost/diamond/fortune)

三方交叉: 描述 ← `src/data/pets.ts` | 实现 ← `src/engine/skill-handlers.ts` + `passive-triggers.ts` + `scenes/BattleScene.ts` + `engine/damage.ts`/`stats-recalc.ts` | 审计实际 ← `skill-audit.json` / `passive-audit.json`。

> 说明: `passive-audit.json` 对本组 5 个被动均返回「无变化」——因为它们全是**登场/换形/经济/减伤收口**类被动, 不在普通攻击交换里触发, 故被动结论全部来自源码核对 (file:line)。
> 审计 JSON 个别巨值 (two_head 灵能冲击 dmgToAll=450132 / ghost 灵魂风暴 curse:50000) 系测试假人 maxHp 极大 (~1M) 导致 `%maxHp` 项放大, **属 harness 假人特性, 非 bug**——公式结构正确。

---

## 忍者龟 (ninja)

### 被动: 忍术 (ninjaInstinct) — ✓ — 开局一次性应用 +30% 暴击 / +20% 暴伤(perm) / +8 穿甲, 与描述 critBonus30/critDmgBonus20/armorPen8 完全一致 (BattleScene.ts:1171-1176)。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 冲击 | ninjaImpact | 主 1.3×ATK 物理 + 正后方 0.8×ATK 物理 | 62物理/touched1(无身后单位时)/dealPhysical×2 | ✓ | 主+身后各 dealPhysical, behindScale0.8 (skill-handlers.ts:1635,1657-1658) |
| 手里剑 | ninjaShuriken | 1.6×ATK 物理; 暴击时 (40+2×LV)% 转真实 | 77物理(非暴)/touched1 | ✓ | 暴击拆 phys(记phy)+true(记tru), truePct=min(100,40+2×lv) (1788-1813) |
| 炸弹 | ninjaBomb | 全体 1.1×ATK 物理 + -25%护甲3回合 | dmgToAll159(3×53)/touched3/armorBreak:25/4 | ✓ | AOE dealPhysical, armorBreak duration=turns+1=4 (1915-1924) |
| 背刺 | ninjaBackstab | +5穿甲1回合 → 闪现3段共2.0×ATK物理, 越前排 | 108物理/touched1/casterBuff armorPen:5/2 | ✓ | apTurns+1=2, 3×0.6667 dealPhysical; ignoreRow 在选目标+嘲讽双处生效 (1953,1987-2005; BattleScene 2422/2621/2867) |
| 忍者足 | ninjaFeet (passiveSkill) | 登场 +25% 闪避 +40% 暴击 | — (被动技能) | ✓ | 装备该技能时 _extraDodge+25 / crit+0.40 (BattleScene.ts:1186-1190) |

---

## 双头龟 (two_head)

### 被动: 双生 (twoHeadDual) — ✓ — 纯换形/融合标记被动, **无**每回合 ATK 增长 (已删自创+3atk)。近战形态加成由 twoHeadSwitch 按 passive scale 读取施加, 远程还原 (skill-handlers.ts:4054-4070; BattleScene.ts:5234)。

### 技能表 (远程形态 skillPool)
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 魔法波 | twoHeadMagicWave | 4段交替 物理0.8×ATK + 真实0.8×ATK | 84(单目标累计)/touched1 | ✓ | 偶数段物理(记phy)/奇数段真实(记tru), 分型统计正确 (3984-4004) |
| 灵能冲击 | physical (aoe) | 全体 0.85×ATK + 15%目标maxHp 物理 | dmgToAll450132/touched3 (假人maxHp巨大) | ✓ | AOE dealPhysical, base含 t.maxHp×hpPct/100 (physical handler:564-567) |
| 切换近战 | twoHeadSwitch(melee) | 切近战形态 + 1.2×ATK物理 | casterShield57/casterHpDelta78/touched2 | ✓ | +HP/DEF/MR/盾, -ATK, switchAtkScale1.2 dealPhysical (4054-4098) |
| 精神干扰 | twoHeadMindBlast | 1.0×ATK 魔法 + 50%治疗削减3回合 + 破50%护盾 | 52魔法/touched1/healReduce:50/4 | ✓ | dealMagic记mag, shieldBreak50%, healReduce duration+1=4 (4012-4042) |
| 融合 | twoHeadFusion (passiveSkill) | 不可换形, 常驻近战加成 +1.5HP/0.25DEF/0.25MR/1.1盾 | — | ✓ | createFighter期施加, 与切换近战互斥 (BattleScene.ts:1226-1238) |

### 近战形态 meleeSkills (跨形态链路)
| 技能 | type | 描述预期 | 判定 | 备注(file:line) |
|---|---|---|---|---|
| 锤击 | twoHeadHammer | 1.4×ATK物理 + 造成伤害50%永久护盾 | ✓ | dealPhysical手算+记phy, shield+=dmg×50% (3948-3970) |
| 吸收 | twoHeadAbsorb | 0.6×ATK+8%目标maxHp物理, 回 0.4×ATK+18%已损 | ✓ | base含 maxHp×hpPct, heal=atk×0.4 + lostHp×0.18 (4135-4164) |
| 切换远程 | twoHeadSwitch(ranged) | 切远程 + 1.4×ATK物理 + -25%护甲4回合 | ✓ | 还原属性, defDown duration+1=5 (4099-4125) |
| 双头坚韧 | twoHeadResilience (passiveSkill) | 每受一段攻击 +1甲+1抗 (上限各20) | ✓ | _twoHeadResStacks 受击叠层 cap20; 旧重复实现已删, 无双叠 (passive-triggers.ts:211-225) |
| 融合 | twoHeadFusion (passiveSkill) | 同上 | ✓ | — |

> 跨形态配对显示 (pairedFormSkill): skillPool[i]↔meleeSkills[i] 按 index 配对 (2=切换近战↔切换远程, 4=融合↔融合, 3=精神干扰↔双头坚韧)。逻辑对齐, **显示待眼验** (DetailPanel.ts:1444-1473)。

---

## 幽灵龟 (ghost)

### 被动: 怨灵 (ghostCurse) — ✓ — 登场诅咒全体敌人, value=5%maxHp/回合真伤, duration=turns+1=4 (BattleScene.ts:5039-5050)。诅咒DOT在side-end走 applyRawDamage 记 'tru' (BattleScene.ts:7718-7735)。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 幽魂触碰 | ghostTouch | 0.4×ATK 物理 + 0.9×ATK 真实 | 58(累计)/touched1 | ✓ | 物理段记phy + 真伤段记tru, 分型正确 (1340-1359) |
| 幽冥突袭 | ghostPhantom | 1.5×ATK 魔法 + 80%吸血 + 25%闪避2回合 | 66魔法/touched1/casterBuff dodge:25/3 | ✓ | dealMagic, heal=dmg×80%, dodge duration+1=3 (1373-1402) |
| 灵魂风暴 | ghostStorm | 2段共2.5×ATK魔法+诅咒3回合; 若已诅咒改真伤不重复施加 | 110(2×55)/touched1/curse:50000/3 | ⚠️ | 逻辑正确(hasCurse分支真伤记tru/否则魔法+施咒); **但施咒 duration=dotTurns(3)无+1**, 而登场被动用turns+1(4)、强化怨灵用5+1=6 — 三处"N回合"的+1约定不一致 (skill-handlers.ts:1483) |
| 强化怨灵 | ghostEnhancedCurse (passiveSkill) | 在基础被动上, 死亡时再诅咒全体5回合 | — | ✓ | onDeath hook, duration=6(5+1), value=5%maxHp (BattleScene.ts:4388-4397) |
| 虚化 | ghostPhase | 虚化2回合(-90%物理) + 2段共1.2×ATK真实 | 52真实(2段)/touched2/casterBuff physImmune:90/3 | ✓ | physImmune duration phantomTurns+1=3, 2×0.6 applyRawDamage记tru (1491-1519) |

---

## 钻石龟 (diamond)

### 被动: 钻石结构 (diamondStructure) — ✓ — (1) 全队 defUp/mrUp buff 放大 +50% (自身强化后+100%) 在 stats-recalc.ts:20-29 `defAmp`; (2) 每段非真伤减 (DEF×20% [+强化MR×10%]), **唯一收口在 applyRawDamage** (damage.ts:176-182), 真伤跳过; deal* 显式注释不再重复减 (skill-handlers.ts:329,388) → **无双减**, 符合要求。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 钻石切割 | physical | 0.7×ATK + 0.6×DEF + 0.6×MR 物理 | 52物理/touched1 | ✓ | physical handler base含 def×0.6+mr×0.6, dealPhysical (physical:564-566) |
| 坚不可摧 | diamondFortify | 20%maxHp永久盾 + 0.2×ATK护甲+0.2×ATK魔抗3回合 | dmg0/casterShield95/defUp:8/4,mrUp:8/4 | ✓ | shield记shield, defUp/mrUp duration+1=4 (5836-5855) |
| 碰撞 | diamondCollide | 0.8×ATK+0.9×DEF+0.9×MR+8%maxHp 物理; 累计2次眩晕1回合 | 106物理/touched1 | ✓ | dealPhysical, 碰撞计数挂目标, 满stunAfter眩晕 (2381-2407) |
| 强化钻石结构 | diamondEnhanced (passiveSkill) | 友军加成放大+50%/自身+100%, 减免每段(20%甲+10%抗) | — | ✓ | _diamondEnhanced flag → damage.ts mrPct10 + stats-recalc 自身100% (BattleScene.ts:1262-1263) |
| 钻石冲撞 | diamondSmash | DEF+MR+0.1×ATK 物理(过甲) + 9层流血 | 45物理/touched1/bleed:9/999 | ✓ | dealRaw('phy')不吃护甲/暴击(对齐JS applyRawDmg), bleed stacks=round(12×3/4)=9 (2353-2372) |

---

## 财神龟 (fortune)

### 被动: 聚宝盆 (fortuneGold) — ✓ — (1) 每回合末 +3~8 金币 `roll=3+floor(rnd×6)` (BattleScene.ts:7581); (2) 任意单位阵亡时 +9 金币 (BattleScene.ts:4583); (3) 每回合 +2 深海币 (玩家 this.coins / 野生走 aiGainCoins, BattleScene.ts:5206-5213)。三项与描述完全一致。`_goldCoins`(局内技能币) 与 `this.coins`(深海/商店币) 正确分离。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 打击两下 | fortuneStrike | 2段共 ATK + ATK×0.06×金币 物理 (不耗币) | 40物理(0币时2×0.5)/touched1 | ✓ | 每段(0.5+0.03×coins)×ATK dealPhysical, 不消耗金币 (3738-3756) |
| 骰子 | fortuneDice | +3~8金币, 回8%maxHp; 梭哈后额外10%maxHp永久盾 | dmg0/shield0(未梭哈)/touched1 | ✓ | roll加币+heal; postAllInShield 仅当 allIn cdLeft>0 (3710-3730) |
| 梭哈 | fortuneAllIn | 消耗全部金币, 每枚 0.18×ATK物理 + 0.18×ATK真实 (单体) | dmg0(0币早退)/touched1 | ✓ | **单体逐枚对target** (M9全体已回退), 物理记phy/真实记tru **分型统计**, cd999一次性 (5592-5630) |
| 招财进宝 | fortuneBuyEquip | 消耗20金币抽1装备, 每次释放消耗+25%; 席满则全体回10%maxHp | dmg0/touched1 | ✓ | cost=_fortuneBuyCost(×1.25递增), emit'fortune-buy-equip'抽normal/unique; 席满→addToBench 10%HP fallback (5576-5587; BattleScene.ts:1548-1553,7889-7910) |
| 聚财 | fortuneGainCoins | 立即+10金币 | dmg0/touched1 | ✓ | coinGain=10 → _goldCoins (5566-5572) |

> 财神 4 技能(梭哈/骰子盾/打击两下/招财)依赖 `_goldCoins`, audit harness 开局 0 币 → 币缩放伤害/抽装均无法在静态审计中跑出实际数值。**公式结构经源码核对正确**, 实际数值显示待对局眼验。

---

## 本组问题清单

- [低] ghost·灵魂风暴(ghostStorm): 施加诅咒用 `duration: dotTurns`(=3) **缺 +1 约定**, 而登场被动怨灵用 `turns+1`(=4)、强化怨灵用 `5+1`(=6) 都带 +1。由于回合开始 tickBuffsDuration 减1 与 side-end DOT tick 的时序, 同样描述「3回合」的 ghostStorm 诅咒实际跳动次数可能比登场被动少 1 次。建议统一为 `dotTurns + 1` (skill-handlers.ts:1483)。属一致性细节, 非崩溃/数据错。

---

## 审计结论
本组 (5 龟 / 5 被动 + 23 主动&被动技能项) 三方交叉核对完成: **0 个 ✗ Bug, 1 个 ⚠️ 一致性存疑** (ghostStorm 诅咒 duration +1 约定不统一)。其余全部 ✓: 伤害类型/段数/AOE/buff/护盾/治疗/分型统计/边界 均与描述一致; diamond 减伤唯一收口在 applyRawDamage 无双减; two_head 跨形态链路与被动归属正确; fortune 梭哈单体且物理+真实分型记录、币经济三源正确。跨形态配对显示与各类飘字/面板属显示层, 待眼验。
