# 动画突变 / 位置闪现 修复方案

> 现象：小龟放技能（尤其**龟派气波**）体型突然变大/变小、位置异常闪现；赛博龟（能量大炮等）同样。
> 已定位根因，下面是实施指南。

## 根因

技能起手的「缩放预备动作（windup）」用了**裸 `scene.tweens.add({ scaleX/scaleY..., yoyo:true })`**，绕开了统一的 `SkillTweenMgr`，与 `SkillTweenMgr.watchTick` 的「归位重置」逻辑打架：

1. **小龟 龟派气波** `basicChiWave` — `src/engine/skill-handlers.ts:947`
   ```ts
   scene.tweens.add({ targets: cv.sprite, scaleX: cv.sprite.scaleX*1.08, scaleY: cv.sprite.scaleY*1.08, duration:275, yoyo:true, ease:'Sine.easeInOut' });
   ```
   yoyo 结束的瞬间，watchTick（`src/systems/skill-tween-mgr.ts:154-172`）检测到 sprite 缩放偏离 `homeScaleX/Y`（普通龟约 1.59×），强行 reset → 在 1.08× 与 home 之间**跳变**（体型突变）。

2. **赛博龟 能量大炮** `cyberBeam` — `src/engine/skill-handlers.ts:3089-3091`
   ```ts
   scene.tweens.add({ targets: cv.sprite, scale: cv.sprite.scaleX*1.08, duration:280, yoyo:true, ease:'sine.inOut' });
   ```
   更糟：同时还有一条**跳跃位移 chain**（:3083 `tweens.chain()`）。缩放 tween 不在 chain 里，两条 tween 各自结束、与 watchTick 抢 sprite 控制权 → 体型突变 + 位置闪现。

3. **结构性问题**：`SkillTweenMgr` 是「事后纠偏的安全网」(watchTick 反应式)，但很多 handler 的缩放/位移**完全不走它**，没有「起手缩放」「归位」的统一封装。

4. **纹理切换与缩放 tween 抢写**：idle↔attack 帧尺寸不同时 `setDisplaySize()`（`BattleScene.ts:3579-3591` 一带）直接改 scale，若此时有缩放 tween 在飞，互相覆盖也会跳。

## 修复方案

### 核心：把所有「起手缩放脉冲」收进 SkillTweenMgr

- 在 `skill-tween-mgr.ts` 加一个统一helper：`pulseScale(view, factor=1.08, duration=275)`，内部：
  - 以 `homeScaleX/Y`（而非当前 `sprite.scaleX`）为基准做 `home → home×factor → home` 的 yoyo；
  - 注册到 mgr 的「活动 tween」集合，**watchTick 看到该 sprite 有受管 tween 时跳过归位重置**；
  - tween 完成回调里显式 set 回 home，再从活动集合移除。

### 逐处替换

1. `skill-handlers.ts:947`（basicChiWave）→ 改用 `skillMgr.pulseScale(cv, 1.08, 275)`。
2. `skill-handlers.ts:3089-3091`（cyberBeam）→ 同上；并把缩放并入跳跃 chain 的时间线，或确保 watchTick 在两条 tween 全程都不介入。
3. 全局搜 `tweens.add` 中带 `scaleX/scaleY/scale` 且作用于 `*.sprite` 的起手动画，逐一收编（小龟其余技能、其它龟的 windup 同样隐患）。

### watchTick 防抖

- `skill-tween-mgr.ts:154-172`：归位前先判断「该 sprite 是否处于受管缩放/位移 tween」，是则**本帧不纠偏**（避免在 yoyo 中途/刚结束的过渡帧误 reset）。

### 纹理切换守卫

- `BattleScene.ts:3579-3591` 帧尺寸变化调 `setDisplaySize()` 前，若 sprite 有活动缩放 tween，则**延后到 tween 结束**再 fitToBox，或用相对比例而非绝对 scale。

## 验证
- solo-debug（菜单「快速单体调试」）选小龟，连放龟派气波、打击、过肩摔，肉眼确认无体型跳变/闪现；再选赛博龟放能量大炮、部署。
- 边界：技能被打断（目标中途死亡）时归位是否正确。

## 影响面
- 纯表现层，不动伤害数值；改动集中在 skill-tween-mgr.ts + 两处 handler + 纹理切换守卫，风险低。
