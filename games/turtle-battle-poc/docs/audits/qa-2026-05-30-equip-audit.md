# 装备 / 物品 全量审查 — 2026-05-30 (自主, 用户离开10h)

范围: equipment.ts (普通/独特/消耗品) + shop-quick.ts (q_*) + 特殊物品(口哨/糖果罐/孵化器/电棍)。
方法: 读描述理解效果 → 必要时对 JS(games/turtle-battle/js/) → 审代码 → 能修就修, 拿不准记录。Playwright 验证逻辑/数据。
图例: 🔴=确认bug已修 / 🟠=确认bug待修或需决策 / 🟡=可疑/不合理待核 / ✅=核对无误 / ⬜=未审

---

## 已修 (本批)

### 🔴 重击锤 e_hammer — ATK 加成被 recalcStats 抹掉 (用户报)
- 现象: "+4% maxHp×件数 攻击力" 不生效。
- 根因: 仅 equipment-runtime onTurnBegin 设 `atk = baseAtk + bonus`, 但 startActorTurn 紧接 `processTurnBeginPassives → recalcStats` 把 atk 重置回 base+buffs(无 hammer 项), 在该龟出手前就抹掉; 且那种写法还会覆盖 atkUp/atkDown。
- 修: 把 hammer 项收口进 `stats-recalc.recalcStats` (atk += round(maxHp×0.04×件数), flat, 跟 atkUp 同档); 删冲突的 onTurnBegin。

### 🔴 怒火药水 q_rage / 消耗品施加后不刷新 (用户报)
- 现象: 拖怒火药水到龟身上"没生效"。
- 根因①: `applyBenchEquipToFighter` 消耗品 `eq.apply(f)` 后**没有 recalcStats** → atkUp buff 进了 f.buffs 但 f.atk 要等目标下回合 turn-begin 才更新 → 当回合看着无变化。
- 根因②: `q_rage.applyToTarget` push `atkUp value:25`(裸值=+25点), 但 recalcStats 把 atkUp 当 flat 直接 +value → 实为 +25点 而非 +25%。(c_rage / applyTeamBuff 都正确折成 baseAtk×0.25)
- 修①: applyBenchEquipToFighter 消耗品 apply 后补 snapshot+recalcStats(当场生效, 对纯伤害/治疗消耗品无害)。
- 修②: q_rage 改 `value: round(baseAtk×0.25)`。

---

### 🔴 必中标记 markedDmg (c_mark 🎯 / q_mark) — 完全无效 (连原版 JS 也没实装)
- 现象: 必中标记 desc "受到的所有伤害 +20%", 但 `markedDmg` buff 在**原版 JS 与 PoC 都只 set 从不被消费** (grep 全 JS: 只在 engine.js push + cleanse 集; 无任何伤害代码读它)。标记完全没作用。
- 修: damage.ts `applyRawDamage` 入口实装 — 在所有减伤/吸收前 `finalDmg ×(1+value%)` (任何来源含真伤)。
- 连带修: ① q_mark 原 push `type:'mark'`(无人消费) → 改 `'markedDmg'`; ② DetailPanel 加 markedDmg 状态栏徽章(consumable-mark.png + 剩余回合, 之前被标记的敌人状态栏什么都不显示)。

### 🔴 净化 q_cleanse — 治疗削减拼错 + 漏清多种减益
- 现象: q_cleanse(小商店净化) filter 用 `'heal-reduce'`(连字符), 但真实 type 是 `'healReduce'` → 净化清不掉治疗削减; 还漏 atk/def/mrDown、armorBreak、markedDmg、bubbleBind、dot 别名。
- 修: 对齐 c_cleanse / engine.js debuff 集 `['dot','curse','burn','poison','bleed','chilled','atkDown','defDown','mrDown','armorBreak','healReduce','markedDmg','bubbleBind','fear','stun']`。
- (注: 消耗品 c_cleanse 用的是正确 'healReduce', 没此 bug; 仅小商店 q_cleanse 错)

## 已核对正确 (无需改)

