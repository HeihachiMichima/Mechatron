# CLAUDE.md — Compagnon Mechatron

Fan-made, unofficial game companion (robot fiches, energy, black market, combat) for
**Mutant: Year Zero — Mechatron**. UI is in **French**;
code, comments and identifiers are in English.

## Repository layout

```
(repo root)
├── CLAUDE.md, README.md (French, user-facing — keep in sync with features)
├── docs/PLAN-COMPAGNON.md   the implementation plan: tickets T00–T16, follow it in order
├── index.html, package.json, vite.config.js, svelte.config.js
├── .github/workflows/deploy.yml   builds and deploys to GitHub Pages on push to main
├── Mechatron-livre-md/  the rulebook in Markdown (git-ignored, never commit): READ THIS for rules
├── dist/index.html      the build (git-ignored): ONE self-contained file (JS, CSS, fonts, logo inlined)
└── src/
    ├── main.js, App.svelte, app.css     entry, sheet router, design tokens
    ├── assets/logo.png  app logo (top bar + print sheet), inlined into the build (the only tracked logo.png)
    ├── lib/
    │   ├── data.js          GAME_DATA — every game number, from the book only
    │   ├── house.js         house rules: values the book doesn't give (« règle maison », GM-editable)
    │   ├── settings.js      getRules(): book ← house ← campaign overrides
    │   ├── rules.js         pure rules functions (chassis, pools, dice, damage…)
    │   ├── store.svelte.js  roster + combat state, undo, localStorage
    │   ├── combat.js        initiative order, turn advance, group rolls
    │   ├── energy.js        module activation (overheating, Power Saver), module fx
    │   │                    lookup, energy-weapon power sources, E-packs, blasts
    │   ├── exports.js       JSON / text / share-link / PNG card exports
    │   └── pickers.js       list builders for the picker sheets
    ├── components/          TopBar, PcTabs, VitalsPlate, Nav, Sheet, Stepper,
    │                        Segments, Toast, Icon, Avatar, DiceTray, CombatGuide, PrintSheet,
    │                        OverheatDice (shows one module activation)
    ├── views/               État, Programmes, Matériel, Robot, Collectif, Combat
    │   └── combat/          CombatPrep → CombatInit → CombatFight (+ TurnFlow, ActorStats,
    │                        LogicConflict, BlowerStep, RecycleStep)
    └── sheets/              bottom-sheet dialogs (Roll, Damage, Module, Picker, Weapon,
                             Template, Roster, Export, Incoming, Xp, Combatant, EnemyEdit, Duplicate)
```

**Rules reference: `Mechatron-livre-md/`** (repo root, git-ignored — it is the user's own copy of a
copyrighted book: never commit, quote at length or publish it). It is the whole Mechatron rulebook
converted to Markdown (237 PDF pages, OCR, see `meta.json`):
- read `INDEX.md` first (chapter map + sub-section titles with pages), then open only the slice
  you need: one file per 5 pages, `p0001-0005.md` … `p0236-0237.md`;
- cite pages with the `<!-- page N -->` markers (PDF page numbers; printed page ≈ PDF page − 1);
- the text is OCR: table cells can be garbled (e.g. "2)" for a number). When a number matters
  and looks wrong, ask the user to check the PDF instead of guessing;
- useful pages: XP 26 · chassis parts 18 · energy points 72 · modules 72-78 · range & movement 82 ·
  cover 91 · DEV levels 107-108 · base stations, energy as currency 112 · black market 116-117 ·
  goods & services prices 234.
The original PDFs stay outside the repo. The folder only exists on the user's PC: an agent working
from a GitHub clone doesn't have it and must ask the user for the pages it needs.

## Commands (run at the repo root)

```bash
npm install
npm run dev       # Vite dev server
npm run build     # → dist/index.html (single file, ~624 kB)
npm run preview
```

Stack: Svelte 5 (runes), Vite 8, `vite-plugin-singlefile`, fonts from
`@fontsource/chakra-petch` and `@fontsource/ibm-plex-sans` referenced by relative
`node_modules` paths in `app.css` so they get inlined. No router, no CSS framework,
no backend. Output must stay a **static page** that opens by double-click, offline.

## Hard rules

