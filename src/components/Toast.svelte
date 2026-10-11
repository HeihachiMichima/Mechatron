<script>
  import { store } from '../lib/store.svelte.js';
</script>

<div class="toast-zone" class:top={!!store.ui.sheet} aria-live="polite">
  {#if store.toast}
    {#key store.toast.id}
      <div class="toast">
        <span>{store.toast.text}</span>
        {#if store.toast.undoable}<button onclick={() => store.undo()}>Annuler</button>{/if}
      </div>
    {/key}
  {/if}
</div>

<style>
  .toast-zone { position: fixed; left: 0; right: 0; bottom: calc(var(--nav-h) + 12px + env(safe-area-inset-bottom)); display: flex; justify-content: center; pointer-events: none; z-index: 60; padding: 0 12px; }
  .toast-zone.top { bottom: auto; top: calc(12px + env(safe-area-inset-top)); z-index: 70; }
  .toast { pointer-events: auto; display: flex; align-items: center; gap: 14px; max-width: 520px; padding: 10px 10px 10px 16px; background: var(--text); color: var(--abyss); border-radius: 4px; box-shadow: var(--shadow); font-weight: 600; animation: pop .2s ease-out; }
  button { background: none; border: 0; color: var(--toast-accent); font-weight: 700; padding: 8px 10px; text-decoration: underline; text-underline-offset: 3px; }
  @media (min-width: 960px) { .toast-zone:not(.top) { bottom: 20px; } }
  @keyframes pop { from { transform: translateY(8px); opacity: 0; } }
</style>
