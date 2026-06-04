# 装备审计 — 描述 vs 代码 (audit-E-equipment)

日期: 2026-05-27 · 范围: `src/data/equipment.ts` 全 46 件
追踪文件: `equipment.ts` / `equipment-runtime.ts` / `passive-triggers.ts` / `damage.ts` / `skill-handlers.ts` / `BattleScene.ts`

图例: ✅ 一致 · ⚠️ NUMERIC/BEHAVIOR/EDGE/UNDOCUMENTED/DESC-GAP · 严重度 高/中/低

---

## Stat boost (6)

### 海藻短刃 (e_blade)
- ✅ 一致 — +20 ATK (`equipment.ts:48`)。流血层数 = `atk*0.15*2/4 = 0.075×ATK` (`passive-triggers.ts:428`)，与描述 "(0.075×ATK) 流血层数" 完全吻合。

### 珊瑚硬壳 (e_carapace)
- ✅ 一致 — +60 maxHp。每次受击 +1 甲/抗，cap 随件数 ×20 (`equipment-runtime.ts:41-60`)；满层 +40 护盾/件。描述 "每层+1护甲+1魔抗,至多+20,满层40护盾" 吻合。

### 生命珍珠 (e_pearl)
- ✅ 一致 — +20 maxHp/+4 甲/+4 魔抗。HP<50% 触发: 回 20% maxHp + 销毁 (`equipment-runtime.ts:62-73`)；火球 8% 目标 maxHp 魔法 + 30 灼烧 (`BattleScene.ts:7918-7932`)。全部吻合。

### 锋利鲨齿 (e_tooth)
- ✅ 一致 — +8 ATK/+5 穿甲/+25% 暴击 (`equipment.ts:71-74`)。纯属性，无 hook。

### 重击锤 (e_hammer)
- ✅ 一致 — +100 maxHp，ATK 加成 = `maxHp*0.04*件数` 每回合开始重算 (`equipment-runtime.ts:120-126`)。描述 "4% maxHp 攻击力" 吻合。

### 双穿珊瑚刺 (e_piercer)
- ✅ 一致 — +8 ATK/+6 穿甲/+6 法穿 (`equipment.ts:87-89`)。纯属性。

---

## Special effect (12)

### 生命偷取海星 (e_star)
- ✅ 一致 — +12% 生命偷取经专属 onHit 实现 (`equipment-runtime.ts:75-88`，读 `_lifestealPct`)；溢出 ×50% 转护盾 (apply 设 `_equipStarOverflow=50`，`applyHeal` 内消费 `equipment.ts:27-33`)。
- 说明 (非bug): e_star 走自身 onHit 而非通用吸血路径 (通用读 camelCase `lifestealPct`，e_star 只置 `_lifestealPct`)，两路径不会同时命中 → 无双吸。

### 荆棘海胆 (e_urchin)
- ✅ 一致 — +50 maxHp/+10% 反伤 (`passive-triggers.ts:471-483`，反伤经攻击者护甲减免后扣)。

### 灼热火珊瑚 (e_fire)
- ✅ 一致 — +50 maxHp；施法对每个受伤敌人 per-cast 施 20 灼烧 (`passive-triggers.ts:433-444`，`_equipFireStackedThisCast` 防同次重复)。吻合 "施法结束时…每个敌人 20 层"。

### 冰封水母 (e_jelly)
- ✅ 一致 — +20 maxHp/+5 甲；命中 25% 概率眩晕 1 回合 (`passive-triggers.ts:446-457`)。

### 治愈海葵 (e_anemone)
- ⚠️ DESC-GAP — desc 说 "每回合开始回复 8% 最大生命值"。code 回血量 = `maxHp*8%` 但走裸 `f.hp +=` 而非 `applyHeal` (`BattleScene.ts:4908-4918`)，**不吃治疗削减/治疗强度**。数值一致，仅治疗修饰不参与。严重度 低 (desc 未声称受治疗强度影响)。

### 幽灵墨鱼 (e_ghost)
- ✅ 一致 — +20 maxHp/+15% 闪避 buff；每次闪避成功 +20×件数 永久护盾 (`skill-handlers.ts:304-313`，触发点为闪避而非随机受击)。

### 暗袭章鱼爪 (e_octo)
- ✅ 一致 — +15 ATK；对后排敌人 base ×(1+20%) (`damage.ts:43-46`)，主伤害路径 `dealPhysical/dealMagic` 经 `calcDamage` 消费 (`skill-handlers.ts:336,393`)。吻合。