### ✅ 全装备 apply() 数值 — 程序化审计 (window.__runEquipAudit, Playwright 5176)
- 全 44 件 apply() 的属性 delta 与描述一致; e_blade bladeBleed on-hit match:true; 8 消耗品全部产生效果 (治疗+150 / 加速cd-1 / 炸弹-54 / 怒火+1buff / 应急+80盾 / 急救+150 / 净化 / 标记+1buff); DoT 过盾吸收正确。apply 层无 bug。

### ✅ 宝箱怪 6 格满不登场 (用户问) — 已正确处理
- `rollNeutralForTurn(turn, spawned, bothSidesFull)`: bothSidesFull(双方各6格满) → 只返回 anemone(寄生海葵母, 不占格); treasure/crab 不会被选中。
- 安全网: `spawnNeutralPair` treasure/crab 分边 `findEmptySlot` 为 null 则 `continue` 跳过; spawned===0 时不设 neutralSpawned、不刷误导横幅。
- 单边满: 仍可能刷 treasure 在有空位那侧 (合理)。

## 待审 / 发现 (按类)

### 🔴 装备 proc 伤害飘字带来源 emoji (同"飘字不规范"类) — 已扫光
- 弹跳伤害数字 (spawnFloatingText + *-dmg 类) 上挂了来源 emoji: 蜡烛🕯/哑铃🏋/飞镖🎯/左轮🔫/海浪🌊/迷你水晶💎(命中+引爆💥)/玩偶熊🧸/宝箱连锁🔗。与用户多次反对的"伤害数字带 emoji"(如无人机 -44🛸)同类。
- 修: 全部去 emoji (裸数字)。**保留** 龙蛋🐉(走 spawnFloatingPassive 上飘标签路径, 与用户保留的熔岩🌋变身同类, 非弹跳伤害数字)。
- ⚠️ 判断项: 这是按"伤害数字统一干净"规则一致扫光; 若用户其实想要装备来源标识可回退。

### ✅ 装备 hook 全部已接入回合循环 (无哑铃式死 hook)
- fireOnHit / fireOnTurnBegin / fireOnDeath + processComplexEquipEffects(龙蛋/迷你水晶/海螺/珍珠) + processSideEndEquipment(蜡烛/哑铃/飞镖/左轮/玩偶熊/迷你水晶/海浪) + processSideEnd(闪电/雷鸣贝壳/无人机) + processRoundStartHook(海葵HoT/涟漪) 全部在 startActorTurn / side-end 调用。重击锤是唯一"hook被recalc抹掉"的死案例(已修)。

