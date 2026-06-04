# 审计 D — 赛博/水晶/宝箱/星际/缩头/无头/龟壳

审计日期 2026-05-27。比对 `src/data/pets.ts` 描述 vs 实际代码行为。
- 技能 handler: `src/engine/skill-handlers.ts`
- 被动/受击: `src/engine/passive-triggers.ts`、`src/engine/damage.ts`
- 回合/召唤/变身/储能: `src/scenes/BattleScene.ts`
- 动态文本: `src/systems/skill-text.ts`

注: `?? <默认值>` 兜底常与 pets.ts 实际字段不同（如 starEnergy 读 `chargeRate ?? 30` 而字段是 62）。凡 pets.ts 提供了字段，实际取字段值，兜底是死分支，不构成偏差，已逐一核对。

---

## 赛博龟 (cyber)

- **浮游炮 (passive cyberDrone)** ⚠️ BEHAVIOR + UNDOCUMENTED
  - desc: 每回合生成1炮（上限10），每炮对随机敌 25%×ATK 物理；本体阵亡组装机甲（HP=(30+2×Lv)×炮数，ATK=(4.5+0.1×Lv)×炮数，暴击25%，护甲/魔抗0，每回合打最低HP敌 150%×ATK）。
  - code: 生成/伤害/机甲数值全部一致（BattleScene:6778-6833 生成+开火；4187-4258 机甲组装，atkScale 1.5、def/mr=0、crit 0.25、mechAttack 锁最低HP）。
  - 偏差: 第1回合只生成不开火（`turn<=1` continue，BattleScene:6800），描述未提"首回合不射"。**UNDOCUMENTED 低**。
  - 偏差: 无人机伤害走简化护甲公式且**不吃暴击**（BattleScene:6813 `round(atk*scale)`，仅减护甲），描述"造成物理伤害"未说明无暴击。**DESC-GAP 低**。

- **激光枪 (physical, hits5/atkScale0.15/hpPct2.4)** ✅ 一致
  - 5段共 0.75×ATK + 2.4%×5=12% 目标最大生命值物理（physical handler skill-handlers:547-593, base=atk*scale+maxHp*hpPct/100）。token `{N:0.15*ATK*5}` 与 "12%目标最大生命值" 均正确。

- **能量大炮 (cyberBeam, atkScale0.5/hits2/droneTrueScale0.10)** ✅ 一致
  - 物理两段共 100%×ATK（0.5×2），真伤每段 5%×ATK×炮数、两段共 10%×ATK×炮数；强化后改 3.5%/段（droneTrueScaleEnhanced 0.07）。skill-handlers:3037-3204 完全吻合 desc。

- **部署 (cyberDeploy, deployCount3)** ✅ 一致
  - 立即 +3 炮，封顶 10（强化 20），槽位不足只补差额并提示"上限"。skill-handlers:5549-5570。

- **强化浮游炮 (cyberEnhancedDrone, passiveSkill)** ⚠️ EDGE/BUG
  - desc: 上限10→20、每回合1→2、每炮25%→12%；**机甲组装时额外获得(3×炮数)护甲与魔抗**。
  - code: 前三项均生效（BattleScene:1320-1328 改 passive.maxDrones=20 / dronesPerTurn=2 / droneScale=0.12）。
  - **机甲额外 +3×炮数 护甲/魔抗 未实装**：机甲组装处硬写 `def=0; mr=0`（BattleScene:4204），无 `_cyberEnhanced` 分支补 def/mr。**EDGE/BUG 中**。

- **浮游联防 (cyberSwarmShield, shieldAtkScale0.6/perDrone15)** ✅ 一致
  - 全友永久护盾 = (0.6 + 0.15×炮数)×ATK（强化 0.10）。skill-handlers:5771-5790。

---

## 水晶龟 (crystal)

- **水晶共鸣 (passive crystalResonance, magicAbsorb20/max4/hp19/mrDown20/3t)** ✅ 一致
  - 受魔法额外减免20%（damage.ts:177-180）；命中叠1层，满4引爆 19%目标最大HP魔法 + 魔抗-20%×3回合（passive-triggers:89-120 applyCrystallizeStack）。

- **水晶刺 (crystalSpike, hits2/atkScale0.5/targetHpPct3)** ✅ 一致
  - 两段共 100%×ATK + 3%×2=6% 目标最大HP 魔法，每段叠结晶。skill-handlers:2935-2951。

