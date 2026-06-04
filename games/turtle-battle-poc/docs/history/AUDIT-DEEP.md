# AUDIT-DEEP — 赌神/小/赛博 龟 + 死亡 + 血条 + 影子 (2026-05-19)

Line-by-line JS-vs-PoC compare. Paths absolute. Severity: P0 (broken/missing) > P1 (visible gap) > P2 (cosmetic).

Reference files:
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\js\skills\gambler.js`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\js\skills\basic.js`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\js\skills\cyber.js`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\js\combat.js`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\js\state.js`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\js\ui.js`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\games\turtle-battle\css\scene.css`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\poc-phaser\src\engine\skill-handlers.ts`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\poc-phaser\src\scenes\BattleScene.ts`
- `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\poc-phaser\src\systems\scene-turtle-dom.ts`

---

## Q1 — 赌神龟 (gambler)

JS skills are split: `doGamblerDraw` + `doGamblerBet` in gambler.js (1-112) and `doGamblerCards` + `tryGamblerMultiHit` in combat.js (799-852). Passive `gamblerBlood` is HP-scaling crit, defined in pets.js:347 and recomputed in turn.js `_recalcOneFighter` (1044-1054).

### gamblerDraw — 万能牌 (gambler.js:1-62)

**JS timeline:**
1. Per-hit ×2 loop (1-19):
   - perHit = `round(atk × atkScale)` (default 0.5)
   - `calcEffDef` → crit roll (`atk.crit` only, no special) → `critMult = isCrit ? 1.5 + extraCritDmg + extraCritDmgPerm : 1`
   - `dmg = max(1, round(perHit × critMult × calcDmgMult(eDef)))`
   - `applyRawDmg(caster, target, dmg, false, false, 'physical')`
   - `_shown = hpLoss + shieldAbs + bubbleAbs + auraAbs` (4-layer)
   - `spawnFloatingNum(tElId, _shown, isCrit?'crit-dmg':'direct-dmg', i*180, 0, {atkSide, amount})`  ← yOffset bumps per hit
   - `updateHpBar(target, tElId)` → triggerOnHitEffects → `await sleep(220)`
2. Self shield (21-24):
   - `shieldAmt = round(atk × selfShieldAtkPct/100)` (default 25%)
   - `caster.shield += shieldAmt` (permanent — NOT a buff!)
   - `spawnFloatingNum(fElId, '+${amt}', 'shield-num', 200, 0)`
3. Self heal (26-31):
   - `healAmt = round(atk × selfHealAtkPct/100)`
   - clamp to maxHp, `actualHeal = round(hp - before)`
   - `spawnFloatingNum(fElId, '+${actual}', 'heal-num', 350, 0)` only if >0
   - `updateHpBar(caster, fElId)`
4. Random 8-of-pool debuff (33-56):
   - 8 entries — 4 buffs (atk/def/mr/healReduce -20-50%, 3 turns) + 3 dots (poison/bleed/burn, stacks=`max(1, round(atk×0.11))`) + chilled
   - dot via `applyDotStacks(target, kind, stacks, caster)`
   - buff via `target.buffs.push({type, value, turns:3})` + `spawnFloatingNum(tElId, label, 'debuff-label', 500, -14)` + `renderStatusIcons`
5. `recalcStats()` + `renderStatusIcons(caster)` + `updateFighterStats` + addLog + `await sleep(600)`

**PoC handler:** `skill-handlers.ts:3747-3802` (`gamblerDraw`)

**Diff (P1 gaps):**
- Sleep cadence: JS 220ms between hits, poc uses 180ms (line 3768) — 40ms drift per hit.
- `i*180` floating yOffset NOT preserved — poc always passes default offset (no 4th arg → default 0).
- Self-shield float text: JS `'+${amt}'`, poc `'+${shieldAmt}🛡'` (added emoji not in JS).
- Self-heal float text: JS `'+${actual}'`, poc `'+${actualHeal}❤'`.
- Debuff float yOffset: JS `(500, -14)` (500ms delay + -14 yOff). poc just calls floatNum without offsets.
- No `recalcStats()` call after debuff push — atk/def changes won't reflect immediately.
- No final `await sleep(600)` polish hold.
- `_shown` 4-layer (auraAbs) not added in poc (only shield+bubble). Already a wider engine gap.

### gamblerBet — 赌注 (gambler.js:64-112)

**JS timeline:**
1. HP gate `<=40% → fail + log + sleep(1000)` (66-70).
2. Self HP drain (71-78):
   - `hpCost = round(hp × hpCostPct/100)` — JS uses `attacker.hp × pct` (not maxHp!)
   - `attacker.hp -= hpCost` (raw, bypasses shield)
   - `spawnFloatingNum(fElId, '${hpCost}HP', 'direct-dmg', 0, 0)` (note "HP" suffix)
   - `updateHpBar` + log + `await sleep(500)`
3. Temporary `_multiBonus += skill.multiBonus` (default 20).
4. 6-hit loop (88-106):
   - `dmgPer = round(hpCost / hits)`
   - inside loop: critRoll + applyRawDmg(physical) + `_shown` 4-layer
   - `tEl.classList.add('hit-shake')` → `await sleep(500)` → remove + `await sleep(100)`
   - then `tryGamblerMultiHit(attacker, target, tElId)` (extra chained hits via passive)
5. Final `_multiBonus -= skill.multiBonus` + `await sleep(200)`.

**PoC handler:** `skill-handlers.ts:3677-3713`

**Diff (P1):**
- JS `attacker.hp -= hpCost` (could go below 0 / kill); poc uses `Math.max(1, caster.hp - hpCost)` — gambler never self-kills in poc.
- Float text: JS `'${hpCost}HP'`, poc `'-${hpCost}HP'` (extra "-" + debuff-label color).
- Sleep: JS pattern is `sleep(500) → hit-shake → sleep(100) → multiHit chain` per hit. poc uses flat `sleep(180)` — wrong cadence + missing hit-shake VFX + missing multiHit proc.
- `tryGamblerMultiHit` chained call **not present** in poc gamblerBet loop. P0 — gambler passive procs are lost during bet.
- Initial 1000ms fail-sleep also missing.

### gamblerCards — 卡牌射击 (combat.js:828-852)

**JS timeline:**
- hits ×3 (skill.hits=3), each random scale `minScale + Math.random()×(maxScale-minScale)` (0.3~0.6).
- dmg = `max(1, round(atk × scale × calcDmgMult(eDef)))` — **no critMult in cards** (raw scale only).
- applyRawDmg(physical) + `_shown` 4-layer.
- `spawnFloatingNum(tElId, _shown, 'direct-dmg', 0, 0)` (never crit-dmg).
- `triggerOnHitEffects` + `tEl.classList.add('hit-shake')` → `await sleep(700)` → remove + `await sleep(200)` → `tryGamblerMultiHit`.

**PoC handler:** `skill-handlers.ts:3717-3743`

**Diff (P1):**
- JS does NOT crit cards — poc DOES (line 3726 `rollCrit/effectiveCrit`). **Wrong damage scaling.**
- Float type label: poc passes `isCrit ? 'crit-dmg' : 'direct-dmg'`; JS always `'direct-dmg'`.
- Sleep cadence: JS `sleep(700) + sleep(200) = 900ms` per hit. poc `sleep(200)` — 4.5× faster.
- No hit-shake VFX.
- No `tryGamblerMultiHit` chained call (passive cannot proc).

### Passive — gamblerBlood (pets.js:347 + turn.js:1044-1054)

Not an active. Pure stat passive: per-turn recalc gives `crit = _initCrit + min(maxGain, lostPct/threshold × maxGain)`. Overflow >100% crit → +1.5%/1% crit-dmg via `overflowMult`.

**poc:** `skill-handlers.ts:2820` (`gamblerBlood`) — implemented as a 30%-lost-HP true-damage + lifesteal ACTIVE. **P0 fidelity error**: this is a passive, not an active. The handler is wrong shape entirely. It should be a no-op (passive recalc lives in `passive-triggers.ts` / `stats-recalc.ts`).

### Passive — gamblerMultiHit (combat.js:799-825)

After every `doDamage` call (combat.js:285) and from inside `gamblerBet` (combat.js:285) + `gamblerCards` (combat.js:849), call `tryGamblerMultiHit`:
- chance = `passive.chance + _multiBonus`
- while `random()*100 < chance`: extra `dmgScale × atk` physical, crit-eligible, with falloff `chance *= 0.8` each chained hit.
- floatNum uses inline `gambler-hit-icon` + optional `crit-icon` image, yOffset random (`±15px`).
- hit-shake 400ms + sleep 100ms between chains.

**poc:** `skill-handlers.ts:2808-2819` (`gamblerMultiHit`) — implemented as 5-hit 0.5×ATK skill (active). **P0 fidelity error**: same kind of mistake — gamblerMultiHit is a passive proc, not a skill. No chained-decay loop, no falloff, no white-listed hooking after every main-hit, no `_multiBonus`-aware boost.

---

## Q2 — 小龟 (basic) 5 active skills

### turtleShieldBash — 龟盾击 (basic.js:1-125)

**JS animation sequence:**
1. Damage calc (4-23): atk×atkScale + optional lostHpPct + passive boosts (basicTurtle.bonusMap[rarity], frostAura.bonusTargets).
2. Caster body WAAPI rotation+Y-bob (35-41) **on top of CSS `.attack-hop`** (composite:'add', 440ms):
   - 5 keyframes: 0%(0/0) → 25%(translateY(-2px) rotate(-4deg)) → 55%(translateY(3px) rotate(6deg)) → 75%(translateY(1px) rotate(3deg)) → 100%(reset).
3. `await sleep(180)` then **golden comet arc div** (46-60): `.basic-shieldbash-arc` (+ `flip-x` if right-attacker), offset `(50%+arcOffsetX, 50%-20)` with arcOffsetX=`±50px`. setTimeout remove after 320ms.
4. `await sleep(250)` then **impact burst** (66-75): `.basic-shieldbash-impact` div, position `(50%+impOffsetX, 50%)` with impOffsetX=`±28px`. setTimeout remove after 280ms.
5. applyRawDmg(physical) + spawnFloatingNum yOffset 80 + updateHpBar + triggerOnHitEffects.
6. Target body knockup chain (86-104, 12 keyframes, 1400ms):
   - Phase 1 launch: 0% → 10% (14px,-28px rot 20°) → 22% (30,-42, 50°) → 33% (42,-6, 80°)
   - Phase 2 slam: 38% (44,8, 90°) → 42% (44,2, 90°) → 55% (44,5, 90°)
   - Phase 3 rise: 64% (44,0, 36°) → 70% (44,-2, 0°)
   - Phase 4 walk back: 80% (30,-3) → 88% (18,0) → 95% (8,-2) → 100% (0,0)
   - knockDir = `attackerLeft ? +1 : -1`.
7. Shield aura on caster in parallel (107-118): `.basic-shieldbash-aura` div, 560ms lifetime + `spawnFloatingNum '+shield' 'shield-num' (0,0)`.
8. `await sleep(1400)` final hold + addLog + applySkillDebuffs.

**PoC handler:** `skill-handlers.ts:494-586`

**Diff:**
- caster chop tweens.chain (525-533) **only 4 stages**, JS has 5 keyframes with explicit offsets (0/25/55/75/100). poc reads close (110+130+90+110=440ms), but `Sine.easeOut`/`sine.in` only loose match to JS implicit `ease-out` defaults.
- Step 3 (golden arc) **removed** in poc — comment line 536: "P20 删 drawGoldenArc 金色弧线 + spawnImpactBurst 冲击粒子 (poc 自创, JS basic.js 无)". **WRONG — these ARE in JS** (basic.js:46-75)! P1 loss of `.basic-shieldbash-arc` + `.basic-shieldbash-impact` VFX.
- Float yOffset 80 (after impact) preserved as 4th arg in floatNum? line 546 omits yOffset → poc default. P2.
- Target 14-step knockup chain ported (556-576). Verified 1:1 timing (sum = 140+168+154+70+56+182+126+84+140+112+98+70 = 1400ms ✓). One subtle issue: JS `cubic-bezier(.25,.7,.4,1)` → poc `cubic.out` (close), JS `cubic-bezier(.5,0,.75,.3)` (apex→fall) → poc `cubic.in` (close).
- Shield aura div `.basic-shieldbash-aura` removed line 578 — comment "P20: 删 spawnShieldAura 自创光环, JS 没此 VFX". **WRONG** — JS basic.js:111-115 creates it. P1.
- No `await sleep(1400)` final hold → poc ends earlier, addLog/applyDebuff drift.

### basicBarrage — 打击 (basic.js:127-230)

**JS sequence:**
1. Caster `fEl.classList.add('basic-chiwave-charging')` windup → `sleep(280)`.
2. Parallel shotTasks loop, each shot:
   - `await sleep(shotIdx × 280)` (stagger 280ms)
   - pick random alive enemy at spawn time (so dead targets skipped)
   - spawn `.basic-barrage-bolt` div at `(tCx - dir×travelPx, tCy-6)` where travelPx=250 (PC) / 170 (mobile)
   - `requestAnimationFrame` → set transition `transform ${shotDuration}ms linear` + `translateX(travelPx-40)` (210px drift)
   - setTimeout remove after `shotDuration+60` = 280ms
   - `await sleep(damageAt=130)` then apply dmg
   - per-shot crit roll + basicTurtle.bonusMap rarity-scaling
   - applyRawDmg(physical, deferDeath=true) — important: lets overflow hits land on dying target
   - `_shown` 4-layer + spawnFloatingNum direct-dmg (no yOff)
   - chi-hit-flash 120ms + hit-shake 180ms on target.
3. `Promise.all(shotTasks)` then `fEl.classList.remove('basic-chiwave-charging')`.
4. addLog total.

**PoC handler:** `skill-handlers.ts:592-625`

**Diff:**
- Bolt VFX **completely missing** in poc. No `basic-barrage-bolt` sprite, no spawn-and-drift animation. P0 visual.
- No `.basic-chiwave-charging` charging windup pose on caster. P1.
- `chi-hit-flash` + `hit-shake` per shot — missing. P1.
- `deferDeath=true` semantics: poc `dealPhysical` likely sets alive=false instantly, so subsequent shots skip target. JS lets all 10 shots play even if target dies. P1 behavior.
- basicTurtle.bonusMap rarity bonus not applied per-shot (poc dealPhysical hides this). P2 maybe present, but unclear.

### basicChiWave — 龟派气波 (basic.js:243-538)

**JS sequence (KOF-style 7 phases):**
1. Self-buff (249-266): add `chiWaveActive` buff carrying `revert{crit,critDmg,lifesteal,armorPen}` for 1 turn. Spawn 2 floating labels (passive-num + passive-num with yOff 16).
2. **KOF cut-in** (269-273): `.chi-cutin` fullscreen div → `sleep(500)` → remove.
3. Pick column targets (278-283): same `_slotKey.split('-')[1]` column.
4. Caster vertical alignment (286-322): WAAPI translateY to target row + bump zIndex=50; **camera zoom 1.2** anchored to `(midX, midY)` via transformOrigin %. `sleep(300)`.
5. Windup pose `basic-chiwave-charging` class → `sleep(550)` → remove.
6. **Single wave sprite** (`.basic-chiwave` div, 15 frames × 100ms = 1500ms life). Position computed via `.st-body` rects + zoom-aware local coords + `BATTLE_POSITIONS.back-${col}` for invariant travel distance. Wave Y-correction = -15px. travelDist = maxDist+60. WAVE_VISUAL_LEAD=80 → per-target delay.
7. Per-target hit task in parallel (437-514):
   - `await sleep(delay)` (per-target staggered)
   - Camera shake `--cam-scale: 1.2` + `.battle-scene-shake` 240ms (first target only).
   - Build juggle: `buildJuggleKeyframes(knockX=dir×55 PC/30 mobile, isMobile, {noRotation, knockupAnim})` 
   - tBody WAAPI animate (totalMs) + `basic-chiwave-launched` class + optional `playKnockupAnimation`.
   - Per-hit ×3 (i=0,1,2): `attacker.atk × perHitScale` (perHitScale = atkScale/3), critRoll, applyRawDmg(physical), `_shown` 4-layer, chi-hit-flash 140ms, spawnFloatingNum yOff `i×40 + i×18` (cumulative), 220ms between hits.
   - Fire-and-forget juggle cleanup via `juggleAnim.finished.then`.
8. Pull-back: caster slide back (320ms cubic-bezier), zoom to 1, sleep(340). Cleanup transforms + wave remove timer.

**PoC handler:** `skill-handlers.ts:635-728`

**Diff (P0):**
- Self-buff: poc adds 4 separate buffs `critUp/critDmgUp/lifesteal/armorPen` (lines 641-644) with `duration:2`. JS uses a single `chiWaveActive` with `revert` object + direct stat mutation (atk.crit += etc). Effects similar but stacking semantics differ.
- Cut-in: poc uses additive blend rectangle alpha-tween (656-666, total ~500ms). JS uses CSS `.chi-cutin` (specific gradient + blur — actual sprite asset). Visual fidelity lower but timing matches. P2.
- Column targeting: poc uses `sameRowFighters(api.allFighters, target)` (line 710). JS uses `_slotKey.split('-')[1]` filter. PoC likely has different selection criteria (`sameRow` vs `sameColumn`). **P0 — wrong selection target set.**
- Caster Y-alignment + zIndex 50 + transformOrigin: poc uses `cam.zoomTo(1.2, 300)` (672) without anchoring to row mid. JS computes `(midX, midY)` percentage explicitly. P1.
- Wave VFX: poc uses simple rectangle (66ccff, 0.85) growing in width over 600ms (684-700). JS uses a 15-frame sprite-sheet at 100ms/frame = 1500ms life with per-target delay schedule + WAVE_VISUAL_LEAD=80 + invariant travelDist from BATTLE_POSITIONS. **P0 visual gap** — poc lacks sprite-driven wave, no per-target delay schedule.
- Camera shake at impact: poc has `cam.shake(180, 0.005)` scheduled @300ms (line 703). JS triggers shake INSIDE per-target hit task (only first target) with class `.battle-scene-shake` 240ms. P2 close.
- Juggle: poc has NO juggle animation on hits (just direct dmg loop). JS uses physics-driven `buildJuggleKeyframes` with `noRotation`+`knockupAnim` support. **P0** — entire aerial juggle missing.
- Per-hit floating yOffset accumulate (`i×40` x-offset + `i×18` y-offset): not in poc. P1.
- Single combined floatNum at end (poc line 725 `${totalDmg}`) vs JS spawning 3 separate per-hit floats. P1.

### basicSlam — 过肩摔 (basic.js:552-765)

**JS sequence:**
1. Compute caster dash dest (564-576): adjacent to target with gap 58px PC / 40 mobile.
2. **Camera zoom 1.22 @380ms** anchored to mid-row.
3. Caster dash 280ms cubic-bezier + zIndex 50.
4. Grab moment: both flash `chi-hit-flash` 180ms + `sleep(120)`.
5. Throw arc (607-673): 30-step parabolic keyframe build with `peakY=-115 PC/-90 mobile`, `peakP=0.42`, `rot = dir×360 × ex`, duration 520ms. Target lands at midpoint of enemy's F1+B1 slots (BATTLE_POSITIONS). Re-measures zoom NOW (critical — initial zoom captured pre-camera-zoom).
6. SLAM IMPACT (675-688): `.basic-slam-impact` div at slamAnchor, 760ms life. `battleCamera.shake(260)`.
7. Main damage (~atk×atkScale + target.maxHp×targetHpPct) + splash to others (atk×splashAtkScale + target.maxHp×splashHpPct).
8. `await sleep(340)` lying, then 420ms return-hop keyframes + caster dash back 340ms + `zoomReset(340)`.

**PoC handler:** `skill-handlers.ts:731-747`

**Diff (P0 — extremely thin):**
- Entire animation sequence (12 phases) compressed to **17 lines** of damage-only computation.
- No camera zoom, no dash, no grab flash, no throw arc, no slam impact div, no camera shake, no return hop.
- Main damage formula simplified: poc uses raw computed mainDmg fed to `dealPhysical(caster, target, mainDmg, isCrit)`. JS computes `mainRaw = atk×atkScale + maxHp×targetHpPct/100` then applies `calcDmgMult(eDef)` + basicTurtle.bonusMap. PoC `dealPhysical` may not match.
- Splash formula slightly differs: JS `atk×splashAtkScale + target.maxHp×splashHpPct/100`. PoC line 740-741 uses `target.maxHp` similarly ✓ but no `calcDmgMult` per other enemy.
- Splash crit always FALSE in poc (line 742). Main hit crit ✓.

---

## Q3 — 赛博龟 (cyber) 3 active + passive

### cyberBeam — 能量大炮 (cyber.js:92-334)

**JS 7-phase choreography:**
1. Drone count read `attacker._drones.length`; trueDmg per segment = `round(atk × (trueScale/2) × droneCount)` with enhanced 7%/regular 10%.
2. Row target filter by `_slotKey.split('-')[1]` (same column F+B).
3. **Cut-in** (.cyber-cutin) 500ms.
4. **Camera zoom 1.2 @400ms** anchored to row mid.
5. **Caster Y-hop arc** (146-171): 12-keyframe linear parabola `y(t) = dy×t + apex×4t(1-t)` with `apexLift = -min(44, 24+|dy|×0.28)`, duration 460ms (large hop) / 280ms (no shift).
6. Windup pose `.cyber-beam-charging` class → sleep(550) → remove.
7. **Beam sweep**: `.cyber-beam-sweep` div, width=`max(120, |farEdgeX - fCx|)`, top=`fCy - (110 PC / 56 mobile)`, life 720ms.
8. `sleep(360)` then camera shake (`--cam-scale: 1.2` + `.battle-scene-shake` 260ms) and **simultaneous** damage on all row enemies. Per enemy: 2-segment juggle via `buildCyberBeamJuggle(knockX=dir×50 PC/28 mobile)`. Per-segment damage: phys (atk×physScale) + true (trueDmgPerSeg) with both float nums (physical at yOff 0, true at yOff 24). chi-hit-flash 140ms per segment.
9. `sleep(beamLifeMs - 600)` then **caster hop back** (mirror arc, 460ms) + zoom reset + clear transforms.

**PoC handler:** `skill-handlers.ts:2205-2383`

**Diff (mostly aligned, minor):**
- Cut-in (2231-2246): poc adds a center "orb" circle (radius tween 30→100) — NOT in JS. P2 cosmetic extra.
- Camera anchor: poc uses `cam.pan(midX, midY)` (line 2251) — Phaser camera works in screen coords, JS uses `transformOrigin %`. Both achieve "anchor on row mid". Equivalent.
- Caster hop arc (2254-2269): 8 keyframes vs JS 12 keyframes. Minor smoothness loss. P2.
- Windup: poc tints sprite 0x9af6ff + scale 1.08 yoyo (2272-2277). JS adds CSS class `.cyber-beam-charging` (uses its own sprite-frame override). P2 visual.
- Beam: poc uses 2-layer rectangle (outer 0x4cc9f0 + core 0xffffff, scaleX tween 0→1 over 120ms then fade 360ms). JS uses 6-frame sprite-sheet `.cyber-beam-sweep` with explicit width based on far-edge. Beam top correctly offset (line 2289 uses tv.y, JS uses `fCy - 110`). **P1 — Beam Y baseline differs (poc uses target Y, JS uses caster Y with -110 offset).**
- Juggle (2320-2336): poc has 6-tween chain (~920ms total: 180+100+180+60+220+280). JS uses `buildCyberBeamJuggle` with 56-step physics simulation (1600/1700ms) and `noRotation+knockupAnim` mode for boss/sprite pets. **P0 — physics-driven juggle is much richer in JS, with rotation impulses, gravity, slam pose, recovery; PoC is a simple linear path.**
- Per-segment damage timing (2339-2362): poc waits 280ms between segments. JS uses `segHits` from physics build (which can differ — e.g. `[0, Math.round(airMs*0.4)]` in noRot mode). P2.
- chi-hit-flash sprite tinting: NOT in poc (no equivalent). P1.

### cyberDeploy — 部署浮游炮 (cyber.js:336-354)

**JS:**
- Check passive `cyberDrone`, check `_drones.length >= maxDrones` (default 10).
- Push `{age:0}` for `actual = min(skill.deployCount, slots)`.
- spawnFloatingNum with embedded icon HTML + log + `sleep(800)`.

**PoC handler:** `skill-handlers.ts:4586-4601`

**Diff:** Mostly 1:1. PoC float text differs (`+${actual}🛰 (count/max)`) vs JS `+${actual}×<img>`. Missing final `sleep(800)`. P2.

### cyberSwarmShield — 浮游炮护盾 (cyber.js:358-374)

**JS:**
- droneCount × perDronePct (15% / enhanced 10%) added to base `shieldAtkScale` (default 0.6).
- For each ally: `amount = round(round(atk × totalScale) × getShieldMult())`.
- `ally.shield += amount` (permanent), spawnFloatingNum shield-num, updateHpBar, renderStatusIcons, log.
- Final `sleep(800)`.

**PoC handler:** `skill-handlers.ts:4775-4793`

**Diff:** 1:1 close. PoC uses `ruleModifiers.shieldMult()` ✓. Missing final `sleep(800)` polish. P2.

### Passive — cyberDrone (state.js:252-262)

On death with `_drones.length > 0`, transform caster into "mech" (`_pendingMech = drone count, _drones=[], _isMech=true, alive=true, hp=1`). PoC has hooks at `processDeathPassives` (BattleScene.ts:5867).

Verified — handled in BattleScene `processDeathPassives` (not skill-handlers). Audit OK at structural level.

---

## Q4 — 死亡动画 (Death Animations)

### CSS spec — JS deathHopLeft / deathHopRight (scene.css:95-129)

Trigger: `state.js:295` adds `.death-anim` class when `f.hp<=0 && !_deathProcessed`. Animation runs on `.st-body` child (not outer `.scene-turtle`) so shadow + HP-bar stay still during hop.

**deathHopLeft (PC):**
- 0%: translate(0,0), opacity 1, brightness(1)
- 12%: translate(-10px, -8px), rotate(-8deg), opacity 1, brightness(2.5) saturate(0) — flash-white peak
- 33%: translate(-14px, 0), rotate(-15deg), brightness(1) saturate(.5) — landed prone
- 75%: hold prone, grayscale(.8)
- 100%: opacity 0 — fade out

Duration 1.2s ease-out forwards. Mobile variant uses smaller hop (-6/-5 instead of -10/-8).

### Special deaths

| Trigger | JS path | Behavior |
|---|---|---|
| phoenix `phoenixRebirth` | state.js:154-181 | Revive at revivePct% HP, +20% ATK if `_phoenixEnhancedRebirth`, burn+healReduce all enemies, no death-anim played. |
| undead `undeadRage` | passive-only; no special death (just HP-scaling ATK in turn.js:1037-1042). No revive — standard death-anim runs. |
| conch (equip `e_conch`) | state.js:227-239 (`triggerConchTransform`) | Transform into small worm sprite, consume equip from `_equips`/`_fortuneEquips`, set `_equipConch=false`. No death-anim. |
| cyber drone → mech | state.js:252-262 | If `_drones.length>0`, set `_pendingMech=count`, keep alive=true at hp=1, skip death. Mech-birth animated later by `executeAction`. |
| angel `_angelRevive` | state.js:184-191 | Revive at 25% with `😇圣光重生!` label. |
| `_equipRevive` (复活护符) | state.js:193-211 | Revive at hp=1 with `⚱ 复活护符!` label + heal-num float, plays `sfxRebirth()`. |
| chest phoenix equip | state.js:213-222 | Mark `_pendingChestRevive`, alive=true hp=1, animated later. |
| Battle rule `_ruleRevive` (亡灵之日) | state.js:241-250 | Revive at 15% HP. |

### PoC implementation — `BattleScene.killView` (5856-5934)

**Sequence:**
1. Play `sfx-defeat` + battleLog message (5857-5858).
2. `+2 coins` for left-side death (5861-5864).
3. `processDeathPassives(view)` — handles phoenix etc.
4. If revived → tween hpBar width, return.
5. `fireOnDeath` (equipment hooks like e_conch) — same check + revive path.
6. **Self-authored death sequence (5887-5933):**
   - 400ms red screen flash (`rectangle 0xff3232, 0.25`).
   - `cam.shake(200, 0.012)`.
   - 💀 skull text spawn, scale 0.3→1.3 (back.out 200ms) + hold 300ms + rise -60px + fade 400ms.
   - **deathHop tween chain on sprite** (5913-5926): jump up 180ms + 40ms hold + slam side 300ms with `angle:90` + fade 500ms scale 0.6. dropDir based on side.
   - UI elements (`shadow, hpBar, hpBarBg, hpBarHi, shieldBar, hpDelayBar, hpText, nameText, statusGroup`) all fade alpha→0 over 800ms.
   - `this.playAction(view, 'death')` triggers spritesheet death anim if present.

### Diff (Q4)

| Aspect | JS | PoC | Status |
|---|---|---|---|
| Duration | 1.2s (1200ms) | jump 180 + hold 40 + slam 300 + fade 500 = 1020ms sprite chain + 800ms UI fade | **P1 — timing mismatch** |
| White-flash peak | brightness(2.5) saturate(0) @12% (very specific JS look) | Red screen rectangle 0xff3232 alpha .25 fading 400ms | **P1 — different feel** (poc adds whole-screen red; JS just brightens dead sprite) |
| Hop distance | left=(-14,-8) → (-14,0); mobile (-8,-5) → (-8,0) | dropDir × 8 / 16 px | **P1 — distances off** |
| Tilt rotation | -15deg final rest pose | angle:90 (full sideways!) | **P0 — completely wrong end pose** (JS leans 15°, poc tips fully over 90°) |
| Mobile variant | Yes | No (single tween) | **P1 missing** |
| Grayscale filter | grayscale(.8) at 75%→100% | No filter applied | **P1** |
| 💀 skull spawn | Not in JS | Added by poc | **P2 — poc-original VFX, not in JS** |
| Screen flash 400ms | Not in JS (sprite-only brightness change) | poc adds whole-screen red rect | **P1 added VFX** |
| Camera shake on death | Not in JS | poc `cam.shake(200, 0.012)` | **P2 — extra** |
| Special deaths (phoenix/conch/cyber/angel) | Branches in `checkDeaths` (state.js:144-262) | `processDeathPassives` + `fireOnDeath` — covered but not animated 1:1 | **P1 — handlers exist but VFX vary** |
| Mech-transform sprite swap | Sprite changes to mech (`mech-transform-anim` class) | Not visualized | **P0 missing** |
| Conch → worm sprite | Sprite swap to conch worm | Not visualized in killView | **P1 — depends on triggerConchTransform** |

---

## Q5 — 血条加/减血/加/减盾详细动画

### JS spec (`ui.js:469-639` updateSceneHp)

| Event | Implementation | Spec |
|---|---|---|
| Damage delay trail | `.st-hp-delay` (red lag bar) | `hpDelay.style.transition = 'width 0.5s ease-in-out 0.2s, opacity 0.4s ease-in 0.5s'` — width holds 200ms at old%, then shrinks over 500ms, opacity fades over 400ms starting at 500ms. Gradient `linear-gradient(180deg, #ee5555 40%, #aa2222 60%)`. |
| Hit flash | `.hp-flash` class on `.st-hp-fill` | `setTimeout` 60ms then remove + restore `transition: width .15s ease-out, filter 0.15s ease-out`. The `.hp-flash` CSS applies `filter: brightness(2)` for 60ms. |
| Heal delay trail | green `linear-gradient(180deg, #66ffaa 40%, #06d6a0 60%)` | width set to current%, opacity 0.7 → `transition: opacity 0.4s ease-out 0.1s; opacity:0`. 500ms total fade. |
| Shield fill | `.st-shield-fill` direct width/left % set | No explicit transition — relies on CSS default. (Inspecting CSS) — likely `transition: width .35s, left .35s`. **Need to confirm.** |
| Aura shield | `.st-aura-shield` div lazy-created if `_auraShield>0` | Position calculated as `left = hpPct + shieldPct`. No special anim. |
| Bubble shield | `.st-bubble-shield` div | Position `left = hpPct + shieldPct + auraPct`. Shimmer animation comes from CSS keyframe (`shimmer 1.6s ease`). |
| Tick marks | `.st-hp-ticks` background rebuilt only if `barMax` changed (587-591) — minor=50HP, major=500HP. |
| Bar size scaling | `--body-scale` between 0.9-1.15 based on `maxHp/_initHp` ratio. |
| HP shake / threshold | NOT applied in `updateSceneHp` — no explicit low-HP shake/pulse. (Action.js may add `hit-shake` elsewhere.) |
| Shield break (shield → 0) | Just sets `display:none` — no special "shatter" animation. |
| Death class toggling | Explicitly NOT here (635 comment) — owned by state.js / checkDeaths. |

### PoC impl — `scene-turtle-dom.ts:418-510`

| Aspect | JS | PoC | Status |
|---|---|---|---|
| Damage trail width/opacity transitions | `width 0.5s ease-in-out 0.2s, opacity 0.4s ease-in 0.5s` | line 444 `width 0.5s ease-in-out 0.2s, opacity 0.4s ease-in 0.5s` | **OK 1:1** |
| Damage trail gradient | `#ee5555 / #aa2222` | line 438 `#ff4d4d / #c81e1e` | **P2 — slightly different shade** |
| Hit flash duration | 60ms | line 450 `setTimeout 60ms` | **OK** |
| Hit flash CSS class | `.hp-flash` defined in scene.css | `.hp-flash` defined in poc CSS (need verify) | Need verify CSS exists in poc DOM stylesheet |
| Heal trail gradient | `#66ffaa / #06d6a0` | line 454 `#3deb9e / #1fb57f` | **P2 — different shade** |
| Heal trail transitions | `opacity 0.4s ease-out 0.1s` | line 459 same | **OK** |
| Heal opacity 0.7 start | yes | yes | **OK** |
| Shield fill | direct % set, no transition | direct % set (line 474-475), no transition | **OK** (matches CSS default) |
| Aura shield | lazy create if val>0 | always present, hide via display:none | **P2** (different lifecycle; visual equivalent) |
| Bubble shield | direct % set | direct % set (488-489) | **OK** |
| Tick marks | rebuild on barMax change | rebuild on barMax change (498-501) | **OK** |
| Body-scale | 0.9-1.15 from maxHp ratio | same (504-509) | **OK** |
| Shield break shatter | none in JS | none in poc | **OK** (no gap) |
| First-time init | `_hp === undefined` branch (no anim) | `_lastHp < 0` branch (no anim) | **OK** (equivalent) |
| `recordDamage`/stat hooks | not in ui.js | not in update() | **OK** |
| Specialty bars (rage/energy/aura-energy) | yes in ui.js:606-629 | yes (line 519+) | **OK** structurally |

**Q5 verdict:** scene-turtle-dom HP/shield animation is very close to JS 1:1. Only cosmetic gradient color shifts (P2). Major gap: **shield "break to 0" visual** — JS lacks any special FX too, so no actual gap. Bubble shimmer may not be transferred.

---

## Q6 — 影子 (Shadow) 详细

### JS spec — `.st-shadow` (scene.css:18-31)

```css
.scene-turtle .st-shadow {
  position: absolute;
  bottom: 0;                                       /* 贴 .st-body layout box bottom (= 脚底) */
  left: 50%;
  width: var(--dot-size, 80px);
  height: calc(var(--dot-size, 80px) * 0.30);      /* = 24px */
  border-radius: 50%;
  pointer-events: none;
  z-index: -1;                                     /* sprite 后面 */
  transform: translate(-50%, 0%);
  background: radial-gradient(ellipse at center,
    rgba(0,0,0,.55) 0%,
    rgba(0,0,0,.25) 50%,
    transparent 80%);
  filter: drop-shadow(0 0 3px rgba(0,0,0,.3));
}
```

- Inner-fade is **3-stop ellipse-at-center** radial: center 55% opacity → mid 25% → transparent at 80%.
- `drop-shadow` adds 3px soft-blur edge halo at 30% black.
- Shadow is nested inside `.st-body`, so attack-hop / death-hop / chi-wave-launched translate transforms on `.st-body` move the shadow WITH the sprite. Comment line 14: "龟跳起/攻击时圈不动" — but line 16: "跟着 lunge/hop 动画走".
- z-index -1 keeps it under sprite layer (sprite is `.st-sprite` child).
- Boss: scaled via `--base-scale: 1.91` on `.scene-turtle` outer (scene.css:8). Width/height inherit through; effective shadow ~ 80×1.91 = 153px wide.

### PoC impl — `BattleScene.ts:831-832`

```ts
const shadow = this.add.ellipse(x, y, 80, 24, 0x000000, 0.40).setDepth(1);
if (shadow.preFX) shadow.preFX.addBlur(0, 3, 3, 1, 0x000000);
```

- Solid black ellipse 80×24 at alpha 0.40.
- `preFX.addBlur(quality=0, x=3, y=3, strength=1, color=black)` — uniform box-blur.
- Sprite at depth 2, shadow at depth 1 → correct stacking.
- P20 fix `actor.shadow.x = homeX + dx` synchronizes shadow with hop offsets.
- Boss scaling: shadow created with fixed 80×24 — **no automatic 1.5× scale to 160×36**. 

### Diff (Q6)

| Aspect | JS spec | PoC current | Gap |
|---|---|---|---|
| Inner opacity gradient | 55% → 25% → 0% (radial 3-stop) | solid 0.40 black | **P1 — gradient missing, looks "harder" edge** |
| Blur edge falloff | `drop-shadow(0 0 3px)` (soft halo) | `addBlur(3,3, strength=1)` (box blur) | **P2 — similar but technically different (drop-shadow is gaussian-ish)** |
| Total width/height | 80 × 24 (PC) | 80 × 24 | **OK** |
| z-index / depth | -1 (under sprite) | 1 (sprite=2) | **OK** |
| Move with body | yes (nested in .st-body) | yes (P20 patch keeps x synced via `homeX + dx`) | **OK** |
| Stay still during fly-up | tied to .st-body translation — moves WITH it | poc's P20 fix moves with offset, but for KOF hop-arc (cyberBeam, chiWave) the shadow may not follow Y | **P1 — Y not always tracked during big hop arcs** (need to verify each skill's tween targets) |
| Boss scale | inherits `--base-scale: 1.91` → ~153×46 | fixed 80×24 (no scaling) | **P0 — boss shadow stays tiny** |
| `--dot-size` per-pet override | CSS variable, customizable per pet | hardcoded 80 | **P2 — no per-pet shadow size** |
| Drop-shadow filter halo | yes | only blur (no separate halo) | **P2** |

