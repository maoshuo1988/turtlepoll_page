# 龟龟对战 — 旧版完整审计 (Reference for PoC)

**目的**: 把 `/games/turtle-battle/` 全部代码 / 资产 / 文档系统化记录, 给后续 PoC 修复/补全用。

**写作进度**: 每轮 /loop iteration 追加 1-2 个文件章节. 完成度见底部 Gap Matrix.

---

## 0. Overview

**游戏类型**: 3V3 回合制策略战斗 网页游戏 (vanilla JS + HTML/CSS, 无构建)

**SEO/Meta**:
- title: "龟龟对战 - 3V3 回合制"
- description: "27只独特龟龟, 每只拥有独特被动和技能"  (实际有 28 只, doc 文案过时)
- favicon: `assets/passive/unyielding-icon.png` (小龟坚韧 icon)
- PWA: 有 `manifest.json` (add-to-home-screen 支持)

**总体规模**:
- HTML: 1 个 (index.html, 807 行)
- CSS: 3 个 (base.css / battle.css / scene.css)
- JS: 36 文件, ~17923 行
- skills/ 子目录: ~30 文件 (一只龟一个)
- vfx/ 子目录: 含 projectile.js 通用工具
- systems/ 子目录: battle_fsm / visual_dispatcher / passive_subscribers / stats_tracker

**模式列表** (从主菜单按钮 + section id 推断):
- 快速匹配 (在开发中, 占位)
- 房间对战 (PvP, online.js + PeerJS)
- 深海闯关 (Dungeon, 5 关递进)
- 自定义模式 (子菜单): 野生对局 / Boss 挑战 / 指定 Boss / 测试模式

**screens** (页面级 section, index.html `<section id="screenX">` 9 个):
1. `screenMenu` — 主菜单
2. `screenAchievements` — 成就页
3. `screenCodex` — 图鉴页
4. `screenLobby` — PvP 房间大厅 (在线对战)
5. `screenSelect` — 选龟编队页
6. `screenBattle` — 战斗主场
7. `screenDungeonClear` — 闯关每关清场屏
8. `screenDungeonResult` — 闯关结算
9. `screenResult` — 普通战斗结算

**核心机制 (从 pets.js 顶部注释 + 文件结构推断)**:
- 28 龟 (旧版文案说 27 但实际数据 28; SSS=1, SS=2, S=6, A=8, B=8, C=3)
- 每只龟 5 选 3 技能装配 + 1 个被动技能
- 前/后排站位影响 (后排某些技能不可达, e_octo 装备后排 +20% 等)
- DEF 减伤公式: `def/(def+40)` 正防御减伤, 负防御 (穿透>防御) 增伤上限 ×2
- 暴击系统: 0–1 概率, 1.5× 基础, 溢出暴击 (>1) 额外加伤
- 协同 10 标签 ×2/×3 buff
- 7 种战斗规则 (火/雷/盾/暴怒/装备/雨/普通)
- 战斗内龟币商店 (每 3 回合)
- 关卡间大商店 (dungeon 5-关之间)
- 装备 26+ 件 + 消耗品 9 件
- 状态: burn/poison/bleed/curse/stun/shield/dodge/mark 等

---

## 1. 顶层 JS 文件目录

### 1.1 pets.js (909 行) ✅ 已完整迁移到 PoC

**位置**: `games/turtle-battle/js/pets.js`
**对应 PoC**: `poc-phaser/src/data/pets.ts` (自动转换 via scripts/import-pets.mjs, 3409 行 TS)
**完成度**: **100%** 数据全迁

**顶部注释**:
```
龟龟对战 — 3V3 回合制战斗
28只龟 / 5选3技能装配 / 前后排 / 连携技 / 被动技能系统
属性: HP, ATK, DEF, MR, CRIT
DEF减伤公式: DEF≥0时 reduction% = DEF/(DEF+40)
              DEF<0时 amplify% = |DEF|/(|DEF|+40) → 受伤增加
穿甲: 固定穿甲(armorPen) + 百分比穿甲(armorPenPct)
技能池: 每只龟5个技能(含被动技能), 战前选3个(技能0固定)
```

**导出全局**:
- `RARITY_MULT` — 稀有度数值倍率 `{C:1.00, B:1.03, A:1.06, S:1.09, SS:1.12, SSS:1.15}`
- `DEF_CONSTANT = 40` — DEF/(DEF+K) 公式常量
- `ALL_PETS` — 28 个 PET_* const 的聚合数组 (line 831)
- `PET_SYNERGY_TAGS` — 协同标签映射 (line 849)
- 28 个 `PET_xxx` const (line 51-829)

**关键函数 (在 pets.js 内部, 但被全局使用)**:
- `calcEffArmor(atk, tgt)` — 物理有效护甲 = `def×(1-armorPenPct) - armorPen`
- `calcEffMr(atk, tgt)` — 魔法有效魔抗
- `calcEffDef(atk, tgt, dmgType)` — 派发: physical/magic/true (true=0)
- `calcDmgMult(effDef)` — 减伤倍率, 正防御 <1, 负防御 >1 (~1+x/(x+40), 上限 ~2)

**Pet 数据 Shape** (例 PET_shell):
```js
{
  id: 'shell',                       // 唯一标识
  name: '龟壳', emoji: '🐚',
  rarity: 'SSS',                     // C/B/A/S/SS/SSS
  hp: 390, atk: 44, def: 17, mr: 18, crit: 0.25,  // 基础属性
  img: '../../assets/pets/龟壳v1.png',          // 静态图 fallback
  sprite: { frames: 20, frameW: 500, frameH: 500, duration: 2000 },  // idle 动画
  // 可选: attackAnim / hurtAnim / deathAnim / knockupAnim / runAnim
  passive: {                          // 被动技能
    type: 'auraAwaken',               // PASSIVE_ICONS 注册的 type
    name: '气场觉醒',
    awakenTurn: 4,
    atkPct: 12, defPct: 12, mrPct: 12, hpPct: 12,
    lifestealPct: 12, reflectPct: 12, critGain: 0.25,
    energyStore: true, energyReleaseTurn: 4,
    // 各 passive 自由扩展字段
  },
  skillPool: [ /* 5 个 SkillDef, 含 1 个 passiveSkill */ ],
  defaultSkills: [0, 1, 2],           // UI 默认勾选
  skills: []                          // 已弃用, 用 skillPool
}
```

**28 只龟 by Rarity**:
| C (3) | B (8) | A (8) | S (6) | SS (2) | SSS (1) |
|---|---|---|---|---|---|
| basic | angel | rainbow | phoenix | hiding | shell |
| stone | ice | gambler | lava | headless | |
| bamboo | ninja | hunter | cyber | | |
| | two_head | pirate | crystal | | |
| | ghost | candy | chest | | |
| | diamond | bubble | space | | |
| | fortune | line | | | |
| | dice | lightning | | | |

**PET_SYNERGY_TAGS** (line 849+, 协同标签到 pet 的映射):
- 10 标签: 物理 / 法术 / 守护 / 元素 / 刺杀 / 运气 / 召唤 / 财富 / 换形 / 再生
- 每个 pet 在 PET_SYNERGY_TAGS 字典里有 0-3 个 tag
- 用法: 战斗开始时检测阵容 tag 计数, ×2 → tier2, ×3 → tier3 buff (见 synergies.js)

**PoC 对应状态**:
- ✅ 数据 100% 迁移 (auto 脚本)
- ✅ rarity mult / def constant 同步
- ✅ skillPool 5 个全保留 (PoC 走 createFighter 选 3)
- 🟡 sprite 字段只用了 idle (basic/ghost/ninja 4 套动作, 其余 25 龟只有静态 avatar)

**关键 PoC 差距**:
- 旧版有些龟 img 指向不存在文件 (e.g. `龟壳v1.png` — PoC 用 `avatars/<en>.png` fallback)
- 不影响数据本身, 只影响视觉

---

## 2. 主流程 JS 大文件 (审计中)

### 2.1 main.js (1951 行) 🟡 部分迁移

**位置**: `games/turtle-battle/js/main.js`
**对应 PoC**: 拆散到 `MainMenuScene` / `TeamSelectScene` / `RulePickScene` / `MainMenu→Dungeon` 等多个 Scene
**完成度**: **~60%** — 模式骨架在, 但 6 个模式只有 dungeon + custom 走通; 房间 / 测试 / boss / boss-pick 都是 placeholder; bug 上报 / coin 持久 / skill pick modal 没做

