# Batch 5 装备审计 — desc vs impl (audit-batch5-equipment)

日期: 2026-05-28 · 范围: `src/data/equipment.ts` 全 46 件 (37 e_ + 9 c_)
追踪文件: `equipment.ts` / `equipment-runtime.ts` / `passive-triggers.ts` / `damage.ts` / `skill-handlers.ts` / `BattleScene.ts` / `stats-recalc.ts`
基线: `qa-2026-05-27/audit-E-equipment.md` (已对照, 不重复已修项)

图例: ✅ works · ⚠️ needs-decision · 🔴 dead-or-broken

> **基线回归核查 (全部确认已修, 无回归)**
> - **H1 e_laser_blade laserSweep** — 之前无 handler 走 fallback 单体物理。现 `skill-handlers.ts:602` 已注册完整 laserSweep handler (整排 0.7×ATK / 单体 1.4×ATK / 80% 回血)。✅ 已修。
> - **e_mini_crystal A** — 之前回合开始 + 单目标。现移到 `BattleScene.ts:7222` 回合末 + 沿同列 2 段。✅ 已修。
> - **e_conch 等级缩放** — 之前硬设 150/20。现 `BattleScene.ts:4218-4222` + `equipment-runtime.ts:133-136` 用 `1+0.05*(lv-1)`。✅ 已修。
> - **e_anemone HoT** — 之前裸 `hp+=`。现 `BattleScene.ts:5098` 走 `applyHeal`。✅ 已修。
> - **H5 焦糖铠 / H6 糖果锤 / 海浪措辞** — 海浪现按横排横扫 (`BattleScene.ts:7138`)，措辞吻合。✅。

---

## 全 46 件总表

