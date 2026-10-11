<script>
  // The spaces, in the order of play. « MJ » only appears in GM mode.
  import Icon from './Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  const all = [
    { id: 'equipe', label: 'Équipe', icon: 'robot' },
    { id: 'energie', label: 'Énergie', icon: 'energie' },
    { id: 'marche', label: 'Marché', icon: 'marche' },
    { id: 'combat', label: 'Combat', icon: 'combat' },
    { id: 'seance', label: 'Séance', icon: 'seance' },
    { id: 'mj', label: 'MJ', icon: 'mj' }
  ];
  const spaces = $derived(all.filter((s) => s.id !== 'mj' || store.ui.gm));
  function pick(id) {
    // Tapping MJ again goes back to the NPC list.
    if (id === 'mj' && store.space === 'mj') store.ui.npc = null;
    store.go(id);
  }
</script>

<nav id="app-nav" aria-label="Espaces du compagnon" style="--n:{spaces.length}">
  {#each spaces as s (s.id)}
    <button class:fight={s.id === 'combat' && store.combat.active} class:gm={s.id === 'mj'} class:active={store.space === s.id} aria-current={store.space === s.id ? 'page' : undefined} onclick={() => pick(s.id)}>
      <Icon name={s.icon} size={22} />
      <span>{s.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed; z-index: 30; left: 0; right: 0; bottom: 0;
    display: grid; grid-template-columns: repeat(var(--n), 1fr);
    height: calc(var(--nav-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);
    background: var(--hull); border-top: 1px solid var(--line);
  }
  button { position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; background: none; border: 0; color: var(--muted); font-size: .7rem; padding: 0 1px; min-width: 0; }
  button.active { color: var(--text); }
  button.active::before { content: ''; position: absolute; top: -1px; left: 18%; right: 18%; height: 3px; background: var(--amber); }
  button.active :global(svg) { color: var(--amber); }
  button.fight::after { content: ''; position: absolute; top: 8px; left: calc(50% + 8px); width: 8px; height: 8px; border-radius: 50%; background: var(--fault); }
  /* The GM's space sits apart: a dashed edge, like a screen set up beside the table. */
  button.gm { border-left: 1px dashed var(--line); }
  @media (min-width: 960px) {
    nav { top: 0; bottom: 0; right: auto; width: 96px; height: auto; grid-template-columns: 1fr; grid-auto-rows: 76px; align-content: start; padding-top: 72px; border-top: 0; border-right: 1px solid var(--line); }
    button { font-size: .8rem; }
    button.active::before { top: 18%; bottom: 18%; left: -1px; right: auto; width: 3px; height: auto; }
    button.gm { border-left: 0; border-top: 1px dashed var(--line); }
  }
</style>
