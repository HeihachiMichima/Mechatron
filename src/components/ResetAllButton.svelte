<script>
  // "Tout remettre à neuf": every robot (or only the team, or only the NPCs) back
  // to full state, after a confirming second tap. Undoable from the toast like any other change.
  import Icon from './Icon.svelte';
  import { store, restoreAll } from '../lib/store.svelte.js';

  // kind: 'pc' (the team) | 'npc' (the GM's NPCs) | undefined (every robot).
  let { small = false, ghost = true, kind } = $props();
  const what = $derived(kind === 'pc' ? "Remettre l'équipe à neuf" : kind === 'npc' ? 'Remettre les PNJ à neuf' : 'Tout remettre à neuf');
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

<button class="btn" class:small class:ghost={ghost && !armed} class:armed onclick={tap} title="Dégâts, armure, modules, PE et armes : tout revient au maximum">
  <Icon name="undo" size={small ? 16 : 18} />{armed ? `Confirmer : ${what.charAt(0).toLowerCase()}${what.slice(1)}` : what}
</button>

<style>
  .armed { border-color: var(--amber); color: var(--amber); }
</style>
