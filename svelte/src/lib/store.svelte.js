// Single source of truth: every robot (PCs and GM NPCs), the active one,
// and the combat in progress. Autosaves to localStorage; commit() makes
// discrete changes undoable. normalize() accepts v1/v2 character saves.
import { GAME_DATA as D } from './data.js';
import { chassis, ATTRS } from './rules.js';

const KEY = 'mechatron-roster-v3';
const OLD_KEYS = ['mechatron-sheet-v2', 'mechatron-sheet-v1'];
const UI_KEY = 'mechatron-ui-v2';

export const newId = () => Math.random().toString(36).slice(2, 10);

export function blankCharacter(kind = 'pc') {
  const dd = D.defaults.devDefault;
  return {
    version: 2, id: newId(), kind, color: '', body: 'robot', statMode: 'chassis', group: '', template: '',
    direct: { servos: 0, stabilite: 0, processeur: 0, reseau: 0, armor: 0, slots: 0 },
    name: '', player: '', model: '',
    head: '', torso: '', undercarriage: '',
    hate: '', protect: '', dream: '', buddy: '',
    hierarchy: '',
    damage: { servos: 0, stabilite: 0, processeur: 0, reseau: 0 },
    armorDamage: 0, cover: 0,
    ep: { current: D.rules.startEp }, xp: { current: 0 },
    programRatings: {}, specialRating: 0, customPrograms: [],
    secondary: [], modules: [], brokenModules: [], equipment: [], weapons: [],
    notes: '', online: true,
    dev: { Energie: dd, Production: dd, 'Défense': dd, Information: dd }
  };
}

function prefill() {
  const c = blankCharacter('pc');
  c.model = 'battle';
  c.head = 'Pashin Ama 9';
  c.weapons = [{ name: 'Pistolet laser', bonus: 3, degats: 2, portee: 'Longue' }];
  c.modules = ['Lance-grenades', 'Accélérateur', 'Armure réactive'];
  return c;
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

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
  c.weapons = arr(raw.weapons).map((w) => ({ name: str(w?.name), bonus: w?.bonus ?? '', degats: w?.degats ?? '', portee: str(w?.portee), note: str(w?.note), power: ['epack', 'internal', 'crank'].includes(w?.power) ? w.power : 'epack', empty: !!w?.empty, crankDue: !!w?.crankDue }));
  c.online = raw.online !== false;
  c.ep = { current: num(raw.ep?.current, b.ep.current) };
  c.xp = { current: num(raw.xp?.current) };
  c.dev = { ...b.dev };
  if (raw.dev && typeof raw.dev === 'object') Object.keys(b.dev).forEach((k) => {
    const v = raw.dev[k];
    c.dev[k] = typeof v === 'boolean' ? (v ? 75 : b.dev[k]) : Math.max(0, Math.min(100, num(v, b.dev[k])));
  });
  if (raw.version === 2) {
    c.hierarchy = str(raw.hierarchy);
    ATTRS.forEach((a) => (c.damage[a] = Math.max(0, num(raw.damage?.[a]))));
    c.armorDamage = Math.max(0, num(raw.armorDamage));
    c.cover = num(raw.cover);
  } else {
    const ch = chassis(c);
    ATTRS.forEach((a) => { const v = num(raw.attributes?.[a]); c.damage[a] = v > 0 ? Math.max(0, ch.attrMax[a] - v) : 0; });
    const prot = typeof raw.protection === 'number' ? { cover: 0 } : raw.protection || {};
    c.cover = num(prot.cover);
    const m = D.models.find((x) => x.id === c.model);
    const h = str(raw.hierarchy);
    c.hierarchy = m && h === String(m.hierarchy) ? '' : h;
  }
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
export const newCombatant = (cid, side) => ({ id: newId(), cid, side, init: null, tie: Math.random(), acted: false, defending: false, overwatch: false, surprise: false, lostAction: false, prone: false, fled: false, lock: null, initBonus: 0, held: null, extra: null, defenses: 0, protectRound: 0 });

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
      init: x.init == null ? null : num(x.init), tie: num(x.tie, Math.random()),
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

/** Give a player robot the first tab color not already taken. */
export function ensureColor(chars, c) {
  if (c.kind === 'npc' || c.color) return;
  const used = new Set(chars.filter((x) => x !== c && x.kind !== 'npc').map((x) => x.color));
  const free = D.pcColors.find((p) => !used.has(p.hex));
  c.color = (free ?? D.pcColors[chars.filter((x) => x.kind !== 'npc').indexOf(c) % D.pcColors.length] ?? D.pcColors[0]).hex;
}

export function normalizeAll(raw) {
  const chars = arr(raw?.chars).map(normalize);
  if (!chars.length) chars.push(prefill());
  chars.forEach((c) => ensureColor(chars, c));
  const seen = new Set();
  chars.forEach((c) => { while (seen.has(c.id)) c.id = newId(); seen.add(c.id); });
  const activeId = seen.has(raw?.activeId) ? raw.activeId : chars[0].id;
  return { version: 3, chars, activeId, combat: normalizeCombat(raw?.combat, seen) };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizeAll(JSON.parse(raw));
    for (const k of OLD_KEYS) {
      const old = localStorage.getItem(k);
      if (old) { const c = normalize(JSON.parse(old)); return normalizeAll({ chars: [c], activeId: c.id }); }
    }
  } catch (e) { /* storage blocked or corrupt — start fresh */ }
  return normalizeAll({});
}

