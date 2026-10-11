// Encounter library (T15): ready fights the GM launches in a few taps.
// encounter = { id, name, tags[], mapId, enemies: [{ template, count, side }],
//               surprise: 'none' | 'allies' | 'enemies', gmPool (null = ration × PCs), notes }
// `side` lets an encounter bring NPC allies too ('ally'); every NPC is placed on
// its side's spawn zone of the map, if any. Pure: no store import (the store
// launches, see store.launchEncounter).
import { GAME_DATA as D } from './data.js';
import { normalizeMap } from './tactics/terrain.js';

export const SURPRISE = [
  { id: 'none', label: 'Personne' },
  { id: 'allies', label: "L'équipe (+2 à l'initiative)" },
  { id: 'enemies', label: 'Les adversaires (+2 à l\'initiative)' }
];

const str = (v) => (typeof v === 'string' ? v : '');
const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const MAX_COUNT = 12;

export function blankEncounter(name = '') {
  return { id: '', name, tags: [], mapId: null, enemies: [], surprise: 'none', gmPool: null, notes: '' };
}

/** Clean tags: trimmed, lower case, unique, at most 8. */
export const cleanTags = (list) => [...new Set((Array.isArray(list) ? list : str(list).split(',')).map((t) => str(t).trim().toLowerCase()).filter(Boolean))].slice(0, 8);

export function normalizeEncounter(raw, makeId = () => '') {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(r.id) || makeId(),
    name: str(r.name),
    tags: cleanTags(r.tags),
    mapId: str(r.mapId) || null,
    enemies: (Array.isArray(r.enemies) ? r.enemies : [])
      .filter((e) => e && D.npcTemplates.some((t) => t.id === e.template))
      .map((e) => ({ template: e.template, count: int(e.count, 1, MAX_COUNT, 1), side: e.side === 'ally' ? 'ally' : 'enemy' })),
    surprise: SURPRISE.some((s) => s.id === r.surprise) ? r.surprise : 'none',
    gmPool: r.gmPool == null || r.gmPool === '' ? null : int(r.gmPool, 0, 200, null),
    notes: str(r.notes)
  };
}

/** "2 × Robot de garde, Unité Sentinelle (allié)" */
export function enemyLine(enc) {
  return enc.enemies.map((e) => {
    const t = D.npcTemplates.find((x) => x.id === e.template);
    return `${e.count > 1 ? `${e.count} × ` : ''}${t?.name ?? e.template}${e.side === 'ally' ? ' (allié)' : ''}`;
  }).join(', ');
}

/** Does the encounter match a search text (name, tags, enemies, notes; accents ignored)? */
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const matches = (enc, q) => !q || norm(`${enc.name} ${enc.tags.join(' ')} ${enemyLine(enc)} ${enc.notes}`).includes(norm(q));

// ---------- files ----------
/** Encounters with the maps they use, for another campaign. */
export function encounterFile(encs, maps) {
  const ids = new Set(encs.map((e) => e.mapId).filter(Boolean));
  return { mechatronEncounters: 1, encounters: encs, maps: maps.filter((m) => ids.has(m.id)) };
}
/**
 * Read an encounter file: fresh ids for everything (nothing is overwritten),
 * map references follow. Returns { encounters, maps } or null.
 */
export function readEncounterFile(raw, makeId) {
  if (!raw || raw.mechatronEncounters !== 1 || !Array.isArray(raw.encounters)) return null;
  const mapIds = {};
  const maps = (Array.isArray(raw.maps) ? raw.maps : []).map((m) => {
    const n = normalizeMap({ ...m, id: '' }, makeId);
    if (m && m.id) mapIds[m.id] = n.id;
    return n;
  });
  const encounters = raw.encounters.map((e) => normalizeEncounter({ ...e, id: '', mapId: mapIds[e?.mapId] ?? null }, makeId));
  return { encounters, maps };
}

