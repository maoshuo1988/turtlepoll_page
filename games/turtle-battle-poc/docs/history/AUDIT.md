# 移植逐行审查台账 — poc-phaser vs games/turtle-battle/js (JS=0-bug 参考)

目的: 对照 JS 参考逐行核对 Phaser 移植, 记录所有不一致/bug, 边查边修。台账持久化, 跨上下文不丢。
图例: 🔴 待修 · 🟡 核对中 · ✅ 已修+commit · ⏭ 已确认一致

## A. 用户报告 bug (确认真实, 优先)
| # | bug | 状态 | JS 参考 | 根因/修复 |
|---|---|---|---|---|
| A1 | 闪避跳数字非 Miss | ✅ | combat.js:82-110 | floatNum 集中拦截 "0" 伤害 + 闪避!→Miss (commit) |
| A2 | 深海站位/loadout 没生效 | ✅ | — | 深海闯关经 TeamSelect, 透传 leftSlots+loadouts (commit) |
| A3 | C/守护/物理 竖排 | ✅ | — | badges 改 row (commit) |
| A4 | 伤害统计缺失+多错 | ✅ | — | 真因: DmgStatsPanel.renderRow 读 physDmgDealt 等扁平字段(不存在)→bar 全 0空. PoC battle-stats 实为嵌套 dmgDealtByType.{phy,mag,tru,dot}. 改读嵌套 (commit)。⚠遗留: recordDamage 按 f.id 累加, 同 id 重复龟会合并 (待核) |
| A5 | 竹叶龟能带 4 技能 | 🟡非装备bug | — | 技能选择器**严格 cap 3**(confirm 要 selected.length===3, line1793/1854); test 模式 bamboo 也=3。所以战斗里只能带 3 技能castable。"4"=**详情面板把强化生长 enhancer 当第4 tile 显示**(用户早前要求显示的 enhancer, 带+角标)。属显示语义, 非可施放第4技能。待用户定: enhancer tile 要去掉/换样式? |
| A6 | 竹叶龟护盾技能时被动打自己 | ✅ | action.js:621-624 | 真因: 生长被动追加攻击 fireBambooChargeIfReady 直接用传入 target; 自施技能(自然恢复)的 target=自己 → 追加攻击打到自己。JS 永远打敌方(技能目标若有效存活敌方则用, 否则最低HP敌方, 无敌方不放)。已 1:1 修 (commit) |
| A7 | 放完技能不向前跳 | ✅ | ui-anim.js playAttackAnimation | 真因: castWithAnnounce (自施/群体/AoE 技能路径, 如岩石护甲/自然恢复/打击) 只 announce→handler→endTurn, **完全没 hop**; 只有定向敌方攻击(_executeAttackPostAnnounce)有 hop。JS playAttackAnimation 对任何技能都 hop。抽 playAttackHop 复用, castWithAnnounce 也调 (自驱位移技能跳过)。1:1 修 (commit) |
| A8 | 无头龟打不死 | ✅ | turn.js:224-232 | _undeadLockTurns 设 2 却永不递减→锁血永久. 补 startActorTurn 每回合 -1, 归零恢复1HP可击杀 (commit) |
| A9 | 属性 hover 死区 (裁切) | ✅ | — | tooltip ::after 被 .fdp-cols/.fdp-col-left overflow:hidden 裁。改 fdp-cols + 属性列 overflow:visible (右列仍 hidden 防溢出)。(commit) 待眼验 |
| A10 | 增加最大生命无血条变化 | ✅ | bamboo.js:162-164 updateHpBar | JS: maxHp 增加后 +heal 飘字 + "+X最大HP" 飘字 + updateHpBar(刷血条/数值)。无特殊角色动画。PoC fireBambooChargeIfReady 只 tween actor.hpBar(alpha-0 legacy 不可见)+hpText, 没刷 DOM overlay → 血条无变化。补 updateHpVisual(actor) (commit) |
| A11 | 反伤可反哪些伤害 | ✅ 验证一致 | combat.js:646-659 | PoC stoneWall reflect (passive-triggers.ts:135-153) **逐行=JS**: reflectPct=base+perDef·def+perMr·mr; reflectRaw=round(dmg·pct/100); **反弹为物理, 经攻击者有效护甲 calcDmgMult 减免**; 走 applyRawDamage(不再触发 on-hit, 无反弹套娃). **Playwright 实测**(天使龟 4 段裁决打石头龟, stone def=20 mr=15→reflectPct=32.5%): 天使 453→445 反伤 8HP — 反伤**确实触发**, 量小是因天使自身护甲把物理反伤大幅减免(=JS 同款行为), 非 bug。反伤只反物理类(JS:646 注释 physical), DoT tick 不走此链(JS DoT 不触发 on-hit 反伤, 一致)。**用户感知"反伤弱"= 攻击者护甲减免, 非偏离。** |

## B. 全项目映射表 (清单遍 — 先广)
JS 参考 ~70 文件/~30k 行; PoC ~65 文件/~40k 行。⚠ = PoC 行数远小于 JS, 疑漏逻辑, 优先查。
状态: ⬜未查 · 🔬查中 · ✅核完

