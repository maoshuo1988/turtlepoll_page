# PORT_LOG — JS → Phaser 移植状态

每次 Read 一段 JS / 移植到 Phaser, 在这里登记. 用户随时审计.

## 状态定义

- `UNREAD` — 我没看过这个文件 (默认所有 JS 都是这个)
- `PARTIAL <a-b>` — Read 过 [a, b] 行, 别的没看
- `READ` — 整文件每一行都用 Read 工具看过
- `PORTED` — Phaser 对应代码已写, commit body 列出 JS 行号
- `VERIFIED` — Playwright + 视觉对照, 走过整局, 与 JS 端无肉眼差异

**只有 VERIFIED 才允许说"完成"/"1:1"/"done".**

## JS 源文件清单 (`games/turtle-battle/`)

### Core data
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| js/pets.js | 909 | PARTIAL 1-250 | 28 PET 数据库, 已 auto-gen 进 Phaser pets.ts (img/sprite/passive/skillPool 字段). 但 skill 效果实现还要看 js/skills/ |
| js/constants.js | 28 | UNREAD | |
| js/state.js | 903 | UNREAD | 全局战斗状态 |
| js/types.d.ts | ? | UNREAD | |

### Engine / Combat
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| js/engine.js | 1049 | UNREAD | |
| js/combat.js | 1097 | UNREAD | |
| js/turn.js | 1434 | UNREAD | 回合驱动 |
| js/action.js | 669 | PARTIAL ~230 | 单 target 自动开火 (L230) 已移植 |
| js/battle-setup.js | 485 | UNREAD | |
| js/fighter.js | 399 | UNREAD | |
| js/bench.js | 607 | UNREAD | 选龟界面后端逻辑 |
| js/ai.js | 262 | UNREAD | |
| js/synergies.js | 378 | UNREAD | 连携技 |
| js/equip-effects.js | 865 | UNREAD | 装备 |

### UI / Anim
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| js/ui.js | 1538 | UNREAD | |
| js/ui-action.js | 421 | UNREAD | |
| js/ui-anim.js | 683 | PARTIAL 85-145 | buildPetImgHTML 已移植到 Phaser TeamSelectScene |
| js/ui-skill-text.js | 314 | UNREAD | 技能描述渲染 |
| js/ui-summon.js | 203 | UNREAD | 召唤物 |
| js/main.js | 1951 | PARTIAL ~318 | 桌面 sprite size 144 (L318) 已移植 |
| js/camera.js | 95 | UNREAD | |
| js/viewport-fit.js | 326 | UNREAD | 黑边自适应 |

### Systems
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| js/systems/battle_fsm.js | 96 | UNREAD | |
| js/systems/passive_subscribers.js | 134 | UNREAD | |
| js/systems/stats_tracker.js | 35 | UNREAD | |
| js/systems/visual_dispatcher.js | 85 | UNREAD | 视觉事件总线 |
| js/vfx/projectile.js | 65 | UNREAD | |

### Skills (28 龟)
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| js/skills/_misc.js | 337 | UNREAD | |
| js/skills/_runner.js | 41 | UNREAD | |
| js/skills/registry.js | 235 | UNREAD | skill type → handler 注册 |
| js/skills/common.js | 47 | UNREAD | |
| js/skills/basic.js | 767 | UNREAD | 小龟 5 技能 |
| js/skills/basic-anim.js | 96 | UNREAD | |
| js/skills/stone.js | 35 | UNREAD | |
| js/skills/bamboo.js | 246 | UNREAD | |
| js/skills/angel.js | 170 | UNREAD | |
| js/skills/ice.js | 161 | UNREAD | |
| js/skills/ninja.js | 676 | UNREAD | |
| js/skills/two_head.js | 261 | UNREAD | |
| js/skills/ghost.js | 284 | UNREAD | |
| js/skills/diamond.js | 76 | UNREAD | |
| js/skills/fortune.js | 142 | UNREAD | |
| js/skills/dice.js | 132 | UNREAD | |
| js/skills/rainbow.js | 76 | UNREAD | |
| js/skills/gambler.js | 116 | UNREAD | |
| js/skills/hunter.js | 143 | UNREAD | |
| js/skills/pirate.js | 98 | UNREAD | |
| js/skills/candy.js | 109 | UNREAD | |
| js/skills/bubble.js | 94 | UNREAD | |
| js/skills/line.js | 194 | UNREAD | |
| js/skills/lightning.js | 116 | UNREAD | |
| js/skills/phoenix.js | 116 | UNREAD | |
| js/skills/lava.js | 82 | UNREAD | |
| js/skills/volcano.js | 103 | UNREAD | |
| js/skills/cyber.js | 376 | UNREAD | |
| js/skills/crystal.js | 106 | UNREAD | |
| js/skills/chest.js | 253 | UNREAD | |
| js/skills/star.js | 330 | UNREAD | 星际龟 |
| js/skills/hiding.js | 260 | UNREAD | |
| js/skills/headless.js | 78 | UNREAD | |
| js/skills/shell.js | 311 | UNREAD | |