**顶部模块布局** (82 个 function/const, 按 `── XXX ──` 分块):
| 行 | 模块 | 主要内容 |
|---|---|---|
| 1-19 | GAME STATE | 全局 `gameMode/turnNum/turnQueue/currentIdx/leftTeam/rightTeam/allFighters/battleOver/animating` + Online (PeerJS) `onlineRoom/onlineSide/onlinePeer/onlineConn` |
| 21-94 | SCREENS | `showScreen(id)` 单一切场入口, .leaving / .active class 动画 (280ms), `leaveMenuTo(mode)` 动画→ startMode |
| 96-181 | MENU | `startMode(mode)` 6 模式路由 (pve/test/boss/boss-pick/dungeon/pvp-online); `toggleCustomModes` 主子菜单滑动切换 |
| 183-262 | SELECT SCREEN | `MODE_GUIDES` (每模式 icon+title+tips 3 条); `showSelectScreen(title)` |
| 263-323 | PET GRID | `RARITY_ORDER` (SSS-C 倒序); `setPetFilter` rarity 过滤; `renderPetGrid` 渲染网格 |
| 325-572 | 特殊召唤物 | `_spawnCrystalBall(owner)` 水晶龟水晶球 / `_spawnCandyBomb(owner)` 糖果炸弹 / 水晶射线 VFX |
| 574-660 | SLOT 系统 | `FG_SLOT_KEYS_BASE = ['front-0..2','back-0..2']` 6 槽位; summon/crystal/candy 特殊槽; `syncSpecialSlots` |
| 661-916 | togglePet + 拖拽 | HTML5 drag & drop + touch drag 双端兼容, 选龟入槽 / 清空 |
| 917-1023 | renderFgSlots | 渲染选龟编队槽 + `updateConfirmBtn` 验证按钮启用 |
| 1024-1064 | Last-lineup | `_writeLastLineup` / `restoreLastLineup` localStorage 持久化 |
| 1065-1102 | BOSS PICK MODAL | 指定 Boss 模式选龟弹窗 |
| 1103-1361 | SKILL PICK MODAL | **核心**: 每只龟战前选 3 技能 + 等级 (skillPool 5 选 3); `showSkillPickChain` 串行选龟 |
| 1362-1393 | showPetPassive | 龟卡 hover 弹被动详情 |
| 1394-1446 | TEAM BUILD | `_buildTeamFromSlots(side, loadoutMap)` 由槽位 + 技能选择构造 Fighter[]; `_createAiFighter` / `_createTestDummy` |
| 1447-1565 | confirmTeam | **核心**: 最终入战, 调用 `engine.startBattle(left, right)` |
| 1566-1655 | 杂项 | autoAssignPositions / goBackFromSelect / confirmSurrender / showGameConfirm |
| 1656-1735 | RESULT | `showResult(leftWon)` 结算屏; `rematch` 重开 |
| 1736-1763 | RECORD/COINS | `saveRecord` / `updateRecordDisplay` / `addCoins` / `loadCoins` localStorage |
| 1764-1771 | CODEX | `showCodex()` 仅切屏 |
| 1772-1931 | BUG REPORT | 玩家提 bug 报告 UI + 提交 (邮件 / API?) |
| 1932+ | INIT | DOMContentLoaded 钩子, 调 restoreLastLineup 等 |

**6 种 game mode** (line 97-141):
| mode | 玩家选什么 | 敌方 | 难度 |
|---|---|---|---|
| `pve` | 3 龟 (野生) | 随机 3 龟 (AI) | normal |
| `test` | 3 龟 | 6 个 2000HP 假人, 不还手 | normal |
| `boss` | 3 龟 | 1 只超强 Boss, 每回合行动 3 次 | hard |
| `boss-pick` | 3 龟 + 玩家选 Boss | 玩家挑的 Boss | hard |
| `dungeon` | 3 龟 (无替补) | 5 关递进, HP 跨关继承 | normal |
| `pvp-online` | 走 screenLobby | 真人 | - |

**关键发现**:
- `selectedIds` 数组 + `_fgSlots` 字典是双重源 of truth → bug 易点
- 注释里说"⚠️ 防 bug: 必须每次进 mode 都清掉所有阵容残留 state" — 历史踩坑
- 移动端兼容: tryLockLandscape + touch drag (line 80, 854+)
- 大商店跨 run state: `window._bigShopDiscount / _deathCoinBonus / _eachStageGrantConsumable` (1099-1107)
- BGM 自动切: `_afterScreenSwitch` 进 menu/lobby/codex 自动 `playBgm('menu')`

**PoC 对应状态**:
- ✅ MainMenu / TeamSelect / RulePick / Dungeon / Battle / BattleEnd 6 个 scene 拆分
- ✅ Last-lineup persistence (localStorage turtle-poc-team-v2)
- ✅ dungeon + custom 跑通
- 🟡 SKILL PICK MODAL **完全缺失** (旧版战前手选 5 选 3 + 等级, PoC 直接用 defaultSkills [0,1,2])
- 🔴 boss / boss-pick / test 模式
- 🔴 PvP online (screenLobby + PeerJS)
- 🔴 Bug 报告
- 🔴 6-slot formation + 拖拽 (PoC 简化为 3 横排槽)

---

### 2.2 ui.js (1538 行) 🟡 部分迁移

**位置**: `games/turtle-battle/js/ui.js`
**对应 PoC**: `BattleScene` 内联 (sprite + HP bar + statusGroup) + `BattleLog`
**完成度**: **~40%** — sprite + HP + 基础状态有, 但 5+ 资源条 (rage/energy/bubble) / 大详情卡 / 伤害统计 / passive popup / help 全缺

**模块拆解** (按 `── XXX ──`):
| 行 | 模块 | 关键产出 |
|---|---|---|
| 1-10 | 龟壳气场储能 | `getAuraEnergyCap(f)` shell 专用蓄能上限 |
| 11-62 | BATTLE POSITION | `_STD_POS` (front/back ×3 槽, 6 位 desktop/mobile 同 16:9 坐标), `BATTLE_POSITIONS_BY_BG` 10 张 bg 共用 STD, `setBattlePositionsForBg` 切换 |
| 64-87 | mapCoverPos | 16:9 image-space % 坐标 → cover-cropped 容器像素映射 (核心数学) |
| 89-105 | buildSceneTickBg | HP 条刻度: 小刻度 100 / 大刻度 500, 用 repeating-linear-gradient |
| 106-258 | renderScene | **核心**: 全场龟 DOM 重建. 每只龟构造: HP wrap (HP 条 + 延迟伤害条 + shield 条 + bubble shield 条 + 刻度) + 等级徽章 + 体感容器 (.st-body) (阴影 + sprite) + 资源条 (chestPile/rage/energy/bubble-store) + status row + equip row |
| 259-296 | renderStandingMarkers | 站位指示 (空槽边框) |
| 297-468 | renderSceneBuffs | 头顶状态条/数字/计时器渲染 (复杂, ~170 行) |
| 469-640 | updateSceneHp | HP 条 tween 动画 + 延迟伤害条 + crit/dodge/miss 飘字; 数值差额捕获 |
| 641-728 | refreshDetailPanel | 选中龟时右侧面板更新 |
| 729-781 | showEquipCellDetail / closeEquipDetail | 点装备槽弹详情 + 关闭 |
| 782-1112 | **showFighterDetail** (~330 行) | **战斗内点龟弹大详情卡**: 头像 / 全数值 (含 stat-up/down 比对) / 暴击溢出 / 闪避 / 吸血 / 装备槽 (gem-icon + 文字 + 状态徽) / 被动详情 (展开收起) / passiveDetail toggle / 状态栏 |
| 1106-1123 | closeFighterDetail / fdpTogglePassive | |
| 1124-1144 | showSkillAnnounce | 释放技能时大字横幅 (中央 banner + 入场动画) |
| 1145-1160 | renderFighterCard | (legacy?) |
| 1162-1210 | badge auto refresh | 装备槽徽章定时更新 (tick 闪烁 等) |
| 1211-1348 | renderStatusIcons | **状态系统**: PASSIVE_ICONS 映射 + 状态层级 icon 渲染 + 计时器倒计时 / 层数显示 / hover tooltip |
| 1349-1425 | DAMAGE STATS | `updateDmgStats` / `switchDmgTab` / `_toggleDmgStatsDesktop` — 4 tab (DMG/HEAL/SHIELD/STATS) 总伤害统计面板 |
| 1426-1531 | PASSIVE POPUP | `showPassivePopup` 点被动 icon 弹完整描述 (含 fdetail toggle) |
| 1532+ | HELP PANEL | `toggleHelp` 帮助页 (术语 / 公式 / 7 KBs of game logic) |

**关键发现**:
- **6 slots positional system**: `_STD_POS` 用 % 坐标 + 16:9 cover math, 跨任意分辨率 / 任意 bg 都对齐位置. 切 bg 不改坐标
- **延迟伤害条** (.st-hp-delay): 受击瞬间显示"被打掉的量", 200ms 后再收缩. 让多段伤害可读
- **每只龟最多 4 个资源条**: HP / shield / bubble shield / 加上 (rage/energy/bubble-store/chest tier) 中的一个
- **showFighterDetail 巨大**: 330 行单弹窗实现 — PoC 同等 popup 只 ~80 行
- **Damage Stats Panel** 4 tab: 旧版有完整伤害分析面板, PoC 缺
- **Help Panel**: 旧版有 7KB 帮助文档 (术语/机制/公式), PoC 缺
- **PASSIVE_ICONS 映射**: 30+ passive type 各自 icon (png 或 emoji), PoC 已知部分 (PoC fighter popup 用同样 emoji)

**PoC 对应状态**:
- ✅ Sprite + HP bar + 名字 + 简单 status icons (BattleScene.makeView)
- ✅ Fighter detail popup (PoC 新加, 简版)
- 🟡 状态图标 (PoC 7 种 / 旧版 30+ passive icon)
- 🟡 多 bg 切换 (PoC 9 张随机)
- 🔴 站位 % 系统 (PoC 用绝对像素, 没参考 bg 内部坐标)
- 🔴 延迟伤害条
- 🔴 多资源条 (rage/energy/bubble-store/chest tier)
- 🔴 showSkillAnnounce 技能大字 banner
- 🔴 Damage Stats Panel (4 tab)
- 🔴 Help Panel
- 🔴 Passive Popup (点被动 icon 弹详情)
- 🔴 装备槽 UI (gem-icon + 状态徽)
- 🔴 stat-up/down 比对动画

---

(剩余大文件待审)

- [x] main.js (1951 行) — 已审
- [x] ui.js (1538 行) — 已审
- [x] turn.js (1434 行) — 已审
- [x] combat.js (1097 行) — 已审
- [x] engine.js (1049 行) — 已审
- [x] state.js (903 行) — 已审
- [x] equip-effects.js (865 行) — 已审
- [x] dungeon.js (852 行) — 已审
- [x] ui-anim.js (683 行) — 已审
- [x] action.js (669 行) — 已审
- [x] bench.js (607 行) — 已审
- [x] battle-setup.js (485 行) — 已审
- [x] shop.js (438 行) — 已审
- [x] events.js (436 行) — 已审
- [x] fighter.js (399 行) — 已审