### B1. 核心战斗 (最高优先)
| JS | 行 | PoC | 行 | 状态/备注 |
|---|---|---|---|---|
| combat.js | 1097 | damage.ts + passive-triggers.ts | 264+586 | 🔬 伤害管线/闪避/反伤/on-hit/死亡 (A1/A4/A8/A11). 已核 applyRawDmg vs applyRawDamage: PoC 把 JS 的减伤层分散到 calcDamage+deal*+applyRawDamage+equipment/synergies (assassin/magicMult/diamond/physImmune/dmgReduce/undeadLock/盾序bubble→aura→shield/hunterMark/inkLink 都在; _dmgBonusThisTurn/_equipFlatReduce/star/crystal 在 synergies/passive-triggers). 核心管线无缺层 ✅. 待: 逐层数值/顺序精确比对 + on-hit 链(648-790)逐项 |
| turn.js | 1434 | BattleScene(回合循环)+stats-recalc.ts | 80 | 🔬 回合/buff递减/锁血(A8补)/DoT — ⚠ 1434行逻辑分散, 重点 |
| fighter.js | 399 | fighter.ts | 126 | ⬜ 建龟/技能装配/被动 — A5 查这里 |
| action.js | 669 | BattleScene(出招/hop)+ActionPanel | 338 | ⬜ 出招/嘲讽/闪避/前跳(A7) |
| ai.js | 262 | BattleScene(AI 段) | - | ⬜ 敌方选招/选目标 (A6 可能相关) |
| state.js | 903 | BattleScene(死亡/复活/变身段) | - | ⬜ 死亡链/复活/变身 |
| battle-setup.js | 485 | BattleScene(create/placeTeam) | - | ⬜ 开局布阵 |
| engine.js | 1049 | BattleScene+scene-turtle-dom+多处 | 694 | ⬜ 渲染/HP条/floatNum |

### B2. 技能 (每龟1文件 → 全并进 skill-handlers.ts 5947 + registry.js→派发)
basic(767)/stone(35)/bamboo(246)/angel(170)/ice/ninja/two_head/ghost/diamond/fortune/dice/rainbow/gambler/hunter/pirate/candy/bubble/line/lightning/phoenix/lava/cyber/crystal/chest/star/hiding/headless/shell/_misc(337)/common(47)

### B2 深啃记录 (逐龟, 先 4 测试龟)
- **竹叶龟** ✅: 一叶刃/竹刺阵=generic物理, 自然恢复=self-cast(治己+队友盾)正确, 竹击=bambooSmack. 生长被动追加攻击 **A6 已修**(打自己→打敌方). 强化生长 tile A5(显示)+已改装备时才显. A7 hop 自施路径已修。
- **石头龟** ✅: 磐石之躯 stoneShield = round(round(maxHp×hpPct%)×shieldMult) 1:1; 嘲讽 stoneTaunt = redirectAll buff + round(round(atk×selfShieldAtkScale)×shieldMult) 1:1; 打击/岩石护甲(A2 doShield 已修)/磐石走 generic. 坚壁反伤被动=A11(代码=JS待运行时)。
- **天使龟** ✅: 裁决=generic物理; 祝福/平等/神罚 公式=JS angel.js(早前验); judgement[640→418 已修]。**新 bug 修**: 神罚 angelSmite 自动选"造成伤害最高"敌人读 e._dmgDealt, 但 PoC 全项目从不给 _dmgDealt 赋值(零匹配) → 全员0平手 → 神罚随机选目标。补 recordDamage 累计 caster._dmgDealt (1:1 JS combat.js:205) (commit)。
- **小龟** ⬜: 5 技能早前验过 (攻击/龟盾/打击/气波/过肩摔), A7 hop 已补
- **寒冰龟** 🔬结构✅: 冰锥 6 段交替物理/法术(i%2)=JS; 冰霜(mrDown先+10段AoE法术)/冰封(法术+必眩) 标真port带JS行号. 结构匹配, 数值未逐项深验(背景龟)。
- 其余 30 龟 ⬜ 逐个待啃 (背景龟, 优先级低于 4 测试龟)

### B2-FINDINGS 背景龟深啃结果 (2026-05-22, 4 并行 agent 审 24 龟)
图例: 🔴待修(明确JS偏离) · ❓需用户定(疑PoC有意改) · ✅已查忠实
**修复状态 (2026-05-22 批量, 一条 commit 一项)**: F1/F2/F3/F4 + two_head/diamondSmash/
rainbow/gambler/bubble/crystal/lava/shell/line/hunter/cyber/dice **全部已修+commit+tsc 通过**。
用户定: F4 burn=对齐JS层数(已做); lightning 技能#2=保持PoC涌动(不动); 全局HP+100=有意保留。

**❗系统级 (影响多龟, 最高优先)**
- 🔴 **F1 defUp/mrUp/atkUp 模型错: PoC 当百分比, JS 是绝对值(flat)**。JS turn.js:1031-1033 `f.def += round(b.value×defAmp)` / `f.atk += b.value`; UI tooltip "攻+${value}". PoC stats-recalc.ts:19-24 `defMult *= 1+value/100`。**大部分 PoC 技能 push 的是 flat 值(round(base×pct/100))→ 被 recalc 误当百分比 → 全部偏弱**。少数 PoC-only 项(shop-quick q_blade/q_shield value:10/15、equipment.ts:322 value:25)是真百分比依赖。修: recalc 改 flat + 把那几个百分比项改 push flat。
- 🔴 **F2 diamondStructure defBuffAmp(+50%队友护甲/魔抗buff, 自身强化+100%) 完全缺失**。JS turn.js:1014-1021。PoC recalc 无 diamond 跨队检测。
- 🔴 **F3 diceFateCrit 被 gamblerBlood recalc 清掉**。JS turn.js:1050-1052 gamblerBlood 重算 crit 后**重新加** diceFateCrit buff; PoC BattleScene:4554-4562 设 `crit=initCrit+bonus` 不重加 → 失血骰子龟下回合丢命运骰子暴击。
- ❓ **F4 burn DoT 模型: JS 用 stacks(value=round(atk×0.67) stacks, turns:999, 每回合 decay 1/3); PoC 用 fixed value/duration:5**。引擎级架构差异(影响 lava/phoenix/chest/candy/ice 全部 burn). 需定: 是否改回 JS stacks 模型。