| id | 名称 | desc 主张 (摘) | impl 现实 | 判定 |
|----|------|--------------|----------|------|
| e_blade | 海藻短刃 | +20 ATK; 命中施 0.075×ATK 流血 | `_equipBladeBleed=2` → passive-triggers:427 算 atk×0.15×2/4 | ✅ |
| e_carapace | 珊瑚硬壳 | +60HP; 受击+1甲/抗 cap20; 满层+40盾 | equipment-runtime:41-60, cap ×20/件, 满层40盾/件 | ✅ |
| e_pearl | 生命珍珠 | +20HP/+4甲/+4抗; <50%回20%+火球8%+30灼 | equipment-runtime:62-73 + BattleScene 火球 | ✅ |
| e_tooth | 锋利鲨齿 | +8ATK/+5穿甲/+25%暴击 | 纯属性 (equipment.ts:71-74) | ✅ |
| e_hammer | 重击锤 | +100HP; ATK=4%maxHp×件数 | equipment-runtime:117-122 onTurnBegin | ✅ |
| e_piercer | 双穿珊瑚刺 | +8ATK/+6穿甲/+6法穿 | 纯属性 | ✅ |
| e_star | 生命偷取海星 | +12%吸血; 溢出治疗×50%转盾 | equipment-runtime:75-88 onHit + applyHeal 溢出 (equipment.ts:27-33) | ✅ |
| e_urchin | 荆棘海胆 | +50HP/+10%反伤 | passive-triggers:471-482 | ✅ |
| e_fire | 灼热火珊瑚 | +50HP; 施法每受伤敌+20灼 | passive-triggers:434-443 (`_equipFireStackedThisCast` 防重) | ✅ |
| **e_jelly** | **冰封水母** | **+20HP/+5甲; 命中25%眩晕1回合** | **passive-triggers:449 stun `duration:1` → 下回合 tick 即过期, 眩晕不生效** | **🔴** |
| e_anemone | 治愈海葵 | +5甲/+10抗; 每回合回8%maxHp | BattleScene:5095-5099 走 applyHeal (已修) | ✅ |
| e_ghost | 幽灵墨鱼 | +20HP/+15%闪避; 闪避→+20永久盾 | skill-handlers:288-313 rollDodge | ✅ |
| e_octo | 暗袭章鱼爪 | +15ATK; 后排敌+20%伤害 | damage.ts:43-46 base×1.2 | ✅ |
| e_conch | 复活海螺 | +100HP; 死变小虫150/20 等级×5% | equipment-runtime:127-148 + BattleScene:4218 (等级缩放已修) | ✅ |
| e_ripple | 潮汐涟漪 | +100HP/+30%盾治强; 每回合全队回已损3% | BattleScene:5421-5439 | ✅ |
| e_dragon_egg | 龙蛋 | +8ATK/+5法穿; 3层喷火龙; 装上即触发 | BattleScene:5444-5452 + apply setTimeout | ✅ |
| e_mini_crystal | 迷你水晶球A | +7ATK/+20HP/+5法穿; 回合末沿列2段30魔+引爆 | BattleScene:7222-7262 (回合末/沿列/2段, 已修) | ✅ |
| e_mini_crystal_b | 迷你水晶球B | +7ATK/+3法穿/+20HP; 回合末扫全敌20魔+引爆 | BattleScene:7184-7220 | ✅ |
| e_thunder_shell | 雷鸣贝壳 | +15ATK; 自回合末电1敌1×ATK真伤 | BattleScene:6893-6910 (按件数循环) | ✅ |
| e_hourglass | 沙漏 | 所有技能基础cd永久-1 (最低0) | equipment.ts:191-199 apply 时一次性 -1, 存原值 | ✅ |
| e_dumbbell | 哑铃 | +100HP/+3甲/+3抗; 回合末+25HP+投掷5%maxHp物理 | BattleScene:7079-7098 | ✅ |
| **e_fpga** | **数字电路FPGA** | **+50HP; 状态11 当回合受到所有伤害-25% (除真伤)** | **state 11 用 `physImmune` buff → damage.ts:153 仅减 physical, 魔法不减** | **⚠️** |
| e_amplifier | 信号放大器 | +50HP; 每回合16~24%临时增伤 | BattleScene:5414-5418 | ✅ |
| e_candle | 蜡烛 | +10ATK/+50HP; 三阶段循环 | BattleScene:7030-7066 (`_equipCandleStage`) | ✅ |
| e_revolver | 左轮手枪 | +10ATK/+5穿甲; 6弹敌死+1; 回合末射40物理 | BattleScene:7121-7136 + 8136 补弹 | ✅* |
| e_laser_blade | 激光长刃 | +15ATK; 横扫一列0.7×ATK/单体1.4×; 回80%血 | skill-handlers:602-627 (handler 已注册, 已修) | ✅ |
| e_doll | 玩偶小熊 | +5ATK/+30HP; 回合末小熊30物理+满5召唤大熊 | BattleScene:7264-7289 | ✅ |
| e_dart | 飞镖 | +15ATK; 回合末对带"靶子"敌各50物理+20流血 | BattleScene:7101-7117 (`_knockedUpThisTurn`) | ✅ |
| e_wave | 海浪 | +50HP/+10%盾治强; 3层横扫横排 友盾敌伤 | BattleScene:7138-7178 | ✅ |
| c_heal | 治疗药水 | 回 50+10%maxHp (走治疗) | equipment.ts:281-284 走真 applyHeal | ✅ |
| c_speed | 加速药水 | 所有技能 cdLeft -1 | equipment.ts:288-293 | ✅ |
| c_bomb | 炸弹 | 60物理 经护甲 不触发吸血/on-hit | equipment.ts:297-314 inline (绕 noop stub) | ✅ |
| c_rage | 怒火药水 | ATK+25% buff 3回合 | equipment.ts:320-322 atkUp flat, duration:3 | ✅ |
| c_emergency | 应急护盾 | +80护盾 | equipment.ts:328-330 | ✅ |
| c_firstaid | 急救包 | 回15%maxHp (走治疗) | equipment.ts:334-337 走 applyHeal | ✅ |
| **c_cleanse** | **净化** | **清除全部负面, 列出含"诅咒DoT"** | **debuff 集合无 `curse`/`fear`/`stun` → 诅咒不被清 (desc 明列)** | **⚠️** |
| c_mark | 必中标记 | markedDmg+20% 2回合 | equipment.ts:351 duration:2 | ✅ |
| e_master_whistle | 训龟大师口哨 | 特殊物品, apply no-op | 设计如此, 7能力在 BattleScene 召唤路径 | ➖ |
| c_candy_jar | 糖果罐 | 特殊, apply no-op, 走"打碎" | 设计如此 (breakCandyJar) | ➖ |
| e_incubator [PoC] | 孵化器 | +20HP; 满100进度+1临时等级(上限3) | BattleScene:5101-5104 turn+5 / 死+10/+15 / 伤×0.1; passive-triggers:416-420 | ✅ |
| e_stun_baton [PoC] | 电棍 | +20HP/+5甲/+5抗; 施法后电击30魔+眩晕1回合 | BattleScene:2974-2995, stun `duration:2` (正确), tgtEnemy 守卫 | ✅ |
| e_bamboo_leaf [PoC] | 竹叶 | +50HP; 施法后35+20%maxHp魔+回20%+永久+100 | BattleScene:3001-3030 | ✅* |
| e_turtle_helmet [PoC] | 小龟帽 | +70HP; 每回合复苏25HP (受治疗修饰) | BattleScene:5117-5120 走 applyHeal | ✅ |
| e_turtle_sword [PoC] | 小龟剑 | +10ATK; 施法后劈砍30物理+回50%实际伤害 | BattleScene:3034-3050, 群体技优先前排, 自施法不砍友 | ✅ |
| e_turtle_shell [PoC] | 小龟壳 | +5甲/+5抗; 受非真伤-2 (真伤不挡) | damage.ts:124-131 | ✅ |
| e_lightning_staff | 雷电法杖 | +8法穿; 单体充25/AOE12.5, 满100连锁20魔跳4 | passive-triggers:171-173 → onLightningStaffHit (BattleScene:752/2883) | ✅ |

