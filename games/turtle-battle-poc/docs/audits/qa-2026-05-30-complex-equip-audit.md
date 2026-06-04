# Complex Equipment Audit — PoC vs JS Reference (2026-05-30)

Scope: 7 complex equipment effects flagged as "wired but not line-by-line verified".
Reference: `games/turtle-battle/js/equip-effects.js`, `engine.js`, `turn.js`, `systems/passive_subscribers.js`.
PoC: `poc-phaser/src/scenes/BattleScene.ts`, `engine/equipment-runtime.ts`, `data/equipment.ts`.

Legend:
- 🔴 numerical / logical discrepancy (cite both sides, recommend fix)
- 🟡 behavior difference plausibly intentional simplification — flag for review
- ✅ verified matching JS

---

## 1. 龙蛋 e_dragon_egg — 沿一排喷火龙

### ✅ Match
- `apply()` static bonuses: +8 baseAtk / +5 magicPen / set `_equipDragonEgg = true` / `_equipDragonEggStacks = 3`. 
  - JS `engine.js:171-175` ↔ PoC `equipment.ts:155-158`.
- 3-stack threshold + reset to 0 on fire.
  - JS `turn.js:593-603` ↔ PoC `BattleScene.ts:5466-5475`.
- Column targeting: filter enemies that have a `_slotKey`, gather unique column ids, pick a random one with enemies. Friendlies + enemies on that column included.
  - JS `equip-effects.js:19-32` ↔ PoC `BattleScene.ts:5489-5503`.
- Ally heal +40 HP / enemy 50 magic + 25 burn stacks.
  - JS `equip-effects.js:68, 74, 79` ↔ PoC `BattleScene.ts:5511, 5521, 5522`.

### 🔴 Numerical / Logical
1. **装备瞬间触发的喷火被吞** — JS `engine.js:177-182` schedules `setTimeout(() => triggerDragonFly(f), 600)` so a dragon fires **immediately on equip** + resets stacks to 0 (description "装备时立即获得 3 层吐息" → instant burn). PoC `equipment.ts:160-165` copies the same `setTimeout` block verbatim, but `triggerDragonFly` at the top of `equipment.ts:37` is **a no-op stub `(_f) => {}`**. Net effect: PoC never fires on equip; the player just walks into round 1 with 3 stacks pre-loaded, but no opening dragon, and the first natural fire happens at the holder's own turn-1 (3→4 stacks → fire on turn 1's pass, then reset).
   - Fix: in `equipment.ts:154-166`, replace the stub call with a real trigger. Cleanest: set `_equipDragonEggStacks = 3` and `_dragonEggImmediateFire = true`, then in `BattleScene.processComplexEquipEffects` or `runRoundStartPipeline` consume the flag with `triggerDragonFly(actor, allies, enemies)`. (Alternative: schedule the dragon via `scene.time.delayedCall` from `attachEquipment` site.)

2. **PoC heal bypasses the heal pipeline** — JS calls `applyHeal(ff, 40)` (`equip-effects.js:68`), so the +40 ally heal benefits from `_equipRippleHealAmp` (+30% per 涟漪 / +10% per 海浪), `_synergyGuardAmp`, and respects `healReduce` debuffs. PoC `BattleScene.ts:5512-5513` writes `a.fighter.hp = Math.min(a.fighter.maxHp, a.fighter.hp + 40)` directly.
   - Fix: pipe through `applyHeal(a.fighter, 40, f)` instead of raw `hp +=`. The actual healed amount becomes the floater value (already correctly computed via `a.fighter.hp - before`).

3. **No on-hit chain for the burn damage** — JS uses `applyAttackDamage(owner, ff, 50, { dmgType: 'magic' })` (`equip-effects.js:74`), which fires on-hit (火珊瑚 _equipBurn, 冰封水母 _equipStun, lifesteal `_lifestealPct`, lightning staff charge). PoC `BattleScene.ts:5521` uses `dealMagicHit` → `applyRawDamage` directly with no on-hit pass.
   - Fix: change `dealMagicHit` to route through whichever full-chain helper handles equip-sourced ranged damage (or augment `dealMagicHit` to fire on-hit when caller passes `attacker`).

