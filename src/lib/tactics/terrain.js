// Square-grid maps (T12): terrain types and the compact map format.
// A map is { w, h, cells } where `cells` is a string of w × h terrain
// characters, row by row (row 0 at the top). Positions are { x, y } with
// x = column, y = row. Cover ratings come from the book's Typical Cover table
// (data.js coverPresets, p.91). Movement costs below are our reading of the
// book's "the GM assesses" (p.82): they only drive the reach overlay, never a rule.
import { GAME_DATA as D } from '../data.js';

const coverOf = (name) => D.coverPresets.find((p) => p.name === name)?.armor ?? 0;

/**
 * Terrain types, by map character.
 * - block: blocks line of sight;
 * - cost: movement cost to enter (Infinity = impassable);
 * - cover: cover name in coverPresets when a robot hides behind it (null = none).
 */
export const TERRAIN = {
  '.': { id: 'sol', label: 'Sol', block: false, cost: 1, cover: null },
  '#': { id: 'mur', label: 'Mur', block: true, cost: Infinity, cover: 'Mur' },
  m: { id: 'meuble', label: 'Meuble', block: false, cost: 2, cover: 'Meuble' },
  d: { id: 'porte', label: 'Porte fermée', block: true, cost: Infinity, cover: 'Mur' },
  '/': { id: 'porte-ouverte', label: 'Porte ouverte', block: false, cost: 1, cover: null },
  b: { id: 'porte-blindee', label: 'Porte blindée (bouclier)', block: false, cost: Infinity, cover: 'Porte blindée' },
  ':': { id: 'difficile', label: 'Terrain difficile', block: false, cost: 2, cover: null },
  '~': { id: 'eau', label: 'Eau', block: false, cost: Infinity, cover: null },
  a: { id: 'spawn-allie', label: 'Départ allié', block: false, cost: 1, cover: null },
  e: { id: 'spawn-ennemi', label: 'Départ ennemi', block: false, cost: 1, cover: null }
};

/** Characters of the terrain types, in paint-palette order. */
export const TERRAIN_CHARS = Object.keys(TERRAIN);

/** The cover rating of a terrain type (0 when it gives none). */
export const terrainCover = (t) => (t?.cover ? coverOf(t.cover) : 0);

/** Largest map the paint tool allows (T13). */
export const MAX_W = 32;
export const MAX_H = 24;

/** A blank map of floor cells. */
export function blankMap(w = 16, h = 12) {
  w = clampInt(w, 1, MAX_W);
  h = clampInt(h, 1, MAX_H);
  return { w, h, cells: '.'.repeat(w * h) };
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

export const inside = (map, p) => p.x >= 0 && p.y >= 0 && p.x < map.w && p.y < map.h;

/** Terrain character at a position (outside the map counts as wall). */
export const charAt = (map, p) => {
  const c = cellOf(p);
  return inside(map, c) ? map.cells[c.y * map.w + c.x] : '#';
};

/** The whole cell under a position (pointer coordinates may have decimals). */
export const cellOf = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });

/** Terrain type at a position (unknown characters read as floor). */
export const terrainAt = (map, p) => TERRAIN[charAt(map, p)] || TERRAIN['.'];

export const key = (p) => `${p.x},${p.y}`;
export const unkey = (k) => { const [x, y] = k.split(',').map(Number); return { x, y }; };

/** A copy of the map with one cell changed (maps are never mutated here). */
export function setCell(map, p, ch) {
  p = cellOf(p);
  if (!inside(map, p) || !TERRAIN[ch]) return map;
  const i = p.y * map.w + p.x;
  return { ...map, cells: map.cells.slice(0, i) + ch + map.cells.slice(i + 1) };
}

/** Change every cell of the rectangle between two corners. */
export function fillRect(map, a, b, ch) {
  if (!TERRAIN[ch]) return map;
  a = cellOf(a); b = cellOf(b);
  const x0 = Math.max(0, Math.min(a.x, b.x)), x1 = Math.min(map.w - 1, Math.max(a.x, b.x));
  const y0 = Math.max(0, Math.min(a.y, b.y)), y1 = Math.min(map.h - 1, Math.max(a.y, b.y));
  if (x1 < x0 || y1 < y0) return map; // entirely off the map
  const rows = [];
  for (let y = 0; y < map.h; y++) {
    let row = map.cells.slice(y * map.w, (y + 1) * map.w);
    if (y >= y0 && y <= y1) row = row.slice(0, x0) + ch.repeat(x1 - x0 + 1) + row.slice(x1 + 1);
    rows.push(row);
  }
  return { ...map, cells: rows.join('') };
}

/** Resize, keeping the top-left part and filling new cells with floor. */
export function resizeMap(map, w, h) {
  w = clampInt(w, 1, MAX_W);
  h = clampInt(h, 1, MAX_H);
  const rows = [];
  for (let y = 0; y < h; y++) {
    const old = y < map.h ? map.cells.slice(y * map.w, (y + 1) * map.w) : '';
    rows.push((old + '.'.repeat(w)).slice(0, w));
  }
  return { ...map, w, h, cells: rows.join('') };
}

/**
 * Read an ASCII drawing (rows separated by newlines, spaces ignored).
 * Any letter that isn't a terrain character marks a token on a floor cell:
 * returns { map, marks: { A: {x,y}, T: {x,y}, … } } (the first of each letter;
 * every one in marksAll).
 */
export function parseMap(ascii) {
  const rows = ascii.split('\n').map((r) => r.replace(/\s+/g, '')).filter(Boolean);
  if (!rows.length) return { map: blankMap(1, 1), marks: {}, marksAll: {} };
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const marks = {}, marksAll = {};
  let cells = '';
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) {
      const ch = r[x] ?? '.';
      if (TERRAIN[ch]) { cells += ch; continue; }
      cells += '.';
      marks[ch] ??= { x, y };
      (marksAll[ch] ??= []).push({ x, y });
    }
  });
  return { map: { w, h, cells }, marks, marksAll };
}

/** The map as ASCII rows (tests, debugging). */
export const mapToAscii = (map) => Array.from({ length: map.h }, (_, y) => map.cells.slice(y * map.w, (y + 1) * map.w)).join('\n');
