<script>
  // MJ → Marché noir (T09): open or close the market, edit each item's price,
  // rarity, stock and visibility, add the GM's own items, reset the catalog,
  // export/import it, and the market's house rules (sell-back rate, rarity odds).
  // Every edit is one undoable commit on campaign.market (lib/market.js).
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { HOUSE } from '../../lib/house.js';
  import { downloadBlob, jsonBlob, slug } from '../../lib/exports.js';
  import { KINDS, listingName, listingInfo, priceSource, bookPrice, customListing, defaultListings, defaultRarities, marketFile, readMarketFile } from '../../lib/market.js';

  const m = $derived(store.campaign.market);
  let q = $state('');
  let kind = $state('');
  let rarity = $state('');
  let onlyOn = $state(false);
  let newName = $state('');
  let newPrice = $state('');
  let armed = $state(false);
  let fileInput;
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = $derived(m.listings.filter((l) => (!kind || l.kind === kind) && (!rarity || l.rarity === rarity) && (!onlyOn || l.enabled) && (!q || norm(listingName(l)).includes(norm(q)))));
  const toSet = $derived(m.listings.filter((l) => l.enabled && l.price == null).length);
  const SRC = { book: 'livre p.234', house: 'règle maison', none: 'prix à fixer' };

  const edit = (id, patch, label = null) => store.commitAll(label, (d) => Object.assign(d.campaign.market.listings.find((l) => l.id === id), patch));
  const num = (v) => (v === '' ? null : Math.max(0, Math.round(Number(v)) || 0));
  const setOpen = (open) => store.commitAll(open ? 'Marché noir ouvert' : 'Marché noir fermé', (d) => (d.campaign.market.open = open));
  function add(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const l = customListing(newName, num(newPrice));
    store.commitAll(`${l.custom} ajouté au marché`, (d) => d.campaign.market.listings.push(l));
    newName = ''; newPrice = '';
    kind = 'custom';
  }
  const remove = (l) => store.commitAll(`${listingName(l)} retiré du marché`, (d) => (d.campaign.market.listings = d.campaign.market.listings.filter((x) => x.id !== l.id)));
  function resetAll() {
    if (!armed) { armed = true; setTimeout(() => (armed = false), 3500); return; }
    armed = false;
    store.commitAll('Catalogue du marché réinitialisé', (d) => Object.assign(d.campaign.market, { listings: defaultListings(), rarities: defaultRarities(), sellRate: HOUSE.market.sellRate }));
  }
  const exportFile = () => { downloadBlob(jsonBlob(marketFile(m)), `marche-${slug({ name: store.campaign.name || 'campagne' })}.json`); store.notify('Catalogue exporté'); };
  async function importFile(e) {
    const f = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!f) return;
    let read = null;
    try { read = readMarketFile(JSON.parse(await f.text())); } catch {}
    if (!read) { store.notify("Ce fichier n'est pas un catalogue de marché."); return; }
    store.commitAll(`Catalogue importé : ${read.listings.length} objets`, (d) => Object.assign(d.campaign.market, { listings: read.listings, rarities: read.rarities, sellRate: read.sellRate }));
  }
  // House rules: rarity odds as « 1 sur N » (0 = only when the GM puts it in).
  const oneIn = (chance) => (chance > 0 ? Math.round(1 / chance) : 0);
  const setChance = (id, n) => store.commitAll(null, (d) => (d.campaign.market.rarities.find((r) => r.id === id).chance = n > 0 ? 1 / n : 0));
  const houseChance = (id) => HOUSE.market.rarities.find((r) => r.id === id)?.chance;
</script>

