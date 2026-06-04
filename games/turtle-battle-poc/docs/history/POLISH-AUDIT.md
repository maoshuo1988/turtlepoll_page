# Polish Audit — JS 1:1 vs poc-phaser (2026-05-19)

Audit date: 2026-05-19
Driven by user request: "血条，每回合谁施法有提示，出伤的时间要完全复制JS，每只龟的技能和机制要完全按JS，已经是旧版非常完善的部分，然后是战斗统计和调试面板"

Status legend: ✅ matches / ⚠️ partial / ❌ broken / 🆕 missing in poc / 🚫 N/A

---

## §1 HP Bar Fidelity

### JS implementation

**CSS (`games/turtle-battle/css/scene.css:196–217`, `battle.css:293–323`):**
- `.st-hp-wrap` 88 px wide (boss 160 px); `.st-hp-bar` 10 px tall (boss 16 px), 1 px border, dark gradient bg with inset shadow, `image-rendering:pixelated`.
- Layer stack (z-index inside `.st-hp-bar`):
  - z0 `.st-hp-delay` — red "damage trail" that lags behind on hit
  - z1 `.st-hp-fill`  — main HP, gradient `#3deb9e→#089e6b` ally / `#c084fc→#7c3aed` enemy, `transition:width .15s ease-out`
  - z2 `.st-shield-fill` — white pixel block, `transition:width .35s, left .35s`
  - z3 `.st-aura-shield` — gold pulse `bubbleShimmer 1.6s` (龟壳气场), and `.st-bubble-shield` (cyan shimmer)
  - z4 `.st-hp-ticks` — minor (50) + major (500) tick marks as stacked repeating-linear-gradients (rebuilt when `barMax` changes)
- Hit-flash: `.hp-fill.hp-flash { filter:brightness(2) saturate(0.5); transition:filter 0s }` — set then cleared after 60 ms
- HP text below bar, includes shield+bubble icons inline; `.st-hp-text` 9 px.
- Death animation NOT part of bar — `.scene-turtle.death-anim` 1.2 s hop + tilt is parent-level (`scene.css:95–124`).

**Update logic (`ui.js:469–639` `updateSceneHp`, `ui.js:660+` `refreshDetailPanel`):**
1. Recompute `barMax = max(maxHp, hp+shield+bubble+aura)` so over-cap shields extend bar visually.
2. Set `.st-hp-fill.width = hpPct%`; pick ally vs enemy gradient by `f.side` + `gameMode === 'pvp-online'` check.
3. **Delay trail** logic on `.st-hp-delay`:
   - first-call init treats current HP as baseline.
   - On damage: set delay.width = `oldPct%` red, transition:none → `requestAnimationFrame×2` → `transition:width 0.5s ease-in-out 0.2s, opacity 0.4s ease-in 0.5s; width=hpPct; opacity=0`.
   - Also trigger hit-flash (`add('hp-flash')` → 60 ms → remove). Total flash = 60 ms; delay shrink = 200 ms hold + 500 ms shrink + 400 ms fade.
   - On heal: green gradient delay, opacity 0.7→0 over 0.4 s with 0.1 s delay.
4. **Shield/aura/bubble** segments: positioned with `left = hpPct + offsets`, widths in % of barMax. Aura is lazily inserted between shield and bubble.
5. **Tick marks** rebuilt only when barMax changes (cached on `tickContainer._barMax`).
6. Body scale 0.9–1.15 via `--body-scale` CSS var when `maxHp/_initHp` changes (`ui.js:474–480`).
7. `refreshDetailPanel` mirrors the bar for the open detail modal (`.fdp-hp-bar/.fdp-hp-fill/.fdp-hp-delay/.fdp-shield-fill`, `scene.css:334–337`).

### poc implementation

`poc-phaser/src/scenes/BattleScene.ts:50–60`, `780–894` plus `poc-phaser/src/systems/scene-turtle-dom.ts:217–426`.

Two parallel HP visuals run side by side:
- Legacy Phaser rectangles `hpBar/hpBarBg/hpBarHi/shieldBar/hpDelayBar` exist (`BattleScene.ts:50–56,775–822`) but are kept hidden (`alpha=0`, `BattleScene.ts:776,781,783`). `updateHpVisual` (`BattleScene.ts:830–873`) and `refreshShieldBar` (`BattleScene.ts:878–894`) still run tweens on them every frame.
- Real visuals are the DOM overlay `SceneTurtleDom` (`scene-turtle-dom.ts`):
  - HTML structure matches JS (`.st-hp-row > .st-hp-wrap > .st-hp-bar > .st-hp-delay/.st-hp-fill/.st-shield-fill/.st-bubble-shield`, lines 257–266).
  - CSS injected via `installCss()` (lines 87–141) — matches JS values for `.st-hp-bar` (88 px / 10 px / pixelated), shield bg (white gradient), bubble shimmer.
  - But `update()` (lines 326–381) only sets widths/lefts. **No delay-trail animation, no hit-flash, no aura-shield layer, no tick marks.** The `.st-hp-delay` div is created but width is force-synced to `hpPct` every frame — never shows the red trail.
  - Gradient hardcoded at construction (lines 301–303); no recomputation on HP%, no boss-scale.

### Divergences

