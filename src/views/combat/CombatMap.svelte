<script module>
  // Survives the switch between Préparation and Combat (not saved).
  let keepOpen = true;
  let keepOverlays = { bands: false, move: false, sight: true };
</script>

<script>
  // The fight's optional map (T13): pick a map, place the combatants (tap a
  // token, then a square; or drag), and look at range bands, reach and lines of
  // sight from the selected token. During the turn (T14) it also takes the square
  // an explosion is aimed at, and asks about overwatch shots after a move. It is
  // a visual aid: the turn only pre-selects choices from it, the table decides.
  import MapView from '../../components/tactics/MapView.svelte';
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import MapEditor from '../gm/MapEditor.svelte';
  import { store, availableEp } from '../../lib/store.svelte.js';
  import { getRules } from '../../lib/settings.js';
  import { order, current, isDown, initials } from '../../lib/combat.js';
  import { blankMap, inside, key, reach, los, suggestCover, ring, cellsPath, spawnPlaces, canStand, distance, bandOf, mapCtx, overwatchers, moveSquaresFor, bandText } from '../../lib/tactics/index.js';
  import { blastDice } from '../../lib/energy.js';

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
    id: r.x.id, x: r.x.pos.x, y: r.x.pos.y, initials: initials(r.c.name), color: ringColor(r), ink: r.c.kind !== 'npc' && r.c.color ? '#10181a' : null, side: r.x.side,
    current: r.x.id === curId, selected: r.x.id === sel, down: isDown(r), title: r.c.name || 'Sans nom'
  })));
  const takenBy = (except) => placed.filter((r) => r.x.id !== except).map((r) => key(r.x.pos));

  const BANDS = ['Bras', 'Proche', 'Courte'];
  // While the turn aims an explosion (T14): the blast's reach around the chosen square.
  const picking = $derived(fight && store.ui.mapPick === 'blast');
  const blastPower = $derived(picking ? store.ui.turn?.fxObj?.power ?? 0 : 0);
  const rings = $derived.by(() => {
    if (picking && store.ui.blastCell) {
      const c = store.ui.blastCell;
      return ['Bras', 'Proche', ...(blastDice(blastPower, 'Courte') ? ['Courte'] : [])].map((b) => ({ label: `Souffle ${b}`, ...ring(map, c, rules.bands[b]) }));
    }
    return focus && ov.bands ? BANDS.map((b) => ({ label: b, ...ring(map, focus.x.pos, rules.bands[b]) })) : [];
  });
  const layers = $derived.by(() => {
    if (!focus || !ov.move) return [];
    const m = moveSquaresFor(focus.c, rules, availableEp(store.data, focus.c)); // × 2 with a movement module it can pay (T14)
    const costs = reach(map, focus.x.pos, 2, { ...rules, moveSquares: m }, { blocked: takenBy(focus.x.id) });
    const one = [], two = [];
    for (const [k, c] of costs) if (c > 0) (c <= m ? one : two).push(k);
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
    const before = rows.find((r) => r.x.id === xid)?.x.pos;
    store.placeToken(xid, cell);
    // A move during the fight may walk into someone's overwatch (T14): ask, never fire on its own.
    if (fight && before) {
      const ctx = mapCtx(store.data, rules);
      const mover = store.combat.combatants.find((y) => y.id === xid);
      // Not the robot whose turn it is (or who is already firing).
      const busy = [store.ui.turnActor, current(store.data)?.x.id];
      const ws = overwatchers(ctx, store.data, mover).filter((w) => !busy.includes(w.x.id));
      owPrompt = ws.length ? { mover: mover.cid, actor: current(store.data)?.x.id ?? null, list: ws.map((w) => ({ xid: w.x.id, name: w.c.name || 'Sans nom', range: bandText(w.range) })) } : null;
    }
    return true;
  }
  let owPrompt = $state(null);
  const deOf = (name) => (/^[aeiouyéèêàâîôûh]/i.test(name) ? "d'" : 'de ');
  // A new actor (end of turn, undo…) makes an old prompt meaningless.
  $effect(() => { const now = current(store.data)?.x.id ?? null; if (owPrompt && owPrompt.actor !== now) owPrompt = null; });
  function owShoot(w) {
    store.ui.owTarget = owPrompt.mover;
    store.ui.owResume = store.ui.turnActor ? store.ui.owResume : store.ui.turn; // back to this turn afterwards
    store.ui.turn = null;
    store.ui.turnActor = w.xid;
    const rest = owPrompt.list.filter((o) => o.xid !== w.xid);
    owPrompt = rest.length ? { ...owPrompt, list: rest } : null;
    document.querySelector('section.turn')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function tapCell(cell) {
    if (picking) { store.ui.blastCell = { ...cell }; return; }
    if (!sel) return;
    const wasOff = unplaced.some((r) => r.x.id === sel);
    if (!placeAt(sel, cell)) return;
    // Setting up: go straight to the next token still off the map.
    sel = wasOff ? (unplaced.find((r) => r.x.id !== sel)?.x.id ?? null) : null;
  }
  function tapToken(id) {
    const r = picking ? placed.find((p) => p.x.id === id) : null;
    if (r) { store.ui.blastCell = { ...r.x.pos }; return; } // aiming an explosion at someone's square
    sel = sel === id ? null : id;
  }
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

      {#if picking}<p class="pick-note">Touchez la case visée par l'explosion.</p>{/if}
      {#if owPrompt}
        <div class="owp" role="alert">
          {#each owPrompt.list as w (w.xid)}
            <p>Tir de surveillance {deOf(w.name)}<b>{w.name}</b>, à {w.range}&nbsp;? Arc de 90°&nbsp;: à vous de juger.</p>
            <button class="btn small primary" onclick={() => owShoot(w)}>Tirer en surveillance</button>
          {/each}
          <button class="btn small ghost" onclick={() => (owPrompt = null)}>Pas de tir</button>
        </div>
      {/if}

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
  .lh { width: 100%; background: none; border: 0; padding: 0; text-align: left; color: inherit; min-height: 44px; align-items: center; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .pick { flex: 1 1 180px; width: auto; }
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
  .pick-note { margin: 0; padding: 8px 10px; border-left: 3px solid var(--amber); background: var(--abyss); font-weight: 600; }
  .owp { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 10px 12px; border-left: 3px solid var(--amber); background: var(--abyss); }
  .owp p { margin: 0; flex: 1 1 220px; }
  .sightlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: .86rem; color: var(--muted); }
  .sightlist b { color: var(--text); font-weight: 600; }
</style>
