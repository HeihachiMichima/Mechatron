<script>
  import Icon from './Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  const tabs = [
    { id: 'etat', label: 'État' },
    { id: 'combat', label: 'Combat' },
    { id: 'programmes', label: 'Programmes' },
    { id: 'materiel', label: 'Matériel' },
    { id: 'robot', label: 'Robot' },
    { id: 'collectif', label: 'Collectif' }
  ];
  const pick = (id) => { store.ui.tab = id; window.scrollTo({ top: 0 }); };
</script>

<nav id="app-nav" aria-label="Sections du compagnon">
  {#each tabs as t (t.id)}
    <button class:fight={t.id === 'combat' && store.combat.active} class:active={store.ui.tab === t.id} aria-current={store.ui.tab === t.id ? 'page' : undefined} onclick={() => pick(t.id)}>
      <Icon name={t.id} size={22} />
      <span>{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed; z-index: 30; left: 0; right: 0; bottom: 0;
    display: grid; grid-template-columns: repeat(6, 1fr);
    height: calc(var(--nav-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);
    background: var(--hull); border-top: 1px solid var(--line);
  }
  button { position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; background: none; border: 0; color: var(--muted); font-size: .68rem; padding: 0 1px; }
  button.active { color: var(--text); }
  button.active::before { content: ''; position: absolute; top: -1px; left: 18%; right: 18%; height: 3px; background: var(--amber); }
  button.active :global(svg) { color: var(--amber); }
  button.fight::after { content: ''; position: absolute; top: 8px; left: calc(50% + 8px); width: 8px; height: 8px; border-radius: 50%; background: var(--fault); }
  @media (min-width: 960px) {
    nav { top: 0; bottom: 0; right: auto; width: 96px; height: auto; grid-template-columns: 1fr; grid-auto-rows: 76px; align-content: start; padding-top: 72px; border-top: 0; border-right: 1px solid var(--line); }
    button { font-size: .8rem; }
    button.active::before { top: 18%; bottom: 18%; left: -1px; right: auto; width: 3px; height: auto; }
  }
</style>
