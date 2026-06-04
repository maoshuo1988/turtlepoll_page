# 性能修复方案（掉帧 / 输入延迟）

> 现象：在别人电脑（部署版）上卡、掉帧、有延迟；目标环境「都卡/不确定」→ 按通用优先级全面排查。
> 本文是**实施指南**，下一步按 P0→P2 顺序动手。每项给了文件:行、原因、改法、预期收益。

## 根因总览（按影响排序）

| # | 瓶颈 | 位置 | 严重度 | 机理 |
|---|------|------|--------|------|
| A | **backdrop-filter blur 多层叠加** | ActionPanel / DetailPanel / DmgStatsPanel / BattleTopRow 等 11+ 处 CSS | 🔴 CRITICAL | 战斗中多个半透明浮层各带 blur(4–8px)，全屏后期模糊在弱 GPU / 移动端开销极大，且叠加 |
| B | **浮动伤害数字 DOM 抖动** | `src/systems/visual_dispatcher.ts:216-365` | 🔴 CRITICAL | 每个伤害数 = 1 个 DOM div + 1 个 per-frame UPDATE 监听器（~800ms≈48帧）。多段技能一次 20+ 个数字 = 20+ 个每帧回调 + 20+ 次 reflow，无对象池 |
| C | **DPR=3 文字渲染** | `src/main.ts:23-27,146` | 🟠 HIGH | 文本 setResolution(max(DPR,3))，4K 屏上文字位图 9× 填充率与显存 |
| D | **Tween 无池化、并发量大** | `BattleScene.ts`（88 处 tweens.add，133 处 tween/particle） | 🟠 HIGH | 多段/AOE 技能瞬间 12–24 个并发 tween，弱机 >20 并发即掉帧 |
| E | **9 张战斗背景图全量入显存** | `BootScene.ts:60-64` | 🟠 HIGH | 9 张 2.6–3.1MB ~4K 背景一次性 load，~24MB 仅背景，且场景间不卸载；4K 背景未为 1280 画布降采样 |
| F | **粒子 ADD 混合 60 量级** | `BattleScene.ts`（~15 处 add.particles） | 🟡 MED-HIGH | quantity:60 + blendMode:'ADD'，AOE 命中 3 目标 = 3 个发射器并发 |
| G | **innerHTML 整段重建** | ActionPanel / DetailPanel | 🟡 MED | 每次 show/update 全量 `.innerHTML=`，无增量更新 |
| H | **idle 动画不暂停** | `BootScene.ts:240-250` | 🟡 LOW-MED | 18 套 sprite sheet 帧动画 24/7 循环，离屏也跑 |
| I | **资产未压缩 / 无 WebP** | vite + deploy | 🟡 MED | public/ 166MB，PNG 原样发布；Vercel/Gitee 靠服务器现压 |
| J | **双 RAF 循环** | `BattleStatsRail.ts` 金币动画 | 🟢 LOW | 自建 requestAnimationFrame 与 Phaser game loop 竞争 |

## 实施计划

### P0 — 立刻做（预计 30–40% 帧率提升，低风险）

1. **blur 降级（A）**
   - 加一个 `prefers-reduced-motion` / 弱机 / 移动端检测（`matchMedia('(pointer:coarse)')` 或 `navigator.hardwareConcurrency<=4` / `deviceMemory<=4`），命中时给 `<html>` 加 class `.perf-lite`。
   - CSS 里所有 `backdrop-filter: blur(...)` 包到 `:not(.perf-lite)`，`.perf-lite` 下改为纯半透明实色背景（`background: rgba(...)` 提高不透明度补偿）。
   - 至少对 **全屏遮罩**（DetailPanel veil blur(7px)、DmgStatsPanel blur(8px)）必降级。

2. **浮动数字对象池 + 去 per-frame 监听（B）**
   - 复用 12–16 个 DOM 节点的池，不再每次 create/destroy。
   - 飞行动画从「每帧 UPDATE 监听器手动 setPosition/setScale」改为**单条 tween**（Phaser tween 或 CSS transform + transition），让浏览器合成层处理，避免 O(floats) 每帧回调。
   - 并发上限：同窗口同段超过 N（如 12）个数字时合并显示（已有 `pickRowOffset` 分行，可加「超量则只显示总和」）。

3. **DPR 上限按设备（C）**
   - 桌面 >1440p 才允许 DPR 3；其余设备钳到 2；移动端钳到 1.5–2。
   - 改 `src/main.ts:23-27` 的 DPR 计算 + 文本 setResolution。

### P1 — 次轮（再 15–20%）

4. **背景按需加载 + 降采样（E）**
   - BootScene 不再预载全部 9 张；进战斗前只 load 当前地图那张。
   - 把 4K 背景离线降到 ~1920 宽（够 1280 画布 + ENVELOP 裁切），WebP 化。

5. **Tween 收敛（D/F）**
   - 多段/AOE 的逐段 tween 合并为 1 条带 onUpdate 的 tween 或时间轴；粒子 quantity 60→20–30，AOE 复用单发射器多发位置。

6. **idle 动画离屏/非活动暂停（H）**
   - 场景非活动或 sprite 不可见时 `anims.pause()`。

### P2 — 工程化（长期）

7. **资产 WebP + 预压缩（I）**：构建期转 WebP，Vercel 自动协商；显著降包体与显存。
8. **ActionPanel/DetailPanel 增量 DOM（G）**：避免整段 innerHTML 重建。
9. **金币 RAF 并入 Phaser 时钟（J）**。

## 验证方法
- Chrome DevTools Performance 录制一场含多段技能 + AOE 的战斗，看 Long Task / Layout / Composite 占比。
- 重点对比开关 `.perf-lite` 前后 FPS。
- 低配复现：DevTools「CPU 4× throttle」+「Device: low-end mobile」。

## 备注
- 渲染器 `Phaser.AUTO`（WebGL 优先）、antialias:true、roundPixels:false（main.ts:29-68）—— 维持现状，先抓上面的浮层/DOM/显存三大头。