### 复活海螺 (e_conch)
- ⚠️ DESC-GAP / NUMERIC — desc 称小虫 "等级每级 +5% 属性"。code 死亡变身硬设 150HP/20ATK/0甲抗 (`equipment-runtime.ts:131-146`)，**未做任何等级 ×5% 缩放**。小虫每回合 side-end 攻击最低 HP 敌 1×ATK (`BattleScene.ts:6837-6847`) — 这点吻合。等级缩放缺失。严重度 中。

### 潮汐涟漪 (e_ripple)
- ✅ 一致 — +100 maxHp/+30% 护盾治疗强度；每回合开始全队回 "已损 HP×3%" (`BattleScene.ts:5256-5276`，遍历全友军)。吻合。

### 龙蛋 (e_dragon_egg)
- ✅ 基本一致 — +8 ATK/+5 法穿；每回合 +1 吐息，满 3 召唤喷火龙 (`BattleScene.ts:5279-5288`)，装上即触发一次 (`equipment.ts:160-165`)。火龙接触友/敌效果见 triggerDragonFly。注: 触发时机为持有者**回合开始** (`processComplexEquipEffects` @ `BattleScene.ts:2076`)，与 desc "每回合开始" 吻合。

### 迷你水晶球 A (e_mini_crystal)
- ⚠️ BEHAVIOR — desc 说 "回合**末**…沿同一列穿过造成两段"。code 在**回合开始** (`processComplexEquipEffects` @ 2076) 触发，且只随机选 **1 个目标** 打两段 (`BattleScene.ts:5291-5303`，源码注释 "简化: 1 个目标")，**未沿列穿过**。时机 (开始 vs 末) + 列穿透均不符。引爆 3 层 14% maxHp 一致。严重度 中。

### 迷你水晶球 B (e_mini_crystal_b)
- ✅ 基本一致 — 回合末旋转激光扫全敌各 20 魔法 + 1 层；3 层引爆 14% maxHp (`BattleScene.ts:7041-7077`)。此件走 side-end 路径，时机吻合 desc "回合末"。
  - 注: A/B 描述措辞几乎相同但 A 走 turn-begin 单体、B 走 side-end 全体，实现路径不对称 (见 A 的 BEHAVIOR)。

### 雷鸣贝壳 (e_thunder_shell)
- ✅ 一致 — +15 ATK；自回合末电击 1 随机敌 1×ATK 真伤 (`BattleScene.ts:6749-6776`)。吻合。

---

## v0.6 / 沙漏类 (12)

### 沙漏 (e_hourglass)
- ✅ 一致 — apply 时所有技能基础 cd -1 (最低 0)，存原值供卸下还原 (`equipment.ts:191-199`)。无 per-turn 重复扣。吻合。

### 哑铃 (e_dumbbell)
- ✅ 一致 — +100 maxHp/+3 甲/+3 魔抗；回合末 +25 maxHp + 投掷 5% 当前 maxHp 物理 (`BattleScene.ts:6936-6955`)。吻合。

### 数字电路 FPGA (e_fpga)
- ✅ 一致 — +50 maxHp；4 态随机 (00 回5%+永久2甲抗 / 01 永久+5ATK+4%吸血 / 10 本回合+15%增伤 / 11 本回合-25%受伤) (`BattleScene.ts:5205-5246`)。11 态用 `physImmune` buff (`-25%` 不抵真伤，desc 已注明)。吻合。

### 模拟信号放大器 (e_amplifier)
- ✅ 一致 — +50 maxHp；每回合开始 16~24% 临时增伤 (`BattleScene.ts:5249-5254`，`16+rand(0..8)`)。吻合。

### 蜡烛 (e_candle)
- ⚠️ EDGE (轻微/无害) — 三阶段循环正确实装于 side-end，用 `_equipCandleStage` (`BattleScene.ts:6887-6932`)，微弱回 self20/邻10、燃烧整排 30 魔法+20 灼烧，均吻合。**但** `equipment-runtime.ts:109-113` 另设了一个 `_candlePhase %4` 的 onTurnBegin，该字段全代码无任何消费方 → 死代码 (无副作用)。严重度 低。
- ⚠️ DESC-GAP — desc "燃烧阶段随机选1名敌人,对其所在横排各单位" → code 取该敌 `_slotKey` 行的同排敌人 (`6915-6918`)，吻合；但若无 slotKey 退化为单体。低。

