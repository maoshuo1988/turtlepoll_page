# 审查总账 (2026-05-28)

状态: 🔲未开始 / 🔍审查中 / 🛠️待修 / ✅已修待眼验 / ⚠️问题清单 / ✔️读码确认无误

## 龟 (28; 8 已于本会话前完成)
| # | id | 名称 | 状态 | 备注 |
|---|---|---|---|---|
| 1 | basic | 普通龟 | 🔲 | 批4 |
| 2 | stone | 石头龟 | ✔️ | 本会话已审 + 磐石之躯 rework |
| 3 | bamboo | 竹叶龟 | ✔️ | 本会话已审 |
| 4 | angel | 天使龟 | ✔️ | 本会话已审 |
| 5 | ice | 寒冰龟 | ✔️ | 本会话已审 |
| 6 | ninja | 忍者龟 | ✔️ | 本会话已审 |
| 7 | two_head | 双头龟 | ✔️ | 本会话已审 |
| 8 | ghost | 幽灵龟 | ✔️ | 本会话已审 |
| 9 | diamond | 钻石龟 | ✅ | 双减修复 + 坚不可摧永久盾改描述 |
| 10 | fortune | 财神龟 | ✅ | 梭哈回退单体(对目标) + 聚宝盆补深海币描述 + 梭哈文案修 |
| 11 | dice | 骰子龟 | ✅ | 逻辑全对(读码确认); 头顶飘字: 删命运骰子/孤注一掷起手, 稳定骰子去"→段数!" |
| 12 | rainbow | 彩虹龟 | ✅ | 逻辑全对(7色棱镜/七彩光束加成/全色风暴分型/反射弹射); 状态栏加当前回合光色徽章(图标+角标) |
| 13 | gambler | 赌神龟 | ⚠️ | 命运之轮♣ +4%吸血死链 → ISSUES P1 |
| 14 | hunter | 猎人龟 | ⚠️ | 猎杀 +8%吸血死链 → ISSUES P1 |
| 15 | pirate | 海盗龟 | ✔️ | 死亡钩子 currentAttacker 保留 |
| 16 | candy | 糖果龟 | ⚠️ | 糖果罐 sweetTrap 未实装 → ISSUES P4 |
| 17 | bubble | 泡泡龟 | ✔️ | 泡泡盾爆裂已修(基线); 储能释放跳魔抗=设计 |
| 18 | line | 线条龟 | ✔️ | 批2 读码确认无误 |
| 19 | lightning | 闪电龟 | ✅ | 涌动 +50% 现作用于每回合自动电击 (已修) |
| 20 | phoenix | 凤凰龟 | ✔️ | 灼烧"持续3回合"衰减近似 保留 |
| 21 | lava | 熔岩龟 | ✅ | 换形按装备index配对 (岩浆践踏可达+强化心少槽) 已修 |
| 22 | cyber | 赛博龟 | ✅ | 部署描述 18%→25% 已修; 无人机首回合/暴击 保留 |
| 23 | crystal | 水晶龟 | ✔️ | 批3 读码确认无误 |
| 24 | chest | 宝箱龟 | ✅ | 朗姆酒HoT改为抽到才有 (已修) |
| 25 | space | 星际龟 | ⚠️ | 虫洞"所有真伤+20%"仅星能段 → ISSUES P3; 星光射线措辞 |
| 26 | hiding | 缩头龟 | ⚠️ | 召唤物"不可被选中"未实装 → ISSUES P5 |
| 27 | headless | 无头龟 | ⚠️ | 灵魂打击魔法跳魔抗+不暴击 → ISSUES P2 |
| 28 | shell | 龟壳龟 | ✔️ | 批4 读码确认无误 |

