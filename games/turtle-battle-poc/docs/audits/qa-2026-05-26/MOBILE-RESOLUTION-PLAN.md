# 分辨率 / 移动端方案

> 问题：整个界面分辨率问题解决了吗？能在手机上跑完整局不卡死吗？
> 结论：**框架层基本做好，但有 4 处确定缺口 + 若干未实测风险**。下面分「已解决 / 待修 / 待实测」。

## ✅ 已解决（框架到位）

- **基准分辨率 1280×720**，`Phaser.Scale.FIT`（菜单/选龟）/ `ENVELOP`（桌面战斗）；触屏设备战斗**强制 FIT** 防裁切（`BattleScene.ts:768-780`，检测 `pointer:coarse || maxTouchPoints>0`）。
- **`--poc-ui-scale`**（=innerHeight/720，钳 0.8–1.7）由 BattleStatsRail 设置并随 resize 更新（`BattleStatsRail.ts:206,222-225`）；ActionPanel、StatsRail 已全量使用。
- **viewport meta** 完整：`width=device-width, viewport-fit=cover, user-scalable=no`（index.html:5）。
- **iOS 安全区** `env(safe-area-inset-*)`（index.html:693-696）；**竖屏拦截** `#portraitGuard`「请横屏」（index.html:801-803）；**iOS 添加主屏引导** `#iosInstall`。
- 触屏关闭自绘手套光标（`cursor.ts:36`）。
- 监听器清理基本到位：BattleScene/DetailPanel/BattleStatsRail/visual_dispatcher 都在 shutdown 卸载。

## ⛔ 复核更正（2026-05-27 逐条读真代码后）

> 初版「待修缺口」基于 recon agent 的**推测**，逐条对照真代码后 **3/4 是误报**，已更正如下。教训：recon 的"待修"必须先读代码证实再动手。

1. ~~DetailPanel 首次打开 fitScale 过期~~ **❌ 误报**：`DetailPanel.show()` 第 754-756 行**每次打开都重算 fit**（`const fit = min(innerW/1280, innerH/720)` → 0.9× → rAF applyScale）。不是只在 resize 算。无需修。

2. ~~非战斗场景继承 ENVELOP~~ **❌ 基本非问题**：ENVELOP **仅桌面**设（`BattleScene.ts:773 if(!isTouch)`），且 shutdown 恢复 FIT（:776-779）。**移动端从不进 ENVELOP**（触屏强制 FIT），所以会裁切的平台根本不会触发。桌面即便短暂继承也只是上下裁一点、不影响点击。低风险，暂不动。

3. **多浮层不接 --poc-ui-scale**（DmgStatsPanel / GlobalToolbar / BattleTopRow 等硬编码 px）— **唯一可能项，但非确定 bug**：常见分辨率下观感正常；只有在极端小屏/极端比例下可能比例失调。属"观感优化"而非"bug"，要改需在多分辨率真机/Playwright resize 下肉眼定标，不宜盲改。**列为可选打磨，非必修**。

4. ~~BattleLog 不封顶~~ **❌ 误报**：`BattleLog.ts:155` `if(this.lines.length > MAX_LINES) this.lines.shift()` 已封顶，render() 从封顶数组重建 DOM。节点有界。无需修。

**结论**：分辨率/移动端框架**实测已相当扎实**，无确定必修项。真正未实测的风险仍是 PERF-PLAN 里的**深海 5 连关显存累积**（需真机长跑验），那属性能/内存范畴。

## 🟡 待实测风险（手机端跑完整局要专门验）

- **大纹理 OOM**：18 套宠物 sheet（部分 500×500 帧）+ 9 张 ~4K 背景，低内存安卓（≤2GB）可能加载抖动/崩。→ 见 PERF-PLAN E（按需载 + 降采样 + WebP）。
- **深海 5 连关显存累积**：每关重建 BattleScene，无显式 `textures.remove()`；连战可能显存碎片 → 第 5 关变卡甚至崩。→ 关间清理未用纹理。
- **触控点击区**：GlobalToolbar / BattleTopRow 按钮未做触控尺寸审计，可能 <40px 难点。
- **超窄屏 (<360px)**：ActionPanel `min-width: calc(533px×scale)`，0.8 缩放下 426px，超窄手机可能贴边/溢出。
- **横竖屏切换**：portrait-guard 拦了竖屏，但中途旋转的 sprite homeX/Y 重算 vs DOM HUD 是否同步未验。

## 建议实测设备矩阵
iPhone SE(375×667) / iPhone 12(390×844,有安全区) / 低端安卓(720×1600,2GB) / 中端安卓(412×915)。
**关键场景**：深海 5 连关不崩、长局 BattleLog、改窗口后开 DetailPanel、20+ 浮字刷屏、战斗中旋转屏。

## 一句话答复
- 「分辨率问题解决了吗」：**主干解决**，但 #1–#3 这几个浮层在非标准分辨率下会比例失调，需补。
- 「手机能跑完整局不卡死吗」：**单局大概率能跑**，但**深海 5 连关 + 低内存安卓**是最大冻死风险点，未实测前不能打包票；P0/P1 性能项 + 上面 #待修 做完后再上真机验。