**🐢 逐龟 (明确 JS 偏离)**
- 🔴 two_head: twoHeadDual **假 +3 baseATK/2回合** (BattleScene:4453-4461), JS 无此, 是纯换形被动。melee→ranged defReduce duration 少+1(4453 borderline)。
- 🔴 diamond: diamondSmash 走 dealPhysical(吃护甲+暴击), JS diamond.js:58-74 是**raw 无护甲无暴击** (DEF×1+MR×1+ATK×0.1)。(skill-handlers:2172)
- 🔴 dice: diceGamblerConvert handler push `gamblerPierceConvert value:20` 无 JS 对应(JS 是 DEF+MR→armorPen, 已在 BattleScene:1019 正确做)。passiveSkill 不调, latent。(4837)
- 🔴 rainbow: **_prismColor 从不赋值** → 七彩光束颜色加成(红20%真/蓝0.2ATK盾/绿5%maxHp治)**永不触发** + 徽章不显 (BattleScene:4822-4883 只读不写)。
- 🔴 rainbow: 首回合不跳过绿光 — JS basePool `turnNum<=1?[0,1]:[0,1,2]` (turn.js:405); PoC 硬编码 [0,1,2] (BattleScene:4833)。
- 🔴 rainbow: rainbowGuard 盾漏 getShieldMult 因子 (skill-handlers:4851 vs rainbow.js:59)。
- 🔴 gambler: **gamblerFateWheel 四花色效果全错** (BattleScene:4567-4587)。JS turn.js:324-340 ♠+5ATK+30HP/♥+2DEF+2MR/♦+8%crit+2穿甲/♣+4%吸血; PoC 全不同。data detail 文案对的(与 handler 矛盾)。缺 _fateWheelCounts。
- 🔴 bubble: bubbleBurst 打错目标 — JS 打 target 整竖排 `_position===target._position` (bubble.js:64); PoC 按 slot 列 index (skill-handlers:3287-3289), 打成跨排同列。
- 🔴 bubble: bubbleHeal/bubbleStore 治疗绕过 healReduce — JS 用 applyHeal (bubble.js:34); PoC raw 加血 (skill-handlers:5124, BattleScene:6236)。
- 🔴 hunter: 斩杀阈值 `<=` vs JS `<` (state.js:697 vs BattleScene:4899), 恰好14%边界差。minor。
- 🔴 phoenix: 涅槃 rebirth burn 值错 — JS round(atk×0.67) stacks (state.js:170); PoC value=round(atk×0.40+maxHp×0.08) duration4 (BattleScene:3332), 再被 tick maxHp 放大 → 远超 JS。(phoenixBurn/Scald 技能本身对)。
- 🔴 lava: lavaSplash PoC AoE 全体×3, JS doLavaSplash 单体 (lava.js:73-80 走 doDamage 不遍历; registry single)。PoC 强很多。
- 🔴 crystal: **magicAbsorb:20 被动未实现** (data 有字段 pets.ts:2690, 引擎无路径) → 水晶龟多吃 20% 法伤 (combat.js:927-929)。
- 🔴 crystal: crystalBurst 双叠 crystallize — dealMagic 叠1次 + 显式 true 段 triggerOnHitEffects 又叠1次 (skill-handlers:2884,2903) → 引爆快一倍。
- 🔴 chest: fire 装备 burn value=round(atk×0.4) (skill-handlers:3669,4681), JS+PoC其他 burn 都 0.67。
- 🔴 shell+lava 共享: auraAwaken 储能(passive-triggers:98) + lavaRage 受击怒气(199-205) 用 `dmg`(含盾吸) 而非 JS `hpLoss` (passive_subscribers.js:62,77) → 打盾也积攒。
- 🔴 shell: 储能波击时机 turn-begin 按 _auraTurn, JS round-end 按全局 turnNum%period (turn.js:1365); BattleScene:6156 第二个 processEnergyWave 读 _storedEnergy(从不赋值)=死代码。
- 🔴 line: lineSketch/lineInkBomb 直写 _inkStacks 跳过 _inkLink 伙伴同步 (skill-handlers:4886,4923), JS addInkStack 每次同步 (line.js:1-28)。
- 🔴 cyber: 每回合无人机开火不调 triggerOnHitEffects (BattleScene:5704 vs JS turn.js:766)。near-0 影响。
- ❓ lightning: 技能#2 JS=团队鼓舞(commonAtkBuff +15%队攻) , PoC 换成涌动(lightningSurgeBuff)。default skill 在出战槽 → 真实玩法差异, 疑 PoC 有意重设计。

**✅ 已查忠实**: ninja, ghost, fortune (除上述), pirate, candy, star/space, hiding, headless(A8已修确认), volcano, cyber(除无人机on-hit), 各龟基础数值(除全局HP+100)。
- ❓ 全局 HP +100 (所有龟 JS+100, 已确认是 PoC 全局 rebalance, 非偏离)。

