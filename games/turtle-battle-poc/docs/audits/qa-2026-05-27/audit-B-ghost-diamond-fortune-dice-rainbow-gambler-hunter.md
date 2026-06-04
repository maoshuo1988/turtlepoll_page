# 审计 B — 幽灵/钻石/财神/骰子/彩虹/赌神/猎人 (描述 vs 代码)

审计日期 2026-05-27。源文件: `src/data/pets.ts` / `src/engine/skill-handlers.ts` / `src/engine/passive-triggers.ts` / `src/engine/damage.ts` / `src/engine/stats-recalc.ts` / `src/scenes/BattleScene.ts`。
图例: ✅ 一致 / ⚠️ 有出入 (附 类别+严重度)。

---

## 幽灵龟 (ghost)

- **被动 怨灵 (ghostCurse)** — ✅ 一致。登场诅咒全体敌人 3 回合 (turns=3), 每回合 5% maxHp 真伤 (BattleScene.ts:4816-4828, value=round(maxHp×5%), duration=turns+1)。
- **幽魂触碰 (ghostTouch)** — ✅ 一致。物理段 0.4×ATK 走护甲 + 真伤段 0.9×ATK 无视防御 (skill-handlers.ts:1271-1309), 与 `{N:0.4*ATK}`+`{T:0.9*ATK}` 吻合。
- **幽冥突袭 (ghostPhantom)** — ✅ 一致。1.5×ATK 魔法 (`{M:1.5*ATK}`) + 80% 生命偷取 + 25% 闪避 2 回合 (dodgeTurns=2, duration=dodgeTurns+1) (skill-handlers.ts:1313-1342)。
- **灵魂风暴 (ghostStorm)** — ✅ 一致。无诅咒: 2 段魔法 1.25×ATK (共 2.5×ATK) + 施加诅咒 3 回合; 已诅咒: 改 2 段真伤同倍率且不刷新诅咒 (skill-handlers.ts:1389-1427)。与描述完全吻合。
- **强化怨灵 (ghostEnhancedCurse)** — ✅ 一致。死亡时全体敌人再诅咒 5 回合 (duration=6=5回合, value=5% maxHp) (BattleScene.ts:4174-4185)。
- **虚化 (ghostPhase)** — ✅ 一致。自施 physImmune 90% 2 回合 (phantomTurns=2, duration+1) + 2 段真伤 0.6×ATK (共 1.2×ATK) (skill-handlers.ts:1431-1466)。

---

## 钻石龟 (diamond)

- **被动 钻石结构 (diamondStructure)** — ✅ 一致。全队 def/mr buff 放大 +50% (defBuffAmp=50, stats-recalc.ts:20-30); 每段非真伤减免 def×20% (damage.ts:72-78, flatReductionPct=20)。与 `{D:DEF*0.2}` 吻合。
- **钻石切割 (physical)** — ✅ 一致。0.7×ATK + 0.6×DEF + 0.6×MR 物理 (走通用 physical 处理 atkScale/defScale/mrScale)。
- **坚不可摧 (diamondFortify)** — ✅ 一致。护盾 20% maxHp 3 回合 + 护甲/魔抗各 +20%×ATK 3 回合 (defUpAtkPct=mrUpAtkPct=20, skill-handlers.ts:5711-5731)。
- **碰撞 (diamondCollide)** — ✅ 一致。0.8×ATK + 0.9×DEF + 0.9×MR + 8% maxHp 物理; 同一目标累计被碰撞 2 次 (stunAfter=2) 触发眩晕 1 回合并重置计数 (skill-handlers.ts:2316-2347, stun duration=2=1回合)。
- **强化钻石结构 (diamondEnhanced)** — ✅ 一致。自身放大 +100% / 友军 +50% (stats-recalc.ts:26-27); 减免改 def×20%+mr×10% (damage.ts:73-76)。
- **钻石冲撞 (diamondSmash)** — ✅ 一致。1×DEF + 1×MR + 0.1×ATK 物理 (走 dealRaw 无护甲减免/无暴击, 与"物理"标签略有差异但伤害值与 `{N:DEF+MR+0.1*ATK}` 吻合); 流血 9 层 (bleedValue=12, round(12×3/4)=9, skill-handlers.ts:2305)。

---

## 财神龟 (fortune)

- **被动 聚宝盆 (fortuneGold)** — ✅ 一致。每回合末 +3~8 金币 (roll=3+floor(rand×6), BattleScene.ts:7272); 任意单位阵亡时 +9 金币 (BattleScene.ts:4345)。
  - 备注(非 bug): turn-begin 另有 `this.coins += 2`(玩家"龟币"元货币, BattleScene.ts:4949), 与战内 `_goldCoins` 是两套系统, 描述讲的是后者, 无须修正。