---

## 2. 海浪 e_wave — 3-stack 横扫

### ✅ Match
- `apply()` static: +50 maxHp, +10% `_equipRippleHealAmp`, set `_equipWave/_equipWaveStacks=0`.
  - JS `engine.js:286-291` ↔ PoC `equipment.ts:270-274`.
- 3-stack threshold, reset on trigger.
  - JS `equip-effects.js:835-839` ↔ PoC `BattleScene.ts:7543-7546`.
- Ally hit: +20 shield + permanent +2 def / +2 mr.
  - JS `equip-effects.js:843-846` ↔ PoC `BattleScene.ts:7549-7554`.
- Enemy hit: 20 magic + permanent -2 def / -2 mr (`Math.max(0, ...)` floor).
  - JS `equip-effects.js:850-856` ↔ PoC `BattleScene.ts:7561-7567`.

### 🔴 Numerical / Logical
1. **横排方向反了 — 沿"列"扫不是沿"排"扫** — JS picks `rowKey = Math.random() < 0.5 ? 'front' : 'back'` and filters by `_slotKey.startsWith(rowKey + '-')`, so the wave sweeps a **horizontal row of 3** (e.g., front-0/1/2 = 3 cards across both teams' front rows). PoC `BattleScene.ts:7546` uses `String(Math.floor(Math.random() * 3))` = column index 0/1/2, and `launchWaveSweep` (`vfx/skills.ts:334`) filters by `_slotKey?.endsWith('-' + laneCol)`. `endsWith('-0')` matches both `front-0` AND `back-0`, i.e. a **vertical column-pair of 2** at column 0.
   - JS hits 3 fighters per side (6 max). PoC hits 2 per side (4 max). Different target count, different shape, contradicts the in-game description "沿一横排移动".
   - Fix: in `BattleScene.ts:7546` pick `'front'` or `'back'` (50/50), pass it to `launchWaveSweep`, and inside `vfx/skills.ts:334` change filter to `startsWith(laneRow + '-')`. Rename the parameter to `laneRow` for clarity.

### 🟡 Possibly intentional
- **Ripple heal amp +10% reuse** — JS notes this is shared with 潮汐涟漪 via `_equipRippleHealAmp` accumulation (JS `engine.js:288-290`). PoC does the same. Both stack to +40% when both items are equipped. ✅ matches.

---

## 3. 玩偶熊 e_doll — 30 物理 + 5 层召唤大熊

### ✅ Match
- `apply()` static: +5 baseAtk / +30 maxHp / `_equipDoll=true` / `_equipDollBigBearStacks=0` / `_equipDollSpawned=false`.
  - JS `engine.js:272-276` ↔ PoC `equipment.ts:255-259`.
- Each turn-end: pick random enemy (front-priority), 30 physical attack, +1 stack.
  - JS `equip-effects.js:738-750` ↔ PoC `BattleScene.ts:7665-7681`.
- ≥5 stacks → find empty slot in order `['front-0','front-1','front-2','back-0','back-1','back-2']` → spawn 大熊 250/50/25/25, mark `_isSummon`.
  - JS `equip-effects.js:752-790` ↔ PoC `BattleScene.ts:7684-7695` + `spawnDollBear` `BattleScene.ts:6522-6573`.
- Synergy boosts: `_synergySummonHpBoost` (×%) + summon ATK flat.
  - JS uses `_synergySummonAtkBoost`. PoC uses `_synergySummonAtkFlat`.
  - Comment in `BattleScene.ts:6556-6558` claims JS uses the same name — that's wrong but the runtime field PoC writes elsewhere matches its own naming, so synergy still applies. Not a bug, but the comment is misleading.

### ✅ Verified
- Description's "若己方阵营没有空位, 则继续小熊攻击" — PoC `BattleScene.ts:6527` returns false on no slot and `BattleScene.ts:7684-7695` does NOT reset stacks → next turn still ≥5 and tries again. Matches JS.
- Equip removed from `equipment` array after spawn (PoC `BattleScene.ts:7689`). Matches JS `equip-effects.js:761`.

### No discrepancies found for this item.

---

## 4. FPGA e_fpga — 2-bit 状态机

### ✅ Match
- `apply()`: +50 maxHp + set `_equipFpga=true`. JS `engine.js:229-232` ↔ PoC `equipment.ts:212-214`.
- 4 states, `Math.floor(Math.random()*4)`. JS `equip-effects.js:508` ↔ PoC `BattleScene.ts:5392`.
- State 00: heal 5% maxHp + permanent +2 def / +2 mr. JS `:512-515` ↔ PoC `:5400-5409`. ✅
- State 01: permanent +5 ATK + permanent +4% lifesteal. JS `:518-520` ↔ PoC `:5412-5418`. ✅
- State 11: -25% damage taken this turn, real damage exempt (`dmgReduce` buff, `combat.js` skips `dmgType==='true'`). JS `:528-530` ↔ PoC `:5428`. ✅ value/type
- Trigger timing: turn-begin (per actor turn). JS in `processTurnBeginEquipment` called from `beginTurn`; PoC in `processComplexEquipEffects` called from `nextActor` (`BattleScene.ts:2255`). ✅

### 🔴 Numerical / Logical

1. **State 10 — "+15% 增伤" implemented as ATK boost, not damage-output multiplier**
   - JS `equip-effects.js:523` writes `f._dmgBonusThisTurnPct = 15`, which `combat.js:888-889` reads on **every applyRawDmg call**: `amount = Math.round(amount * (1 + source._dmgBonusThisTurnPct / 100))`. This means **all damage types** (physical, magic, true) coming out of the holder get +15%.
   - PoC `BattleScene.ts:5421` pushes `{ type: 'atkUp', value: Math.round(f.baseAtk * 0.15), duration: 2 }` — a **flat ATK addition** consumed by `stats-recalc.ts:51`. Only physical/`atkScale`-based damage benefits. Pure-magic skills (constant `power`, no `atkScale`) and true-damage abilities get **zero** boost.
   - Fix: route through a real outgoing-damage multiplier path. Either (a) add `f._dmgBonusThisTurnPct` field, multiply at the same time `calcDamage`/`applyRawDamage` finalizes the number, and clear it at next turn-begin (mirror JS `equip-effects.js:503` reset loop); or (b) push a dedicated buff type `dmgOutPct` that `damage.ts` honors at attack time.

2. **State 10/11 buff duration:2 lasts 2 own-turns, JS lasts 1**
   - JS pushes with `turns: 1` and `turn.js:977` decrements at round-end → buff active **only the turn applied**.
   - PoC pushes `duration: 2`, decremented at next own-turn-begin (`tickBuffsDuration` in `processTurnBeginPassives:5225`). Sequence for holder:
     - Turn N start: push duration:2; act with buff active.
     - Turn N+1 start: decrement to 1; **buff still active**; act; new FPGA roll pushes a second buff.
     - Turn N+2 start: original decrement to 0, expired.
   - Net effect: the previous round's FPGA buff overlaps with the current round's FPGA buff for one full action — players get **stacked +15% +15% (or +25% +25%)** every turn from turn 2 onward.
   - Fix: push with `duration: 1` so it expires at the next own-turn-begin tick before the new roll. (Confirm via test: `duration:1` decrements to 0 on next turn-begin, expires before new push.) Alternatively follow JS `_dmgBonusThisTurnPct` model (reset to 0 at top of `processComplexEquipEffects`, then re-set).

3. **Amplifier — same "增伤 → atkUp" problem, same duration stacking** (combined with FPGA-10)
   - JS `equip-effects.js:539-541` sets `f._dmgBonusThisTurnPct = Math.max(prev, pct)` (16-24%), shared with FPGA-10 via `max()` to prevent double-stack.
   - PoC `BattleScene.ts:5436-5440` pushes a SECOND `atkUp` buff with the amplifier value. When both items are on the same fighter, **PoC stacks both buffs** (no `max()`), giving up to +15% +24% = +39% flat ATK instead of `max(15, 24) = 24%` damage out.
   - Fix: when migrating to `_dmgBonusThisTurnPct` (per discrepancy #1 above), apply `Math.max` between FPGA-10 and amplifier exactly as JS does.

### 🟡 Possibly intentional
- PoC logs additional stat tracking (`_fpgaAtkGiven`/`_fpgaDefGiven`/`_fpgaMrGiven`/`_fpgaLifestealGiven`/`_fpgaBuffCount`) for grey-text accumulation that JS doesn't track. ✅ PoC enhancement only.
- PoC state 00 floater shows actual heal amount `f.hp - before` (JS shows fixed `+5%HP`). Cosmetic, both correct.

---

## 5. 信号放大器 e_amplifier — 16~24% temp 增伤

### ✅ Match
- `apply()`: +50 maxHp, set `_equipAmplifier=true`. JS `engine.js:235-238` ↔ PoC `equipment.ts:219-221`.
- Range: `16 + Math.floor(Math.random()*9)` = 16..24 inclusive. JS `:539` ↔ PoC `:5437`. ✅

### 🔴 Numerical / Logical
Same as **FPGA discrepancies #1 + #2 + #3** above. The "增伤" is implemented as an `atkUp` (flat ATK) buff in PoC vs JS `_dmgBonusThisTurnPct` output multiplier, with the same duration:2 stacking issue.

### Fix
Single fix migration for both FPGA-10 and amplifier: implement `_dmgBonusThisTurnPct` as in JS, reset at top of `processComplexEquipEffects` (mirror JS `equip-effects.js:503`), and have `damage.ts:calcDamage` (or the final write site) multiply outgoing amount by `(1 + source._dmgBonusThisTurnPct / 100)`. Then amplifier and FPGA-10 both write via `Math.max` — they no longer stack.

---

## 6. 生命珍珠 e_pearl — HP<50% 触发

### ✅ Match
- `apply()` static: +20 maxHp / +4 def / +4 mr / `_equipPearl=true`. JS `engine.js:79-83` ↔ PoC `equipment.ts:62-67`.
- Trigger condition: `target.hp / target.maxHp < 0.5` AND `_equipPearl` still set, on incoming damage to the holder. JS `passive_subscribers.js:127-132` ↔ PoC `equipment-runtime.ts:62-73`. ✅ (note: PoC uses `>= 0.5 return`, equivalent to `< 0.5 fire`).
- Heal: 20% maxHp. JS `:101 totalHeal = Math.round(owner.maxHp * 0.20)` ↔ PoC `:68 Math.round(owner.maxHp * 0.2)`. ✅ number.
- Fireball damage: 8% target maxHp magic + 30 burn stacks on random enemy. JS `:130-137` ↔ PoC `BattleScene.ts:8591, 8595-8596`. ✅ numbers.
- Destroy on trigger: `_equipPearl = false`. JS `:111` ↔ PoC `:67`. ✅
- Single-fire guard: PoC uses `_equipPearl` flag (set false at trigger). JS additionally uses `_equipPearlFiring` to prevent re-entry during the async animation. PoC does single fire too because `target.hp/maxHp` check + flag reset is atomic before the awaited fireball — race risk is low.

### 🔴 Numerical / Logical

1. **Heal bypasses applyHeal pipeline**
   - JS `equip-effects.js:104` calls `applyHeal(owner, totalHeal)` → 受 `_equipRippleHealAmp` (+30% per 涟漪 / +10% per 海浪) 增益, `healReduce` debuff 削减, `_equipStarOverflow` 转盾.
   - PoC `equipment-runtime.ts:68-69` writes `owner.hp = Math.min(owner.maxHp, owner.hp + heal)` directly — none of the modifiers apply.
   - Fix: import a real `applyHeal(owner, heal, owner)` in `equipment-runtime.ts` and replace the direct assignment. (The current top-of-`equipment.ts` `applyHeal` impl is correct; expose it as a helper.)

2. **Fireball goes through `dealMagicHit` (applyRawDamage), no on-hit chain or lifesteal**
   - JS `equip-effects.js:131` calls `applyAttackDamage(owner, target, baseDmg, { dmgType: 'magic' })` — full chain: on-hit (火珊瑚 burn, 冰封水母 stun, lightning staff charge), lifesteal `_lifestealPct`, ranged equip triggers.
   - PoC `BattleScene.ts:8595` calls `this.dealMagicHit(e, fbDmg, '🔥')` → `applyRawDamage` direct write to HP/shield, no on-hit, no lifesteal.
   - The 30 burn stacks are correctly added in `:8596` (matching JS `:137`) but other on-hit equips do nothing.
   - Fix: either change `dealMagicHit` to optionally accept an attacker + dispatch on-hit, or use the proper `applyAttackDamage`-equivalent helper here. Same fix recommended for Dragon Egg burn damage (discrepancy 1.3).

3. **Pearl fireball `Math.round` vs JS `Math.max(1, Math.round(...))`**
   - JS `equip-effects.js:130` floors damage at 1: `Math.max(1, Math.round(target.maxHp * 0.08))`. PoC `BattleScene.ts:8591` uses plain `Math.round(e.fighter.maxHp * 0.08)`. For a target with maxHp < 7 this rounds to 0 → no damage applied to the HP, though 30 burn stacks still hit.
   - Realistic impact: rare (no real fighter has maxHp < 50). Cosmetic edge case but easy fix: `Math.max(1, Math.round(...))`.

### 🟡 Possibly intentional
- PoC removes the JS-style 3-second 6-tick heal animation in favor of immediate one-shot heal (JS comment `equip-effects.js:103` says "用户去掉旧版 6 段 3 秒渐进"). Match — both single-shot now. ✅
- PoC has no `_isSummon / _isPirateShip / _isCrystalBall / _isConchWorm` guard at fire-time (JS `equip-effects.js:94`). In practice these companions never hold `e_pearl` (apply path only attaches to real turtles), so the guard is dead code in both. ✅

---

## 7. 复活海螺 e_conch — 死亡变小虫

### ✅ Match
- `apply()` static: +100 maxHp / `_equipConch=true`. JS `engine.js:157-159` ↔ PoC `equipment.ts:141-142`.
- Worm transform stats: 150 HP / 20 ATK / 0 def / 0 mr / 0 crit / 0 pen, with `lvBonus = 1 + (lv-1)*0.05`. JS `equip-effects.js:166-176` ↔ PoC `BattleScene.ts:4358-4368`. ✅ identical math.
- Companion entity cleanup: `_summon` / `_pirateShip` / `_crystalBall` / `_drones`. JS `:153-164` ↔ PoC `:4345-4357`. ✅
- All `_equip*` flags cleared (worm shouldn't inherit). JS `:180-188` ↔ PoC `:4396-4426`. ✅ matches list 1:1.
- `_isConchWorm = true`. JS `:190` ↔ PoC `:4371`. ✅
- Worm skill (auto-attack lowest-HP enemy each turn). JS replaces `f.skills` with a `wormBite` skill `{ name:'啃咬', type:'wormBite', ..., cd:0, cdLeft:0, atkScale:1.0 }` and the AI picks it because `cdLeft === 0`. PoC `BattleScene.ts:4375-4380` pushes a `{ name:'啃咬', type:'physical', ..., cd:0, cdLeft:0, atkScale:1.0 }` skill but the worm's auto-attack is actually driven by `BattleScene.ts:7355-7367` (side-end loop filters `_isConchWorm`, picks lowest-HP enemy, calls `calcDamage(cf, lowest.fighter, cf.atk, 'physical')`). The skill object on `dead.skills` is essentially ornamental for the detail panel.
  - Outcome: same effective behavior. ✅
- Auto-attack scales: JS `equip-effects.js:199` `atkScale: 1.0` → 1×ATK physical. PoC `BattleScene.ts:7364` `calcDamage(cf, lowest.fighter, cf.atk, 'physical')` = 1×ATK physical with armor reduction. ✅ matches.

### 🔴 Numerical / Logical

1. **Dead-code parallel path in `equipment-runtime.ts` is missing the skill swap**
   - `equipment-runtime.ts:112-133` has an `e_conch.onDeath` handler that sets worm stats/`_isConchWorm` but **never replaces `f.skills`** and doesn't do companion cleanup.
   - Today this is invisible because `BattleScene.processDeathPassives` (called at `:8639`) hits the conch block at `:4337` first, sets `_conchUsed=true`, revives, and `:8640 if (view.fighter.alive) return` exits before `fireOnDeath(:8650)` ever runs.
   - The risk: anyone adding a conch-trigger path that bypasses `processDeathPassives` (e.g., direct kill via raw `fireOnDeath`) will get a half-baked worm with stats but no skills + leftover companions.
   - Fix: delete the partial implementation in `equipment-runtime.ts:62-74` and `:112-133` (mark `e_conch: { /* moved to BattleScene.processDeathPassives */ }` like `e_dragon_egg`). Keeps the single source of truth.

### 🟡 Possibly intentional
- PoC names the worm '海螺小虫' (`:4372`). JS names it just '小虫' (`equip-effects.js:191`). Cosmetic, intentional ("more descriptive in Phaser"). ✅
- PoC tints the sprite green + adds a 🐛 emoji badge instead of swapping to `conch-worm.png`. Comment at `:4437-4438` calls it "临时方案". Cosmetic, doesn't affect mechanics. ✅
- PoC clears `passive = null` (`:4373`) — JS doesn't explicitly set passive null on the worm but also never reads worm passives. Equivalent end-state. ✅

---

## Summary Table

| Equipment | 🔴 Critical | 🟡 Review | ✅ Match |
|-----------|------------|-----------|---------|
| 龙蛋 e_dragon_egg | Instant-on-equip dragon never fires; ally heal bypasses heal pipeline; burn damage bypasses on-hit chain | — | Stack mechanic, column targeting, +40 heal / 50 magic / 25 burn values |
| 海浪 e_wave | Wave sweeps a column instead of a row → 2 targets instead of 3, contradicts description | Ripple heal-amp +10% intentional stack | Stack mechanic, +20 shield / +2 def-mr / 20 magic / -2 def-mr |
| 玩偶熊 e_doll | — | Synergy field-name comment slightly wrong (cosmetic) | 30 phys, 5 stacks → 250/50/25/25 bear, slot order, no-slot retry, equip removal |
| FPGA e_fpga | State 10 "+15% 增伤" is flat ATK not output multiplier (magic dmg unaffected); duration:2 buff lasts 2 own-turns not 1 → stacks with next round's roll | grey-text stat tracking is PoC-only enhancement | 4-state RNG, state 00/01 numbers, state 11 dmgReduce value 25 |
| 信号放大器 e_amplifier | Same "+%增伤" → flat ATK miscoding as FPGA-10; same duration stacking; missing `Math.max` co-ordination with FPGA-10 → both buffs stack when one item or the other is equipped along with the other | — | 16-24% range, +50 maxHp |
| 生命珍珠 e_pearl | Heal bypasses applyHeal pipeline (ripple/healReduce/star overflow ignored); fireball bypasses on-hit chain + lifesteal; Math.round vs Math.max(1, round) | Removed JS 6-tick anim intentional; companion guard dead code in both | <50% HP condition, 20% maxHp heal, 8% target maxHp magic, 30 burn, single-fire flag |
| 复活海螺 e_conch | Stale parallel `equipment-runtime.ts` handler is incomplete (missing skill swap + companion cleanup) — currently dead code but invites future bugs | Worm sprite tint vs texture swap (cosmetic) | 150/20 stats + 5%/lv scaling, all `_equip*` flag clearing, side-end lowest-HP attack at 1×ATK physical |

---

## Recommended Fix Priority

1. **High — affects numerical correctness in common cases**
   - FPGA-10 + amplifier: implement `_dmgBonusThisTurnPct` for all damage out; fix the duration:2→duration:1 issue (or migrate to non-buff field).
   - Wave: change row/column targeting to true horizontal row (front-row OR back-row).
   - Dragon Egg: wire the instant-on-equip dragon fire.

2. **Medium — affects edge cases / synergies**
   - Pearl heal pipeline (`applyHeal` instead of direct hp write).
   - Pearl + Dragon Egg fireball/burn damage: route through on-hit chain so 火珊瑚/冰封水母/lifesteal/lightning staff synergies fire.

3. **Low — cleanup / hardening**
   - Delete dead `e_conch` onDeath stub in `equipment-runtime.ts`.
   - Fix Pearl fireball `Math.max(1, ...)` floor.
   - Correct the misleading synergy field-name comment in `spawnDollBear`.

---

## File / Line References (Quick Index)

PoC:
- `poc-phaser/src/data/equipment.ts:37` — stubbed `triggerDragonFly = (_f) => {}`.
- `poc-phaser/src/data/equipment.ts:154-166` — dragon_egg apply with non-functional setTimeout.
- `poc-phaser/src/scenes/BattleScene.ts:5391-5433` — FPGA implementation.
- `poc-phaser/src/scenes/BattleScene.ts:5436-5441` — amplifier implementation.
- `poc-phaser/src/scenes/BattleScene.ts:5466-5475` — dragon-egg per-turn stack.
- `poc-phaser/src/scenes/BattleScene.ts:5485-5525` — triggerDragonFly impl.
- `poc-phaser/src/scenes/BattleScene.ts:7541-7579` — wave side-end implementation.
- `poc-phaser/src/scenes/BattleScene.ts:7664-7697` — doll side-end implementation.
- `poc-phaser/src/scenes/BattleScene.ts:4337-4460` — conch revive (death-pass primary).
- `poc-phaser/src/scenes/BattleScene.ts:7355-7367` — worm side-end auto-attack.
- `poc-phaser/src/scenes/BattleScene.ts:8585-8600` — pearl fireball.
- `poc-phaser/src/engine/equipment-runtime.ts:62-74` — pearl trigger condition.
- `poc-phaser/src/engine/equipment-runtime.ts:112-133` — conch onDeath stub (dead code).
- `poc-phaser/src/vfx/skills.ts:324-387` — launchWaveSweep (column-pair filter).
- `poc-phaser/src/engine/stats-recalc.ts:113-121` — tickBuffsDuration (decrement at turn-begin).

JS:
- `games/turtle-battle/js/equip-effects.js:14-86` — triggerDragonFly.
- `games/turtle-battle/js/equip-effects.js:91-143` — triggerPearlHeal.
- `games/turtle-battle/js/equip-effects.js:150-208` — triggerConchTransform.
- `games/turtle-battle/js/equip-effects.js:500-545` — processTurnBeginEquipment (FPGA + amplifier).
- `games/turtle-battle/js/equip-effects.js:737-793` — doll side-end.
- `games/turtle-battle/js/equip-effects.js:834-862` — wave side-end.
- `games/turtle-battle/js/engine.js:77-85` — pearl apply.
- `games/turtle-battle/js/engine.js:155-160` — conch apply.
- `games/turtle-battle/js/engine.js:169-183` — dragon_egg apply (with real on-equip setTimeout).
- `games/turtle-battle/js/turn.js:593-603` — dragon-egg per-turn stack.
- `games/turtle-battle/js/turn.js:973-978` — buff turn-end tick (turns--).
- `games/turtle-battle/js/combat.js:888-889` — `_dmgBonusThisTurnPct` consumer.
- `games/turtle-battle/js/systems/passive_subscribers.js:125-133` — pearl trigger subscriber.
