# PoC v0.8 — Fix Plan Phase 1-4 实施 (按 AUDIT-ORIGINAL.md)

**完成**: 2026-05-16

按 AUDIT Fix Plan 4 Phase 实施 (Phase 5 PvP 留 v0.9):

## Phase 1 核心玩法补全 ✅
- **P1.1** ✓ 真 PNG icon 替换 emoji (13 status + 28 passive 接入 BootScene)
- **P1.2** ✓ 死龟 70% HP 复活 (snap.alive=false → 进新关复活)
- **P1.3** ✓ 跨关 position 保留 (front/back 持久)
- **P1.4** ✓ 暴击溢出系统 (calcCritMult: 1.5 + extraPerm + overflowCrit × 1.5)
- **P1.5** ✓ DOT 衰减 (burn ×2/3, poison/bleed ×3/4, curse turns--)
- **P1.6** ✓ 召唤物 (lava 怒气>=100 变身 6 回合 +200 ATK + 爆裂粒子; conch 死亡 150HP/20ATK 虫形)
- **P1.7** ✓ 10 新 skill handler (ice/fortune/gambler/chest/hiding/headless/two_head): iceFrost/Freeze/Spike/fortuneDice/Strike/gamblerMultiHit/Blood/chestSmash/hidingDefend/headlessStorm/twoHeadDual
- **P1.8** ✓ 死亡 5 passive 汇聚 (phoenix 复活 / undead 锁血 / deathExplode / hunter 偷 / chest 抽装备)

## Phase 2 体验对齐 ✅ (大部分)
- **P2.3** ✓ showCenterBanner 中央大字 (1100ms back.out 入场)
- **P2.4** ✓ HP 延迟伤害条 (灰色, 200ms 后开始收缩)
- **P2.5** ✓ showSkillAnnounce 技能横幅
- **P2.6** ✓ passive PNG icon (BootScene preload 28 个)
- **P2.9** ✓ per-turn passive hook (fortuneGold +1 龟币 / lightningStorm 3 stacks / auraAwaken 4回合 / twoHeadDual)
- **P2.10** ✓ showHitStack 多类型混合飘字
- **P2.11** ✓ hit anim (现 playAction 已有 hurt 类型)
- **P2.12** ✓ flashCritScreen 全屏白闪
- **P2.1** ✓ 战前技能 5 选 3 modal (TeamSelect ✎ 编辑按钮 + getLoadout 持久化 turtle-poc-loadout-v1)
- **P2.2** ✓ fighter 大详情卡 760×580 (3 列 + 装备格 + 4 技能卡)
- **P2.7** ✓ stat-up/down 比对 (snapshotInitStats + delta 着色)
- **P2.8** ✓ Damage Stats Panel 4 tab (DMG/TAKEN/HEAL/SHIELD, 战斗内 📊 按钮)

## Phase 3 商店+闯关深化 ✅
- **P3.1** ✓ 战利品 bench inventory (顶部 🎒 浮窗, 击杀 30% 掉, 点 icon 装到龟)
- **P3.2** ✓ 大商店扩展 (RewardPickScene 10 buff 选项 + 双装备路径 40% 概率)
- **P3.3** ✓ 重投骰子按钮 (10 龟币 重抽)

## Phase 4 战斗事件 ✅
- **P4.1** ✓ events.ts 6 环境事件 (火山/海啸/雷暴/流星/宝藏雨/雾)
- **P4.2** ✓ BattleScene 第 3/6/9/12 回合触发, 互斥 (firedEvents Set)
- **P4.3** ✓ 连携技 5 组合 (元素之契/光暗双子/财富双煞/科技联盟/物理三连)

## 总览

**26 子任务**: 26 ✓ (commit 维度) / 但 **visual parity 不达标** — 见 [GAPS-v0.8-REAL.md](GAPS-v0.8-REAL.md)

⚠ **2026-05-16 用户实测发现 13 项 gap** (sprite 缺 / HP 条丑 / 模式缺 / Codex 缺 / 装备丢 / 商店概念错 / 技能描述格式 / TeamSelect 布局 / 主菜单画布 / 按钮爆框 / damage 分类 / 战斗逻辑 / modal 串字). 不能称 v0.8 release-ready. 估 40-57h visual parity sprint.

