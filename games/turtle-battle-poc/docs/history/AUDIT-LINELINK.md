# AUDIT — 线条龟 lineLink + 飘字排序 (2026-05-19)

调查 c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo 仓库下 JS reference (`games/turtle-battle/js/`) 对 PoC port (`poc-phaser/src/`) 两个保真问题。

---

## Q1 — lineLink 行为对比

### JS spec (`games/turtle-battle/js/skills/line.js:60-107` doLineLink)

Step-by-step:

1. `enemies = getAliveTargets(attacker.side)` — 全体存活敌方.
2. **主目标 (target)**:
   - `calcCrit` → isCrit1/critMult1.
   - `baseDmg = round(atk × atkScale)`.
   - `dmg1 = max(1, round(baseDmg × critMult × calcDmgMult(calcEffDef)))` — **物理**, 走 DEF.
   - `applyRawDmg(...,'physical')` → 含 ink-link transfer 回环.
   - `addInkStack(target, 1, attacker)` ← **关键** — 走 helper, 自动:
     - cap = `attacker._inkCapOverride || 5`.
     - 设 `target._inkRapidActive = !!attacker._inkTrueDmg`.
     - 若 target 已有 `_inkLink`, **partner 同步加同样层数** (line.js:16-25).
     - `renderStatusIcons` (×2).
   - `spawnFloatingNum(tElId, ${_shown1}, isCrit?'crit-dmg':'direct-dmg', 0, 0)` — yOffset=0 主物理.
   - `triggerOnHitEffects(attacker, target, dmg1)` — 走 onHit.
   - `updateHpBar`.
3. **第二目标 (second)**: `enemies.find(e => e.alive && e !== target)` (顺序第一个非主活敌).
   - 完全镜像 (含 addInkStack partner-sync, spawnFloatingNum yOffset=0).
4. **建立 link** (only if second exists):
   - `linkType = attacker._inkTrueDmg ? 'true' : 'magic'`.
   - `target._inkLink = { partner: second, turns: skill.duration, transferPct, dmgType }`.
   - `second._inkLink = { partner: target, turns, transferPct, dmgType }`.
   - **2 个 '🔗连笔' 飘字, cls='crit-label', yOffset=-20** (在伤害数字 **下方** 20px, since y0 = -yOffset = +20 = 屏幕更低).
   - `renderStatusIcons(target)` / `renderStatusIcons(second)`.
5. **addLog**:
   - 有 second: `连接A与B N回合 (传递${transferPct}%${linkType==='true'?'真实':'魔法'})`.
   - 无 second: `→ target: dmg1物理 + 墨迹 (无第二目标, 无法建立连接)`.
6. `await sleep(800)` — 末尾 800ms 节奏.

### 跟 lineFinish 的状态机契约

- `_inkLink` 字段 (turn.js:377 init=null, 966-970 turns--/expire) — lineLink 唯一来源.
- `_inkStacks` (line.js addInkStack + lineFinish line 152 清 0).
- `_inkRapidActive` (line.js:11 — 决定 lineFinish 引爆 type & combat.js:1046 transfer type fallback).
- **combat.js:1042-1053** — `applyRawDmg` 内部对挂 `_inkLink` 的 target 自动 transfer `amount × transferPct%` 给 partner, dmgType 走 link.dmgType.
- lineFinish (line.js:109-163) 读 `_inkStacks` 引爆, 不读 `_inkLink` (link 只影响 transfer + addInkStack 同步).

### poc state (`poc-phaser/src/engine/skill-handlers.ts:4110-4165`)

逐步对比:
1. 主目标 atkScale 物理 dmg + critMult + DEF → applyRawDamage('physical'). ✓ 公式一致.
2. **`_inkStacks` inline `Math.min(5, ...)` 硬编码 cap=5** — 不读 `_inkCapOverride`. ✗
3. **缺 `_inkRapidActive` set** — partner 同步段缺失. ✗
4. **缺 partner-sync**: 若 target 已挂 `_inkLink` (上回合连笔), 当前 addInkStack 应当同步 partner — poc 不做. ✗
5. spawnFloatingNum 主物理 → `api.floatNum(target, ${shown1}, '#ff4444', 'direct-dmg')` (yOffset 默认 0). ✓
6. 第二目标镜像 — 同问题 (cap 硬编码, 缺 rapid sync).
7. 建 link → ✓ schema 一致 ({partner, turns, transferPct, dmgType}).
8. `'🔗连笔'` 飘字 — **yOffset 不传** (poc 默认 yOffset=0), 而 JS 传 -20. ✗ (但 poc 有 pickRowOffset auto-stack — 实际表现取决于堆叠逻辑, 不是真 -20 偏移)
9. **缺 sleep(800)** — handler 立即返回, 节奏比 JS 短 800ms. ✗
10. **缺 addLog** — 无 "连接 A 与 B N 回合 (传递 X%)" 战报. ✗
11. **无 second 分支**: poc 只 `return { touched: [target] }`, JS 还要 addLog "(无第二目标)". ✗

