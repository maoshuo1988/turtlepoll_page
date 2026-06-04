# 审计 batch1 — 财神/骰子/彩虹/赌神/猎人 (描述 vs 代码)

审计日期 2026-05-28。源文件: `src/data/pets.ts` / `src/engine/skill-handlers.ts` / `src/engine/passive-triggers.ts` / `src/engine/damage.ts` / `src/engine/stats-recalc.ts` / `src/scenes/BattleScene.ts`。
基线对照: `qa-2026-05-27/audit-B-...md` (上轮 6 个 ⚠️, 本轮逐项复核)。
图例: ✅ 一致 / ⚠️ 需用户决策 (平衡/设计/口径) / 🔴 bug。

> **标准**: 描述是真相之源, 代码必须照做。`turns+1` 时长约定为正确 (3回合 buff duration=4)。真伤不走 `calcDmgMult` 为正确。

---

## 跨切面前置结论 (影响赌神 ♣ + 猎人被动)

代码库存在**三套互不相通的生命偷取字段**, 单位不同:

| 字段 | 单位 | 写入方 | 攻击命中时读取方 |
|---|---|---|---|
| `lifestealPct` (无下划线) | 小数 (0.04=4%) | recalcStats(buff 类型 `lifesteal`/`chiWaveActive`)、undeadRage、auraAwaken | ✅ passive-triggers.ts:600 通用吸血 / :511 审判吸血 |
| `_auraLifesteal` | 小数 | auraAwaken 觉醒 | ✅ passive-triggers.ts:399 (气场专用) |
| `_lifestealPct` (有下划线) | 百分点 (4=4%) | **装备**(BattleScene:1139 / equipment.ts:96)、**命运之轮♣**(BattleScene:5339)、**猎杀偷取**(BattleScene:4554)、FPGA | 🔴 **无通用命中读取处** — 仅 e_star 溢出盾(equipment-runtime:78)、headless 临时技能(skill-handlers:3926)、面板/图鉴显示读它 |

通用命中吸血 `triggerOnHitEffects` (`dealPhysical`/`dealMagic`/手算 skill 全走它) 在 passive-triggers.ts:599-602 **只读无下划线 `lifestealPct`**。`_lifestealPct`(下划线) 在 `dealPhysical`(skill-handlers:319) / `dealMagic`(:373) / `applyRawDamage`(damage.ts 全文) 中均无吸血消费。`stats-recalc` 也不把下划线折进无下划线 (stats-recalc.ts:76 只 `_baseLifesteal + lifestealAdd`, `_baseLifesteal` 来自无下划线快照)。

→ **凡是写 `_lifestealPct`(下划线) 来源的生命偷取, 普通攻击/技能命中时都不回血。** 本批次命中两个: 赌神·命运之轮♣ 与 猎人·猎杀。装备吸血同源(也写下划线), 疑似同样失效 — 已超出本批 5 龟范围, 但强烈建议一并查。

---

## 财神龟 (fortune)

base: HP 485 / ATK 39 / DEF 19 / MR 16 / crit 0.25 / B 级。
技能池: 打击两下(fortuneStrike) / 骰子(fortuneDice) / 梭哈(fortuneAllIn) / 招财进宝(fortuneBuyEquip) / 聚财(fortuneGainCoins); 被动 聚宝盆(fortuneGold)。

| 项 | 描述声称 | 代码现实 | 判定 |
|---|---|---|---|
| 被动 聚宝盆 | 每回合 +3~8 币; 任意单位阵亡 +9 币 | turn-end `3+floor(rand×6)` (BattleScene:7449+); 死亡 +9 (BattleScene:4498+) | ✅ |
| 打击两下 | 2 段共 `ATK + ATK*0.06*coins`, 不耗币 | `effScale=0.5+0.03×coins`, 2 段, dealPhysical (skill-handlers:3730-3750) | ✅ |
| 骰子 | +3~8 币, 回 8%maxHp; 梭哈后再给 10%maxHp 永久盾 | `healPct=8`, `caster.shield += 10%maxHp` (永久, 无 duration), `allInUsed` 经 `fortuneAllIn.cdLeft>0` 判定 (skill-handlers:3702-3725) | ✅ |
| 梭哈 | 消耗全币, **对全体敌方**每枚 0.18×ATK 物理 + 0.18×ATK 真伤, 一场一次 | `for(coins) for(enemies)` 真·全体, `applyRawDamage`(物理走护甲, 真伤无减) (skill-handlers:5566-5610); `oneTimeUse`+cd999 | ✅ **(基线 M9 已修)** |
| 招财进宝 | 消耗 20 币抽 1 装备进装备席 | `coinCost=20`, emit `fortune-buy-equip` (skill-handlers:5548-5562) | ✅ |
| 聚财 | +10 币 | `coinGain=10` (skill-handlers:5538-5544) | ✅ |