新增 / 重写文件:
- src/engine/events.ts (新, 局中事件)
- src/systems/battle-stats.ts (新, P2.8 累计 dmgDealt/Taken/heal/shield/kills)
- src/scenes/BattleScene.ts (大改: processDeathPassives / processLavaRage / processTurnBeginPassives / showCenterBanner / flashCritScreen / dropLootEquip / refreshBenchUI / showHitStack / showFighterDetail 大重写 / showStatsPanel)
- src/scenes/TeamSelectScene.ts (P2.1 openSkillPicker + getLoadout 导出)
- src/engine/damage.ts (calcCritMult 新增)
- src/engine/skill-handlers.ts (+10 type + 全 battleStats 打点)
- src/engine/equipment-runtime.ts (e_conch 完整化)
- src/engine/fighter.ts (snapshotInitStats 接入)
- src/scenes/RewardPickScene.ts (大商店扩展)
- src/scenes/ShopOverlay.ts (P3.3 重投)
- src/scenes/BootScene.ts (status+passive icon preload)

剩余 v0.9+:
- PvP 联机 (PeerJS) — Phase 5 (12-20h 最大块)
- 25 龟动画 (美术阻塞)

---

# 📋 AUDIT — 旧版完整代码 / 资产 / 文档审计

完整 reference 文档: **[AUDIT-ORIGINAL.md](AUDIT-ORIGINAL.md)** (~1000 行)