| Aspect | JS | poc | Status |
|---|---|---|---|
| Bar height/width | 88×10 (boss 160×16) | 88×10 (no boss scale) | ⚠️ |
| Ally gradient | `#3deb9e→#089e6b` | `#3deb9e→#1fb57f` (subtly darker, hardcoded at construct) | ⚠️ |
| Enemy gradient | `#c084fc→#7c3aed` | `#c084fc→#9d5be8` | ⚠️ |
| barMax = max(maxHp, hp+shield+bubble+aura) | ✅ | ✅ (scene-turtle-dom.ts:329) | ✅ |
| Aura shield (gold) segment | `.st-aura-shield` z3 with gold bubbleShimmer | 🆕 not rendered | 🆕 |
| Tick marks (50/500 stacked gradients) | rebuilt on barMax change | 🆕 missing entirely | 🆕 |
| Damage delay trail (red, 200 ms hold + 500 ms shrink + 400 ms fade) | ✅ ui.js:506–516 | ❌ `hpDelay.width = hpPct%` synced immediately each frame (scene-turtle-dom.ts:336) | ❌ |
| Hit-flash (brightness 2 + saturate 0.5, 60 ms) | ✅ ui.js:518–524 | ❌ never invoked on DOM bar; Phaser rectangle path has `fillColor=0xffff88` flash but rectangle is `alpha=0` | ❌ |
| Heal flash (green 0.7→0 fade) | ✅ ui.js:526–535 | ❌ not in scene-turtle-dom.ts; only on hidden Phaser rect | ❌ |
| Shield transition (`width .35s, left .35s`) | CSS handles it | ✅ CSS preserved | ✅ |
| HP text below bar (`.st-hp-text` w/ shield+bubble icons) | ✅ | 🆕 No `.st-hp-text` element rendered in `scene-turtle-dom.ts` | 🆕 |
| Body-size scale on maxHp change | ✅ ui.js:474–480 `--body-scale` 0.9–1.15 | 🆕 | 🆕 |
| Pixel-rendering on bar | `image-rendering:pixelated` | ✅ in injected CSS | ✅ |
| Detail-panel mirror bar (`.fdp-hp-*`) | ✅ ui.js:660–680 | 🆕 no fighter detail modal yet | 🆕 |
| Death-anim hop+tilt+fade (1.2 s) | CSS keyframes `deathHopLeft/Right` | poc uses Phaser tween in `killView` — different timing | ⚠️ |
| First-render baseline (no animation on init) | tracked via `hpDelay._hp === undefined` | poc uses `_lastHp` on Phaser rectangle path only | ⚠️ |
| Double-bar redundancy | single DOM bar | poc keeps both hidden Phaser rect + DOM bar — `updateHpVisual` tweens dead rectangles every hit | ❌ wasteful |

### Fix worklist
1. `scene-turtle-dom.ts:326–351` — port the JS `.st-hp-delay` damage animation: cache `_hp/_pct`, on `f.hp < oldHp` set red bg + `transition:none` → rAF×2 → `transition:width 0.5s ease-in-out 0.2s, opacity 0.4s ease-in 0.5s; width=hpPct; opacity=0`.
2. `scene-turtle-dom.ts:326–351` — add hit-flash: `hpFill.classList.add('hp-flash')` for 60 ms (need `.st-hp-fill.hp-flash` rule in `installCss`).
3. `scene-turtle-dom.ts:326–351` — add heal trail (green 0.7→0 fade over 0.4 s).
4. `scene-turtle-dom.ts:256–266` — add `.st-aura-shield` div + style (gold bubbleShimmer 1.6 s); update() positions it between shield and bubble.
5. `scene-turtle-dom.ts:256–266` — add `.st-hp-ticks` div; port `buildSceneTickBg(barMax)` from `ui.js`; rebuild when barMax changes.
6. `scene-turtle-dom.ts:256–266` — add `.st-hp-text` line below bar with hp/maxHp + shield/bubble icons.
7. `scene-turtle-dom.ts` — apply `--body-scale` CSS var on maxHp changes (0.85 + ratio×0.15 clamped 0.9–1.15).
8. `BattleScene.ts:50–56, 775–822` — delete the hidden Phaser-rectangle HP path (`hpBar/hpBarBg/hpBarHi/shieldBar/hpDelayBar/hpText/nameText`) and `updateHpVisual/refreshShieldBar`. They run tweens on `alpha:0` objects and waste perf.
9. `installCss` — add boss-scaling rules (`scene.css:10–12`).
10. Match exact gradient stops (use `40% / 60%` not custom `38% / 42%`).

---

## §2 Per-Turn Caster Announce

### JS implementation
`ui.js:1124–1142` `showSkillAnnounce(f, skill)`; called once from `action.js:511` immediately before any skill cast, and from `action.js:45` for combo casts.

Sequence in `executeAction` (`action.js:458–530`):
1. `showSkillAnnounce(f, f.skills[action.skillIdx])` — banner appears
2. `await sleep(600)` — **mandatory pause for the banner to read**
3. `playAttackAnimation(f)` (attack-hop) starts
4. `if (_hasAttackAnim && !_skipHop) await sleep(ATTACK_DAMAGE_SYNC_MS=400)` — sync to mid-strike frame
5. `dispatchSkill(...)` invokes the actual handler

Banner structure (`ui.js:1136–1141`):
- DOM div `#skillAnnounceBanner.skill-announce` lazily appended to `ENV.battleField`
- innerHTML: `${petIcon(f, 28)}<span class="sa-name" style="color:${RARITY_COLORS[f.rarity]}">${f.name}</span><span class="sa-arrow">▸</span><span class="sa-skill">${skill.name}</span>`
- `display:flex` then `animation:'skillAnnounce .6s ease forwards'` (re-armed via `requestAnimationFrame`)
- Auto-hide via `setTimeout(() => banner.style.display='none', 1200)` — banner lives ~1.2 s total

