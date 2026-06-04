# 5-Question Audit (2026-05-19)

## Q1 — 向前跳 (attack hop final check)

### JS spec
- Keyframes (`games/turtle-battle/css/scene.css:280-294`):
  - `@keyframes attackHopRight` / `attackHopLeft`
  - Timing: `1.2s ease-in-out` (single ease, applied globally — `scene.css:278-279`)
  - 6 keyframes: `0%, 15%, 20%, 80%, 95%, 100%` with translate `(0,0) → (±18,-6) → (±25,0) → (±25,0) → (±5,-3) → (0,0)`
  - CSS `ease-in-out` keyword = `cubic-bezier(0.42, 0, 0.58, 1)` per W3C; Phaser `cubic.inOut` ≈ same shape (custom JS implementation, not exact bezier but very close)
- Invocation (`games/turtle-battle/js/ui-anim.js:153-167`): `playAttackAnimation(f)`
  - adds `attack-hop` class → CSS keyframes run, removes after `hopDuration + 50 = 1250ms`
  - `ATTACK_HOP_TOTAL_MS = 1200` (`constants.js`), `ATTACK_HOP_FORWARD_MS = 240`
- Damage sync (`action.js:528-529`): `ATTACK_DAMAGE_SYNC_MS = 400` — sleep 400 BEFORE damage; happens AFTER the 600ms skill banner (`action.js:512`)
- Pre-hop sequence: `showSkillAnnounce` → `sleep(600)` → start hop → `sleep(400)` → damage → ... → `sleep(400)` after damage if `_hasAttackAnim`
- Skip cases (`action.js:520-521`): `SKIP_DEFAULT_HOP = new Set(['ninjaImpact', 'ninjaBackstab'])` — these skills drive their own caster animation
- Skip if no `playAttackAnimation` AND skill in SKIP set → fallback `attack-anim` class (also skipped)
- CSS cleanup: `setTimeout(() => card.classList.remove('attack-hop'), 1250)` always fires; no programmatic interrupt path

