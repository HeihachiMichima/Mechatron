// Campaign files and automatic backups (T04). Pure helpers: the store calls
// them, tests call them with a fake storage.
import { VERSION } from './store.svelte.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * What an imported JSON file is:
 * - 'campaign': { campaign, chars[] } with version 3 (replaces the current campaign);
 * - 'old': a campaign/table file of another version (refused);
 * - 'robot': one robot (an object with `name` and `programRatings`), added to the team;
 * - 'unknown': anything else.
 */
export function classifyImport(raw) {
  if (!isObj(raw)) return 'unknown';
  if ('campaign' in raw || Array.isArray(raw.chars)) {
    return raw.version === VERSION && isObj(raw.campaign) && Array.isArray(raw.chars) ? 'campaign' : 'old';
  }
  if (typeof raw.name === 'string' && isObj(raw.programRatings)) return 'robot';
  return 'unknown';
}

/** « Ghost in the Machine » → ghost-in-the-machine.mechatron.json */
export function campaignFileName(name) {
  const s = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${s || 'campagne'}.mechatron.json`;
}

// ---------- automatic backups ----------
// Three slots, mechatron-v3-backup-1 (newest) … -3 (oldest). Each holds
// { at, reason, name, robots, data } where data is a whole save.
export const BACKUP_SLOTS = 3;
const slotKey = (n) => `mechatron-v3-backup-${n}`;

function readSlot(storage, n) {
  try {
    const b = JSON.parse(storage.getItem(slotKey(n)) || 'null');
    return isObj(b) && isObj(b.data) ? b : null;
  } catch { return null; }
}

/** The backups, newest first: [{ n, at, reason, name, robots }]. */
export function listBackups(storage) {
  const out = [];
  for (let n = 1; n <= BACKUP_SLOTS; n++) {
    const b = readSlot(storage, n);
    if (b) out.push({ n, at: String(b.at || ''), reason: String(b.reason || ''), name: String(b.name || ''), robots: Number(b.robots) || 0 });
  }
  return out;
}

/** The save held in slot n, or null. */
export const backupData = (storage, n) => readSlot(storage, n)?.data ?? null;

/**
 * Keep a copy of `data` (a plain save object) in slot 1, shifting the others
 * down (the oldest is dropped). With `ifChanged`, nothing happens when the
 * newest backup already holds the same data. Returns true when a copy was made.
 * Storage errors (quota, private browsing) are swallowed: a backup is a bonus.
 */
export function makeBackup(storage, data, { reason = '', ifChanged = false, now = new Date() } = {}) {
  try {
    const json = JSON.stringify(data);
    if (ifChanged && JSON.stringify(readSlot(storage, 1)?.data ?? null) === json) return false;
    for (let n = BACKUP_SLOTS; n > 1; n--) {
      const prev = storage.getItem(slotKey(n - 1));
      if (prev != null) storage.setItem(slotKey(n), prev);
    }
    const entry = { at: now.toISOString(), reason, name: data?.campaign?.name || '', robots: Array.isArray(data?.chars) ? data.chars.length : 0, data };
    storage.setItem(slotKey(1), JSON.stringify(entry));
    return true;
  } catch { return false; }
}

/** Read a chosen .json file: { kind, data } (kind from classifyImport; 'unknown' when unreadable). */
export async function readImport(file) {
  try {
    const data = JSON.parse(await file.text());
    return { kind: classifyImport(data), data };
  } catch { return { kind: 'unknown', data: null }; }
}

export const NOT_MECHATRON = "Ce fichier n'est ni une campagne ni un robot Mechatron (.json).";

/** « 11 oct. 2026, 14:32 » */
export const backupDate = (at) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? 'date inconnue' : d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
};
const REASONS = { Ouverture: "à l'ouverture", 'Avant remplacement': 'avant remplacement', 'Fin de séance': 'fin de séance' };
/** One line describing a backup: « Démo, 7 robots, à l'ouverture » */
export function backupLabel(b) {
  const parts = [b.name || 'Campagne sans nom', `${b.robots} robot${b.robots > 1 ? 's' : ''}`];
  if (b.reason) parts.push(REASONS[b.reason] || b.reason);
  return parts.join(', ');
}
