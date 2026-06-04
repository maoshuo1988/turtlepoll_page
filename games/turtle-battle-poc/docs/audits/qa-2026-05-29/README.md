# 全量龟·技能审计 (2026-05-29, 自主运行)

用户离开 ~10h, 授权自主跑完所有龟的所有技能, 核对是否正确工作, 汇总成一整张表。

## 数据源 (已采集)
- `skill-audit.json` — `__runSkillAudit()` 输出, **116 个技能全部跑过** (audit 模式, 无崩溃)。每行字段:
  - `pet` / `skill` / `type` (伤害类型/handler类型) / `atkScale` / `casterAtk`
  - `expectedApprox` = atkScale × casterAtk (**未减防的粗略预期**)
  - `dmgToPrimary` = 主目标实际承伤 (**已过防御/魔抗**) / `dmgToAll` = 总承伤 (含 AOE/多段)
  - `targetBuffsAfter` / `casterBuffsAfter` = 施放后目标/自身的 buff 列表
  - `casterShield` / `casterHpDelta` = 自身获得护盾 / 生命变化
  - `touched` = 命中单位数 / `error` = 异常 (全部为空 = 无崩溃)
- `passive-audit.json` — `__runPassiveAudit()`, **28 个被动全部跑过**, 无崩溃。
- `equip-audit.json` — 装备 (本轮非重点, 装备已于 qa-2026-05-28 批5 审过)。

## 核对方法 (每个技能)
对每只龟的每个技能, 三方交叉:
1. **描述预期** ← `src/data/pets.ts` 的 brief/detail (公式/伤害类型/段数/附加状态/buff/护盾/治疗)。
2. **实现** ← `src/engine/skill-handlers.ts` 对应 handler (实际 atkScale/段数/类型/buff/统计记录/边界)。
3. **审计实际** ← `skill-audit.json` 对应行 (dmgToPrimary/dmgToAll/type/buffs/shield/hpDelta/touched)。

判定每个技能: ✓ 正确 / ⚠️ 存疑(数值或表述偏差) / ✗ Bug。
注意:
- `dmgToPrimary` 已过防御, 不会等于 `expectedApprox`; 比的是**公式结构/比例/类型/段数**是否对。
- 重点核对: 伤害**类型**对不对 (物理/魔法/真实)、**段数/AOE** (touched/dmgToAll) 对不对、描述的**状态/buff/护盾/治疗/吸血**是否真的施加 (看 targetBuffsAfter/casterBuffsAfter/casterShield/casterHpDelta)、**混合伤害是否分类型记统计**、边界 (目标已死/无目标)。
- 显示层 (面板/飘字/状态栏图标) 无法在此纯逻辑审计中眼验 → 标注 "显示待眼验", 不替用户拍板。

## 分组 (5 组并行)
- G1: basic 石头 竹叶 天使 寒冰 → `audit-group1.md`
- G2: 忍者 双头 幽灵 钻石 财神 → `audit-group2.md`
- G3: 骰子 彩虹 赌神 猎人 海盗 糖果 → `audit-group3.md`
- G4: 泡泡 线条 闪电 凤凰 熔岩 → `audit-group4.md`
- G5: 赛博 水晶 宝箱 星际 缩头 无头 龟壳 → `audit-group5.md`

最终由主 agent 汇总进 `MASTER-AUDIT.md` + 问题清单 `ISSUES.md`。

## 崩溃备注 (setSize / 只动一只)
auto战斗/猎人处决/手动出招/超时×4/选目标 全路径复现失败; harness 也无崩溃 (audit跳动画)。
推断在**动画/UI/超时**路径。用户复现线索: "选技能时硬等倒计时结束" + 被泡泡束缚目标。待进一步定位。