## 验证 (Playwright + dev工具, 2026-05-28)
- `npx tsc --noEmit` 通过; `npm run build` 通过 (dist 已更新 → 4173 含全部修复)。
- 5173 dev: `__runSkillAudit` 116技能 / `__runPassiveAudit` 28被动 / `__runEquipAudit` — **全跑通无崩溃** (仅 favicon 404 无害)。
- `__testChestTreasure`: before0→after150 (expected150), equipsDrawn2 → 宝箱 loot 系统正常 (我的 HoT 门控不影响 loot 抽取)。
- 宝箱修复安全性: treasure_golem(宝箱怪) 是无 passive 的中立模板, 不带 chestTreasure → HoT 门控只作用于宝箱龟 (正确); rum 在首阈值池可抽到 → _chestEquipRum 可达。
- 闪电涌动修复一致性: 涌动 handler 同时 set _lightningSurgeTurns + _lightningShockBoostPct (skill-handlers:2945-2946); 我的 side-end 读法 = passive-triggers:383 满层引爆同款 (已上线工作路径的字面镜像)。
- 熔岩换形修复: 镜像 two_head 已验证的 _equippedIdxs 配对法 (skill-handlers:4070-4081)。
- **待用户 4173 眼验** (我跑不了的): 闪电涌动期间"每回合自动电击"伤害 +50% 实战表现; 熔岩自定义loadout变身后技能含岩浆践踏; 宝箱抽到朗姆酒后才有 HoT 的实战表现。

## "该方回合开始"被动时机统一 (用户 2026-05-29, 一类bug扫光)
**类**: "每回合开始/每回合自动"被动若挂 per-fighter processTurnBeginPassives → 被眩晕跳过就漏触发, 且团队buff晚触发队友吃不到。应挂"该方回合开始"(nextActor, _sideRoundKey 守卫, 一次性结算)。
- 已是 side-begin: 坚壁(stoneWall)。
- **迁过去**: 棱镜(rainbowPrism, 团队buff必须), 气场觉醒(auraAwaken, 眩晕漏=永久错过觉醒, 最严重), 命运之轮(gamblerFateWheel, "每回合开始抽"), 朗姆酒HoT(chestTreasure rum), 甜蜜掠夺(candySteal, 被动触发)。
- 合并成 `applyRoundStartPassive(view)`, side-begin 循环统一调; 从 processTurnBeginPassives 删除。
- **保留 per-fighter**: 竹叶充能(绑自身蓄力, 不动就不蓄合理), 赌徒之血(实时算暴击, 只攻击时用)。
- 状态栏: 彩虹龟加"当前回合光色"——每色一个独立色框(边框=该色); 多色头顶飘字合并不叠。
- 反射: 改贪吃蛇式(定长220px彩虹光头+拖尾沿弹射路径滑行); 治疗飘字去🌈。

## 装备 (37 + 9 消耗品) — 批5 ✅
✅39 / ⚠️2 / 🔴1; **零死flag** (每个 apply 的 flag 都有消费方); 基线无回归。详见 audit-batch5-equipment.md。
3 项全部已自主修 (见修复记录 7-9)。

## 修复记录 (均未提交, 待用户回来确认; tsc 通过)
1. 钻石结构减伤收口到 applyRawDamage (修双减 + 手算技能漏减) — damage.ts / skill-handlers.ts
2. 坚不可摧 护盾描述改"永久护盾" (代码本就永久) — pets.ts
3. 闪电·涌动 +50% 真伤加成现作用于每回合自动电击 (原只作用满层引爆) — BattleScene.ts:6868
4. 宝箱·朗姆酒 HoT 改为抽到朗姆酒(_chestEquipRum)才有, 用 _chestEquipRumPct (原无条件8%白送) — BattleScene.ts:5222
5. 熔岩换形按 _equippedIdxs 配对取火山技能 (原 slice(0,3) → 岩浆践踏不可达/强化心不少槽), 镜像 two_head — BattleScene.ts:5811
6. 赛博·部署 描述 18%→25% 对齐被动 droneScale — pets.ts:2735
7. 冰封水母(e_jelly) 眩晕 duration 1→2 (原 1 被 turn-begin tick 掉, 眩晕从不生效; 与其余6处stun统一) — passive-triggers.ts:449
8. 净化(c_cleanse) 清除集合补 'curse' (描述列了"诅咒"但清不掉) — equipment.ts:343
9. FPGA(e_fpga) 状态11 physImmune→dmgReduce (描述"所有伤害-25%除真伤", 原只减物理放过魔法) — BattleScene.ts:5406

