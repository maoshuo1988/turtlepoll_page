# 审计 batch2: pirate / candy / bubble / line / lightning (2026-05-28)

描述 = 真理来源。代码 vs `pets.ts` 的 `brief`/`detail` + `{}` 公式逐项核对。
文件简写: `PT`=src/engine/passive-triggers.ts, `SH`=src/engine/skill-handlers.ts, `BS`=src/scenes/BattleScene.ts, `DMG`=src/engine/damage.ts, `ST`=src/systems/skill-text.ts, `pets`=src/data/pets.ts, `eq`=src/data/equipment.ts。

> 基线对照: `qa-2026-05-27/audit-C-...md`。基线 4 个「高」(泡泡盾爆裂 / 糖果锤 selfHpPct / 焦糖铠 healHpPct / 熔岩相关) 中, 本批 3 个 (泡泡盾爆裂、糖果锤、焦糖铠) **均已修复** — 见各龟详情。本批新发现 1 个 🔴 (闪电涌动 +50% 漏作用于每回合自动电击)。

---

## 海盗龟 (pirate) — `pets:1851`

基础: HP 471 / ATK 41 / DEF 15 / MR 13 / CRIT 0.25 / A 级。

| 技能 | 描述声明 | 代码实现 | 判定 |
|---|---|---|---|
| 被动 掠夺 (pirateBarrage) | 开局轰击随机敌 `25%×maxHp` 真伤; 死亡钩锁击杀者 `25%×maxHp` 真伤 | 开局 `maxHp×bombardPct(25)%` 真伤 pierce (BS:1545,1552); 死亡 `maxHp×deathHookPct(25)%` 真伤 pierce (BS:4456-4464) | ✅ (低 edge 见下) |
| 弯刀 (physical 4×0.35) | `{N:0.35*ATK*4}` = 140%ATK 物理 | 通用 physical, atkScale 0.35 × 4 段 (SH:559-564) | ✅ |
| 火炮齐射 (pirateCannonBarrage 6×) | 6 段, 每段 `0.17×ATK + 1.7%目标maxHp`, 共 102%ATK + 10.2%maxHp | hits=6, atkScale 0.17 + hpPct 1.7%×e.maxHp/段, physical (SH:5270,5286-5288) | ✅ |
| 朗姆酒 (heal) | 每回合回 `9%maxHp`×4 回合 (可叠) + 护甲 `+15%×ATK`×3 回合 | hot.pctMaxHp 9 ×(turns 4 +1), defUpAtkPct {15,3} → def += atk×15% (SH:5736-5751) | ✅ |
| 掠夺宝藏 (piratePlunder) | 破盾 50% → `0.8×ATK` 物理 → 偷 20% 甲/抗转自身 3 回合 | shieldBreakPct 50 (含 bubbleShieldVal), atkScale 0.8 物理, 偷 baseDef/baseMr 各 20% 3 回合 (SH:3325-3380) | ✅ |
| 海盗船 (pirateShipPassive) | 第 3 回合召唤, HP `1.5×maxHp` / ATK `=owner.atk` / 无甲抗, 每回合 `0.2×ATK` 物理 | shipHp=maxHp×1.5, atk=owner.atk, def/mr=0, 开炮 atkScale 0.2 (BS:6258-6272); 第 3 回合召唤 (BS:1696-1698) | ✅ |

详情:
- ⚠️ 低 (carry-over edge): 死亡钩锁仅在 `this.currentAttacker && .alive` 时触发 (BS:4459)。被 DoT/灼烧/无明确攻击者击杀则不发动; 描述未提此条件。基线已记, 仍存在。

---

## 糖果龟 (candy) — `pets:1957`

基础: HP 460 / ATK 40 / DEF 15 / MR 16 / CRIT 0.25 / A 级。