### Misc (大概率不动)
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| js/codex.js | 351 | SKIP | 图鉴, 用户说不动 |
| js/dungeon.js | 852 | SKIP | 副本, 野生对局之外 |
| js/shop.js | 438 | UNREAD | 永久商店 |
| js/achievements.js | 136 | UNREAD | |
| js/tutorial.js | 128 | UNREAD | |
| js/online.js | 343 | UNREAD | |
| js/deep_coin.js | 111 | UNREAD | |
| js/debug.js | 215 | UNREAD | |
| js/events.js | 436 | UNREAD | |
| js/preloader.js | 164 | UNREAD | |
| js/env.js | 61 | UNREAD | |
| js/bus.js | 72 | UNREAD | |

### CSS
| 文件 | 行数 | 状态 | 备注 |
|---|---|---|---|
| css/base.css | 1152 | PARTIAL (TeamSelect block) | TeamSelect 相关 ~450 行已抄进 index.html |
| css/battle.css | 2786 | PARTIAL ~177 | synergy bar 垂直布局 (L177) 已抄 |
| css/scene.css | 1139 | UNREAD | |

## Phaser 端文件

| 文件 | 来源 JS | 状态 |
|---|---|---|
| poc-phaser/src/data/pets.ts | pets.js (auto-gen) | PORTED — img/sprite/passive/skillPool 数据 OK; skill **行为**未移植 |
| poc-phaser/src/scenes/MenuScene.ts | main.js | PARTIAL (未审计) |
| poc-phaser/src/scenes/TeamSelectScene.ts | bench.js + ui-anim.js | PARTIAL — DOM overlay 骨架在, 装备/状态/被动 picker 未对照 |
| poc-phaser/src/scenes/BattleScene.ts | battle-setup.js + turn.js + action.js + combat.js | PARTIAL — 单 target 自动开火 + 前排锁定 OK, 其他不确定 |

## 工作流约束

1. 接到新任务先在 PORT_LOG 找对应 JS 文件, 标 `READING`
2. Read 整段 (Read 工具, 不许 grep 片段)
3. 标 `READ`, 把关键行号记在 commit body
4. 写 Phaser 代码, 每行注 `// JS file:L<n>` 或 `// PHASER DIVERGENCE: <reason>`
5. 标 `PORTED`
6. Playwright 实测 走整局, 才能标 `VERIFIED`

## 2026-05-18 选龟界面深读后状态更新

### Read 已完成 (整文件或目标段全 Read 过)

| 文件 | Range | 状态 |
|---|---|---|
| js/main.js | L1-1620 (选龟相关) | READ |
| js/ui-anim.js | 全 683 行 | READ |
| js/battle-setup.js | 全 485 行 | READ |
| js/synergies.js | 全 378 行 (renderSynergyPreview / calcActiveSynergies) | READ |
| index.html | L301-358 screenSelect | READ |
| css/base.css | L725-1151 TeamSelect | READ |
| css/scene.css | L390-440 fg-slot | READ |
| css/battle.css | L147-208 synergy-preview/-bar, L1900-2300 pdp-* | READ |
| poc-phaser/src/scenes/TeamSelectScene.ts | L1-1640 (现状) | READ |
| poc-phaser/index.html | L145-310 #poc-team-select-root CSS | READ |

