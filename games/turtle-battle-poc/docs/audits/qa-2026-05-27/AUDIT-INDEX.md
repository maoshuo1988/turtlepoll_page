# 全龟技能 + 全装备 代码↔描述 严格审查 (2026-05-27)

针对用户 #8 需求：再次严格审查每只龟技能 + 每个装备效果，代码与描述对比，任何 bug / 不合理 / 边界问题 / 描述没到位 都成文档。

审查范围：28 只龟（被动 + 全 skillPool）+ 46 件装备。审查基准 = **当前 pets.ts / equipment.ts 的描述文本与公式 token**（非旧 JS）。

## 明细文件
- [A 组](audit-A-basic-stone-bamboo-angel-ice-ninja-twohead.md) — basic / stone / bamboo / angel / ice / ninja / two_head
- [B 组](audit-B-ghost-diamond-fortune-dice-rainbow-gambler-hunter.md) — ghost / diamond / fortune / dice / rainbow / gambler / hunter
- [C 组](audit-C-pirate-candy-bubble-line-lightning-phoenix-lava.md) — pirate / candy / bubble / line / lightning / phoenix / lava
- [D 组](audit-D-cyber-crystal-chest-space-hiding-headless-shell.md) — cyber / crystal / chest / space / hiding / headless / shell
- [E 组](audit-E-equipment.md) — 全 46 装备

整体结论：**绝大多数技能/装备与描述一致**。下列为需修的真实问题，按严重度排序。

---

## 🔴 高严重 (效果实质损坏 / 数值差 2x 以上 / 整条死代码) — ✅ H1–H7 全部已修并 Playwright 验证 (2026-05-27)

| # | 对象 | 问题 | 位置 |
|---|------|------|------|
| H1 | 装备·激光长刃 (e_laser_blade) | 技能 `type:'laserSweep'` 在 SKILL_HANDLERS **无对应 handler** → 回退通用单体物理。描述的整列 AOE (0.7/1.4×ATK) + 80% 吸血**完全没实现**；源码自承"死代码"。+15 ATK 仍生效。 | equipment.ts:245 / equipment-runtime.ts:184 |
| H2 | 赌神龟·命运之轮 (gamblerFateWheel) | 整条被动技能**死的**：装备只设 `_fateWheel` flag 无人读；回合начало判定 `p.type==='gamblerFateWheel'`，但赌神实际被动是 `gamblerMultiHit` → 永不为真。描述承诺的每回合永久属性增长 = 0。 | BattleScene.ts:1196-1197 vs 5146 |
| H3 | 泡泡龟·泡泡盾自然到期爆裂 | 自然到期爆裂硬编 `0.8×ATK` 且按**物理**结算，无视 `burstScale:2`。描述 `{M:2.0*ATK}` 魔法 → 实际约 40% 伤害且类型错。 | BattleScene.ts:7222-7228 |
| H4 | 熔岩龟·变身 AOE | `transformAoeDmgScale=0.5` → 实际 ≈ 0.6×ATK；描述 `{M:ATK*1.2+ATK*0.2*1.2}` ≈ 1.44×ATK。约弱 2.4 倍。 | BattleScene.ts:5714-5715 / pets.ts:2502 |
| H5 | 糖果龟·焦糖铠回血缺失 | 通用 `shield` handler 不读 `healHpPct` → 描述"回复 {H:HP*0.1} 生命值"**完全未实现**，只上护盾。 | skill-handlers.ts:1126-1144 |
| H6 | 糖果龟·糖果锤自损加伤段缺失 | 通用 `physical` handler 不读 `selfHpPct` → `{N:HP*0.05}` 自损 5% maxHP 物理段**不触发**，只有 1.1×ATK + atkDown。 | skill-handlers.ts:547-593 |
| H7 | 熔岩龟·熔岩喷射目标范围 | pets.ts 标 `aoe:true` 且描述"对全体敌方"，handler 只命中**单目标**。 | skill-handlers.ts:2727 |

## 🟡 中严重 (单技能行为/数值偏差、面板计数错、触发条件松) — ✅ M1–M14 全部已修 (2026-05-27; M11/M14 死亡变身路径代码审查验证, 余 Playwright 验证)

