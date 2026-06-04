# Group 3 审计 (dice/rainbow/gambler/hunter/pirate/candy)

> 三方交叉: 描述 `src/data/pets.ts` ↔ 实现 `skill-handlers.ts` / `passive-triggers.ts` / `BattleScene.ts` ↔ 审计 `skill-audit.json` + `passive-audit.json`。
> 说明: 多数被动 (gamblerBlood/rainbowPrism/gamblerMultiHit/hunterKill/pirateBarrage/candySteal) 在 `passive-audit.json` 全部显示「(无变化)」——它们是**回合开始 / 死亡 / 连击链**型被动, 该审计只挂 attacker/target 的 on-attack/on-hit 钩, 抓不到 turn-begin/death 钩, 属审计探针局限, **非 bug**, 已逐一在源码中核实。审计 dummy 多为 0 护甲/0 魔抗或百万血, 所以「偷甲/偷抗/破盾」「%最大生命」等在 buff 字段里看不出, 同样属探针局限。

---

## 骰子龟 (dice)
### 被动: 赌徒之血 gamblerBlood — ✓ — turn-begin 重算 `crit = _initCrit + min(maxCritGain50, lostPct/maxCritAtLoss30 × 50)`, 超 100% 部分经 calcCritMult overflowMult=1.5 转暴伤; 重算后**重新加** diceFateCrit buff (避免失血时丢命运骰子加成)。完全符合描述 (损30%→+50%暴击)。`BattleScene.ts:5271-5284`。passive-audit「无变化」= turn-begin 型探针抓不到, 非 bug。

注: 「真正的赌徒」diceGamblerConvert 是替换被动的 passiveSkill, 见技能表。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 骰子攻击 | diceAttack | 3段物理, 共 0.9×ATK + 55×暴击机率(=5500%×crit), 可暴击 | phy / 39 / touched1 (3段聚一目标) | ✓ | totalBase=round(atk×0.9)+round(crit×55) 平摊 3 段; recordDamage 'phy'; 边界 `!target.alive` 安全。`skill-handlers.ts:2608-2635` |
| 孤注一掷 | diceAllIn | 全体物理 1.2×ATK + 30% 生命偷取(按总伤回) | phy / 主50 全150 / touched3 | ✓ | dmgType physical, lifestealPct 30, 循环后按 totalDmg(全体合计) 回血; recordDamage 按 dmgType 分类('phy'); 空敌返回安全。`skill-handlers.ts:4996-5030` |
| 命运骰子 | diceFate | 随机 +40%~130% 暴击, 持续5回合; 超100%转暴伤 | buff `diceFateCrit:109/6` (值在40~130区间, dur 5+1) | ✓ | push `diceFateCrit`(非critUp, 供 gamblerBlood 重算复加) + `caster.crit += gain/100` 不 cap。`skill-handlers.ts:2638-2651` |
| 真正的赌徒 | diceGamblerConvert | 登场: 全部护甲+魔抗→护甲穿透, DEF/MR 归零 | passiveSkill 登场处理 (handler no-op) | ✓ | `armorPen += baseDef+baseMr; baseDef/def=0; baseMr/mr=0`。snapshot 后基线覆盖以正确显示削弱/增益。`BattleScene.ts:1260-1276`; handler `skill-handlers.ts:5068` |
| 稳定骰子 | diceFlashStrike | 掷1d6, 突刺(4+点数)段, 首段0.9×ATK物理, 每段递减10% | phy / 主49 全170 / touched3 | ✓ | totalSegs=baseHits4+roll(1~6), segScale=0.9×(1-0.1×i), 随机敌, 排除黑洞内目标; recordDamage 'phy'。`skill-handlers.ts:5034-5064` |

---