- **水晶壁垒 (crystalBarrier, shield0.9/defMr15/3t)** ✅ 一致
  - 自盾 0.9×ATK + 全友 护甲/魔抗 +15%（按各自 baseDef/baseMr 算 flat 值）3回合。skill-handlers:2958-2974。

- **碎晶爆破 (crystalBurst, hits3/atkScale0.233/pierceScale0.033)** ✅ 一致
  - 全敌3段，魔法 0.233×3 + 真实 0.033×3，每段叠结晶、满层自动引爆。skill-handlers:2977-3007。

- **水晶球 (crystalBall, passiveSkill)** ✅ 一致
  - 登场召唤：HP=50%本体maxHp、ATK=100%本体ATK、def/mr/crit=0（BattleScene:5855-5887）；友方行动后射整列两段共 100%×ATK 魔法、每段叠结晶、与本体共享 _crystallize（BattleScene:6000-6050，segDmg=ball.atk×0.5×2）。本体亡随之消失（4042+）。槽位满有保护。

- **不朽 (crystalImmortal, passiveSkill)** ✅ 一致
  - 第10回合 +5000 maxHp / +400 ATK，一次性（BattleScene:5106-5118）。

---

## 宝箱龟 (chest)

- **藏宝图 (passive chestTreasure)** ✅ 一致
  - 阈值 80/130/240/360/590 ×(1+0.03×(Lv-1))；池1(第1-2件,回8%)/池2(第3-4件,回11%)/池3(第5件,回15%)；最多5件。BattleScene:4408-4455 全部吻合，含 healPctByPool=[8,11,15]、poolIdx 切换。装备 stat 应用（atk/defMr/crit/lifesteal/crown/hot/star/thunder/chain/rock…）与池描述一致（4458+）。

- **宝箱砸击 (chestSmash, hits3/atkScale1.5, 动态文本)** ✅ 一致
  - 共 150%×ATK 分3段物理（star→真伤、rock→+100%护甲+100%魔抗、chain→25%溅射、thunder→满5层引爆100%ATK真伤、fire→灼烧、poison→治疗削减）。skill-handlers:3682-3784 + skill-text.ts:155-185 动态 brief。

- **清点财宝 (chestCount, healHpPct5/shieldAtkScale0.6)** ✅ 一致
  - 回 5%maxHp + 0.6×ATK 护盾，treasureBonus=1+floor(财宝/100)×0.14 同时放大回血与护盾。skill-handlers:5514-5532。
  - 注: 数据里 `healPct:14` 字段未被读取（vestigial），无害。

- **财宝风暴 (chestStorm, hits5/atkScale0.2)** ✅ 一致
  - 全敌5段共 100%×ATK 物理；star/thunder/fire/poison 变体同砸击。skill-handlers:4727+。

- **寻宝直觉 (chestIntuition, passiveSkill)** ✅ 一致
  - 阈值降为 60/120/220/350/500（×等级系数）。BattleScene:4417-4419。

- **贪婪 (chestGreed, passiveSkill)** ✅ 一致（数据声明）
  - 每件装备 +4%ATK +7%maxHp（装备时累加，handler no-op）。skill-handlers:5540。

---

## 星际龟 (space)

- **星能 (passive starEnergy, chargeRate62/maxCharge40/passiveFire30/burst100)** ✅ 一致
  - 伤害62%转星能、上限40%maxHp；每次施技后对目标追加 储存星能×30% 真伤（fireStarPassive）；流星暴击满能消耗全部对全敌 100% 真伤。skill-handlers:4079-4212、4319-4340 各技能内联充能/释放，读字段值与 desc 一致。

- **星光射线 (starBeam, hits3/atkScale0.4/currentHpPct6)** ⚠️ DESC-GAP
  - desc: 三段共 120%×ATK + 18%目标当前生命值魔法。
  - code: 每段 0.4×ATK + 6%×**当前HP**（逐段递减，非固定18%）。skill-handlers:4089。三段名义 18% 但因当前HP随段衰减实际略低于 18%。**DESC-GAP 低**。

- **虫洞 (starWormhole, pierceBonus20/duration4/magicPen10)** ✅ 一致
  - 标记4回合，期间受真实伤害 +20%；本体永久 +10%×ATK 魔法穿透。skill-handlers:4401-4424（wormhole buff 的 pierceBonusPct 在真伤段加成，starMeteor burst:4193 验证）。