### 左轮手枪 (e_revolver)
- ✅ 一致 — +10 ATK/+5 穿甲；装备 6 弹，敌死 +1 (上限 6/件，`BattleScene.ts:7942-7952`)，回合末射 1 发 40 物理，0 弹停射不销毁 (`BattleScene.ts:6977-6993`)。吻合。

### 激光长刃 (e_laser_blade)
- ⚠️ EDGE/BEHAVIOR — **效果未实装 (高优先)**。apply 给持有者添加 `type:'laserSweep'` 技能 (`equipment.ts:245-249`)，但 `SKILL_HANDLERS` **无 laserSweep handler** (`skill-handlers.ts`，全文件 0 处)，派发时 fallback 到 `SKILL_HANDLERS.physical` (`skill-handlers.ts:2130,6131`)。
  - desc: 选敌方一列各 0.7×ATK，单目标 1.4×ATK，回血 80% 造伤。
  - code: 该技能一旦被释放 → 走通用单体物理 (`atkScale ?? 1.0` = 1×ATK 单体)，**无列 AOE、无 0.7/1.4 倍率、无 80% 回血**。`equipment-runtime.ts:184` 注释自承 "laserSweep handler 待注册 → 死代码"。
  - 严重度 高 (描述的核心机制完全缺失；+15 ATK 仍生效)。

### 玩偶小熊 (e_doll)
- ✅ 一致 — +5 ATK/+30 maxHp；回合末小熊走向敌 (前排优先) 30 物理 + 1 层大熊；满 5 层有空位则召唤 250HP/50ATK 大熊并销毁装备，无空位继续攒层 (`BattleScene.ts:7079-7112`)。吻合。

### 飞镖 (e_dart)
- ✅ 一致 — +15 ATK；回合末对所有带"靶子" (`_knockedUpThisTurn`) 敌各 50 物理 + 20 流血，命中移除靶子 (`BattleScene.ts:6957-6975`)。吻合。

### 海浪 (e_wave)
- ✅ 一致 — +50 maxHp/+10% 护盾治疗强度 (复用 `_equipRippleHealAmp` 与潮汐叠加)；回合末 +1 层，满 3 横扫一横排: 友 +20盾+2甲抗永久 / 敌 20魔法-2甲抗 (`BattleScene.ts:6998-7036`)。吻合。

---

## 消耗品 (consumable)

### 治疗药水 (c_heal)
- ✅ 一致 — 回 `50 + 10% maxHp`，走 `applyHeal` (`equipment.ts:281-284`)。注: 顶部 `applyHeal` 已为真实现 (非 noop stub)，回血生效 (`equipment.ts:12-35`)。

### 加速药水 (c_speed)
- ✅ 一致 — 所有技能 cdLeft -1 (最低 0) (`equipment.ts:288-293`)。

### 炸弹 (c_bomb)
- ✅ 一致 — 60 物理经目标护甲减免，护盾先吸再扣 HP，不触发吸血/on-hit (`equipment.ts:297-314`，inline 实现绕过 noop `applyRawDmg` stub)。注: 源码注释记录了曾经 stub→0 伤的 bug，现已修。

### 怒火药水 (c_rage)
- ✅ 一致 — atkUp buff = `baseAtk×25%` flat，持续 3 回合 (`equipment.ts:320-322`)。

### 应急护盾 (c_emergency)
- ✅ 一致 — +80 护盾 (`equipment.ts:328-330`)。

### 急救包 (c_firstaid)
- ✅ 一致 — 回 15% maxHp，走 `applyHeal` (`equipment.ts:334-337`)。

### 净化 (c_cleanse)
- ⚠️ DESC-GAP — desc 列负面含 "冰寒"，code debuff 集合用 `chilled`，并含 `dot/burn/poison/bleed/atkDown/defDown/mrDown/healReduce/markedDmg/bubbleBind` (`equipment.ts:343`)。desc 提到 "诅咒 DoT" → 由 `dot` 覆盖。基本对齐；若存在其它未列入集合的负面 type (如 `stun/fear/curse` 独立 type) 则不被清除。严重度 低 (需核对实际 buff type 命名是否齐全)。

### 必中标记 (c_mark)
- ✅ 一致 — markedDmg +20%，持续 2 回合 (`equipment.ts:351`)。消费见伤害放大链。

---

## special / 特殊物品

### 训龟大师的口哨 (e_master_whistle)
- ➖ apply no-op (设计如此，只能"吹响")。7 种能力逻辑不在 `apply`，需另行核对 BattleScene 召唤路径 (超出本次 apply-vs-desc 范围；已知 `_untargetable` 免伤模式见 memory)。

