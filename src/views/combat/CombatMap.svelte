<script module>
  // Survives the switch between Préparation and Combat (not saved).
  let keepOpen = true;
  let keepOverlays = { bands: false, move: false, sight: true };
</script>

<script>
  // The fight's optional map (T13): pick a map, place the combatants (tap a
  // token, then a square; or drag), and look at range bands, reach and lines of
  // sight from the selected token. Everything here is a visual aid: no combat
  // rule reads the map (T14 will only pre-select choices).
  import MapView from '../../components/tactics/MapView.svelte';
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import MapEditor from '../gm/MapEditor.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { getRules } from '../../lib/settings.js';
  import { order, current, isDown, initials } from '../../lib/combat.js';
  import { blankMap, inside, key, reach, los, suggestCover, ring, cellsPath, spawnPlaces, canStand, distance, bandOf } from '../../lib/tactics/index.js';

  let { fight = false } = $props();
  let open = $state(keepOpen);
  let ov = $state({ ...keepOverlays });
  $effect(() => { keepOpen = open; keepOverlays = { ...ov }; });

  const map = $derived(store.combatMap);
  const maps = $derived(store.campaign.maps);
  const gm = $derived(store.ui.gm);
  const rules = $derived(getRules().grid);
  let editing = $state(false);
  let sel = $state(null); // explicitly selected combatant id (x.id)

  const rows = $derived(order(store.data));
  const curId = $derived(fight ? (store.ui.turnActor ?? current(store.data)?.x.id ?? null) : null);
  const placed = $derived(map ? rows.filter((r) => r.x.pos && inside(map, r.x.pos)) : []);
  const unplaced = $derived(map ? rows.filter((r) => !(r.x.pos && inside(map, r.x.pos))) : []);
  const focusId = $derived(sel ?? curId);
  const focus = $derived(placed.find((r) => r.x.id === focusId) ?? null);
  const selRow = $derived(rows.find((r) => r.x.id === sel) ?? null);
  $effect(() => { if (sel && !rows.some((r) => r.x.id === sel)) sel = null; });

  const ringColor = (r) => (r.c.kind !== 'npc' && r.c.color ? r.c.color : r.x.side === 'enemy' ? 'var(--fault)' : 'var(--muted)');
  const tokens = $derived(placed.map((r) => ({
    id: r.x.id, x: r.x.pos.x, y: r.x.pos.y, initials: initials(r.c.name), color: ringColor(r), side: r.x.side,
    current: r.x.id === curId, selected: r.x.id === sel, down: isDown(r), title: r.c.name || 'Sans nom'
  })));
  const takenBy = (except) => placed.filter((r) => r.x.id !== except).map((r) => key(r.x.pos));

  const BANDS = ['Bras', 'Proche', 'Courte'];
  const rings = $derived(focus && ov.bands ? BANDS.map((b) => ({ label: b, ...ring(map, focus.x.pos, rules.bands[b]) })) : []);
  const layers = $derived.by(() => {
    if (!focus || !ov.move) return [];
    const costs = reach(map, focus.x.pos, 2, rules, { blocked: takenBy(focus.x.id) });
    const one = [], two = [];
    for (const [k, c] of costs) if (c > 0) (c <= rules.moveSquares ? one : two).push(k);
    return [{ kind: 'reach2', d: cellsPath(two) }, { kind: 'reach1', d: cellsPath(one) }];
  });
  const lines = $derived.by(() => {
    if (!focus || !ov.sight) return [];
    return placed.filter((r) => r.x.side !== focus.x.side && !isDown(r)).map((r) => {
      const cv = suggestCover(map, focus.x.pos, r.x.pos);
      return { x1: focus.x.pos.x, y1: focus.x.pos.y, x2: r.x.pos.x, y2: r.x.pos.y, visible: cv.los.visible, badge: cv.los.visible && cv.rating ? String(cv.rating) : '' };
    });
  });
  // What the selected token sees, in words (screen readers, and the exact numbers).
  const sightText = $derived.by(() => {
    if (!focus) return [];
    return placed.filter((r) => r.x.side !== focus.x.side && !isDown(r)).map((r) => {
      const d = distance(focus.x.pos, r.x.pos);
      const cv = suggestCover(map, focus.x.pos, r.x.pos);
      return { id: r.x.id, name: r.c.name || 'Sans nom', text: !cv.los.visible ? 'pas de ligne de vue' : `${bandOf(d, rules)} (${d} case${d > 1 ? 's' : ''})${cv.rating ? `, couverture ${cv.source} ${cv.rating}` : ''}` };
    });
  });

  function placeAt(xid, cell) {
    const taken = takenBy(xid);
    if (!canStand(map, cell, taken)) {
      store.notify(taken.includes(key(cell)) ? 'Case occupée' : 'On ne peut pas se tenir là');
      return false;
    }
    store.placeToken(xid, cell);
    return true;
  }
  function tapCell(cell) {
    if (!sel) return;
    const wasOff = unplaced.some((r) => r.x.id === sel);
    if (!placeAt(sel, cell)) return;
    // Setting up: go straight to the next token still off the map.
    sel = wasOff ? (unplaced.find((r) => r.x.id !== sel)?.x.id ?? null) : null;
  }
  const tapToken = (id) => (sel = sel === id ? null : id);
  function keyMove(dx, dy) {
    const r = placed.find((p) => p.x.id === sel);
    if (r) placeAt(r.x.id, { x: r.x.pos.x + dx, y: r.x.pos.y + dy });
  }
  function autoPlace() {
    const spots = spawnPlaces(map, unplaced.map((r) => ({ id: r.x.id, side: r.x.side })), placed.map((r) => key(r.x.pos)));
    const n = Object.keys(spots).length;
    if (!n) { store.notify('Pas de zone de départ libre sur cette carte'); return; }
    store.commitAll(`${n} combattant${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''}`, (d) => d.combat.combatants.forEach((x) => { if (spots[x.id]) x.pos = { ...spots[x.id] }; }));
    sel = null;
  }
  const hasSpawn = $derived(!!map && /[ae]/.test(map.cells));
  function newMap() {
    const id = store.saveMap({ ...blankMap(16, 12), name: `Carte ${maps.length + 1}` });
    store.setCombatMap(id);
    editing = true;
    open = true;
  }
