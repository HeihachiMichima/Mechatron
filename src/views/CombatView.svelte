<script>
  // Combat tab: three stages — preparation, initiative, guided fight.
  import CombatPrep from './combat/CombatPrep.svelte';
  import CombatInit from './combat/CombatInit.svelte';
  import CombatFight from './combat/CombatFight.svelte';
  import { store } from '../lib/store.svelte.js';

  const cb = $derived(store.combat);
  const phase = $derived(cb.phase || 'prep');
  const go = (p) => { store.commitAll(null, (d) => (d.combat.phase = p)); window.scrollTo({ top: 0 }); };
  function start() {
    store.commitAll(cb.active ? null : 'Combat engagé', (d) => {
      if (!d.combat.active) {
        Object.assign(d.combat, { active: true, round: 1, turn: 0 });
        d.combat.combatants.forEach((x) => { x.acted = false; x.defending = false; });
        store.log('Le combat commence');
      }
      d.combat.phase = 'fight';
    });
    store.ui.turn = null;
    window.scrollTo({ top: 0 });
  }
  const stages = [['prep', 'Préparation'], ['init', 'Initiative'], ['fight', 'Combat']];
</script>

<nav class="stages" aria-label="Étapes du combat">
  {#each stages as [id, label], i (id)}
    <button class:on={phase === id} class:done={stages.findIndex((s) => s[0] === phase) > i} disabled={id === 'fight' && !cb.active} onclick={() => (id === 'fight' ? start() : go(id))} aria-current={phase === id ? 'step' : undefined}>
      <span class="n num">{i + 1}</span>{label}
    </button>
  {/each}
</nav>

<div class="stage">
  {#if phase === 'prep'}<CombatPrep onnext={() => go('init')} />
  {:else if phase === 'init'}<CombatInit onback={() => go('prep')} onstart={start} />
  {:else}<CombatFight onprep={() => go('prep')} />{/if}
</div>

<style>
  .stages { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 12px; }
  .stages button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; background: var(--hull); border: 0; border-bottom: 3px solid var(--line); color: var(--muted); font-family: var(--display); font-weight: 600; font-size: .95rem; }
  .stages button.done { border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); color: var(--text); }
  .stages button.on { border-color: var(--amber); color: var(--text); background: var(--hull-2); }
  .stages button:disabled { opacity: .5; cursor: default; }
  .n { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: var(--abyss); font-size: .8rem; }
  .on .n { background: var(--amber); color: var(--amber-ink); }
  .stage { display: grid; gap: 12px; }
  .stage > :global(.panel + .panel) { margin-top: 0; }
</style>