| 技能 | 描述声明 | 代码实现 | 判定 |
|---|---|---|---|
| 被动 甜蜜掠夺 (candySteal) | 第 3 回合随机敌偷 `25%maxHp` (留 1) | stealTurn 3, stealPct 25, max+current 同减, `Math.max(1,...)` (BS:5236-5247) | ✅ |
| 糖果锤 (physical 1.1 + selfHpPct 5) | `{N:1.1*ATK}` + `{N:HP*0.05}`(5%自身maxHp) 物理 + 攻 -15% 2 回合 | **已修**: physical handler 现读 selfHpPct, base += `caster.maxHp×selfHpPct/100` (SH:544,563); atkDown {15,2} (SH:576-582) | ✅ (基线"高"已修) |
| 焦糖铠 (shield 0.8 + healHpPct 10) | `{S:0.8*ATK}` 护盾 + 回 `{H:HP*0.1}` 生命 | **已修**: shield handler 现读 healHpPct, `applyHeal(a, maxHp×10%)` (SH:1181,1188,1193-1196) | ✅ (基线"高"已修) |
| 糖衣炮弹 (candyBarrage 4×0.25 + hpPct 4) | 先 `+15%×ATK 穿甲`×3 回合, 再全体 4 段每段 `0.25×ATK + 4%目标maxHp` 物理 | armorPenAtkPct 15 ×3 回合, 4 段全敌 atkScale 0.25 + hpPct 4%×e.maxHp 物理 (SH:3508-3550) | ✅ |
| 糖果罐 (sweetTrap, passiveSkill) | 开局放罐, 点击"打碎"按回合档领奖励 | **未实装**: handler no-op (SH:5798); eq:366-368 apply no-op; BS 仅处理 `actionable==='blow'`(口哨), 无 `'break'` 路径; 回合分档奖励池在 TS 侧不存在 | ⚠️ (carry-over) |
| 糖果炸弹 (candyBombPassive) | 召唤 `40%maxHp` 实体 0 攻防, 每回合 `-20%maxHp`, 死亡引爆 `150%自身maxHp` 总魔法均摊存活敌; 糖果龟阵亡立即引爆 | hpPct 40 / decayPct 20 / explodePct 150 magic 均摊 (BS:6051-6052,6082,6111-6116); 糖果龟死立即引爆 (BS:1419-1422) | ✅ |

详情:
- ⚠️ 低 (carry-over) 糖果罐 (sweetTrap): 整条"打碎领奖励"在 TS 侧无实装。`actionable:'break'` 在 BS 中无对应处理分支 (仅 `'blow'` 在 BS:1019)。pets:2035 与 eq:367 的回合分档描述大体一致, 但因无代码无法核对实际产出。建议: 实装 break-reward 路径并对齐两处描述, 或在 UI 标注该被动占位/未实装。

---

## 泡泡龟 (bubble) — `pets:2062`

基础: HP 450 / ATK 39 / DEF 18 / MR 19 / CRIT 0.25 / A 级。

| 技能 | 描述声明 | 代码实现 | 判定 |
|---|---|---|---|
| 被动 泡沫 (bubbleStore) | 受伤 100% 存泡泡 (上限 maxHp); 每回合消耗 15% 回血 + 35% 化魔法打随机敌 | 存 hpLoss×pct(100)% cap maxHp (PT:275-280); 每回合先扣 healPct 15% 回血, 再从余量扣 dmgPct 35% 打随机敌 (BS:7541-7568) | ⚠️ (低, 见下) |
| 泡泡攻击 (physical 3×0.5) | `{N:0.5*ATK*3}` = 150%ATK 物理 | 通用 physical atkScale 0.5 ×3 段 | ✅ |
| 泡泡盾 (bubbleShield 1.8, burstScale 2, dur 3) | `{S:1.8*ATK}` 盾 3 回合; 自然到期爆裂对全体敌 `{M:2.0*ATK}` 魔法 | **已修**: 盾 atkScale 1.8 (SH:5408); 存 bubbleShieldBurstScale (SH:5414); 到期爆裂 `owner.atk×burstScale(2)` 且 `applyRawDamage(..,'magic')` (BS:7399-7404) | ✅ (基线"高"已修) |
| 泡泡束缚 (bubbleBind dur 8, lossCap 30) | 束缚 8 回合, 每段受击甲/抗各 -X (lv1-5=1/lv6-10=2), 累计上限各 30, 永久衰减 | duration 8(+1), perHitLoss lv≥6?2:1, lossCap 30 累计 (SH:3446-3458); 受击扣 base+当前 def/mr, 不恢复 (PT:315-329) | ✅ |
| 泡泡爆破 (bubbleBurst 0.4泡值 + 0.8物理) | 消耗全部泡泡值, 对目标竖排(同 `_position`,≤3)每个 `40%×消耗值` 魔法 + `0.8×ATK` 物理 | consumePct 100, magicScale 0.4 → magic; physScale 0.8 物理; 目标 `_position` 整排 (SH:3463-3501) | ✅ |
| 治愈泡泡 (bubbleHeal 120/10/25) | 主目标回 `1.2×ATK + 10%maxHp`, 其他友军回主治疗 25% | healAtkPct 120 + healHpPct 10 (caster.maxHp), splashPct 25, 走 applyHeal (SH:5377-5394) | ✅ |