- **打击两下 (fortuneStrike)** — ✅ 一致。2 段, 每段 (0.5 + 0.03×coins)×ATK, 合计 ATK×(1+0.06×coins), 不消耗金币 (skill-handlers.ts:3639-3658)。与 `{N:ATK + ATK*0.06*goldCoins}` 吻合。
- **骰子 (fortuneDice)** — ✅ 一致。+3~8 金币 + 回 8% maxHp; 已用过梭哈则额外 +10% maxHp 永久护盾 (skill-handlers.ts:3611-3633, allInUsed 经 fortuneAllIn.cdLeft>0 判定)。
- **梭哈 (fortuneAllIn)** — ⚠️ **BEHAVIOR / DESC-GAP (中)**。
  - 描述(detail)写"对**全体敌方**每枚造成 1 段混合伤害"(brief 仅写"每枚造成…")。
  - 代码 (skill-handlers.ts:5472-5510) 只对**单一 target** 循环 coins 次 (0.18×ATK 物理 + 0.18×ATK 真伤), 技能无 `aoe:true` 标志 (pets.ts:1370-1382), 派发器按单体处理 (BattleScene.ts:2873)。
  - 即: 实际为**单体**梭哈, detail 的"全体敌方"为误导。`oneTimeUse`/cd:999 一场一次 ✅。
- **招财进宝 (fortuneBuyEquip)** — ✅ 一致 (核心)。消耗 20 金币 → 触发抽 1 件装备进装备席事件 (skill-handlers.ts:5455-5469, coinCost=20)。装备席满/AI 自动分配等后续逻辑在 BattleScene, 未逐项验, 核心金币与抽取一致。
- **聚财 (fortuneGainCoins)** — ✅ 一致。+10 金币 (coinGain=10, skill-handlers.ts:5445-5452)。

---

## 骰子龟 (dice)

- **被动 赌徒之血 (gamblerBlood)** — ✅ 一致。损失生命换暴击: 损 30%(maxCritAtLoss) 时满 +50%(maxCritGain); 超 100% 暴击经 overflowMult=1.5 转爆伤 (BattleScene.ts:5129-5141 + damage.ts calcCritMult)。
- **骰子攻击 (diceAttack)** — ✅ 一致。3 段, 总基础 = 0.9×ATK + crit×55 (critBonusMult=55), 平分 3 段 (skill-handlers.ts:2519-2546)。与 `{N:0.9*ATK+crit*55}` 吻合。
- **孤注一掷 (diceAllIn)** — ✅ 一致。全体敌方 1.2×ATK 物理 + 30% 生命偷取(按总伤) (skill-handlers.ts:4881-4916, lifestealPct=30)。
- **命运骰子 (diceFate)** — ✅ 一致。随机 +40%~130% 暴击 (minCrit=40,maxCrit=130, `minCrit+floor(rand×(max-min+1))`) 持续 5 回合 (duration+1=6) (skill-handlers.ts:2549-2560)。RNG 区间正确。
- **真正的赌徒 (diceGamblerConvert)** — ✅ 一致。登场 DEF+MR → 护甲穿透, DEF/MR 归零 (BattleScene.ts:1246-1252)。与 `{P:DEF+MR}` 吻合。
- **稳定骰子 (diceFlashStrike)** — ✅ 一致。掷 1d6 → (4+点数)=5~10 段 (baseHits=4, roll=1+floor(rand×6)); 首段 0.9×ATK, 每段线性递减 10% (`0.9×(1-0.1×i)`) (skill-handlers.ts:4920-4950)。RNG 与递减均吻合。

---

## 彩虹龟 (rainbow)