`*` = 见下方"附注"小瑕疵 (非阻塞)。

---

## 🔴 dead-or-broken 详情

### 🔴 e_jelly 冰封水母 — 25% 眩晕实际不生效 (stun duration 错误)
- **desc** (equipment.ts:112): "携带者攻击命中敌人时, 有 25% 概率使该目标眩晕 **1 回合**。"
- **impl** (`passive-triggers.ts:447-449`):
  ```ts
  if ((aes._equipStun ?? 0) > 0 && target.alive && Math.random() < (aes._equipStun ?? 0) / 100) {
    if (!target.buffs.find(b => b.type === 'stun')) {
      target.buffs.push({ type: 'stun', value: 1, duration: 1 });   // ← duration:1
  ```
- **gap**: 眩晕的判定流程是
  1. 攻击方 on-hit 给目标加 `stun duration:1`。
  2. 目标回合开始 → `processTurnBeginPassives` (`BattleScene.ts:2164`) → `tickBuffsDuration` (`stats-recalc.ts:97-102`) 把所有 buff `duration--` → 此 stun 变 `0` 并被 expired 移除。
  3. 紧接着的眩晕检查 `BattleScene.ts:2183` 找 `b.type==='stun' && b.duration > 0` → 已无 → **目标正常行动, 眩晕从未生效**。
  - 对照全代码所有其它眩晕源 (skill-handlers.ts:2396/3630/4393/4620/6171, 以及同文件电棍 BattleScene:2986) **一律用 `duration:2`** = "眩晕 1 回合"的正确约定 (tick 后剩 1 → 检查命中 → 跳过该回合)。e_jelly 是**唯一**用 `duration:1` 的, 比标准少 1, 导致眩晕在能跳过回合前就过期。
- **推荐修复**: `passive-triggers.ts:449` 改 `duration: 1` → `duration: 2` (与电棍/所有技能眩晕对齐); 顺带补 `_stunUsed=false`(已有)。
- 注: 这是"一类 bug"的潜在 chokepoint — 但其它眩晕源都已是 2, 仅 e_jelly 漏。无需全局收口, 单点改即可。

---

## ⚠️ needs-decision 详情

### ⚠️ e_fpga 状态 11 — "所有伤害 -25%" 实为"仅物理 -25%"
- **desc** (equipment.ts:211): "状态 11: 当回合受到的**所有伤害** -25% (持续 1 回合)。伤害减免不包括真实伤害"。
- **impl** (`BattleScene.ts:5406`): `f.buffs.push({ type: 'physImmune', value: 25, duration: 2 });`
- **consumer** (`damage.ts:152-160`):
  ```ts
  if (dmgType === 'physical') {              // ← 只在 physical 分支
    const physBuff = tgt.buffs.find(b => b.type === 'physImmune');
    if (physBuff) { ... finalDmg ×= (1 - 25/100) ... }
  }
  ```
  `damage.test.ts:59-60` 亦确认 "physImmune … 魔法照常"。
