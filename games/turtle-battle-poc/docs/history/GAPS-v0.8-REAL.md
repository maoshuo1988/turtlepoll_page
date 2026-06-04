# Phaser PoC v0.8 — 真实差距 (实测后)

> 2026-05-16 实测发现: 之前 STATUS 说 26/26 done 是按 commit 勾的, 实际跑起来视觉/逻辑 parity 与原版差很多。

## 用户实测发现 (本次会话)

| # | 报点 | 类目 | 修复粒度 |
|---|------|------|---------|
| 1 | Modal 描述中文不断行, 串到隔壁卡 | TeamSelect.openSkillPicker | 已修 wordWrap, 待 push |
| 2 | TeamSelect 布局与原版差很大 (28 网格 vs 上槽下列表) | TeamSelectScene | 大改 |
| 3 | 战斗内 25 龟用头像 PNG, 没用 idle sprite / 原画 | BattleScene.makeView + BootScene.preload | 大改 |
| 4 | HP 条简陋 (纯色块), 没渐变/边框/护盾叠层/buff icon 横列 | BattleScene.makeView HP UI | 中改 |
| 5 | 战斗统计 DMG 不分类 (物/法/真/DOT) | battle-stats + showStatsPanel | 中改 |
| 6 | 对局逻辑跟原版不一致 (具体待定位) | combat.js vs damage.ts/skill-handlers.ts | 待对比 |
| 7 | 按钮文字爆框 (具体待截图指) | 多处 .makeButton | 小改散 |
| 8 | 战斗模式缺: 测试/Boss挑战/指定Boss | MainMenu + 新 Scene | 大改 |
| 9 | Codex 内容缺 (原版 6 tab vs Phaser 2 tab) | CodexScene | 中-大改 |
| 10 | 装备显示丢失 (具体位置待确认) | 装备 UI | 待定位 |
| 11 | 主菜单画布错 (具体待确认) | MainMenuScene bg | 待定位 |
| 12 | 小商店 vs 大商店概念理解错 | ShopOverlay + RewardPickScene | 待对比 |
| 13 | 技能描述完全没按模板 (可读句 + 公式 + 着色 stat) | data/pets.ts skill brief/detail | 大改 |

## 元-bug (流程问题)

- **我** 之前声明 v0.8 26/26 done 时, 只跑了 P2.1 / P2.2 / P2.8 三个面板, 没跑整局战斗, 没翻 Codex, 没对照原版截图。这违反 [memory: feedback_no_false_tested.md] — 不允许在没跑过完整玩家流程的情况下说"通过"。
- **教训**: "build 通过" + "几个面板 OK" ≠ "feature done"。必须跑整局战斗 + 翻所有 scene + 对照原版截图。

## 量级估计

| 项 | 小时 | 备注 |
|---|---|---|
| 25 龟 sprite 接入 | 8-12 | 原版 animations/ 只 4 龟有, 其他 24 用 avatar 当 idle 单帧 |
| HP 条 + buff icon 横列 | 4-6 | 美术 + Phaser graphics |
| 战斗 mode 补齐 | 6-8 | 测试 / Boss / 指定Boss 3 scene |
| Codex 6 tab | 6-8 | 新 tab UI + 数据汇集 |
| TeamSelect 重布局 | 4-6 | 上 2×3 grid + 下横滚 |
| Damage 分类统计 | 3-4 | recordDamage 加 type 参数 |
| 技能描述按模板 | 3-4 | 28 龟 × 5 skill = 140 行重写 |
| 商店概念对齐 | 2-3 | 小=战斗内 / 大=关后 RewardPick |
| 其他散点 (modal/按钮/装备/菜单 bg) | 4-6 | 逐项定位 |
| **合计** | **40-57h** | 相当于一个 Phase 5 |

## 决策点

之前规划:
- v0.9 = PvP 联机 (Phase 5)
- v1.0 = 美术补齐 + Polish

实测后, 现在该:
- 把上面 13 项作为 **v0.9 Visual Parity Phase**, 推迟 PvP 到 v1.0
- 或者 反向: 重做 v0.8 = visual parity, 再 v0.9 = PvP

需要用户拍板。
