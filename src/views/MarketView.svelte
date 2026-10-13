<script>
  // Marché space: the black market (T09 catalog, T10 shop). Closed during the
  // team's creation and when the GM closes it. Today's offer is drawn once per
  // in-game day from the rarity odds (store.ensureDraw); the GM can redraw, see
  // the whole catalog and force an item in or out. A buyer (the active PC by
  // default) buys at the GM's price and sells back at the house rate. Every
  // purchase or sale is one undoable commit (lib/market.js buy / sell).
  import Icon from '../components/Icon.svelte';
  import { store, payEp, availableEp } from '../lib/store.svelte.js';
  import { epMax, weaponKind, findWeapon, chassis } from '../lib/rules.js';
  import { KINDS, listingName, listingInfo, rarityOf, isAvailable, buyBlock, buy, sell, sellables } from '../lib/market.js';

  const m = $derived(store.campaign.market);
  const creating = $derived(store.campaign.phase === 'creation');
  const open = $derived(!creating && m.open);
  $effect(() => { if (open) store.ensureDraw(); });

  // Buyers: the PCs, and the NPCs in GM mode. Default: the robot on the fiche, else the first PC.
  const buyers = $derived(store.chars.filter((c) => c.body !== 'creature' && (c.kind !== 'npc' || store.ui.gm)));
  let picked = $state(null);
  const buyer = $derived(buyers.find((c) => c.id === picked) ?? buyers.find((c) => c.id === store.ui.pc) ?? buyers.find((c) => c.kind !== 'npc') ?? buyers[0] ?? null);
  const ep = $derived(buyer ? availableEp(store.data, buyer) : 0);

  let all = $state(false); // GM: the whole catalog, not only today's offer
  const listed = $derived(m.listings.filter((l) => (store.ui.gm ? all ? l.enabled : isAvailable(m, l) : isAvailable(m, l) && !l.hidden)));
  const today = $derived(m.listings.filter((l) => isAvailable(m, l) && (!l.hidden || store.ui.gm)).length);
  // Compact list (T17): one collapsible group per kind, one line per item (name,
  // price, « Acheter »); tapping the name shows the details. Cheapest first.
  const byPrice = (a, b) => (a.price ?? 999) - (b.price ?? 999) || listingName(a).localeCompare(listingName(b), 'fr');
  const groups = $derived(KINDS.map((k) => {
    const items = listed.filter((l) => l.kind === k.id).sort(byPrice);
    const prices = items.map((l) => l.price).filter((p) => p != null);
    return { ...k, items, from: prices.length ? Math.min(...prices) : null };
  }).filter((g) => g.items.length));
  // Open groups (per visit): the first one unless the player chose otherwise.
  let opened = $state(null);
  const isOpen = (id) => (opened ? opened.includes(id) : groups[0]?.id === id);
  const toggle = (id) => { const cur = groups.filter((g) => isOpen(g.id)).map((g) => g.id); opened = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; };
  let shown = $state(null); // the item whose details are open

  const myWeapons = (c, w) => (c?.weapons || []).filter((x) => weaponKind(x) === weaponKind(w));
  const wline = (w) => `bonus ${w.bonus === '' || w.bonus == null ? '—' : w.bonus}, dégâts ${w.degats}, portée ${String(w.portee).toLowerCase()}`;

  function purchase(l) {
    const why = buyBlock(m, l, buyer, ep);
    if (why) { store.notify(why); return; }
    const id = buyer.id;
    store.commitAll(`${buyer.name || 'Robot'} achète ${listingName(l)} (${l.price} PE)`, (d) => buy(d, l.id, id, { pay: payEp, ep: availableEp }));
  }
  const goods = $derived(buyer ? sellables(m, buyer) : []);
  function resell(it) {
    const id = buyer.id;
    let why = null;
    const room = epMax(buyer) - buyer.ep.current;
    if (it.price == null || room < it.price) { store.notify(it.price == null ? 'Le marché noir ne reprend pas cet objet (pas de prix).' : `Trop de PE : ${buyer.name || 'ce robot'} ne peut en recevoir que ${room}.`); return; }
    store.commitAll(`${buyer.name || 'Robot'} vend ${it.name} (+${it.price} PE)`, (d) => (why = sell(d, id, it)));
    if (why) store.notify(why);
  }
  const force = (l, v) => store.commitAll(null, (d) => (d.campaign.market.listings.find((x) => x.id === l.id).force = v || null));
  const slots = $derived(buyer ? chassis(buyer).slots : 0);
