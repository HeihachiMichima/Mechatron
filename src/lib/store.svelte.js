// Single source of truth: the campaign (shared DEV levels, journal, GM rules…),
// every robot (PCs and GM NPCs), the active one and the combat in progress.
// Autosaves to localStorage (debounced, flushed when the page is hidden);
// commit*() make discrete changes undoable. No support for older saves (§2.5).
import { GAME_DATA as D } from './data.js';
import { ATTRS, epMax, findWeapon } from './rules.js';
import { random } from './rng.js';
import { bindCampaign, defaultDev, getRules } from './settings.js';
import { makeBackup, listBackups, backupData } from './campaign.js';

export const VERSION = 3;
const KEY = 'mechatron-v3';
const UI_KEY = 'mechatron-ui-v3';
// Keys of earlier versions: deleted at startup, never read (no user base to migrate).
const OLD_KEYS = ['mechatron-roster-v3', 'mechatron-ui-v2', 'mechatron-sheet-v2', 'mechatron-sheet-v1'];
export const OLD_SAVE = "Sauvegarde d'une ancienne version, impossible à ouvrir";
const SAVE_FAILED = 'Sauvegarde impossible : exportez la campagne';
const UNDO_LIMIT = 40;
export const THEME_LABEL = { auto: 'Thème : automatique', dark: 'Thème : sombre', light: 'Thème : clair' };
export const THEME_ICON = { auto: 'auto', dark: 'moon', light: 'sun' };

/** The app's spaces, in the order of play (T05). `mj` only exists in GM mode. */
export const SPACES = ['equipe', 'energie', 'marche', 'combat', 'seance', 'mj'];
/** The four parts of a robot's fiche (segmented control). */
export const FICHE_TABS = ['etat', 'programmes', 'materiel', 'robot'];

export const newId = () => Math.random().toString(36).slice(2, 10);