财神龟全项一致, **无 ⚠️/🔴**。基线 M9 "梭哈单体 vs 全体" 已修复为真全体。

---

## 骰子龟 (dice)

base: HP 430 / ATK 41 / DEF 11 / MR 10 / crit 0.25 / B 级。
技能池: 骰子攻击(diceAttack) / 孤注一掷(diceAllIn) / 命运骰子(diceFate) / 真正的赌徒(diceGamblerConvert) / 稳定骰子(diceFlashStrike); 被动 赌徒之血(gamblerBlood)。

| 项 | 描述声称 | 代码现实 | 判定 |
|---|---|---|---|
| 被动 赌徒之血 | 损 30% 生命满 +50% 暴击; >100% 暴击每 1% 转 1.5% 爆伤 | `bonusCrit=min(50, lostPct/30×50)`, `overflowMult=1.5` 经 calcCritMult (BattleScene:5290-5302 + damage.ts:92-102) | ✅ |
| 骰子攻击 | 3 段共 `0.9*ATK + crit*55` | `totalBase=round(atk×0.9)+round(crit×55)`, /3 段 (skill-handlers:2601-2629) | ✅ |
| 孤注一掷 | 全体敌方 1.2×ATK 物理 + 30% 生命偷取(总伤) | `getEnemies` 全体, `atkScale=1.2`, `lifestealPct=30` 按 totalDmg 回血 (skill-handlers:4979-5014) | ✅ |
| 命运骰子 | 随机 +40%~130% 暴击, 5 回合 | `minCrit=40,maxCrit=130`, `min+floor(rand×(max-min+1))`, duration 5+1=6, push `diceFateCrit` buff + 直加 crit (skill-handlers:2631-2643) | ✅ |
| 真正的赌徒 | 登场 DEF+MR → 穿透, DEF/MR 归零 | passiveSkill, BattleScene init 处理 (handler no-op skill-handlers:5052) | ✅ |
| 稳定骰子 | 1d6 → (4+点数)=5~10 段, 首段 0.9×ATK, 每段递减 10% | `baseHits=4`, `roll=1+floor(rand×6)`, `segScale=0.9×(1-0.1×i)`, 随机敌 (skill-handlers:5018-5048) | ✅ |

骰子龟全项一致, **无 ⚠️/🔴**。

---

## 彩虹龟 (rainbow)

base: HP 460 / ATK 40 / DEF 15 / MR 17 / crit 0.25 / A 级。
技能池: 七彩光束(magic+prismBonus) / 棱镜护盾(shield) / 全色风暴(rainbowStorm) / 强化棱镜(rainbowEnhancedPrism) / 反射(rainbowReflect); 被动 棱镜(rainbowPrism)。

| 项 | 描述声称 | 代码现实 | 判定 |
|---|---|---|---|
| 被动 棱镜 | 每回合随机红/蓝/绿全队 buff 1 回合; 首回合不抽绿 | `basePool=turn<=1?[0,1]:[0,1,2]`, 红+12%atk/蓝+12%def&mr/绿回5%, duration=2 (BattleScene:5547-5613, applyRainbowPrism) | ✅ |
| 七彩光束 | 2 段共 1.4×ATK 魔法 + 色光附加(红=总伤20%真伤/蓝=自身0.2×ATK盾/绿=回5%) | `atkScale=0.7`×2 段 dealMagic; prismBonus 读 `_prismColor`(每回合赋值 BattleScene:5565) (skill-handlers:5674-5719) | ✅ |
| 棱镜护盾 | 全体友方 0.65×ATK 护盾 | `shield` handler `aoeAlly`, `shieldAtkScale=0.65`, applyShield 永久 (skill-handlers:1175-1199) | ✅ (见下注) |
| 全色风暴 | 全体 4 段共 0.8×ATK 魔法 + 0.4×ATK 真伤, -15% 护甲 3 回合 | `atkScale=0.2`×4, `pierceScale=0.1`×4, defDown{15,3+1} (skill-handlers:2972-3018) | ✅ |
| 强化棱镜 | 每回合额外抽 🟠🟡🩵🟣 1 个 | `_enhancedPrism` flag (BattleScene:1267), extraPool=[3,4,5,6] picks[1]; 橙=10%吸血1t/黄=灼烧round(0.67×atk)/青=冰寒1t/紫=诅咒 (BattleScene:5556-5611) | ⚠️ (橙吸血见下) |
| 反射 | 自身先回 0.5×ATK(不衰减), 敌友交替弹射 ×0.85 衰减, 下限 40%, 无新目标止 | `factor` 自身=1.0, 之后每跳 `×0.85`, `val=max(floor=0.4,factor)×base`, hitEnemies/healedAllies set 去重 (skill-handlers:5078-5123) | ✅ |