### combat 层 transfer 缺失 (致命)

`poc-phaser/src/engine/damage.ts:112` applyRawDamage **完全没有 `_inkLink` transfer 处理**.
JS combat.js:1042-1053 的 30% 伤害传递在 poc 内根本不触发, link 是死字段 (只在 BattleScene 计 turns--). 这是 lineLink 最严重的 fidelity gap.

### Diff 总表

| Aspect | JS | poc | Status |
|---|---|---|---|
| 主目标 atkScale × ATK 物理 | ✓ | ✓ | OK |
| 第二目标镜像 | enemies.find != target | enemies.find != target | OK |
| `_inkStacks` cap | `_inkCapOverride || 5` | 硬编码 5 | ✗ |
| `_inkRapidActive` set on hit | addInkStack 内 | 不设 | ✗ |
| partner-sync 已有 link 时同步 stacks | line.js:16-25 | 缺 | ✗ |
| 主/二目标各 1 个 物理飘字 yOffset=0 | ✓ | ✓ (走 pickRowOffset) | OK |
| 2× '🔗连笔' label yOffset=-20 (下方) | ✓ | yOffset=0, 走 row-offset | ✗ (位置错) |
| renderStatusIcons (×2 target, ×2 second) | ✓ | floatNum 内 refreshStatusIcons (隐式) | OK |
| `_inkLink` 双向建立 | ✓ | ✓ | OK |
| `_inkLink.dmgType` from rapid passive | ✓ | ✓ | OK |
| addLog 双分支 (有/无 second) | ✓ | 完全无 | ✗ |
| sleep(800) 末尾 | ✓ | 缺 | ✗ |
| **combat 层 transferPct 伤害分流** | combat.js:1042-1053 | applyRawDamage 不含 | ✗✗ **致命** |
| 无 second 时仍打主目标 + log | ✓ | 打了主目标但无 log | 部分 |
| lineFinish 击杀 reset cd | ✓ | ✓ | OK |

### Fix worklist (优先级降序)

1. **在 `engine/damage.ts:applyRawDamage` 内加 `_inkLink` 30% 传递分流** (跟 JS combat.js:1042-1053 同款; 用 `_skipLink` 参数防循环 + 飘 `${transferAmt}🔗` magic/true float).
2. 抽出 `addInkStack(target, count, attacker)` helper (replicate line.js:1-28), 替换 lineLink/lineSketch/lineInkBomb 内部的 inline `_inkStacks = Math.min(5, ...)`. 修 cap override + rapid sync + partner sync.
3. `'🔗连笔'` 飘字调用加 `yOffset: -20` (或保留 0 但 doc 标注 JS 把它放在下方).
4. lineLink 末尾加 `await sleep(800)` + 添加 `bus.emit('log', ...)` 两分支战报.
5. lineFinish: 引爆类型也需要尊重 `_inkRapidActive` (现在只看 caster `_inkTrueDmg`, JS 一致, OK — 但 cross-attacker 情况 (e.g. partner-sync 来的 stacks) 可能不一致, 暂跟 JS 行为对齐).

---

## Q2 — 飘字数字排序规则

### JS convention (`games/turtle-battle/js/engine.js:757-906`)

核心公式 (engine.js:818): `const y0 = -(yOffset || 0)` — 屏幕坐标系 Y 向下增, 所以:
- yOffset **正数 → y0 负 → 数字出现在 sprite 上方 (HIGHER on screen)**.
- yOffset **负数 → y0 正 → 数字出现在 sprite 下方 (LOWER on screen)**.

非伤害类 (label) 走 engine.js:874: `y0 = -(15 + (yOffset || 0) + autoOffset)` — base 上 15px + yOffset + auto.

**_floatStacks (engine.js:759-762)**: 每 spawn +1, 600ms+delayMs 后 -1; `autoOffset = stackCount × 16`. **只用于非伤害 label 路径** (engine.js:874). 伤害路径忽略 autoOffset, 严格按 caller 传的 yOffset.

### Canonical 多段伤害顺序 (`engine.js:908-956` spawnHitStack)

