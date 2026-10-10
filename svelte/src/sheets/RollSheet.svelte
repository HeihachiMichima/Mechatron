<script>
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { store, payEp, availableEp } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { ATTRS, chassis, attrCurrent, programs, devModFor, fmtBonus, rollPool, push, canReroll, tally, maxPushes, attrLabel, shownAttrs, status } from '../lib/rules.js';

  let { programId = null, weapon = null, free = false, cid = null } = $props();

  const id = cid ?? store.c.id;
  const me = store.char(id) ?? store.c;
  const c = $derived(store.char(id) ?? store.c);
  const ch = $derived(chassis(c));
  const startWeapon = weapon != null ? me.weapons[weapon] : null;
  const progId = programId ?? (startWeapon ? (startWeapon.portee === 'Bras' ? 'assaut' : 'tir') : null);
  const prog = $derived(programs(c).find((p) => p.id === progId) || null);

  let attr = $state((() => { const p = programs(me).find((x) => x.id === progId); return p?.attr ?? (free ? null : 'servos'); })());
  let baseAdj = $state(0);
  let mod = $state(0);
  // From a program row, preselect the first weapon that fits (melee for Assaut, ranged for Tir).
  const autoIdx = weapon ?? (progId === 'assaut' || progId === 'tir'
    ? (() => { const i = me.weapons.findIndex((x) => (progId === 'assaut') === (x.portee === 'Bras')); return i < 0 ? null : i; })()
    : null);
  let weaponIdx = $state(autoIdx);
  let gear = $state(autoIdx != null ? Number(me.weapons[autoIdx].bonus) || 0 : 0);

  const devMod = $derived(prog ? devModFor(c, prog) : 0);
  const attrVal = $derived(attr ? attrCurrent(c, ch, attr) : 0);
  const base = $derived(Math.max(0, attrVal + baseAdj));
  const progRaw = $derived((prog?.rating || 0) + devMod + mod);
  const progDice = $derived(Math.max(0, progRaw));
  const negDice = $derived(Math.max(0, -progRaw));
  const total = $derived(base + progDice + gear + negDice);
  const usesWeapons = $derived(prog && (prog.key === 'assaut' || prog.key === 'tir'));
  const w = $derived(weaponIdx != null ? c.weapons[weaponIdx] : null);

  let dice = $state(null);
  let pushes = $state(0);
  let rollId = $state(0);
  let appliedOnes = $state(0);
  let appliedGear = $state(0);
  let epPay = $state(0);

  const t = $derived(dice ? tally(dice) : null);
  const rerollable = $derived(dice ? dice.filter(canReroll).length : 0);
  const pendingOnes = $derived(pushes > 0 && t ? Math.max(0, t.baseOnes - appliedOnes) : 0);
  const pendingGear = $derived(pushes > 0 && t ? Math.max(0, t.gearOnes - appliedGear) : 0);
  const title = $derived(free ? 'Jet libre' : prog?.label ?? 'Jet');

  const inFight = () => store.combat.active && store.combat.combatants.some((x) => x.cid === id);
  function roll() {
    dice = rollPool({ base, prog: progDice, gear, neg: negDice });
    pushes = 0; appliedOnes = 0; appliedGear = 0; rollId++;
    if (inFight()) store.log(`${c.name || 'Robot'} : ${title}${w ? ` (${w.name})` : ''}, ${tally(dice).successes} succès`);
  }
  function doPush() {
    dice = push(dice); pushes++; rollId++;
    if (inFight()) store.log(`${c.name || 'Robot'} force ${title} : ${tally(dice).successes} succès`);
    epPay = Math.min(Math.max(0, tally(dice).baseOnes - appliedOnes), availableEp(store.data, c));
  }
  function apply() {
    const n = pendingOnes, ep = Math.min(epPay, n), dmg = n - ep;
    const lbl = [ep ? `−${ep} PE${c.kind === 'npc' && store.combat.usePool ? ' (réserve du MJ)' : ''}` : '', dmg && attr ? `${dmg} dégât${dmg > 1 ? 's' : ''} en ${attrLabel(c, attr)}` : ''].filter(Boolean).join(', ');
    store.commitOn(id, lbl || 'Conséquences ignorées', (s, d) => {
      payEp(d, s, ep);
      if (attr && dmg) s.damage[attr] = Math.min(ch.attrMax[attr], (s.damage[attr] || 0) + dmg);
      if (d.combat.active) store.log(`${s.name || 'Robot'} force son jet : ${lbl}`);
    });
    appliedOnes += n;
  }
  function wearWeapon() {
    const n = pendingGear;
    store.commitOn(id, `${w.name} : bonus −${n}`, (s) => (s.weapons[weaponIdx].bonus = Math.max(0, (Number(s.weapons[weaponIdx].bonus) || 0) - n)));
    appliedGear += n;
  }
  function selectWeapon(i) {
    if (weaponIdx === i) { weaponIdx = null; gear = 0; return; }
    weaponIdx = i; gear = Number(c.weapons[i].bonus) || 0;
  }
  const typeLabel = { base: 'base', prog: 'programme', gear: 'équipement', neg: 'négatif' };

  // Targets: in a combat, the other side; otherwise every other robot.
  const targets = $derived.by(() => {
    const cb = store.combat;
    const mine = cb.combatants.find((x) => x.cid === id);
    if (mine) return cb.combatants.filter((x) => x.side !== mine.side).map((x) => store.char(x.cid)).filter((x) => x && !status(x).deactivated);
    return [];
  });
  function hit(tg) {
    const amount = (Number(w.degats) || 0) + t.successes - 1;
    const ignore = /ignore/i.test(`${w.note || ''} ${(D.weapons.find((x) => x.name === w.name)?.note) || ''}`) && /armure/i.test(`${w.note || ''} ${(D.weapons.find((x) => x.name === w.name)?.note) || ''}`);
    store.open({ type: 'damage', cid: tg.id, amount, ranged: w.portee !== 'Bras', ignoreArmor: ignore && !/3 points/.test(w.note || ''), source: `${c.name || 'Robot'} (${w.name})`, attackerId: id });
  }