// ---------- quick setups ----------
// Four original layouts, 20 × 14 squares (room for Longue range across), each
// with spawn zones (a = team, e = adversaries) and a suggested mix of the
// book's NPC templates. Launching one copies its map into the campaign.
const rows = (...r) => r.join('');
export const PRESETS = [
  {
    id: 'preset-couloir', name: 'Couloir de service', tags: ['embuscade', 'intérieur'], surprise: 'enemies',
    notes: "Les gardes attendent dans les locaux techniques de part et d'autre du couloir : embuscade.",
    enemies: [{ template: 'guard', count: 2, side: 'enemy' }, { template: 'sentinel', count: 1, side: 'enemy' }],
    map: { w: 20, h: 14, cells: rows(
      '####################',
      '#e.m#....#e...#..m.#',
      '#...#..m.#....#....#',
      '#...d....#....d....#',
      '##/####/####/####/##',
      '#aa................#',
      '#aa......m.........#',
      '#aa................#',
      '##/####/####/####/##',
      '#...#....#....#....#',
      '#.m.d..e.#..m.d.e..#',
      '#...#....#....#....#',
      '#...#.m..#....#....#',
      '####################') }
  },
  {
    id: 'preset-quai', name: 'Quai', tags: ['extérieur', 'eau'], surprise: 'none',
    notes: "Caisses sur le quai, eau des deux côtés de la jetée. Ce qui sort de l'eau arrive par la jetée.",
    enemies: [{ template: 'rotfish', count: 2, side: 'enemy' }, { template: 'zone-rats', count: 1, side: 'enemy' }],
    map: { w: 20, h: 14, cells: rows(
      '....................',
      '.aa....m.......mm...',
      '.aa....m....e.......',
      '.aa.........e..m....',
      '.....mm.............',
      '.....mm......mm.....',
      '...........e.mm..e..',
      '..m.................',
      '..m.....mmm.........',
      '~~~~~...........~~~~',
      '~~~~~~~~..~~~~~~~~~~',
      '~~~~~~~~..~~~~~~~~~~',
      '~~~~~~~~..~~~~~~~~~~',
      '~~~~~~~~ee~~~~~~~~~~') }
  },
  {
    id: 'preset-reacteur', name: 'Salle du réacteur', tags: ['intérieur', 'danger'], surprise: 'none',
    notes: 'Passerelles entre les bassins de refroidissement ; autour du cœur, le sol brûlant ralentit (terrain difficile).',
    enemies: [{ template: 'guard', count: 1, side: 'enemy' }, { template: 'lumadrone', count: 2, side: 'enemy' }],
    map: { w: 20, h: 14, cells: rows(
      '####################',
      '#aa...~~~~~~~~...ee#',
      '#aa...~~~~~~~~...ee#',
      '#.....~~....~~.....#',
      '#...m.~~.::.~~.m...#',
      '#.......:##:.......#',
      '#~~~~..:####:..~~~~#',
      '#~~~~..:####:..~~~~#',
      '#.......:##:.......#',
      '#...m.~~.::.~~.m...#',
      '#.....~~....~~.....#',
      '#aa...~~~~~~~~...ee#',
      '#aa...~~~~~~~~...ee#',
      '####################') }
  },
  {
    id: 'preset-entrepot', name: 'Entrepôt', tags: ['intérieur', 'couverture'], surprise: 'none',
    notes: 'Rayonnages pleins (ils cachent la vue), caisses entre les allées, une porte blindée ouverte en bouclier.',
    enemies: [{ template: 'storage', count: 2, side: 'enemy' }, { template: 'guard', count: 1, side: 'enemy' }],
    map: { w: 20, h: 14, cells: rows(
      '####################',
      '#aa................#',
      '#aa..####...####...#',
      '#aa.m..........m..e#',
      '#....####...####...#',
      '#..................#',
      '#b...####.m.####...#',
      '#..................#',
      '#....####...####...#',
      '#..m............m..#',
      '#....####...####..e#',
      '#.................e#',
      '#.........m....d..e#',
      '####################') }
  }
];
