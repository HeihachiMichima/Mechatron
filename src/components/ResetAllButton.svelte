<script>
  // « Reset » (was « Tout remettre à neuf »): every robot (or only the team, or only the NPCs) back
  // to full state, after a confirming second tap. Undoable from the toast like any other change.
  import Icon from './Icon.svelte';
  import { store, restoreAll } from '../lib/store.svelte.js';

  // kind: 'pc' (the team) | 'npc' (the GM's NPCs) | undefined (every robot).
  let { small = false, ghost = true, kind } = $props();
  const what = $derived(kind === 'pc' ? "Reset de l'équipe" : kind === 'npc' ? 'Reset des PNJ' : 'Reset');
  let armed = $state(false);
  let timer;
  function tap() {
    if (!armed) { armed = true; clearTimeout(timer); timer = setTimeout(() => (armed = false), 4000); return; }
    clearTimeout(timer);
    armed = false;
    const n = store.chars.filter((c) => !kind || (c.kind === 'npc') === (kind === 'npc')).length;
    store.commitAll(`${n} ${kind === 'npc' ? 'PNJ' : `robot${n > 1 ? 's' : ''}`} remis à neuf`, (d) => {
      restoreAll(d, kind);
      if (d.combat.phase === 'fight' || d.combat.active) store.log(kind === 'pc' ? "L'équipe est remise à neuf" : kind === 'npc' ? 'Les PNJ sont remis à neuf' : 'Tous les robots sont remis à neuf');
    });
  }
</script>

<button class="btn" class:small class:ghost={ghost && !armed} class:armed onclick={tap} title="Remettre à neuf : dégâts, armure, modules, PE et armes reviennent au maximum">
  <Icon name="undo" size={small ? 16 : 18} />{armed ? `Confirmer : ${kind ? what.charAt(0).toLowerCase() + what.slice(1) : 'tout remettre à neuf'}` : what}
</button>

<style>
  .armed { border-color: var(--amber); color: var(--amber); }
</style>