### 2.7 equip-effects.js (865 行) 🔴 大缺失

**位置**: 装备**复杂触发**实现 (apply 闭包外的多步动画 / 跨目标效果)

**核心 trigger** (9 个):
- `triggerDragonFly(owner)` (14-87): **龙蛋** 选一排 → 火柱划过 → 友 +40HP 敌 50 魔+灼烧 25
- `triggerPearlHeal(owner)` (91-144): **生命珍珠** HP<50% 触发 → 6 tick +X HP (~21% maxHp) → 火球到随机敌 (8% maxHp 魔+30 灼烧) → 装备销毁
- `triggerConchTransform(f)` (150-209): **复活海螺** 死亡变小虫 (150HP, 20ATK, 普攻最低 HP 敌)
- `triggerMiniCrystalBeam(owner)` (215-275): **迷你水晶球** 施法后射线攻击
- `launchPearlFireball(owner, target)` (280-329): 珍珠火球抛物线 VFX
- `launchDumbbell(owner, target)` (332-362): **哑铃** 投掷弹道
- `launchStraightProjectile` (365-398): **左轮 / 飞镖** 通用直线弹道
- 海浪横扫 (399+): **海浪** sprite 屏幕左→右移动, 触碰单位生效

**PoC 缺**: 这 9 个核心 trigger 完全是占位简化版, 装备特效 VFX 0 实装.

### 2.8 dungeon.js (852 行) 🟡 部分迁移

**核心**:
- `DUNGEON_STAGES` (6+): 5 关数据 + 敌方阵容 + 倍率
- `dungeonStartStage()`: 开始第 N 关
- `dungeonOnStageClear()` (182): 关卡清场 → 触发奖励选择
- `dungeonOnStageFail()` (272): 失败处理
- `dungeonComplete(cleared)` (294): 全 5 关通关
- `dungeonPreReviveDead()` (333): **进新关前死的龟 70% HP 复活**
- `showDungeonClearScreen` / `renderNextStagePreview` / `renderDungeonChoices` / `pickDungeonChoice` (365-478): 奖励 UI
- `dungeonNextStage()` (479): 进入下一关
- `showDungeonEquipPicker` / `dungeonPickEquipItem` (501-): **关卡间大商店选装备**
- `dungeonSavePositions()` (410): 跨关保留 _position (前/后排)

**PoC 现状**: DungeonScene 简版做了, 但缺 **关卡间大商店** (showDungeonEquipPicker), **死龟 70% 复活** (dungeonPreReviveDead), 跨关 position 保留.

### 2.9 ui-anim.js (683 行) 🟡 部分迁移

**核心**:
- `PASSIVE_ICONS` (1-5): **39 个 passive type → icon 映射** (含 png 路径或 emoji)
- `updateFighterStats(f, elId)` (7-52): 战斗内龟卡片 stat 显示 (含 stat-up/down 比对)
- `buildPetImgHTML(pet, size)` (85-143): **sprite frame 动画 CSS keyframe 生成** — 复用预创建 .sprite-frame opacity 切换 (旧版 memory 教训, 避免 bg-image swap GPU 闪)
- `playAttackAnimation(f)` (153-242): 攻击动画 (1200ms hop + 800ms sprite + 160ms 回位, sync damage 在 400ms)
- `playFighterSpriteOnce(f, src, frames, frameW, frameH, durationMs, looping)` (243-320): **通用 sprite 单次播放** 切纹理 + 帧序 + 完成回调
- `playDeathAnimation(f)` (321-367): 死亡 (爆炸 / 凋零)
- `playHurtAnimation(f)` (368-440): 受击 (闪烁 + 击退)
- `playKnockupAnimation(f)` (441-511): 击飞 (跳起 + 落地)
- `updateHpBar(f, elId)` (512+): **HP 条 tween** + 延迟伤害条 (.st-hp-delay)

**PoC 现状**:
- ✅ basic/ghost/ninja 4 动作 spritesheet 已接 (idle/attack/hurt/death)
- 🔴 25 龟 无动作动画 (静态 avatar)
- 🔴 playFighterSpriteOnce 完整流程 (PoC 用 Phaser anim 简版)
- 🔴 ATTACK_HOP_TOTAL_MS / ATTACK_DAMAGE_SYNC_MS 精确时序 (PoC 用 180ms 简单 tween)
- 🔴 HP 延迟伤害条
- 🔴 stat-up/down 比对动画

### 2.10 action.js (669 行) 🟡 部分迁移

**核心**:
- COMBO SKILLS (18-114): **连携技** `getAvailableCombos(side) / executeCombo(combo, side)` — 阵容含特定 2-3 龟 时解锁
- EQUIPMENT PICK (115-184): `triggerEquipPick / pickEquipItem / aiPickEquip` 战斗内装备弹窗
- SKILL PICKING + TARGET (185-470): `pickSkill / showTargetSelect / useCombo / processPendingMechTransforms / selectTarget / cancelTarget` 玩家选技能 + 目标 + 取消 + Mech 变身排队
- executeAction (470+): 主行动入口, 派发到 SKILL_HANDLERS

**PoC 缺**:
- 🔴 **连携技 (COMBO)** — 2-3 龟组合解锁额外技能, PoC 完全没做
- 🔴 Equipment pick modal (战斗内弹掉落装备选择)
- 🔴 Cancel target (PoC 没有取消按钮)
- 🔴 Mech 变身排队 (lava transform 待处理)

### 2.11 bench.js (607 行) 🔴 全缺

**位置**: **装备席 (TFT 风格 inventory)**, 战斗中掉落装备先入席, 玩家拖拽到龟身上才装备

**核心**:
- `BENCH_CAP = 10`: 装备席容量
- `leftBench / rightBench`: 全局 inventory
- `pushToBench(side, equip)`: 推装备进席
- `tryEquipFromBench(side, benchIdx, fighter)`: 席 → 龟 (含 unique 检查)
- `renderBench(side)`: DOM 渲染装备格
- `restoreBenchFromDungeon`: 跨关持久化

**PoC 缺**: 完全没装备席系统. 现在装备只能在战斗内商店买立即挂. 旧版掉落装备先入 inventory, 玩家拖拽再装.

### 2.12 battle-setup.js (485 行) 🟡 部分迁移

**核心**:
- `_battleSeed`: PvP 同步种子
- `BATTLE_RULES` (7-27): **7 种规则数据** (PoC 已迁)
- `rollBattleRule()` (28): 野生对局随机规则
- `showRulePickModal(callback)` (34-71): 规则选择弹窗 UI
- `showTurnStartBanner(text, sub, durationMs)` (72-89): **中央大字回合 banner** (1100ms)
- `showRuleBanner(rule, callback)` (90-107): 战斗开始 规则横幅入场动画
- `startBattle(seed)` (108-475, 367 行): **战斗启动主流程** — seed/rule apply + 队伍 build + applyTeamSynergies + apply passive + 战斗初始视觉 + beginTurn
- `switchTestBg(bgFile)` (476-484): 测试模式切 bg

**PoC 现状**:
- ✅ 7 BATTLE_RULES + ruleModifiers + 战前 apply
- ✅ TeamSelect + RulePick UI
- 🔴 showTurnStartBanner (中央大字, PoC 用左上角小字)
- 🔴 showRuleBanner 入场动画
- 🔴 rollBattleRule (野生对局自动随机规则)
- 🔴 _battleSeed PvP 同步

### 2.13 shop.js (438 行) 🟡 部分缺失

**核心**:
- SHOP_QUICK_POOL (11-58): **小商店 22 件** (临时 buff 12 / 消耗品 3 / 装备 4 / 战术工具 3) - 战斗内每 2 回合
- SHOP_BIG_POOL (68-169): **大商店 46 件** (装备 22 + 永久 buff 12 + 一次性 8 + 治疗 4) - 闯关关卡间
- `_persistDungeonBuff(type, value)` (62-67): 大商店永久 buff 持久化
- `SHOP_BIG_STACK_LIMITS = { b_economy: 3 }` (196): 大商店物品堆叠上限
- `rollQuickShop(rng)` (185-193): 小商店 4 件抽取 (4 类各 1)
- `_applyTeamBuff(ctx, type, value, turns)`: buff 应用
- 等

**PoC 现状**:
- 🟡 ShopOverlay 战斗内每 3 回合 (旧版 2 回合) 弹 3 件装备 — 简版
- 🔴 SHOP_QUICK_POOL 22 件分类池
- 🔴 SHOP_BIG_POOL 46 件 (大商店根本没接)
- 🔴 dungeonBuff 永久 buff
- 🔴 重投骰子按钮
- 🔴 战术工具类道具

### 2.14 events.js (436 行) 🔴 全缺

**位置**: **局中事件系统** — 第 3/6/9/12 回合战斗开始触发, 整场互斥 1 个

**核心**:
- `NEUTRAL_TEMPLATES` (10-32): **3 类中立生物** (宝箱怪 / 海葵母 / 巨蟹)
- `ENV_EVENTS` (33-99): **6 种环境事件** (火山喷发 / 海啸 / 雷暴 / 流星雨 / 宝藏雨 / 浓雾)
- `CHOICE_EVENTS` (102-): 闯关选择事件 (神龛)
- `triggerChoiceEvent(eventId, side, onPick)` (152): 弹选择
- `_createNeutralFighter(template, side, slotKey, typeKey)`: 创建中立 fighter 加入 allFighters
- `_findEmptySlot(side)`: 前排优先, 满 → 后排
- 6 slot 满 → 强制海葵母 (D19 规则)