**Phaser approximation gap:** Phaser's `ellipse.fillColor` is uniform — no native radial gradient. To 1:1 reproduce JS, need either:
- A pre-baked radial-gradient PNG asset used as texture, OR
- A custom shader / multi-layer ellipses stacked (e.g. 3 ellipses with decreasing alpha 0.55/0.25/0 and increasing size). 

Recommended fix: replace single ellipse with 3 stacked ellipses, or load a 128×40 radial-gradient PNG asset and use `add.image` instead of `add.ellipse`.

---

## 总结 — Top 5 Fidelity Gaps (sorted by severity)

1. **gamblerMultiHit / gamblerBlood passives shape error (P0)** — `skill-handlers.ts:2808` & `2820`. Implemented as ACTIVE skills (5-hit barrage and lost-HP true-dmg) but JS uses them as PASSIVE proc-on-hit / stat-recalc respectively. Means: (a) skill list incorrectly shows them as castable abilities, (b) `tryGamblerMultiHit` chained procs never fire from `gamblerBet/Cards/Draw` loops, (c) gambler crit scaling with lost HP not active. Fix: convert both handlers to no-ops + hook into `applyPostHitLayers` (multiHit) and `passive-triggers.ts` (gamblerBlood crit recalc).

2. **basicChiWave column targeting + 3-hit aerial juggle missing (P0)** — `skill-handlers.ts:710`. PoC uses `sameRowFighters` (likely same-row) but JS filters by `_slotKey.split('-')[1]` (same-column). Plus the 3-hit aerial juggle (~1400ms physics with `buildJuggleKeyframes`) is replaced by simple `sleep(220)` between hits — no air-hang VFX, no per-hit floatNum yOffset stack, no `chi-hit-flash` per hit. Fix: port `buildJuggleKeyframes` + per-target `delay` schedule + `basic-chiwave-launched` class equivalent.