CSS `scene.css:367–371`:
- `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);` — **screen center** (not top)
- `background:rgba(0,0,0,.75); backdrop-filter:blur(4px); padding:8px 20px; border-radius:8px; font-size:16px; font-weight:700; border:1px solid rgba(255,255,255,.1)`
- `.sa-name` 16 px, `.sa-arrow` 14 px gray, `.sa-skill` 16 px white
- `@keyframes skillAnnounce`: 0% opacity 0 scale .8 → 15% opacity 1 scale 1.05 → 30% scale 1 → 80% opacity 1 → 100% opacity 0 translateY(-10px)
- Mobile (`scene.css:452`): font 11 px, padding 4 px 10 px
- Battle-mobile (`battle.css:976`): font 13 px, padding 6 px 14 px, multiline `max-width:80vw`

There is **no separate "whose turn" banner** beyond the existing turn-start big text — the announce IS the per-cast indicator. There is **no per-fighter highlight CSS** in JS (no `.acting` class found).

### poc implementation
`BattleScene.ts:3366–3423` `showSkillAnnounce(actor, skillName)` defined…

**`showSkillAnnounce` is never called.** Searched all of `poc-phaser/src/` for the string `SkillAnnounce` — only the definition and JSDoc reference appear (lines 3366, 3370). `runSkillHandler` (1490–1547) and `executeAttack` (1602+) go straight to handler dispatch with no banner.

There is a per-turn `showCenterBanner` (`BattleScene.ts:3347–3364`) firing once at turn start (`第 N 回合`, 1100 ms, `#ffd93d`, 64 px). That is the turn banner, not the per-cast banner.

`BattleTopRow.ts:107` has a single `.turn-banner` updated by `topRow.setTurnText('第 N 回合')`.

### Divergences

| Aspect | JS | poc | Status |
|---|---|---|---|
| Per-skill banner exists | ✅ (called every cast) | ❌ defined but unused (dead code) | ❌ |
| Position | screen center `50%/50%` | (code) horizontal center, `y=170` (top area) | ⚠️ |
| Trigger timing | before sprite hop, with 600 ms wait | not triggered | ❌ |
| Auto-hide | 1.2 s setTimeout | tween chain ~1.15 s (300 ms in + 600 ms hold + 250 ms out) | ⚠️ |
| Animation | CSS `@keyframes skillAnnounce` (scale pop) | Phaser back.out scale 0.85→1, then alpha fade up | ⚠️ |
| Background | `rgba(0,0,0,.75)` + `backdrop-filter:blur(4px)` + border | `0x1a2740` solid + gold stroke 0.6 | ⚠️ |
| Pet icon | `petIcon(f, 28)` (28 px sprite) | `pet-${id}` 32×32 with emoji fallback | ⚠️ size + asset key |
| Name color | `RARITY_COLORS[f.rarity]` | `RARITY_HEX` inline map (matches values) | ✅ |
| Arrow separator | `▸` gray 14 px | `▸` `#aaa` 20 px | ⚠️ |
| Skill name color | `#fff` | `#fff3a0` (yellow) — diverges from JS white | ⚠️ |
| Combo cast banner (`action.js:45`) | ✅ | 🆕 no combo path | 🆕 |
| Per-fighter "now acting" highlight | (none in JS — bar/sprite stays neutral) | (none in poc) | ✅ |
| Mobile font scale | 11 px CSS rule | not adapted | ⚠️ |

### Fix worklist
1. `BattleScene.ts:1144,1167,1216,1238,1291,1297,1307,1421,1602` — invoke `this.showSkillAnnounce(actor, skill.name)` at the start of every cast path (mirror `action.js:511`).
2. `BattleScene.ts:executeAttack` — insert `await sleep(600)` after the banner call so reader has time to see it before sprite hop.
3. `BattleScene.ts:3370–3423` — move banner Y from `170` to `height/2` (screen center per JS).
4. `BattleScene.ts:3406–3409` — change skill name color from `#fff3a0` to `#fff` (JS uses white text on dark bg).
5. `BattleScene.ts:3380` — change background from solid `0x1a2740` to translucent rectangle (alpha 0.75 black) and drop gold stroke.
6. Match keyframe timing: 600 ms total (15% pop to scale 1.05, 30% back to 1.0, hold to 80%, fade out 80→100% with translateY -10).
7. Skip the dead-code mismatch: keep the function but **wire it**.
8. Re-use BattleScene actor.fighter.rarity → existing RARITY_HEX (already matches JS RARITY_COLORS, ✅).

---

## §3 Damage Timing — per-skill sleep cadence audit

### Setup baseline

| Constant | JS | poc |
|---|---|---|
| Pre-cast announce sleep | 600 ms (`action.js:512`) | 🆕 none |
| Attack-hop forward sync | 400 ms `ATTACK_DAMAGE_SYNC_MS` (`constants.js:22`) | 240 ms `ATTACK_HOP_FORWARD_MS` then handler runs (`BattleScene.ts:1721–1723`) |
| Hop-back wait | 400 ms (`action.js:555`) | absorbed in tween chain |
| Total sleep calls in `js/skills/`* | 204 | 59 in `engine/skill-handlers.ts` |

\*JS has 3.5× more sleep cadence — confirms poc skill timing is dramatically flatter.

### Critical cadence table

