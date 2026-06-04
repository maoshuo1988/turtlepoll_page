# 全龟 + 全装备 严格审查方案 (2026-05-28 自主执行)

> 标准: **以描述文案为准绳, 代码必须严格按描述跑** (JS 仅参考、可改进)。
> 把 `qa-2026-05-27/` 当已知问题基线: 已修的不重找, `保留`项重新核一遍, 在它之上做更深比对。

## 决策 (用户已拍板, 2026-05-28)
- **装备**: 20 龟全过完再集中过 46 件装备 + 横向扫光。
- **「永久盾 vs 持续N回合」类**: 默认 **改永久 + 改描述** (代码若已是永久盾, 只改文案; 报告里列出)。
- **执行模式**: 用户离开 ~10h。我**自己全部测完**: 拿得准的自己修, 拿不准的进**问题清单**, 用 Playwright + 全部工具, 完整测试 + 记录, 最后统一汇报。

## 每只龟 SOP (七步)
1. **取描述** — Read pets.ts 该龟整块: 每技能 type/hits/power/atkScale/defScale/mrScale/pierce/cd/各 `*Pct`/durations + brief/detail token 公式 + passive + `meleeSkills`/`volcanoSkills`(换形龟)。
2. **取实装** — Read 每 skill type 的 handler (skill-handlers.ts); 被动看 passive-triggers.ts + stats-recalc.ts + BattleScene createFighter flag 设置段。
3. **比对·伤害公式** — token 公式 (如 `{N:0.7*ATK}`) 逐项对上 handler 实算 (base·atkScale + def·defScale…); 核 hits 分段总量、pierce、暴击参与。
4. **比对·数值/时效** — cd、durations(注意 +1 约定)、stun/bleed 回合、%HP、击退; **盯「永久盾 vs 持续N回合」**。
5. **比对·目标/范围** — 单体/横排(sameColumn)/竖排(sameRow)/最低血/随机; 横排↔竖排措辞转置坑。
6. **伤害路径** — 走 dealPhysical/dealMagic(享 applyRawDamage 收口减伤) 还是手算 applyRawDamage; 查双减/漏减 (钻石那类)。
7. **显示接线(待眼验)** — DetailPanel 技能行/状态徽章/属性列 + 选龟 tooltip(含配对形态) + 图鉴换形。**只能报「接上了, 待眼验」, 不替用户拍板显示。**

判定: ✅读码确认 / ⚠️待用户决策(平衡/设计) / 🔴bug(改)。

## 每件装备 SOP
1. Read `apply(f)`: 改哪些字段/挂哪些 `_equipXxx` flag。
2. **追 flag 消费点**: grep 每个 `_equipXxx` set↔read; set 了没人读 = 死效果。
3. **通用 handler 是否读自定义字段**: shield/physical/heal 通用 handler 不读 healHpPct/selfHpPct (焦糖铠/糖果锤类)。
4. desc 措辞 vs 机制 (海浪横排坑)。
5. 消耗品 (c_) 运行时调用链 (applyHeal 曾空 stub)。
6. 多件叠加 cap。

## 横向「一类扫光」(grep 全表)
- 永久盾 vs 持续N回合: `shieldTurns` / `.shield +=` / desc「持续…回合…护盾」。
- 双减/漏减: 所有手算 `applyRawDamage` 调用, chokepoint 各减伤是否生效/重复。
- 死 flag: 每个 `_equipXxx`/`_synergyXxx`/passive flag set↔read。
- token ×N 骗人 (闪电打击类): `render-descs.ts` 出全表对 handler。
- duration +1 约定一致性。

## 工具
- **先看后改** (Read 真身)。
- 逻辑/数值/无崩: dev `__runSkillAudit/__runEquipAudit/__runPassiveAudit` (dummy 0防0抗·100万HP; `_auditMode` sleep 瞬返; 事件驱动被动孤立测不到) + Playwright (localhost:5173 dev)。
- 手感/美术/显示: 用户 4173 眼验。
- `scripts/render-descs.ts` 出全龟文案做公式比对。

## 批次
- 批1: fortune, dice, rainbow, gambler, hunter
- 批2: pirate, candy, bubble, line, lightning
- 批3: phoenix, lava, cyber, crystal (换形/复杂)
- 批4: chest, space, hiding, headless, shell, basic
- 批5: 46 装备/消耗品 + 横向扫光

## 已完成 (本会话, 此方案前)
石头/竹叶/天使/寒冰/忍者/双头/幽灵/钻石 (8 只), + 磐石之躯 rework + 钻石双减修复。