- **流星暴击 (starMeteor, atkScale1/aoe/mrDown20-3t)** ✅ 一致
  - 全敌 100%×ATK 魔法 + 魔抗-20%×3回合；满能消耗全部 100% 真伤 AOE（burstPct=100）。skill-handlers:4144-4211。

- **黑洞 (starBlackhole, atkScale1/lastTarget1.8/exec15)** ✅ 一致
  - 踢入1回合（眩晕 + _isInBlackhole 不可选 + 被动仍触发），100%×ATK 魔法；仅剩1敌→180%×ATK 魔法直伤，<15%HP→斩杀。skill-handlers:4222-4342。

- **扭曲空间 (starGravityWarp, atkScale0.8/aoe)** ✅ 一致
  - 全敌 80%×ATK 魔法；满能换位 F0↔B2/F1↔B1/F2↔B0 并重判前后排（emit star-gravity-warp 让场景重排）。skill-handlers:4346-4396。

---

## 缩头乌龟 (hiding)

- **喊龟 (passive summonAlly, hpPct40/maxRarityA)** ✅ 一致
  - 开局召唤 C/B/A 随从，HP=本体maxHp×40%，独立CD/AI、每回合末出手；躲本体身后免单体选中。BattleScene:5798-5847（槽位满有保护）。本体亡随从亡（4047-4049）。

- **攻击 (physical, atkScale1/selfDefUpPct{20,2t})** ⚠️ BEHAVIOR/BUG
  - desc: 造成 100%×ATK 物理，并使自身护甲 +20%（{D:DEF*0.2}）持续两回合。
  - code: 走通用 `physical` handler（skill-handlers:547-593），**完全不读 `selfDefUpPct`**——只有 `atkDown` 分支，无任何自身护甲增益逻辑。`selfDefUpPct` 仅在 TeamSelectScene:272 用于生成文本预览，战斗中从未生效。**BEHAVIOR/BUG 中**。

- **防御 (hidingDefend, shieldHpPct20/dur4/heal20)** ✅ 一致
  - 20%maxHp护盾持续4回合，到期把剩余护盾的20%转生命。skill-handlers:3789-3804 + BattleScene:4879-4889 到期回收。

- **指挥 (hidingCommand)** ✅ 一致
  - 命令随从额外出手1次（emit hiding-command），随从亡则无效。skill-handlers:5341-5352。

- **强化随从 (hidingBuffSummon, 2t)** ⚠️ EDGE 低
  - desc: 随从 ATK/护甲/魔抗 +10%、生命偷取 +10%、暴击 +20%，持续2回合。
  - code: 四项 buff(2t) 正确，但暴击同时 `summon.crit += 0.20`（永久直改，skill-handlers:5330）**外加**一个 critUp buff(2t)。buff 到期后永久那份 +20% 不回退，存在重复/不回退隐患（随从命短，影响小）。**EDGE 低**。

- **强化喊龟 (hidingEnhancedSummon, passiveSkill)** ⚠️ DESC-GAP 低
  - desc: 本体登场 -50% maxHp（当前同步），随从改 110% 常规最大生命值（原40%→110%）。
  - code: 本体 -50% maxHp（BattleScene:1301-1304），passive.hpPct 改 110。但召唤 HP = 本体（已减半的）maxHp×110% = 原始的约55%。"110%常规最大生命值"措辞易被理解为更高，实际因本体先掉血而仅约55%原值。**DESC-GAP 低**。

---

## 无头龟 (headless)

- **亡灵 (passive undeadRage, lifesteal22/atkPerLost1/max100)** ✅ 一致
  - 登场 +22% 生命偷取（BattleScene:4847-4850）；每损1%HP +1%ATK 上限+100%（applyUndeadRageAtk:4856-4863，每回合重算）；首次濒死锁1HP×2回合（4263-4269 + damage.ts:182 undeadLockTurns）。

- **撕咬 (physical, hits2/atkScale0.65/hpPct4)** ✅ 一致
  - 两段共 130%×ATK + 4%×2=8% 目标最大HP 物理。physical handler。

- **恐吓 (twoHeadFear, atkScale0.9/fear20/3t)** ✅ 一致
  - 90%×ATK 物理 + 恐惧（对无头龟伤害-20%，真伤除外）3回合。skill-handlers:5677-5697。

