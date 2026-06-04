# 龟战 Arena — Phaser 3 游戏

---


**目的**: 作为主站 `/turtle-contest` 与 `/turtle-arena` 的统一游戏本体。

## 运行

```bash
cd games/turtle-battle-poc
yarn install
yarn dev
```

浏览器开 http://localhost:5173, 主菜单 → 点 "开始战斗" → 战斗屏。点对面的龟测试 VFX。

## 包含

- **Vite + TypeScript + Phaser 3.80** 项目骨架
- **BootScene**: 主题化加载条 + 资产 preload
- **MainMenuScene**:
  - 樱花林背景 (现有资产), 缓慢 parallax 漂移
  - 中央凤凰龟 idle 浮动 + 阴影
  - 标题 "龟龟对战" 黄色发光 + 呼吸效果
  - 樱花粒子飘落
  - 3 个像素按钮 (hover 放大 + click 缩 + 主题色变化)
- **BattleScene**:
  - 6 只龟 3v3 排布
  - 每只龟独立 HP 条 + 数字 + idle 浮动
  - 点击对面龟攻击 → 飘字 + camera 抖动 + 受击闪烁 + 击退
  - HP 归零 → 龟淡出消失
  - 返回按钮 (camera fade 切回主菜单)

## 关键设计决策

| 之前 (vanilla JS) | PoC (Phaser 3) |
|---|---|
| 47 个 @media query | **1 行** `scale.mode: FIT` |
| 4 套坐标系 (CSS abs / viewport-fit / scene-local / BATTLE_POSITIONS) | **1 套** Phaser canvas 坐标 |
| 150+ 处 `spawnFloatingNum` | `this.add.text() + tween` 一行 |
| CSS @keyframes 动画 | `this.tweens.add()` 跟数据耦合 |
| DOM 节点 ~200+ | Sprite/Container 几十 |
| 浏览器默认行为 (蓝色选中/拖拽/tap highlight) | Canvas 内全无 |

## Steam 独立游戏感来自

- Camera fade transition (不是页面刷新)
- Camera shake (受击 / 暴击)
- Sprite idle 动画 (即使不操作画面也有 motion)
- 飘字 + tween 弹性 (Steam 经典)
- 粒子 (樱花 / 受击)
- 按钮 hover 放大 + click 缩 (触觉反馈)
- 主题化加载条 (不是空白)
- Splash 启动屏 (不是空白闪一下)

## 真机测试

- 桌面 Chrome / Firefox / Safari: 直接打开
- 手机 (开 dev server, 同 wifi 用 IP 访问): 右上角 ⛶ 入全屏

## 下一步 (如果 PoC 通过)

参考 `/docs/phaser-migration-roadmap.md` (待写) — 15 周路线图.
