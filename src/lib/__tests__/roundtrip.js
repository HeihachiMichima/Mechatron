// Persistence round-trip (plan §2.4): JSON → normalizeAll → JSON.
// Every ticket that adds a persisted field uses it to prove the field survives
// a reload and an undo (both go through normalizeAll).
import { normalizeAll } from '../store.svelte.js';

/** Deep copy without the keys that are allowed to change: `id` and `color`. */
export function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (k !== 'id' && k !== 'color') out[k] = strip(v);
    return out;
  }
  return value;
}

/**
 * Save `data` as JSON, load it back through normalizeAll, and return both
 * sides stripped of `id` and `color`: expect(after).toEqual(before).
 * `loaded` is the raw normalized object, for checks on ids or colors.
 */
export function roundtrip(data) {
  const json = JSON.stringify(data);
  const loaded = normalizeAll(JSON.parse(json));
  return { before: strip(JSON.parse(json)), after: strip(JSON.parse(JSON.stringify(loaded))), loaded };
}