- **被动 棱镜 (rainbowPrism)** — ✅ 一致。每回合随机红/蓝/绿: 红 +12% ATK / 蓝 +12% def&mr / 绿回 5% maxHp, 均持续 1 回合 (duration=2); 首回合(turn<=1)不抽绿 (BattleScene.ts:5415-5482, atkPct=defPct=12,healPct=5)。
- **七彩光束 (magic, prismBonus)** — ✅ 一致。2 段魔法 0.7×ATK (共 1.4×ATK) + 当回合色光附加: 红=总伤 20% 真伤 / 蓝=自身 0.2×ATK 护盾 / 绿=回 5% maxHp (skill-handlers.ts:5576-5618)。`_prismColor` 现已每回合赋值 (BattleScene.ts:5434), AUDIT.md:64 的"从不赋值"为旧记录, 已修复。
- **棱镜护盾 (shield)** — ✅ 一致。全体友方 0.65×ATK 护盾 (shieldAtkScale=0.65, aoeAlly)。
- **全色风暴 (rainbowStorm)** — ✅ 一致。全体敌方 4 段, 每段 0.2×ATK 魔法 + 0.1×ATK 真伤 (atkScale=0.2,pierceScale=0.1); -15% 护甲 3 回合 (defDown {15,3}) (skill-handlers.ts:2884-2930)。与 `{M:0.2*ATK*4}`+`{T:0.1*ATK*4}` 吻合。
- **强化棱镜 (rainbowEnhancedPrism)** — ✅ 基本一致 (1 处小出入)。新增橙/黄/青/紫, 每回合额外抽 1 个 (`_enhancedPrism` flag, BattleScene.ts:5429-5480): 橙=全队 10% 吸血 1 回合 ✅ / 黄=随机敌 round(0.67×ATK) 灼烧 ✅(defaultBurnStacks) / 青=随机敌冰寒 1 回合 ✅ / 紫=随机敌诅咒 3 回合 ✅。
  - ⚠️ **DESC-GAP (低)**: 紫光诅咒 value=9% maxHp (BattleScene.ts:5476, `round(maxHp×0.09)`), 而幽灵龟标准诅咒/通用诅咒提示文案均为 5% maxHp。描述只写"诅咒 3 回合"未标数值, 但同名"诅咒"在不同来源伤害不一致, 易误导。
- **反射 (rainbowReflect)** — ✅ 一致。自身先回 0.5×ATK(不衰减), 之后敌/友交替弹射, 每跳 ×0.85(=-15%)衰减, 下限 0.4(40%), 无新目标即止 (skill-handlers.ts:4980-5025, reflectDecay=0.85,reflectFloor=0.4)。

---

## 赌神龟 (gambler)

- **被动 多重打击 (gamblerMultiHit)** — ⚠️ **NUMERIC (中)**。
  - 描述: 追加打击造成"(60%×攻击力 = `{N:ATK*0.6}`)"物理伤害。
  - 代码: `dmgScale ?? 0.5`, 且 pets.ts:1651 `"dmgScale": 0.5` → 实际额外打击 = **0.5×ATK**, 非 0.6×ATK (passive-triggers.ts:574-577)。描述的 0.6 / `{N:ATK*0.6}` 与代码不符。
  - 概率链 ✅: base 40% (+_multiBonus), 每次 `×0.8`(=-20%): 40→32→25.6 与描述吻合 (passive-triggers.ts:587)。
- **卡牌射击 (gamblerCards)** — ✅ 一致。3 张, 每张随机 0.3~0.6×ATK 物理 (minScale=0.3,maxScale=0.6), 合计 0.9~1.8×ATK (skill-handlers.ts:4628-4655)。RNG 区间正确。(代码刻意不暴击, 描述未声称暴击, 不计为出入。)
- **万能牌 (gamblerDraw)** — ✅ 基本一致 (1 处实现细节)。2 段共 1.0×ATK 物理 (atkScale=0.5×2) + 自身 25%×ATK 永久护盾 + 25%×ATK 回血 + 随机 1/8 减益 3 回合 (skill-handlers.ts:4659-4719)。
  - ⚠️ **BEHAVIOR (低)**: 描述"若为中毒/流血/灼烧则转为添加层数"。代码对 dot 走 `target.buffs.push({type,value,duration:3})` 直接新增一条 buff, 未用 `applyDotStacks` 与既有层数合并 (skill-handlers.ts:4708)。效果上是多一条独立 DOT(近似"加层"), 但与其它"加层"口径(合并到 999 时长)不一致。
- **赌注 (gamblerBet)** — ✅ 一致。需 HP > 40% (`<=0.4` 拦截); 消耗 40% 当前 HP 分 7 段物理 (hits=7); 期间多重打击 +20%(_multiBonus, base40→60) (skill-handlers.ts:4578-4621, hpCostPct=40,multiBonus=20)。
- **强化多重打击 (gamblerEnhancedMulti)** — ✅ 一致。登场 -30% maxHp, passive.chance 永久设 60 (BattleScene.ts:1184-1192)。
- **命运之轮 (gamblerFateWheel)** — ⚠️ **EDGE/BUG (高) — 技能完全不触发**。
  - 描述: 每回合开始抽花色永久加属性 (♠+5攻+30HP / ♥+2甲+2魔抗 / ♦+8%暴+2穿 / ♣+4%吸血)。
  - 触发逻辑断链: 装备此 passiveSkill 时仅设 `_fateWheel = true` (BattleScene.ts:1196-1197), 但该 flag **全代码库再无任何读取处** (grep 仅 2 处, 均为该赋值块)。
  - 而真正执行 4 花色的 turn-begin 块判定条件是 `p.type === 'gamblerFateWheel'` (BattleScene.ts:5146), `p = f.passive` 对赌神龟恒为 `gamblerMultiHit`, 永不等于 `gamblerFateWheel`。
  - 结论: 命运之轮装上后**每回合不会抽花色, 不加任何属性**。4 花色数值本身实现正确 (5152-5178), 只是入口判定错。修法: turn-begin 改判 `(f as any)._fateWheel` 而非 `p.type==='gamblerFateWheel'`(或额外补该条件)。