function loadUi() {
  try { return { tab: 'etat', theme: 'auto', ...JSON.parse(localStorage.getItem(UI_KEY) || '{}') }; }
  catch { return { tab: 'etat', theme: 'auto' }; }
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

class Store {
  data = $state(load());
  ui = $state({ ...loadUi(), sheet: null, turn: null, turnActor: null });
  toast = $state(null);
  incoming = $state(null);
  #history = [];
  #timer;

  constructor() {
    $effect.root(() => {
      $effect(() => {
        const json = JSON.stringify(this.data);
        try { localStorage.setItem(KEY, json); } catch {}
      });
      $effect(() => {
        const { tab, theme } = this.ui;
        try { localStorage.setItem(UI_KEY, JSON.stringify({ tab, theme })); } catch {}
      });
    });
  }

  get c() { return this.data.chars.find((x) => x.id === this.data.activeId) ?? this.data.chars[0]; }
  get chars() { return this.data.chars; }
  get combat() { return this.data.combat; }
  char(id) { return this.data.chars.find((x) => x.id === id); }

  snapshot() { return JSON.stringify($state.snapshot(this.c)); }
  #snapAll() { return JSON.stringify($state.snapshot(this.data)); }
  #push() { this.#history.push(this.#snapAll()); if (this.#history.length > 80) this.#history.shift(); }

  /** Discrete change to the active robot; undoable. */
  commit(label, fn) { this.commitOn(this.c.id, label, fn); }
  /** Discrete change to a given robot. fn(char, data). */
  commitOn(id, label, fn) {
    this.#push();
    const ch = this.char(id) ?? this.c;
    fn(ch, this.data);
    if (label) this.notify(label, true);
  }
  /** Discrete change to the whole table (roster, combat). */
  commitAll(label, fn) {
    this.#push();
    fn(this.data);
    if (label) this.notify(label, true);
  }

  /** Add a robot (imported, blank or from a template); optionally make it active. */
  addChar(raw, { activate = true, label } = {}) {
    const c = normalize(raw);
    while (this.char(c.id)) c.id = newId();
    if (this.c) c.dev = { ...$state.snapshot(this.c.dev) };
    ensureColor(this.data.chars, c);
    this.commitAll(label ?? null, (d) => { d.chars.push(c); if (activate) d.activeId = c.id; });
    return c.id;
  }
  activate(id) { if (this.char(id)) this.data.activeId = id; }
  removeChar(id) {
    const c = this.char(id);
    if (!c) return;
    this.commitAll(`${c.name || 'Robot'} supprimé`, (d) => {
      d.chars = d.chars.filter((x) => x.id !== id);
      d.combat.combatants = d.combat.combatants.filter((x) => x.cid !== id);
      if (!d.chars.length) d.chars.push(blankCharacter('pc'));
      if (d.activeId === id) d.activeId = d.chars[0].id;
    });
  }
  replaceAll(raw, label) {
    this.#push();
    this.data = normalizeAll(raw);
    if (label) this.notify(label, true);
  }

  log(text) {
    const cb = this.data.combat;
    cb.log.push({ round: cb.round, text });
    if (cb.log.length > 60) cb.log.splice(0, cb.log.length - 60);
  }

  undo() {
    const prev = this.#history.pop();
    if (!prev) return;
    this.data = normalizeAll(JSON.parse(prev));
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
export { prefill };