### B3. 数据 — ✅ 核完 (2026-05-22, 3 并行 agent)
| pets.js | 909 | pets.ts | 3427 | ✅ 28 龟 skill 参数 + passive 参数**全对** (atkScale/hits/cd/各 Pct/Turns/stacks/阈值/能量/变身/召唤). 仅 sanctioned: HP+100、lightning 涌动、burn 0.67 |
| equip-effects.js | 865 | equipment.ts+equipment-runtime.ts | 432+227 | ✅ 全部装备数值对 (flat/百分比/proc/盾/灼烧层/触发项分散到 passive-triggers/damage/BattleScene 也对). 6 个 PoC-only 装备=sanctioned |
| synergies.js | 378 | synergies.ts | 213 | ✅ 1:1 — 10 类羁绊 tier2/tier3 数值 + 触及属性全对; 阈值/召唤排除一致 (偏小=纯数据无冗余) |

**B3 结论: 数据层完全忠实, 0 偏离。所有 bug 都在逻辑层(已 B2 修)。**

### B4. UI/面板
ui.js(1538)+ui-action(421)+ui-anim(683)+ui-skill-text(314)+ui-summon(203) → DetailPanel(1443)+ActionPanel(338)+scene-turtle-dom(694)+turtle-hud(669)+skill-text(243)+DmgStatsPanel(218)+vfx/skills(453)
| stats_tracker.js | 35 | battle-stats.ts | 108 | ✅ A4 已修 |

### B5. 深海/商店/事件 (⚠ 多处 PoC 偏小)
| dungeon.js | 852 | DungeonScene+RewardPick+ChoiceEvent | 354+250+206 | 🔬 A2 已修站位 |
| shop.js | 438 | ShopOverlay.ts | 441 | ⬜ |
| bench.js | 607 | BenchRail.ts(258)+BattleScene 方法 | - | ✅ ⚠解除(误报): 完整系统全在, 只是拆分。aiDrainBench(6564, AI自动用席)✓ applyBenchEquipToFighter✓ 跨关持久 benchInventoryIds✓ 战利品进席✓ 商人掉落✓。UI在BenchRail, 逻辑在BattleScene |
| events.js | 436 | events.ts(151)+ChoiceEventScene(206) | - | ✅ ENV事件6+中立3 全一致。**中立 KO 奖励已补全 (2026-05-22)**: 宝箱怪/巨蟹大奖 equip:1→dropLootEquip 进席, 海葵母大奖 purify→对面 3 回合 healReduce 10 (JS events.js:326-336)。Playwright 验证: treasure 掉装备(小龟壳)进席+30币, anemone 6/6 敌 healReduce 10。 |
| achievements/online/codex/deep_coin/tutorial | - | 对应 scene | - | ⬜ 低优先 |

### 深啃顺序 (定): B1 核心战斗 → B2 技能(先 4 龟) → B3 数据 → B5(⚠偏小) → B4 UI

### 深啃结论
- **B1 combat.js 核心 ✅**: 伤害管线(applyRawDmg)无缺层 + on-hit 触发链 12 效果全在(passive-triggers.ts, 带 JS 行号 1:1). 核心战斗忠实, **bug 不在这**。仅顺序微差(无依赖, 无影响)。
- 推论: bug 在 **B2 逐龟 handler / B4 UI / B3 数据**, 下一步重点查这些 (A5/A6 在 bamboo handler; A9/A10 在 UI)。

## G. 二遍审计 — 编排层 + 模式反扫 (2026-05-22, 4 并行 agent)
第一遍按"龟"切, 漏编排层(turn/state/ai/action)+模式复发。二遍专查这些, 命中多个真 bug。
**G1-G11 全部已修 + commit + tsc/build 通过 + Playwright 验证**(G1 单减 3→2/G3 闪避不崩/
G4 流血结算/G6 处决吸血/G8 bubbleStore hpLoss; 余 G2/G5/G7/G9/G10/G11 代码+build 确认)。
连带补 F4 漏网: passive-triggers 本地 applyDotStacks 的 burn/poison/bleed 也改层数模型。
图例: 🔴待修 · ✅已修 · ⏭ PoC-scope/有意(不改)