### 糖果罐 (c_candy_jar)
- ➖ apply no-op (设计如此，走"打碎"按钮路径 breakCandyJar)。奖励表逻辑不在本文件。

---

## PoC 新增装备 (孵化器/电棍/竹叶/小龟帽/小龟剑/小龟壳) — 经认可的用户新增，正常审计

### 孵化器 (e_incubator) [PoC]
- ✅ 一致 — +20 maxHp；进度来源 回合+5 (`BattleScene.ts:4919-4923`) / 敌死+10·我死+15 (`7954-7959`) / 造伤·承伤 ×0.1 (`passive-triggers.ts:416-422`)；满 100 → 临时等级 +1 (上限 +3，每级 +5% 基础属性)。各数值吻合 desc。

### 电棍 (e_stun_baton) [PoC]
- ✅ 一致 — +20 maxHp/+5 甲/+5 魔抗，3 层；施法后单体技电击 target、非单体随机敌，30 魔法 (经魔抗) + 眩晕 1 回合，消耗 1 层，0 层不消失 (`BattleScene.ts:2890-2913`)。注: 自施法/治疗技不会误伤友方 (`tgtEnemy` 守卫 `2888`)。

### 竹叶 (e_bamboo_leaf) [PoC]
- ✅ 一致 — +50 maxHp，1 充能；施法后随机敌 `35+20%maxHp` 魔法 + 回 20% maxHp + 永久 +100 maxHp，用完不销毁 (`BattleScene.ts:2917-2948`)。

### 小龟帽 (e_turtle_helmet) [PoC]
- ✅ 一致 — +70 maxHp；每回合 +25 HP，走 `applyHeal` 受治疗削减/治疗强度影响 (`BattleScene.ts:4932-4940`)，与 desc 灰字吻合。

### 小龟剑 (e_turtle_sword) [PoC]
- ✅ 一致 — +10 ATK；施法后劈砍 30 物理 + 回 50% 实际伤害；群体技优先前排，自施法不砍友方 (`BattleScene.ts:2950-2976`)。

### 小龟壳 (e_turtle_shell) [PoC]
- ✅ 一致 — +5 甲/+5 魔抗；每次受非真伤 -2 (最低保 1 伤)，真伤不挡 (`damage.ts:132-139`)。

---

## 雷电法杖 (e_lightning_staff)
- ✅ 一致 — +8 法穿；每段单体伤害 +25 闪电值、AOE +12.5 (`BattleScene.ts:2800-2811`)，满 100 发射连锁: 20 魔法跳最多 4 个不同目标、保留溢出 (`-=100`)、多件独立充能 (数组) (`fireLightningChain 2813-2843`)。全部吻合 desc。

---

## 小结 — 最高优先问题

| 装备 | 类型 | 问题 | 严重度 |
|------|------|------|--------|
| **激光长刃 e_laser_blade** | EDGE/BEHAVIOR | "横扫"技能 type `laserSweep` 无 handler → fallback 通用单体物理。**描述的列 AOE / 0.7-1.4×ATK / 80%回血 全部未实装** (源码自承死代码)。+15 ATK 仍生效。 | **高** |
| 迷你水晶球 A e_mini_crystal | BEHAVIOR | 触发在**回合开始**而非 desc 的"回合末"；只打 **1 随机目标** 而非"沿同一列穿过"。引爆机制正常。 | 中 |
| 复活海螺 e_conch | NUMERIC/DESC-GAP | 小虫硬设 150HP/20ATK，**未实装 desc 的"等级每级 +5% 属性"** 缩放。 | 中 |
| 治愈海葵 e_anemone | DESC-GAP | 8% maxHp 回血走裸 `hp+=`，不吃治疗削减/治疗强度 (数值正确)。 | 低 |
| 净化 c_cleanse | DESC-GAP | debuff type 集合可能未覆盖 desc 列举的全部负面 (取决于实际 buff type 命名)。 | 低 |
| 蜡烛 e_candle | EDGE | `equipment-runtime.ts:112` 的 `_candlePhase` 为死字段 (无消费方)，真实逻辑用 `_equipCandleStage`，无害。 | 低 |

**"flag 置位但永不消费" (效果静默失效) 类**: 仅 **e_laser_blade** 命中此模式 — `laserSweep` 技能 push 进 skills 数组但无 handler，是本批唯一"核心机制完全不生效"的装备。`_candlePhase` 也属未消费但本就是冗余无副作用。其余 45 件的 apply 标志均能追到正确消费方。