注释 line 914-919 明示:
```
Order (top = largest yOffset, since y0 = -(yOffset + ...)):
  PIERCE / TRUE  (white)  ← TOP
  MAGIC          (blue)
  PHYSICAL       (red)    ← BOTTOM
  SHIELD / BUBBLE (absorb) ← below all damage (informational)
```
GAP = 22px, `items.forEach((it, idx) => spawnFloatingNum(..., idx * GAP, ...))`.

实际 caller 不一定走 spawnHitStack — 大部分手写 yOffset.

### 5+ JS skill 实例

| Skill | layers | yOffsets (top→bottom) | colors |
|---|---|---|---|
| ghostTouch (ghost.js:32-34) | phys + true 同一 hit | true=22 (top), phys=0 (bottom) | white over red |
| ninjaShuriken crit (ninja.js:34,39) | phys + true | true=22, phys=0 | white over red |
| chestSmash (chest.js:158-159) | phys + true 同 hit | true=22, phys=0 | white over red |
| lineFinish (line.js:142-144) | label "墨迹×N引爆!" + phys + burst | burst=22 (top), phys=0, label=-20 (bottom) | magic/true over red over yellow-label |
| twoHeadMagicWave (two_head.js:15,24) | 交替每段 1 个 | yOffset=0 (单段) | alternating pierce / red |
| lineLink (line.js:97-98) | "🔗连笔" label only | yOffset=-20 (在 sprite 下方) | crit-label yellow |

**规则总结**: 主物理 (red) 永远 yOffset=0 (中线); 次伤害类型在 yOffset=22 (上方); label tag (crit-label) 可以为 -20 (下方) 显示, 或 0+autoOffset (text-only 走 label path 自动堆叠).

### poc state (`poc-phaser/src/systems/visual_dispatcher.ts:126-262`)

**poc 自创了 `FLOAT_ROW_BY_CLS` table + `pickRowOffset` (line 145-157)**:

```
FLOAT_ROW_BY_CLS:
  pierce-dmg/true-dmg/crit-pierce/crit-true/crit-label: row 0  (top)
  magic-dmg/crit-magic:                                  row 1
  direct-dmg/phys-dmg/crit-dmg/crit:                     row 2
  shield-dmg/shield-num/heal/passive/counter/death:      row 3
  debuff-label/dot-dmg/dodge-num:                        row 4
```
ROW_HEIGHT=22, 同 100ms 窗口内同桶同 cls 再 +22 错开 (line 156).

**pickRowOffset 是 poc 自创 auto-stack by cls 逻辑** — JS 没有这个 table. JS 把决定权交给 caller (handler 手动传 yOffset).

`spawnFloatingText` (line 208):
- `explicitYOffset = opts.yOffset ?? 0` — caller 显式传.
- `rowDy = pickRowOffset(bucket, cls)` — **永远计算 row 偏移**.
- `startY = y - rowDy` — **rowDy 直接加到起点**.
- 然后 damage 路径 `dmgStartY = startY - explicitYOffset` — explicit 再叠.

→ poc 实际 y0 = `-rowDy - explicitYOffset` (跟 JS 单只 `-explicitYOffset` 差一个 rowDy 项).

`BattleScene.floatNum` (BattleScene.ts:1448-1494) 把 `yOffset` 透传到 spawnFloatingText. 但绝大多数 poc skill handler **从不传 yOffset** — 只传 `(target, text, color, explicitCls)` 4 个参数.

### 5+ poc handler 调用

| Skill | layers | yOffset 显式传? | 实际堆叠靠? |
|---|---|---|---|
| ghostTouch (skill-handlers.ts:911-912) | phys + true | 否 (默认 0) | pickRowOffset (true=row0, phys=row2 → 22-44px diff) |
| ninjaShuriken crit (~1180-1185) | phys + true | 否 | pickRowOffset |
| chestSmash (line 2898) | phys 单段 | 否 | row 2 |
| twoHeadMagicWave (line 3063) | 交替 phys/true | 否 | 不同 cls → 不同 row |
| lineLink (line 4129/4147/4160/4161) | 2× phys + 2× crit-label | 否 | row 2 (phys) + row 0 (label) |
| lineFinish (line 2484/2491/2499) | label + phys + burst | 否 | label row 0, phys row 2, burst row 1 (magic) or 0 (true) |

### Diff 表

