<script>
  // Tactical map (T13): an SVG whose viewBox is the map in squares. One <path>
  // per terrain type, overlays and tokens on top. Pan with one finger (or the
  // mouse), pinch or wheel to zoom, +/− and « Recentrer ». touch-action is off
  // on the map only, so the page still scrolls around it.
  // mode 'view': tap a square or a token, drag a token (draggable).
  // mode 'paint': one finger paints (onpaint start/move/end), two fingers pan/zoom.
  import { terrainPaths, gridPath } from '../../lib/tactics/paths.js';
  import { TERRAIN } from '../../lib/tactics/terrain.js';
  import Icon from '../Icon.svelte';

  let {
    map, tokens = [], layers = [], rings = [], lines = [],
    mode = 'view', draggable = false, label = 'Carte tactique',
    ontap = () => {}, ontoken = () => {}, ondrop = () => {}, onpaint = () => {}, onkeymove = null
  } = $props();

  const paths = $derived(terrainPaths(map));
  const grid = $derived(gridPath(map.w, map.h));
  const ORDER = ['.', 'a', 'e', ':', '~', '/', 'm', 'b', 'd', '#'];
  const terrain = $derived(ORDER.filter((ch) => paths[ch] && ch !== '.').map((ch) => ({ ch, id: TERRAIN[ch].id, d: paths[ch] })));

  // View transform, in squares: screen = world × s + t.
  let s = $state(1), tx = $state(0), ty = $state(0);
  let svg = $state(null);
  let drag = $state(null); // { id, x, y } token being dragged (float squares)
  const MAX_S = 6;

  function clampView() {
    s = Math.min(MAX_S, Math.max(1, s));
    tx = Math.min(0, Math.max(map.w * (1 - s), tx));
    ty = Math.min(0, Math.max(map.h * (1 - s), ty));
  }
  $effect(() => { map.w; map.h; clampView(); });
  export function recentre() { s = 1; tx = 0; ty = 0; }
  function zoomAt(f, vx = map.w / 2, vy = map.h / 2) {
    const ns = Math.min(MAX_S, Math.max(1, s * f));
    const wx = (vx - tx) / s, wy = (vy - ty) / s;
    s = ns; tx = vx - wx * ns; ty = vy - wy * ns;
    clampView();
  }

  /** Screen point → viewBox point (squares, before the view transform). */
  function toView(e) {
    const r = svg.getBoundingClientRect();
    return { vx: ((e.clientX - r.left) * map.w) / r.width, vy: ((e.clientY - r.top) * map.h) / r.height, px: e.clientX, py: e.clientY };
  }
  const toWorld = (v) => ({ x: (v.vx - tx) / s, y: (v.vy - ty) / s });
  const cellAt = (v) => { const w = toWorld(v); return { x: Math.floor(w.x), y: Math.floor(w.y) }; };
  const insideMap = (c) => c.x >= 0 && c.y >= 0 && c.x < map.w && c.y < map.h;

  const pts = new Map();
  let g = null; // current gesture
  const TAP = 8; // px before a press becomes a drag or a pan

  function down(e) {
    if (e.button > 0) return;
    svg.setPointerCapture?.(e.pointerId);
    const v = toView(e);
    pts.set(e.pointerId, v);
    if (pts.size === 2) {
      if (g?.kind === 'paint') onpaint({ phase: 'cancel' });
      drag = null;
      const [a, b] = [...pts.values()];
      g = { kind: 'pinch', d0: Math.hypot(a.px - b.px, a.py - b.py) || 1, m0: { vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 }, s0: s, tx0: tx, ty0: ty };
      return;
    }
    if (pts.size > 2) return;
    const tok = e.target.closest?.('[data-tok]')?.getAttribute('data-tok') ?? null;
    if (mode === 'paint') {
      const c = cellAt(v);
      g = { kind: 'paint' };
      if (insideMap(c)) onpaint({ phase: 'start', cell: c });
      return;
    }
    g = { kind: 'press', start: v, tok, tx0: tx, ty0: ty };
  }

  function move(e) {
    if (!pts.has(e.pointerId)) return;
    const v = toView(e);
    pts.set(e.pointerId, v);
    if (!g) return;
    if (g.kind === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.px - b.px, a.py - b.py) || 1;
      const m = { vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 };
      const ns = Math.min(MAX_S, Math.max(1, (g.s0 * d) / g.d0));
      const wx = (g.m0.vx - g.tx0) / g.s0, wy = (g.m0.vy - g.ty0) / g.s0;
      s = ns; tx = m.vx - wx * ns; ty = m.vy - wy * ns;
      clampView();
      return;
    }
    if (g.kind === 'paint') {
      const c = cellAt(v);
      if (insideMap(c)) onpaint({ phase: 'move', cell: c });
      return;
    }
    if (g.kind === 'press' && Math.hypot(v.px - g.start.px, v.py - g.start.py) > TAP) {
      g = g.tok && draggable ? { ...g, kind: 'drag' } : { ...g, kind: 'pan' };
    }
    if (g.kind === 'drag') {
      const w = toWorld(v);
      drag = { id: g.tok, x: w.x, y: w.y };
    } else if (g.kind === 'pan') {
      tx = g.tx0 + (v.vx - g.start.vx);
      ty = g.ty0 + (v.vy - g.start.vy);
      clampView();
    }
  }

  function up(e) {
    if (!pts.has(e.pointerId)) return;
    const v = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    if (!g) return;
    if (g.kind === 'pinch') { if (pts.size === 0) g = null; return; }
    if (g.kind === 'paint') onpaint({ phase: e.type === 'pointercancel' ? 'cancel' : 'end' });
    else if (g.kind === 'press' && e.type !== 'pointercancel') {
      const c = cellAt(v);
      if (g.tok) ontoken(g.tok);
      else if (insideMap(c)) ontap(c);
    } else if (g.kind === 'drag' && e.type !== 'pointercancel') {
      const c = cellAt(v);
      if (insideMap(c)) ondrop(g.tok, c);
    }
    drag = null;
    g = null;
  }

  $effect(() => {
    if (!svg) return;
    const wheel = (e) => {
      e.preventDefault();
      const v = toView(e);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, v.vx, v.vy);
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  });

  function key(e) {
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[e.key]) {
      e.preventDefault();
      const [dx, dy] = dirs[e.key];
      if (onkeymove) onkeymove(dx, dy);
      else { tx -= dx * s; ty -= dy * s; clampView(); }
    } else if (e.key === '+' || e.key === '=') zoomAt(1.25);
    else if (e.key === '-') zoomAt(1 / 1.25);
    else if (e.key === '0') recentre();
  }

  const shown = $derived(tokens.map((t) => (drag && drag.id === t.id ? { ...t, fx: drag.x - 0.5, fy: drag.y - 0.5, dragging: true } : { ...t, fx: t.x, fy: t.y })));