## 彩虹龟 (rainbow)
### 被动: 棱镜 rainbowPrism — ✓ — turn-begin 全队增益; 首回合(turn≤1)不抽绿; 红 atkUp+12%/蓝 def+mr+12%/绿 heal5%; enhanced(强化棱镜) 额外从 🟠🟡🩵🟣 抽1。各色逐一核实。`BattleScene.ts:5594-5661`。passive-audit「无变化」= turn-begin 型探针局限, 非 bug。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 七彩光束 | magic(prismBonus) | 2段魔法 0.7×ATK; 红+20%总伤真伤/蓝自身20%ATK盾/绿回5% | mag / 主58 (2×~29) / touched1 | ✓ | generic magic handler 跑 hits=2 后按 `_prismColor` 0/1/2 做后处理 (真伤记 'tru', 盾, 治疗); 审计 dummy 无棱镜色 → 无附加。`skill-handlers.ts:5695-5740` |
| 棱镜护盾 | shield | 全体友方 0.65×ATK 护盾 | shield / casterShield 27 (=0.65×42) | ✓ | aoeAlly 全队盾; 审计仅自身 → 27。`skill-audit.json:686-698` (shield handler 通用) |
| 全色风暴 | rainbowStorm | 全体4段, 共 0.2×ATK×4 魔法 + 0.1×ATK×4 真实, +(-15%护甲)3回合 | mag主48 全144 / `defDown:15/4` / touched3 | ✓ | **混伤分类记统计**: magic→'mag', true→'tru' 各自 recordDamage; defDown value15 dur(3+1=4)。`skill-handlers.ts:2980-3026` |
| 强化棱镜 | rainbowEnhancedPrism | 棱镜+4光谱, 每回合多抽1效果 | passiveSkill (登场置 _enhancedPrism, handler no-op) | ✓ | 登场标记 `_enhancedPrism`; applyRainbowPrism 据此多抽1。`BattleScene.ts:1279-1282`, 抽取 `5603-5658` |
| 反射 | rainbowReflect | 自身起, 敌我交替弹射: 治疗友(含自) / 伤敌, 每弹递减15%, 最低40% | mag主18 / touched2 (1敌+自疗) | ✓ | 先自疗(factor=1.0) → while 交替, factor×=0.85, val 用 max(floor0.4,factor); 伤敌记'mag', 治疗 applyHeal; guard<40 防死循环。`skill-handlers.ts:5094-5149` |

---

## 赌神龟 (gambler)
### 被动: 多重打击 gamblerMultiHit — ✓ — on-hit 链式: `chance = base40 + _multiBonus`, while-loop 每次追打 `chance×=0.8`(递减20%), 追打 0.5×ATK 物理 + 可暴击, recordDamage 'phy', safety<10。符合「40%→32%→25.6%…」。`passive-triggers.ts:573-593`。passive-audit「无变化」= 该探针单段未必 roll 中, 非 bug。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 卡牌射击 | gamblerCards | 3张牌, 每张随机 0.3~0.6×ATK 物理, **现可暴击** | phy / 主114 / touched1 | ✓ | 每段独立 `rollCrit(effectiveCrit)+calcCritMult` (2026-05-29 决策已加暴击); recordDamage 'phy'。`skill-handlers.ts:4741-4768` |
| 万能牌 | gamblerDraw | 2段物理 1.0×ATK, 自身 25%ATK 永久盾 + 25%ATK 回血, 目标随机减益3回合 | phy主50(2×0.5×ATK) / `atkDown:20/3` / shield13(=0.25×50) / touched2 | ✓ | 8选1 debuff池(atk/def/mr/heal↓ + 中毒/流血/灼烧转层数 + 冰寒); 永久盾+回血; recordDamage 'phy'。`skill-handlers.ts:4772-4835` |
| 赌注 | gamblerBet | 消耗40%当前HP, 分7段物理打目标, 期间多重打击+20% | phy主257 / casterHpDelta **-182** / touched1 | ✓ | HP≤40% 拒放; 自损 hp×40% 飘 dot-dmg(不触发自身受伤动画, 逻辑层); `_multiBonus+=20` 期间→结束-20; **每段 triggerOnHitEffects 触发被动(含多重链)**; recordDamage 'phy'; 目标死留空拍。`skill-handlers.ts:4688-4734` |
| 强化多重打击 | gamblerEnhancedMulti | 登场损失30%生命, 多重打击概率永久→60% | passiveSkill (登场处理) | ✓ | `f.hp -= round(f.hp×0.3)` (开局满血≈30%maxHp); `passive.chance=60`。`BattleScene.ts:1201-1208` |
| 命运之轮 | gamblerFateWheel | 每回合抽花色永久加属性 (♠+5攻+30HP/♥+2甲+2抗/♦+8%暴+2穿/♣+4%吸) | passiveSkill (turn-begin 抽取) | ✓ | 四花色逐一核实, 永久叠加, 深海不重置(_fateWheelCounts)。`BattleScene.ts:5563-5590` |

---