### 第二轮 (用户回来后的指令, 2026-05-29)
10. **P1 生命偷取死链修复**: recalc 把 _lifestealPct(百分点)折入 lifestealPct(小数)单一来源 (stats-recalc.ts:76); _baseLifesteal 排除折入部分防双计 (snapshotBaseStats); 海星 e_star 溢出转盾收口到通用吸血块 (passive-triggers.ts:603) + 删 equipment-runtime e_star.onHit 防双吸; 暴风 headlessStorm 解耦 _lifestealPct 只额外吸 temp%. → 命运之轮♣/猎杀/王冠/FPGA/b_vamp/嗜血药剂 吸血现在真生效。
11. **P5 不可被选中**: 单体目标选择 (玩家 enterTargetingMode + AI pool + getEnemies) 排除黑洞(_isInBlackhole)与缩头随从(_isSummon); AOE 仍命中随从, 黑洞全程排除。
12. **虫洞重做** (用户新spec): 自身永久 +(6+0.5×lv) 魔穿; 沿目标横排(sameColumn)4段共 1.5ATK×(1+10%回合) 魔法 + 击飞 — skill-handlers starWormhole + pets.ts。(旧"真伤+20%标记"机制弃用 → ISSUES P3 作废。)
13. **P4 糖果罐 sweetTrap 实装**: 开局被动放糖果罐进装备席 (processBattleStartSummons); 点击「打碎」按当前回合掉落 1-4 件奖励 (breakCandyJar + generateCandyJarLoot 移植 candy.js); actionable 物品禁止拖装 (validateEquipFit 守卫, 同时修了口哨的潜在拖装问题)。

### 第三轮 (用户回来后第二批指令, 2026-05-29)
14. **P2(选A) 灵魂打击 headlessSoulStrike**: 加 calcEffMr 魔抗减免 + rollCrit 暴击 + magicMult (描述"魔法伤害", 原直接 raw 跳魔抗+不暴击是全场唯一离群点) — skill-handlers。
15. **星光射线描述改「每段」**: brief/detail "共120%ATK + 18%当前血" → "每段40%ATK + 6%当前血" (对齐 hits:3 实算) — pets.ts。
16. **海盗死亡钩子改随机敌人**: 原依赖 currentAttacker (DoT/同时死不触发) → 改对随机存活敌人; 双方同时死亡(无存活敌人)→ 列表空跳过不崩 — BattleScene:4473。
17. **凤凰熔岩盾 → 特殊限时盾**: 改用 _lavaShieldVal 独立护盾池(HUD aura 段特殊色), 4回合到期消散 (BS round-end tick 已有); 持盾期间(_lavaShieldVal>0)受击反击 (passive-triggers 6i 改判池); damage.ts 加 _lavaShieldVal 吸收。原为永久盾+counter buff。
18. **缩头盾 → 特殊限时盾**: 改用 _hidingShieldVal 独立池(HUD aura 段特殊色), 4回合; 到期由 BS round-end: 剩余盾×healPct%(20) 转生命 + 清盾; damage.ts 加 _hidingShieldVal 吸收。原为永久盾+hidingShield buff。
- (凤凰/缩头描述本就写"持续4回合/到期转化", 是代码原先做成永久=偏离; 现代码对齐描述, 文案无需改 → ISSUES P7 解决。)
- (凤凰灼烧: 未改 — 灼烧值衰减模型本就在「灼烧」技能灰字写明, 涅槃/烫伤的"持续N回合"指治疗削减; 无功能 bug。)