3. **basicSlam compressed from 12 phases to damage-only (P0)** — `skill-handlers.ts:731-747`. The KOF over-shoulder slam (camera zoom 1.22, dash, grab flash, 30-step parabola throw with rot 360°, slam impact div, screen shake 260, lying pose 340ms, return hop 420ms) is **entirely missing** — only damage math present (~17 lines vs ~210 lines in JS). Fix: full port required.

4. **Death animation end-pose tipping 90° instead of 15° + missing white-flash brightness (P1)** — `BattleScene.ts:5922` uses `angle:90` for "slam onto side" while JS scene.css:101 settles at `rotate(-15deg)` (gentle lean). PoC also adds a whole-screen red flash + 💀 skull spawn + camera shake (none in JS — JS only does sprite filter `brightness(2.5) saturate(0)` for white-flash peak at 12%). Fix: change angle to ±15°, remove screen-flash/skull/shake, add sprite tint `brightness(2.5)` keyframe at 12% of timeline.

5. **Boss shadow not scaled + shadow color is uniform (not radial gradient) (P0+P1)** — `BattleScene.ts:831`. Boss sprite is 1.5× larger but `add.ellipse(80, 24)` stays fixed. Plus the radial gradient (55%→25%→0% stops) is approximated with single 0.40 alpha + blur, giving a "harder" round shadow. Fix: (a) scale shadow width/height by `_isBoss ? 1.5 : 1`, (b) replace single ellipse with stacked 3-ellipse alpha falloff OR load `shadow-radial.png` asset.

---

## Bonus: smaller P1/P2 gaps documented but not in top-5

- **turtleShieldBash**: golden comet arc + impact burst + shield aura divs removed from poc with a wrong comment claiming "JS 没此 VFX" (basic.js:46-75/107-118 prove otherwise). 3 missing VFX layers.
- **basicBarrage**: bolt projectile sprites entirely missing; only `dealPhysical` calls remain. No `chi-hit-flash` per shot.
- **cyberBeam juggle**: 6-tween linear chain in poc vs 56-step physics simulation in JS — much less rich aerial.
- **gamblerDraw/Bet/Cards sleep cadences**: all off by 30-700ms per hit; combined effect changes the rhythm.
- **gamblerCards critRoll**: poc incorrectly rolls crit; JS never crits cards.
- **gamblerDraw float emoji additions**: poc adds 🛡 / ❤ emojis not in JS.
- **HP delay gradient colors** off by a tone (`#ff4d4d` vs JS `#ee5555`; `#3deb9e` vs JS `#66ffaa`).
- **Bubble shimmer** 1.6s ease — not confirmed in poc DOM CSS.

Total fidelity gaps documented: 5 P0, 13 P1, 11 P2. Doc location: `c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\poc-phaser\AUDIT-DEEP.md`.