- **灵魂收割 (soulReap, atkScale1.1/lostHpPct10/aoe)** ⚠️ BEHAVIOR/NUMERIC
  - desc: 全敌 110%×ATK + **10%目标已损生命值** 物理。
  - code: `lostHp = caster.maxHp - caster.hp`，baseDmg = 1.1×ATK + **本体(caster)已损HP**×10%，且该 base 对所有敌人统一计算。skill-handlers:5234-5259。即实际加成基于**施法者已损HP**而非各目标已损HP。**BEHAVIOR/NUMERIC 中-高**（与描述指向相反；血量满时无加成，残血时全场加成相同）。

- **亡灵风暴 (headlessStorm, hits3/atkScale0.5/tempLifesteal22)** ✅ 一致
  - 本次 +22% 生命偷取，全敌3段共 150%×ATK 物理。skill-handlers:3809-3845。
  - 注: 该技能不吃暴击/不减护甲（刻意 1:1 JS），desc 未提。**DESC-GAP 低**。

- **灵魂打击 (headlessSoulStrike, atkScale0.9/targetCurrentHpPct20, dmgType magic)** ✅ 一致
  - 90%×ATK + 20%目标当前生命值 魔法。skill-handlers:5215-5229。

---

## 龟壳 (shell)

- **气场觉醒 (passive auraAwaken)** ✅ 一致
  - 第4回合 ATK/护甲/魔抗/maxHp/生命偷取/反伤 各+12%、暴击+25%（BattleScene:4998-5027 doAwaken）；储能=受伤累积(读 hpLoss)上限50%maxHp（passive-triggers:196-200）；每4回合释放：全敌 储能×(40%+每级1%) 物理 + 储能×(80%+每级1%) 气场护盾(两回合衰减)（BattleScene:7287-7325，dmgPct=0.4+(lv-1)×0.01、shieldPct=0.8+(lv-1)×0.01）。

- **攻击 (shellStrike, hits2/totalScale1.2/splash25/isolated1.5)** ✅ 一致
  - 两段各0.6×ATK（第1物理、第2真实），共120%×ATK；每段对相邻溅射25%（类型跟随、独立暴击）；无相邻时该段×1.5。skill-handlers:2203-2282。

- **复制 (shellCopy)** ✅ 一致
  - 随机复制敌方2个可用技能、60%效果释放（黑名单排除部分技能；按 AOE/SELF/ALLY/单体 选目标）。skill-handlers:2064-2138。黑名单为合理实现细节，desc 未提（UNDOCUMENTED 低）。

- **吸收 (shellAbsorb, stealHpPct10)** ✅ 一致
  - 偷目标 10% maxHp：目标 maxHp 与当前HP同步降、本体同步增。skill-handlers:2178-2194。

- **侵蚀 (shellErode, mainScale0.25/behindScale0.10)** ✅ 一致
  - 弯波数 = 3 + floor(暴击%/20)（实时含增益），每道主目标25%×ATK + 同列另一目标10%×ATK 魔法，每段触发被动。skill-handlers:2141-2170。

- **强化觉醒 (shellEnhanceAwaken, passiveSkill)** ✅ 一致
  - 第8回合再次触发同款觉醒（需装备该 passiveSkill）。BattleScene:5029-5031。

---

### 小结（按严重度）

1. **无头龟·灵魂收割 (BEHAVIOR/NUMERIC, 中-高)** — desc 写"10%目标已损生命值"，代码用的是**施法者(本体)已损HP**且对全场敌人统一加成（skill-handlers:5241）。语义与描述相反，是本批最实质的偏差。
2. **赛博龟·强化浮游炮 (EDGE/BUG, 中)** — "机甲额外 +3×炮数 护甲/魔抗" 未实装；机甲 def/mr 硬写为 0（BattleScene:4204）。
3. **缩头乌龟·攻击 (BEHAVIOR/BUG, 中)** — `selfDefUpPct`（自身护甲+20%×2回合）在战斗中完全不生效，通用 physical handler 不读该字段；仅文本预览用到。
4. **缩头乌龟·强化随从 (EDGE, 低)** — 暴击 +20% 既加永久 `summon.crit` 又加 2 回合 buff，到期不回退永久那份。
5. **DESC-GAP（低）** — 星际龟星光射线"18%当前HP"实为 6%/段递减；缩头·强化喊龟"110%常规最大生命值"因本体先掉50%实约原值55%；多个无暴击/无护甲/首回合不射等行为描述未提。

其余 40+ 项（赛博能量大炮/部署/联防、全部水晶技能与被动、全部宝箱机制与装备池、全部星际技能、龟壳全套与气场觉醒/储能）经逐行核对**数值与行为均与当前 pets.ts 描述一致**。