| Skill | JS yOffsets | poc effective (rowDy) | Status |
|---|---|---|---|
| ghostTouch | phys=0, true=22 | phys=44, true=0 | **顺序对** (true 在上), **像素错** (差 22 vs 44) |
| ninjaShuriken crit | phys=0, true=22 | phys=44, true=0 | **顺序对**, **像素错** |
| chestSmash (phys+thunder ⚡) | phys=0 主 + ⚡ 0 (after-tick) | 都 row 2, auto +22 错开 | **行为不同**: JS 同 yOffset (二者重叠), poc 自动错开 |
| lineFinish | label=-20 (下), phys=0, burst=22 (上) | label row 0 (顶), phys row 2 (中), burst row 1 (中上) | **label 位置错** (JS 在下, poc 在顶); **顺序大致对** (burst 仍在 phys 上) |
| lineLink | phys=0, label='🔗连笔' yOffset=-20 (下方) | phys row 2, label row 0 (顶) | **label 位置错** (JS 在下, poc 在上) |
| twoHeadMagicWave | 各段单飘字 yOffset=0 | row 0 / row 2 alternating | **错开了** — JS 不同 hit 时间错开靠 sleep, poc 用 row 错开 |

### 影响评估

- **正面**: poc 的 FLOAT_ROW_BY_CLS 顺序 (pierce>magic>phys>shield>dot) **跟 JS canonical TRUE>MAGIC>PHY>SHIELD 顺序一致**, 故同 frame 同 target 多 cls 的视觉 "颜色排版" 看上去 OK.
- **负面**:
  1. **crit-label / passive-num / debuff-label** 在 JS 里通常是 `-20` (sprite 下方) 或 `0+autoOffset` (label 路径自动堆叠), poc 把它们映射成 row 0 (=sprite **顶上**最高位). 视觉位置颠倒.
  2. **autoOffset 双路径混淆**: JS autoOffset 只用于 non-damage label path. poc 把 `pickRowOffset` 全局应用到 damage path 也会加 rowDy. 同 sprite 同 hit 出 3 个 phys 数字时, poc 还会再 +22 错开 (JS 不错开, 让它们重叠成单点 — 但 _floatStacks 自动 stack 也只在 label 路径).
  3. **handler 端约定差**: JS skill 显式传 yOffset (作者意图清晰); poc handler 全部默认 0, 让 dispatcher 自动决定. caller-side 无法 override.

### Fix worklist

1. **删除 `pickRowOffset` 自创 auto-stack-by-cls 逻辑** (visual_dispatcher.ts:126-157). 让 caller 显式控制 yOffset (跟 JS 1:1).
2. 在所有多段伤害 poc handler 内补上 yOffset:
   - `api.floatNum(target, ${pShown}, '#ffffff', 'true-dmg', 0, 22)` (true 在上).
   - `api.floatNum(target, ${nShown}, '#ff4444', 'direct-dmg', 0, 0)` (phys 在下).
3. crit-label / debuff-label 调用统一 `yOffset: -20` (跟 JS 一致放 sprite 下方).
4. 保留 _floatStacks autoOffset (×16) **只用于 label path** (visual_dispatcher.ts:174 已正确实现, 只 damage path 路径需要不加 rowDy).
5. 短期 hotfix: 把 FLOAT_ROW_BY_CLS 留作 fallback (caller 没传 yOffset 时用), 但行为加 doc 注释 "non-JS-canonical".

---

## 总结

**Q1 lineLink 最大 fidelity gap**: poc 的 `applyRawDamage` (damage.ts:112) **完全没实现 `_inkLink` 30% transfer 分流** (JS combat.js:1042-1053). 这意味着挂上 `_inkLink` 的 fighter 受任何伤害都不会分流给 partner, 整个机制 (建立 link 后续每次挨打 partner 也吃 30%) **完全死掉**. 次要 gap: lineLink 末尾少 sleep(800) + 完全没 addLog + `_inkCapOverride` 没读 + `_inkRapidActive` 没设 + partner-sync `addInkStack` 没抽出来 → lineSketch / lineInkBomb 也受影响.

**Q2 飘字排序**: **poc 自创了 `pickRowOffset` + `FLOAT_ROW_BY_CLS` table** (visual_dispatcher.ts:126-157), JS 没有这个机制 — JS 把决定权交给 caller (每个 skill handler 自己传 yOffset). poc cls→row table 顺序 (true row0 → magic row1 → phys row2) 跟 JS canonical 巧合一致, 但: (a) label 类 (crit-label / 🔗连笔) 在 JS 显式 -20 (下方), poc 映成 row 0 (顶上) — 位置颠倒; (b) handler 都不传 yOffset, 失去 caller 控制权; (c) 同 cls 同帧自动 +22 错开, JS 不做这件事.

**Doc location**: `poc-phaser/AUDIT-LINELINK.md` (本文件).
