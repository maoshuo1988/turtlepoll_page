# 审计 C 组：pirate / candy / bubble / line / lightning / phoenix / lava

代码 vs 描述（pets.ts 的 brief/detail + `{}` 公式）保真度审计。
文件引用：`PT`=src/engine/passive-triggers.ts，`SH`=src/engine/skill-handlers.ts，`BS`=src/scenes/BattleScene.ts，`DMG`=src/engine/damage.ts，`pets`=src/data/pets.ts。

---

## 海盗龟 (pirate)

- 被动 掠夺 (pirateBarrage) — ✅ 一致
  开局轰击：`maxHp×bombardPct(25%)` 真伤 (BS:1530)；死亡钩锁击杀者 `maxHp×deathHookPct(25%)` 真伤 (BS:4296-4304)。与 `{T:HP*0.25}` 双段一致。装 pirateShipPassive 后 bombardPct/deathHookPct 清零 (BS:5779-5781) 与灰字说明一致。
  - ⚠️ EDGE/BUG（低）：死亡钩锁仅在 `this.currentAttacker && .alive` 时触发 (BS:4299)。若海盗龟被 DoT/灼烧/无明确攻击者击杀，则钩锁不发动；描述未提此条件。

- 弯刀 (physical, 4×0.35) — ✅ 一致。总 `1.4×ATK` 物理 (SH:547 通用 physical)，匹配 `{N:0.35*ATK*4}`。

- 火炮齐射 (pirateCannonBarrage, 6×) — ✅ 一致。每段 `0.17×ATK + 1.7%目标maxHp`，6 段 = `1.02×ATK + 10.2%maxHp` (SH:5169-5199)。匹配 brief/detail。

- 朗姆酒 (heal) — ✅ 一致。纯 HoT（无即时回血，因 skill.hot 存在 SH:5626），每回合 `9%maxHp`×4 回合可叠加 (SH:5634-5641)；护甲 `+15%×ATK`×3 回合 (SH:5644-5648)。匹配 `{H:HP*0.09}` / `{D:ATK*0.15}` 及"可叠加"灰字。

- 掠夺宝藏 (piratePlunder) — ✅ 一致。破盾 50%（含泡泡盾 SH:3250-3255）→ `0.8×ATK` 物理 → 偷 20% 护甲/魔抗转自身 3 回合 (SH:3273-3291)。匹配描述。

- 海盗船 (pirateShipPassive) — ✅ 一致。第 3 回合召唤 (BS:1678)，HP=`1.5×owner.maxHp`、ATK=`owner.atk`、无甲抗 (BS:6124-6135)，每回合开炮 `0.2×ATK` 物理 (BS:6169)。匹配 `{H:HP*1.5}`/`{N:ATK}`/`{N:0.2*ATK}`。

---

## 糖果龟 (candy)

- 被动 甜蜜掠夺 (candySteal) — ✅ 一致。第 3 回合随机敌偷 `25%maxHp`（同减 max+current，留 1 HP）(BS:5076-5097)。匹配描述及"最低留 1 点"灰字。

- 糖果锤 (physical, 1.1×ATK + selfHpPct 5%) — ⚠️ NUMERIC / BEHAVIOR（高）
  desc：造成 `{N:1.1*ATK}` +（`{N:HP*0.05}` = 5%×自身maxHp）物理 + 攻击 -15% 2回合。
  code：通用 `physical` handler (SH:547-593) 只读 `hpPct`（取 **目标** maxHp），**完全不读 `selfHpPct`** (SH:552; 全局确认仅 diamond/volcano 等专用 handler 读 selfHpPct，physical 不读)。
  结果：5%×自身maxHp（约 23 伤害）的附加段**未生效**，实际只打 `1.1×ATK`。atkDown -15%/2回合 正常 (SH:583-589)。

- 焦糖铠 (shield, shieldAtkScale 0.8 + healHpPct 10) — ⚠️ BEHAVIOR（高）
  desc：获得 `{S:0.8*ATK}` 护盾**并回复 `{H:HP*0.1}` 生命值**。
  code：通用 `shield` handler (SH:1126-1144) 只算护盾（读 shieldFlat/shieldAtkScale/shieldHpPct），**不读 `healHpPct`**（全局确认 healHpPct 仅被 bubbleHeal/treasure/bamboo 读，shield handler 无任何治疗逻辑）。
  结果：10%×maxHp 的回血段**完全缺失**，只上护盾。

