// SVG path strings for the map (T13). One <path> per terrain type and per
// overlay keeps the DOM small whatever the map size: cells are merged into
// horizontal runs. Coordinates are in squares (the SVG viewBox is w × h).
import { TERRAIN } from './terrain.js';

/** Path of a set of cells given as {x,y} or "x,y" keys, merged by row runs. */
export function cellsPath(cells) {
  const rows = new Map();
  for (const c of cells) {
    const p = typeof c === 'string' ? c.split(',').map(Number) : [c.x, c.y];
    if (!rows.has(p[1])) rows.set(p[1], []);
    rows.get(p[1]).push(p[0]);
  }
  let d = '';
  for (const [y, xs] of [...rows].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; i++) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] <= xs[j] + 1) j++;
      const x0 = xs[i], run = xs[j] - x0 + 1;
      d += `M${x0} ${y}h${run}v1h-${run}z`;
      i = j;
    }
  }
  return d;
}

/** One path per terrain character present on the map (floor and spawn zones included). */
export function terrainPaths(map) {
  const by = {};
  for (let y = 0; y < map.h; y++) {
    let x = 0;
    while (x < map.w) {
      const ch = map.cells[y * map.w + x];
      let run = 1;
      while (x + run < map.w && map.cells[y * map.w + x + run] === ch) run++;
      if (TERRAIN[ch]) by[ch] = (by[ch] || '') + `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return by;
}

/** The grid lines as a single path. */
export function gridPath(w, h) {
  let d = '';
  for (let x = 1; x < w; x++) d += `M${x} 0V${h}`;
  for (let y = 1; y < h; y++) d += `M0 ${y}H${w}`;
  return d;
}

/**
 * The square of squares within `r` of a cell (Chebyshev), clipped to the map:
 * { x, y, w, h } in squares, for the range-band rings.
 */
export function ring(map, c, r) {
  const x0 = Math.max(0, c.x - r), y0 = Math.max(0, c.y - r);
  const x1 = Math.min(map.w, c.x + r + 1), y1 = Math.min(map.h, c.y + r + 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