</script>

<div class="mapview" style="--w:{map.w}; --h:{map.h}">
  <svg
    bind:this={svg}
    viewBox="0 0 {map.w} {map.h}"
    class:paint={mode === 'paint'}
    role="application"
    aria-label={label}
    tabindex="0"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
    onkeydown={key}
  >
    <g transform="translate({tx} {ty}) scale({s})">
      <rect class="tt-floor" width={map.w} height={map.h} />
      <path class="tt-grid" d={grid} />
      {#each terrain as t (t.ch)}<path class="tt-{t.id}" d={t.d} />{/each}
      {#each layers as l, i (i)}<path class="ov ov-{l.kind}" d={l.d} />{/each}
      {#each rings as r (r.label)}
        <rect class="ring" x={r.x + 0.06} y={r.y + 0.06} width={r.w - 0.12} height={r.h - 0.12} />
        <text class="ringl" x={r.x + 0.18} y={r.y + 0.42}>{r.label}</text>
      {/each}
      {#each lines as l, i (i)}
        <line class="sight" class:hidden={!l.visible} x1={l.x1 + 0.5} y1={l.y1 + 0.5} x2={l.x2 + 0.5} y2={l.y2 + 0.5} />
      {/each}
      {#each shown as t (t.id)}
        <g class="tok" class:enemy={t.side === 'enemy'} class:sel={t.selected} class:cur={t.current} class:down={t.down} class:dragging={t.dragging} data-tok={t.id} transform="translate({t.fx + 0.5} {t.fy + 0.5})" style="--ring:{t.color}; --ink:{t.ink || 'var(--on-ring)'}">
          {#if t.current || t.selected}<circle class="halo" r="0.5" />{/if}
          <circle class="disc" r="0.42" />
          <text class="ini" y="0.12">{t.initials}</text>
          <title>{t.title}</title>
        </g>
      {/each}
      {#each lines.filter((l) => l.badge) as l, i (i)}
        <text class="badge" x={l.x2 + 0.86} y={l.y2 + 0.3}>{l.badge}</text>
      {/each}
    </g>
  </svg>
  <div class="zoom">
    <button class="icon-btn" onclick={() => zoomAt(1.4)} aria-label="Zoomer"><Icon name="plus" /></button>
    <button class="icon-btn" onclick={() => zoomAt(1 / 1.4)} aria-label="Dézoomer" disabled={s <= 1}><Icon name="minus" /></button>
    <button class="btn small ghost" onclick={recentre} disabled={s === 1 && tx === 0 && ty === 0}>Recentrer</button>
  </div>
</div>

<style>
  .mapview { position: relative; width: min(100%, calc(68vh * var(--w) / var(--h))); margin: 0 auto; }
  svg { display: block; width: 100%; aspect-ratio: var(--w) / var(--h); touch-action: none; user-select: none; -webkit-user-select: none;
    background: var(--abyss); border-radius: 4px; box-shadow: 0 0 0 1px var(--line); cursor: grab; }
  svg.paint { cursor: crosshair; }
  svg:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }

  /* Overlays */
  .ov { stroke: none; pointer-events: none; }
  .ov-reach1 { fill: color-mix(in srgb, var(--amber) 26%, transparent); }
  .ov-reach2 { fill: color-mix(in srgb, var(--amber) 11%, transparent); }
  .ov-hot { fill: color-mix(in srgb, var(--amber) 35%, transparent); stroke: var(--amber); stroke-width: 0.05; }
  .ring { fill: none; stroke: var(--amber); stroke-width: 0.05; stroke-dasharray: 0.25 0.15; opacity: .8; pointer-events: none; }
  .ringl { font: 600 0.3px var(--display); fill: var(--amber); pointer-events: none; }
  .sight { stroke: var(--amber); stroke-width: 0.06; pointer-events: none; }
  .sight.hidden { stroke: var(--muted); stroke-dasharray: 0.12 0.12; opacity: .7; }
  .badge { font: 700 0.36px var(--display); fill: var(--amber); paint-order: stroke; stroke: var(--abyss); stroke-width: 0.1; pointer-events: none; }

  /* Tokens: same language as Avatar (ring in the robot's color, red for enemies). */
  .tok { cursor: pointer; }
  .tok .disc { fill: color-mix(in srgb, var(--ring) 22%, var(--abyss)); stroke: var(--ring); stroke-width: 0.08; }
  .tok .ini { font: 700 0.32px var(--display); fill: var(--text); text-anchor: middle; pointer-events: none; }
  .tok.sel .disc { fill: var(--ring); }
  .tok.sel .ini { fill: var(--ink); }
  .tok .halo { fill: none; stroke: var(--amber); stroke-width: 0.07; }
  .tok.sel:not(.cur) .halo { stroke: var(--text); stroke-dasharray: 0.12 0.1; }
  .tok.down { opacity: .45; }
  .tok.dragging { opacity: .8; }

  .zoom { display: flex; gap: 2px; align-items: center; justify-content: flex-end; margin-top: 4px; }
  .zoom .icon-btn:disabled { opacity: .4; }
</style>