- 糖衣炮弹 (candyBarrage, 4×0.25 + hpPct 4) — ✅ 一致。先 `+15%×ATK 穿甲`×3 回合 (SH:5519... armorPen)，再 4 段全体每段 `0.25×ATK + 4%目标maxHp` 物理 (SH:5420-5462)。匹配 `{N:0.25*ATK*4}` + 16%maxHp 及每段灰字。

- 糖果罐 (sweetTrap, passiveSkill) — ⚠️ DESC-GAP（低，未深查）
  handler 为 no-op stub (SH:5794)；装备定义 c_candy_jar 注释"打碎逻辑在 candy.js breakCandyJar" (equipment.ts:355-368)。本次未在 TS 侧定位到回合分档奖励池的实装代码，无法逐档核对 desc 的奖励分布（回合 1-2/3-4/.../10+）。建议后续单独验证奖励档位与"装备席满时全员回 10%maxHp"溢出规则。

- 糖果炸弹 (candyBombPassive) — ✅ 一致。召唤 `40%owner.maxHp` 实体、0 攻防 (BS:5917-5927)；每回合 `-20%maxHp` 衰减 (BS:5948)；死亡引爆 `150%自身maxHp` 总魔法，存活敌均摊 (BS:5977-5984)；糖果龟阵亡立即引爆 (BS:1407-1410)。匹配全部描述。

---

## 泡泡龟 (bubble)

- 被动 泡沫 (bubbleStore) — ⚠️ DESC-GAP（低）
  储存：受到伤害的 `100%` 存为泡泡值（上限=maxHp，仅按 hpLoss 不含破盾）(PT:264-270)。每回合先消耗 `15%` 回血，**再从剩余值** 消耗 `35%` 转魔法伤害打随机敌 (BS:7363-7389)。
  问题：desc 读起来像 15% 与 35% 都基于**同一原始泡泡值**；实际 35% 是基于扣完 15% 治疗后的**余量**，两段顺序串行扣减。数值偏低于直觉。伤害走 `applyRawDamage(magic)` 直接按泡泡值结算、不再被敌方魔抗减免（符合"直接魔法伤害"设计，不算 bug）。

- 泡泡攻击 (physical, 3×0.5) — ✅ 一致。`1.5×ATK` 物理。匹配 `{N:0.5*ATK*3}`。

- 泡泡盾 (bubbleShield, atkScale 1.8, burstScale 2, duration 3) — ⚠️ NUMERIC + BEHAVIOR（高）
  desc：套 `{S:1.8*ATK}` 泡泡盾 3 回合，**自然到期爆裂对全体敌造成 `{M:2.0*ATK}` 魔法伤害**。
  code 护盾段正确：`1.8×ATK` (SH:5307)。
  **爆裂段错**：到期爆裂硬编码 `owner.atk * 0.8`（0.8×ATK，忽略 `burstScale:2`）(BS:7222)，且 `applyRawDamage(ev.fighter, burstDmg)` **未传 dmgType → 默认 physical**，recordDamage 记 `'phy'` (BS:7226-7228)。
  结果：爆裂伤害约为描述的 **0.8/2.0 = 40%**（少 2.5 倍），且是物理而非魔法。

- 泡泡束缚 (bubbleBind, duration 8, lossCap 30) — ✅ 一致。束缚 8 回合，每段受击扣甲/抗 `X`（lv1-5=1，lv6-10=2 SH:3361），单项累计上限 30 (PT:316-330)，永久衰减。匹配描述。

- 泡泡爆破 (bubbleBurst, bubbleMagicScale 0.4, atkScale 0.8) — ✅ 一致。消耗全部泡泡值，对目标所在竖排（同 `_position`，≤3 只 SH:3387）每个造成 `40%×消耗泡泡值` 魔法 + `0.8×ATK` 物理双段 (SH:3375-3414)。匹配描述（含竖排说明）。

- 治愈泡泡 (bubbleHeal, healAtkPct 120, healHpPct 10, splashPct 25) — ✅ 一致。主目标回 `1.2×ATK + 10%maxHp` (SH:5279)，其他友军回主治疗量的 25% (SH:5285-5294)。匹配 `{H:1.2*ATK+HP*0.1}`。

---

## 线条龟 (line)

- 被动 墨迹 (inkMark, pctPerStack 5, maxStacks 5) — ✅ 一致。目标每受一次伤害，额外承受 `原伤害×层数×5%`（默认魔法，受魔抗减；rapid 后真伤不减）(DMG:266-279)。叠加上限 5（速写后 7，addInkStack cap SH:458）。匹配描述。