| # | 对象 | 问题 | 位置 |
|---|------|------|------|
| M1 | 石头龟·磐石 | 描述按石头龟**自身**护甲/魔抗给增益，代码按**受益方**baseDef/baseMr 算 → 高甲石头龟给低甲队友远低于预期。 | skill-handlers.ts:5653/5659 |
| M2 | 石头龟·磐石 | 还附带 ~1×ATK 即时治疗 (atkScale 1.0 默认)，描述**只字未提**。 | skill-handlers.ts:5627 |
| M3 | 双头龟·切换近战 | 描述命中"目标"，近战分支实际打**最低血敌人**；远程分支才正确打选定目标，二者不一致。 | skill-handlers.ts:3993-3998 |
| M4 | 双头龟·双头坚韧 | 面板 token `{resilienceDef/Mr}` 绑到从不更新的 `_resilienceDefGain`，真实叠层在 `_twoHeadResStacks` → 面板永显"已获得 0"。 | — |
| M5 | 寒冰龟·冰寒被动 | "+20% 对熔岩/凤凰"只在读 `bonusDmgPct` 的 handler 生效 (turtleShieldBash/iceSpike)；冰龟自己的 iceFrost/iceFreeze 不吃。 | — |
| M6 | 寒冰龟·冰霜 | mrDown buff 时长缺 `+1` 约定 → -25% 魔抗少持续 1 回合；且与即时 `e.mr-=` 可能双扣。 | skill-handlers.ts:3486 |
| M7 | 天使龟·审判 | 描述"不触发其他被动"，代码对审判伤害触发反伤 + 吸血（注释称有意），与文本矛盾。 | — |
| M8 | 赌神龟·多重打击 | 描述/`{N:ATK*0.6}` = 60%×ATK，`dmgScale:0.5` 实际 0.5×ATK。概率衰减 (40→32→25.6) 正确。 | passive-triggers.ts:574 |
| M9 | 财神龟·梭哈 | detail 说每枚硬币打全体，handler 只对单目标循环硬币，无 aoe flag → 单体。 | skill-handlers.ts:5472 |
| M10 | 无头龟·灵魂收割 | 描述"+10% **目标**已失生命"，代码按**施法者**已失血算并对全体统一加成 → 语义反了。 | skill-handlers.ts:5241 |
| M11 | 赛博龟·强化浮游炮 | "机甲组装时 +3×无人机数 护甲/魔抗"未实现，机甲 def/mr 硬编 0。其余三项强化正常。 | BattleScene.ts:4204 |
| M12 | 缩头乌龟·攻击 | `selfDefUpPct` (+20% 自身护甲 2 回合) 不生效，走通用 physical 不读该字段，仅 TeamSelect 文字预览用。 | — |
| M13 | 装备·迷你水晶球 A (e_mini_crystal) | 回合**начало**触发 (描述"回合末")，且只打 1 随机敌 (描述"沿途整列")。孪生 B 反而正确 (side-end + 全列)。 | BattleScene.ts:2076 / 5293 |
| M14 | 装备·复活海螺 (e_conch) | 召唤虫"等级每级 +5% 属性"未实现，硬编 150HP/20ATK/0def。 | equipment-runtime.ts:131-146 |

## 🟢 低严重 — ✅ 8/13 已修, 5/13 评估后保留 (2026-05-27)

**已修 (8):**
- ✅ #1 彩虹紫光诅咒 9%→5% 与其它诅咒统一 (用户定)。
- ✅ #2 万能牌随机 DOT 改走 applyDotStacks/applyBurn 层数累加 (不再 push 固定 duration)。
- ✅ #3 猎人猎杀窃取 加 `currentAttacker===猎人` 门 — 仅自己击杀才偷 (队友击杀不再触发)。
- ✅ #7 强化随从 crit 删永久 `summon.crit+=`, 只留 2 回合 critUp buff + 锚 `_baseCrit` 防复利。
- ✅ #9 强化喊龟随从按主体【减半前】原始 maxHp×110% (用户定; 存 `_summonHpBase`)。
- ✅ #10 治愈海葵 HoT 改走 applyHeal (受治疗削减/增幅)。
- ✅ #11 火焰净化 debuffTypes 补 chilled/stun + recalcStats 立即恢复属性。
- ✅ #12 删 e_candle.onTurnBegin 死代码 (`_candlePhase` 写而不读)。

**评估后保留 (5) — 措辞近似正确 / 边界一致 / 不在引擎层:**
- 🆗 #4 phoenix/lava "灼烧持续 N 回合": 灼烧是衰减层模型, "持续N回合"是其近似(大致衰减 N 回合)。改需批量重写多龟描述、价值低 → 留待未来文案统一 pass。
- 🆗 #5 pirate 死亡钩子需 live currentAttacker (DoT 击杀不触发): 与 deathExplode/healOnKill 等所有死亡触发被动**一致**(DoT 杀无"击杀者")。是统一设计, 非 bug。
- 🆗 #6 bubbleStore 15%/35% 串行: 35% 作用于回血后余量, 极微小排序差, 不影响体验。
- 🆗 #8 star 星光射线 "18%当前HP" = 3 段每段 6% (HP 递减): 属"共-only 多段"约定的正常读法, 总量≈18%。
- 🆗 #13 糖果罐 sweetTrap 奖励档分布: 在 UI/break 路径不在 TS 引擎层, 引擎审计范围外 (未发现引擎侧问题)。

---

## 修复状态 (2026-05-27 全部处理完毕)
- 🔴 高 **H1–H7 全修 + Playwright 验证**。
- 🟡 中 **M1–M14 全修** (M11/M14 死亡变身路径代码审查, 余 Playwright 验证)。
- 🟢 低 **8/13 修, 5/13 评估后保留** (见上, 措辞近似/边界一致/引擎外)。

全部 commit 已推 main。后续若做 V2 dist 再 build 打包。

> 注：dummy 测试桩 maxHp=1,000,000，%HP 类伤害在审计工具里会显示巨大数字，非 bug。