### 🟢 闪避率面板位置 (用户: 挪到第三列下面) — 已调
- 从主属性 grid (.fdp-stats 第9项) 移到 .fdp-stats-col 第三列底部 (治疗/护盾/伤害减免/**闪避**)。布局待 4173 眼验。

### 装备行为 hook 数值 (spot-check vs equip-effects.js, 已核对一致)
- 蜡烛: 微弱 自+20/邻+10; 燃烧 横排 30魔法+20灼烧 ✅
- 哑铃: +25 maxHp/回合 + 扔 5%maxHp 物理 ✅
- 飞镖: 50 物理 + 20 流血 (靶子=_knockedUpThisTurn) ✅
- 左轮: 40 物理/弹, 消耗1弹 ✅
- 迷你水晶: 每段 ≥3层 引爆 14%maxHp ✅
- (其余 龙蛋/海浪/玩偶熊/FPGA/放大器/珍珠/海螺 仍待逐字核, 但 flag 置位 + 已接入)

---

## 同批 turtle 级 (用户同条消息提的) — 本轮处理结果

### 🔴 缩头「指挥」完全无效 — 已修
- hidingCommand 只 `emit('hiding-command')` 但**全工程无监听** → 指挥啥也不发生 (随从不额外出手)。
- 修: 加 setHidingCommandHook (skill-handlers) + BattleScene 注入 `await summonAutoAction(随从view)`。
  随从**立即**额外行动一次 (对齐 JS hiding.js:26 `await summonAutoAction`); 回合末仍按常规再行动一次 (processSideEnd:7358)。

### ✅ 缩头随从 AI — 与 JS 1:1 一致
- summonAutoAction 选技逻辑 (HP<35%治疗 / 盟友需要时护盾 / 30%自增益 / 否则 CD 加权 80% 大招) 与 JS hiding.js:30-90 完全一致; 排除 hidingCommand 防递归。✓

### 🟠 缩头随从技能组 — 与 JS 不一致 (建议下一步港, 拿不准故记录)
- JS battle-setup.js:296 用 `aiPickSkills(pick.id)` **按主人等级随机抽** (1 基础 + 已解锁池里挑, 排除 passiveSkill + SUMMON_SPAWNS_UNIT 召唤类)。
- PoC spawnSummonAlly 用 `createFighter(pick.id)` → 拿该 pet 的**默认技能 [0,1,2]**, 非按等级随机抽。PoC 有 skillUnlockLevel 但召唤没用上。
- 影响: 随从永远默认 3 技能, 不随等级变化/不随机; 且未显式排除召唤单位类技能 (默认槽里若含 pirateShip/crystalBall 等理论会嵌套召唤 — 低概率但存在)。
- 建议: 港一个 aiPickSkills 等价 (用现成 skillUnlockLevel) + 加 SUMMON_SPAWNS_UNIT 排除集。**未动, 待用户确认要不要做** (改召唤生成有连带风险)。

### 🟢 龟壳「储能」→ 血条下进度条 — 已做
- buildHpBar 加「⚡ 储能 cur/cap」条 (cap = maxHp×energyMaxStorePct 50%); 被动卡里的 auraAwaken meter 移除; liveSig 加 _storedEnergy 实时刷新。

### 🟢 龟壳「侵蚀」分段 — 已做 (机制本就分段, 改为分段飘字)
- 侵蚀机制本就是 N 道弯波循环 (3+暴击/20, 每道 dealMagic + 80ms 间隔) — 伤害**已是分段的**。
- 但原来只在末尾飘 1 个总数 → 看不出分段。改为**每道波各自飘字** (体现"数道弯波"), 去掉末尾总数飘字。

### 🟠 龟壳「复制」不可复制清单 (回答用户"哪些不能复制") — 当前已实现, 列出供确认
- shellCopy 随机复制敌方 2 个**可用主动技能** (×60% 效果立即放); **被动技能不在 e.skills 池 → 天然不可复制**。
- 显式黑名单 (不可复制, 1:1 JS shell.js): shellCopy(自身)/赛博 cyberDeploy·cyberBuff·mechAttack / 缩头 hidingDefend·hidingCommand·hidingBuffSummon / 骰子·财神 diceFate·fortuneDice·fortuneAllIn·fortuneBuyEquip·fortuneGainCoins / 竹叶 bambooHeal·bambooLeaf / 幽灵 ghostPhase·ghostPhantom / 钻石 diamondFortify / 双头 twoHeadSwitch / 赌神 gamblerDraw·gamblerBet / 宝箱 chestCount·chestSmash / 星际 starWormhole·starShieldBreak / 泡泡 bubbleBurst / 龟壳 shellAbsorb·shellErode·shellFortify。
- 即: 变身/召唤/经济/自我增益/换形/复制自身 类不可复制 (合理, 防无意义或 exploit)。**如需增删黑名单, 待用户定** (这是设计决策, 未擅改)。

## 二审 (用户: "再核查第二遍") — 又抓到 3 处

### 🔴 q_swift `cdDown` 死 buff (同 markedDmg 类)
- q_swift "全队下回合 CD -1" push `cdDown` buff, 但全工程**无消费方** → 完全无效。
- 修: applyTeamBuff 拦截 cdDown → 立即扣每个 fighter 的所有 skill.cdLeft (cap 0)。描述"下回合 CD-1"就实现了。

### 🔴 q_critdmg `critDmgUp` 死 buff
- recalcStats `case 'critDmgUp'` 是空的, 注释说"在 calcCritMult 经 _extraCritDmg 处理", 但 `_extraCritDmg` **只由特定技能(猎人 execCritDmg 等)直接 set**, 这个 buff 永不被读 → q_critdmg "+25%爆伤" 完全无效。
- 修: recalcStats 把 critDmgUp 累进 critDmgAdd → 写 `_buffCritDmg` → calcCritMult 真消费 (与 chiWaveActive 同档处理)。

### 🔴 `applyTeamBuff` 没 recalcStats — 同怒火药水类
- team-buff(q_blade/q_shield/q_hawk/q_lifesteal/q_dodge 等) push buff 后**没 recalc** → atkUp/defUp/critUp/lifesteal 等当回合不进 f.atk/def/crit/lifestealPct, 要等下回合 turn-begin。
- 修: applyTeamBuff 末尾全队 recalcStats (含 snapshot 守卫)。
- 含已修的 q_swift 和 q_critdmg, 全套 team-buff 现在当场生效。

二审还核对了: hammer/recalc 时序 ✓ / mark 位置 (untargetable 后, 所有减伤前) ✓ / chest 数据属性 round-trip(esc + dataset 解码 + innerHTML 渲染 OK) ✓ / 缩头 hook 嵌套 setSkillApi 隔离 ✓ / shell `_storedEnergy` 真在 damage.ts:279 累积 ✓ / fear/bubbleBind/dodge buff 都有消费方 ✓。

## 本轮提交 (未 push)
- 62bf8e4b 重击锤/怒火药水/必中标记/净化 + ledger
- c0eb2705 宝箱龟专属装备实时刷新+可点+财宝条+连锁去emoji
- 395c7195 装备proc伤害去emoji + 闪避率移第三列
- fbd789ee 缩头指挥修复 + 龟壳储能条/侵蚀分段
- (本批二审) q_swift cdDown + q_critdmg critDmgUp + team-buff no-recalc

## 本轮提交 (未 push, 沿用自主审查惯例)
- 62bf8e4b 重击锤/怒火药水/必中标记/净化 + ledger
- c0eb2705 宝箱龟专属装备实时刷新+可点+财宝条+连锁去emoji
- 395c7195 装备proc伤害去emoji + 闪避率移第三列
- JS 权威源 = games/turtle-battle/js/equip-effects.js (龙蛋/珍珠/海螺/迷你水晶/蜡烛/哑铃/左轮/玩偶熊/飞镖/海浪/FPGA/放大器) + combat.js (blade/fire/jelly/urchin/star/octo on-hit) + 各 processSideEnd*。
- 程序化审计已确认所有 _equip* flag 正确置位; 行为正确性需对 JS 逐条核 (下批)。

### 🔴 宝箱龟专属装备 / 财宝 面板显示 (用户问"装备在面板哪显示") — 已修
原显示位置: ① 技能区底部「专属装备 X/5」一行图标; ② 藏宝图被动大卡三池(已得=紫高亮)。问题:
- **A 专属装备格不实时刷新**: refreshLive 只刷血条/属性/状态三区(故意不碰技能区), 且 liveSig 无 _chestEquips/_chestTreasure → 战中开新宝箱面板开着也不更新, 要关掉重开才见。
  - 修: 专属装备格包进持久容器 `.fdp-chest-equips`(helper buildChestEquipGridInner); liveSig 加 _chestTreasure/_chestTier/_chestEquips.length; refreshLive 实时换该容器 innerHTML。
- **B 专属装备格点击空弹窗**: 点格→openEquipPopup 读 data-eq-id 查全量 EQUIP_BY_ID; 但 chest 格没设 data + chest 池装备不在注册表 → 弹"装备"无图无说明。
  - 修: chest 格写全 data-eq-id/name/icon/**desc**; openEquipPopup 优先用 data-eq-desc; 点击走容器事件委托(实时新格也可点)。
- **D 没有血条下财宝进度条**: 财宝是充能资源(像怒气/星能), 却只有被动卡里一行文字, 跟其他资源龟不一致。
  - 修: buildHpBar 加「📦 财宝 treasure/下一阈值」进度条 (含寻宝直觉降阈+等级×3%缩放), 随 liveSig 实时刷新。
- **E 宝箱砸击连锁伤害带 🔗 emoji**: chestSmash 连锁溅射飘字 `${伤害}🔗` 违反"伤害数字干净"。→ 去掉 emoji。
- 🟡 **C 被动大卡财宝进度数字不实时** (brief/detail 不走 .ssc-pstate live diff): 现血条下财宝条已实时, C 降为次要; 暂不动被动卡。

(以上 A/B/D/E 已改 + tsc/build 通过 + dev 无 console error; 视觉布局待用户 4173 眼验)

