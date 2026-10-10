<script>
  // Duplicate an NPC: n identical copies (same stats, no damage), numbered,
  // sharing one initiative group; in combat they join on the same side.
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { store, addCopies } from '../lib/store.svelte.js';

  let { cid: cidProp } = $props();
  const cid = cidProp; // captured: props vanish once the sheet closes
  const c = $derived(store.char(cid));
  const inCombat = $derived(store.combat.combatants.some((x) => x.cid === cid));
  let qty = $state(1);
  const base = $derived((c?.name || 'PNJ').replace(/\s+\d+$/, '').trim() || 'PNJ');

  function go() {
    const n = qty;
    store.close();
    store.commitAll(`${n} copie${n > 1 ? 's' : ''} de ${base} ${inCombat ? 'en combat' : 'créée' + (n > 1 ? 's' : '')}`, (d) => {
      const src = d.chars.find((y) => y.id === cid);
      const made = addCopies(d, src, n);
      if (inCombat) store.log(`${made.length} copie${made.length > 1 ? 's' : ''} de ${base} rejoignent le combat`);
    });
  }
</script>

{#if c}
<Sheet title="Dupliquer {c.name || 'le PNJ'}" subtitle="Copies identiques, sans dégâts">
  <div class="row"><span>Nombre de copies</span><Stepper value={qty} min={1} max={20} label="nombre de copies" onchange={(v) => (qty = v)} /></div>
  <p class="hint">Elles seront nommées « {base} 2 », « {base} 3 »… et formeront un groupe qui partage un seul jet d'initiative.{inCombat ? ' Elles rejoignent le combat dans le même camp.' : ''}</p>
  {#snippet footer()}
    <button class="btn ghost" onclick={() => store.close()}>Annuler</button>
    <button class="btn primary" style="margin-left:auto" onclick={go}><Icon name="copy" size={18} />Ajouter {qty} copie{qty > 1 ? 's' : ''}</button>
  {/snippet}
</Sheet>
{/if}

<style>
  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; }
</style>