</script>

<section class="panel cmap">
  <button class="panel-head lh" onclick={() => (open = !open)} aria-expanded={open}>
    <h2>Carte</h2><span class="meta">{map ? map.name || 'Sans nom' : 'aucune'} {open ? '−' : '+'}</span>
  </button>
  {#if open}
    <div class="bar">
      <select class="input pick" aria-label="Carte du combat" value={map?.id ?? ''} onchange={(e) => { store.setCombatMap(e.currentTarget.value || null); editing = false; sel = null; }}>
        <option value="">Pas de carte</option>
        {#each maps as m (m.id)}<option value={m.id}>{m.name || 'Sans nom'} ({m.w} × {m.h})</option>{/each}
      </select>
      {#if gm}
        {#if map && !editing}<button class="btn small" onclick={() => (editing = true)}><Icon name="edit" size={16} />Modifier</button>{/if}
        <button class="btn small" onclick={newMap}><Icon name="plus" size={16} />Nouvelle carte</button>
      {/if}
    </div>

    {#if map && editing && gm}
      <MapEditor id={map.id} ondone={() => (editing = false)} />
    {:else if map}
      <div class="chips ovs" aria-label="Aides visuelles">
        <button class="chip" aria-pressed={ov.bands} onclick={() => (ov.bands = !ov.bands)}>Portées</button>
        <button class="chip" aria-pressed={ov.move} onclick={() => (ov.move = !ov.move)}>Déplacement</button>
        <button class="chip" aria-pressed={ov.sight} onclick={() => (ov.sight = !ov.sight)}>Lignes de vue</button>
      </div>
      <MapView {map} {tokens} {rings} {layers} {lines} draggable
        label="Carte {map.name || 'sans nom'} : touchez un combattant puis une case pour le placer"
        ontap={tapCell} ontoken={tapToken} ondrop={(id, cell) => { if (placeAt(id, cell)) sel = null; }}
        onkeymove={sel && placed.some((r) => r.x.id === sel) ? keyMove : null} />

      {#if selRow}
        <div class="selrow">
          <Avatar c={selRow.c} side={selRow.x.side} size={32} label={false} />
          <span class="who"><b>{selRow.c.name || 'Sans nom'}</b><small>{selRow.x.pos && inside(map, selRow.x.pos) ? 'Touchez une case pour le déplacer (ou les flèches du clavier).' : 'Touchez une case pour le placer.'}</small></span>
          {#if selRow.x.pos}<button class="btn small ghost" onclick={() => { store.placeToken(selRow.x.id, null); sel = null; }}>Retirer de la carte</button>{/if}
          <button class="icon-btn" aria-label="Désélectionner" onclick={() => (sel = null)}><Icon name="close" /></button>
        </div>
      {/if}

      {#if unplaced.length}
        <div class="tray">
          <span class="muted">À placer</span>
          <div class="avs">
            {#each unplaced as r (r.x.id)}
              <button class="avbtn" aria-pressed={sel === r.x.id} onclick={() => tapToken(r.x.id)} aria-label="Placer {r.c.name || 'Sans nom'}">
                <Avatar c={r.c} side={r.x.side} size={34} selected={sel === r.x.id} />
              </button>
            {/each}
          </div>
          {#if hasSpawn}<button class="btn small" onclick={autoPlace}>Placer sur les zones de départ</button>{/if}
        </div>
      {/if}

      {#if focus && sightText.length}
        <ul class="sightlist" aria-label="Vu depuis {focus.c.name || 'Sans nom'}">
          {#each sightText as t (t.id)}<li><b>{t.name}</b> : {t.text}</li>{/each}
        </ul>
      {/if}
      <p class="hint">Suggestions de la carte (1 case = {rules.squareM} m, règle maison) : la portée, la couverture et le déplacement restent à confirmer à la table.</p>
    {:else}
      <p class="hint">Sans carte, le combat se joue aux portées, comme dans le livre.</p>
    {/if}
  {/if}
</section>

<style>
  .cmap { display: grid; gap: 10px; }
  .cmap > .panel-head { margin-bottom: 0; }
  .lh { width: 100%; background: none; border: 0; padding: 0; text-align: left; color: inherit; min-height: 32px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .pick { flex: 1 1 180px; width: auto; }
  .ovs .chip { min-height: 36px; }
  .selrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid var(--line); }
  .selrow .who { flex: 1 1 160px; display: grid; min-width: 0; }
  .selrow b { font-family: var(--display); font-weight: 600; }
  .selrow small { font-size: .82rem; color: var(--muted); }
  .tray { display: grid; gap: 6px; }
  .tray > .muted { font-size: .85rem; }
  .avs { display: flex; flex-wrap: wrap; gap: 2px; }
  .avbtn { background: none; border: 0; padding: 2px; border-radius: 8px; }
  .avbtn:hover { background: var(--hull-2); }
  .tray .btn { justify-self: start; }
  .sightlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: .86rem; color: var(--muted); }
  .sightlist b { color: var(--text); font-weight: 600; }
</style>