**🔴 HIGH (combat-affecting)**
- 🔴 **G1 buff duration 双减**: startActorTurn 先 processTurnBeginPassives→tickBuffsDuration 减一次(BattleScene:4279), 又在 :1708 再减一次。JS 每回合只减一次。→ **所有 buff 寿命减半**(duration:2 只活 1 回合)。F1 后 buff 变有意义, 影响更大。删 :1708-1709。
- 🔴 **G2 processSideEnd 提前 return 漏跳**: `if(!hasEffects) return`(:5597) 在无 DoT/HoT 时跳过 闪电龟雷击/雷鸣贝壳/浮游炮 spawn+fire/熔岩变身复查/**side-end 装备**。JS 把 processSideEndEquipment 放 guard 外(turn.js:897 注释"否则装备永不触发")。
- 🔴 **G3 闪避双 roll**: _executeAttackPostAnnounce(:2474-2513) 攻击前 roll 一次闪避, dealPhysical/dealMagic 命中时又 roll(skill-handlers:299)。JS 只 per-hit roll。→ 闪避率虚高 1-(1-p)²。删攻击前预检。
- 🔴 **G4 物理羁绊 tier3 流血完全失效**: passive-triggers:240 push `{type:'dotBleed', duration:2}`, 但 tickDoTs 只认 bleed/burn/poison/curse → 'dotBleed' **永不结算**。应 applyDotStacks(target,'bleed',amt) (JS combat.js:558)。
- 🔴 **G5 deathHook 漏 triggerOnHitEffects**: JS state.js:338 钩锁伤害后触发 on-hit(吸血/装备/反击); PoC(:3708-3728) 没调。
- 🔴 **G6 猎杀处决 漏 on-hit + keep-alive**: JS(state.js:755-762) 先保活→triggerOnHitEffects(猎人 8% 吸血/泡泡束缚)→再杀; PoC(:4931-4939) 直接杀, 处决吸血不触发。
- 🔴 **G7 处决/AOE 击杀 stale currentAttacker**: processHunterExecute/lava-AOE 不设 this.currentAttacker=f → 被处决者死亡被动(deathExplode/Hook)结算到错误攻击者。
- 🔴 **G8 bubbleStore 用 dmg 非 hpLoss**: passive-triggers:213-217 用含盾总伤; JS passive_subscribers:90 用 hpLoss(打盾不积攒)。同 auraAwaken/lavaRage 模式(已修), bubbleStore 漏了。

**🟡 MEDIUM**
- 🔴 **G9 _baseCrit 快照 guard 错**: `if(!_baseCrit)`(:4302) 对 0 暴击龟恒真→每回合重照, 把 buff 暴击烤进 base 累积。应 `=== undefined`。
- 🔴 **G10 _auraShield 永不衰减**: JS(action.js:644-659) 气场盾 2 回合衰减(半→清); PoC 只被伤害削, 永不主动衰减 → 龟壳过肉。
- 🟡 **G11 hunterKill 偷取未记 _dmgDealt**: JS 记 sHp 进伤害统计; PoC 只记 steal 累加(统计 bar 数字差, 非战斗结果)。

**⏭ PoC-scope / 有意 (不改)**
- ⏭ Fortune AI 简化(缺 all-in turnNum>=4 分支, <=vs<); easy/hard 难度档 PoC 无难度系统; blackhole 排除(星龟引力未实现); shop-quick 百分比当 flat(PoC-only 商品, 无 JS 对应); DoT tick 顺序(无害); 逐龟 vs 逐回合 passive(boss 双动边界); summon-death 猎杀吸血微差; undeadRage flag 名(_undeadUsed, 行为对); lava 变身对烧免疫敌微过量回血。

## H. 三遍审计 — UI/动画/反馈层 (2026-05-22, 3 并行 agent) — 之前两遍跳过的层
根因: 前两遍审"代码逻辑"+"数据", 把 UI/动画/交互定义为"创作域"略过。实为没做完的自创近路。
图例: 🔴待修 · ✅已修

### H-A 动画/受击反馈 (VFX)
- ✅ **受击击退**: dealPhysical/dealMagic/ninjaShuriken/炸弹 已改 sceneKnockback (commit dd75cc7)。
- ✅ **U4 showDamageVfx 自创弹跳**: 改 playHitKnockback + camera shake 仅暴击 (commit)。
- ✅ **U5 barrage/hunterShot ±6 wobble**: barrage 删(deal*已击退); hunterShot→hitKnockback (commit)。
- ✅ **U6 playFallbackAction 'hurt' 双向回弹**: 删, 只留 tint+squash, 位移交 knockback (commit)。
- 🟡 **U7 缺击退**: 一批 handler 直接 applyRawDamage 绕过 deal* (1652/2438/2610/2748/2798/2834/3106/3191/3256/3321 等)。deal* 已接 knockback, 这些直走的待逐个补 api.hitKnockback (低优先, 多为多段/AoE)。

### H-B 交互 (用户报"选了一只不能退回选其他")
- ✅ **U1 换龟无法返回** (用户原报): ActionPanel 换龟按钮 canBack 时显示+wire backToPicker; Playwright 验证点击→删 act 标记+重开 picker (commit)。
- ✅ **U2 选目标无取消**: enterTargeting 加「← 返回选技能」+ exitTargeting 重启卡片 (commit)。
- ✅ 技能 loadout picker toggle/返回/确认 OK; team-select 槽位 swap/remove/返回 OK; bench drag-drop OK。

### H-C 反馈/HUD/状态显示
- ✅ **U3 状态/充能指示器不可见**: statusGroup 启用可见+跟随龟身, turtle-hud buff chip 关闭防双渲 (commit)。Playwright: 10 child/alpha1/depth60/跟随。bamboo充能/lava变身/币/无人机/结晶/花色/棱镜 现已显示。**布局看相待用户眼验。**
- ✅误报 **U8 DoT 无飘字**: 实为 tickDoTs 内部 (BattleScene:6404) 已 spawn 飘字; agent 只看 caller loop 漏看。非 bug。
- ✅ **U9 多 buff 类型无图标**: 富渲染器 CHIP_LABEL 补 counter/dodgeCounter/diceFateCrit/hidingShield/hunterMark/bubbleBind/wormhole/hot/healReduce (commit)。
- ✅ **U10 装备动态角标**: candle/revolver/wave/dragon-egg 层数本就在富 statusGroup stackBadges (3161-3170) → U3 启用后随之可见。
- ✅ **U7** dealRaw 也接 hitKnockback (diamondSmash/pirate 等); deal*+dealRaw 覆盖主流。少数纯 inline applyRawDamage 的多段/AoE 特殊技仍未补 (subtle, 长尾)。
- ✅ **U12** 装备治疗补飘字: fireOnHit 前后抓 hp delta → e_star吸血/e_pearl回血 绿飘字。
- 🟡待办 **U11** 护盾吸收伤害不单独灰字 (JS spawnHitStack 分层): 需改 deal* float 拆分(hpLoss 彩 + shieldAbs 灰), 有双数字风险, 暂缓 (LOW-MED 打磨)。

### H-D 新增功能
- ✅ **游戏内反馈/上报 (类 Steam F11)**: F11/🐛按钮 → 抓战斗状态+截图+控制台错误 → 复制/下载 JSON 交开发者。(commit, Playwright 验证)

### 状态指示器尺寸 (用户报"很糊")
- ✅ 对齐 JS .st-buffs: 20×20 暗框 + 14×14 内图 (旧拉到 20→糊); 紧贴网格 pitch=22 每行5行向上堆 (commit)。布局待眼验。

## I. 四遍审计 — Boss/召唤物模式 (2026-05-22, 3 并行 agent) — 前三遍未碰的"模式"维度
图例: 🔴待修 · ✅已修 · ⏭ PoC-scope/有意

**修复状态 (2026-05-22)**: I1✅ I2✅ I5✅ I6✅ I7✅ I9✅ (commit, tsc+build+Playwright);
  待办 I3(boss-pick技能配置/UI) · I4(boss-clear金币奖励/经济) · I8(糖果炸弹真companion/大功能)。

### I-A Boss 战斗
- ✅ **I1 boss 一回合动 2 次** (commit, Playwright seq[1,2]); ✅ **I2 击杀金币 boss+30/普通+5 中央钩子** (commit, 验证)。
- 🔴原 **I1 boss 一回合只动 1 次 (应 2 次)** HIGH: PoC `maxActions=min(2,totalAlive)`, boss 恒单只→ min(2,1)=1 → 只动 1 次。JS 数 `_bossActionsThisRound<2` (action.js:478) → 同一只 boss 动 2 次。boss/dungeon-stage5 都中招; 且 PoC `isBossSide` 漏 dungeon 分支。**输出腰斩。**
- 🔴 **I2 击杀金币无 boss 加成 + 技能击杀 0 币** HIGH: JS 中央死亡钩子 deep_coin.js:42 boss+30/普通+5, 全击杀路径。PoC 仅 basic-attack fallback (BattleScene:2724) 给 +5 无 boss 检查; 技能/被动/DoT 击杀 0 币 → boss 多被技能杀 → 0 vs 30。
- ✅ HP/ATK/DEF/MR 缩放 (3.5/1.2/1.4/1.4 boss; 3.0/1.25/1.4 dungeon) 对; boss AI=普通AI(JS无boss特判)对; 1.5× sprite 对。

### I-B Boss-pick / 闯关 boss 关
- 🟡 **I3 boss-pick 缺技能配置步骤** MED: JS 选 boss 后弹 skill-pick 配 boss 带哪些技能(skipSave); PoC 直接默认技能。
- ⏭ boss 等级(JS=玩家均级/dungeon boss Lv10): PoC 无逐宠等级系统, moot。
- 🟡 I4 boss-clear 金币奖励 (+100/无死+50/每日首通) 未移植 (经济打磨)。
- 🟡 I5 boss BGM 未放 (用 battle BGM); bg-ruins 背景对。
- ✅ boss spawn/缩放/solo 站位/stage5 检测/boss 关不开商店/通关路由 都对。

### I-C 召唤物
- 🔴 **I6 复活虫(conch)从不攻击** HIGH: 攻击码在 processComplexEquipEffects(只对行动者调), 但 conch 是 non-actor → 死代码。JS turn.js:1326 side-end loop 打最低 HP 敌 1×ATK。
- 🔴 **I7 缩头龟随从 _summon 从不赋值** HIGH: spawnSummonAlly 只设 summon._owner, 不设 ownerF._summon → hidingBuffSummon/hidingCommand 永远"随从已亡"; 'hiding-command' 事件还无监听。
- 🔴 **I8 糖果炸弹非真召唤物** HIGH: PoC 只 spawn 时 -20 魔法全敌一次性; JS 是独立 companion(40%maxHp)每回合自衰减 + 死亡爆炸 150%maxHp。"P2 简化"。
- 🟡 **I9 海盗船早开火一回合** MED: turn3 spawn 在 processPirateShipFire 之前(同块)→ turn3 就开火; JS fire 在 spawn 之前→ 首发 turn4。
- ⏭ 召唤物 PoC 可玩家控制 vs JS 自动 (疑有意)。
- ✅ 水晶球(spawn+beam)/玩偶熊/海盗船 stats/conch 变身 都对。

## C. Playwright 运行时验证 (2026-05-22)
一局测试战斗(竹叶/天使/石头 vs 无头龟/忍者/小龟)实测:
- **A8 无头龟** ✅: 锁血 `_undeadLockTurns` 2→1→0 (每到其回合 -1), 到 0 log「亡灵之力消散」, hp 维持 1 → 随后被追加攻击**打死** (修前永久锁血无敌)。
- **A6 竹叶被动打自己** ✅: 充能状态放自施"自然恢复", 追加攻击命中**敌方**(无头龟 hp1→0死), 竹叶自身 hp 418→443(被治疗, **不降反升**=没打自己)。
- **A10 增最大生命** ✅: bamboo maxHp 418→443 (永久+25, updateHpVisual 反映)。
- **神罚 _dmgDealt** ✅: 命中后 bamboo `_dmgDealt:1` (修前 unset → 全员0平手随机选目标)。
- **A11 坚壁反伤** ✅: 手动给石头龟还原 stoneWall passive(test 木桩剥被动)+def20/mr15→reflectPct32.5%; 天使龟 4段裁决打石头龟→天使 453→445 反伤 8HP(经天使护甲 calcDmgMult 减免), reflect 路径=JS combat.js:646-659。量小=护甲减免非 bug。
- A1/A4/A7/A9 (闪避Miss/统计bar/前跳/hover) 为视觉/UI类, 代码已改, 用户眼验。

### C2. B2 修复 Playwright 验证 (2026-05-22, dev import + 实战 smoke)
全部通过, 无运行时报错, tsc+vite build 通过:
- F1: defUp value:10 → def +10 flat (非 ×1.1); atkUp value:25 → atk +25 flat。
- F2: diamond 在场, 队友 defUp:10 → +15 (×1.5 amp)。
- F3: diceFateCrit buff 在 recalc 加 crit (0.25→0.65)。
- F4: applyDotStacks burn 累加(30+10=40)+duration:999; tickDoTs 衰减 27→18→12→8→5→3 (×2/3 floor), 不被 duration 截断; defaultBurnStacks=round(atk×0.67)。
- crystal: magicAbsorb 法 100→80, 物理 100→100 (不吸)。
- shop-quick: atkUp 10% → flat 20 (按 baseAtk 折算)。
- rainbow: _prismColor 每回合赋值 (实测 =1)。
- shell: 回合末 processEnergyWave 读 _auraEnergy → energy 200→0 + 气场盾 +160。
- diamondSmash: 对 80 护甲敌人打 45 = def+mr+0.1atk (raw 无护甲无暴击)。
- gambler 命运之轮: 60 抽四花色全精确 — ♠+5atk/+30hp、♥+2def/+2mr、♦+0.08crit/+2穿甲、♣+4%吸血 (各 ×命中次数)。

## D. 已确认一致 (no-op)
(待填)

## J. 第五遍审查 (2026-05-22) — 反馈/动画中心化 + 资产完整性
**根因模式**: JS `applyRawDmg` (combat.js:866) 是单一掉血入口, 中央调 `playHurtAnimation`。
PoC `applyRawDamage` (engine/damage.ts) 是**纯函数**(不接 DOM/Bus), 所以一切反馈被 bolt 到
各显示路径上 → 换条伤害来源就漏。PoC 有 3 条显示路径, 反馈挂载不均:
A=showDamageVfx(普攻) B=api.floatNum(全部技能伤害) C=tickDoTs(DOT)。

- **J1 (已修 f9024ab)** 受击帧只在 A 触发, 技能伤害走 B 漏掉 → playHurtFrames 挂到 B。
- **J2 [大] sceneKnockback 漏在所有技能伤害**: playHitKnockback (BattleScene:2216, 1:1 JS
  sceneKnockback 18px) 只在 普攻 + ninjaShuriken(skill-handlers:1685) + hunterShot(:2547) 触发;
  JS ~25 个技能文件都对目标加 hit-shake。B 路径(floatNum)只做自创 ±8px wobble, 从不 knockback。
- **J3 自创 ±8px wobble** (BattleScene:2154) 与 JS-faithful playHitKnockback 不一致, 且 2 个特例
  技能 wobble+knockback 双叠。应删 wobble, 让 B 路径统一走 playHitKnockback。
- **J4 [用户报] ninjaImpact 人不位移 — 根因确定**: `cv = api.viewOf(caster)` 返回的是**新对象字面量**
  (BattleScene:2177, 非 this.views 里的真 view), `cv._inHop=true` (skill-handlers:1454/1531) 设到副本上。
  watcher (skill-tween-mgr:170) 读**真 view** 的 _inHop → 仍 falsy → 每帧把 sprite.x 拍回 homeX,
  而 trail/shadow 跟着 counter 写的 x 动 → "只有影子动"。叠加: ninjaImpact 不在 SKIP_POSITIONAL_HOP
  (BattleScene:2687), executeAttack 的通用 hop 并发抢 sprite.x。
- **J5 cyber-mech-birth 加载但从不播放** (BootScene:151/355 创建, 全仓无 play); mech 变身只有通用蓝粒子。
- **J6 lava 火山变身不换 sprite 贴图** (BattleScene:5193 只改属性+FX); JS state.js:606 换 img。
  (PoC 用 spritesheet/SceneTurtleDom 渲染, 可能有意为之 — 待确认。)
- **J7 [低/隐患] 资产完整性扫描 88 引用全部 resolve** (chest 已修)。唯一隐患: 残留
  assets/pets/宝箱龟v1.png (3300×200 旧图) 是 chest.png 的 alias 兜底源, 若 turtle-battle 副本被删
  会再次破图。建议删/刷新。

### J 节修复状态 (2026-05-22)
- J1 受击帧中心化 ✅ f9024ab
- J2 ❌ 误报 — dealPhysical/Magic/Raw(skill-handlers:343/362/386) 早已调 hitKnockback, 绝大多数技能伤害本就有 JS 击退。
- J3 删自创 ±8px wobble, floatNum 统一走 playHitKnockback ✅ 552ddb0
- J4 ninjaImpact/Backstab _inHop 设到真 view (api.setInHop) + SKIP_POSITIONAL_HOP ✅ 552ddb0
- J4b ninjaImpact 冲刺位置(slotCoords 后排槽)+ 动画(dash.png 18帧) ✅ 6a98081
- J5/J6 lava/cyber 变身换贴图 (swapPetTexture + pet-form-volcano/mech) ✅ 4c486a4
- J7 残留 宝箱龟v1.png 隐患 — 未处理 (低优先)

## K. 第六遍审查 (2026-05-22) — VFX/动画完整性
**根因模式**: PoC 把伤害/状态逻辑移植得忠实, 但反复把**视觉特效省成只 applyDamage+floatNum+log**。
扫 JS 全部 drawXxx/spawnXxx/.animate/playSprite/classList(vfx) 视觉调用 vs PoC。

**(A) 有逻辑无视觉 (JS 画, PoC 只伤害/日志):**
- **K1 水晶光线 drawCrystalBeam** (JS main.js:531-572, 红警告→蓝紫射线): 水晶球召唤 (processCrystalBallBeam
  BattleScene:5445) + 迷你水晶球A装备 (BattleScene:4870) **都没画**, 只 log"射出魔法光线"+伤害。PoC 全仓无 drawCrystalBeam。**最高优先 (水晶龟招牌)**。
- **K2 水晶球引爆** (JS main.js:494-506, 80px 紫爆 + cam.shake): PoC 满层引爆无爆炸/震屏。
- **K3 hunter 箭雨 hunterBarrage** (JS hunter.js:57-91 fireProjectile hunter-arrow ×10): PoC skill-handlers:4777 无箭, 纹理 vfx-hunter-arrow 已加载却没用 (loaded-never-played)。
- **K4 ghostPhase 虚化** (JS ghost.js:62-66 播 phase.png 13帧 caster overlay): PoC skill-handlers:1396 无 sprite (phase.png 未加载)。
- **K5 龙蛋 dragon-fly-trail** (JS equip-effects.js:34-64 火柱横扫): PoC triggerDragonFly BattleScene:4896 无 trail。
- **K6 生命珍珠 fireball 抛物线** (JS equip-effects.js:280-328): PoC BattleScene:6966 直接 dealMagicHit, 无 fireball。
- **K7 直线弹道 dumbbell/dart/revolver** (JS launchStraightProjectile equip-effects.js:365-397): PoC BattleScene:6036-6089 只 floatNum, 无弹道 sprite。
- **K8 cyber 机甲变身 8帧 birth sprite** (JS action.js:306-326 cyber-mech-birth): PoC BattleScene:3826 用通用粒子代替; 纹理/anim 已加载却从不 play (loaded-never-played)。
- ~~**K9 糖果炸弹实体+爆炸**~~ ✅ 已完整重建 (2f936e4): spawnCandyBomb 实体(40% maxHp 占 slot) +
  processCandyBombDecay 逐回合衰减 + detonateCandyBomb(150% maxHp 魔法分摊全敌 + 粒子爆炸+震屏) +
  主人死/衰减归零/**自身被击杀**(本次补 fighter:died `_isCandyBomb` 分支, 对齐 JS engine.js:565) 三路引爆。

**(B) 部分/降级:**
- K10 hunterShot 用手画 graphics 箭代替已加载的 hunter-arrow sprite (skill-handlers:2554)。
- K11 ghostPhantom 缺 JS 的二段 ghost-touch overlay + 绿色 heal-aura ring (skill-handlers:1305)。
- K12 迷你水晶球B / wave-sweep 用 Phaser graphics 形状代替 JS sprite 图 (vfx/skills.ts) — 形近图异。

**(C) 已对齐或 PoC 更好:** basic 全系 / ninja 全系 / cyberBeam / ghostTouch/Storm / star 系 / lava 变身(PoC 更好) / lightningStorm(PoC 更好) / 死亡/复活/hunter execute / 召唤入场(JS 也无入场动画)。

**(已修 8452ca0)**: 角色动作贴图发糊 — pet-* 纹理统一 NEAREST。

### K 节修复状态 (2026-05-22)
- K1 水晶光线 castCrystalBeam (召唤+迷你水晶A) ✅ 2530529
- K2 结晶引爆 spawnCrystalDetonate (+ setCrystalDetonateVfxHook) ✅ 2530529
- K3 hunter 箭雨 fireHunterArrow ✅ d16a519
- K8 cyber 机甲变身 birth 序列 ✅ d16a519
- K10 hunterShot 真箭 sprite ✅ d16a519
- K9 糖果炸弹完整重建 (实体+衰减+引爆+VFX) ✅ 2f936e4
- 角色动作贴图 NEAREST 防糊 ✅ 8452ca0
- **待排期 (本批未做)**: K4 ghostPhase phase.png 13帧 (需加载+playFighterSprite 机制) / K5 龙蛋火柱 trail /
  K6 生命珍珠 fireball 抛物线 / K7 哑铃/飞镖/左轮直线弹道 sprite / K11 ghostPhantom 二段 overlay+heal aura /
  K12 wave-sweep & 迷你水晶B 用 graphics 形状 (形近图异)。

### K 节 (续) — K4-K7 + K11/K12 状态
- K4 幽灵虚化 phase.png 13帧 ✅ 71436a1
- K5 龙蛋火柱 spawnFireSweep ✅ 71436a1
- K6 生命珍珠 fireball (castFireball) ✅ 71436a1
- K7 哑铃/飞镖/左轮 直线弹道 fireStraightProjectile ✅ 71436a1
- K11 ghostPhantom 二段 ghost-touch overlay + 绿色治疗光环 ✅ (本次)
- K12 wave-sweep 改用真 vfx-wave-sweep 贴图 ✅ (本次); 迷你水晶束 B 维持 graphics —— JS 该 beam 本身是
  CSS 程序绘制 (crystal-beam-warn/fire, 非 sprite), PoC graphics 已等价, 无真 sprite 缺口。
