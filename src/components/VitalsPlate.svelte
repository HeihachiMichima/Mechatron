<script>
  import Segments from './Segments.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { chassis, attrCurrent, epMax, armorCurrent, armorTotal, shownAttrs, attrLabels } from '../lib/rules.js';

  const c = $derived(store.c);
  const ch = $derived(chassis(c));
  const maxEp = $derived(epMax(c));
  const attrs = $derived(shownAttrs(c, ch));
  const L = $derived(attrLabels(c));
  const pool = $derived(c.kind === 'npc' && store.combat.usePool);
  const showEp = $derived(c.body !== 'creature');
  const go = () => { store.ui.tab = 'etat'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
</script>

<div class="plate" role="region" aria-label="État du robot" style="--n:{attrs.length}">
  {#each attrs as a (a)}
    {@const cur = attrCurrent(c, ch, a)}
    {@const max = ch.attrMax[a]}
    <button class="cell" class:hurt={cur < max} class:down={max > 0 && cur === 0} onclick={go}
      aria-label="{L[a].label} {cur} sur {max}">
      <span class="lbl">{L[a].short}</span>
      <span class="val num">{cur}<small>/{max}</small></span>
      <Segments {max} current={cur} size="sm" />
    </button>
  {/each}
  <span class="sep" aria-hidden="true"></span>
  {#if showEp && pool}
    <button class="cell ep" onclick={() => (store.ui.tab = 'combat')} aria-label="Réserve du MJ {store.combat.gmPool} PE">
      <span class="lbl">PE MJ</span>
      <span class="val num">{store.combat.gmPool}</span>
    </button>
  {:else if showEp}
    <button class="cell ep" onclick={go} aria-label="Énergie {c.ep.current} sur {maxEp} PE">
      <span class="lbl">PE</span>
      <span class="val num">{c.ep.current}<small>/{maxEp}</small></span>
      <Segments max={maxEp} current={c.ep.current} size="sm" tone="coolant" />
    </button>
  {:else}<span></span>{/if}
  <button class="cell arm" onclick={go} aria-label="Armure {armorCurrent(c, ch)} sur {armorTotal(c, ch)}">
    <span class="lbl">Arm</span>
    <span class="val num">{armorCurrent(c, ch)}{#if c.cover}<small>+{c.cover}</small>{/if}</span>
    <Segments max={armorTotal(c, ch)} current={armorCurrent(c, ch)} size="sm" tone="steel" />
  </button>
</div>

<style>
  .plate {
    display: grid; grid-template-columns: repeat(var(--n), 1fr) 1px 1.15fr 1fr; gap: 6px;
    padding: 8px 12px 10px; background: var(--hull);
    border-top: 2px solid var(--pc, var(--line));
    border-bottom: 1px solid var(--line);
  }
  .sep { background: var(--line); margin: 4px 0; }
  .cell { display: grid; gap: 3px; align-content: start; text-align: left; background: none; border: 0; padding: 2px 0; min-width: 0; }
  .lbl { font-size: .72rem; color: var(--muted); line-height: 1; }
  .val { font-size: 1.35rem; font-weight: 700; line-height: 1.05; white-space: nowrap; }
  .val small { font-size: .7em; font-weight: 500; color: var(--muted); margin-left: 1px; }
  .hurt .val { color: var(--fault); }
  .down .lbl { color: var(--fault); }
  .ep .val { color: var(--coolant); }
  @media (min-width: 720px) {
    .plate { gap: 14px; padding: 10px 20px 12px; }
    .lbl { font-size: .8rem; }
    .val { font-size: 1.6rem; }
  }
</style>
