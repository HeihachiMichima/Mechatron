<script>
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import CombatGuide from '../../components/CombatGuide.svelte';
  import TurnFlow from './TurnFlow.svelte';
  import CombatMap from './CombatMap.svelte';
  import ResetAllButton from '../../components/ResetAllButton.svelte';
  import { flip } from 'svelte/animate';
  import { energyRules } from '../../lib/clock.js';
  import { store, blankCombat } from '../../lib/store.svelte.js';
  import { order, current, isDown, sideCounts } from '../../lib/combat.js';
  import { status, epMax } from '../../lib/rules.js';
  import { isEnergyWeapon, weaponPower } from '../../lib/energy.js';

  let { onprep } = $props();
  const cb = $derived(store.combat);
  const ord = $derived(order(store.data));
  const cur = $derived(store.ui.turnActor ? ord.find((r) => r.x.id === store.ui.turnActor) : current(store.data));
  const counts = $derived(sideCounts(store.data));
  const hasNpc = $derived(ord.some((r) => r.c.kind === 'npc'));
  // Turn lane: whoever acts now first, then those still to act, then (greyed)
  // those who already acted this round, then the destroyed — all in
  // initiative order. A new round puts everyone back in initiative order.
  const lane = $derived.by(() => {
    const up = ord.filter((r) => !isDown(r) && r.x.id !== cur?.x.id);
    const waiting = up.filter((r) => !r.x.acted), done = up.filter((r) => r.x.acted);
    return { head: [...(cur ? [cur] : []), ...waiting], done, down: ord.filter((r) => isDown(r) && r.x.id !== cur?.x.id) };
  });
  const laneItems = $derived([...lane.head, ...(lane.head.length && lane.done.length ? [{ sep: true, x: { id: '__sep' } }] : []), ...lane.done, ...lane.down]);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let trackEl = $state(null);
  // Keep the active robot in sight: the lane itself scrolls back to its start.
  $effect(() => { cur?.x.id; trackEl?.scrollTo({ left: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  const supply = $derived(energyRules(store.campaign).ration); // the GM pool follows the same supply level (p.73)
  let confirmEnd = $state(false);

  const showMap = $derived(store.campaign.maps.length > 0); // GM: maps are drawn in MJ → Cartes
  let logOpen = $state(true);

  function end(cleanup) {
    store.ui.turn = null; store.ui.turnActor = null;
    store.ui.owTarget = null; store.ui.owResume = null; store.ui.mapPick = null; store.ui.blastCell = null;
    store.commitAll('Combat terminé', (d) => {
      if (cleanup) {
        const dead = new Set(d.combat.combatants.map((x) => d.chars.find((c) => c.id === x.cid)).filter((c) => c && c.kind === 'npc' && status(c).deactivated).map((c) => c.id));
        d.chars = d.chars.filter((c) => !dead.has(c.id));
        if (!d.chars.some((c) => c.id === d.activeId)) d.activeId = d.chars[0]?.id ?? null;
      }
      d.combat = { ...blankCombat(), gmPool: d.combat.gmPool, usePool: d.combat.usePool };
    });
    confirmEnd = false;
  }
  const setPool = (v) => store.commitAll(null, (d) => (d.combat.gmPool = Math.max(0, v)));
  // Robots with their own EP (player robots and NPCs when the GM pool is off).
  const powered = $derived(ord.filter((r) => r.c.body !== 'creature' && (r.c.kind !== 'npc' || !cb.usePool)));
  const setEp = (c, v) => store.commitOn(c.id, null, (s) => (s.ep.current = Math.max(0, Math.min(epMax(s), v))));
  const wState = (c) => (c.weapons || []).filter((w) => isEnergyWeapon(w)).map((w) => `${w.name} : ${weaponPower(w) === 'internal' ? 'interne' : weaponPower(w) === 'crank' ? (w.crankDue ? 'manivelle à remonter' : 'manivelle') : w.empty ? 'E-pack vide' : 'E-pack'}`);
</script>

<div class="layout" class:withmap={showMap}>
  {#if showMap}<div class="map-col"><CombatMap fight /></div>{/if}
  <div class="main-col">
    <section class="panel track-panel">
      <div class="track-head">
        <span class="rn num">Tour {cb.round}</span>
        <span class="counts"><b class="ally">{counts.ally}</b> allié{counts.ally > 1 ? 's' : ''} debout, <b class="enemy">{counts.enemy}</b> ennemi{counts.enemy > 1 ? 's' : ''}</span>
      </div>
      <ol class="track" aria-label="Ordre de jeu du tour" bind:this={trackEl}>
        {#each laneItems as r (r.x.id)}
          <li class:sep={r.sep} animate:flip={{ duration: reduced ? 0 : 380 }}>
            {#if r.sep}<span class="sepline" title="Ont déjà joué ce tour"></span>{:else}
            <button class="tk" class:enemy={r.x.side === 'enemy'} onclick={() => store.open({ type: 'combatant', xid: r.x.id })} aria-label="{r.c.name}, initiative {r.x.init}">
              <span class="ti num">{r.x.init}</span>
              <Avatar c={r.c} side={r.x.side} size={42} current={cur?.x.id === r.x.id} dim={r.x.acted && cur?.x.id !== r.x.id} down={isDown(r)} />
              <span class="flags">{#if r.c.body !== 'creature' && (r.c.kind !== 'npc' || !cb.usePool)}<i class="epf" class:zero={r.c.ep.current === 0} title="PE">⚡{r.c.ep.current}</i>{/if}{#if r.x.held}<i title="immobilisé">⛓</i>{/if}{#if r.x.lock}<i title="verrouille une cible">◎</i>{/if}{#if r.x.overwatch}<i title="surveillance">👁</i>{/if}{#if r.x.prone}<i title="à terre">↓</i>{/if}{#if r.x.lostAction}<i title="a perdu son action">✋</i>{/if}</span>
            </button>
            {/if}
          </li>
        {/each}
      </ol>
    </section>

    {#if counts.enemy === 0 || counts.ally === 0}
      <section class="panel over">
        <h2>{counts.enemy === 0 ? 'Plus aucun ennemi debout' : 'Plus aucun allié debout'}</h2>
        <p class="muted">{counts.enemy === 0 ? 'Le combat est gagné.' : 'Le combat est perdu… ou il est temps de fuir.'}</p>
        <div class="acts">
          <button class="btn primary" onclick={() => end(false)}>Terminer le combat</button>
          {#if hasNpc}<button class="btn" onclick={() => end(true)}>Terminer et supprimer les PNJ détruits</button>{/if}
        </div>
      </section>
    {/if}

    <TurnFlow />

    <div class="foot">
      <button class="btn small ghost" onclick={onprep}><Icon name="plus" size={16} />Ajouter des combattants</button>
      <ResetAllButton small />
      <button class="btn small ghost" onclick={() => (confirmEnd = !confirmEnd)}>Terminer le combat</button>
      {#if confirmEnd}
        <button class="btn small" onclick={() => end(false)}>Confirmer</button>
        {#if hasNpc}<button class="btn small danger" onclick={() => end(true)}>Terminer et supprimer les PNJ détruits</button>{/if}
      {/if}
    </div>
  </div>

  <aside class="side-col">
    {#if powered.length}
      <section class="panel energy">
        <div class="panel-head"><h2>Énergie</h2><span class="meta">PE en combat</span></div>
        <ul class="list en">
          {#each powered as r (r.x.id)}
            {@const mx = epMax(r.c)}
            <li>
              <div class="enrow">
                <span class="enm" class:enemy={r.x.side === 'enemy'}>{r.c.name || 'Sans nom'}</span>
                <span class="num env" class:zero={r.c.ep.current === 0}>{r.c.ep.current}<small>/{mx}</small></span>
                <Stepper value={r.c.ep.current} min={0} max={mx} label="PE de {r.c.name}" onchange={(v) => setEp(r.c, v)} size="sm" bare />
              </div>
              <span class="bar"><span style="width:{Math.round((r.c.ep.current / mx) * 100)}%"></span></span>
              {#if r.c.ep.current === 0}<span class="sleep">En veille : inactif tant qu'il n'a pas reçu de PE.</span>{/if}
              {#if wState(r.c).length}<span class="ws">{wState(r.c).join(', ')}</span>{/if}
            </li>
          {/each}
        </ul>
        <p class="hint">Chaque module coûte des PE et lance un dé de surchauffe par PE. À 0 PE, un robot passe en veille.</p>
      </section>
    {/if}
    {#if hasNpc}
      <section class="panel pool">
        <div class="panel-head"><h2>Réserve du MJ</h2><span class="meta">{cb.usePool ? 'payée par les PNJ' : 'inactive'}</span></div>
        <div class="pool-row"><span class="num pv">{cb.gmPool}</span><Stepper value={cb.gmPool} min={0} max={200} label="réserve" onchange={setPool} size="sm" /></div>
        <p class="hint">Remplissage conseillé : {supply} × nombre de PJ.</p>
      </section>
    {/if}
    <section class="panel log">
      <button class="panel-head lh" onclick={() => (logOpen = !logOpen)} aria-expanded={logOpen}><h2>Journal</h2><span class="meta">{cb.log.length} {logOpen ? '−' : '+'}</span></button>
      {#if logOpen}
        <ol class="entries">{#each [...cb.log].reverse().slice(0, 30) as l, i (i)}<li><span class="lr num">T{l.round}</span>{l.text}</li>{/each}</ol>
      {/if}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Aide-mémoire</h2></div>
      <CombatGuide />
    </section>
  </aside>
</div>

<style>
  .layout { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 1000px) { .layout { grid-template-columns: minmax(0, 1fr) 340px; align-items: start; } }
  @media (min-width: 1400px) { .layout { grid-template-columns: minmax(0, 1fr) minmax(380px, 28%); } }
  .main-col, .side-col { display: grid; gap: 12px; align-content: start; min-width: 0; grid-template-columns: minmax(0, 1fr); }
  /* With a map: on phones the map sits between the turn lane and the turn panel
     (main-col's children join the layout grid); from 1280 px it takes the left
     column and the turn panel the right one. */
  .withmap > .main-col { display: contents; }
  .withmap > .main-col > :global(*) { order: 3; }
  .withmap > .main-col > .track-panel { order: 1; }
  .withmap > .map-col { order: 2; min-width: 0; }
  .withmap > .side-col { order: 4; }
  @media (min-width: 1000px) and (max-width: 1279.98px) {
    .withmap { grid-template-columns: minmax(0, 1fr); }
  }
  @media (min-width: 1280px) {
    .withmap { grid-template-columns: minmax(0, 1.15fr) minmax(360px, 1fr); grid-template-areas: 'map main' 'map side'; }
    .withmap > .main-col { display: grid; grid-area: main; }
    .withmap > .side-col { grid-area: side; }
    .withmap > .map-col { grid-area: map; position: sticky; top: 12px; align-self: start; }
  }
  .main-col > :global(.panel + .panel), .side-col > .panel + .panel { margin-top: 0; }
  .track-panel { padding-bottom: 8px; min-width: 0; }
  .track-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .rn { font-size: 1.8rem; font-weight: 700; color: var(--amber); line-height: 1; }
  .counts { font-size: .88rem; color: var(--muted); }
  .counts .ally { color: var(--text); }
  .counts .enemy { color: var(--fault); }
  .track { list-style: none; margin: 10px -4px 0; padding: 4px 0 2px; display: flex; gap: 2px; overflow-x: auto; scrollbar-width: thin; }
  .track li.sep { display: flex; align-items: stretch; padding: 6px 4px 22px; }
  .sepline { width: 0; border-left: 2px dashed var(--line); }
  .tk { display: grid; justify-items: center; gap: 2px; background: none; border: 0; padding: 4px 2px; border-radius: 8px; }
  .tk:hover { background: var(--hull-2); }
  .ti { font-size: .78rem; font-weight: 700; color: var(--muted); }
  .flags { min-height: 16px; font-size: .75rem; display: flex; gap: 2px; }
  .flags i { font-style: normal; }
  .flags .epf { color: var(--coolant); font-size: .7rem; }
  .flags .epf.zero { color: var(--fault); }
  .en li { display: grid; gap: 4px; padding: 8px 0; }
  .enrow { display: flex; align-items: center; gap: 8px; }
  .enm { flex: 1; font-family: var(--display); font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .enm.enemy { color: var(--fault); }
  .env { font-weight: 700; color: var(--coolant); font-size: 1.1rem; }
  .env small { color: var(--muted); font-size: .75rem; }
  .env.zero { color: var(--fault); }
  .bar { height: 5px; border-radius: 3px; background: var(--abyss); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--coolant); }
  .sleep { font-size: .78rem; color: var(--fault); }
  .ws { font-size: .78rem; color: var(--muted); }
  .over { box-shadow: inset 0 0 0 1px var(--line), inset 0 3px 0 var(--amber); }
  .over h2 { font-size: 1.2rem; }
  .over p { margin: 4px 0 10px; }
  .acts, .foot { display: flex; flex-wrap: wrap; gap: 8px; }
  .pool-row { display: flex; align-items: center; justify-content: space-between; }
  .pv { font-size: 2.2rem; font-weight: 700; color: var(--coolant); }
  .lh { width: 100%; background: none; border: 0; padding: 0; text-align: left; color: inherit; }
  .entries { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: .86rem; max-height: 360px; overflow: auto; }
  .entries li { display: flex; gap: 8px; }
  .lr { color: var(--muted); flex: none; min-width: 2.2em; }
</style>