详情:
- ⚠️ 低 (carry-over, DESC-GAP) 泡沫被动: (1) 15%/35% 串行扣减 — 35% 是基于扣完 15% 后的余量, 描述读起来像两段都基于原始泡泡值, 数值偏低于直觉。(2) 35% 段经 `applyRawDamage(t, dmgAmt, 'magic')` (BS:7560) 直接结算; `applyRawDamage` 不做魔抗减免 (DMG:112-258 仅扣盾/特殊减伤, 不乘 mr), 故"化作魔法伤害"实为按泡泡值无视魔抗 (仅走盾)。基线判定属"直接魔法伤害"设计, 保留为 DESC-GAP 而非 bug。

---

## 线条龟 (line) — `pets:2170` (name 字段 = "线条龟")

基础: HP 432 / ATK 46 / DEF 10 / MR 11 / CRIT 0.25 / A 级。

| 技能 | 描述声明 | 代码实现 | 判定 |
|---|---|---|---|
| 被动 墨迹 (inkMark 5%/层, max 5) | 技能叠墨迹(上限5); 目标受伤每层额外承受 5% 魔法(速写后真伤) | applyInkBonus: `original×stacks×0.05`, magic(默认)受魔抗 / true(rapid)不减 (DMG:273-286); cap 5 / 速写 7 (SH:449) | ✅ |
| 素描 (lineSketch 3×0.5) | `{N:0.5*ATK*3}` 物理, 每笔 +1 墨迹 | hits 3 atkScale 0.5 物理, addInkStack(1) /段 含 link 同步 (SH:5128-5152) | ✅ |
| 连笔 (lineLink 0.8, dur 3, transfer 30) | 连接两敌 3 回合, 各 `0.8×ATK` 物理 + 各 +1 墨迹; 一方受伤 30% 魔法(速写后真)传导, 墨迹同步 | atkScale 0.8 物理 ×2, +1 墨迹, 建 _inkLink {transferPct 30, dmgType magic/true} (SH:5187-5252); 传导 DMG:246-253 | ✅ |
| 画龙点睛 (lineFinish 0.7 + 0.45/层) | base `0.7×ATK` 物理 + 每层 `0.45×ATK`(默认魔法/速写真), 清墨迹, 击杀重置 CD | baseScale 0.7 物理 + perStackScale 0.45×stacks magic/true, 清 `_inkStacks=0`, 击杀 `skill.cdLeft=0` (SH:3394-3439); 动态文案 buildLineFinish 一致 (ST:193-219) | ✅ |
| 速写 (lineRapid, passiveSkill) | 墨迹上限 7 + 5% 真伤 + 连笔/引爆转真伤 | _inkCapOverride 7 + _inkTrueDmg true → addInkStack cap 7 / DMG inkBonus true / link/finish true (SH:3390, DMG:277) | ✅ |
| 墨水炸弹 (lineInkBomb 4×0.25, ink 4) | 全体 4 段 `0.25×ATK` 物理, 每敌 +4 墨迹 | hits 4 atkScale 0.25 物理 全敌, addInkStack(inkStacks 4) 含同步 (SH:5157-5181) | ✅ |

线条龟全部技能与描述一致, 无新问题。

---

## 闪电龟 (lightning) — `pets:2273`

基础: HP 429 / ATK 42 / DEF 10 / MR 13 / CRIT 0.25 / A 级。

| 技能 | 描述声明 | 代码实现 | 判定 |
|---|---|---|---|
| 被动 雷电 (lightningStorm 0.82, max 8) | 每回合自动电击随机敌 `{T:ATK*0.82}` 真伤, 每段 +1 电击, 满 8 引爆 `{T:ATK*0.82}` 真伤清零 | 每回合 side-end 电击 `atk×shockScale(0.82)` 真伤 pierce (BS:6868-6873); on-hit +1 电击, 满 stackMax(8) 引爆 `atk×0.82×surgeBoost` 真伤 (PT:375-393) | ⚠️ (见 🔴 涌动) |
| 闪电打击 (lightningStrike 5×0.23, splash 25) | `{M:0.23*ATK}`(5段总) 魔法, 每段溅射 25% 到次目标 + 叠 1 电击 | perHit=`atk×0.23/hits(5)`, 5 段 magic 合计 0.23×ATK; 溅射 perHit×25%; 电击经 dealMagic→triggerOnHit (SH:2835-2869) | ✅ (历史 5x bug 已修, P79) |
| 涌动 (lightningSurgeBuff 2t, +50%) | 接下来 2 回合被动电击(含满层引爆)真伤 +50%, 立即对目标 `{T:ATK*1.23}`(=0.82×1.5) 真伤 | 设 _lightningSurgeTurns 2(+1) + boostPct 50; 立即 `atk×0.82×1.5` 真伤 (SH:2940-2960); **+50% 仅作用于引爆(PT:383), 未作用于每回合自动电击(BS:6868)** | 🔴 (见下) |
| 雷暴 (lightningBarrage 20×0.11) | `{M:0.11*ATK*20}` = 220%ATK 魔法, 每道 +1 电击 | hits 20 arrowScale 0.11 magic 随机敌, 电击经 dealMagic (SH:2872-2891) | ✅ |
| 感电 (lightningSurge 0.1/层) | 全体按电击层数每层 `{T:0.10*ATK}` 真伤, 清空层 | aoe, perStackScale 0.1×stacks true, clearShockStacks (SH:2894-2916) | ✅ |
| 雷盾 (lightningShield 0.9, counter 0.1) | `{S:0.9*ATK}` 护盾; 护盾在时每受一段反击 `{M:0.1*ATK}` 魔法 + 叠电击 | shieldScale 0.9 → applyShield(.shield); counter buff {0.1×ATK,3} (SH:2919-2932); 反击仅 `target.shield>0` 触发 (PT:364) | ✅ |