- **Never invent game numbers.** Every stat in `data.js` comes from the rulebook
  (page refs in comments). If the book is silent, use `null` and let the UI fall
  back gracefully. When unsure, read the page in `Mechatron-livre-md/` first.
- **Mobile first.** Design for ~380 px wide, thumb reach (bottom nav, bottom sheets),
  44 px touch targets, no horizontal scroll. Desktop is a bonus layout.
- **French UI text**, proper typography (« », non-breaking spaces before `:` when
  natural, accents). Correct plural agreement in messages/toasts.
- **No backward compatibility.** There is no user base: no migration of old saves, no legacy
  keys, no support for old share links or files. A schema change just bumps `version`.
- **Every persisted field goes through `normalize()` / `normalizeAll()` / `normalizeCombat()`.**
  They rebuild objects from a fixed list of fields, and undo/reload pass through them: a field
  they don't know disappears. Add a save → reload → undo test for each new field.
  Current keys: `mechatron-roster-v3`, UI prefs `mechatron-ui-v2` (T03 replaces them).
- **House rules.** `data.js` holds book values only. A value the book doesn't give goes in
  `src/lib/house.js`, is shown with a « règle maison » badge and is GM-editable; read rule
  values through `getRules()` (`src/lib/settings.js`).
- **Simple to use, simple to maintain.** At equal value, less code, fewer screens, fewer
  settings. Don't force a request that fits the static single-file tech badly: propose a simpler
  alternative or ask the user.
- Colors are semantic: `--amber` primary/successes, `--coolant` energy only,
  `--fault` damage only; dice: base yellow, program green, gear black. Light/dark/auto
  themes via `:root[data-theme]`.


## Architecture notes

**Store (`store.svelte.js`).** `store.data = { version: 3, chars[], activeId, combat }`,
`store.ui = { tab, theme, sheet, turn, turnActor }`. Mutate only through
`commit(label, fn)`, `commitOn(charId, label, fn(char, data))` or `commitAll` — they
snapshot for undo, autosave and toast. `store.open(type, props)` / `store.close()`
drive bottom sheets; **props vanish after `close()`**, so capture them in consts first.

**Characters.** `blankCharacter(kind)` with `kind: 'pc' | 'npc'`, `body: robot | drone |
creature`, `statMode: 'chassis' | 'direct'` (direct = stats typed in, used by NPC
templates). Damage is stored as damage (`c.damage[attr]`, `c.armorDamage`), never by
lowering the max. Each PC gets a color from `GAME_DATA.pcColors` (`ensureColor`).

**Rules (`rules.js`) — Year Zero Engine as implemented:**
- Pool = base dice (current attribute) + program dice + gear dice. 6 = success.
- Modifiers (collective dev level, range, aim, manual) change **program dice only**;
  below zero they become **negative dice** that cancel successes.
- Push: reroll non-6 dice; base and gear 1s are locked. After a push each base 1 =
  1 EP spent or 1 damage to that attribute; each gear 1 = weapon/gear bonus −1.
  Two pushes with the secondary function Surrégime (`maxPushes`).
- A program whose attribute is broken (current 0) cannot be used.
- `resolveDamage(c, {amount, ranged, coverRating, ignoreArmor, location, reduce})`:
  cover (ranged only) → armor (each 6 blocks; armor wears 1 if any damage gets
  through) → optional reduction (Reactive Armor, anti-EMP) → D6 hit location
  (robot / drone tables), excess rerolls location, a module breaks on its first
  point. Creatures take damage to Strength (servos slot).
- Initiative: D6; SWAT Tactics rolls two keep best; identical NPC group shares one
  roll; surprise +2; ties → current Stability, then hidden random `tie`.
- NPCs pay EP from the GM pool (`payEp` / `availableEp`).

**Combat (3 stages, `views/combat/`).** `data.combat = { phase: 'prep'|'init'|'fight',
active, round, turn, combatants[], log[], gmPool, usePool }`; combatant =
`newCombatant(cid, side)` with `init, tie, acted, defending, overwatch, surprise,
lostAction, prone, fled, lock, initBonus`.
- Prep: PC avatars toggle in/out; enemies from `npcTemplates` (TemplateSheet, mode
  `combat`) or existing NPCs; `EnemyEditSheet` edits them inline.