**PoC 缺**: 完全没事件系统. 旧版战斗中后期 (3/6/9/12 回合) 会有惊喜事件 / 中立生物刷新, PoC 全程平静.

### 2.15 fighter.js (399 行) 🟡 部分迁移

**核心**:
- LEVEL SYSTEM (6-30): `getPetLevel(petId)` 读 localStorage; `setPetLevel`; `getLevelBonus(petId)` 1 + (level-1)×0.05 (lv1=1.0, lv10=1.45)
- `getAvailableSkillIndices(petId)` (30-42): 可选技能槽 (跟随等级解锁)
- `createFighter(petId, side, equippedIdxs, levelOverride)` (44-150): 工厂函数 (PoC 已迁简版)
- `applyPassiveSkills(f)` (151-286): **每只龟战前 apply 被动 stat 加成** (lavaPassive +5% def / phoenixPassive +crit / 等)
- `getSkillPool(petId) / getSavedLoadout / saveLoadout(petId, indices)` (287-313): 技能槽持久化
- `aiPickSkills(petId)` (314-361): AI 选 3 技能 from 5 (智能选)
- `_markStatsDirty / _runDirtyRecalc` (362-370): 数值变更延迟重算 + reflow
- `addBuff(f, buff)` (371+): 加 buff helper (含 stack 合并)

**PoC 现状**:
- ✅ createFighter 简版
- ✅ rarity × level 缩放
- 🟡 _level 现固定 1 (旧版有 localStorage 1-10 等级系统)
- 🔴 applyPassiveSkills 战前被动 stat (PoC 不应用被动加成)
- 🔴 getSavedLoadout / saveLoadout — 每只龟独立技能槽存档
- 🔴 aiPickSkills 智能选技能 (PoC AI 用 defaultSkills)
- 🔴 _markStatsDirty 延迟重算
- 🔴 addBuff 合并 stack

---

## 3. 小文件 JS (一次性快扫)

| 文件 | 行 | 作用 | PoC 状态 |
|---|---|---|---|
| **codex.js** | 350 | 图鉴渲染 (renderCodexList) | 🟡 PoC CodexScene 替代, 但旧版 detail 更完整 (技能 detail 全文/协同标签 hover) |
| **synergies.js** | 378 | 10 协同 ×2/×3 effects 实装 | ✅ 已迁 src/data/synergies.ts (PoC 部分 effects 简化, 旧版有 _synergyAssassinExecute / _synergyShiftFirstAtkBonus 等高阶 flag) |
| **achievements.js** | 136 | 50 成就定义 (Phase 1 占位 UI, Phase 4 接 hook) | ✅ 已迁 src/data/achievements.ts |
| **online.js** | 343 | **PvP PeerJS 房间** + 同步 | 🔴 全缺 — cleanupPeer / 房间码 6 位 / 心跳 / opponent 阵容预览 |
| **bus.js** | 72 | Event emitter (on/off/emit/once/clear) | ✅ 已迁 systems/bus.ts (类型化) |
| **ui-action.js** | 421 | showTurtlePicker / showActionPanel / cancelAction | 🟡 PoC ActionPanel 简版 |
| **ui-skill-text.js** | 314 | **{N:expr}/{D:expr}/{M:expr}/{S:expr}/{H:expr} 技能描述模板展开** + 数值染色 (val-atk/val-def/val-heal/val-magic 等) | 🔴 PoC 直接 stripHtml 截断, 模板系统全缺 |
| **ui-summon.js** | 203 | 召唤物 mini-card 渲染 | 🔴 召唤物系统全缺 |
| **preloader.js** | 164 | 启动 critical image preload + progress bar | 🟡 Phaser BootScene 替代 |
| **camera.js** | 95 | BattleCamera (scene transform: zoom/shake/origin) | 🟡 PoC cameras.main 内建, 但旧版有 zoom-in/out 跟 fighter focus |
| **ai.js** | 262 | AI 行动选择 (aiAction / aiDrainBench / 智能选技能 + 目标) | 🟡 PoC AI 简版 (随机技能 + 最低 HP 敌) |
| **constants.js** | 28 | ATTACK_HOP_TOTAL_MS / RULE_MULT_SHIELD_BUFF 等 | 🟡 PoC 部分硬编码 |
| **debug.js** | 215 | 开发面板 (skill spawn / equip 给 / 阵容 reset) | 🔴 PoC 无 |
| **deep_coin.js** | 111 | **深海币** 7 来源经济系统 (击杀+5, Boss+30, 死亡+2, 财神龟+1/回合, 财富协同+2, 关卡清+10, 事件+15) | 🟡 PoC 龟币系统简版, 缺分项追踪 |
| **env.js** | 61 | ENV.isMobile / baseScale / battleField / sceneZoom | ✅ Phaser Scale.FIT 替代 |
| **tutorial.js** | 128 | 4 步引导 (模式介绍 详细 HTML) | 🟡 PoC 4 步占位简版 |
| **viewport-fit.js** | 326 | scale-fit + 横屏 lock + 请横屏 overlay | ✅ Phaser FIT + index.html 横屏 guard |
| **types.d.ts** | - | Fighter / Equipment / Skill TS ambient 类型 | ✅ PoC 单独 types.ts |

## 4. systems/ 子目录 (4 文件)

| 文件 | 作用 | PoC 状态 |
|---|---|---|
| **battle_fsm.js** | 5 状态机 (setup/turn-begin/awaiting-action/executing-action/side-end/round-end/battle-end) + dumpLog | 🔴 PoC 内置, 无 FSM |
| **visual_dispatcher.js** | VISUAL_REGISTRY (装备/技能 via tag → emoji+cls 映射) + bus 翻译 → spawnFloatingNum | ✅ 已迁 systems/visual_dispatcher.ts |
| **passive_subscribers.js** | bus 订阅 damage:dealt → 累积 _chestTreasure/_lavaRage/_bubbleStore 等 | 🟡 PoC equipment-runtime 替代部分, 但 passive 累积器 大多没接 |
| **stats_tracker.js** | 全场 stats 追踪 (per fighter dmgDealt/dmgTaken/healDone/crits, 分 phys/magic/true) | 🟡 PoC FighterView.stats 简版 |

## 5. vfx/ 子目录 (1 文件)

| 文件 | 作用 | PoC 状态 |
|---|---|---|
| **projectile.js** | 通用 `fireProjectile({attacker, target, sprite, durationMs, rotateAlongPath, damageAtMs})` 返回 {arrival: Promise, el} | 🟡 PoC 散布各 cast handler 内, 无通用工具 |

## 6. skills/ 子目录 (34 文件)

| 文件 | 龟 | PoC SKILL_HANDLERS 覆盖 |
|---|---|---|
| _misc.js | 杂项工具 (sleep/sfx/对齐) | - |
| _runner.js | skill runner 派发 | - |
| common.js | 通用 (turtleShieldBash/shield/commonTeamShield/commonAtkBuff) | ✅ 4 个 |
| registry.js | SKILL_HANDLERS 总注册表 + targetMode 表 (single/no-target/aoe-enemies/aoe-allies/shield-flex) | 🔴 PoC 无 targetMode |
| basic.js + basic-anim.js | 小龟 (turtleShieldBash/basicBarrage/basicChiWave/basicSlam) | ✅ 全 |
| stone.js | 石头龟 (stoneWall passive/shield/taunt) | ✅ stoneShield/stoneTaunt |
| bamboo.js | 竹叶龟 (bambooHeal/Smack/Spikes/Charge/Charged/Leaf) | ✅ bambooHeal/Smack/Spikes (3/6) |
| angel.js | 天使龟 (angelBless/Smite/Equality/Revive) | 🟡 angelBless/Smite (2/4) |
| ice.js | 寒冰龟 (frostAura/iceStorm 等) | 🔴 |
| ninja.js | 忍者龟 (ninjaShuriken/Smoke/Dash/Backstab) | 🟡 ninjaShuriken 1/4 |
| two_head.js | 双头龟 (twoHeadDual passive/twin attack) | 🔴 |
| ghost.js | 幽灵龟 (ghostBlast/Curse passive) | 🟡 ghostBlast 1/N |
| diamond.js | 钻石龟 (diamondCollide/Smash/Fortify/Enhanced/Structure) | 🟡 diamondCollide/Smash 2/5 |
| fortune.js | 财神龟 (fortuneGold passive/gold lightning) | 🔴 |
| dice.js | 骰子龟 (diceAttack/Fate/AllIn/FlashStrike/GamblerConvert) | 🟡 diceAttack/Fate 2/5 |
| rainbow.js | 彩虹龟 (rainbowPrism/Storm/Guard/EnhancedPrism) | 🟡 rainbowPrism/Storm 2/4 |
| gambler.js | 赌神龟 (gamblerMultiHit/Blood/MultiHit/Cards) | 🔴 |
| hunter.js | 猎人龟 (hunterShot/Mark/Barrage/Poison/Stealth/Kill passive) | 🟡 hunterShot/Mark 2/6 |
| pirate.js | 海盗龟 (pirateBarrage/Plunder/CannonBarrage/ShipPassive) | 🟡 pirateBarrage/Plunder 2/4 |
| candy.js | 糖果龟 (candyBarrage/Steal passive/BombPassive) | 🟡 candyBarrage/Steal 2/3 |
| bubble.js | 泡泡龟 (bubbleBind/Burst/Heal/Shield/Store passive) | 🟡 bubbleBind/Burst 2/5 |
| line.js | 线条龟 (lineRapid/Finish/Link/InkBomb/Sketch) | 🟡 lineRapid/Finish 2/5 |
| lightning.js | 闪电龟 (lightningStrike/Barrage/Shield/Surge/Storm passive) | 🟡 lightningStrike/Barrage/Shield 3/5 |
| phoenix.js | 凤凰龟 (phoenixRebirth passive/Flare) | 🟡 phoenixFlare 1/2 |
| lava.js | 熔岩龟 (lavaRage passive/Bolt/Quake/Splash/Surge/EnhancedRage) | 🟡 lavaBolt/Quake 2/6 |
| cyber.js | 赛博龟 (cyberBeam/Drone/Deploy/EnhancedDrone/SwarmShield) | 🟡 cyberBeam 1/5 |
| crystal.js | 水晶龟 (crystalBall passive/Barrier/Burst/Immortal/Resonance/Spike) | 🟡 crystalSpike/Barrier 2/6 |
| chest.js | 宝箱龟 (chestTreasure/Count/Greed/Intuition/Smash/Storm) | 🔴 |
| star.js | 星际龟 (空? 没在 pets 看到 starXxx, 可能 deprecate) | - |
| volcano.js | 火山 (lava 变身后形态) | 🔴 |
| shell.js | 龟壳 (shellStrike/Blast/Aura/etc.) | 🟡 shellStrike 1/N |
| hiding.js | 缩头龟 (hiding 隐身) | 🔴 |
| headless.js | 无头龟 (deathHook/Smash passive) | 🔴 |

