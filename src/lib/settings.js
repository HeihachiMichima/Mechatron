// One accessor for every rule value: book (GAME_DATA.rules + xpQuestions) ← house
// rules ← the campaign's GM overrides (campaign.rules), deep-merged in that order.
// Also the shared DEV levels (campaign.dev). The store binds the campaign source
// at startup; without it (unit tests), book and house values apply.
import { GAME_DATA as D } from './data.js';
import { HOUSE } from './house.js';

const BOOK = { ...D.rules, xpQuestions: D.xpQuestions };
const DEV_KEYS = ['Energie', 'Production', 'Défense', 'Information'];

let source = () => null;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}

/** Tell the accessors where the current campaign lives (called by the store; tests may call it too). */
export function bindCampaign(fn) { source = typeof fn === 'function' ? fn : () => null; }

/** The current campaign object, or null. */
export const getCampaign = () => source();

/** Book rules, then house rules, then GM overrides. */
export function getRules() { return merge(merge(BOOK, HOUSE), source()?.rules); }

/** Default DEV levels at campaign start (book p.107). */
export const defaultDev = () => Object.fromEntries(DEV_KEYS.map((k) => [k, D.rules.devStart]));

/** The collective's DEV levels, shared by every robot of the campaign. */
export function getDev() { return source()?.dev ?? defaultDev(); }