彩虹龟基本一致。基线两个 ⚠️ 复核: 紫光诅咒已 0.09→**0.05**(BattleScene:5608, 与全游戏诅咒统一, 已修); 七彩光束 `_prismColor` 每回合赋值正常。

### Details — 强化棱镜·橙光 (⚠️ 低, 跨切面)
- 文件: BattleScene.ts:5595 `for (const a of allies) a.fighter.buffs.push({ type: 'lifesteal', value: 10, duration: 2 });`
- 描述(detail): "🟠橙光使全体友方获得 **10% 生命偷取** 1 回合"。
- 现实: 橙光走 buff 类型 `'lifesteal'` (无下划线路径), recalcStats.ts:57 `lifestealAdd += b.value/100` → 折进无下划线 `lifestealPct` → 通用命中吸血(:600)能读到。**所以橙光本身是生效的 ✅**, 列此仅为对比同名"生命偷取"在赌神♣/猎人那两处反而失效 (见下), 三处口径不统一容易误导。无需对橙光改动。
- 建议: 不动橙光; 统一修下面 `_lifestealPct` 字段问题。

> 注 (非 bug): 棱镜护盾 `shield` handler push `duration:3` 的 `shield` buff, 但引擎到期只删 buff 条目不扣 `f.shield` (BattleScene:5064-5085 仅特判 `hidingShield`)。即护盾实为永久。描述未声明时长, 故行为与描述不冲突; `duration:3` 仅 UI 余项。

---

## 赌神龟 (gambler)

base: HP 429 / ATK 47 / DEF 11 / MR 11 / crit 0.25 / A 级。
技能池: 卡牌射击(gamblerCards) / 万能牌(gamblerDraw) / 赌注(gamblerBet) / 强化多重打击(gamblerEnhancedMulti) / 命运之轮(gamblerFateWheel); 被动 多重打击(gamblerMultiHit)。

| 项 | 描述声称 | 代码现实 | 判定 |
|---|---|---|---|
| 被动 多重打击 | 40% 追打 0.5×ATK; 每次 ×0.8 递减; 赌注期 60% | `chance=40+_multiBonus`, `dmgScale=0.5`, `chance*=0.8` (passive-triggers:569-588 + pets:1655) — desc 已是 0.5 | ✅ **(基线 NUMERIC 已通过改描述为 0.5 修复)** |
| 卡牌射击 | 3 张共 0.9~1.8×ATK 物理 | `minScale=0.3,maxScale=0.6`, 每张随机, 刻意不暴击 (skill-handlers:4724-4751) | ✅ |
| 万能牌 | 2 段共 1.0×ATK 物理 + 自身 25%×ATK 永久盾 + 25%×ATK 回血 + 随机减益 3 回合(中毒/流血/灼烧转加层) | `atkScale=0.5`×2, 永久盾, 回血, DOT 走 `applyBurn`/`applyDotStacks` 加层 (skill-handlers:4755-4818) | ✅ **(基线"DOT 未加层"已修, :4804-4806)** |
| 赌注 | 需 HP>40%; 耗 40% 当前 HP 分 7 段物理; 期间多重 60% | `<=0.4` 拦, `hits=7`, `hpCostPct=40`, `_multiBonus+=20` (skill-handlers:4674-4717) | ✅ |
| 强化多重打击 | 登场 -30%maxHp, 多重永久 60% | passiveSkill, BattleScene:1188 (-30%maxHp + chance=60) | ✅ |
| 命运之轮 | 每回合抽花色永久加属性: ♠+5攻+30HP/♥+2甲+2魔抗/♦+8%暴+2穿/♣+4%吸血 | `_fateWheel` flag(BattleScene:1201) 现被 turn-begin 读 (:5309); ♠♥♦ 数值/穿甲/暴击均正确 | 🔴 (♣ 吸血失效, 见下) |

