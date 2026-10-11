<script>
  // Minimal paint tool (T13, GM mode): terrain palette, brush or rectangle,
  // its own undo, name and size. The map is saved at the end of each stroke
  // (maps are not part of the ordinary undo history).
  import MapView from '../../components/tactics/MapView.svelte';
  import Icon from '../../components/Icon.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { TERRAIN, TERRAIN_CHARS, setCell, fillRect, resizeMap, MAX_W, MAX_H, cellsPath } from '../../lib/tactics/index.js';

  let { id, ondone } = $props();
  const saved = $derived(store.campaign.maps.find((m) => m.id === id));
  let work = $state(null);
  let history = $state([]);
  let ink = $state('#');
  let tool = $state('brush');
  let anchor = $state(null), hover = $state(null);
  $effect(() => { if (saved && (!work || work.id !== saved.id)) { work = { ...saved }; history = []; } });

  const save = () => store.saveMap($state.snapshot(work));
  const push = () => { history = [...history.slice(-49), work.cells]; };
  function undo() {
    if (!history.length) return;
    work = { ...work, cells: history.at(-1) };
    history = history.slice(0, -1);
    save();
  }

  function paint(ev) {
    if (ev.phase === 'start') {
      push();
      if (tool === 'brush') work = setCell(work, ev.cell, ink);
      else { anchor = ev.cell; hover = ev.cell; }
    } else if (ev.phase === 'move') {
      if (tool === 'brush') work = setCell(work, ev.cell, ink);
      else hover = ev.cell;
    } else if (ev.phase === 'end') {
      if (tool === 'rect' && anchor) work = fillRect(work, anchor, hover, ink);
      anchor = hover = null;
      if (work.cells === history.at(-1)) history = history.slice(0, -1); // nothing changed
      else save();
    } else if (ev.phase === 'cancel') {
      if (history.length) { work = { ...work, cells: history.at(-1) }; history = history.slice(0, -1); }
      anchor = hover = null;
    }
  }
  const preview = $derived.by(() => {
    if (!anchor || !hover) return [];
    const cells = [];
    for (let y = Math.min(anchor.y, hover.y); y <= Math.max(anchor.y, hover.y); y++)
      for (let x = Math.min(anchor.x, hover.x); x <= Math.max(anchor.x, hover.x); x++) cells.push({ x, y });
    return [{ kind: 'hot', d: cellsPath(cells) }];
  });

  function resize(w, h) {
    push();
    work = resizeMap(work, w, h);
    save();
  }
  function rename(v) { work = { ...work, name: v }; save(); }
  let confirmDel = $state(false);
  function del() {
    if (!confirmDel) { confirmDel = true; setTimeout(() => (confirmDel = false), 3500); return; }
    store.removeMap(id);
    store.notify('Carte supprimée');
    ondone?.();
  }
  // Palette: floor first, then what blocks, then what slows, then the spawn zones.
  const PALETTE = ['.', '#', 'd', '/', 'b', 'm', ':', '~', 'a', 'e'];
</script>

{#if work}
  <div class="editor">
    <div class="row top">
      <label class="field name"><span>Nom de la carte</span><input class="input" value={work.name} oninput={(e) => rename(e.currentTarget.value)} placeholder="Sans nom" /></label>
      <div class="size">
        <label class="field"><span>Largeur</span><input class="input num" type="number" min="4" max={MAX_W} value={work.w} onchange={(e) => resize(e.currentTarget.value, work.h)} /></label>
        <label class="field"><span>Hauteur</span><input class="input num" type="number" min="4" max={MAX_H} value={work.h} onchange={(e) => resize(work.w, e.currentTarget.value)} /></label>
      </div>
    </div>

    <div class="palette" role="radiogroup" aria-label="Terrain à peindre">
      {#each PALETTE.filter((ch) => TERRAIN_CHARS.includes(ch)) as ch (ch)}
        <button class="sw" role="radio" aria-checked={ink === ch} onclick={() => (ink = ch)}>
          <svg viewBox="0 0 1 1" aria-hidden="true"><rect class="tt-floor" width="1" height="1" /><rect class="tt-{TERRAIN[ch].id}" width="1" height="1" /></svg>
          {TERRAIN[ch].label}
        </button>
      {/each}
    </div>

    <div class="row tools">
      <div class="chips" role="radiogroup" aria-label="Outil">
        <button class="chip" role="radio" aria-checked={tool === 'brush'} aria-pressed={tool === 'brush'} onclick={() => (tool = 'brush')}>Pinceau</button>
        <button class="chip" role="radio" aria-checked={tool === 'rect'} aria-pressed={tool === 'rect'} onclick={() => (tool = 'rect')}>Rectangle</button>
      </div>
      <button class="btn small" onclick={undo} disabled={!history.length}><Icon name="undo" size={16} />Annuler</button>
    </div>

    <MapView map={work} mode="paint" layers={preview} onpaint={paint} label="Carte {work.name || 'sans nom'} : peindre le terrain" />
    <p class="hint">Un doigt peint, deux doigts déplacent et zooment. Les zones de départ servent à placer les combattants d'un geste.</p>

    <div class="row end">
      <button class="btn small danger" onclick={del}><Icon name="trash" size={16} />{confirmDel ? 'Toucher encore pour supprimer' : 'Supprimer la carte'}</button>
      {#if ondone}<button class="btn primary" onclick={ondone}>Terminé</button>{/if}
    </div>
  </div>
{/if}

<style>
  .editor { display: grid; gap: 10px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: end; }
  .row .field { margin: 0; }
  .name { flex: 1 1 200px; }
  .size { display: flex; gap: 8px; }
  .size .input { width: 84px; }
  .tools { align-items: center; justify-content: space-between; }
  .end { justify-content: space-between; align-items: center; }
  .palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 6px; }
  .sw { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 10px; border-radius: 4px; border: 1px solid var(--line); background: transparent; font-size: .88rem; text-align: left; }
  .sw[aria-checked='true'] { border-color: var(--amber); box-shadow: inset 0 0 0 1px var(--amber); font-weight: 600; }
  .sw svg { width: 22px; height: 22px; flex: none; border-radius: 3px; box-shadow: 0 0 0 1px var(--line); }
</style>