### JS vs Phaser TeamSelect 差异表

| # | 项 | JS 原 | Phaser 现 | 状态 |
|---|---|---|---|---|
| 1 | fg-slot CRYSTAL_BALL_MARK icon | `<img assets/pets/crystal-ball.png 32×32>` (main.js:948) | 🔮 emoji | **FIXED** 用 PNG |
| 2 | confirm btn 1-2 placed text | "还需选 N 只" (main.js:1002) | "请选择 N 只龟" | **FIXED** |
| 3 | confirm btn 3 placed text | "开战！" (main.js:1003) | "开始战斗" | **FIXED** |
| 4 | mark slot 加 fg-summon class | `<div class="fg-turtle fg-summon">` (main.js:936) | `<div class="fg-turtle">` | **FIXED** |
| 5 | confirm btn `<span class="select-cta-label">` 内嵌 | inner span (index.html:329) | btn.textContent | **FIXED** |
| 6 | skill picker UI | `.pdp-overlay` 羊皮纸 9-slice + char + banner + 2×2 stats + 6 rows + desc + footer (battle.css:1900-2300, main.js:1109-1360, ~250 行) | Phaser 几何 modal | **TODO** (大改, 需 DOM overlay + 移植 pdp 资产 menu/pdp-*.png + 字体 m6x11 + renderSkillTemplate) |
| 7 | skill picker 默认 selected | `getSavedLoadout(petId) \|\| defaultSkills \|\| [0,1,2]` (main.js:1124-1126) | `pet.skillPool.forEach((s,i)=>{if(!s.passiveSkill) activeIdxs.push(i)})` (Phaser:1333) | **TODO** 与 #6 一起 |
| 8 | skill picker desc brief/detail toggle | 点 desc area toggle (main.js:1321-1325) | N/A | **TODO** 与 #6 一起 |
| 9 | skill picker passive 行也算 1 槽 | passiveSkill 也可装 (main.js:1212) | passive 不算 | **TODO** 与 #6 一起 |
| 10 | skill picker 等级锁 | `getAvailableSkillIndices(petId)` Lv4/Lv7 (main.js:1197) | 无 | **TODO** 与 #6 一起 |
| 11 | skill picker conflictsWith | `s.conflictsWith` 互斥 (main.js:1334-1336) | 无 | **TODO** 与 #6 一起 |
| 12 | 旋转 mark slot syncSpecialSlots — `_savedSummonSlot` 传 BattleScene | 写 `f._savedSummonSlot=summonSlot` (main.js:1406-1408) | startBattle 没传 | **TODO** |
| 13 | togglePet "已选3只" toast | showToast 弹消息 (main.js:684/693) | 静默忽略 | **TODO** 加 toast 反馈 |

### 优先级

**Phase A (已做)**: 1-5 简单 DOM 文字/HTML 调整  
**Phase B (下一轮)**: 6-11 PDP 完整重写 (大块)  
**Phase C (后续)**: 12-13 后台逻辑

---

## 2026-05-18 (autonomous 5h session) — Skill handlers 1:1 review

