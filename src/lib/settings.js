// One accessor for every rule value: book (GAME_DATA.rules) ← house rules ← the
// campaign's GM overrides, deep-merged in that order. Wired into the store in T03.
import { GAME_DATA as D } from './data.js';
import { HOUSE } from './house.js';

let overrides = {};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}

/** Set the active campaign's GM overrides (called by the store). */
export function setRuleOverrides(obj) { overrides = isObj(obj) ? obj : {}; }

/** Book rules, then house rules, then GM overrides. */
export function getRules() { return merge(merge(D.rules, HOUSE), overrides); }