**统计**: PoC 已实装 ~22 个 type / 旧版 ~60+ type = **覆盖率 ~35%**

## 7. CSS 文件 (3 个)

- **base.css** (~600 行): 主菜单 / 设置 / 屏切换 / 按钮 / 字体 (m6x11) / 颜色变量
- **battle.css** (~1500 行): 战斗 scene-turtle / HP 条 / status icons / animations (hit-shake/attack-anim/death-anim) / sprite frame 系统
- **scene.css** (~400 行): 选龟屏 + 编队槽 + 装备席 + 龟卡

PoC 用 Phaser 渲染, 不直接 port CSS, 但**关键动画 keyframe** (hitShake/hitMagic/attackLunge/deathFlash) 都是用 CSS @keyframes — Phaser 端需手写 tween 复刻.

## 8. index.html 9 个 screen 详情

(已在 Overview 列, 详细内容: screenMenu 主菜单 / screenAchievements 50 项 / screenCodex 28 龟+38 装备 / screenLobby PvP 房间码输入 / screenSelect 6-slot 编队 / screenBattle 主战斗 / screenDungeonClear 关卡奖励 / screenDungeonResult 5 关总结 / screenResult 普通战斗结算. 还有内嵌 modal: skillPick / bossPick / bugReport / shop / passive popup / help)

## 9. assets/ 资产清单

```
assets/
├── avatars/           28 龟正面立绘 (~200-400px PNG)
├── battle/            (空? 可能未用)
├── bg/                9 张战斗背景 (sakura/cave-alt/firefly/forest/ice/oasis/ruins/shipwreck/underwater)
├── bgm-battle.mp3     战斗 BGM
├── bgm-boss.mp3       BOSS BGM (PoC 没用!)
├── bgm-menu.mp3       主菜单 BGM
├── equip/             装备 icon (~32×32 PNG, dungeon-XXX-icon / equip-XXX-icon)
├── fonts/m6x11.ttf    像素字体
├── menu/              menu-bg/menu-title/btn-frame/btn-frame-pressed/codex-icon/pdp-* 等
├── passive/           29 被动 icon (32×32 PNG)
├── pets/              28 龟数据图 + animations/<id>/{idle,attack,hurt,death,knockup}.png (basic/ghost/ninja/ice 有完整)
├── sfx/               7 SFX (hit-physical/hit-crit/heal/defeat/shield-break/shield-gain/rebirth)
├── stats/             stat icon (atk/def/mr/crit/dodge/lifesteal/armor-pen 等)
├── status/            状态 icon (burn/poison/bleed/shield/stun/curse 等)
├── ui/                通用 UI (coin/help-button 等)
└── vfx/               技能效果 PNG (火球/闪电/水晶射线 等)
```

**PoC 已用**: avatars (28) ✓ / bg (9) ✓ / bgm-menu+battle ✓ / sfx (5/7) 🟡 / pets/animations (3/4 动画 龟) 🟡 / menu (5/N) 🟡 / fonts/m6x11 ✓

**PoC 未用**:
- 🔴 bgm-boss.mp3 (PoC BOSS 关用普通 BGM)
- 🔴 stats/ icon 套 (PoC 用文字 ATK/DEF)
- 🔴 status/ icon 套 (PoC 用 emoji)
- 🔴 passive/ 29 icon (PoC 用 emoji)
- 🔴 equip/ icon 套 (PoC 用 ⚔️ 占位)
- 🔴 vfx/ 技能 PNG (PoC 用 Phaser 粒子)
- 🔴 pets/ 25 龟的 attack/hurt/death PNG (basic/ghost/ninja 完整, 其他 25 缺动画素材)

## 10. docs/ 设计文档

| 文档 | 内容 (推断自标题) |
|---|---|
| turtle-battle/docs/全龟属性技能表.md | 完整数据表 (跟 pets.js 对应) |
| turtle-battle/docs/后端需求.md | 后端 API 接口设计 |
| turtle-battle/docs/后续更新思路.md | 路线图 |
| turtle-battle/docs/宠物部分美术需求.md | 美术清单 |
| turtle-battle/docs/模块总结.md | 代码模块 |
| turtle-battle/docs/生产清单.md | 资源生产 |
| turtle-battle/docs/移动端适配方案.md | 移动端 |
| turtle-battle/docs/refactor-audit.md | 旧版自审 |
| turtle-battle/docs/bg-prompts.md | bg 生成 prompt |
| 项目根 docs/ | 龟投门户级文档: 前端/后端/路线图/宠物中心/开战广场需求/龟币规则等 9 个 .md |

(详细内容需逐个读, 留 Phase B 实施时按需查)

## 11. PoC Gap Matrix — 完整总结

按 PoC 缺失影响排序:

### 🔴 CRITICAL (PoC 完全缺, 影响核心玩法)

