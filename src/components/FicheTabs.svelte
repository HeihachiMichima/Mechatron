<script>
  // The four parts of a robot's fiche, under its vitals plate (Équipe, and MJ for NPCs).
  import { store } from '../lib/store.svelte.js';
  const tabs = [
    { id: 'etat', label: 'État' },
    { id: 'programmes', label: 'Programmes' },
    { id: 'materiel', label: 'Matériel' },
    { id: 'robot', label: 'Identité' }
  ];
  function pick(id) { store.ui.tab = id; window.scrollTo({ top: 0 }); }
</script>

<div class="seg" role="tablist" aria-label="Parties de la fiche">
  {#each tabs as t (t.id)}
    <button role="tab" aria-selected={store.ui.tab === t.id} class:on={store.ui.tab === t.id} onclick={() => pick(t.id)}>{t.label}</button>
  {/each}
</div>

<style>
  .seg { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--hull); border-bottom: 1px solid var(--line); padding: 0 6px; }
  button {
    position: relative; min-height: 44px; min-width: 0; padding: 0 2px; background: none; border: 0;
    color: var(--muted); font-family: var(--display); font-weight: 600; font-size: .92rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  button:hover { color: var(--text); }
  button.on { color: var(--text); }
  button.on::after { content: ''; position: absolute; left: 14%; right: 14%; bottom: 0; height: 3px; background: var(--pc, var(--amber)); border-radius: 2px 2px 0 0; }
  @media (max-width: 360px) { button { font-size: .84rem; } }
  @media (min-width: 720px) { .seg { padding: 0 14px; grid-template-columns: repeat(4, minmax(0, 160px)); } button { font-size: 1rem; } }
</style>