- Init: roll all / per row / manual entry, order preview.
- Fight: initiative track (`Avatar`), `TurnFlow` = guided steps
  action → setup (target, weapon, modifiers, defense) → roll (`DiceTray` for attacker
  then defender) → damage → result → `endTurn`. Only combat-relevant options appear
  (modules tagged `combat: 'action'|'boost'|'reaction'`, weapons `kind: melee|ranged`).
  Per-combatant actions (manual damage, open sheet, remove, edit) live in
  `CombatantSheet`, opened by tapping an avatar. `CombatGuide` = colored, collapsible
  quick reference from `GAME_DATA.combatGuide`.

**Modules in combat (v2.2).** Each module in `data.js` has an `fx` list (machine-readable
effects: `kind`, `cost` or `perEp`, `range`, flags). `moduleFx(c, kinds)` lists the working
ones. Every activation goes through `rollActivation()` (one Gear Die per EP, any 1 → overheat
table; Power Saver adds a die and a 6 saves 1 EP; Glitch doubles the cost, Power Surge doubles
the effect, Fatal Error/Crossed Wires/Bluescreen = no effect) then `settleActivation()` inside a
commit. Where kinds plug in: `initBoost` (CombatInit), `extraAttack` / `fullAttr` / `sawDmg` /
`grappleHit` / `extraDefense` (TurnFlow attack steps), `react` (damage step), action kinds
(`dmg multi fatigue selfHarm disable control grappleAtk hold blast shift escape info`, TurnFlow
`fx` step), free kinds (`repair repairModule drone`, no action). TurnFlow keeps the chosen fx in
`T.fxObj` because a Fatal Error removes the module from the working list.
**Party support (v2.3).** TurnFlow setup offers *Aide* (+1 per ally who hasn't acted; sets
their `lostAction`) and *Calculer* (Protocol Robot rolls first; success lets the attacker
withdraw after the roll, before pushing — `withdraw()`; extra successes add +1 each). Cleaning
Robots get a pseudo-weapon from `combatWeapons()` (index −2, `prog: '__special'`, damage 3,
Short, `swarmOnly`; `isSwarm()`). Steps in their own components: `LogicConflict.svelte`
(Interact/Manipulate vs Question/Empathy, Hierarchy and logical-basis +1s, Network damage
stunts), `BlowerStep.svelte` (Trash Blower), `RecycleStep.svelte` (Recycle; one-use weapons
`oneUse`, discarded in `finish()` via `T.spentIdx`).
Combatant extras: `held` (immobilized: by, how, mod, with), `extra` (bonus attacks used this
round), `defenses`, `protectRound` (Protect once per round). Weapons: `power`
(`epack|internal|crank`), `empty`, `crankDue`. Sleep mode: PC robot at 0 EP passes its turn.

## Svelte gotchas met so far

- `{@const}` must be the first child of a block (`{#if}`, `{#each}`…).
- Cannot `bind:value` to a function call — use `value=` + `oninput`.
- `@page` is not allowed in component CSS — put print page rules in `app.css`.
- Keep `overflow-anchor: none` (app.css): with scroll anchoring the page jumps whenever a
  panel above or around the viewport changes height.
- Don't remove a `GAME_DATA` key without grepping for it (deleting `pcColors` once
  blanked the whole app at startup).

## Testing

No test suite in the repo. Verify with a production build plus a headless
Playwright run on `dist/index.html` (Chromium is preinstalled in Claude's cloud
workspace at `/opt/pw-browsers`, do not run `playwright install` there; on the user's PC run
`npx playwright install chromium` once): click through
Préparation → Initiative → Combat for a few rounds, read the combat log from
`localStorage['mechatron-roster-v3']`, check there are no console errors, and look
at screenshots at 390 px width (light and dark).

## Delivering changes

Follow `docs/PLAN-COMPAGNON.md` §0: one ticket at a time, in order.
1. Start from an up-to-date `main` on a branch `ticket/<id>-<slug>`.
2. Edit in `src/`, `npm run build` after each step; test (Vitest from T02, Playwright screenshots
   at 390 and 1280 px, both themes).
