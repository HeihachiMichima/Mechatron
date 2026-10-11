<script>
  // Marché space: the black market. Closed during the team's creation and when
  // the GM closes it; otherwise the catalog the GM set up (T09). Buying and
  // selling come with T10.
  import Icon from '../components/Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { KINDS, listingName, listingInfo, rarityOf } from '../lib/market.js';

  const m = $derived(store.campaign.market);
  const creating = $derived(store.campaign.phase === 'creation');
  const open = $derived(!creating && m.open);
  const visible = $derived(m.listings.filter((l) => l.enabled && (!l.hidden || store.ui.gm)));
</script>

{#if !open}
  <section class="panel closed">
    <Icon name="marche" size={40} />
    <h2>Le marché noir est fermé</h2>
    <p>{creating ? "Le marché noir ouvre une fois l'équipe créée." : 'Le MJ a fermé le marché noir pour le moment.'}</p>
  </section>
{:else}
  <div class="grid">
    {#each KINDS as k (k.id)}
      {@const list = visible.filter((l) => l.kind === k.id)}
      {#if list.length}
        <section class="panel">
          <div class="panel-head"><h2>{k.label}</h2><span class="meta">{list.length}</span></div>
          <ul class="list">
            {#each list as l (l.id)}
              <li>
                <div class="it"><b>{listingName(l)}</b>{#if l.hidden}<em class="tag">caché</em>{/if}<small>{listingInfo(l)}</small></div>
                <div class="px"><b class="num">{l.price == null ? '—' : `${l.price} PE`}</b><small>{rarityOf(m, l.rarity).label}{l.stock != null ? `, ${l.stock} en stock` : ''}</small></div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .closed { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 32px 18px; color: var(--muted); }
  .closed h2 { color: var(--text); margin: 4px 0 0; }
  .closed p { max-width: 46ch; margin: 0; }
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  @media (min-width: 1100px) { .grid { grid-template-columns: 1fr 1fr; align-items: start; } }
  li { display: flex; gap: 12px; align-items: center; padding: 10px 0; }
  .it { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; }
  .it b { font-family: var(--display); font-weight: 600; }
  .it small { flex-basis: 100%; font-size: .8rem; color: var(--muted); }
  .px { display: grid; justify-items: end; text-align: right; flex: none; }
  .px b { color: var(--coolant); }
  .px small { font-size: .78rem; color: var(--muted); }
  .tag { font-style: normal; font-size: .7rem; padding: 0 6px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
</style>