| Skill | JS total ms | poc total ms | JS per-hit ms | poc per-hit ms | Missing FX | Status |
|---|---|---|---|---|---|---|
| **basicBarrage** (10 bolts) | 280 windup + 280 ms shotStagger × 9 + 130 ms damageAt + ~220 ms tail = **~3160 ms** (`basic.js:138,142,144,191`) | 500 ms gap × 9 = **~4500 ms** | bolt fired every 280 ms in parallel; damage 130 ms after spawn; **bolts overlap** | sequential 500 ms gap, no parallel | bolt sprite (`basic-barrage-bolt`), travelPx 250, hit-flash + hit-shake on target, FX trail | ❌ JS fires in parallel staggered 280 ms; poc fires sequential 500 ms. Wrong feel + wrong total. |
| **hunterBarrage** (10 arrows) | windup 220 + (arrival via fireProjectile) + sleep(120) × 9 = **~1300 ms+** (`hunter.js:64,87`) | 120 ms × 9 = **1080 ms** | 120 ms between arrows | 120 ms ✅ matches | arrow sprite (`hunter-arrow`), projectile flight, hit-shake | ⚠️ Per-hit close, but **missing 220 ms windup + sprite + flight**. |
| **cyberBeam** (KOF) | cut-in 500 + zoom 0 + hop 480 + windup 550 + beam 360 + segGap (~280) + tail (~120) + hopback 480 = **~2770 ms** (`cyber.js:123,171,175,208,278,306,325`) | 500 + 480 + 550 + 360 + 280 + (beamLife-600 max 120) + 480 = **~2770 ms** ✅ (`skill-handlers.ts:2067,2090,2098,2130,2182,2187,2200`) | sleeps closely mirrored | ✅ | poc HAS most of choreography (cut-in rect, beam shape, camera pan/zoom, juggle chain). | ✅ best-matched skill |
| **ninjaShuriken** | 260 + 360 + 60 = **~680 ms** (`ninja.js:10,56,58`) | 260 + 280 + 360 = **~900 ms** (`skill-handlers.ts:955,1004,1061`) | crit splits into TRUE + PHYS floats at +100 ms / +22 px | similar | "hit-shake 360 ms" — JS CSS class, poc uses yoyo tween 60 ms × 4 = 240 ms (handler comments it's "缩短版") | ⚠️ Approximately right, hit-shake shortened. |
| **ninjaImpact** | 300 + ~RUN_MS + 500 + 1000 = **~1800 ms** + run animation (`ninja.js:256,290,344,360`) | not in audit excerpt; needs verification | per-target trigger 40–500 ms | ? | flight juggle, F1-3 windup, teleport home VFX | ⚠️ likely abbreviated |
| **ninjaBackstab** | 300 + 1500 (covers hit triggers at offsets 200/500/800) = **~1800 ms** (`ninja.js:466,501`) | 300 × 2 = **~600 ms** (`skill-handlers.ts:1102`) | 300 ms between hits | 300 ms ✅ | F4-12 dash sprite + teleport, hit position arc | ❌ Total way shorter (no recovery wait) |
| **phoenixBurn** | 0 + 450 + 80 = **~530 ms** (`phoenix.js:38,47`) | 0 (handler returns immediately) | impact 450 ms hold then hit-shake clear | none | hit-shake, magic-num float color | ❌ no sleep at all → no readable cadence |
| **shellAbsorb** | 800 ms (`shell.js:308`) | 0 ms (handler immediate) | n/a | n/a | 🐚 float (poc has this) | ❌ no pacing |
| **shellStrike** (6 hits) | 6 × (500 + 150) = **3900 ms** (`shell.js:99,101`) | sequential phys/pierce with no inter-hit sleep (`skill-handlers.ts:1309–1331`) — **~0 ms** | 500 ms + 150 ms reset | none | hit-shake per hit | ❌ flat — entire 6-hit burst plays in one frame |
| **lavaQuake** | 600 ms tail (`lava.js:48`) | 0 ms (handler immediate) | per-enemy no inter-delay | none | hit-shake | ❌ |
| **lavaSurge** | 600 ms (`lava.js:69`) | 0 ms | | | shield float +200 ms y-offset | ❌ |
| **lavaSplash** (3 hits AoE) | not in JS file w/ inter-hit; per-hit immediate | 500 ms × 2 = **1000 ms** | | 500 ms (poc only) | | ⚠️ poc adds spacing JS doesn't have here |
| **lightningStrike** (5 hits) | 5 × (600 + 100) = **3500 ms** (`lightning.js:38,40`) | 4 × 500 = **2000 ms** | 600+100 ms (700 per hit) | 500 ms | hit-shake remove/add cycle, splash float +200 ms | ❌ wrong cadence (poc is faster/flatter) |
| **lightningBarrage** (20 hits) | 20 × (280 + 70) = **7000 ms** (`lightning.js:68,70`) | 19 × 500 = **9500 ms** | 280+70 ms | 500 ms | hit-shake cycle | ❌ 35% slower than JS, and per-hit feel wrong |
| **lightningSurge** | 400 ms tail (`lightning.js:111`) | 0 ms | | | | ❌ |
| **basicChiWave** | cutin 500 + camera 300 + windup 550 + arrival ~300–600 + 3-hit aerial 2×220 = **~2500 ms** (`basic.js:272,322,328,438,490`) | per-target 2 × 500 ms = **1000 ms** in inner loop (`skill-handlers.ts:600`) | 220 ms aerial | 500 ms | KOF cutin, camera zoom 1.2, parabolic hop, wave sprite life 1500 ms, juggle keyframes | ⚠️ poc has SOME camera/juggle (similar to cyberBeam), but no cutin / no chargingclass / inflated per-hit |
| **hunterShot** (3 hits) | 240 + 3×140 = **660 ms** (`hunter.js:23,48`) | not in audit excerpt | 140 ms per | ? | hit-shake remove inside loop | ⚠️ |
| **lavaBolt** | 500 ms (`lava.js:16`) | 0 ms | | | hit-shake | ❌ |
| **shellErode** | (i*50 ms float offset) + 80 + 500 = **~580 ms+** (`shell.js:281,284`) | not verified | | | | ⚠️ |

### Universal poc cadence pattern (the bug)
Most multi-hit poc handlers use `if (i < hits - 1) await sleep(500)` — a single global constant attributed to "E3/8: JS combat.js:266 同款 500ms 间隔". But **JS never uses a flat 500 ms per-hit gap**; each JS skill hand-tunes its own gap (basicBarrage 280 ms parallel, hunterBarrage 120 ms, ninjaBackstab 300 ms, shellStrike 500+150 ms, lightningStrike 600+100 ms, lightningBarrage 280+70 ms, lavaQuake 0 ms tail-only).

### Missing scene-level FX
| FX | JS | poc |
|---|---|---|
| `playAttackAnimation` 1.2 s hop arc with mid-strike sync at 400 ms | ✅ | ⚠️ poc has 240 ms hop but no `ATTACK_DAMAGE_SYNC_MS=400` (uses 240) |
| Skip-hop set for `ninjaImpact/ninjaBackstab` | ✅ `action.js:520` | not seen in poc executeAttack |
| Camera shake on chiWave first-hit | ✅ `basic.js:441–447` | ⚠️ cyberBeam has cam.shake, basicChiWave doesn't |
| Cut-in fullscreen blue/cyan flash (basicChiWave + cyberBeam) | ✅ | ✅ cyberBeam only; basicChiWave missing |
| `chi-hit-flash` 140 ms CSS filter on target | ✅ scene.css:687 | 🆕 |
| `hit-shake` 180 ms CSS animation | ✅ | partial via Phaser yoyo |
| `basic-chiwave-charging` charging keyframe | ✅ scene.css:656–671 (550 ms pulse) | 🆕 |
| `cyber-beam-sweep` real sprite life 720 ms with steps anim | ✅ | ⚠️ rectangle stretch tween (simpler) |
| `chi-cutin` / `cyber-cutin` fullscreen overlays | ✅ | ⚠️ cyber-cutin has poc rect equivalent; basic-cutin missing |

### Fix worklist (per-skill)
1. **basicBarrage** (`skill-handlers.ts:554–571`): rewrite as parallel staggered (280 ms shotStagger). Each bolt: spawn → 130 ms travel → damage. Fire 10 bolts as `Promise.all` of staggered async tasks. Total ~3160 ms.
2. **hunterBarrage** (`skill-handlers.ts:3620–3646`): add 220 ms windup `await sleep(220)` at start; per-hit 120 ms already ✅. Add hunter-arrow projectile sprite spawn (asset key already exists per scene.css:533).
3. **cyberBeam**: ✅ matches well — verify hopMs=460 and beamLifeMs=720 in poc.
4. **ninjaShuriken**: hit-shake to 360 ms (currently 240 ms via 4-yoyo) — extend to repeat:5 ×60 ms.
5. **ninjaBackstab** (`skill-handlers.ts:1087–1106`): after final hit, add `await sleep(1500)` to mirror JS `ninja.js:501` (covers F4-12 sprite + recovery).
6. **phoenixBurn** (`skill-handlers.ts:1116–1125`): add `await sleep(450)` after damage, `await sleep(80)` tail.
7. **shellAbsorb** (`skill-handlers.ts:1275–1289`): add `await sleep(800)` at end.
8. **shellStrike** (`skill-handlers.ts:1298+`): after each hit add `await sleep(500); /* hit-shake */ await sleep(150)`.
9. **lavaBolt / lavaQuake / lavaSurge / lavaSplash**: add tail sleeps 500 / 600 / 600 / per-cycle 500. 
10. **lightningStrike** (`skill-handlers.ts:1794–1818`): change to per-hit `await sleep(600); /* hit-shake remove */ await sleep(100)`.
11. **lightningBarrage** (`skill-handlers.ts:1820–1835`): change inter-hit from 500 to 280, add per-hit 70 ms tail-clear sleep.
12. **lightningSurge** (`skill-handlers.ts:1837–1854`): add 400 ms tail.
13. **basicChiWave** (`skill-handlers.ts:574–606`): port the KOF sequence — cutin 500 → camera 300 → caster Y-hop → 550 ms windup → chi-wave sprite life 1500 ms → 3-hit aerial juggle (220 ms apart). Reuse cyberBeam scaffolding.
14. **lavaBolt / lavaSurge / phoenixScald**: add hit-shake remove cycle + tail sleep.
15. Global: change `ATTACK_DAMAGE_SYNC_MS` to **400 ms** in `executeAttack` (`BattleScene.ts:1721,1723`), currently 240.
16. Global: insert 600 ms skill-announce sleep before any skill cast.
17. Global: search `if (i < hits - 1) await sleep(500)` in `skill-handlers.ts` — every occurrence is suspect; verify against JS and replace per-skill.

---

## §4 Battle Stats Tracking

### Event coverage

JS (`fighter.js:87–90`, `systems/stats_tracker.js`, `combat.js:198+`):
- 9 numeric fields per fighter: `_dmgDealt, _dmgTaken, _physDmgDealt/Taken, _magicDmgDealt/Taken, _trueDmgDealt/Taken`
- Subscribed to `damage:dealt` bus event; aggregates per-side + per-type.
- DoT damage routes through `applyRawDmg(source=null, ..., 'true')` so DoT is NOT separately tracked (gets bucketed into `_trueDmgTaken` but no `_trueDmgDealt` since source is null).
- Healing / shield-given / kills are NOT tracked separately.

poc (`systems/battle-stats.ts`):
- `FighterStats { dmgDealt, dmgDealtByType{phy,mag,tru,dot}, dmgTaken, dmgTakenByType, healDone, healTaken, shieldGained, kills }` — **richer than JS** with explicit DoT bucket, heal, shield, kills.
- `recordDamage(caster, target, amount, type)`, `recordHeal`, `recordShield`, `recordKill`.

| Event | JS records | poc records | Status |
|---|---|---|---|
| Physical dmg dealt/taken | ✅ | ✅ | ✅ |
| Magic dmg dealt/taken | ✅ | ✅ | ✅ |
| True dmg dealt/taken | ✅ (pierce → true bucket) | ✅ | ✅ |
| DoT dmg dealt/taken | merged into true | ✅ separate `dot` bucket | 🆕 (poc improvement) |
| Heal done/taken | 🚫 (not tracked) | ✅ | 🆕 (poc improvement) |
| Shield given | 🚫 | ✅ | 🆕 (poc improvement) |
| Kills | 🚫 | ✅ | 🆕 (poc improvement) |
| Per-skill source | partial (via `source` in bus event) | partial (via caster arg) | ✅ |
| Passive/rule damage (lava burn, drone fire, ghostCurse) | `_dotDmg` via combat.js applyRawDmg with source=null → only target-side bucket recorded | poc needs explicit `recordDamage(null, target, ..., 'dot')` at each passive site — partial; some `_dotDmg`-style sites in `skill-handlers.ts` route to `recordDamage(caster, target, ..., 'dot')` but rule/passive code paths in `passive-triggers.ts` need verification | ⚠️ |
| Counter damage (lightning shield) | tracked via spawnFloatingNum but not via bus stat | poc handler unclear | ⚠️ |

### UI fidelity

JS (`ui.js:1350–1409`, `battle.css` `.ds-row/.ds-bar/.ds-col`):
- Panel toggled by 📊 button (`index.html:369`); `dmg-stats-panel` slides up from bottom on mobile, fixed right panel on desktop.
- 2 tabs only: "造成伤害 / 承受伤害" (`ds-tabs` buttons).
- Each row:
  - top line: pet avatar 16 px + name + total value (right-aligned, gold)
  - stacked bar: `.ds-bar-normal` (phys orange) + `.ds-bar-magic` (purple) + `.ds-bar-true` (red) absolute-positioned, widths in % of `max(team)`
  - dead rows greyed via `.ds-dead`
- Sorted descending by total.
- 2-column layout (`.ds-col` 我方/敌方).

poc (`BattleScene.ts:2489–2597`):
- 280×360 Phaser container panel, gold-stroked.
- Same 2 tabs (`'dealt' | 'taken'`).
- Rows: name (10 px) + total (10 px gold) + 4-segment stacked bar (4 px tall) showing phy/mag/tru/dot.
- 我方/敌方 sections (single column, not 2-col as JS).
- Toggle: `showStatsPanel()` opens panel modal (line 2046) — also via toolbar (`BattleScene.ts:390 onDmgStats`).
- No avatar icons in row.
- No live-update on damage events — refreshed only when panel opens or `endTurn` if visible (line 1047). JS calls `updateDmgStats()` after every `applyRawDmg` via bus.

### Fix worklist
1. `BattleScene.ts:2502–2535` — change panel to 2-column (我方 left, 敌方 right) like JS, not stacked sections.
2. `BattleScene.ts:2564–2587` — add pet avatar (use `pet-${id}` texture 16×16) on each row before name.
3. `BattleScene.ts:2496–2500` — subscribe to `bus.on('damage:dealt')` for live update, not just per-turn.
4. `battle-stats.ts:78–81` `recordShield` — verify all shield-granting skills (commonTeamShield, phoenixShield, lightningShield, lavaSurge, angelBless, stoneArmor, etc.) call it.
5. `battle-stats.ts:71–75` `recordHeal` — verify phoenixPurify, hotBuff tick, lifesteal, healing-aura passive all call it.
6. `passive-triggers.ts` / DoT tick code — ensure burn/poison/curse ticks call `recordDamage(source ?? null, target, dmg, 'dot')`.
7. Add `recordKill` call sites where dies-by-DoT (currently only sk-killed paths route through `recordKill`).
8. `BattleScene.ts:2549–2555` — when totals are 0 across the board, show "暂无伤害" placeholder instead of empty bars.
9. End-of-battle: confirm `BattleEndScene.renderStatsTable` (line 99) reads from `battleStats.all()` and dumps the full breakdown (heal/shield/kills) not just dealt/taken.
10. Dead-row greying — pass `view.alive` to renderRow (currently uses `s.kills < 0` placeholder which is always false).

---

## §5 Debug Panel

### JS feature list (full)

Source: `js/debug.js` (216 lines) + `index.html:617–678` panel HTML + `index.html:265, 370` entry buttons + `css/base.css` `.debug-panel-overlay/.debug-panel-box/.debug-section`.

Gating: pure button click on main menu (codex page) AND in-battle top toolbar 🛠 button. Button tooltip mentions "按 D 键也可" but I found NO actual keydown binding in the codebase — the tooltip is aspirational/stale.

**Section 1 — Level & Coin (out of battle):**
1. `debugSetAllLevels(1)` — set all 28 turtles to Lv.1
2. `debugSetAllLevels(5)` — all Lv.5
3. `debugSetAllLevels(10)` — all Lv.10
4. `debugSetAllLevels()` — prompt for custom level
5. `debugAddCoins(1000)` — +1000 龟币
6. `debugResetProgress()` — confirm dialog → clear all levels + coins (localStorage `petState`)

**Section 2 — Quick start battle:**
7. `debugQuickBattle('pve','easy')`
8. `debugQuickBattle('pve','normal')`
9. `debugQuickBattle('pve','hard')`
10. `debugQuickBattle('boss','normal')` — Boss challenge
11. `debugQuickBattle('dungeon','normal')` — Dungeon
12. `debugJumpToDungeonBoss()` — auto-team first 3, jump straight to dungeon stage 5

**Section 3 — In-battle:**
13. `debugFullHealAll()` — heal all `allFighters` to maxHp
14. `debugKillAllEnemies()` — set right team to 1 HP and apply 99999 true dmg
15. `debugKillAllAllies()` — same for left team
16. `debugResetCds()` — set every fighter's skill.cdLeft = 0; rerender ActionPanel
17. `debugAddConsumable('c_heal')` — push 治疗药水 into left bench
18. `debugAddConsumable('c_speed')` — push 加速药水
19. `debugAddConsumable('c_bomb')` — push 炸弹
20. `debugExportLog()` — copy battleLog innerText to clipboard (prompt fallback)

**Section 4 — In-battle economy:**
21. `debugAddDeepCoin('left', 20)` — +20 deep coins (bypass AI gate by writing window.deepCoins directly)
22. `debugAddDeepCoin('left', 100)` — +100
23. `debugAddDeepCoin('left', 999)` — +999
24. `debugOpenQuickShop()` — force-open small shop, bypassing even-turn / player-side check
25. `debugOpenBigShop()` — force-open big shop

**Section 5 — Send any equipment to bench:**
26. `debugEquipFilter` text input — filter by id/name (oninput → `debugRenderEquipList()`)
27. `debugEquipCat` select — filter by category (5 options: all, unique, consumable, …)
28. `debugRenderEquipList()` — render EQUIP_POOL items as 2-column list with `→ 我方` / `→ 敌方` buttons each
29. `debugGiveEquip(id, side)` — push equip into either left or right bench

**Section 6 — Info display:**
30. `debugRefreshInfo()` — show in `<pre>`: 龟币 / 当前模式 / 战斗中 yes/no / per-pet level list
31. (Hidden) `debugToggleAutoPlay()` — toggle `window._autoPlay` (player turn auto-runs aiAction; no entry button found in HTML but function exists)

**Lifecycle wrappers:**
32. `showDebugPanel/hideDebugPanel` — toggle `.show` class; also calls `debugRenderEquipList()` first time via monkey-patch (lines 197–203)

### poc current state

Searched all of `poc-phaser/src/` for `debug`: **only** `BattleTopRow.ts:111` renders the 🛠 button and `BattleScene.ts:391` shows a "调试面板待接入" banner stub.

**Nothing else exists.** No equivalent functions for: level set, coin add, quick-battle launcher, heal/kill, CD reset, consumable add, deep-coin add, shop force-open, equip browser, info dump, auto-play toggle.

### Port plan

Priority (highest to lowest based on testing utility):

| # | Feature | Priority | Scope (LoC) |
|---|---|---|---|
| 1 | `debugFullHealAll` / `debugKillAllEnemies` / `debugKillAllAllies` / `debugResetCds` | HIGH (in-battle iteration) | 30 |
| 2 | `debugRenderEquipList` + `debugGiveEquip` (equip browser) | HIGH (test loadouts) | 80 |
| 3 | `debugAddConsumable` (heal/speed/bomb) | MEDIUM | 15 |
| 4 | `debugQuickBattle(pve/boss/dungeon)` | HIGH (skip menu) | 40 |
| 5 | `debugJumpToDungeonBoss` (stage 5 direct) | MEDIUM | 30 |
| 6 | `debugOpenQuickShop` / `debugOpenBigShop` | MEDIUM (shop testing) | 20 |
| 7 | `debugAddDeepCoin` | MEDIUM | 15 |
| 8 | `debugSetAllLevels` | LOW (level system not yet matched) | 25 |
| 9 | `debugAddCoins` / `debugResetProgress` | LOW | 20 |
| 10 | `debugExportLog` (copy battle log) | MEDIUM | 15 |
| 11 | Info panel (mode/inBattle/levels) | LOW | 15 |
| 12 | `debugToggleAutoPlay` | LOW (deprecated tooltip) | 10 |

Total estimated port: ~315 LoC.

**Suggested scaffold:** New `DebugOverlay.ts` scene/overlay (analogous to `HelpPanel.ts`). Render with same `.debug-section` CSS classes as JS (already work in DOM-overlay style). Wire `BattleScene.ts:391` `onDebug` to `this.debugOverlay.toggle()`.

---

## §6 Consolidated worklist

Ordered by impact, then by area. Each item lists file:line, change, and JS ref.

**A — HP bar critical bugs (§1):**

1. `scene-turtle-dom.ts:326–351` — port `.st-hp-delay` damage trail (200 ms hold + 500 ms shrink + 400 ms fade) [`ui.js:506–516`].
2. `scene-turtle-dom.ts:326–351` — add hit-flash (60 ms `brightness(2) saturate(0.5)`) [`ui.js:518–524`, `scene.css:201`].
3. `scene-turtle-dom.ts:326–351` — add heal green flash (0.7→0 over 0.4 s) [`ui.js:526–535`].
4. `scene-turtle-dom.ts:256–266` — add `.st-aura-shield` div + gold bubbleShimmer [`scene.css:205`].
5. `scene-turtle-dom.ts:256–266` — add `.st-hp-ticks` div + `buildSceneTickBg(barMax)` port [`scene.css:210–214`, `ui.js:586–591`].
6. `scene-turtle-dom.ts:256–266` — add `.st-hp-text` line with hp/maxHp + shield/bubble icons [`scene.css:215`].
7. `BattleScene.ts:50–60, 775–894` — delete hidden Phaser-rect HP path; the system runs tweens on `alpha:0` rectangles.
8. `scene-turtle-dom.ts:301–303` — gradient stops match JS `40%/60%`, not `38%/42%`.

**B — Skill announce wiring (§2):**

9. `BattleScene.ts:executeAttack/runSkillHandler call sites` (lines 1144, 1167, 1216, 1238, 1291, 1297, 1307, 1421, 1602) — invoke `this.showSkillAnnounce(actor, skill.name)` then `await sleep(600)` [`action.js:511–512`].
10. `BattleScene.ts:3378` — move banner y from `170` to `height/2`.
11. `BattleScene.ts:3406–3409` — skill name color `#fff` not `#fff3a0` [`scene.css:370`].
12. `BattleScene.ts:3380` — translucent black bg `0x000000 alpha 0.75` not `0x1a2740` [`scene.css:367`].
13. `BattleScene.ts:3382–3393` — pet icon 28 px, not 32 [`ui.js:1137`].

**C — Per-skill timing (§3):**

14. `BattleScene.ts:1721–1723` — change `ATTACK_HOP_FORWARD_MS=240` damage-sync to **`ATTACK_DAMAGE_SYNC_MS=400`** [`constants.js:22`, `action.js:529`].
15. `skill-handlers.ts:554–571 basicBarrage` — parallel staggered 10 bolts every 280 ms [`basic.js:138–224`].
16. `skill-handlers.ts:3620–3646 hunterBarrage` — add 220 ms windup; per-hit 120 ms already matches [`hunter.js:64,87`].
17. `skill-handlers.ts:937–1063 ninjaShuriken` — hit-shake from 240 ms (4-yoyo 60 ms) to 360 ms [`ninja.js:56`].
18. `skill-handlers.ts:1087–1106 ninjaBackstab` — add `await sleep(1500)` after final hit [`ninja.js:501`].
19. `skill-handlers.ts:1116–1125 phoenixBurn` — add `await sleep(450)` then `await sleep(80)` [`phoenix.js:38,47`].
20. `skill-handlers.ts:1275–1289 shellAbsorb` — add `await sleep(800)` [`shell.js:308`].
21. `skill-handlers.ts:1298+ shellStrike` — per-hit `await sleep(500); await sleep(150)` (hit-shake reset) [`shell.js:99–101`].
22. `skill-handlers.ts:1747–1757 lavaQuake` — add `await sleep(600)` tail [`lava.js:48`].
23. `skill-handlers.ts:1759–1768 lavaSurge` — add `await sleep(600)` tail [`lava.js:69`].
24. `skill-handlers.ts:lavaBolt` — add `await sleep(500)` tail [`lava.js:16`].
25. `skill-handlers.ts:1794–1818 lightningStrike` — per-hit `await sleep(600); await sleep(100)` [`lightning.js:38–40`].
26. `skill-handlers.ts:1820–1835 lightningBarrage` — change 500→280 ms gap; add 70 ms tail per hit [`lightning.js:68–70`].
27. `skill-handlers.ts:1837–1854 lightningSurge` — add `await sleep(400)` tail [`lightning.js:111`].
28. `skill-handlers.ts:574–606 basicChiWave` — port full KOF sequence (cutin 500 + camera 300 + windup 550 + wave 1500 + 3-hit aerial 220 ms) [`basic.js:243–537`].
29. Global search: replace all `await sleep(500)` inter-hit fillers in `skill-handlers.ts` with per-skill JS-matched values — flat 500 ms is the wrong default.

**D — Battle stats (§4):**

30. `BattleScene.ts:2502+ createDmgStatsPanel` — 2-column layout 我方/敌方 [`ui.js:1393–1402`].
31. `BattleScene.ts:2564+ renderRow` — add pet avatar 16 px before name [`ui.js:1370`].
32. `BattleScene.ts:2496–2500` — subscribe `bus.on('damage:dealt')` for live refresh; throttle to ~60 ms [`stats_tracker.js:33`].
33. `passive-triggers.ts` (burn/poison/curse tick) — call `recordDamage(source ?? null, target, dmg, 'dot')` at every DoT site.
34. `BattleScene.ts:2564–2566` — dead-row grey by `view.alive`, not `s.kills < 0`.
35. Verify `recordShield/recordHeal/recordKill` is called at every site in handlers + passives.

**E — Debug panel port (§5):**

36. New `DebugOverlay.ts` overlay scene (~315 LoC) covering features 1–11 above; wire to `BattleScene.ts:391 onDebug`.
37. Re-use `.debug-section` CSS class from JS (`base.css`) — overlay can use DOM injection like `SceneTurtleDom`.
38. Priority: in-battle features first (heal/kill/CD-reset/equip browser/consumable), then out-of-battle quick-launchers.

---

## Summary

- **§3 damage timing** is the worst area. The poc applies a flat `await sleep(500)` between every multi-hit segment, attributed to a misread JS `combat.js:266`. JS actually hand-tunes every skill: basicBarrage uses 280 ms parallel staggered, hunterBarrage 120 ms, lightningBarrage 280+70 ms, shellStrike 500+150 ms, ninjaBackstab 300 ms then 1500 ms tail, phoenixBurn 450+80 ms tail. JS has 204 `await sleep` calls in `js/skills/`; poc has 59 — a 3.5× cadence gap. cyberBeam is the one accurate port.
- **§5 debug panel** is entirely missing in poc (only the button + a "TODO" banner stub).
- **§2 skill announce** has `showSkillAnnounce` fully written in `BattleScene.ts:3370` but **never called** — pure dead code.
- **§1 HP bar** is the most surprising case: the DOM overlay matches JS structurally (correct class names, gradients, layer z-order), but is missing the damage delay trail, hit-flash, heal flash, aura-shield, tick marks, and the `.st-hp-text` line. Worse, a second hidden Phaser-rect HP path runs tweens on `alpha:0` objects every hit.
- **§4 stats** is the closest match — poc's data model is actually richer than JS (per-type DoT bucket, heal/shield/kill separate), but UI is single-column and doesn't live-update on damage events.
