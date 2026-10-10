<script>
  // Colored tabs to jump between player robots. The active robot's color
  // also edges the status plate below, so you always know whose sheet it is.
  import Icon from './Icon.svelte';
  import { store, blankCharacter } from '../lib/store.svelte.js';
  import { chassis, status, attrCurrent, ATTRS } from '../lib/rules.js';

  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  const npcs = $derived(store.chars.filter((c) => c.kind === 'npc'));
  const npcActive = $derived(store.c.kind === 'npc');
  let scroller;

  const state = (c) => {
    const ch = chassis(c);
    const st = status(c, ch);
    if (st.deactivated) return 'down';
    if (ATTRS.some((a) => attrCurrent(c, ch, a) < ch.attrMax[a])) return 'hurt';
    return '';
  };
  function go(id) { store.activate(id); }
  function add() { store.addChar(blankCharacter('pc'), { label: 'Nouveau PJ créé' }); store.ui.tab = 'robot'; }

  // keep the active tab visible
  $effect(() => {
    const id = store.data.activeId;
    queueMicrotask(() => scroller?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }));
  });
  function keys(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = pcs.findIndex((c) => c.id === store.c.id);
    const n = pcs[(i + (e.key === 'ArrowRight' ? 1 : -1) + pcs.length) % pcs.length];
    if (n) { go(n.id); scroller.querySelector(`[data-id="${n.id}"]`)?.focus(); }
  }
</script>

<nav class="pctabs" aria-label="Robots des joueurs">
  <div class="scroller" bind:this={scroller} role="tablist" tabindex="-1" onkeydown={keys}>
    {#if npcActive}
      <button class="tab npc active" data-id={store.c.id} role="tab" aria-selected="true" onclick={() => store.open({ type: 'roster' })}>
        <span class="tag">PNJ</span><span class="nm">{store.c.name || 'Sans nom'}</span>
      </button>
    {/if}
    {#each pcs as c (c.id)}
      {@const s = state(c)}
      <button class="tab" class:active={c.id === store.c.id} class:down={s === 'down'} data-id={c.id} role="tab"
        aria-selected={c.id === store.c.id} tabindex={c.id === store.c.id ? 0 : -1}
        style="--tc:{c.color || 'var(--muted)'}" onclick={() => go(c.id)}
        title="{c.name || 'Sans nom'}{s === 'hurt' ? ' (endommagé)' : s === 'down' ? ' (désactivé)' : ''}">
        <span class="dot" aria-hidden="true"></span>
        <span class="nm"><span class="short">{(c.name || 'Sans nom').split(' ')[0]}</span><span class="full">{c.name || 'Sans nom'}</span></span>
        {#if s === 'hurt'}<span class="hurt" aria-label="endommagé"></span>{/if}
      </button>
    {/each}
    <button class="tab add" aria-label="Nouveau robot joueur" title="Nouveau PJ" onclick={add}><Icon name="plus" size={18} /></button>
  </div>
  {#if npcs.length}
    <button class="npcs" onclick={() => store.open({ type: 'roster' })} title="PNJ du MJ">PNJ <b class="num">{npcs.length}</b></button>
  {/if}
</nav>

<style>
  .pctabs { display: flex; align-items: stretch; background: var(--hull); border-top: 1px solid var(--line); }
  .scroller { flex: 1; min-width: 0; display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; padding: 0 8px; }
  .scroller::-webkit-scrollbar { display: none; }
  .scroller { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); padding-right: 28px; }
  .full { display: none; }
  @media (min-width: 720px) { .short { display: none; } .full { display: inline; } }
  .tab {
    flex: none; scroll-snap-align: start; position: relative;
    display: inline-flex; align-items: center; gap: 7px; max-width: 46vw;
    min-height: 42px; padding: 0 12px 0 10px; background: transparent; border: 0; color: var(--muted);
    font-family: var(--display); font-weight: 600; font-size: .95rem;
  }
  .tab::after { content: ''; position: absolute; left: 6px; right: 6px; bottom: 0; height: 3px; background: var(--tc); opacity: .35; border-radius: 2px 2px 0 0; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); background: color-mix(in srgb, var(--tc) 16%, transparent); clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px); }
  .tab.active::after { opacity: 1; left: 0; right: 0; height: 3px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--tc); flex: none; }
  .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .tab.down .nm { text-decoration: line-through; opacity: .7; }
  .hurt { width: 7px; height: 7px; border-radius: 50%; background: var(--fault); flex: none; }
  .tab.npc { --tc: var(--muted); }
  .tag { font-family: var(--body); font-size: .7rem; font-weight: 600; padding: 1px 5px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .tab.add { padding: 0 12px; color: var(--muted); }
  .tab.add::after { display: none; }
  .npcs { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 0 12px; background: none; border: 0; border-left: 1px solid var(--line); color: var(--muted); font-size: .82rem; }
  .npcs b { color: var(--text); }
  @media (min-width: 720px) { .scroller { padding: 0 14px; } .tab { max-width: 240px; } }
</style>