## 猎人龟 (hunter)
### 被动: 猎杀 hunterKill — ✓ — 双效:
> (1) **处决** processHunterExecute: 每回合检查活敌, HP/maxHp < hpThresh(14%) 严格 `<` 即斩杀(跳 undeadLock)。`BattleScene.ts:5670-5679`。
> (2) **窃取** (用户 2026-05-29「任意敌人死亡都算」): 任何敌方死亡(任何死因) → 在场所有敌对猎人各窃取 dead 的 baseAtk/baseDef/baseMr/maxHp 各 stealPct(14%), 累积 `_hunterStolen*`, 偷取HP计入真伤统计(recordDamage 'tru'), 并叠加 lifesteal(8%) 进 `_lifestealPct`。`BattleScene.ts:4576-4615`。
> passive-audit「无变化」= 死亡钩型, 探针抓不到, 非 bug。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 射箭 | hunterShot | 3段物理 0.55×ATK; 目标<50%HP 时 +40%暴+20%爆 | phy / 主75(3×~25) / touched1 | ✓ | execThresh 50 检查 `hp/maxHp < 0.5` → 临时 crit+0.4 / _extraCritDmg+0.2, 段后还原; recordDamage 'phy'。`skill-handlers.ts:2664-2723` |
| 隐蔽 | hunterStealth | 单段 0.9×ATK物理 + 25%闪避(3回合) + 0.7×ATK护盾 | phy主41 / `dodge:25/4` / shield32(=0.7×46) / touched2 | ✓ | dealPhysical + dodge buff(dur 3+1) + shield + recordShield。`skill-handlers.ts:5858-5885` |
| 连珠箭 | hunterBarrage | 10根箭随机射敌, 共 0.24×ATK×10 **真实** | tru主33 全110 / touched3 | ✓ | applyRawDamage 'true' pierce; recordDamage **'tru'**; 随机活敌; arrowScale 0.24(描述十根240%)。`skill-handlers.ts:4927-4961` |
| 毒箭 | hunterPoison | 0.8×ATK物理 + 11中毒值 + 治疗削减 | phy主37 / `poison:11/999, healReduce:50/4` / touched1 | ✓ | poison stacks=round(dot.dmg15×turns3/4)=11(与描述硬写11一致); healReduce max-merge value50 dur(turns+1)。`skill-handlers.ts:4967-4991` |
| 猎杀印记 | hunterMark | 1.6×ATK物理 + 猎杀印记3回合(HP<24%斩杀) | phy主74(=1.6×46) / `hunterMark:24/4` / touched1 | ✓ | dealPhysical + mark buff(value=markExecPct24, dur markTurns3+1, 带 sourceIdx); 处决由 applyRawDamage 检 buff 触发。`skill-handlers.ts:2728-2749` |

---

## 海盗龟 (pirate)
### 被动: 掠夺 pirateBarrage — ✓ — 双效:
> (1) **开局轰击**: 仅当 bombardPct>0 (未装海盗船禁用), 战斗开始随机敌 maxHp×25% 真实 pierce。`BattleScene.ts:1571-1602`。
> (2) **死亡钩锁**: 海盗龟死亡 → 随机存活敌 maxHp×deathHookPct(25%) 真实 pierce + 触发 on-hit 链; 双方同死/无敌时安全跳过。`BattleScene.ts:4508-4536`。
> 装海盗船被动后两者被置 0 (`bombardPct=0; deathHookPct=0`)。`BattleScene.ts:5970-5972`。passive-audit「无变化」= 开局/死亡型, 探针局限, 非 bug。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 弯刀 | physical | 4段物理 0.35×ATK | phy / 主60 / touched1 | ✓ | 通用 physical handler 4段; atkScale 0.35。`skill-audit.json:842-855` |
| 火炮齐射 | pirateCannonBarrage | 全体6段, 每段 0.17×ATK + 1.7%目标maxHp 物理 (合计102%+10.2%maxHp) | phy主102042 全306126 / touched3 (百万血dummy) | ✓ | 每段 basePower = atk×0.17 + maxHp×1.7%; hits=6; recordDamage 'phy'; 空敌安全。`skill-handlers.ts:5293-5335` |
| 朗姆酒 | heal | 每回合回 9%maxHp(4回合) + 护甲 +0.15×ATK(3回合) | `hot:45/5, defUp:6/4` / touched1 | ✓ | hot pctMaxHp9 dur(4+1=5); defUpAtkPct value=round(0.15×ATK)=6 dur(3+1=4); selfCast。审计 hot:45 = 9%×500dummy。`pets.ts:1897-1915`, heal handler |
| 掠夺宝藏 | piratePlunder | 破50%护盾 + 0.8×ATK物理 + 偷目标20%甲/抗(3回合)给自己 | phy主34(=0.8×43) / buff空(dummy 0甲0盾) / touched2 | ✓ | 破盾(普通+泡泡盾) → 主伤 recordDamage 'phy' → 偷甲/抗(target defDown/mrDown + caster defUp/mrUp)。审计 dummy 0甲 → defGain/mrGain=0 → 无 buff (探针局限, 代码正确)。`skill-handlers.ts:3331-3390` |
| 海盗船 | pirateShipPassive | 第3回合召唤海盗船(1.5×maxHp/1.0×ATK/无甲抗), 每回合开炮 0.2×ATK; 禁用掠夺开局+死亡钩 | passiveSkill (登场标记+召唤逻辑) | ✓(显示/召唤待眼验) | 登场置 bombardPct/deathHookPct=0 已核实 `BattleScene.ts:5970-5972`; 召唤/每回合开炮在召唤系统, 纯逻辑审计不覆盖动画/出场 → 显示待眼验。 |