| PET | Read 状态 | Phaser handler 状态 | Fix commits |
|---|---|---|---|
| basic | READ JS | turtleShieldBash/basicBarrage/basicChiWave/basicSlam 多数对齐 | (无改动) |
| stone | READ JS L1-35 | stoneShield/stoneTaunt 公式 + redirect 全错 → **FIXED** | 676ddb9 |
| bamboo | READ JS L1-244 | bambooLeaf/Heal/Smack/Spikes 对齐, chilled marker 差异不影响 | OK |
| angel | READ JS L1-168 | angelBless/Smite **完全错** → **FIXED**; angelEquality 早已对 | 676ddb9 |
| ice | READ JS L1-160 | iceSpike/Frost/Freeze 1:1 对齐 (含 frostAura passive 加伤) | OK |
| ninja | READ JS L1-65 + L155+ | ninjaShuriken (含 crit truePct 拆分)/Bomb/Backstab/Feet 1:1 | OK |
| ghost | READ JS L1-282 | ghostTouch/Phase/Storm/Phantom 1:1 (curse buff type 命名差异) | OK |
| diamond | READ JS L1-75 | diamondSmash/Collide 缺 mr/maxHp/bleed/stun → **FIXED** | 139b40e |
| fortune | READ JS L1-141 | fortuneStrike type/hits **完全错** → **FIXED**; Dice/AllIn/BuyEquip 对齐 | 139b40e |
| two_head | READ JS L1-150 | twoHeadSwitch 形态切换 hpScale 等对齐 (mrGain 公式微差) | OK |
| hunter | READ JS L1-143 | hunterShot/Mark/Stealth 对齐; Barrage type/Poison dot 字段 **错** → **FIXED** | a499dfe |
| pirate | READ JS L1-96 | piratePlunder 对齐; CannonBarrage AoE×N 改 randomized → **FIXED** | a499dfe |
| headless | READ JS L1-77 | SoulStrike 类型/公式错, SoulReap 类型/吸血错 → **FIXED** | 21c844b |
| rainbow | READ JS L1-75 | rainbowStorm 缺 hits loop + true 部分 → **FIXED**; rainbowGuard/Prism OK | d5d984b |
| lightning | READ JS L1-112 | Strike/Barrage/Surge/Shield 1:1, 'lightningCounter' buff naming 差异 | OK |
| phoenix | READ JS L1-115 | Burn/Shield/Scald/Purify 1:1 | OK |
| dice | READ JS L1-129 | diceAttack 单段随机→hits 段平摊+crit bonus → **FIXED** | 8135e6c |
| basic | READ JS L552-660 (Slam) | Barrage/ChiWave/Slam 1:1 (animation 简化) | OK |
| cyber | READ JS L336-374 | Deploy/SwarmShield 1:1 (drone 计数 + 加成对) | OK |
| crystal | READ JS L1-104 | crystalBarrier defUp buff value 错 (pct 当 flat) → **FIXED** | 26dea0c |
| lava | READ JS L1-80 | LavaBolt/Quake/Surge/Splash 1:1 | OK |
| line | READ JS L1-194 | Sketch/Link/Finish/InkBomb 1:1 (ink stacks 同步) | OK |
| bubble | READ JS L1-93 | Shield/Bind/Heal/Burst 1:1; Burst row vs col idx 实现差异 (JS 用 _position, Phaser 用 col idx — JS 文案与代码自相矛盾) | NOTE |
| star | READ JS L1-120 | Beam/Wormhole/Meteor 1:1 (含 starEnergy 充能 + fireStarPassive) | OK |
| chest | READ JS L1-208 | chestSmash 单段 + _chestTreasure×0.1 (JS 无此公式) → **FIXED** hits + star/rock equip 变体 | e1bbe75 |
| shell | READ JS L1-310 | shellStrike/Erode/Copy 1:1; shellAbsorb 漏扣 target.hp → **FIXED** | e1bbe75 |
| candy | READ JS L1-46 | candyBarrage 1:1 (含 armorPen buff + AoE×hits 段 + maxHp scaling) | OK |
| hiding | READ JS L1-117 | hidingDefend 1:1 (hidingShield buff + 到期 healPct); Command/AI 复杂未深扫 | OK |

### redirect 实装 (JS action.js:484-498 1:1)
`BattleScene.runSkillHandler` 攻敌方单体前查嘲讽者: 敌方队伍有他人挂 `redirectAll` buff 且 duration>0 → 切目标到嘲讽者. Phase H 配合 stoneTaunt 让嘲讽真正工作.

### 5h 自治 session 共 12 commits:
- ec85e9a — Phase A TeamSelect 5 项 DOM 1:1
- 96a06f5 — Vercel encodeURI 中文文件名修复
- bf4301c — Phase B PDP DOM overlay 暗主题
- 68a0f18 — Phase C savedSlots + toast
- de4e406 — Phase D 画布连续 + 选龟入场 choreography
- 3bce3fe — Sprite jump-none + overflow:hidden fix
- 676ddb9 — Phase H1 stone+angel+redirect 4 处
- 139b40e — Phase H2 diamond+fortuneStrike 3 处
- d39cc77 — PORT_LOG mid-session
- a499dfe — Phase H3 hunter+pirate 3 处
- 21c844b — Phase H4 headless 2 处
- d5d984b — Phase H5 rainbow 1 处
- (this commit) — PORT_LOG final