- 素描 (lineSketch, 3×0.5) — ✅ 一致。3 段 `0.5×ATK` 物理，每段叠 1 层墨迹（含连笔同步）(SH:5030-5054)。匹配 `{N:0.5*ATK*3}`。

- 连笔 (lineLink, atkScale 0.8, duration 3, transferPct 30) — ✅ 一致。连接两敌 3 回合，各 `0.8×ATK` 物理 + 各 +1 墨迹；建立 _inkLink，一方受伤 30% 以魔法（速写后真实）传导，墨迹同步 (SH:5089-5159)。匹配描述。

- 画龙点睛 (lineFinish, baseScale 0.7, perStackScale 0.45) — ✅ 一致。基础 `0.7×ATK` 物理 + 每层墨迹 `0.45×ATK`（默认魔法，rapid 后真实）二段，引爆后清墨迹，**击杀重置 CD** (SH:3306-3351)。动态文案 buildLineFinish (skill-text.ts:191-217) 与 handler 公式一致。

- 速写 (lineRapid, passiveSkill 强化) — ✅ 一致。`_inkCapOverride=7` + `_inkTrueDmg=true`：墨迹上限 7、墨迹/连笔传导/引爆全转真伤 (SH:3302, addInkStack SH:458-469, DMG:270)。匹配强化描述。

- 墨水炸弹 (lineInkBomb, 4×0.25, inkStacks 4) — ✅ 一致。全体 4 段 `0.25×ATK` 物理，每敌 +4 层墨迹（含同步）(SH:5059-5085)。匹配 `{N:0.25*ATK*4}` + 4 层。

---

## 闪电龟 (lightning)

- 被动 雷电 (lightningStorm, shockScale 0.82, stackMax 8) — ✅ 一致。每回合自动电击随机敌 `0.82×ATK` 真伤（turn hook），每次命中 +1 层电击，满 8 层引爆 `0.82×ATK` 真伤并清零 (PT:374-395)。匹配 `{T:ATK*0.82}` 与 8 层引爆。（注：满层引爆吃涌动 +50% 加成 PT:383-385，与涌动 detail 一致）

- 闪电打击 (lightningStrike, 5×0.23, splashPct 25) — ✅ 一致。perHit=`0.23×ATK/5`，5 段合计 `0.23×ATK` 魔法（P79 已修除以 hits 的 5x bug SH:2752），每段叠 1 层电击 + 溅射 25%×perHit 到随机次目标 (SH:2747-2779)。匹配 `{M:0.23*ATK}`（5 段总）。

- 涌动 (lightningSurgeBuff, surgeTurns 2, shockBoostPct 50) — ✅ 一致。接下来 2 回合被动电击（含引爆）真伤 +50%，立即对目标 `ATK×0.82×1.5` 真伤 (SH:2852-2872)。匹配 `{T:ATK*1.23}`（=0.82×1.5）。

- 雷暴 (lightningBarrage, 20×0.11) — ✅ 一致。20 道随机敌 `0.11×ATK` 魔法，每道叠 1 层电击 (SH:2784-2803)。匹配 `{M:0.11*ATK*20}` = 2.2×ATK。

- 感电 (lightningSurge, shockPerStackScale 0.1) — ✅ 一致。全体按电击层数每层 `0.10×ATK` 真伤，清空层 (SH:2806-2828)。匹配 `{T:0.10*ATK}`。

- 雷盾 (lightningShield, shieldScale 0.9, counterScale 0.1) — ✅ 一致。`0.9×ATK` 护盾 + counter buff 3 回合，护盾在时每受一段反击 `0.1×ATK` 魔法并叠电击（counter buff + lightningStorm passive on-hit PT:362-371 + 374-395）(SH:2831-2844)。匹配描述。
  - 注（低）：反击仅在 `target.shield>0` 时触发 (PT:365)；雷盾的 `0.9×ATK` 走 applyShield 进 shield 槽，泡泡盾另算，逻辑自洽。

---

## 凤凰龟 (phoenix)