---

## 糖果龟 (candy)
### 被动: 甜蜜掠夺 candySteal — ✓ — turn-begin (stealTurn=3): 随机敌偷 25%maxHp, target.maxHp/hp 各 -stealAmt(floor 1, 不杀), 自身 maxHp/hp +stealAmt, 偷取计真伤统计。`BattleScene.ts:5541-5561`。符合描述(第3回合, 25%, 最低留1)。passive-audit「无变化」= turn-begin 型探针局限, 非 bug。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 糖果锤 | physical | 1.1×ATK + 5%自身maxHp 物理, +攻击-15%(2回合) | phy主71 / `atkDown:15/3` / touched1 | ✓ | 通用 physical handler (atkScale1.1 + selfHpPct5 + atkDown{15,2→dur3}); 主伤 71 ≈ 1.1×42 + 5%×460。`pets.ts:1983-1997`, physical handler |
| 焦糖铠 | shield | 自身 0.8×ATK 护盾 + 回 10%maxHp | shield / casterShield34(=0.8×42) / touched1 | ✓ | shieldAtkScale0.8 + healHpPct10 selfCast。审计仅记盾 34。`pets.ts:2000-2011`, shield handler |
| 糖衣炮弹 | candyBarrage | 先 +15%ATK穿甲(3回合), 再全体4段 0.25×ATK + 4%目标maxHp 物理 | phy主180920 全542760 / touched3 (百万血dummy) | ✓ | 先置 `_candyPenGain=round(atk×0.15)` + armorPen+=, 再4段 (atk×0.25 + maxHp×4%) 物理; recordDamage 'phy'。穿甲存为 `_candyPenGain` 字段非命名buff → 审计 buff 列看不到(探针局限)。`skill-handlers.ts:3516-3559` |
| 糖果罐 | sweetTrap | 开局装备席放糖果罐, 打碎领奖(随回合变稀有) | passiveSkill (handler no-op) | ✓(机制/UI待眼验) | 纯逻辑审计不覆盖装备席UI/奖励rolling → 显示待眼验。`skill-handlers.ts:5919` |
| 糖果炸弹 | candyBombPassive | 召唤糖果炸弹(40%maxHp/0攻甲抗), 每回合-20%maxHp, 死亡爆炸全体共150%自身maxHp魔法(均摊) | passiveSkill (handler no-op) | ✓(召唤/爆炸待眼验) | 召唤+衰减+爆炸在召唤系统, 纯逻辑审计不覆盖 → 显示待眼验。`skill-handlers.ts:5827` |

---

## 本组问题清单
（无 ✗ Bug；无 ⚠️ 存疑。所有主动技能伤害类型/段数/AOE/公式比例/buff/盾/治疗/混伤分类统计均与描述一致；边界安全。）

低优先 / 仅记录（均非缺陷，无需改）:
- [低] 多个回合开始/死亡/连击型被动 (gamblerBlood/rainbowPrism/gamblerMultiHit/hunterKill/pirateBarrage/candySteal) 在 `passive-audit.json` 全为「(无变化)」——审计探针只挂 on-attack/on-hit 钩, 抓不到 turn-begin/death 钩。已逐一在源码核实正确。若想被动审计更全, 可给探针补 turn-begin/death 模拟。
- [低] 审计 dummy 多为 0 护甲/0 魔抗或百万血, 导致「偷甲/偷抗」(piratePlunder)、「%最大生命附加」(火炮齐射/糖衣炮弹)、糖衣炮弹穿甲 buff、棱镜色附加 等在 buff/数值字段里不可见。代码逻辑均正确, 仅探针环境不暴露。
- [显示待眼验] 海盗船召唤/每回合开炮、糖果罐装备席UI与奖励、糖果炸弹召唤/衰减/爆炸均摊 — 涉及召唤系统与UI, 纯逻辑审计无法核实, 留作眼验。
