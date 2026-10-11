<script>
  // Stats of a robot (or creature) in combat: attributes, armor and cover, energy,
  // combat programs, weapons, modules. Shown at the top of the actor's turn and
  // under every target picker (TurnFlow, LogicConflict). The header plate shows
  // the robot selected in the tabs, not the one acting.
  import Segments from '../../components/Segments.svelte';
  import { store, availableEp } from '../../lib/store.svelte.js';
  import { chassis, attrCurrent, armorCurrent, armorTotal, epMax, shownAttrs, attrLabels, programs, combatWeapons } from '../../lib/rules.js';
  import { isEnergyWeapon, weaponBlock } from '../../lib/energy.js';

  let { c } = $props();
  const ch = $derived(chassis(c));
  const attrs = $derived(shownAttrs(c, ch));
  const L = $derived(attrLabels(c));
  const pool = $derived(c.kind === 'npc' && store.combat.usePool);
  const showEp = $derived(c.body !== 'creature');
  const COMBAT = ['assaut', 'tir', 'deplacement', 'infiltration', 'scan', 'surcharge', 'force', 'interaction', 'contestation', 'reparation'];
  const progs = $derived(programs(c).filter((p) => p.rating > 0 && (p.special || p.custom != null || COMBAT.includes(p.key))));
  const weapons = $derived([...combatWeapons(c, 'melee').filter((w) => w.index >= 0), ...combatWeapons(c, 'ranged').filter((w) => w.index >= 0)]);
  const mods = $derived((c.modules || []).map((m, i) => ({ m, broken: (c.brokenModules || []).includes(i) })).filter((x) => x.m));
</script>

<div class="stats" aria-label="Caractéristiques de {c.name || 'ce robot'}">
  <div class="cells" style="--n:{attrs.length + 1 + (showEp ? 1 : 0)}">
    {#each attrs as a (a)}
      {@const cur = attrCurrent(c, ch, a)}
      {@const max = ch.attrMax[a]}
      <div class="cell" class:hurt={cur < max} class:down={max > 0 && cur === 0} title={L[a].label}>
        <span class="lbl">{L[a].short}</span>
        <span class="val num">{cur}<small>/{max}</small></span>
        <Segments {max} current={cur} size="sm" />
      </div>
    {/each}
    <div class="cell" title="Armure{c.cover ? ' et couverture' : ''}">
      <span class="lbl">Arm</span>
      <span class="val num">{armorCurrent(c, ch)}{#if c.cover}<small>+{c.cover}</small>{/if}</span>
      <Segments max={armorTotal(c, ch)} current={armorCurrent(c, ch)} size="sm" tone="steel" />
    </div>
    {#if showEp}
      <div class="cell ep" title={pool ? 'Réserve du MJ' : 'Énergie'}>
        <span class="lbl">{pool ? 'PE (MJ)' : 'PE'}</span>
        <span class="val num">{availableEp(store.data, c)}{#if !pool}<small>/{epMax(c)}</small>{/if}</span>
        {#if !pool}<Segments max={epMax(c)} current={c.ep.current} size="sm" tone="coolant" />{/if}
      </div>
    {/if}
  </div>
  {#if progs.length || weapons.length || mods.length}
    <ul class="lines">
      {#if progs.length}<li><span class="k">Programmes</span><span>{#each progs as p, i (p.id)}{i ? ', ' : ''}{p.label}&nbsp;<b class="num">{p.rating}</b>{/each}</span></li>{/if}
      {#if weapons.length}<li><span class="k">Armes</span><span>{#each weapons as w, i (w.index)}{i ? ', ' : ''}<span class:blocked={!!weaponBlock(c, w, availableEp(store.data, c))}>{w.name}{w.bonus !== '' && w.bonus != null ? ` +${w.bonus}` : ''}, dég.&nbsp;{w.degats}{isEnergyWeapon(w) && weaponBlock(c, w, availableEp(store.data, c)) ? ` (${weaponBlock(c, w, availableEp(store.data, c))})` : ''}</span>{/each}</span></li>{/if}
      {#if mods.length}<li><span class="k">Modules</span><span>{#each mods as x, i (i)}{i ? ', ' : ''}<span class:broken={x.broken}>{x.m}</span>{/each}</span></li>{/if}
    </ul>
  {/if}
</div>

<style>
  .stats { display: grid; gap: 8px; padding: 10px 12px; background: var(--abyss); border-radius: 4px; }
  .cells { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 8px; max-width: 980px; }
  .cell { display: grid; gap: 3px; align-content: start; min-width: 0; }
  .lbl { font-size: .72rem; color: var(--muted); line-height: 1; }
  .val { font-size: 1.2rem; font-weight: 700; line-height: 1.05; white-space: nowrap; }
  .val small { font-size: .7em; font-weight: 500; color: var(--muted); margin-left: 1px; }
  .hurt .val { color: var(--fault); }
  .down .lbl { color: var(--fault); }
  .ep .val { color: var(--coolant); }
  .lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; font-size: .86rem; }
  .lines li { display: flex; gap: 8px; align-items: baseline; }
  .k { flex: none; min-width: 6.5em; color: var(--muted); font-size: .8rem; }
  .lines b { color: var(--amber); }
  .broken { text-decoration: line-through; color: var(--fault); }
  .blocked { color: var(--fault); }
</style>
