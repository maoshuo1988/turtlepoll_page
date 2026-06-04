# ⚠️ NOTICE — 本项目已冻结

**冻结日期**: 2026-05-30
**最后版本**: v1.0（[releases/turtle-v1.0.zip](../../releases/turtle-v1.0.zip)）

## 现状

斗龟场 v2 已**全面迁移到 Godot 4 引擎**，新工程位置：
👉 [games/turtle-battle-godot/](../turtle-battle-godot/)

迁移原因（2026-05-30 用户决策）：
- Phaser 缺工业级编辑器（坐标手调、动画接入难、不像"在做游戏"）
- 计划上 App + Steam 海外发行（Godot 是更合适的工业引擎）
- 现有 Phaser 代码本质是"代码驱动 demo"，长期商业化天花板明显

## 本项目接下来的待遇

| 类型 | 待遇 |
|---|---|
| **现有 v1.0 zip** | 继续提供给合作方使用，URL 不变 |
| **严重 bug**（崩溃 / 玩不下去） | 接受 PR / 修 |
| **新功能** | ❌ 不再加 |
| **小 bug / 体验问题** | ❌ 不再修（已知列表见下） |
| **依赖升级** | ❌ 不主动跟进 |

## 已知未修问题（v1.0 公开承认）

- 特殊护盾全免疫不跳字（physImmune 100% / 黑洞 / 训龟无敌）
- pixel-zh.ttf 字体文件未提供（控制台 404，不影响视觉，fallback 走 Microsoft YaHei）
- 装备/技能/羁绊文案有零星不一致
- 6 件 PoC 自加装备未经平衡校验
- 移动端体验不佳（v2 解决）

## 历史 Changelog

详见 [CHANGELOG.md](CHANGELOG.md)。

## 后续开发请走 Godot 版

[games/turtle-battle-godot/](../turtle-battle-godot/) 是 v2 主线，本项目不再接受新贡献。