---

## 猎人龟 (hunter)

- **被动 猎杀 (hunterKill)** — ✅ 基本一致 (1 点行为说明)。每回合行动后斩杀 HP < 14% 敌人 (hpThresh=14, 严格 `< 14%`, BattleScene.ts:5499); 偷取死者 14% 基础 atk/def/mr/maxHp + 叠 8% 生命偷取 (BattleScene.ts:4370-4391, stealPct=14,lifesteal=8)。
  - ⚠️ **DESC-GAP (低)**: 窃取触发于"任意敌方死亡"(`dead.side !== hunter.side`, BattleScene.ts:4363), 含被队友击杀的敌人; 描述写"击杀敌人时窃取"易理解为仅猎人亲手击杀。与 JS 参考一致, 仅文案精确度问题。
- **射箭 (hunterShot)** — ✅ 一致。3 段 0.55×ATK 物理 (共 1.65×ATK); 目标 HP < 50%(execThresh) 时本技能 +40% 暴击 +20% 爆伤 (execCrit=40,execCritDmg=20) (skill-handlers.ts:2574-2632)。
- **隐蔽 (hunterStealth)** — ✅ 一致。0.9×ATK 物理 + 25% 闪避 3 回合(dodgeTurns=3,duration+1) + 0.7×ATK 护盾 (skill-handlers.ts:5733-5759)。
- **连珠箭 (hunterBarrage)** — ✅ 一致。10 段随机敌 0.24×ATK 真伤 (arrowScale=0.24, 共 2.4×ATK) (skill-handlers.ts:4812-4845)。与 `{T:0.24*ATK*10}` 吻合。
- **毒箭 (hunterPoison)** — ✅ 一致。0.8×ATK 物理 + 中毒 round(15×3/4)=11 层 (dot{dmg:15,turns:3}) + 治疗削减 50% (skill-handlers.ts:4852-4875)。与"11 中毒值"吻合。
- **猎杀印记 (hunterMark)** — ✅ 一致。1.6×ATK 物理 + 印记 3 回合(markTurns=3,duration+1), 印记内 HP < 24%(markExecPct) 斩杀 (skill-handlers.ts:2638-2659)。

---

### 小结 (优先级排序)

1. ⚠️ **[高] 赌神龟·命运之轮 (gamblerFateWheel) 完全不触发**。装备 flag `_fateWheel` 设了但无人读取; turn-begin 判定 `p.type==='gamblerFateWheel'` 对赌神龟恒假(其 passive 是 gamblerMultiHit)。该 5 技整体失效, 不加任何属性 (BattleScene.ts:1196-1197 vs 5146)。
2. ⚠️ **[中] 赌神龟·多重打击 (gamblerMultiHit) 数值不符**。描述/token 写 0.6×ATK (`{N:ATK*0.6}`), 但 `dmgScale=0.5` 实际只打 0.5×ATK (passive-triggers.ts:574-577 / pets.ts:1651)。改 desc→0.5 或改参数→0.6 二选一。
3. ⚠️ **[中] 财神龟·梭哈 (fortuneAllIn) 单体 vs 描述"全体敌方"**。detail 称对全体敌方每枚造成混合伤害, 代码只打单一目标 (无 aoe 标志, skill-handlers.ts:5472)。需统一: 改 desc 为单体, 或给技能加 aoe + 改 handler 遍历敌方。
4. ⚠️ **[低] 彩虹龟·强化棱镜紫光诅咒 = 9% maxHp**, 与游戏内其它"诅咒"(5% maxHp)数值不一致 (BattleScene.ts:5476)。建议统一或在描述标注。
5. ⚠️ **[低] 赌神龟·万能牌 DOT 减益**未走 `applyDotStacks` 合并层数, 与描述"转为添加层数"的口径略偏 (skill-handlers.ts:4708)。
6. ⚠️ **[低] 猎人龟·猎杀窃取**对"任意敌方死亡"生效(含队友击杀), 描述"击杀敌人时"文案不够精确。

其余 幽灵/钻石/骰子 全部技能与被动均与描述一致, 数值/段数/dmgType/RNG 区间核对无误。