涵盖:
- Overview + 36 JS 文件 (15 大 + 20 小) + 30 skills/* + vfx/projectile + 4 systems
- 9 assets 目录 + 3 CSS + index.html + docs/
- **PoC Gap Matrix** (CRITICAL/MAJOR/MINOR 分级)
- **Fix Plan Phase 1-6** (~50-70 小时实施路线)

最大 PoC 缺口:
- 🔴 装备席 / 大商店 46 件 / 局中事件 / PvP / 暴击溢出 / 召唤物 / 30 技能 handler
- 🟡 6-slot 拖拽 / 战前 5 选 3 / 死亡 8+ passive / DOT 衰减 / 等

下一步: 用户授权 → 新 /loop "v0.8 实施 fix plan"

---

# PoC v0.7 — 3v3 修正 + 规则实装 + 字体 + 龟币商店

**完成**: 2026-05-15

| 阶段 | 产出 |
|---|---|
| **A** | **3v3 修正** (从错误的 6v6 改正) + **m6x11 像素字体** + **主站访问入口** (根 index.html 加 nav 链接) |
| **B** | **7 战斗规则真实生效** (炎火/雷霆/铁壁/暴怒/装备/雨夜/普通 全部实装影响战斗) |
| **C-1** | **PermShopScene 龟币商店** (5 项永久 buff, 跨场战斗生效) |
| **C-2** | **Codex 装备详情完整** (类别色 / 唯一 vs 可叠加 / 数值预览扫 apply 源码) |
| **D** | tutorial_done hook + Codex 技能 brief 不截断 |

新增 / 重写:
- src/engine/rule-effects.ts — 规则修正器 + 战前 / 每回合 / 命中后 hook
- src/scenes/PermShopScene.ts — 主菜单龟币商店, 5 项永久 buff
- BattleScene.placeTeam 改 3v3 (1 前 + 2 后), pickRandomEnemyTeam 3 龟
- TeamSelectScene SLOT_COUNT 6→3 + key v2 强制重选
- skill-handlers.dealMagic / applyShield / 新 applyBurn 全接入 ruleModifiers
- index.html @font-face m6x11 + 全 scene fontFamily 替换

Vercel 部署:
- vercel.json buildCommand 加 `cd poc-phaser && npm ci && npm run build`
- 部署后 poc-phaser/dist/index.html 可访问
- 主站 index.html nav 加 "🔮 龟龟对战 PoC (Phaser)" 入口

完整流程 (v0.7):
```
主站 (品牌门户)
  └─ 龟龟对战 PoC (Phaser) [新入口]
      └─ 主菜单
          ├─ 快速匹配 (placeholder, 等 v0.8 PvP)
          ├─ 房间对战 (placeholder)
          ├─ 深海闯关 → 5 关 (3v3, HP 继承, BOSS, 关卡奖励)
          ├─ 自定义模式 → 选 7 规则 → 选 3 龟 → 战斗 (规则真实生效)
          ├─ 图鉴 (28 龟 + 38 装备含数值预览)
          ├─ 成就 (50 项)
          ├─ 龟币商店 (5 项永久 buff)
          └─ 设置 (BGM/SFX 滑条)
```

剩余 v0.8+ 优先:
- PvP 联机 (PeerJS) — 最大缺口
- 召唤物系统 (lava 变身 / conch worm)
- 完整装备触发 (现 23, 还有 15 件简化)
- 25 龟 attack/hurt/death 动画 (美术外包)
- 装备触发飘字 (现挂了但没视觉)
- 战斗内 fighter 详情弹窗

---

# PoC v0.6 — 内容深度 + 粘性循环

**完成**: 2026-05-15

| 阶段 | 产出 |
|---|---|
| **A** | SKILL_HANDLERS 加 22 type (合计 31 个), EQUIP_BEHAVIORS 加 10 件 (合计 23 件), 实际可用技能/装备覆盖 ~80% |
| **B** | RewardPickScene 闯关 3 选 1 奖励 (buff/装备/治疗) + TeamBonus 跨关累积应用 |
| **C** | ShopOverlay 加 fighter 选择子层 (6 头像横排, 死的禁用, 显示装备数) |
| **D** | 50 项成就 (4 类) + AchievementTracker (累计存档 + 自动检查) + AchievementsScene (滚动 grid + 已/未解锁灰显) + 战斗结束 toast 通知 |

新增文件:
- src/scenes/RewardPickScene.ts — 闯关奖励
- src/scenes/AchievementsScene.ts — 成就总览
- src/data/achievements.ts — 50 项定义
- src/systems/achievement-tracker.ts — 累计 + 解锁 + 奖龟币

新增成就钩子:
- BattleEndScene 战斗后: 累计 battles/wins/crits/dmg/kills, 解锁阈值类 + 完美胜利 + 高伤
- ShopOverlay 购买后: equip_5/equip_25 + first_equip + shop_buy
- CodexScene 打开: codex_open

完整流程 (v0.6):
```
主菜单
  ├─ 深海闯关 → 第 1 关 → 战斗 → 选奖励 (3 卡) → 第 2 关 → ... → BOSS
  ├─ 自定义模式 → 规则 → 选龟 → 战斗 (战斗内 3 回合弹商店 → fighter picker)
  ├─ 图鉴 (28 龟 + 38 装备 + 协同标签)
  ├─ 成就 (50 项 4 类, 解锁奖龟币)
  └─ 设置 (BGM/SFX + 重置)
```

剩余 v0.7+:
- PvP 联机 (PeerJS) — 最大缺口, 商业版差异化关键
- 更多 pet 动画 (25 龟无 attack/hurt/death)
- 完整 30+ 装备触发链 (现 23 件, 还有 15 件简化)
- 主菜单龟币商店 (用累积龟币买永久 buff 或皮肤)
- 战斗内 fighter 详情弹窗
- 装备详情卡完整 (现简描述)

---

# PoC v0.5 — 视觉动画 + 闯关 + 商店 + 打磨

**完成**: 2026-05-15

| 阶段 | 产出 |
|---|---|
| **A** | basic/ghost/ninja 完整 attack/hurt/death/knockup spritesheet 动画 + playAction helper |
| **B** | DungeonScene 5 关递进 + HP 跨关继承 + 敌方倍率 + BOSS 关 + 最佳关存档 + BattleEndScene 下一关路由 |
| **C** | 战斗内商店 (每 3 回合) + 龟币累积 (起始 50, +2/回合, +5/击杀) + 顶部龟币显示 |
| **D** | CodexScene 加协同标签 + 新 SettingsScene (BGM/SFX 滑条 + 重置存档) + 4 步新手引导 (首次启动) |

新增文件:
- src/scenes/DungeonScene.ts — 闯关入口 + 进度条 + 双队伍预览
- src/scenes/ShopOverlay.ts — 战斗内商店浮层
- src/scenes/SettingsScene.ts — 音量 + 重置

新增本地存储:
- turtle-poc-settings-v1: { bgmVol, sfxVol }
- turtle-poc-dungeon-best-v1: 最高通关关数
- turtle-poc-tutorial-seen-v1: 引导看过标记

完整玩家流程 (v0.5):
```
首次启动 → 4 步引导 → 主菜单
  ├─ 深海闯关 → DungeonScene 第 1 关
  │            → BattleScene (敌方倍率) → BattleEndScene
  │            → 胜利继续下一关 (HP 继承) → 第 5 关 BOSS → 通关
  ├─ 自定义模式 → RulePick → TeamSelect → Battle → BattleEnd
  ├─ 图鉴 → CodexScene (28 龟 + 38 装备含协同标签)
  ├─ 引导 → 重看 4 步
  └─ 设置 → BGM/SFX 滑条 + 重置存档
战斗内: 每 3 回合 ShopOverlay 弹出, 3 件随机装备 + 龟币购买
```

剩余 v0.6+ 优先级:
- 完整 30+ 技能 handler (现 15 个)
- 完整 38 装备触发 (现 13 件)
- PvP 联机 (PeerJS)
- 成就系统 50 项
- 关卡奖励选择 (3 buff 1 装备)
- 装备选择目标 fighter UI (现自动挂第一只)
- 更多 pet spritesheet 动画 (其他 25 龟)

---

# PoC v0.4 — 战斗深度 (协同 + 技能实装 + 装备触发 + 状态系统)

**完成**: 2026-05-15

延续 v0.3 (可玩游戏), v0.4 补全"对战有策略"层:

| 阶段 | 产出 |
|---|---|
| **A** | 协同系统 (10 标签 ×2/×3 buff) + 战斗顶部协同条 UI + 装备运行时 hook 框架 (5 件) |
| **B** | SKILL_HANDLERS 派发表 (15+ 技能类型实装), BattleScene 走真 handler 不再硬编码 5 个 |
| **C** | 装备效果扩展 (13 件触发) + DoT (burn/poison/bleed/curse) + 眩晕 + onTurnBegin |
| **D** | 头顶状态图标 (🔥燃烧/☠中毒/🩸出血/💫眩晕 等) + 右侧战斗日志浮窗 (滚动事件) |

新增文件:
- src/data/synergies.ts — 10 协同标签
- src/engine/equipment-runtime.ts — onHit/onTurnBegin/onDeath hooks + 13 装备行为
- src/engine/skill-handlers.ts — 15+ 技能 handler 派发表
- src/scenes/BattleLog.ts — 右侧战斗日志

战斗机制完整闭环:
1. 战前: applyTeamSynergies 协同 buff + attachEquipment 装备 apply
2. 每回合: fireOnTurnBegin (装备 HoT) + tickDoTs (DoT 伤害) + 眩晕检测 + buff duration 递减
3. 行动: 玩家选技能 → SKILL_HANDLERS[skill.type] 派发 → handler 执行 (含飘字)
4. 命中后: fireOnHit (反伤/吸血/燃烧/眩晕/护盾 等装备触发)
5. 日志: BattleLog 同步记录关键事件

剩余 v0.5+ 优先级 (按用户体验):
- 装备 codex 详情完整 (现在 emoji 占位 + 简描述)
- 30+ 技能完整 (现在 15 个 type 实装, 其他 fallback physical)
- 完整装备触发链 (现在 13 件, 还有 25 件简化)
- 深海闯关 5 关递进 + 关卡奖励
- 战斗内龟币商店 (每 3 回合)
- 成就系统 50 项
- PvP 联机 (PeerJS)
- 设置界面 (音量/重置)
- 新手引导 4 步 tutorial
- 每龟 attack/hurt/death spritesheet (basic/ghost/ninja 数据有, 只用了 idle)

---

# PoC v0.3 — 致命 4 项修复 (可玩游戏)

**完成**: 2026-05-15

旧版扫码发现 v0.2 是 "数据 + 引擎骨架", 玩家面 < 20% 完成。v0.3 补齐 4 项致命缺失:

| 阶段 | 产出 |
|---|---|
| **A** | TeamSelectScene 选龟 (28 龟图鉴 + 3 前 3 后槽 + localStorage 记忆) |
| **B** | 真回合制 (ActionPanel 选技能 + 目标高亮 + 敌方 AI + CD 系统) |
| **C** | RulePickScene 7 战斗规则 (火/雷/盾/暴怒/装备/雨/普通) + BattleScene 规则 banner |
| **D** | BattleEndScene (胜负 + 6 龟伤害统计表 + 龟币奖励 + localStorage 累计) |

新增 Scene: TeamSelectScene / RulePickScene / BattleEndScene / ActionPanel
新增 systems: 战斗统计 tracker (FighterView.stats)
新增 持久化: turtle-poc-team-v1 (阵容), turtle-poc-progress-v1 (龟币/场次/胜场/最佳)

完整流程:
主菜单 → (深海闯关 OR 自定义→选规则) → TeamSelectScene 选 6 龟 → BattleScene 真回合制 → BattleEndScene 结算 → 再战或回菜单

剩余非致命差距 (Phase v0.4+):
- PvP 联机 (PeerJS), 房间对战
- 深海闯关 5 关递进 + 关卡奖励选择
- 龟币商店 (战斗内每 3 回合)
- 成就系统 (50 项)
- 完整 30+ 技能 handler (现在只 5 个 signature VFX)
- 状态图标 (烧伤/中毒/护盾 等)
- 战斗 UI 信息层 (战斗日志 / 协同条 / 装备槽显示)

---

# PoC v0.2 — 完整迁移报告

**启动**: 2026-05-15
**完成**: 2026-05-15 (单日 4 阶段)
**结果**: ✅ 4/4 阶段完成, /loop 自动跑全程

---

## 阶段成果总览

### A — 数据骨架 + 算法 + 动画 spritesheet ✅
- 通读旧版 17923 行 JS, Explore 子代理做结构 mapping
- **TS 类型化** `src/types/index.ts`: PetDef / SkillDef / PassiveDef / EquipmentDef / Fighter / Buff / BusEvents — 严格对齐旧版 schema (rarity C-SSS, skillPool 5 选 3, equipment apply 闭包)
- **数据全迁** (自动转换脚本):
  - `src/data/pets.ts` — **28 龟全量** (3409 行, scripts/import-pets.mjs)
  - `src/data/equipment.ts` — **38 装备含消耗品** (scripts/import-equipment.mjs)
  - apply 闭包保留, 外部 helper (recalcStats/applyHeal) stub 兜底
- **算法纯函数** `src/engine/`:
  - `damage.ts`: calcEffArmor / calcEffMr / calcEffDef / calcDmgMult / applyRawDamage / rollCrit
  - `fighter.ts`: createFighter (lv × rarity 缩放, skillPool → skills[], 装备挂载)
- **BattleScene 重写**: 6 真 fighter, 真 ATK/DEF 公式, 暴击/飘字/HP 条同步, 死亡 angle:90 倒地
- **动画 spritesheet**: basic/ghost/ninja 跑真 idle anim (帧动画), 其他 fallback avatar portrait

### B — 技能 VFX 移植 ✅
- `src/systems/bus.ts` — TypedBus, 全 BusEvents 类型化, on/off/once/emit/clear
- `src/systems/visual_dispatcher.ts` — VISUAL_REGISTRY (装备/技能 via tag), 翻译 damage:visual / heal:visual 为 Phaser 飘字 + HP 同步; floatCls 颜色规则: 普伤红 / 魔伤蓝 / 真伤金 / 治疗绿 / DoT 橙 / 护盾银 / 暴击金 / 闪避灰
- `src/vfx/skills.ts` — **5 个示范技能**:
  - 🔥 castFireball (火球 + 拖尾粒子 + 命中爆炸 + camera shake)
  - ✨ castHealAura (中心绿色脉冲 + 全友军治疗粒子 + heal float)
  - ⚡ castChainLightning (锯齿闪电 + 命中白光 + 麻痹 tint, N 跳)
  - 🩸 playLifesteal (红粒子 target → caster + caster 治疗 float)
  - 🌵 playThorns (黄刺花 + 反伤线段 + 真伤金字)
- **SIGNATURE_SKILL 表**: basic=反伤 / ghost=火球 / ninja=闪电链 / shell=群体治疗 / phoenix=吸血 / lava=普攻 — 每只龟一种签名特效

### C — UI 布局参照 + 图鉴 Scene ✅
- 决策: BattleScene 当前布局已够用 (HP 条/名字/稀有度都有), 把精力全砸在 **CodexScene**
- `src/scenes/CodexScene.ts`:
  - 龟 / 装备 双 Tab
  - 滚轮滚动 grid (Phaser mask + wheel event + maxScrollY 边界)
  - 龟卡: 头像 + 名字 + 稀有度色边框 (C绿 B蓝 A深蓝 S紫 SS金 SSS红)
  - 装备卡: emoji + 名字 + category 色 (unique金 / special紫 / normal蓝 / consumable绿)
  - 详情卡: 龟 (头像 + lv1 缩放后 stats + 被动 + 3 默认技能) / 装备 (类别 + 唯一/可叠加 + desc, 剥 HTML)
- 主菜单加 "图鉴" 入口

### D — 地图 + 横屏 + 全 SFX ✅
- **9 张地图** 全加载 (sakura/cave-alt/firefly/forest/ice/oasis/ruins/shipwreck/underwater), 战斗按地图随机切
- **横屏 lock** (index.html): `@media (orientation:portrait) and (pointer:coarse)` → 显示 "📱 请横屏游玩" 全屏遮罩, 旋转手机即解锁; 桌面浏览器不受影响
- **SFX**:
  - sfx-hit (普攻 / 火球命中)
  - sfx-crit (暴击 / 闪电链)
  - sfx-heal (治疗光环)
  - sfx-defeat (死亡)
  - sfx-shield-break (反伤触发)
  - BGM (bgm-menu / bgm-battle 跨场景 fade)
- 未接 (无运行时触发场景, 留给后续): sfx-rebirth, sfx-shield-gain

---

## Bundle 体积

| 资产 | gzip 后 |
|---|---|
| index.html + CSS | 1.4 KB |
| **业务 JS** (全数据 + 引擎 + 5 scene) | **~43 KB** |
| Phaser runtime | 340 KB |
| **总计** | **~385 KB** |

---

## 提交序列 (本日 4 个阶段)

```
6938fc2 poc(v0.2/phase-a): 28 龟数据全迁 + TS 类型骨架
6d4b865 poc(v0.2/phase-a): 数据接通完整 — 真 fighter + 真伤害 + spritesheet 动画
c423c04 poc(v0.2/phase-b): VFX 事件总线 + 5 个技能特效
f86f2c6 poc(v0.2/phase-c): CodexScene — 28 龟 + 38 装备图鉴
(本提交)   poc(v0.2/phase-d): 9 地图随机 + 横屏 lock + SFX 完整
```

---

## 已知问题 / 待办

- **复杂装备触发** (e_pearl 50% 触发, e_dragon_egg 喷火等): apply() 已迁, 但触发链条 (state.js subscribers / equip-effects.js triggerXxx) 未迁 — 留给 v0.3
- **技能 HANDLER 全集**: SKILL_HANDLERS 30+ 文件, v0.2 只示范 5 个; 其余按 SIGNATURE_SKILL 映射可逐个补
- **被动 PASSIVE_ICONS**: 旧版 UI 显示, Phaser 端未挂 — 装备页面待显示
- **shield-break / shield-gain SFX**: 框架已有, 等护盾系统接通后自然触发

---

## 下一步建议

v0.2 已能在 **Phaser canvas 内完整跑一场 3v3 自动对战**: 真数据 + 真公式 + 5 技能 VFX + 9 地图 + 图鉴 + 横屏适配。

**v0.3 优先**: 玩家选龟 (TeamSelectScene) + 玩家手动选技能 (取代当前全自动) + 装备掉落 + 完整技能 handler (30+) + 被动触发链。