- 被动 涅槃 (phoenixRebirth, revivePct 30) — ⚠️ DESC-GAP（低）
  首次死亡以 `30%maxHp` 复活（强化版 100%+永久 +20%ATK）(BS:3879-3898)；对全体敌施灼烧 `round(ATK×0.67)` 层 + 治疗削减 -50% 3 回合 (BS:3905-3911)。复活/削减/+ATK 均一致。
  问题：desc 写灼烧"持续3回合"，但灼烧是层数衰减模型（每回合约 1/3 衰减，duration:999 PT:47-60），并非固定 3 回合；"持续3回合"实际只精确描述治疗削减。灼烧值 `{0.67*ATK}` 数值一致。

- 灼烧 (phoenixBurn, atkScale 0.9) — ✅ 一致。`0.9×ATK` 魔法 + 灼烧 `round(ATK×0.53)` 层 (SH:1978-1989)。匹配 `{M:0.9*ATK}` + `{0.53*ATK}` 灼烧值，灰字衰减/maxHp 放大说明与 dot 实装一致。

- 熔岩盾 (phoenixShield, shieldScale 0.75, duration 4, counterScale 0.14) — ✅ 一致。`0.75×ATK` 护盾 4 回合 + counter `0.14×ATK` 魔法（护盾在时受击反击）(SH:1994-2002)。匹配 `{S:0.75*ATK}`/`{M:0.14*ATK}`。

- 烫伤 (phoenixScald, atkScale 0.7) — ✅ 一致。破盾 50%（含泡泡盾）→ `0.7×ATK` 魔法 → atk/def/mr 各 -15% 4 回合 + 灼烧 `round(ATK×0.67)` + 治疗削减 -50% (SH:2005-2034)。匹配描述（灼烧值 `{0.67*ATK}`）。

- 强化涅槃 (phoenixEnhancedRebirth, passiveSkill) — ✅ 一致。复活转 100%maxHp + 永久 +20%ATK (BS:3881-3897)。匹配描述。

- 火焰净化 (phoenixPurify, isAlly) — ✅ 一致。清友方全部减益（atkDown/defDown/mrDown/burn/curse/healReduce/poison/bleed/armorBreak），每清 1 个回 `10%maxHp` (SH:2037-2050)。匹配描述及减益清单灰字。

---

## 熔岩龟 / 火山龟 (lava)

- 被动 熔岩之心 (lavaRage) — ⚠️ NUMERIC（高，变身 AOE）
  怒气：造伤 25% + 受伤(hpLoss) 20% 积累，满 100 变身 (PT:245-261)。变身加成：maxHp `+2.5×ATK`、atk/def/mr 各 `+0.2×ATK`、持续 6 回合 (BS:5662-5677)。**这部分与 desc 一致**（`{H:ATK*2.5}`/`{N/D/M:ATK*0.2}`）。
  **变身 AOE 数值不符**：desc 写变身瞬间对全体造成 `{M:ATK*1.2+ATK*0.2*1.2}`（≈ 1.44×基础ATK）魔法。
  code：`aoeDmg = round(post-transform atk × transformAoeDmgScale)`，其中 post-atk=`1.2×ATK`、`transformAoeDmgScale=0.5` (pets:2502, BS:5714-5715) → 实际 `1.2×ATK × 0.5 = 0.6×ATK`（再过魔抗）。
  结果：实际变身 AOE ≈ desc 的 **0.6/1.44 ≈ 42%**（约少 2.4 倍）。"每令一名敌人灼烧回 8% 已损 HP" 部分一致 (BS:5738-5743)。

- 熔岩弹 (lavaBolt, atkScale 0.9, targetHpPct 8) — ✅ 一致。`0.9×ATK`（过魔抗）+ `8%目标maxHp`（不过魔抗，P89 分开算 SH:2666-2675）合并应用 + 灼烧 4 回合 `round(ATK×0.67)` (SH:2685)。匹配 `{M:0.9*ATK}` + 8%maxHp + 灼烧。

- 地裂 (lavaQuake, atkScale 0.6, mrDown 20%/3t) — ✅ 一致。全体 `0.6×ATK` 魔法 + 魔抗 -20% 3 回合（max-merge）(SH:2690-2708)。匹配描述。

- 岩浆涌动 (lavaSurge, atkScale 1.5, shieldAtkPct 80) — ✅ 一致。`1.5×ATK` 魔法 + `0.8×ATK` 永久护盾 (SH:2712-2722)。匹配 `{M:1.5*ATK}` / `{S:0.8*ATK}`（applyShield 无 duration = 永久）。