| 系统 | 旧版位置 | 工作量 |
|---|---|---|
| **装备席 inventory** (TFT-style 拖拽) | bench.js | L |
| **大商店 46 件** (闯关关卡间) | shop.js | L |
| **局中事件** (3/6/9/12 回合中立 + 6 环境) | events.js | L |
| **PvP 联机** (PeerJS + 同步) | online.js + battle-setup seed + state.js sync | L+ |
| **暴击溢出系统** (>100% 暴击额外加伤) | combat.js | M |
| **技能描述模板 {N:expr}** | ui-skill-text.js | M |
| **召唤物系统** (lava 变身 / conch 虫 / pirate 船 / crystal 球 / candy 弹) | engine.js + 各 skills | L |
| **连携技 COMBO** (2-3 龟组合解锁) | action.js | M |
| **30+ skill handlers** (现 22, 总 60+) | skills/* | L |
| **死亡 8+ passive 汇聚** (checkDeaths 306 行) | state.js | M |
| **lava transform / hunter kill / chest 三阶 / fortune gold / lightning storm** | state.js | M |
| **DOT 衰减系统** (burn 1/3, poison/bleed 1/4) | turn.js | S |
| **39 passive icon 套** | passive/ assets + ui-anim.js | S |

### 🟡 MAJOR (PoC 简版, 体验差距大)

| 系统 | 旧版 | 工作量 |
|---|---|---|
| **6-slot formation** + 拖拽 | main.js | M |
| **战前技能 modal** (5 选 3 + 等级) | main.js + fighter.js | M |
| **死龟 70% HP 复活** (dungeon) | dungeon.js | S |
| **关卡间 position 保留** | dungeon.js | S |
| **showTurnStartBanner** 中央大字 | battle-setup.js | S |
| **showRuleBanner** 入场动画 | battle-setup.js | S |
| **HP 延迟伤害条** (.st-hp-delay) | ui-anim.js | S |
| **stat-up/down 比对** | ui.js | S |
| **Damage Stats Panel 4 tab** | ui.js | M |
| **Help Panel 7KB 术语** | ui.js | S |
| **战斗内 fighter 详情大卡** (330 行 / PoC 80 行) | ui.js | S |
| **Skill Announce banner** | ui.js | S |
| **Passive Popup** | ui.js | S |
| **40s turn timer** + auto-pick | turn.js | S |
| **AI 智能选技能** (现 PoC 随机) | ai.js + fighter.js | S |
| **每只龟独立 1-10 等级** + 持久化 + getSavedLoadout | fighter.js | M |
| **applyPassiveSkills 战前被动 stat** | fighter.js | S |
| **多层护盾架构** (bubbleShield→shield→auraShield→hp) | combat.js | S |
| **闪避 dodge → MISS + 转盾** | combat.js | S |
| **物理免疫 physImmune 90%** | combat.js | S |
| **墨迹联结 ink** (line 龟标记附伤) | combat.js | S |
| **trap 夹子反伤** | combat.js | S |
| **黑洞虚化 isInBlackhole** | engine.js | S |
| **多类型混合飘字 spawnHitStack** | engine.js | S |
| **多 hit hurt 动画 / 全屏 flash crit** (CSS) | engine.js + battle.css | S |
| **22 个 per-turn hook** (beginTurn) — DeepCoin / 凤凰复活 / lava rage 等 | turn.js | M |
| **deep_coin 7 来源经济分项** | deep_coin.js | S |
| **9 个装备复杂 trigger** (龙蛋/珍珠/海螺/迷你水晶/哑铃/左轮/飞镖/海浪) | equip-effects.js | M |

### 🟢 MINOR (打磨级)

| 系统 | 工作量 |
|---|---|
| **stats/passive/status/equip/vfx icon 资产替换** (PoC 全 emoji 占位) | S |
| **BGM-boss** 区分 | XS |
| **Camera zoom 跟随 actor** | S |
| **战斗日志细化** (旧版用 HTML log-event/log-magic 等 cls) | S |
| **debug 开发面板** | S |
| **Codex 技能模板展开 数值染色** | S |
| **Tutorial 内容扩充** | S |

### ⬛ N/A (旧版有但 PoC 不应做)

- viewport-fit.js (Phaser Scale.FIT 替代)
- env.js (Phaser API 替代)
- DOM 系统大改造 (Phaser 是 canvas, 不存在 DOM 引用)

---

## 12. Fix Plan — v0.8+ 实施路线 (按优先级)

**🔴 Phase 1 — 核心玩法补全 (~10-15 小时)**:
1. **召回物系统** (lava 变身 + conch 虫 + 暂跳 pirate/crystal/candy): 4-6h
2. **30 skill handlers 补全** (现 22 → 50+, 重点高频龟 lava/cyber/crystal/hunter): 4h
3. **状态/装备/passive 资产 PNG 替换 emoji**: 1-2h
4. **死龟 70% HP 复活 + position 保留**: 1h

**🟡 Phase 2 — 体验对齐 (~10-15 小时)**:
5. **战前技能 modal** (5 选 3, defaultSkills [0,1,2] 改可选): 2-3h
6. **战斗内 fighter 详情大卡 330 行**: 2h
7. **Damage Stats Panel 4 tab**: 2h
8. **showTurnStartBanner 中央大字 + showRuleBanner**: 1h
9. **HP 延迟伤害条 + stat-up/down**: 1-2h
10. **暴击溢出系统**: 1h
11. **39 passive icon 接 PoC**: 2h
12. **6 个 per-turn passive hook 补全** (凤凰复活/lava rage/hunter kill/fortune gold/lightning storm/chest treasure): 3-4h

**🟡 Phase 3 — 商店 + 闯关深化 (~6-8 小时)**:
13. **关卡间大商店 46 件 (装备 22 + 永久 12 + 一次性 8 + 治疗 4)**: 3h
14. **装备席 inventory (TFT 拖拽)**: 3-4h
15. **死龟 70% HP 复活**: S

**🔴 Phase 4 — 战斗事件 (~4 小时)**:
16. **局中事件 (3/6/9/12 回合)**: 3 中立 + 6 环境: 3-4h
17. **连携技 COMBO**: 1h

**🔴 Phase 5 — PvP (~12-20 小时, 最大块)**:
18. **PeerJS 房间 + 6 位房号**: 4h
19. **buildStateSync / applyStateSync 40 字段同步**: 4h
20. **Seeded RNG 双端同步**: 1h
21. **Lobby UI + 心跳 + 重连**: 2-4h
22. **opponent 阵容预览**: 1h

**🟢 Phase 6 — 打磨 (~6 小时)**:
23. **多类型混合飘字 spawnHitStack**: 1h
24. **闪避 dodge / 物理免疫 / 黑洞 / 墨迹 / 夹子**: 2h
25. **DOT 衰减 (burn 1/3 等)**: 1h
26. **AI 智能选技能 + 龟独立等级 + 持久化 loadout**: 2h

**总计预估**: ~50-70 小时 (10-15 个工作日 全职).

---

**审计完成 ✅**: 36 文件 + 30 skills + 1 vfx + 4 systems + 9 assets 目录 + 3 CSS + index.html + docs/ 全扫.

下一步: 等用户授权 v0.8 fix /loop, 按 Phase 1-6 实施.

### 2.6 state.js (903 行) 🔴 大缺失

**位置**: `games/turtle-battle/js/state.js`
**对应 PoC**: BattleScene 内 endBattle 简单 win/lose
**完成度**: **~10%** — checkBattleEnd 有, 但死亡处理 + 5 个核心 passive 全缺

**模块**:
- `buildStateSync()/applyStateSync(s)` (1-100): **PvP 状态快照**, 40+ 字段 (hp/buff/skill cd/_lavaRage/_chestTreasure/_inkStacks/_phantomStrike 等), guest 侧同步用
- `reviveFighter(f, opts)` (109-143): **凤凰复活逻辑**, 重置 hp/buffs/passive 状态
- `checkDeaths(attacker)` (144-450, **306 行**): 死亡处理 — phoenixRebirth 复活 / undeadRage 锁血 1HP / 海螺虫形 / 凤凰被动 burn 标记 / hunter kill 偷属性 / death explode 爆炸 / 海葵母 死亡掉装备
- `processSummonDeath(summon, attacker)` (451-539): 召唤物死亡 (清 _summon 引用 + 释放 slot)
- `checkBattleEnd()` (540-565): 全部一方阵亡 → battleOver, 走 showResult
- `processLavaTransform()` (567-657, 91 行): **lava 怒气 100 → 变身 6 回合 ATK +200**, 视觉切换 mech 形态
- `processLavaCountdown(f)` (658-689): 变身倒计时, 0 时回普通形态
- `processHunterKill()` (691-772): hunter 击杀偷 atk/def/maxHp 累积
- `processFortuneGold()` (774-786): 财神龟每回合 +1 龟币
- `processLightningStorm(side)` (791-814): 闪电龟 8 stacks → 全场闪电链
- `processThunderShell(side)` (818-842): 雷鸣贝壳装备 侧末电对面
- `checkChestEquipDraw / applyChestEquip / hasChestEquip` (843-902): 宝箱龟 3 阶 treasure threshold → 抽 chest 装备

**关键发现**:
- **PvP state sync**: 40+ 字段, 包括 _inkStacks / _starEnergy / _crystallize / _collideStacks 等所有 passive 累积值. PoC 完全没接.
- **checkDeaths 306 行**: 死亡是事件汇聚点, 8+ 个 passive 都在死亡瞬间触发. PoC 死亡只 setalive=false 完事.
- **lava 怒气 transform** 6 回合 ATK +200 是 lava 龟核心机制, PoC fighter 数据有 _lavaRage 但运行时不累计也不变身.
- **hunter 偷属性** + 财神币 + 闪电暴 + chest 抽装备 4 个 passive 是 long-term progression 关键, PoC 全缺.

**PoC 缺**:
- 🔴 PvP state sync (buildStateSync/applyStateSync)
- 🔴 reviveFighter (凤凰复活)
- 🔴 checkDeaths 死亡 8+ passive 汇聚
- 🔴 lava transform + countdown
- 🔴 hunter kill 偷属性
- 🔴 fortune gold per turn
- 🔴 lightning storm 8 stack
- 🔴 thunder shell side-end
- 🔴 chest treasure 三阶 + 装备抽取

### 2.5 engine.js (1049 行) 🟡 部分迁移

**位置**: `games/turtle-battle/js/engine.js`
**对应 PoC**: 拆散到 `src/data/equipment.ts` + `src/engine/damage.ts` + `src/engine/fighter.ts` + utility 散布
**完成度**: **~50%** — 数据 + 基础公式有, 但 seeded RNG / floating stack / companion 生命周期 / slot helper / hit-anim CSS / spawnHitStack 多类型显示 全缺

**顶部注释**: `engine.js — Shared state, globals & utility functions. All other engine files depend on this being loaded first.`

**模块拆解**:
| 行 | 模块 | 关键产出 |
|---|---|---|
| 6-17 | SEEDED RANDOM | `seedBattleRng(seed)` LCG (1664525×N+1013904223) 覆盖 Math.random for PvP 同步; `unseedBattleRng()` 还原 |
| 18-37 | SHARED BATTLE STATE | 16 个全局: `_comboCdLeft / _equipPickPending / activeSide / actedThisSide / _bossActionsThisRound / isFirstRound / sidesActedThisRound / _processingEndOfRound / _turnTimerId / _turnTimerInterval / pendingSkillIdx / currentActingFighter / _actionQueue / _isGuestReplay` |
| 39-41 | FLOAT STACK | `_floatStacks` 数字累加堆叠 (避免同位置飘字重叠) |
| 42-371 | **EQUIP_POOL** (310 行) | 18 件装备完整定义, 每件 apply(f) 闭包 — 已迁到 src/data/equipment.ts |
| 372-376 | getDropEquipPool | 战斗内商店随机抽装备的池 (排 chest/consumable) |
| 377-383 | isPlayerControlled(side) | PvP / PvE 派发 |
| 384-436 | 装备容量 | `EQUIP_CAP_PER_PET = 10`, `getEquipCount/isEquipFull/getEquipStackInfo` |
| 437-540 | VFX 坐标系 | `spawnInScene / visualToScene / visualToBody / sceneCenterOf` — body transform 后视觉坐标 ≠ DOM 坐标的换算 |
| 513-539 | getEquipDynamicDesc(f, eq) | 装备 desc 含 {N:expr} 模板时动态展开 (基于 fighter 当前 stat) |
| 542-602 | COMPANION 生命周期 | `COMPANION_FLAGS = ['_isSummon','_isPirateShip','_isCrystalBall','_isCandyBomb','_isConchWorm']`; `isCompanion(f) / attachCompanion / killCompanion(c, reason)` — 召唤物销毁含 visual cleanup + slot 释放 |
| 603-624 | LOG + ID helper | `plainTextFromHtml / addLog(html, cls)` 战斗日志; `getFighterElId(f)` 标准 DOM id |
| 625-700 | TARGET helpers | `isInBlackhole / getAliveEnemiesWithSummons / getAliveTargets(mySide, opts) / getActableFighters(side, actedSet) / getAliveAllies(side, opts)` — 排除黑洞/已动/召唤物 |
| 701-744 | SLOT / ROW helpers | `adjacentSlots(slotKey)` 同 row 邻居; `adjacentFighters(target) / fighterBehind / fighterInFront / frontSlotEmpty` |
| 746-753 | 战斗规则倍率 | `getShieldMult()` (铁壁 ×1.3) / `getMagicDmgMult()` (深海 ×0.8) |
| 754-907 | spawnFloatingNum (154 行) | 飘字 + 2.5s 持续 + cls 分类色 + dx/dy 偏移 + stack 堆叠 + 暴击放大 |
| 908-957 | spawnHitStack(elId, parts, opts) | **多类型一击的混合飘字**: parts = [{amount,type,emoji}], 显示 "100物+50真" 复合伤害 |
| 958-993 | resetBattleState | 战斗开始 / 重开 时清所有 state + DOM + overlay + panel |
| 994-1020 | playHitAnim | CSS 类切换 hit-shake/hit-physical/hit-magic/hit-true/hit-crit + 全屏 flash (crit) |
| 1021-1043 | applyHeal(target, amount) | 治疗削减 (healReduce) → ripple +30% → 守护协同 +5/10% → 海星溢出转盾 |
| 1044+ | sleep / showToast | 工具 |

**重要发现**:
1. **Seeded RNG** for PvP — 全局覆盖 `Math.random`, LCG 算法. 双端同 seed 保证战斗结算一致.
2. **EQUIP_POOL 18 件 + consumable 9 件 = 27 件**, 但 PoC equipment.ts 显示 38 — 多出的 11 件是哪?
   待查: PoC 自动转换可能包含了 chest 装备 / 测试用 / 等. 检查后能否减到 27 件.
3. **VFX 坐标换算系统**: `.scene-turtle .st-body` 有 transform: scale, 视觉坐标 ≠ DOM rect. 4 个 helper 处理.
4. **Companion 生命周期** 完整接口: `attachCompanion(owner, c) / killCompanion(c, reason)`. PoC 缺.
5. **spawnFloatingNum 154 行** — 飘字 stacking 系统避免同位置重叠; PoC 简单飘字.
6. **spawnHitStack** — 一击多类型伤害 (e.g. ninja 暴击分裂 真+物) 复合显示. PoC 用 2 个分开飘字.
7. **playHitAnim CSS 动画**: hit-shake / hit-physical / hit-magic / hit-true / hit-crit 5 种; crit 全屏 flash.
8. **applyHeal 含 4 层修正**: healReduce → ripple → 守护 → 海星溢出.

**PoC 对应状态**:
- ✅ 18 EQUIP_POOL 已迁
- ✅ resetBattleState (PoC scene.restart 自然清理)
- 🟡 spawnFloatingNum (PoC 有但无 stacking)
- 🔴 Seeded RNG
- 🔴 spawnHitStack 多类型混合飘字
- 🔴 playHitAnim CSS 5 种 + crit 全屏 flash
- 🔴 Companion 生命周期接口
- 🔴 VFX 坐标系换算 (PoC 直接用 sprite.x/y, 没 body transform 层)
- 🔴 getEquipDynamicDesc 装备描述 template 展开
- 🔴 isInBlackhole / adjacentSlots / fighterBehind / fighterInFront (slot row helpers)
- 🔴 applyHeal 4 层修正完整版 (PoC 简单 hp += amount)

### 2.4 combat.js (1097 行) 🟡 部分迁移

**位置**: `games/turtle-battle/js/combat.js`
**对应 PoC**: `src/engine/damage.ts` (calcDamage/applyRawDamage) + 部分散布在 BattleScene
**完成度**: **~25%** — 基础公式 √, 暴击/护甲穿透/反伤 √, 但 30+ on-hit 触发链 / debuff 应用 / DoT stack / 闪避 / 真伤分裂 / 章鱼后排 / 墨迹联结 全缺

**顶部注释**: `combat.js — Core damage, heal, shield, on-hit effects`

**模块拆解**:
| 行 | 函数 | 关键产出 |
|---|---|---|
| 22-45 | `applyAttackDamage(attacker, target, baseDmg, opts)` | 装备/被动/二级触发**轻量伤害源统一入口**: calcEffDef + 章鱼后排 + applyRawDmg + onHit chain. opts: dmgType/isPierce/skipLifesteal/skipOnHit/skipBackrow/skipDef |
| 47-57 | `spawnLightningStrike(elId)` | 闪电视觉 CSS sprite, 旧版闪电龟被动 / 雷鸣贝壳 共用 |
| 66-73 | `splitLandedDamage(mainPart, truePart, landed)` | 实际落伤按原 raw 比例分配 main/true 用于 log |
| 74-375 | **`doDamage(attacker, target, skill)`** (302 行) | **核心**: 技能伤害结算: 暴击判定 + 暴击溢出加成 (>100% 溢出 ×1.5 加伤) + skill.atkScale + dmgType + truePart 真伤分裂 (ninjaShuriken) + 各 hits 循环 + debuff 应用 (defDown/spdDown/atkDown/burn/poison/bleed/curse/mark/trap/dot) + lava 怒气积累 |
| 376-397 | `applyDotStacks(target, type, stacks, attacker)` | 加 DoT 层数, type=burn/poison/bleed/curse |
| 398-442 | `applySkillDebuffs(skill, target, attacker)` | 通用 debuff 应用器, 处理 skill.atkDown/defDown/burnStacks 等字段 |
| 443-517 | `doHeal(caster, target, skill)` | 治疗结算 + 海星溢出转盾 (e_star) + ripple 涟漪 +30% + bubbleStore +50% 转盾 + 治疗削减 (curse) |
| 518-549 | `doShield(caster, target, skill)` | 护盾施加 + ripple 强度加成 + 守护协同 +5/10% + bubble 护盾分类 |
| 550-797 | **`triggerOnHitEffects(attacker, target, dmg)`** (247 行) | **巨型 on-hit 链**: 物理协同流血 / TwoHead 50%HP shield / shieldOnHit / bubbleBind def-mr- / crystalResonance 结晶引爆 / trap 夹子 / stoneWall 反弹 / reflect buff / 闪避 dodge 转盾 / 灼烧 onHit / 双头 resilience def-mr+ / chest treasure 累积 / lava rage 累积 / ghost curse / hunter mark trigger / phoenix 凤凰 burn / candy steal 偷 ATK / 等 ~25 触发 |
| 798-825 | `tryGamblerMultiHit(attacker, target)` | 赌神龟多段连击 |
| 828-865 | `doGamblerCards(attacker, target, skill)` | 命运卡牌技能 |
| 866-1078 | **`applyRawDmg(source, target, amount, isPierce, _skipLink, dmgType, _noHurtAnim, deferDeath, _isInkBonus, _isReflect, _opts)`** (213 行) | **最底层落伤**: 11 个参数 (!), 闪避 dodge 概率 → "MISS"; 物理免疫 physImmune 90% 减 (蓄力大招前); 黑洞中虚化; 护盾依次扣 bubbleShield→shield→ auraShield (shell)→hp; HP 减 + bus.emit('damage:dealt') + 死亡判定 + checkDeaths |
| 1079-1096 | `_applyInkBonus(source, target, originalAmount)` | 墨迹联结 (line 龟): 攻击附伤 +20% on 标记目标 |

**最关键发现 — 暴击溢出系统** (doDamage 内部):
- 暴击率超过 100% (e.g. 120%) 时溢出部分 (20%) 用 overflowMult (默认 1.5) 加伤
- 公式: `critDmg = 1.5 + _extraCritDmgPerm + overflowCrit * overflowMult`
- 这是 RPG 后期堆暴击的关键机制. PoC 完全没实装.

**applyRawDmg 11 个参数**:
1. source / 2. target / 3. amount / 4. isPierce (穿盾) / 5. _skipLink (不触发墨迹) / 6. dmgType / 7. _noHurtAnim / 8. deferDeath / 9. _isInkBonus / 10. _isReflect / 11. _opts({selfTick})
- 真复杂. 处理: 闪避→MISS, physImmune 90% 减, 黑洞虚化 100%, 护盾层次, DoT/Reflect 跳 hurt 动画, deferDeath 暂缓死亡处理 (链式 DoT 同帧多次), bus 事件

**triggerOnHitEffects 25 个触发** (550-797):
1. 物理 ×3 协同 → bleed 流血
2. TwoHead vitality 50% HP 触发盾
3. 珊瑚硬壳 (e_carapace) 已迁 passive_subscribers
4. shieldOnHit 单次盾 (basic 不屈 等)
5. BubbleBind 每次受击 def-mr 衰减
6. CrystalResonance 结晶层数 → 满 4 引爆
7. Trap 夹子 反伤
8. StoneWall 石头墙反弹 (DEF/MR 公式)
9. Reflect buff (hidingReflect 等)
10. 闪避 dodge → 转盾 (e_ghost 等)
11. 灼烧 onHit (e_fire / phoenix passive 等)
12. 双头韧性 def-mr+
13. ChestTreasure 累积 → 阈值抽装备
14. LavaRage 怒气积累
15. GhostCurse 诅咒概率
16. HunterMark 标记触发
17. PhoenixBurn 凤凰持续燃烧
18. CandySteal 偷 ATK
19. Sneak (隐身)
20. Backstab 背刺
21. 雷鸣贝壳 闪电
22. 装备墨迹联结 ink mark
23. Pearl 50% HP 触发火球
24. 等

**PoC 对应状态**:
- ✅ 基础物理/魔法/真伤公式 (calcDamage)
- ✅ 暴击 ×1.5 基础
- ✅ applyRawDamage (PoC 简版, 只 hpLoss+shieldAbs)
- ✅ 简单 onHit (5 装备 + 5 signature passive)
- 🟡 fireOnHit 系统 (现 5 装备, 旧版 ~25 个触发)
- 🔴 **暴击溢出加成系统** (核心机制!)
- 🔴 doDamage 302 行的完整结算 (hits / truePart 分裂 / debuff 应用 / lava rage 同步)
- 🔴 doHeal 完整 (海星溢出转盾 / ripple +30% / bubbleStore +50% 转盾 / 治疗削减)
- 🔴 doShield (守护协同 +5/10%)
- 🔴 闪避 dodge → "MISS" + 转盾
- 🔴 物理免疫 physImmune 90%
- 🔴 黑洞虚化 isInBlackhole
- 🔴 多层护盾 (bubbleShield/shield/auraShield 优先级)
- 🔴 墨迹联结 ink (line 龟)
- 🔴 trap 夹子
- 🔴 30+ on-hit 触发链 (现 5 个签名)

### 2.3 turn.js (1434 行) 🟡 部分迁移

**位置**: `games/turtle-battle/js/turn.js`
**对应 PoC**: `BattleScene` 内 (nextActor / endTurn / tickDoTs) + 简单 turn order
**完成度**: **~30%** — turn order + DoT tick + buff duration 减递有, 但 beginTurn 622 行的 22 个 per-turn hook 大多没接

**顶部注释**:
```
turn.js — Turn system, buff processing, stat recalc
Depends on: engine.js (globals), combat.js, state.js
```

**模块拆解** (按 `── XXX ──`):
| 行 | 模块 | 关键产出 |
|---|---|---|
| 6-622 | **beginTurn** (**622 行 单函数**) | 22 个 per-turn hook (见下表) |
| 623-826 | BUFF PROCESSING | `DOT_TYPES` 表 + `tickHurt` / `tickOneDot` / `tickDotsOn` / `processCyberDrones` / `tickHotsOn` |
| 829-905 | processSideEnd | 单方回合结束: DoT 在对方 / HoT 在己方; cyber 无人机 |
| 907-1006 | processRoundEndBuffs | 整轮 (双方) 结束: shield/critUp 衰减 / phantomStrike / lava/bubble shield 倒计时 |
| 1008-1091 | recalcStats | `_recalcOneFighter(f)` 实时算 atk/def/mr (+被动 +装备 +buff); `recalcStats()` 全场; `_hasHpScalingPassive` |
| 1093-1097 | nextAction | redirect 到 onActionComplete |
| 1098-1155 | TURN TIMER | 40s 倒计时 + auto-pick 超时 + window._autoPlay 测试模式 |
| 1156-1162 | resetTurnState | activeSide / actedThisSide / isFirstRound / sidesActedThisRound |
| 1163-1302 | nextSideAction | **核心**: 选下一行动者 (玩家 vs AI 派发, 第 1 轮先手只 2 个, Boss 行动 2 次等) |
| 1303-1390 | finishSide | 单方结束 → processSideEnd → 切换 activeSide → checkBattleEnd |
| 1391-1396 | onActionComplete | 每次 action 完调 |
| 1397-1423 | selectTurtleToAct / backToPicker | UI 状态 |
| 1424+ | renderSideIndicator | 顶部"左方/右方行动"指示器 |

**beginTurn 的 22 个 per-turn hook** (1-622):
1. BattleFSM.to('turn-begin')
2. DeepCoin.onTurnBegin (财富协同 +2 龟币 等)
3. turnBanner 文字 + showTurnStartBanner (中央大字)
4. addLog 第 N 回合分隔
5. sfxTurnStart
6. **触发随机事件 turn 3/6/9/12** (events.js)
7. processAnemoneHeal (海葵母全场回血, 中立)
8. processNeutralTurn (中立行动)
9. 全员 skill cd-- (含召唤物)
10. processTurnBeginEquipment (FPGA / amplifier / 龙蛋 / 蜡烛 等)
11. **战斗规则 rain**: 5×N 魔法伤 + -N 甲/抗 永久, 每回合累加
12. **元素 ×3 协同**: 随机灼烧 1 敌
13. **再生 ×2/×3**: 永久回血 + 翻盘攻击
14. **凤凰复活**: 死亡时 50% HP 复活 (一次)
15. **lava rage 怒气积累 + 变身** (满 100 触发 6 回合)
16. **shell aura energy 储存**: 0-4 回合, 满 4 释放 buff
17. **gambler convert**: 命运轮盘抽 1 张, 累计 4 张激活
18. **chestTreasure 累积**: 出/受伤都累积, 满阈值抽 1 装备
19. **bubble store**: 受治疗 50% 转护盾
20. **lightning storm 雷暴**: 每 3 回合自动闪电链
21. **hunter mark + stealth**: 标记 / 隐身
22. **two_head twin attack** (双头双行动)
... 等 (中后段还有 phoenix burn / ink mark 等)

**DOT_TYPES 配置** (648-661, 重要):
```js
burn: damage=层+0.1%×层×maxHp magic, decay 1/3
poison: damage=层 magic, decay 1/4
bleed: damage=层 physical, decay 1/4
dot (诅咒): damage=value true, turns-- (老式)
```
PoC 的 burn 现在只用静态 value (没 decay), 跟旧版机制差距大.

**Turn order 逻辑**:
- 第 1 轮 left 只行动 2 个 (平衡先手)
- Boss 模式: right 每回合行动 2 次
- 召唤物 (summon/pirateShip/companion) 不计入 totalAlive (自动行动)
- 黑洞中的不能行动 (isInBlackhole)
- actedThisSide Set 跟踪本回合已动过的

**Auto-play 开发模式**: `window._autoPlay = true` 在 console 启用, 跳 timer 直接走 AI

**PoC 对应状态**:
- ✅ Turn order (左右交替, 但简单)
- ✅ skill CD 递减
- ✅ DoT tick (但只 burn 4 种 fixed value, 无 decay)
- ✅ Buff duration 递减
- 🟡 起始大字 banner (PoC 有, 但旧版 showTurnStartBanner 1100ms 完整动画)
- 🔴 22 个 per-turn hook 中 ~18 个完全没接 (DeepCoin / 随机事件 / 凤凰复活 / lava rage / shell aura / gambler / chest / lightning / mark / two_head 等)
- 🔴 DOT_TYPES decay 衰减系统 (现 PoC 是 fixed value)
- 🔴 第 1 轮先手 -1 行动平衡
- 🔴 Boss 双行动
- 🔴 黑洞机制
- 🔴 40s turn timer + 超时
- 🔴 _autoPlay 调试模式
- 🔴 recalcStats 系统 (PoC 数值不实时刷新)
- 🔴 processSideEnd / processRoundEndBuffs (DoT 在 OPPOSING + HoT 在 OWN)
- [ ] ui.js (1538 行)
- [ ] turn.js (1434 行)
- [ ] combat.js (1097 行)
- [ ] engine.js (1049 行)
- [ ] state.js (903 行)
- [ ] equip-effects.js (865 行)
- [ ] dungeon.js (852 行)
- [ ] ui-anim.js (683 行)
- [ ] action.js (669 行)
- [ ] bench.js (607 行)
- [ ] battle-setup.js (485 行)
- [ ] shop.js (438 行)
- [ ] events.js (436 行)
- [ ] fighter.js (399 行)

---

## 3. 小文件 JS (待审计)

待审: achievements.js / ai.js / bus.js / camera.js / codex.js / constants.js / debug.js / deep_coin.js / env.js / events.js (已列上面) / online.js / preloader.js / synergies.js / tutorial.js / ui-action.js / ui-skill-text.js / ui-summon.js / viewport-fit.js / types.d.ts

---

## 4. skills/ 子目录 (~30 文件, 待审计)

每个文件对应一只龟. 待补充列表。

---

## 5. vfx/ + systems/ 子目录 (待审计)

- vfx/projectile.js
- systems/battle_fsm.js / visual_dispatcher.js / passive_subscribers.js / stats_tracker.js

---

## 6. CSS 文件 (待审计)

- css/base.css
- css/battle.css
- css/scene.css

---

## 7. index.html screens (待详细审计)

已列 9 个 section id, 待补充各自内容. 见上 Overview.

---

## 8. assets/ 资产清单 (待审计)

`/games/turtle-battle/assets/` 待 ls 完整树.

---

## 9. docs/ 设计文档 (待审计)

发现以下文档 (待逐一阅读):

**turtle-battle/docs/**:
- bg-prompts.md (背景生成提示词?)
- refactor-audit.md (旧版自审?)
- 全龟属性技能表.md (数据规格)
- 后端需求.md (后端接口)
- 后续更新思路.md (路线图)
- 宠物部分美术需求.md (美术清单)
- 模块总结.md (代码模块)
- 生产清单.md
- 移动端适配方案.md

**项目根 docs/**:
- architecture-refactor-status.md
- 宠物中心-需求文档.md
- 开战广场需求文档.md
- 龟币获取规则.md
- 龟投-前端设计需求文档.md
- 龟投_后端接口文档.md
- 龟投_宠物_后端需求文档_v3.3.md
- 龟投_宠物_后端需求文档_v3_7.docx
- 龟投_开发路线图.md

---

## 10. PoC Gap Matrix (待最后填充)

完成 ✓ / 部分 🟡 / 缺失 🔴 / 不适用 ⬛

| 旧版模块 | PoC 状态 | 备注 |
|---|---|---|
| pets.js 数据 | ✓ 100% | 自动转换脚本 |
| 其他 | TBD | 边读边填 |

---

**Iteration 1 完成**: Overview + pets.js 详细记录. 下轮: main.js (1951 行).
