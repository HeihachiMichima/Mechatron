<script>
  // "Tout remettre à neuf": every robot back to full state, after a confirming
  // second tap. Undoable from the toast like any other change.
  import Icon from './Icon.svelte';
  import { store, restoreAll } from '../lib/store.svelte.js';

  let { small = false, ghost = true } = $props();
  let armed = $state(false);
  let timer;
  function tap() {
    if (!armed) { armed = true; clearTimeout(timer); timer = setTimeout(() => (armed = false), 4000); return; }
    clearTimeout(timer);
    armed = false;
    const n = store.chars.length;
    store.commitAll(`${n} robot${n > 1 ? 's' : ''} remis à neuf`, (d) => {
      restoreAll(d);
      if (d.combat.phase === 'fight' || d.combat.active) store.log('Tous les robots sont remis à neuf');
    });
  }
</script>

<button class="btn" class:small class:ghost={ghost && !armed} class:armed onclick={tap} title="Dégâts, armure, modules, PE et armes : tout revient au maximum">
  <Icon name="undo" size={small ? 16 : 18} />{armed ? 'Confirmer : tout remettre à neuf' : 'Tout remettre à neuf'}
</button>

<style>
  .armed { border-color: var(--amber); color: var(--amber); }
</style>
