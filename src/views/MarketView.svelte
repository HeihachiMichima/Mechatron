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

  let kind = $state('');
  let all = $state(false); // GM: the whole catalog, not only today's offer
  const listed = $derived(m.listings.filter((l) => (!kind || l.kind === kind) && (store.ui.gm ? all ? l.enabled : isAvailable(m, l) : isAvailable(m, l) && !l.hidden)));
  const today = $derived(m.listings.filter((l) => isAvailable(m, l) && (!l.hidden || store.ui.gm)).length);
  const kinds = $derived(KINDS.filter((k) => m.listings.some((l) => l.kind === k.id && (store.ui.gm && all ? l.enabled : isAvailable(m, l)))));

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

    {#if kinds.length > 1}
      <div class="chips kinds wide">
        <button class="chip" aria-pressed={!kind} onclick={() => (kind = '')}>Tout</button>
        {#each kinds as k (k.id)}<button class="chip" aria-pressed={kind === k.id} onclick={() => (kind = k.id)}>{k.label}</button>{/each}
      </div>
    {/if}

    <section class="panel wide offer">
      {#if !listed.length}<p class="muted">Rien en vente aujourd'hui{kind ? ' dans cette catégorie' : ''}.</p>{/if}
      <ul class="cards">
        {#each listed as l (l.id)}
          {@const why = buyBlock(m, l, buyer, ep)}
          {@const av = isAvailable(m, l)}
          {@const w = l.kind === 'weapon' ? findWeapon(l.ref) : null}
          <li class="card" class:out={!av}>
            <div class="top">
              <span class="kind">{KINDS.find((k) => k.id === l.kind)?.one}</span>
              <span class="rar">{rarityOf(m, l.rarity).label}{l.stock != null ? `, ${l.stock} en stock` : ''}{l.hidden ? ', caché' : ''}</span>
            </div>
            <b class="cn">{listingName(l)}</b>
            <p class="info">{listingInfo(l)}</p>
            {#if w && buyer}
              {@const mine = myWeapons(buyer, w)}
              <p class="cmp">{mine.length ? `${buyer.name || 'Votre robot'} a : ${mine.map((x) => `${x.name} (${wline(x)})`).join(' ; ')}` : `${buyer.name || 'Votre robot'} n'a pas d'arme de ce type.`}</p>
            {/if}
            {#if l.kind === 'module' && buyer}<p class="cmp">Emplacements : {buyer.modules.filter(Boolean).length} sur {slots} pris.</p>{/if}
            {#if l.kind === 'part'}<p class="cmp">La pièce arrive dans l'équipement ; montez-la dans l'onglet Identité (quelques heures, robot intact).</p>{/if}
            <div class="buy">
              <b class="price num">{l.price == null ? 'prix à fixer' : `${l.price} PE`}</b>
              <button class="btn small primary" disabled={!!why} onclick={() => purchase(l)}>Acheter</button>
            </div>
            {#if why && av}<small class="why">{why}</small>{/if}
            {#if store.ui.gm}
              <label class="force"><span>Aujourd'hui</span>
                <select class="input" value={l.force ?? ''} onchange={(e) => force(l, e.currentTarget.value)} aria-label="Disponibilité de {listingName(l)}">
                  <option value="">Selon le tirage ({m.draw.ids.includes(l.id) ? 'présent' : 'absent'})</option>
                  <option value="in">Forcer en vente</option>
                  <option value="out">Retirer de la vente</option>
                </select>
              </label>
            {/if}
          </li>
        {/each}
      </ul>
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
              {#if it.price == null}<span class="muted small">non repris</span>
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
  .cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  @media (min-width: 720px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 1300px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .card { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .card.out { opacity: .6; border-style: dashed; }
  .card .top { margin: 0; display: flex; justify-content: space-between; gap: 8px; font-size: .75rem; color: var(--muted); }
  .kind { text-transform: none; }
  .cn { font-family: var(--display); font-weight: 600; font-size: 1.08rem; }
  .info, .cmp { margin: 0; font-size: .85rem; color: var(--muted); }
  .cmp { color: var(--text); font-size: .82rem; }
  .buy { margin-top: auto; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .price { font-size: 1.2rem; color: var(--coolant); }
  .buy .btn { min-height: 44px; min-width: 7em; }
  .why { color: var(--muted); font-size: .8rem; }
  .force { display: grid; gap: 2px; margin-top: 6px; font-size: .75rem; color: var(--muted); }
  .force .input { min-height: 40px; padding: 6px 8px; font-size: .85rem; }
  .sells li { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 52px; }
  .sn { display: grid; min-width: 0; }
  .sn b { font-family: var(--display); font-weight: 600; }
  .sn small, .small { font-size: .8rem; color: var(--muted); }
  @media (min-width: 1100px) { .grid { grid-template-columns: minmax(0, 1fr); } }
</style>