- 熔岩喷射 (lavaSplash, hits 3×0.2, aoe:true, burn) — ⚠️ BEHAVIOR（高）
  desc（brief+detail）：「对**全体敌方**喷射三段，共 `{M:0.2*ATK*3}` 魔法 + 灼烧四回合」，pets 字段含 `"aoe": true`。
  code：handler 只对**单个 target** 打 3 段 (SH:2727-2740)，注释明确"JS 是单体；旧 PoC 全敌 AoE 是自创"。
  结果：实际单体，与描述/aoe 字段的"全体敌方"矛盾。每段 `0.2×ATK` 魔法 + 灼烧值一致，但目标范围错。

- 强化熔岩之心 (lavaEnhancedRage, passiveSkill) — ✅ 一致。开局即 100 怒气立即变身 (BS:1264-1265 设 _lavaRage=100/_lavaRageReady)。匹配描述（火山形态少一槽，volcanoSkills slice(0,3) BS:5682-5684）。

### 火山形态技能 (volcanoSkills)

- 烈焰重击 (volcanoSmash, atkScale 1.3, selfHpPct 8, lifestealPct 20) — ✅ 一致。`1.3×ATK + 8%自身maxHp` 物理 + 造成伤害 20% 吸血 (SH:4429-4455)。匹配 `{N:1.3*ATK}` + `{N:HP*0.08}` + 20% 吸血。

- 熔岩铠甲 (volcanoArmor, shieldAtkScale 0.9, defMrUpPct 20/3t, healLostPct 15) — ✅ 一致。`0.9×ATK` 护盾 + 甲/抗 +20% 3 回合 + 回 15% 已损 HP (SH:4547-4558+)。匹配描述。

- 火山爆发 (volcanoErupt, 5×0.22, selfHpPct 3, burn) — ✅ 一致。5 段全体 `0.22×ATK + 3%自身maxHp` 魔法 + 灼烧 + 总伤 15% 吸血 (SH:4460-4499)。匹配 `{M:(0.22*ATK+HP*0.03)*5}` 与 detail（110%ATK + 15%maxHp）。

- 岩浆践踏 (volcanoStomp, atkScale 0.8, stunChance 40, healLostPct 10) — ✅ 一致。全体 `0.8×ATK` 魔法 + 每目标 40% 概率眩晕 1 回合 + 回 10% 已损 HP (SH:4504-4543)。匹配描述（注释确认旧 PoC 单体/100%晕是错的，已修为 AOE/概率）。

---

## 小结（最重要问题）

按严重度排列：

1. **泡泡盾爆裂 (bubble) — 高**：自然到期爆裂硬编码 `0.8×ATK` 且为**物理**，无视 `burstScale:2`，desc 写 `{M:2.0*ATK}` 魔法。实际约为描述的 40%，且伤害类型错 (BS:7222-7228)。

2. **熔岩之心变身 AOE (lava) — 高**：`transformAoeDmgScale=0.5` 使变身瞬间 AOE 实际 ≈ `0.6×ATK`，而 desc `{M:ATK*1.2+ATK*0.2*1.2}` ≈ 1.44×ATK，约少 2.4 倍 (BS:5714-5715, pets:2502)。

3. **焦糖铠回血缺失 (candy) — 高**：通用 `shield` handler 不读 `healHpPct`，desc 的"回复 `{H:HP*0.1}` 生命值"完全没实装，只上护盾 (SH:1126-1144)。

4. **糖果锤自损血加伤缺失 (candy) — 高**：通用 `physical` handler 不读 `selfHpPct`，desc 的 `{N:HP*0.05}`（5%自身maxHp 物理段）未生效 (SH:547-593)。

5. **熔岩喷射目标范围 (lava) — 高（行为）**：pets 标 `aoe:true`、desc 写"全体敌方"，但 handler 仅打单体 (SH:2727)。需统一 desc 与字段或改回 AOE。

6. 次要：凤凰/熔岩"灼烧持续N回合"措辞与衰减层数模型不符（DESC-GAP，低）；泡泡被动 15%/35% 串行扣减易误读（低）；海盗死亡钩锁依赖 currentAttacker（DoT 击杀不触发，低）；糖果罐奖励档位未在 TS 侧逐档核对（待查）。

其余技能（弯刀/火炮齐射/朗姆酒/掠夺宝藏/海盗船/糖衣炮弹/糖果炸弹/甜蜜掠夺/泡泡攻击/泡泡束缚/泡泡爆破/治愈泡泡/全部线条技能/全部闪电技能/凤凰其余技能/熔岩弹/地裂/岩浆涌动/全部火山技能）数值与行为均与描述一致。