赌神龟基线两大 ⚠️ 均已修: 命运之轮入口判定 `p.type==='gamblerFateWheel' || f._fateWheel` (BattleScene:5309) — 装上即每回合抽花色, **整体已触发 ✅**; 多重打击描述已改 0.5。但命运之轮的 ♣ 项有新发现的死字段问题。

### Details — 命运之轮 ♣梅花 +4% 生命偷取 (🔴 bug, 死字段)
- 文件: BattleScene.ts:5338-5340
  ```ts
  ff._fateWheelCounts.club++;
  ff._lifestealPct = (ff._lifestealPct ?? 0) + 4;     // 下划线! 百分点
  this.spawnFloatingPassive(view, '♣ +4%吸血', '#10b981');
  ```
- 描述声称: "♣梅花 生命偷取 +4%"; detail 强调"效果永久叠加, 持续到战斗结束; 深海闯关也不重置"。
- 现实: 写入 `_lifestealPct`(下划线), 而**普通攻击/技能命中的通用吸血只读无下划线 `lifestealPct`** (passive-triggers.ts:600 `const lifesteal = attacker.lifestealPct`)。`_lifestealPct` 无任何通用命中消费处 (仅 e_star 溢出盾、headless 临时技能、面板显示读它)。→ **抽到 ♣ 后飘字 "+4%吸血" 但实战不回任何血。** 深海持久化(BattleScene:718 `x._lifestealPct += fw.club*4`)同样存进死字段。
- 同类问题: ♠(baseAtk/maxHp)、♥(def/mr)、♦(crit 经 _baseCrit + armorPen 经 f.armorPen, damage.ts:10 读) 三项均正确生效, 仅 ♣ 死。
- 推荐修法 (二选一, 与全局口径统一):
  1. 把 ♣ 改为 push `{type:'lifesteal', value:4, duration:大}` 的 buff (但 duration 与"永久"矛盾, 不佳); 或
  2. **(推荐)** 让通用吸血(passive-triggers.ts:600)同时计入 `_lifestealPct`(下划线/100): `const ls = (attacker.lifestealPct ?? 0) + (attacker._lifestealPct ?? 0)/100;` — 一次性同时修好 ♣、猎人偷取、以及疑似失效的所有装备吸血。建议此项, 但因影响装备需用户确认。

---

## 猎人龟 (hunter)

base: HP 439 / ATK 43 / DEF 13 / MR 11 / crit 0.25 / A 级。
技能池: 射箭(hunterShot) / 隐蔽(hunterStealth) / 连珠箭(hunterBarrage) / 毒箭(hunterPoison) / 猎杀印记(hunterMark); 被动 猎杀(hunterKill)。

| 项 | 描述声称 | 代码现实 | 判定 |
|---|---|---|---|
| 被动 猎杀 | 行动后斩杀 HP<14% 敌; 击杀时窃取对方 14% 基础属性 + 叠加 8% 生命偷取 | 斩杀严格 `<14%` (BattleScene:5631); 偷 14% baseAtk/def/mr/maxHp; lifesteal 写 `_lifestealPct`(BattleScene:4554) | 🔴 (8% 吸血失效, 见下) |
| 射箭 | 3 段共 1.65×ATK 物理; 目标<50%HP 时本技能 +40% 暴击 +20% 爆伤 | `atkScale=0.55`×3, `execThresh=50`→`crit+0.4`+`_extraCritDmg=0.2` 命中后还原 (skill-handlers:2656-2715) | ✅ |
| 隐蔽 | 0.9×ATK 物理 + 25% 闪避 3 回合 + 0.7×ATK 护盾 | `dmgScale=0.9`, dodge value25 duration3+1, `shield += 0.7×atk`(永久) (skill-handlers:5837-5864) | ✅ |
| 连珠箭 | 10 段随机敌共 2.4×ATK 真实 | `hits=10`, `arrowScale=0.24`, `applyRawDamage(...,'true',true)` 每段独立 crit (skill-handlers:4910-4944) | ✅ |
| 毒箭 | 0.8×ATK 物理 + 11 中毒值 + 治疗削减 | `atkScale=0.8`, stacks=`round(15×3/4)=11` applyDotStacks, healReduce 50% (skill-handlers:4950-4974) | ✅ |
| 猎杀印记 | 1.6×ATK 物理 + 印记 3 回合, 印记内 HP<24% 斩杀 | `atkScale=1.6`, mark{value24,3+1}, 斩杀在 applyRawDamage(damage.ts:231-240) (skill-handlers:2720-2742) | ✅ |