</script>

<Sheet {title} subtitle={attr ? `${c.name ? c.name + ', ' : ''}${attrLabel(c, attr)} ${attrVal}${prog && !free ? `, niveau ${prog.rating}` : ''}` : 'Choisissez les dés'}>
  {#if !dice}
    {#if free || !prog?.attr}
      <div class="block">
        <span class="lbl">Attribut</span>
        <div class="chips">
          {#each shownAttrs(c, ch) as a (a)}<button class="chip" aria-pressed={attr === a} onclick={() => (attr = a)}>{attrLabel(c, a)}</button>{/each}
          {#if free}<button class="chip" aria-pressed={attr === null} onclick={() => (attr = null)}>Aucun</button>{/if}
        </div>
      </div>
    {/if}

    <ul class="list pool">
      <li>
        <span class="sw base" aria-hidden="true"></span>
        <div class="txt"><b>Dés de base</b><span class="muted">{attr ? `${attrLabel(c, attr)} actuel ${attrVal}` : 'sans attribut'}{baseAdj ? `, ajusté ${fmtBonus(baseAdj)}` : ''}</span></div>
        <Stepper value={base} min={0} max={20} label="dés de base" onchange={(v) => (baseAdj = v - attrVal)} size="sm" />
      </li>
      <li>
        <span class="sw prog" class:neg={negDice > 0} aria-hidden="true"></span>
        <div class="txt"><b>Dés de programme</b><span class="muted">niveau {prog?.rating ?? 0}{devMod ? `, collectif ${fmtBonus(devMod)}` : ''}{mod ? `, modificateur ${fmtBonus(mod)}` : ''}</span></div>
        <Stepper value={progRaw} min={-15} max={20} label="dés de programme" onchange={(v) => (mod += v - progRaw)} size="sm" />
      </li>
      <li>
        <span class="sw gear" aria-hidden="true"></span>
        <div class="txt"><b>Dés d'équipement</b><span class="muted">{w ? w.name : 'bonus de l\'outil ou de l\'arme'}</span></div>
        <Stepper value={gear} min={0} max={10} label="dés d'équipement" onchange={(v) => (gear = v)} size="sm" />
      </li>
    </ul>
    {#if usesWeapons && c.weapons.length}
      <div class="block">
        <span class="lbl">Arme</span>
        <div class="chips">
          {#each c.weapons as wp, i (i)}<button class="chip" aria-pressed={weaponIdx === i} onclick={() => selectWeapon(i)}>{wp.name} +{wp.bonus || 0}</button>{/each}
        </div>
      </div>
    {/if}
    {#if negDice > 0}
      <p class="negnote"><b>{negDice} dé{negDice > 1 ? 's' : ''} négatif{negDice > 1 ? 's' : ''}</b> : chaque 6 sur {negDice > 1 ? 'eux' : 'lui'} annule un succès des dés de base ou d'équipement.</p>
    {:else if progRaw === 0 && (prog?.rating || mod || devMod)}
      <p class="hint">Aucun dé de programme : seuls les dés de base et d'équipement sont lancés.</p>
    {/if}
    <p class="hint">Visée +1, portée, couverture… : ajustez les dés de programme. En dessous de zéro, ils deviennent des dés négatifs.</p>
    <button class="btn primary block go" disabled={total === 0} onclick={roll}><Icon name="dice" />Lancer {total} dé{total > 1 ? 's' : ''}</button>
  {:else}
    <div class="result" aria-live="polite">
      <span class="succ num" class:fail={t.successes === 0}>{t.successes}</span>
      <span class="succ-l">{t.successes === 0 ? 'Aucun succès' : t.successes === 1 ? 'succès' : 'succès'}{pushes ? `, après ${pushes === 1 ? 'un jet forcé' : 'deux jets forcés'}` : ''}{t.cancelled ? `, ${t.cancelled} annulé${t.cancelled > 1 ? 's' : ''} par les dés négatifs` : ''}</span>
    </div>
    {#key rollId}
      <div class="dice">
        {#each dice as d, i (i)}
          <span class="die {d.t}" class:six={d.v === 6} class:one={d.v === 1} class:tumble={pushes === 0 || d.rerolled} aria-label="dé {typeLabel[d.t]} : {d.v}">{d.v}</span>
        {/each}
      </div>
    {/key}

    {#if w && t.successes > 0}
      <p class="callout dmg">Dégâts infligés : <b class="num">{(Number(w.degats) || 0) + t.successes - 1}</b> <span class="muted">({w.name} {w.degats}{t.successes > 1 ? ` + ${t.successes - 1} succès supplémentaire${t.successes > 2 ? 's' : ''}` : ''})</span></p>
    {/if}

    {#if w && t.successes > 0 && targets.length}
      <div class="targets">
        <span class="lbl">Appliquer les dégâts à</span>
        <div class="chips">
          {#each targets as tg (tg.id)}<button class="chip" onclick={() => hit(tg)}>{tg.name || 'Sans nom'}</button>{/each}
        </div>
      </div>
    {/if}

    {#if pendingOnes > 0}
      <div class="callout warn">
        <p><b>{pendingOnes} × 1</b> sur les dés de base : chaque 1 coûte 1 PE{c.kind === 'npc' && store.combat.usePool ? ' (réserve du MJ)' : ''} ou 1 dégât{attr ? ` en ${attrLabel(c, attr)}` : ''}.</p>
        <div class="split">
          <span>Payer en PE</span>
          <Stepper value={Math.min(epPay, pendingOnes)} min={0} max={Math.min(pendingOnes, availableEp(store.data, c))} label="PE payés" onchange={(v) => (epPay = v)} size="sm" />
          <span class="muted">{attr ? `dégâts : ${pendingOnes - Math.min(epPay, pendingOnes)}` : ''}</span>
        </div>
        <button class="btn small primary" onclick={apply}>Appliquer</button>
      </div>
    {/if}
    {#if pendingGear > 0}
      <div class="callout">
        <p><b>{pendingGear} × 1</b> sur les dés d'équipement : le bonus de l'équipement baisse de {pendingGear}.</p>
        {#if w}<button class="btn small" onclick={wearWeapon}>Réduire {w.name} (+{w.bonus || 0} → +{Math.max(0, (Number(w.bonus) || 0) - pendingGear)})</button>{/if}
      </div>
    {/if}

    <div class="after">
      {#if pushes < maxPushes(c) && rerollable > 0}
        <button class="btn primary" onclick={doPush}>Forcer le jet ({rerollable} dé{rerollable > 1 ? 's' : ''})</button>
      {/if}
      <button class="btn" onclick={() => (dice = null)}>Nouveau jet</button>
    </div>
    {#if pushes === 0 && rerollable > 0}<p class="hint">Forcer relance tout sauf les 6{D.rules.pushKeepsOnes ? ' et les 1 des dés de base et d\'équipement' : ''}.</p>{/if}
  {/if}
</Sheet>

<style>
  .block { margin-bottom: 12px; }
  .lbl { display: block; font-size: .85rem; color: var(--muted); margin-bottom: 6px; }
  .pool li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 10px 0; }
  .sw { width: 22px; height: 22px; border-radius: 4px; }
  .txt { display: grid; }
  .txt .muted { font-size: .82rem; }
  .base { background: var(--die-base); color: #2a2205; }
  .prog { background: var(--die-prog); color: #08200c; }
  .gear { background: var(--die-gear); color: #f0f0f0; box-shadow: inset 0 0 0 1px #5d666b; }
  .go { min-height: 54px; font-size: 1.05rem; margin-top: 6px; }
  .result { display: flex; align-items: baseline; gap: 10px; margin: 2px 0 12px; }
  .succ { font-size: 3.4rem; font-weight: 700; line-height: 1; color: var(--amber); }
  .succ.fail { color: var(--muted); }
  .succ-l { font-family: var(--display); font-size: 1.15rem; font-weight: 600; }
  .dice { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .die { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 7px; font-family: var(--display); font-size: 1.4rem; font-weight: 700; }
  .die.six { box-shadow: 0 0 0 3px var(--amber), 0 0 14px color-mix(in srgb, var(--amber) 60%, transparent); }
  .die.one { box-shadow: 0 0 0 3px var(--fault); }
  .die:not(.six):not(.one) { opacity: .62; }
  .die.neg { background: transparent; color: var(--fault); box-shadow: inset 0 0 0 2px var(--fault); }
  .die.neg.six { opacity: 1; background: color-mix(in srgb, var(--fault) 22%, transparent); box-shadow: inset 0 0 0 2px var(--fault), 0 0 0 3px var(--fault); }
  .die.neg.one { box-shadow: inset 0 0 0 2px var(--fault); opacity: .62; }
  .sw.prog.neg { background: transparent; box-shadow: inset 0 0 0 2px var(--fault); }
  .negnote { margin: 8px 0 0; padding: 8px 12px; border-left: 3px solid var(--fault); background: var(--abyss); font-size: .9rem; }
  .tumble { animation: tumble .38s cubic-bezier(.3,1.4,.5,1); }
  @keyframes tumble { from { transform: rotate(-200deg) scale(.4); opacity: 0; } }
  .callout { padding: 10px 12px; margin-bottom: 10px; border-left: 3px solid var(--line); background: var(--abyss); }
  .callout p { margin: 0 0 8px; }
  .callout.dmg { border-color: var(--amber); }
  p.callout { margin: 0 0 10px; }
  .callout.warn { border-color: var(--fault); }
  .split { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  .targets { margin: 0 0 12px; }
  .lbl { margin-bottom: 6px; }
  .after { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
