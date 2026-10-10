<script>
  import Sheet from '../components/Sheet.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  let checked = $state(D.xpQuestions.map((_, i) => i === 0));
  const n = $derived(checked.filter(Boolean).length);
  function award() {
    const k = n;
    store.close();
    store.commit(`+${k} PX pour la séance`, (s) => (s.xp.current += k));
  }
</script>

<Sheet title="Fin de séance" subtitle="1 PX par réponse « oui ». Le MJ a le dernier mot.">
  <ul class="list">
    {#each D.xpQuestions as q, i (i)}
      <li><label><input type="checkbox" bind:checked={checked[i]} /><span>{q}</span></label></li>
    {/each}
  </ul>
  <p class="hint">Après la séance, vous pouvez changer le PNJ à protéger, celui que vous détestez et votre grand rêve (onglet Robot).</p>
  <button class="btn primary block go" onclick={award} disabled={n === 0}>Ajouter {n} PX</button>
</Sheet>

<style>
  label { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; cursor: pointer; }
  input { width: 22px; height: 22px; flex: none; margin-top: 1px; accent-color: var(--amber); }
  .go { margin-top: 12px; min-height: 52px; }
</style>