export function blankCharacter(kind = 'pc') {
  return {
    version: 2, id: newId(), kind, color: '', body: 'robot', statMode: 'chassis', group: '', template: '',
    direct: { servos: 0, stabilite: 0, processeur: 0, reseau: 0, armor: 0, slots: 0 },
    name: '', player: '', model: '',
    head: '', torso: '', undercarriage: '',
    hate: '', protect: '', dream: '', buddy: '',
    hierarchy: '',
    damage: { servos: 0, stabilite: 0, processeur: 0, reseau: 0 },
    armorDamage: 0, cover: 0,
    ep: { current: getRules().startEp }, xp: { current: 0 },
    programRatings: {}, specialRating: 0, customPrograms: [],
    secondary: [], modules: [], brokenModules: [], equipment: [], weapons: [],
    notes: '', online: true
  };
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const copy = (v) => JSON.parse(JSON.stringify(v));

export function normalize(raw) {
  const b = blankCharacter();
  if (!raw || typeof raw !== 'object') return b;
  const c = { ...b };
  c.id = typeof raw.id === 'string' && raw.id ? raw.id : newId();
  c.kind = raw.kind === 'npc' ? 'npc' : 'pc';
  c.body = ['robot', 'drone', 'creature'].includes(raw.body) ? raw.body : 'robot';
  c.statMode = raw.statMode === 'direct' ? 'direct' : 'chassis';
  c.group = str(raw.group); c.template = str(raw.template);
  c.color = /^#[0-9a-f]{6}$/i.test(raw.color || '') ? raw.color : '';
  c.direct = { ...b.direct };
  Object.keys(b.direct).forEach((k) => (c.direct[k] = Math.max(0, num(raw.direct?.[k]))));
  ['name', 'player', 'model', 'head', 'torso', 'undercarriage', 'hate', 'protect', 'dream', 'buddy', 'notes'].forEach((k) => (c[k] = str(raw[k])));
  c.programRatings = {};
  Object.entries(raw.programRatings || {}).forEach(([k, v]) => (c.programRatings[k] = num(v)));
  c.specialRating = num(raw.specialRating);
  c.customPrograms = arr(raw.customPrograms).map((p) => ({ label: str(p?.label), rating: num(p?.rating), attr: p?.attr || null }));
  c.secondary = arr(raw.secondary).map(str);
  c.modules = arr(raw.modules).map(str);
  c.brokenModules = arr(raw.brokenModules).map((i) => num(i, -1)).filter((i) => i >= 0 && i < c.modules.length);
  c.equipment = arr(raw.equipment).map((e) => (typeof e === 'string' ? { name: e, integre: false } : { name: str(e?.name), integre: !!e?.integre }));
  // power/empty/crankDue: energy weapon power source state (book p.86).
  c.weapons = arr(raw.weapons).map((w) => ({ name: str(w?.name), bonus: w?.bonus ?? '', degats: w?.degats ?? '', portee: str(w?.portee), note: str(w?.note), power: ['epack', 'internal', 'crank'].includes(w?.power) ? w.power : 'epack', empty: !!w?.empty, crankDue: !!w?.crankDue, oneUse: !!w?.oneUse, spent: !!w?.spent }));
  c.online = raw.online !== false;
  c.ep = { current: num(raw.ep?.current, b.ep.current) };
  c.xp = { current: num(raw.xp?.current) };
  c.hierarchy = str(raw.hierarchy);
  ATTRS.forEach((a) => (c.damage[a] = Math.max(0, num(raw.damage?.[a]))));
  c.armorDamage = Math.max(0, num(raw.armorDamage));
  c.cover = num(raw.cover);
  c.equipment = c.equipment.filter((e) => e.name);
  c.weapons = c.weapons.filter((w) => w.name);
  return c;
}

/** Build an NPC from a book template (stats entered directly). */
export function fromTemplate(t, name) {
  const c = blankCharacter('npc');
  c.body = t.body; c.statMode = 'direct'; c.template = t.id;
  c.name = name || t.name;
  const [s, st, p, n] = t.attrs;
  c.direct = { servos: s, stabilite: st, processeur: p, reseau: n, armor: t.armor, slots: t.modules.length };
  c.programRatings = { ...t.programs };
  c.customPrograms = (t.extra || []).map((x) => ({ ...x }));
  c.secondary = [...t.secondary];
  c.modules = [...t.modules];
  c.weapons = t.weapons.map((w) => {
    if (typeof w !== 'string') return { name: w.name, bonus: w.bonus ?? '', degats: w.degats ?? '', portee: w.portee || '', note: w.note || '' };
    const ref = D.weapons.find((x) => x.name === w);
    return { name: w, bonus: ref?.bonus ?? '', degats: ref?.degats ?? '', portee: ref?.portee ?? '', note: '' };
  });
  c.notes = [t.gear ? `Équipement : ${t.gear}` : '', t.note || ''].filter(Boolean).join('\n');
  c.online = t.body !== 'creature';
  return c;
}

// held: { by, how, mod, with } while immobilized; extra: { round, used: [module] }
// for bonus attacks; defenses: defenses this round; protectRound: last round
// the Protect program was used (once per round).
export const newCombatant = (cid, side) => ({ id: newId(), cid, side, init: null, tie: random(), acted: false, defending: false, overwatch: false, surprise: false, lostAction: false, prone: false, fled: false, lock: null, initBonus: 0, held: null, extra: null, defenses: 0, protectRound: 0 });

export function blankCombat() {
  return { phase: 'prep', active: false, round: 1, turn: 0, combatants: [], log: [], gmPool: 0, usePool: true };
}
function normalizeCombat(raw, ids) {
  const b = blankCombat();
  if (!raw || typeof raw !== 'object') return b;
  const phase = ['prep', 'init', 'fight'].includes(raw.phase) ? raw.phase : raw.active ? 'fight' : 'prep';
  return {
    phase, active: phase === 'fight', round: Math.max(1, num(raw.round, 1)), turn: Math.max(0, num(raw.turn)),
    combatants: arr(raw.combatants).filter((x) => ids.has(x?.cid)).map((x) => ({
      id: str(x.id) || newId(), cid: x.cid, side: x.side === 'enemy' ? 'enemy' : 'ally',
      init: x.init == null ? null : num(x.init), tie: num(x.tie, random()),
      acted: !!x.acted, defending: !!x.defending, overwatch: !!x.overwatch,
      surprise: !!x.surprise, lostAction: !!x.lostAction, prone: !!x.prone, fled: !!x.fled,
      lock: x.lock && x.lock.target ? { target: str(x.lock.target), atk: num(x.lock.atk, 1), dmg: num(x.lock.dmg) } : null,
      initBonus: num(x.initBonus),
      held: x.held && typeof x.held === 'object' ? { by: str(x.held.by), how: str(x.held.how), mod: num(x.held.mod), with: str(x.held.with) } : null,
      extra: x.extra && typeof x.extra === 'object' ? { round: num(x.extra.round), used: arr(x.extra.used).map(str) } : null,
      defenses: Math.max(0, num(x.defenses)), protectRound: num(x.protectRound)
    })),
    log: arr(raw.log).slice(-60).map((l) => ({ round: num(l?.round, 1), text: str(l?.text) })),
    gmPool: Math.max(0, num(raw.gmPool)), usePool: raw.usePool !== false
  };
}

/**
 * Make `n` copies of NPC `src` (fresh ids, same stats, no damage) inside a
 * commit. Names are numbered after the original ("Garde 1" → "Garde 2"…; an
 * unnumbered original becomes "… 1"). Copies share the original's group, so
 * they roll one initiative together (book p.80). In combat they join on the
 * same side, with the same initiative if it was already rolled.
 */
export function addCopies(data, src, n) {
  const base = (src.name || 'PNJ').replace(/\s+\d+$/, '').trim() || 'PNJ';
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc}\\s+(\\d+)$`);
  let max = Math.max(0, ...data.chars.map((c) => Number(re.exec(c.name || '')?.[1] || 0)));
  if (!re.test(src.name || '')) src.name = `${base} ${++max}`;
  if (!src.group) src.group = newId();
  const sx = data.combat.combatants.find((x) => x.cid === src.id);
  const made = Array.from({ length: n }, () => {
    const c = normalize(JSON.parse(JSON.stringify(src)));
    c.id = newId();
    while (data.chars.some((y) => y.id === c.id)) c.id = newId();
    c.name = `${base} ${++max}`;
    c.color = '';
    c.damage = { servos: 0, stabilite: 0, processeur: 0, reseau: 0 };
    c.armorDamage = 0; c.cover = 0; c.brokenModules = [];
    c.weapons = c.weapons.map((w) => ({ ...w, empty: false, crankDue: false, spent: false }));
    data.chars.push(c);
    if (sx) { const x = newCombatant(c.id, sx.side); x.init = sx.init; x.surprise = sx.surprise; data.combat.combatants.push(x); }
    return c;
  });
  return made;
}

/**
 * Put every robot back in full working order (inside a commit): no damage,
 * armor and modules repaired, no cover, EP refilled, energy weapons reloaded,
 * Gear Bonus lost to pushing restored up to the book value. In a combat, the
 * temporary states (held, prone, lost action, defending) are cleared too;
 * initiative, target locks and the GM pool are left alone.
 */
export function restoreAll(data, kind) {
  // kind: 'pc' | 'npc' limits the reset to the team or to the GM's NPCs.
  const chars = kind ? data.chars.filter((c) => (c.kind === 'npc') === (kind === 'npc')) : data.chars;
  const ids = new Set(chars.map((c) => c.id));
  chars.forEach((c) => {
    c.damage = { servos: 0, stabilite: 0, processeur: 0, reseau: 0 };
    c.armorDamage = 0;
    c.cover = 0;
    c.brokenModules = [];
    if (c.body !== 'creature') c.ep.current = epMax(c);
    c.weapons.forEach((w) => {
      w.empty = false; w.crankDue = false; w.spent = false;
      const ref = findWeapon(w.name);
      if (ref && typeof ref.bonus === 'number' && (Number(w.bonus) || 0) < ref.bonus) w.bonus = ref.bonus;
    });
  });
  data.combat.combatants.filter((x) => ids.has(x.cid)).forEach((x) => { x.held = null; x.prone = false; x.lostAction = false; x.defending = false; x.defenses = 0; });
  return chars.length;
}

/** Give a player robot the first tab color not already taken. */
export function ensureColor(chars, c) {
  if (c.kind === 'npc' || c.color) return;
  const used = new Set(chars.filter((x) => x !== c && x.kind !== 'npc').map((x) => x.color));
  const free = D.pcColors.find((p) => !used.has(p.hex));
  c.color = (free ?? D.pcColors[chars.filter((x) => x.kind !== 'npc').indexOf(c) % D.pcColors.length] ?? D.pcColors[0]).hex;
}

// ---------- campaign ----------
// clock (T07), market (T09), xp (T11), maps (T13) and encounters (T15) are
// placeholders until their ticket: kept as plain JSON so nothing is lost.

/** A new, empty campaign (DEV levels at the book's starting value). */
export function blankCampaign(name = '') {
  const now = new Date().toISOString();
  return {
    name, createdAt: now, updatedAt: now,
    phase: 'creation',
    dev: defaultDev(),
    rules: {},
    journal: [],
    clock: null, market: null, xp: { log: [] },
    maps: [], encounters: []
  };
}

function normalizeJournal(list) {
  return arr(list).filter(isObj).map((j) => {
    const e = { at: str(j.at), text: str(j.text) };
    if (j.day != null && j.day !== '' && Number.isFinite(Number(j.day))) e.day = Number(j.day);
    return e;
  }).filter((e) => e.text);
}

export function normalizeCampaign(raw) {
  const b = blankCampaign();
  if (!isObj(raw)) return b;
  const dev = {};
  Object.keys(b.dev).forEach((k) => (dev[k] = Math.max(0, Math.min(D.defaults.devMax, num(raw.dev?.[k], b.dev[k])))));
  return {
    name: str(raw.name),
    createdAt: str(raw.createdAt) || b.createdAt,
    updatedAt: str(raw.updatedAt) || b.updatedAt,
    phase: raw.phase === 'play' ? 'play' : 'creation',
    dev,
    rules: isObj(raw.rules) ? copy(raw.rules) : {},
    journal: normalizeJournal(raw.journal),
    clock: isObj(raw.clock) ? copy(raw.clock) : null,
    market: isObj(raw.market) ? copy(raw.market) : null,
    xp: { log: arr(raw.xp?.log).filter(isObj).map(copy) },
    maps: arr(raw.maps).filter(isObj).map(copy),
    encounters: arr(raw.encounters).filter(isObj).map(copy)
  };
}

/** Append a journal line (inside a commit). extra: { day } */
export function pushJournal(data, text, extra = {}) {
  const e = { at: new Date().toISOString(), text: str(text).trim() };
  if (extra.day != null) e.day = num(extra.day);
  if (e.text) data.campaign.journal.push(e);
}

/** A save this version can open: version 3 with a campaign (2.x tables also said version 3). */
export const isCurrentSave = (raw) => raw?.version === VERSION && isObj(raw.campaign);

/** Rebuild a whole save from its known fields. No robot is created: the team can be empty. */
export function normalizeAll(raw) {
  const chars = arr(raw?.chars).map(normalize);
  chars.forEach((c) => ensureColor(chars, c));
  const seen = new Set();
  chars.forEach((c) => { while (seen.has(c.id)) c.id = newId(); seen.add(c.id); });
  const activeId = seen.has(raw?.activeId) ? raw.activeId : chars[0]?.id ?? null;
  return { version: VERSION, campaign: normalizeCampaign(raw?.campaign), chars, activeId, combat: normalizeCombat(raw?.combat, seen) };
}

/** localStorage, or null where it is missing or blocked (tests, some private modes). */
function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * The saved campaign, if any. `started: false` means there is no campaign yet:
 * the welcome screen shows and nothing is saved until one is created (T04).
 */
function load() {
  try {
    for (const k of OLD_KEYS) localStorage.removeItem(k);
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (isCurrentSave(d)) return { data: normalizeAll(d), started: true };
      return { data: normalizeAll({}), started: false, stale: true };
    }
  } catch (e) { /* storage blocked or corrupt — start fresh */ }
  return { data: normalizeAll({}), started: false };
}

/**
 * UI prefs of this device (never in the campaign): space, fiche tab, theme and
 * GM mode. Unknown values fall back to the defaults.
 */
export function cleanUi(raw) {
  const r = isObj(raw) ? raw : {};
  return {
    space: SPACES.includes(r.space) ? r.space : 'equipe',
    tab: FICHE_TABS.includes(r.tab) ? r.tab : 'etat',
    theme: ['auto', 'dark', 'light'].includes(r.theme) ? r.theme : 'auto',
    gm: r.gm === true
  };
}
function loadUi() {
  try { return cleanUi(JSON.parse(localStorage.getItem(UI_KEY) || '{}')); }
  catch { return cleanUi({}); }
}

/** Pay EP for a robot: NPCs draw from the GM pool when it's enabled (p.73). */
export function payEp(data, c, n) {
  if (n <= 0) return;
  if (c.kind === 'npc' && data.combat.usePool) data.combat.gmPool = Math.max(0, data.combat.gmPool - n);
  else c.ep.current = Math.max(0, c.ep.current - n);
}
export function availableEp(data, c) {
  return c.kind === 'npc' && data.combat.usePool ? data.combat.gmPool : c.ep.current;
}

/**
 * Undo snapshot: the whole save minus maps and encounters (they keep their own
 * saves, T13/T15) — except before a whole-campaign replacement (`full`), so
 * undoing an import also brings the previous maps back.
 */
function snapshotOf(data, full = false) {
  const s = $state.snapshot(data);
  if (full) return JSON.stringify(s);
  const { maps, encounters, ...campaign } = s.campaign;
  return JSON.stringify({ ...s, campaign });
}

class Store {
  data = $state(null);
  /** False until a campaign exists (welcome screen; no autosave meanwhile). */
  started = $state(false);
  // npc: the NPC whose fiche is open in the MJ space (null = the NPC list);
  // pc: the last PC shown in Équipe, to come back to it; peek: an NPC whose fiche
  // is open inside Combat (any GM mode), until « Retour au combat ». None is saved.
  ui = $state({ ...loadUi(), npc: null, pc: null, peek: null, sheet: null, turn: null, turnActor: null });
  toast = $state(null);
  incoming = $state(null);
  #history = [];
  #timer;
  #typingKey = null;
  #pending = null;
  #saveTimer;
  #saveFailed = false;

  constructor() {
    const { data, started, stale } = load();
    this.data = data;
    this.started = started;
    // Startup backup, only when the save changed since the newest one.
    if (started) makeBackup(storage(), JSON.parse(JSON.stringify(data)), { reason: 'Ouverture', ifChanged: true });
    bindCampaign(() => this.data.campaign);
    if (stale) queueMicrotask(() => this.notify(OLD_SAVE));
    $effect.root(() => {
      // Autosave: serialize on every change (deep tracking), write after 300 ms of calm.
      $effect(() => {
        this.#pending = JSON.stringify(this.data);
        clearTimeout(this.#saveTimer);
        this.#saveTimer = setTimeout(() => this.flush(), 300);
      });
      $effect(() => {
        const { space, tab, theme, gm } = this.ui;
        try { localStorage.setItem(UI_KEY, JSON.stringify({ space, tab, theme, gm })); } catch {}
      });
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flush());
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(); });
    }
  }

  /** Write the pending save now (also on pagehide / tab hidden). */
  flush() {
    clearTimeout(this.#saveTimer);
    if (this.#pending == null || !this.started) return;
    const json = this.#pending;
    this.#pending = null;
    try {
      localStorage.setItem(KEY, json);
      this.#saveFailed = false;
    } catch {
      if (!this.#saveFailed) this.notify(SAVE_FAILED);
      this.#saveFailed = true;
    }
  }

  /** The active robot, or null when the team is empty. */
  get c() { return this.data.chars.find((x) => x.id === this.data.activeId) ?? this.data.chars[0] ?? null; }
  get chars() { return this.data.chars; }
  get combat() { return this.data.combat; }
  get campaign() { return this.data.campaign; }
  char(id) { return this.data.chars.find((x) => x.id === id); }

  /** The space shown: `mj` falls back to `equipe` outside GM mode. */
  get space() { return this.ui.space === 'mj' && !this.ui.gm ? 'equipe' : this.ui.space; }
  /**
   * The robot whose fiche is on screen: the active PC in Équipe, the open NPC in
   * MJ (GM mode), otherwise null (the other spaces have no fiche).
   */
  get fiche() {
    const c = this.c;
    if (!c) return null;
    if (this.space === 'equipe') return c.kind !== 'npc' ? c : null;
    if (this.space === 'mj') return this.ui.npc && c.id === this.ui.npc && c.kind === 'npc' ? c : null;
    if (this.space === 'combat') return this.ui.peek && c.id === this.ui.peek ? c : null;
    return null;
  }
  /**
   * Go to a space (and optionally a fiche tab). Équipe only shows PCs: an
   * active NPC gives way to the first PC. MJ needs GM mode.
   */
  go(space, tab) {
    if (!SPACES.includes(space) || (space === 'mj' && !this.ui.gm)) space = 'equipe';
    this.ui.space = space;
    this.ui.peek = null; // any move (Combat included) closes an NPC fiche opened in Combat
    if (FICHE_TABS.includes(tab)) this.ui.tab = tab;
    this.syncFiche();
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  }
  /**
   * Keep the active robot in line with the space (App runs it on every change:
   * an undo or a combat sheet can activate another robot). Équipe shows the last
   * PC seen there; MJ shows the open NPC, and follows it to Équipe if it became a PC.
   */
  syncFiche() {
    const c = this.c;
    if (this.space === 'equipe') {
      if (c && c.kind !== 'npc') { if (this.ui.pc !== c.id) this.ui.pc = c.id; return; }
      const last = this.char(this.ui.pc);
      const pc = last && last.kind !== 'npc' ? last : this.data.chars.find((x) => x.kind !== 'npc');
      if (pc) this.data.activeId = pc.id;
    } else if (this.space === 'mj' && this.ui.npc) {
      const n = this.char(this.ui.npc);
      if (!n) this.ui.npc = null;
      else if (n.kind !== 'npc') { this.ui.npc = null; this.openFiche(n.id); }
      else if (this.data.activeId !== n.id) this.data.activeId = n.id;
    } else if (this.space === 'combat' && this.ui.peek) {
      const n = this.char(this.ui.peek);
      if (!n) this.ui.peek = null;
      else if (this.data.activeId !== n.id) this.data.activeId = n.id;
    }
  }
  /**
   * Open robot `id`'s fiche where it lives: PCs in Équipe, NPCs in MJ. From
   * Combat, an NPC's fiche opens in place, in both GM modes (combat is the same
   * for everyone). Elsewhere an NPC's fiche needs GM mode; returns false when it
   * can't be opened.
   */
  openFiche(id, tab) {
    const c = this.char(id);
    if (!c) return false;
    if (c.kind === 'npc' && this.space === 'combat') {
      this.data.activeId = id;
      this.ui.peek = id;
      if (FICHE_TABS.includes(tab)) this.ui.tab = tab;
      if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
      return true;
    }
    if (c.kind === 'npc' && !this.ui.gm) return false;
    this.data.activeId = id;
    if (c.kind === 'npc') this.ui.npc = id;
    else this.ui.pc = id;
    this.go(c.kind === 'npc' ? 'mj' : 'equipe', tab);
    return true;
  }
  /** « Mode MJ » switch (per device). Turning it off leaves the MJ space. */
  setGm(on) {
    this.ui.gm = !!on;
    if (!on) { this.ui.npc = null; if (this.ui.space === 'mj') this.go('equipe'); }
    this.notify(on ? 'Mode MJ activé' : 'Mode MJ désactivé');
  }

  snapshot() { return this.c ? JSON.stringify($state.snapshot(this.c)) : 'null'; }
  #push(full = false) {
    this.#typingKey = null;
    this.#history.push(snapshotOf(this.data, full));
    if (this.#history.length > UNDO_LIMIT) this.#history.shift();
  }
  /** After any change: date the campaign and keep activeId pointing at a robot (or null). */
  #touch() {
    this.data.campaign.updatedAt = new Date().toISOString();
    if (!this.char(this.data.activeId)) this.data.activeId = this.data.chars[0]?.id ?? null;
  }

  /** Discrete change to the active robot; undoable. Does nothing when there is no robot. */
  commit(label, fn) { if (this.c) this.commitOn(this.c.id, label, fn); }
  /** Discrete change to a given robot. fn(char, data). */
  commitOn(id, label, fn) {
    const ch = this.char(id) ?? this.c;
    if (!ch) return;
    this.#push();
    fn(ch, this.data);
    this.#touch();
    if (label) this.notify(label, true);
  }
  /** Discrete change to the whole table (campaign, roster, combat). */
  commitAll(label, fn) {
    this.#push();
    fn(this.data);
    this.#touch();
    if (label) this.notify(label, true);
  }
  /**
   * Text typed into a field of robot `id`: consecutive keystrokes in the same
   * field make a single undo step (no toast). fn(char, data).
   */
  type(id, field, fn) {
    const ch = this.char(id);
    if (!ch) return;
    const key = `${id}:${field}`;
    if (this.#typingKey !== key) {
      this.#push();
      this.#typingKey = key;
      // The visible « Annuler » would now undo this typing, not the action it names.
      if (this.toast?.undoable) this.toast = null;
    }
    fn(ch, this.data);
    this.#touch();
  }

  /** Add a line to the campaign journal (undoable). extra: { day } */
  addJournal(text, extra) {
    if (!str(text).trim()) return;
    this.commitAll('Ajouté au journal', (d) => pushJournal(d, text, extra));
  }

  /** Add a robot (imported, blank or from a template); optionally make it active. */
  addChar(raw, { activate = true, label } = {}) {
    const c = normalize(raw);
    while (this.char(c.id)) c.id = newId();
    ensureColor(this.data.chars, c);
    this.commitAll(label ?? null, (d) => { d.chars.push(c); if (activate || !d.activeId) d.activeId = c.id; });
    return c.id;
  }
  activate(id) { if (this.char(id)) this.data.activeId = id; }
  removeChar(id) {
    const c = this.char(id);
    if (!c) return;
    this.commitAll(`${c.name || 'Robot'} supprimé`, (d) => {
      d.chars = d.chars.filter((x) => x.id !== id);
      d.combat.combatants = d.combat.combatants.filter((x) => x.cid !== id);
      if (d.activeId === id) d.activeId = d.chars[0]?.id ?? null;
    });
  }
  /**
   * Replace the whole save (campaign file, new campaign, backup). Refuses other
   * versions; returns true when done. Undoable; unless `backup: false`, the
   * current campaign is first copied to the automatic backups.
   */
  replaceAll(raw, label, { backup = true } = {}) {
    if (!isCurrentSave(raw)) { this.notify(OLD_SAVE); return false; }
    if (backup && this.started) this.backup('Avant remplacement');
    this.#push(true);
    this.data = normalizeAll(raw);
    this.started = true;
    if (label) this.notify(label, true);
    return true;
  }

  /**
   * Open the first campaign from the welcome screen (new, demo or file): no
   * undo back to the welcome screen. Saves at once and asks the browser to keep
   * the data (navigator.storage.persist). Returns true when done.
   */
  start(raw, label) {
    if (!isCurrentSave(raw)) { this.notify(OLD_SAVE); return false; }
    this.#history = [];
    this.#typingKey = null;
    this.data = normalizeAll(raw);
    this.started = true;
    this.#pending = JSON.stringify(this.data);
    this.flush();
    try { navigator.storage?.persist?.().catch(() => {}); } catch {}
    if (label) this.notify(label);
    return true;
  }

  /** The whole campaign as a plain object, for « Exporter la campagne » (maps included). */
  exportData() { return JSON.parse(JSON.stringify($state.snapshot(this.data))); }

  renameCampaign(name) {
    const n = str(name).trim();
    if (n === this.data.campaign.name) return;
    this.commitAll('Campagne renommée', (d) => (d.campaign.name = n));
  }

  /** Copy the current campaign to the automatic backups (startup, end of session in T11…). */
  backup(reason = '') { return this.started && makeBackup(storage(), this.exportData(), { reason }); }
  /** The automatic backups, newest first: [{ n, at, reason, name, robots }]. */
  backups() { return listBackups(storage()); }
  /** Replace the campaign with backup n (undoable). */
  restoreBackup(n) {
    const d = backupData(storage(), n);
    if (!d) { this.notify('Cette sauvegarde est illisible.'); return false; }
    if (!this.started) return this.start(d, 'Sauvegarde restaurée');
    return this.replaceAll(d, 'Sauvegarde restaurée', { backup: false });
  }

  /** Theme button: auto → dark → light. */
  cycleTheme() {
    const themes = ['auto', 'dark', 'light'];
    this.ui.theme = themes[(themes.indexOf(this.ui.theme) + 1) % 3];
    this.notify(THEME_LABEL[this.ui.theme]);
  }

  log(text) {
    const cb = this.data.combat;
    cb.log.push({ round: cb.round, text });
    if (cb.log.length > 60) cb.log.splice(0, cb.log.length - 60);
  }

  undo() {
    const prev = this.#history.pop();
    if (!prev) return;
    this.#typingKey = null;
    const d = JSON.parse(prev);
    // Maps and encounters are not in ordinary undo snapshots: keep the current ones.
    if (!('maps' in d.campaign)) d.campaign.maps = $state.snapshot(this.data.campaign.maps);
    if (!('encounters' in d.campaign)) d.campaign.encounters = $state.snapshot(this.data.campaign.encounters);
    this.data = normalizeAll(d);
    this.notify('Annulé', false);
  }

  notify(text, undoable = false) {
    clearTimeout(this.#timer);
    this.toast = { text, undoable, id: Math.random() };
    this.#timer = setTimeout(() => (this.toast = null), undoable ? 5000 : 2600);
  }

  open(sheet) { this.ui.sheet = sheet; }
  close() { this.ui.sheet = null; }
}

export const store = new Store();