### poc state (after P19)
- `poc-phaser/src/scenes/BattleScene.ts:1730-1786` — addCounter + `cubic.inOut` + 6 keyframes
- Keyframe %/xy values match JS 1:1 (verified)
- 600ms announce wait: `BattleScene.ts:1644` — matches
- 400ms damage sync: `BattleScene.ts:1792` — matches
- Bottom return delay (JS 400ms after damage) — uses `runSkillHandler(...).then(endTurn)`; endTurn adds another 400ms (`:5220`), so loose match if handler is ~0ms
- skip-hop list: NOT honored — `Grep SKIP_DEFAULT_HOP` returns 0 hits in poc; `ninjaImpact`/`ninjaBackstab` handlers in `skill-handlers.ts:1019, 1212` still run the hop chain in parallel with their own caster anim
- Chain interrupt: `SkillTweenMgr.watchTick` (`systems/skill-tween-mgr.ts:151+`) drift-corrects, but `_isSkillTween` flag prevents correction WHILE running — death-during-attack still relies on counter `onComplete` to snap home
- `cubic.inOut` vs CSS `ease-in-out`: close but not identical (cubic-bezier(.42,0,.58,1) is the true CSS curve; Phaser's `cubic.inOut` is `t<0.5? 4t³ : 1-(-2t+2)³/2` — visually indistinguishable)

### Status: ⚠️ PARTIAL
### Remaining gaps:
1. **`ninjaImpact` / `ninjaBackstab` skip-hop NOT implemented** — animations may visually fight (poc plays attack hop overlaid on the skill's own translate)
2. CSS uses `1250ms` cleanup timer (50ms buffer) — poc's `onComplete` runs exactly at `ATTACK_HOP_TOTAL_MS=1200`, no buffer — negligible
3. Mobile-scale keyframes (`scene.css:300-315`) not ported — poc canvas is fixed virtual size, may not need

---

## Q2 — 野生实际用了哪些地图

### JS maps (PvE = `gameMode === 'pve'`)
- `games/turtle-battle/js/battle-setup.js:148-159` — explicit mode-keyed selection:
  - **pve (野生)**: `bg-sakura.png` — ONLY (hard-coded default)
  - boss: `bg-ruins.png`
  - pvp-online: `bg-underwater.png`
  - dungeon: stage-keyed (1=sakura, 2=oasis, 3=cave-alt, 4=ice, 5+=ruins)
- No random / progressive map in PvE — sakura is constant
- `switchTestBg()` (battle-setup.js:476) lets test mode swap freely
- Asset files actually used in PvE: `assets/bg/bg-sakura.png` (only)
- All 9 maps exist in `games/turtle-battle/assets/bg/`: sakura, ruins, underwater, cave-alt, ice, oasis, forest, firefly, shipwreck — but PvE only ever loads sakura

### poc maps used
- `poc-phaser/src/scenes/BattleScene.ts:354-356` — RANDOM pick from all 9 (`bg-sakura, bg-cave-alt, bg-firefly, bg-forest, bg-ice, bg-oasis, bg-ruins, bg-shipwreck, bg-underwater`) for ALL modes
- `BootScene.ts:38-39` preloads all 9

### Status: ❌ SELF-CREATED (random map pick)
### Divergence:
- poc: random of 9 every battle
- JS: sakura locked for PvE; ruins for boss; underwater for PVP; stage-keyed for dungeon
- Fix: mirror JS mode-keyed mapping — `pve → bg-sakura`; map `boss/dungeon/pvp` cases as above
- `bg-firefly` / `bg-forest` are dead in JS (no mode selects them — they exist only as test-mode-switchable assets)

---

## Q3 — 影子 (shadow)

### JS reality — DOES have shadow (contrary to P19 assumption)
- `games/turtle-battle/css/scene.css:18-31` — `.scene-turtle .st-shadow`:
  - position absolute, bottom 0, width `var(--dot-size, 80px)`, height `30%` of dot
  - radial gradient: `rgba(0,0,0,.55) → rgba(0,0,0,.25) → transparent`
  - `filter: drop-shadow(0 0 3px rgba(0,0,0,.3))`
  - `z-index: -1` (behind sprite)
  - `transform: translate(-50%, 0%)` from `left:50%`
- DOM injection: every `.scene-turtle` card gets `.st-shadow` div as child of `.st-body` (referenced in `scene.css:87` comment)
- Behavior: stays attached to `.st-body` → moves with hop/lunge animations (per JS comment lines 14-17, "永远在脚下，攻击时跟着冲上去")
- Visible in `ui.js:174` layout comment and `scene.css:87` shadow-stays-put comment

### poc state
- `BattleScene.ts:831-834` — comment says "JS 不画 shadow (CSS 没 .scene-turtle shadow 规则)" — **INCORRECT**, JS does have it
- `view.shadow = this.add.ellipse(...).setAlpha(0).setVisible(false)` — placeholder kept for boss size code
- `FighterView.shadow` field still in interface (`BattleScene.ts:52`)
- Boss branch at `:563` calls `view.shadow.setSize(160, 36)` — but invisible, so no effect

### Recommendation
**Reinstate the shadow.** JS shadow spec for poc:
- ellipse: width = sprite display width (~80px), height = 30% width (~24px)
- center at `homeY` (ground/foot anchor; bottom-anchored sprite, so same y as feet)
- color: radial gradient → Phaser approximation: `setFillStyle(0x000000, 0.55)` + slight `preFX.addBlur(2)` if available
- depth: just below sprite (sprite is depth 2, shadow depth 1)
- behavior: moves with sprite during hop (parent or `onUpdate` x-sync) — JS shadow is INSIDE `.st-body` so it travels with the body
- Boss: scale shadow ×1.5 (already in `setSize(160,36)` call)

If keeping invisible: DELETE the field entirely (boss-size call is dead code).

### Status: ❌ SELF-CREATED (P19 wrongly removed)

---

## Q4 — 等级显示 (level display)

### JS visual / logic
- CSS (`games/turtle-battle/css/base.css:55`) `.st-level-badge`:
  - `font-size:10px; font-weight:800; color:#ffd93d (gold); bg:linear-gradient(135deg,#4a3520,#2a1d12); border:1px solid #ffd93d80; border-radius:3px; padding:1px 4px; line-height:1; box-shadow:0 1px 2px rgba(0,0,0,.5)`
- Boss override (`scene.css:12`): `.scene-turtle.is-boss .st-level-badge{font-size:13px;padding:2px 6px}`
- Render (`ui.js:180`): `${f._level ? '<span class="st-level-badge">${f._level}</span>' : ''}` — shows whenever `_level` is truthy (i.e. ≥1)
- `_level` defaults to 1 (`battle-setup.js:288`, `main.js:366,415`) — so badge ALWAYS shows for players/AIs
- Position: INSIDE `.st-hp-row`, BEFORE `.st-hp-wrap` (left of HP bar) — `display:flex;gap:0`
- Same for player vs enemy team — no side-specific style
- Summon badge (ui-summon.js:36): smaller font 8px, same color/style
- TeamSelect pet card (`main.js:320`): `<div class="pet-lv">Lv.${lv}</div>` — different class, separate visual

### poc state
- `scene-turtle-dom.ts:91-103` — CSS 1:1 match (incl. shadow / colors / gradient)
- `scene-turtle-dom.ts:304` — render guard: `lv && lv > 1 ? ... : ''` — **DIFFERS** from JS (JS shows for `lv >= 1`)
- TeamSelect (`TeamSelectScene.ts:586, 901`): `Lv.X` text format — matches `pet-lv` div in JS visually
- Boss-size override: NOT explicitly done in poc CSS — `.scene-turtle.is-boss` selector absent

### Divergence
1. **Visibility threshold** — poc hides badge for Lv.1 fighters; JS always shows. Fix: change `lv && lv > 1` → `lv ? `${lv}` : ''` or just `lv >= 1`
2. **Boss badge size** — `.scene-turtle.is-boss .st-level-badge{font-size:13px;padding:2px 6px}` not ported
3. CSS otherwise pixel-identical

### Status: ⚠️ PARTIAL (mostly correct CSS, wrong visibility predicate)

---

## Q5 — 战斗流程 (battle flow)

### Comparison table

| Stage | JS | poc | Status |
|---|---|---|---|
| Initial turn state | `activeSide='left'`, `isFirstRound=true`, `sidesActedThisRound=0` (`turn.js:1156-1161`) | Same; `isFirstRound=true` at `:136` | ✅ |
| Turn-start banner (1100ms) | `beginTurn()` shows `showTurnStartBanner(...,1100)` (`turn.js:21-23`) | `showCenterBanner(...,900)` at `:5085` — 900ms | ⚠️ timing slightly off |
| Skill CD decrement | At `beginTurn` start, all fighters (turn.js:43-45) | At `startActorTurn` per actor (`:1028`) — **WRONG SCOPE** (should be round-start, not actor-start; means CDs decrement N times/round where N = side size) | ❌ |
| Turn-begin equipment hooks | `processTurnBeginEquipment` (turn.js:47) | `fireOnTurnBegin(actor.fighter)` per actor (`:1091`) — also wrong scope | ⚠️ |
| First-round 2-cap | `(isFirstRound && activeSide==='left') ? min(2, totalAlive) : ...` (`turn.js:1198`) | `(isFirstRound && activeSide==='left') ? min(2, totalAlive) : totalAlive` (`:950-952`) | ✅ |
| Order within side | team-array order (no sort — `getActableFighters` just filters, `engine.js:674-684`) | Sorts by `_slotKey.localeCompare` (`:972-976`) — **DIVERGES** | ⚠️ |
| Player vs AI gate | `gameMode==='pve' && activeSide==='left'` (`turn.js:1212`) | `activeSide==='left' && (mode pve/dungeon/custom/boss)` (`:1001-1002`) | ✅ |
| Stun skip | Detected in `nextSideAction`, marks acted, `sleep(600)`, recurse (`turn.js:1238-1253`) | Same pattern (`:978-998`) | ✅ |
| Single-fighter shortcut | `canAct.length===1 ? showActionPanel(canAct[0])` (`turn.js:1258-1260`) | If `canAct.length>1` show picker, else fall through to `startActorTurn(sorted[0])` (`:1003-1009`) | ✅ |
| AI thinking delay | `setTimeout(...1200)` (`turn.js:1295-1299`) — watchdog 8s | `delayedCall(1200)` (`:1307`) — no watchdog | ⚠️ (no watchdog) |
| AI heal priority threshold | `hpThresh = 0.4` (normal) / `0.35` (hard), heal targets `<hpThresh` (`ai.js:24-26`) | Same (`:1322-1328`) | ✅ |
| AI shield priority | `allies.some(a => a.shield < 30)` (`ai.js:28-29`) — shield types: `'shield'` only | `s.shield < 30`, types: `'shield'`/`'bubbleShield'`/`'commonTeamShield'` (`:1331-1334`) | ⚠️ widened |
| AI heal skill types | `'heal'` only (`ai.js:25`) | `'heal'`/`'bambooHeal'`/`'bubbleHeal'` (`:1325`) | ⚠️ widened |
| AI ult preference | 65% ult / 35% random (`ai.js:50`) | Same (`:1351`) | ✅ |
| AI target — taunt | enforced via `pickSkill` not AI (`action.js:222-223`) — AI just inherits | poc enforces inline `:1427-1429` | ⚠️ duplicated but correct |
| AI target — stealth | n/a in JS AI directly (combat layer enforces) | filter pool `!stealth` (`:1425-1426`) | ⚠️ poc explicit |
| AI target — front-row prio | `action.js:226` enforces in pickSkill | poc inline `:1431-1433` | ✅ |
| AI target — undead lock | `ai.js` (lines for `_undeadLockTurns` not in JS sample — TODO verify) | `:1444-1447` | 🆕 likely poc-added |
| AI target — weighted (<20% HP 90% / else 70/30) | NOT in JS `ai.js:6-180` — JS pickSkill uses `targets.sort(a,b => a.hp-b.hp)[0]` (lowest) in single-pick cases (action.js:204) | **poc-only weighted random** (`:1438-1455`) | ❌ self-created |
| Player skill pick | `pickSkill(idx)` → `showTargetSelect` OR `executePlayerAction` (action.js:186-232) | `actionPanel.show(...,(idx)=>...)` → `onPlayerSkillPicked` | ✅ shape match |
| Self-cast / AOE auto-skip target select | Explicit list in `action.js:197, 203, 209` | similar in `onPlayerSkillPicked` (not shown) | ⚠️ check needed |
| Action queue (online) | `_actionQueue` (action.js:462) | not implemented | 🆕 missing (single-player only) |
| Mid-action passive triggers | `triggerOnHitEffects` `processLavaTransform` etc | poc has similar `triggerOnHitEffects` import | ✅ partial |
| End-of-action sequence (per fighter) | `executeAction` end (action.js:631-668): `checkDeaths` → `animating=false` → `onActionComplete()` → `nextSideAction()` immediately | `endTurn()` adds 400ms then `nextActor()` | ❌ poc has extra 400ms |
| Death check frequency | At `executeAction` end + after each tickDot/tickHot + `checkBattleEnd` after every step | poc: at end of `runSkillHandler` + after DoT tick + after kill | ⚠️ less frequent |
| Side switch | `activeSide=other` → `sleep(300)` → `nextSideAction()` (turn.js:1383-1387) | `activeSide=other` → `processSideEnd` await → `continueAfterSideEnd` → `delayedCall(400)` (`:5092`) | ⚠️ 300 vs 400 |
| Side-end DoT/HoT order | `processSideEnd(endedSide)` before switch (turn.js:1308) — DoT on opposing, HoT on own, lightningStorm, thunderShell, cyberDrone, lavaTransform | poc `processSideEnd` (`:4650-4798`) — same order DoT→HoT→lightning→drones; `lavaTransform`/`thunderShell` paths exist; **1.5s pause shortened to 300ms** (`:4666-4667`) | ⚠️ timing shortened |
| Round end (sidesActed==2) | `processRoundEndBuffs` → `processFortuneGold` → `processEnergyWave` → `processPendingMechTransforms` (turn.js:1349-1380) | poc: only `isFirstRound=false; turn++` + ad-hoc bookkeeping in `continueAfterSideEnd` (`:5080-5092`) — **NO processRoundEndBuffs, no fortuneGold, no energyWave**, just inkLink/lavaShield/bubbleShield ad-hoc tick at `:5062-5079` | ❌ missing systems |
| beginTurn passives | rain dmg (turn.js:48-69), elem×3 burn (71-83), pirate-ship fire (84-99), bambooCharge release, neutralCreature actions, fortune coin gen, lightningStormSecond... | poc `startActorTurn` handles: rule/event (`:1034+`), thunderstorm, applyRulePerTurn, elem×3 burn, pirateShipFire, hunterExecute, lavaRage, complexEquip, turnBeginPassives | ⚠️ partial (no fortuneCoin gen, no neutralCreatureTurn, no anemoneHeal) |
| Battle end | `checkBattleEnd()` everywhere; ends when one side has 0 alive | `leftAlive.length===0 || rightAlive.length===0` at `nextActor` start | ✅ but checked LESS often |
| Banner first | "战斗开始" banner pre-battle | "战斗开始" not explicitly in poc create() — uses `cameras.main.fadeIn(400)` instead | 🆕 missing banner |

### Self-creation list (poc → not in JS):
1. `runEnemyAI` weighted target selection (70/30, <20% 90% lowest) — `BattleScene.ts:1438-1455`. JS uses simple `sort(a,b => a.hp-b.hp)[0]` (lowest) once front-row filter applied.
2. `_undeadLockTurns` target avoidance in AI (`:1444-1447`) — not found in JS ai.js core path.
3. `sortBy _slotKey.localeCompare` for actor order (`:972-976`) — JS uses team-array order via `getActableFighters` (`engine.js:674`).
4. `endTurn` 400ms delay (`:5220`) — JS has no inter-actor delay; just immediate `onActionComplete → nextSideAction`.
5. `continueAfterSideEnd` 400ms delay (`:5092`) — JS uses 300ms (`turn.js:1386`).
6. Skill CD decrement per actor turn (`:1028`) — JS does it once per round at `beginTurn` (`turn.js:43-45`). poc decrements N×per-side which under-counts CDs.
7. Random battlefield map pick (see Q2).
8. Shadow ellipse placeholder (Q3) and removed from view layer.
9. Shield-skill AI widened to `bubbleShield`/`commonTeamShield`; Heal widened to `bambooHeal`/`bubbleHeal` (`:1325, 1331`) — JS only checks `'shield'` / `'heal'` exact types.

### Missing-from-poc list:
1. `SKIP_DEFAULT_HOP` for `ninjaImpact`/`ninjaBackstab` (Q1)
2. AI 8-second watchdog (`turn.js:1292-1294`) — poc has no recovery for hung AI
3. `processRoundEndBuffs` — buff turn--, critUp removal, phantomStrike, lava/bubble/hiding shield (`turn.js:907-1006`)
4. `processFortuneGold` round-end coin tick
5. `processEnergyWave`
6. `processPendingMechTransforms` (mech zombie cleanup) — referenced in JS but absent in poc round-end path
7. `processNeutralTurn` — neutral creatures' own actions (anemone heal, treasure rage, crab swipe)
8. `processAnemoneHeal` at beginTurn
9. Action queue (`_actionQueue`) — single-player only, low priority
10. "战斗开始" 1.5s banner before first beginTurn (battle-setup.js:461-463 + 467)
11. `_processingEndOfRound` re-entry guard
12. Boss double-action per round (`isBossSide ? 2 : totalAlive` cap, `turn.js:1198`) — poc treats boss like normal actor
13. 1.5s side-end "cause-effect beat" pause (`turn.js:851`) — poc only 300ms
14. `pickSkill` self-cast/AOE skill list breadth (a lot of `'fortuneDice'`/`'fortuneBuyEquip'`/`'phoenixShield'`/`'hidingDefend'`/etc.) — poc `onPlayerSkillPicked` may have different list
15. Stone taunt redirect for `ignoreRow` skills — poc has it (`:1663-1664`); confirm
16. Turn timer (`startTurnTimer(180, canAct)`) — JS uses 180s player timer

---

## Summary

- (a) **Biggest divergence: Q5 (battle flow)** — multiple systemic issues:
  - Skill CD decrement scope (per-actor instead of per-round) under-decrements CDs
  - Missing round-end systems: `processRoundEndBuffs`, `fortuneGold`, `energyWave`, `pendingMech`
  - Self-created AI weighted target selection
  - Boss double-action cap missing
  - JS team-array order vs poc `_slotKey` sort
- (b) **Zero divergence: none fully clean.** Closest is Q1 (attack hop keyframes pixel-match) — but `SKIP_DEFAULT_HOP` for ninja skills missing → ⚠️ partial
- (c) Doc location: `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\poc-phaser\AUDIT-5Q.md`