</script>

{#if !open}
  <section class="panel closed">
    <Icon name="marche" size={40} />
    <h2>Le marché noir est fermé</h2>
    <p>{creating ? "Le marché noir ouvre une fois l'équipe créée." : 'Le MJ a fermé le marché noir pour le moment.'}</p>
  </section>
{:else}
  <div class="grid">
    <section class="panel head">
      <div class="panel-head">
        <h2>Aujourd'hui, jour {store.campaign.clock.day}</h2>
        <span class="meta">{today} objet{today > 1 ? 's' : ''} en vente</span>
      </div>
      <p class="hint top">Le marché noir des robots de rebut. Ce qui est proposé change chaque jour ; payez en PE.</p>
      {#if buyers.length}
        <span class="ol">Acheteur</span>
        <div class="buyers" role="radiogroup" aria-label="Acheteur">
          {#each buyers as c (c.id)}
            <button class="buyer" role="radio" aria-checked={buyer?.id === c.id} onclick={() => (picked = c.id)}>
              {#if c.kind !== 'npc'}<span class="cdot" style="background:{c.color}"></span>{:else}<em class="tag">PNJ</em>{/if}
              <span class="bn">{c.name || 'Sans nom'}</span>
              <b class="num">{availableEp(store.data, c)} PE</b>
            </button>
          {/each}
        </div>
      {:else}<p class="muted">Aucun robot pour acheter.</p>{/if}
      {#if store.ui.gm}
        <div class="gm">
          <button class="btn small" onclick={() => store.redraw()}><Icon name="dice" size={16} />Nouveau tirage</button>
          <label class="chk"><input type="checkbox" bind:checked={all} /><span>Tout le catalogue (MJ)</span></label>
        </div>
      {/if}
    </section>

    <section class="panel wide offer">
      {#if !listed.length}<p class="muted">Rien en vente aujourd'hui.</p>{/if}
      {#each groups as g (g.id)}
        <div class="grp">
          <button class="gh" aria-expanded={isOpen(g.id)} onclick={() => toggle(g.id)}>
            <Icon name="chevron" size={18} /><b>{g.label}</b><span class="gm-n num">{g.items.length}</span><span class="gp">{g.from != null ? `dès ${g.from} PE` : ''}</span>
          </button>
          {#if isOpen(g.id)}
            <ul class="items">
              {#each g.items as l (l.id)}
                {@const why = buyBlock(m, l, buyer, ep)}
                {@const av = isAvailable(m, l)}
                {@const w = l.kind === 'weapon' ? findWeapon(l.ref) : null}
                <li class="item" class:out={!av} class:blocked={!!why}>
                  <div class="line">
                    <button class="nm" aria-expanded={shown === l.id} onclick={() => (shown = shown === l.id ? null : l.id)}>
                      <b class="cn">{listingName(l)}</b>
                      <small class:why={!!why && av}>{why && av ? why : `${rarityOf(m, l.rarity).label}${l.stock != null ? `, ${l.stock} en stock` : ''}${l.hidden ? ', caché' : ''}${!av ? ', pas en vente aujourd\'hui' : ''}`}</small>
                    </button>
                    <b class="price num">{l.price == null ? 'à fixer' : `${l.price} PE`}</b>
                    <button class="btn small primary buybtn" disabled={!!why} onclick={() => purchase(l)}>Acheter</button>
                  </div>
                  {#if shown === l.id}
                    <div class="more">
                      <p class="info">{listingInfo(l)}</p>
                      {#if w && buyer}
                        {@const mine = myWeapons(buyer, w)}
                        <p class="cmp">{mine.length ? `${buyer.name || 'Votre robot'} a : ${mine.map((x) => `${x.name} (${wline(x)})`).join(' ; ')}` : `${buyer.name || 'Votre robot'} n'a pas d'arme de ce type.`}</p>
                      {/if}
                      {#if l.kind === 'module' && buyer}<p class="cmp">Emplacements : {buyer.modules.filter(Boolean).length} sur {slots} pris.</p>{/if}
                      {#if l.kind === 'part'}<p class="cmp">La pièce arrive dans l'équipement ; montez-la dans l'onglet Identité (quelques heures, robot intact).</p>{/if}
                      {#if store.ui.gm}
                        <label class="force"><span>Aujourd'hui</span>
                          <select class="input" value={l.force ?? ''} onchange={(e) => force(l, e.currentTarget.value)} aria-label="Disponibilité de {listingName(l)}">
                            <option value="">Selon le tirage ({m.draw.ids.includes(l.id) ? 'présent' : 'absent'})</option>
                            <option value="in">Forcer en vente</option>
                            <option value="out">Retirer de la vente</option>
                          </select>
                        </label>
                      {/if}
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </section>

    {#if buyer}
      <section class="panel wide">
        <div class="panel-head"><h2>Vendre</h2><span class="meta">{buyer.name || 'Sans nom'}, {buyer.ep.current}/{epMax(buyer)} PE</span></div>
        <p class="hint top">Le marché reprend à {Math.round(m.sellRate * 100)} % du prix, au moins 1 PE (règle maison). Pas au-delà du maximum de PE.</p>
        {#if !goods.length}<p class="muted">Rien à vendre.</p>{/if}
        <ul class="list sells">
          {#each goods as it (`${it.kind}:${it.index}`)}
            <li>
              <span class="sn"><b>{it.name}</b><small>{it.kind === 'module' ? 'module' : it.kind === 'weapon' ? 'arme' : 'équipement'}</small></span>
              {#if it.price == null}<span class="muted note">non repris</span>
              {:else}<button class="btn small" onclick={() => resell(it)}>Vendre <b class="num">+{it.price} PE</b></button>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}

<style>
  .closed { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 32px 18px; color: var(--muted); }
  .closed h2 { color: var(--text); margin: 4px 0 0; }
  .closed p { max-width: 46ch; margin: 0; }
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  .top { margin: -4px 0 10px; }
  .ol { display: block; font-size: .85rem; color: var(--muted); margin-bottom: 6px; }
  .buyers { display: flex; flex-wrap: wrap; gap: 6px; }
  .buyer { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; border-radius: 22px; border: 1px solid var(--line); background: var(--abyss); max-width: 100%; }
  .buyer[aria-checked='true'] { border-color: var(--amber); box-shadow: inset 0 0 0 1px var(--amber); }
  .bn { font-family: var(--display); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .buyer b { color: var(--coolant); font-size: .9rem; }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .tag { font-style: normal; font-size: .7rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .gm { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line); }
  .chk { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; cursor: pointer; font-size: .9rem; }
  .chk input { width: 20px; height: 20px; accent-color: var(--amber); }
  .offer { display: grid; gap: 0; }
  .grp + .grp { border-top: 1px solid var(--line); }
  .gh { width: 100%; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 2px; background: none; border: 0; text-align: left; }
  .gh > :global(svg) { flex: none; color: var(--muted); transition: rotate .15s; }
  .gh[aria-expanded='true'] > :global(svg) { rotate: 90deg; }
  .gh b { font-family: var(--display); font-weight: 600; font-size: 1.05rem; }
  .gm-n { font-size: .78rem; color: var(--muted); padding: 1px 7px; border: 1px solid var(--line); border-radius: 10px; }
  .gp { margin-left: auto; font-size: .85rem; color: var(--muted); }
  .items { list-style: none; margin: 0 0 10px; padding: 0; display: grid; }
  @media (min-width: 1100px) { .items { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; } }
  .item { border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent); }
  .line { display: flex; align-items: center; gap: 10px; min-height: 52px; }
  .nm { flex: 1; min-width: 0; display: grid; text-align: left; background: none; border: 0; padding: 4px 0; min-height: 44px; }
  .cn { font-family: var(--display); font-weight: 600; font-size: 1rem; }
  .nm small { font-size: .8rem; color: var(--muted); }
  .nm small.why { color: var(--text); }
  .item.out .cn { color: var(--muted); }
  .price { color: var(--coolant); font-size: 1.05rem; white-space: nowrap; }
  .buybtn { min-width: 6.5em; }
  .more { padding: 0 0 12px; display: grid; gap: 4px; }
  .info, .cmp { margin: 0; font-size: .85rem; color: var(--muted); }
  .cmp { color: var(--text); font-size: .82rem; }
  .force { display: grid; gap: 2px; margin-top: 6px; font-size: .75rem; color: var(--muted); max-width: 22rem; }
  .force .input { min-height: 44px; padding: 6px 8px; font-size: .85rem; }
  .sells li { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 52px; }
  .sn { display: grid; min-width: 0; }
  .sn b { font-family: var(--display); font-weight: 600; }
  .sn small, .note { font-size: .8rem; color: var(--muted); }
  @media (min-width: 1100px) { .grid { grid-template-columns: minmax(0, 1fr); } }
</style>
