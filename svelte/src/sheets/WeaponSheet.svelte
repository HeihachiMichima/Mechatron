<script>
  import Sheet from '../components/Sheet.svelte';
  import { store } from '../lib/store.svelte.js';
  import { findWeapon } from '../lib/rules.js';
  let { index: indexProp } = $props();
  const index = indexProp; // captured: props vanish once the sheet closes
  const w = $derived(store.c.weapons[index]);
  const ranges = ['Bras', 'Proche', 'Courte', 'Longue', 'Lointaine'];
  const ref = $derived(w ? findWeapon(w.name) : null);
  function remove() { const n = w.name; store.close(); store.commit(`${n} retirée`, (s) => s.weapons.splice(index, 1)); }
  function reset() { store.commit(`${w.name} : valeurs du livre`, (s) => Object.assign(s.weapons[index], { bonus: ref.bonus ?? '', degats: ref.degats, portee: ref.portee })); }
</script>

{#if w}
<Sheet title="Modifier l'arme">
  <label class="field"><span>Nom</span><input class="input" bind:value={store.c.weapons[index].name} /></label>
  <div class="row">
    <label class="field"><span>Bonus</span><input class="input num" inputmode="numeric" bind:value={store.c.weapons[index].bonus} /></label>
    <label class="field"><span>Dégâts</span><input class="input num" inputmode="numeric" bind:value={store.c.weapons[index].degats} /></label>
  </div>
  <label class="field"><span>Portée</span>
    <select class="input" bind:value={store.c.weapons[index].portee}>
      {#each ranges as r (r)}<option value={r}>{r}</option>{/each}
      {#if w.portee && !ranges.includes(w.portee)}<option value={w.portee}>{w.portee}</option>{/if}
    </select>
  </label>
  {#if ref?.note}<p class="hint">{ref.note}</p>{/if}
  <div class="actions">
    {#if ref}<button class="btn small" onclick={reset}>Valeurs du livre</button>{/if}
    <button class="btn small danger" onclick={remove}>Retirer l'arme</button>
    <button class="btn small primary" onclick={() => store.close()}>Terminé</button>
  </div>
</Sheet>
{/if}

<style>
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .actions .primary { margin-left: auto; }
</style>
