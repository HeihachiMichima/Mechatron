<script>
  // The automatic backups (newest first), each with a « Restaurer » button.
  // Used by the welcome screen and the campaign menu.
  import { store } from '../lib/store.svelte.js';
  import { backupDate, backupLabel } from '../lib/campaign.js';
  let { onrestore = () => {} } = $props();
  const list = store.backups();
  function restore(n) { if (store.restoreBackup(n)) onrestore(); }
</script>

{#if list.length}
  <ul class="list backups">
    {#each list as b (b.n)}
      <li>
        <div class="what"><b class="num">{backupDate(b.at)}</b><span>{backupLabel(b)}</span></div>
        <button class="btn small" onclick={() => restore(b.n)}>Restaurer</button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="hint">Aucune sauvegarde automatique pour l'instant. Une copie est faite à chaque ouverture si la campagne a changé, et avant de la remplacer.</p>
{/if}

<style>
  .backups li { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
  .what { flex: 1; min-width: 0; display: grid; }
  .what b { font-weight: 600; }
  .what span { font-size: .85rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