3. Update `README.md` (French, user-facing) when behavior changes; bump `version` in
   `package.json` (minor for a feature, patch for a fix).
4. Commit with `vX.Y.Z: …` messages, push the branch, open a PR whose description is the ticket
   report. **The user merges** — never merge your own PR, never push to `main`.
5. A merge to `main` deploys the site (GitHub Actions). Git history is the archive: no
   `releases/` snapshots, no committed build.

## Status / history

- v1: vanilla JS replica of the paper sheet (deleted in v2.3.8; see git history).
- v2.0: Svelte rewrite, mobile-first, book data filled in, exports (JSON, text,
  share link, PNG card, print), roster of PCs/NPCs with color tabs, negative dice.
- v2.1 (2026-10-10): guided 3-stage combat (prep with avatars, initiative roll or
  manual, step-by-step turns with target lock, both sides' dice, armor and damage),
  split melee/ranged quick reference, broken-attribute actions disabled.
- v2.2 (2026-10-10): modules and secondary functions act in combat (book ch.4-6), with
  overheating on every activation; energy management (energy panel, weapon power sources,
  E-pack drain/reload, recharge items, EP transfer, sleep mode); grapple/hold state; Protect.
- v2.3 (2026-10-10): party support in combat — help (+1, NPC group attacks), Calculate with
  withdraw, Clean vs swarms, Trash Blower, Recycle (weapon/tool), logic conflicts (Interact,
  Manipulate). Fixed the initiative track widening the page with many combatants.
- v2.3.1 (2026-10-10): « Nouveau robot / drone / Nouvelle créature » buttons; duplicate an NPC
  (`DuplicateSheet`, `addCopies()` in the store: fresh ids, numbered names, shared group,
  same side and initiative in combat).
- v2.3.2 (2026-10-10): no more scroll jumps in combat — `overflow-anchor: none` in `app.css`
  (browser scroll anchoring shifted the page at every turn-panel height change); TurnFlow
  scrolls only when no panel button is visible after a step/turn change.
- v2.3.3 (2026-10-10): the initiative track is a turn lane (CombatFight `lane`): current actor
  first, then those still to act, a dashed separator, then those who acted (greyed), then the
  destroyed; `animate:flip`, lane scrolls back to its start on each turn.
- v2.3.4 (2026-10-10): `ActorStats.svelte` (acting robot's attributes, armor, EP, combat
  programs, weapons, modules) above « Manœuvre »; no max width on `main` — views add columns
  at ≥1500 px (État/Matériel: right column splits in two; Programmes/Robot: 3 columns), combat
  side column grows to 28 % at ≥1400 px.
- v2.3.5 (2026-10-10): « Tout remettre à neuf » (`ResetAllButton`, `restoreAll()` in the store)
  in combat prep, fight footer and the robot list: damage, armor, cover, modules, EP, energy
  weapons, worn Gear Bonus (up to the book value), combat temporary states.
- v2.3.6 (2026-10-11): the target's stats (`ActorStats`, grey left border) under every target
  picker — TurnFlow snippet `tstats(c)` in setup, lock-on, single-target fx and drone steps,
  plus LogicConflict.
- v2.3.7 (2026-10-11): the logo is part of the app and of git — shown in the top bar (`TopBar`,
  30 px high on phones, 42 px from 720 px) and on the print sheet (plain import, no more optional
  glob); `.gitignore` tracks only that `logo.png`; the Markdown rulebook folder is ignored.
- v2.3.8 (2026-10-11, plan ticket T00): repo flattened (the app is at the repo root, v1 files and
  `releases/` deleted), GitHub Actions builds and deploys `dist/` (no committed build), docs
  tracked (`CLAUDE.md`, `README.md`, `docs/`), `house.js` + `getRules()` skeleton.

## Ideas not done yet

- Hover drone moves/Scan/Infiltrate, Holoflage/Sensor Pulse (no combat flow yet), Energy Bank
  as a weapon power source, EMP weapons (none in the data), Trash Blower, Self-Destruct.
- The rulebook is in `Mechatron-livre-md/` (see "Rules reference" above); no need to OCR the PDF
  again. PDF page numbers match the page refs in `data.js` comments; the book's own
  cross-references ("see page 86") point one page earlier than the PDF page.
