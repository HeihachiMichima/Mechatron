<script>
  import Sheet from '../components/Sheet.svelte';
  import { store } from '../lib/store.svelte.js';
  import { getRules } from '../lib/settings.js';
  let { cid: cidProp } = $props();
  const cid = cidProp ?? store.c?.id; // captured: props vanish once the sheet closes
  const c = $derived(store.char(cid));
  const questions = getRules().xpQuestions;
  let checked = $state(questions.map((_, i) => i === 0));
  const n = $derived(checked.filter(Boolean).length);
  function award() {
    const k = n;
    store.close();
    store.commitOn(cid, `${c?.name || 'Robot'} : +${k} PX pour la séance`, (s) => (s.xp.current += k));
  }
</script>

{#if c}
<Sheet title="Fin de séance : {c.name || 'Sans nom'}" subtitle="1 PX par réponse « oui ». Le MJ a le dernier mot.">
  <ul class="list">
    {#each questions as q, i (i)}
      <li><label><input type="checkbox" bind:checked={checked[i]} /><span>{q}</span></label></li>
    {/each}
  </ul>
  <p class="hint">Après la séance, vous pouvez changer le PNJ à protéger, celui que vous détestez et votre grand rêve (fiche, Identité).</p>
  <button class="btn primary block go" onclick={award} disabled={n === 0}>Ajouter {n} PX</button>
</Sheet>
{/if}

<style>
  label { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; cursor: pointer; }
  input { width: 22px; height: 22px; flex: none; margin-top: 1px; accent-color: var(--amber); }
  .go { margin-top: 12px; min-height: 52px; }
</style>