### 第四轮 (钻石龟续, 2026-05-29; 已提交 9b36dd4f 之后, 未提交)
19. **钻石·碰撞累计在受击方状态栏显示**: handler 把每目标碰撞计数镜像到 target._diamondCollideStacks; DetailPanel 加 fdp-rock-badge 徽章 (diamond-collide 图标 + 右下角次数, 满2眩晕重置)。
- (钻石冲撞流血值确认: 实际施加 **9 层** = bleedValue:12×bleedTurns:3/4, 与描述"9层流血"一致, 无 bug。)

### 第五轮 (财神龟 fortune, 2026-05-29; 未提交)
20. **梭哈(fortuneAllIn) 回退单体 + 统计分型**: JS doFortuneAllIn 本就对目标单体; 2026-05-27 M9 误读"对全体敌方"改成全体 → 现回退对【目标】逐枚 (18%ATK物理[过护甲]+18%ATK真实); 改 handler(getEnemies→target) + 描述全体→目标。**并修统计: 原把(物理+真实)合并记 'phy', 真伤被错算成物理 → 拆成 'phy'/'tru' 分记** (M9 起的老bug); 真伤飘字也改显实际(过盾后)值。
21. **聚宝盆补深海币描述**: 被动每回合 +2 深海币(this.coins, v0.9.9经济) 原描述未提 → brief/desc 补; 修 BS 注释 龟币→深海币。
- (财神龟其余4技能+被动读码确认无误。)
23. **招财进宝死事件修复 + 价格递增 (用户 2026-05-29)**: `'fortune-buy-equip'` 事件 emit 后**无监听** → 白扣20币不出装(死)。补 BattleScene 监听: 从 normal(14)+unique(19)=33 池随机抽1件进席。+ 价格递增: 每次购买后 ×1.25 (_fortuneBuyCost, 一场内累积); ActionPanel 可买判定 + 描述同步。
24. **财神龟 飘字/状态栏/释放门控/描述统一 (用户 2026-05-29)**:
   - 状态栏: DetailPanel 加金币徽章 (fortune-gold-icon + 右下角数量), 财神龟常显。
   - 招财进宝门控: 币不足 或 (装备席满10/10 且 全员满血=纯浪费) → 按钮禁用, 原因显"金币不足"/"席满且满血"。
   - 飘字统一: 所有金币增加一律 `+N💰`(黄) — 骰子去 `🎲{点数} `、聚财去 `(总数)`、阵亡 `🪙`→`💰`; 梭哈去 `! 共-{总}` 留 `{N}枚梭哈`; 删梭哈"没金币!"(已门控不可能触发)。
   - 描述统一: 聚财 brief/detail 统一(去"施法聚财"flavor)、打击两下 brief 补"(不消耗金币)"、招财进宝 brief 补"财神龟"前缀。
   - 文案: +2 深海币 战斗日志 龟币→深海币。

### 混合伤害统计分型 — 一类bug扫光 (2026-05-29)
**类**: 技能造成多种伤害类型(物理+真实等)时, recordDamage 必须按类型分开记; 合并记单一类型 → 战绩物理/魔法/真实分类错(真伤被算进物理)。
22. **dealPhysical gamblerPierceConvert**: 转换的真伤段原与物理合并记 'phy' → 拆成 'phy'/'tru' 分记 (skill-handlers:345; 赌神 pierce-convert buff 生效时触发)。
- 全表 grep 扫光: ✅平等(2物理+1真伤分记对)、✅chest风暴(phys/true/thunder分记对)、✅其余 'true' 落点均为纯真伤记'tru'。**混合类型仅 梭哈(#20) + gamblerPierceConvert(#22) 两处中招, 均已修。**

## 问题清单 (拿不准, 等用户决策)
- (汇总见 ISSUES.md)