详情:

### 🔴 涌动 +50% 漏作用于每回合自动电击 (lightningSurgeBuff) — 高
- 描述 (pets:2316-2317): brief「接下来两回合内**被动电击**造成的真实伤害提升 **+50%**」; detail「接下来两回合内**被动电击（含满层引爆）**造成的真实伤害额外提升 +50%」。
- 即 +50% 应同时作用于 (a) 每回合自动电击 (`{T:ATK*0.82}`, 被动的招牌效果) 与 (b) 满 8 层引爆。
- 代码: `_lightningSurgeTurns` 仅被 3 处读 —
  - SH:2944-2946 设置 (涌动 handler)
  - PT:381-383 应用于**满层引爆**: `surgeBoost = _lightningSurgeTurns>0 ? 1+boost% : 1` → `atk×0.82×surgeBoost` ✅
  - BS:5107-5111 turn-begin -1
- **每回合自动电击 (BS:6868-6873)** 计算 `shockDmg = Math.round(v.fighter.atk × shockScale)`, **完全不读 `_lightningSurgeTurns`** — 所以涌动开启期间, 招牌的每回合自动电击仍是 0.82×ATK, 未享受 +50%。
- 结果: 涌动 2 回合内, 每回合自动电击应为 `0.82×1.5×ATK ≈ 1.23×ATK`, 实际仍 `0.82×ATK`。描述明确含"被动电击", 而漏掉的恰是被动最主要的那段。
- 建议修复 (仅描述, 不在本任务内执行): 在 BS:6868-6869 计算 `shockDmg` 时, 比照 PT:382-384 引入 surgeBoost:
  ```ts
  const sa = v.fighter as Fighter & { _lightningSurgeTurns?: number; _lightningShockBoostPct?: number };
  const surgeBoost = (sa._lightningSurgeTurns ?? 0) > 0 ? (1 + (sa._lightningShockBoostPct ?? 50) / 100) : 1;
  const shockDmg = Math.round(v.fighter.atk * shockScale * surgeBoost);
  ```
  注意时序: turn-begin (BS:5107) 在 side-end zap (BS:6868) 之前 -1, 需确认 2 回合窗口仍能覆盖到对应的 2 次 side-end 电击 (handler 设 `surgeTurns+1=3`, 通常足够; 修复时一并验证不会少 1 次)。

---

## 小结

判定计数 (本批 5 龟, 共 30 项: 5 被动 + 25 技能):
- ✅ 一致: 26
- ⚠️ 注意/DESC-GAP/carry-over: 3 (海盗死亡钩锁依赖 currentAttacker; 糖果罐未实装; 泡沫 15%/35% 串行+无视魔抗)
- 🔴 错误: 1 (闪电涌动 +50% 漏作用于每回合自动电击)

🔴 列表:
1. **闪电龟 涌动 (lightningSurgeBuff)** — 涌动的 +50% 真伤加成只作用于满 8 层引爆 (PT:383), **未作用于每回合自动电击** (BS:6868-6873 不读 `_lightningSurgeTurns`)。描述 detail 明确写"被动电击（含满层引爆）", 漏掉的正是招牌的每回合自动电击段。

最重要发现: 上述闪电涌动 🔴 是本批唯一实质 bug。基线的 3 个高优先 (泡泡盾爆裂 / 糖果锤 selfHpPct / 焦糖铠 healHpPct) **本批复核确认均已正确修复**。其余为低优先 carry-over / DESC-GAP (糖果罐 sweetTrap 整条未实装, 影响最大但属功能缺失而非数值错误, 建议单独排期)。