- **gap**: 魔法伤害**不**被 -25%; 只有物理被减。desc 明说"所有伤害"且专门排除真伤 (暗示魔法应被包含)。基线 (audit-E:86) 把它标 ✅ 时只核了"不抵真伤", 漏了"魔法也不减"这一面。
- **推荐修复**: 状态 11 改用同时减物理+魔法 (非真伤) 的 buff。代码里已有现成的 `dmgReduce` buff (`damage.ts:161-167`: `dmgType !== 'true'` 全类型减), 把 `physImmune` 换成 `{ type:'dmgReduce', value:25, duration:2 }` 即符合 desc。(注意 `dmgReduce` 不挡真伤 ✓ 与 desc 一致。)

### ⚠️ c_cleanse 净化 — desc 明列"诅咒DoT"但代码不清 curse
- **desc** (equipment.ts:340): "清除该目标身上所有负面状态 … 负面效果包括: 灼烧/中毒/流血/**诅咒 DoT**/冰寒/攻防魔抗削减/治疗削减/易伤标记/泡泡束缚"。
- **impl** (`equipment.ts:343`):
  ```ts
  const debuffTypes = new Set(['dot','burn','poison','bleed','chilled','atkDown','defDown','mrDown','healReduce','markedDmg','bubbleBind']);
  ```
- **gap**: 游戏里"诅咒"的实际 buff type 是 **`curse`** (`skill-handlers.ts:1478`: `{ type:'curse', value: maxHp*0.05, duration }`), 而集合里只有 `dot` (无 `curse`)。→ **净化清不掉诅咒**, 与 desc 直接矛盾。基线 (audit-E:136) 曾推测"dot 覆盖 curse", 经核实 type 名不同, 不覆盖。
  - 另: 集合也无 `stun` / `fear` (`skill-handlers.ts:5795` 用 `fear`) — 但这两者 desc 未明列, 属"是否该清 CC"的设计决策, 非硬矛盾。
- **推荐修复**: 集合补 `'curse'` (硬对齐 desc)。是否再补 `'stun','fear'` 由设计定 (desc 只承诺 DoT/削减类, 未承诺 CC)。

---

## 附注 — 低优先 / 非阻塞小瑕疵 (不单列 ⚠️)

1. **e_bamboo_leaf 回血走裸 hp+=** (`BattleScene.ts:3017-3019`): "回复 20% maxHp" 用 `caster.hp = min(maxHp, hp+amt)` 而非 `applyHeal`, 不吃治疗削减/强度。desc 未声称受治疗修饰, 数值正确 → 低 (同类 e_anemone 已被改 applyHeal, 此件未跟改, 可选统一)。
2. **e_revolver 多件不叠弹仓** (`equipment.ts:235-236` `_equipRevolver=true` 布尔; `BattleScene.ts:8137` `6*(_equipRevolver??1)` 把 true 当 1): 单件 cap=6 正确; 但 `_equipRevolver` 从不自增, 多件仍 cap 6 而非 6×N。**e_revolver 是 `category:'unique'` 不可叠** → 当前无实际影响, 仅潜在隐患。低。
3. **e_dumbbell 深海跨关重置** (desc: "深海闯关下锻炼累计仅本场有效, 跨关重置归零"): `_equipDumbbellGain` 是显示统计; 实际 maxHp 增益靠每场重建 Fighter (apply 重跑) 归零, 行为应符合 desc — 但未在本批单独跑战斗验证跨关 maxHp 是否真回落 (建议眼验或 Playwright)。低/待验。

---

## Dead flags 清单 (flag → set 位置 → consumer?)

所有 **equipment.ts apply() 置位的 flag** 均能追到消费方 (下表), **无 set-但-永不-consume 的死 flag**:

| flag | set @ equipment.ts | consumer | 状态 |
|------|-------------------|----------|------|
| _equipBladeBleed | :49 | passive-triggers:426 | ✅ |
| _equipCarapaceCap/Gain/ShieldGiven | :55-58 | equipment-runtime:42-58 | ✅ |
| _equipPearl | :66 | equipment-runtime:65 | ✅ |
| _lifestealPct | :96 | equipment-runtime:78 (e_star onHit) | ✅ |
| _equipStarOverflow | :97 | equipment.ts:27 (applyHeal) | ✅ |
| _equipReflect | :103 | passive-triggers:472 | ✅ |
| _equipBurn | :109 | passive-triggers:436 | ✅ |
| _equipStun | :116 | passive-triggers:447 (但 duration bug, 见 🔴) | ⚠️ |
| _equipHot | :123 | BattleScene:5095 | ✅ |
| _equipGhostSquid | :130 | skill-handlers:296 | ✅ |
| _equipBackrowBonus | :136 | damage.ts:44 | ✅ |
| _equipConch | :142 | BattleScene:4196 / equipment-runtime:128 | ✅ |
| _equipRippleHealAmp | :149/272 | equipment.ts:22 (applyHeal) | ✅ |
| _equipRippleAllyHotPct | :150 | BattleScene:5423 | ✅ |
| _equipDragonEgg(Stacks) | :157-158 | BattleScene:5444 | ✅ |
| _equipMiniCrystal | :173 | BattleScene:7225 | ✅ |
| _equipMiniCrystalB | :181 | BattleScene:7185 | ✅ |
| _equipThunderBell | :187 | BattleScene:6895 | ✅ |
| _equipHourglass | :199 | (只标记; cd 已 apply 时改) | ✅ 无需 runtime consumer |
| _equipDumbbell(Gain) | :207-208 | BattleScene:7079 | ✅ |
| _equipFpga | :214 | BattleScene:5370 | ✅ |
| _equipAmplifier | :220 | BattleScene:5414 | ✅ |
| _equipCandle(Stage) | :227-228 | BattleScene:7030 | ✅ |
| _equipRevolver(Bullets) | :235-236 | BattleScene:7121/8136 | ✅ |
| _equipLaserBlade + laserSweep skill | :242-249 | skill-handlers:602 (已注册) | ✅ |
| _equipDoll(BigBearStacks/Spawned) | :257-259 | BattleScene:7265 | ✅ |
| _equipDart | :265 | BattleScene:7101 | ✅ |
| _equipWave(Stacks) | :273-274 | BattleScene:7142 | ✅ |
| _incubatorProgress/TempLevel | :379-380 | BattleScene:5103 / passive-triggers:420 | ✅ |
| _stunBatonStacks | :392 | BattleScene:2974 | ✅ |
| _bambooLeafCharge | :402 | BattleScene:3001 | ✅ |
| _lightningStaffCharges | :415 | passive-triggers:172 → onLightningStaffHit | ✅ |
| _turtleHelmetRecover | :425 | BattleScene:5118 | ✅ |
| _turtleSword | :434 | BattleScene:3034 | ✅ |
| _turtleShellBlock | :445 | damage.ts:127 | ✅ |

**反向孤儿 (consumer 存在但无 equipment 设置者)** — 不是当前装备 desc 的 bug, 仅遗留死消费代码:
- `_equipMultiHit` — 消费 @ `passive-triggers.ts:461` (0.5×ATK bounce), 但**全 equipment.ts 无任何 apply 置位**。历史 "弹射" 装备已移除/未接线 → 该消费分支永不触发 (无害死代码)。
- `_equipRage` / `_equipFlatReduce` — 仅在 BattleScene:4264-4265 的"小虫变身清 flag"里被重置, 无设置者也无真实消费者 (类型声明残留)。无害。
- `_candlePhase` (历史) — 已删 (equipment-runtime:109-111 留注释)。

---

## End summary

- 计数: **✅ 39** · **⚠️ 2** (e_fpga 状态11 / c_cleanse) · **🔴 1** (e_jelly) · ➖ 2 (口哨/糖果罐 设计 no-op, 不计入对错)。
- **set-but-never-consumed 死 flag: 0** (所有 apply flag 均有消费方); 反向孤儿消费代码 3 处 (无害)。
- **最重要发现**: 🔴 **e_jelly 冰封水母的 25% 眩晕实际从不生效** — 用了 `stun duration:1`, 在能跳过目标回合前就被回合开始的 `tickBuffsDuration` 减到 0 移除; 全游戏其它眩晕源一律 `duration:2`。单点改 `passive-triggers.ts:449` 的 1→2 即修复。这是一件"看似完整、数值对、有 consumer, 但因 duration 约定差 1 而整效失效"的隐蔽 bug, 基线未发现。