<section class="panel market">
  <div class="panel-head">
    <h2>Marché noir</h2>
    <label class="sw"><input type="checkbox" checked={m.open} onchange={(e) => setOpen(e.currentTarget.checked)} /><span>{m.open ? 'Ouvert' : 'Fermé'}</span></label>
  </div>
  <p class="hint top">{m.listings.length} objets au catalogue{toSet ? `, dont ${toSet} sans prix (invendables tant que vous n'en fixez pas)` : ''}. Les prix du livre (p.234) sont des « coûts typiques » : changez-les à volonté.</p>

  <div class="filters">
    <input class="input" type="search" bind:value={q} placeholder="Rechercher" aria-label="Rechercher un objet" />
    <select class="input" bind:value={rarity} aria-label="Rareté"><option value="">Toutes raretés</option>{#each m.rarities as r (r.id)}<option value={r.id}>{r.label}</option>{/each}</select>
    <label class="chk"><input type="checkbox" bind:checked={onlyOn} /><span>En vente seulement</span></label>
  </div>
  <div class="chips kinds">
    <button class="chip" aria-pressed={!kind} onclick={() => (kind = '')}>Tout</button>
    {#each KINDS as k (k.id)}<button class="chip" aria-pressed={kind === k.id} onclick={() => (kind = k.id)}>{k.label}</button>{/each}
  </div>

  <ul class="list rows">
    {#each shown as l (l.id)}
      {@const src = priceSource(l)}
      <li class:off={!l.enabled}>
        <div class="name">
          <b>{listingName(l)}</b>
          <span class="badge {src}">{SRC[src]}{src === 'house' && bookPrice(l) != null ? ` (livre : ${bookPrice(l)})` : ''}</span>
          {#if l.hidden}<span class="badge">caché</span>{/if}
          <small>{listingInfo(l)}</small>
        </div>
        <div class="ctl">
          <label><span>Prix</span><input class="input num" type="number" min="0" inputmode="numeric" value={l.price ?? ''} placeholder="?" onchange={(e) => edit(l.id, { price: num(e.currentTarget.value) })} aria-label="Prix de {listingName(l)} en PE" /></label>
          <label><span>Rareté</span><select class="input" value={l.rarity} onchange={(e) => edit(l.id, { rarity: e.currentTarget.value })} aria-label="Rareté de {listingName(l)}">{#each m.rarities as r (r.id)}<option value={r.id}>{r.label}</option>{/each}</select></label>
          <label><span>Stock</span><input class="input num" type="number" min="0" inputmode="numeric" value={l.stock ?? ''} placeholder="∞" onchange={(e) => edit(l.id, { stock: num(e.currentTarget.value) })} aria-label="Stock de {listingName(l)}" /></label>
          <label class="chk"><input type="checkbox" checked={l.enabled} onchange={(e) => edit(l.id, { enabled: e.currentTarget.checked })} /><span>En vente</span></label>
          <label class="chk"><input type="checkbox" checked={l.hidden} onchange={(e) => edit(l.id, { hidden: e.currentTarget.checked })} /><span>Caché</span></label>
          {#if l.kind === 'custom'}<button class="icon-btn" aria-label="Retirer {listingName(l)}" onclick={() => remove(l)}><Icon name="trash" /></button>{/if}
        </div>
      </li>
    {/each}
  </ul>
  {#if !shown.length}<p class="muted">Aucun objet ne correspond.</p>{/if}

  <form class="add" onsubmit={add}>
    <input class="input" bind:value={newName} placeholder="Nom de l'objet" aria-label="Nom de l'objet perso" maxlength="60" />
    <input class="input num price" type="number" min="0" bind:value={newPrice} placeholder="Prix" aria-label="Prix de l'objet perso" />
    <button class="btn" type="submit" disabled={!newName.trim()}><Icon name="plus" size={18} />Ajouter un objet perso</button>
  </form>

  <details class="house">
    <summary>Règles du marché <span class="badge house">règle maison</span></summary>
    <div class="hrow">
      <span>Revente <small>({Math.round(HOUSE.market.sellRate * 100)} % par défaut, au moins {HOUSE.market.sellMin} PE)</small></span>
      <Stepper value={Math.round(m.sellRate * 100)} min={0} max={100} step={10} label="Taux de revente en %" onchange={(v) => store.commitAll(`Revente : ${v} %`, (d) => (d.campaign.market.sellRate = v / 100))} size="sm" />
      <b class="num">{Math.round(m.sellRate * 100)} %</b>
    </div>
    {#each m.rarities as r (r.id)}
      <div class="hrow">
        <span>{r.label} <small>(chaque jour : {oneIn(r.chance) ? `1 chance sur ${oneIn(r.chance)}` : 'seulement si le MJ le met'} ; par défaut {oneIn(houseChance(r.id)) ? `1 sur ${oneIn(houseChance(r.id))}` : 'MJ'})</small></span>
        <Stepper value={oneIn(r.chance)} min={0} max={20} label="Chance de {r.label}, 1 sur" onchange={(v) => setChance(r.id, v)} size="sm" />
        <b class="num">{oneIn(r.chance) ? `1/${oneIn(r.chance)}` : 'MJ'}</b>
      </div>
    {/each}
  </details>

  <div class="tools">
    <button class="btn small" onclick={exportFile}><Icon name="download" size={16} />Exporter le catalogue</button>
    <button class="btn small" onclick={() => fileInput.click()}><Icon name="upload" size={16} />Importer</button>
    <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={importFile} />
    <button class="btn small ghost" class:armed onclick={resetAll}>{armed ? 'Toucher encore pour tout réinitialiser' : 'Tout réinitialiser'}</button>
  </div>
</section>

<style>
  .market { grid-column: 1 / -1; }
  .panel-head { align-items: center; }
  .top { margin: -4px 0 10px; }
  .sw { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; font-weight: 600; }
  .sw input, .chk input { width: 20px; height: 20px; accent-color: var(--amber); }
  .filters { display: grid; grid-template-columns: 1fr; gap: 8px; }
  @media (min-width: 640px) { .filters { grid-template-columns: 2fr 1fr auto; align-items: center; } }
  .kinds { margin: 8px 0 4px; }
  .chk { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; cursor: pointer; font-size: .9rem; }
  .rows li { display: grid; gap: 6px; padding: 10px 0; }
  .rows li.off .name { opacity: .55; }
  @media (min-width: 900px) { .rows li { grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 16px; } }
  .name { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; min-width: 0; }
  .name b { font-family: var(--display); font-weight: 600; }
  .name small { flex-basis: 100%; font-size: .8rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .badge { font-size: .7rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .badge.house { color: var(--amber); }
  .badge.none { color: var(--text); border: 1px dashed var(--muted); }
  .ctl { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: flex-end; }
  .ctl label:not(.chk) { display: grid; gap: 2px; }
  .ctl label span { font-size: .72rem; color: var(--muted); }
  .ctl .input { min-height: 40px; padding: 6px 8px; }
  .ctl input.num { width: 4.5em; text-align: center; }
  .ctl select { width: auto; }
  .add { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .add .input { flex: 1; min-width: 10em; }
  .add .price { flex: 0 0 5.5em; min-width: 0; }
  .house { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 4px; }
  .house summary { min-height: 44px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-family: var(--display); font-weight: 600; }
  .hrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 0; }
  .hrow > span { flex: 1; min-width: 12em; }
  .hrow small { color: var(--muted); }
  .hrow b { min-width: 3.5em; text-align: right; }
  .tools { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .armed { color: var(--amber); border-color: var(--amber); }
</style>