猎人龟技能全对; 斩杀阈值严格 `<14%` 正确; 偷取 14% 基础属性正确; 统计计入。唯一问题是被动里"叠加 8% 生命偷取"那一截。

### Details — 猎杀被动 "叠加 8% 生命偷取" (🔴 bug, 死字段)
- 文件: BattleScene.ts:4553-4554
  ```ts
  const lifesteal = hf.passive!.lifesteal as number | undefined;   // pets.ts:1758 lifesteal:8
  if (lifesteal) hf._lifestealPct = (hf._lifestealPct ?? 0) + lifesteal;   // 下划线!
  ```
- 描述声称(brief/desc): "击杀敌人时窃取对方 14% 基础属性, **并叠加 8% 生命偷取**"; 被动 desc 还列 "生命偷取 {B:lifesteal}%" 展示累计。
- 现实: 与命运之轮♣ 完全同因 — 累加进 `_lifestealPct`(下划线百分点), 而通用命中吸血只读无下划线 `lifestealPct`(小数, passive-triggers.ts:600)。→ **每次击杀面板"生命偷取 +8%"数字在涨, 但攻击命中时一滴血不回。** 多杀几只后理论应有可观吸血, 实战为 0。
- 注: 面板 DetailPanel.ts:893-895 显示时把两字段都算 (`_lifestealPct + lifestealPct×100`), 所以**面板看上去有吸血, 实战没有** — 更具迷惑性。
- 推荐修法: 同命运之轮♣, 采用通用吸血同时读 `_lifestealPct/100` 的全局修 (passive-triggers.ts:600), 一并修好猎人/赌神♣/装备吸血。需用户确认 (影响装备数值)。

### Details — 猎杀窃取触发面 (✅ 已收窄, 仅记录)
- 基线低#3 文案问题已修: BattleScene:4526 加 `this.currentAttacker === v.fighter` 门, 现仅**猎人亲手击杀**才窃取 (与描述"击杀敌人时窃取"对齐)。✅

---

## 小结

计数 (本批 5 龟 30 项技能+被动):
- ✅ 一致: 28 项
- ⚠️ 需决策: 1 项 (彩虹·橙光吸血——经查实际生效, 仅口径对比, 可不动)
- 🔴 bug: 2 项 (赌神·命运之轮♣ +4%吸血 / 猎人·猎杀被动 +8%吸血)

> 注: 上轮基线 6 个 ⚠️ 复核结果 **全部已修**: 命运之轮入口断链(高)✅、多重打击 0.6/0.5(改描述)✅、梭哈单体→全体✅、紫光诅咒 0.09→0.05✅、万能牌 DOT 加层✅、猎杀窃取收窄为亲手击杀✅。

### 最重要发现
**两处"生命偷取"是死字段 (赌神·命运之轮♣ +4% / 猎人·猎杀 +8%), 同根因**: 二者把吸血累加进 `_lifestealPct`(下划线, 百分点), 但全游戏唯一的通用命中吸血逻辑 (passive-triggers.ts:599-602) 只读无下划线的小数版 `lifestealPct`, `_lifestealPct` 无任何攻击命中消费处。两个被动的吸血在战斗中完全不回血, 而面板(DetailPanel:893-895)又把下划线版算进显示数字, 造成"面板有吸血、实战没有"的强迷惑。**装备来源的吸血(equipment.ts:96 / BattleScene:1139)同走 `_lifestealPct`, 极可能同样失效**, 建议在通用吸血处一次性把 `_lifestealPct/100` 并入读取来根治 (超出本批范围, 需用户拍板, 因会改动装备实际数值)。
