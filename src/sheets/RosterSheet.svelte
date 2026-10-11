<script>
  // « Gérer l'équipe »: the player robots. The GM's NPCs live in the MJ space.
  import Sheet from '../components/Sheet.svelte';
  import Icon from '../components/Icon.svelte';
  import RobotList from '../components/RobotList.svelte';
  import ResetAllButton from '../components/ResetAllButton.svelte';
  import { store, blankCharacter } from '../lib/store.svelte.js';

  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  function pick(id) { store.close(); store.openFiche(id); }
  function newPc() { store.close(); store.openFiche(store.addChar(blankCharacter('pc'), { label: 'Nouveau robot créé' }), 'robot'); }
</script>

<Sheet title="Gérer l'équipe" subtitle={pcs.length ? 'Touchez un robot pour ouvrir sa fiche' : ''}>
  <RobotList list={pcs} onpick={pick} empty="Aucun robot joueur pour l'instant." />
  <div class="reset-row"><ResetAllButton small /></div>
  {#snippet footer()}
    <button class="btn primary" onclick={newPc}><Icon name="plus" size={18} />Nouveau robot</button>
  {/snippet}
</Sheet>

<style>
  .reset-row { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
