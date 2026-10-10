<script>
  import Icon from './Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  let { title, subtitle = '', children, footer = null, wide = false } = $props();
  let dialog;
  $effect(() => {
    const prev = document.activeElement;
    dialog?.focus();
    const onKey = (e) => { if (e.key === 'Escape') store.close(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  });
</script>

<div class="backdrop" onclick={() => store.close()} role="presentation"></div>
<div class="sheet" class:wide role="dialog" aria-modal="true" aria-label={title} tabindex="-1" bind:this={dialog}>
  <div class="grab" aria-hidden="true"></div>
  <header>
    <div>
      <h2>{title}</h2>
      {#if subtitle}<p class="muted">{subtitle}</p>{/if}
    </div>
    <button class="icon-btn" aria-label="Fermer" onclick={() => store.close()}><Icon name="close" /></button>
  </header>
  <div class="body">{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(4 14 16 / .6); z-index: 40; animation: fade .18s ease-out; }
  .sheet {
    position: fixed; z-index: 41; left: 0; right: 0; bottom: 0; max-height: 92dvh;
    display: flex; flex-direction: column; background: var(--hull);
    border-top: 2px solid var(--amber); box-shadow: var(--shadow);
    clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%, 0 16px);
    animation: rise .22s cubic-bezier(.2,.8,.2,1);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .sheet:focus { outline: none; }
  .grab { width: 40px; height: 4px; border-radius: 2px; background: var(--line); margin: 8px auto 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 6px 8px 8px 18px; }
  header h2 { font-size: 1.25rem; padding-top: 8px; }
  header p { margin: 2px 0 0; font-size: .9rem; }
  .body { overflow-y: auto; padding: 4px 18px 18px; overscroll-behavior: contain; }
  footer { padding: 12px 18px 14px; border-top: 1px solid var(--line); display: flex; gap: 8px; }
  @media (min-width: 720px) {
    .sheet { left: 50%; right: auto; bottom: auto; top: 50%; width: min(560px, 92vw); transform: translate(-50%, -50%); max-height: 86vh; border-top-width: 2px; clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); animation: fade .18s ease-out; }
    .sheet.wide { width: min(760px, 94vw); }
    .grab { display: none; }
  }
  @keyframes rise { from { transform: translateY(40%); opacity: .4; } }
  @keyframes fade { from { opacity: 0; } }
</style>