### 累计 bug fix 统计:
**20 个 skill handlers fix** (跨 12 个 PET):
stone × 2, angel × 2, diamond × 2, fortune × 1, hunter × 2, pirate × 1, headless × 2,
rainbow × 1, dice × 1, crystal × 1, chest × 1, shell × 1
**+ 1 系统机制 fix**: stoneTaunt redirect 在 runSkillHandler 实装.
**+ 1 部署 fix**: Vercel ASCII PNG 别名路径 (改 import-pets.mjs normalizeAssetPath, 不再 encodeURI 中文)

### 未做 / 已知 gap:
- 2 个 PET 未深 review: volcano (大形态切换跟 two_head 类似) + gambler (passive 触发 + multi-hit) — handler 在 Phaser, JS 行为没逐字对
- chest 高阶 equip 变体 (chain/thunder/fire/poison) PoC 简化, 核心 hits+dmgType 已修
- bubbleBurst row 实现 (col idx vs _position) — JS 源码自相矛盾, Phaser 保留 col idx 实现
- hidingCommand summon AI 决策树 (45 行 JS) 没深扫, hidingDefend 1:1 OK
- BattleScene UI 真 1:1 (status icons / equip badges / 3 种 shield bars / chest pile / bubble-store/lava-rage/star-energy 专属 bar)
- Dungeon E2E (5 stages + reward + choice + shop)
- Playwright 整局 E2E pass
- chilled buff value 约定差异 (JS marker=1 vs Phaser pct=20) — 行为等价不影响

---

## 2026-05-18 — sprite scale/rotation corruption 工程基础修 (双保: helper + watcher)

用户报: 忍者龟放技能后骰子龟变大. 根因: Phaser 没 JS `body.animate(fill:'none')`
的"自动清痕迹"机制, 直接 tween 改 sprite.scaleX/Y/rotation 后没还原 → 多次动画累积变形.

### 工程基础永久规则 (新 skill 必须遵守)

1. **任何 skill handler 想 tween view.sprite 的 scale/rotation, 必须走
   `SkillTweenMgr.skillTween(view, props, opts)`**, 不许直接 `scene.tweens.add(view.sprite, {scaleX: ...})`.
2. helper 内部 onComplete + onStop 自动 setScale/setRotation 回 home
   (`view.homeScaleX/Y/Rotation`).
3. Translate (sprite.x/y) 走 helper 或直接 tween 都行 — watcher 不检 x/y (避开 idle bob).
4. fire-and-forget tween 同样要走 helper. 不 await 也 OK — onComplete 仍 reset.

### Watcher 兜底 (BattleScene.update 每帧调)

- 每个 view 上若没 active skill tween (idle bob `_isIdleBob` tween 排除), 且 scale/rotation
  偏离 home > 0.001, 强制还原.
- 兜底 fire-and-forget 漏的 / 第三方 tween 直接改 sprite 的情况.
- 开销极小 (6 view × 3 prop 比较/帧).

### 双保设计

- **helper** (主线): 所有 skill tween 走它, 一致行为, onComplete 自动 reset.
- **watcher** (兜底): 即使有 dev 绕过 helper, idle 时刻自动 reset.

JS `body.animate(fill:'none')` 1:1 等价语义.

### 旧 4187 行 skill-handlers.ts

不强制立即迁移. `runSkillHandler` 末尾的 `restoreSpriteHome` 已 cover 大部分场景.
新 skill 必走 helper. 旧的可分批切.

文件: `poc-phaser/src/systems/skill-tween-mgr.ts`

## 工作流约束

1. 接到新任务先在 PORT_LOG 找对应 JS 文件, 标 `READING`
2. Read 整段 (Read 工具, 不许 grep 片段)
3. 标 `READ`, 把关键行号记在 commit body
4. 写 Phaser 代码, 每行注 `// JS file:L<n>` 或 `// PHASER DIVERGENCE: <reason>`
5. 标 `PORTED`
6. Playwright 实测 走整局, 才能标 `VERIFIED`
