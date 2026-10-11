// Team creation wizard (T06): the book's creation steps (p.16-29) as a draft
// object, a check per step and the robot built from it. Pure functions, plus
// startWizard / finishWizard that drive `store.ui.wizard` (not saved).
//
// draft = { model, nick, serial, player, color, head, torso, undercarriage,
//           programRatings, specialRating, secondary, modules, gear, buddy, hate, protect, dream }
// gear[i] = index chosen in the model's i-th gear group (groups of one need none).
import { GAME_DATA as D } from './data.js';
import { ATTRS, chassis, findPart, findWeapon, devBand, epMax } from './rules.js';
import { getRules, getDev } from './settings.js';
import { pick } from './rng.js';
import { store, blankCharacter } from './store.svelte.js';

export const STEPS = [
  { id: 'modele', label: 'Modèle' },
  { id: 'nom', label: 'Nom' },
  { id: 'chassis', label: 'Châssis' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'fonction', label: 'Fonction secondaire' },
  { id: 'modules', label: 'Modules' },
  { id: 'equipement', label: 'Équipement' },
  { id: 'relations', label: 'Relations' },
  { id: 'recap', label: 'Récapitulatif' }
];
export const SLOTS = [
  { key: 'head', cat: 'heads', label: 'Tête', missing: 'Choisissez une tête.' },
  { key: 'torso', cat: 'torsos', label: 'Torse', missing: 'Choisissez un torse.' },
  { key: 'undercarriage', cat: 'undercarriages', label: 'Support', missing: 'Choisissez un support.' }
];
// Serial number: three letters, a dash, three digits (p.16, « Rani NON-836 »).
// The generator follows it; a typed serial is free (junk robots name themselves).
// SERIAL_LIKE recognises one at the end of an existing name (« Clou SCR-311 »).
const SERIAL_LIKE = /^[A-Z]{2,4}-\d{1,4}$/;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const modelById = (id) => D.models.find((m) => m.id === id) || null;
export const plural = (n, w, ws = `${w}s`) => `${n} ${n > 1 ? ws : w}`;

export function blankDraft() {
  return { model: '', nick: '', serial: '', player: '', color: '', head: '', torso: '', undercarriage: '', programRatings: {}, specialRating: 0, secondary: '', modules: [], gear: [], buddy: '', hate: '', protect: '', dream: '' };
}

/** A draft from an existing robot (edit mode). The name's last word becomes the serial if it looks like one. */
export function draftFrom(c) {
  const words = (c.name || '').trim().split(/\s+/).filter(Boolean);
  const serial = words.length > 1 && SERIAL_LIKE.test(words[words.length - 1]) ? words.pop() : '';
  return {
    ...blankDraft(),
    model: c.model, nick: words.join(' '), serial, player: c.player, color: c.color,
    head: c.head, torso: c.torso, undercarriage: c.undercarriage,
    programRatings: { ...c.programRatings }, specialRating: c.specialRating || 0,
    secondary: c.secondary[0] || '', modules: c.modules.filter(Boolean),
    buddy: c.buddy, hate: c.hate, protect: c.protect, dream: c.dream
  };
}

export const draftName = (d) => [d.nick.trim(), d.serial.trim()].filter(Boolean).join(' ');

/** A serial no other robot uses. */
export function newSerial(chars = []) {
  const used = new Set(chars.map((c) => (c.name || '').split(/\s+/).pop()));
  for (let i = 0; i < 50; i++) {
    const s = `${pick(LETTERS)}${pick(LETTERS)}${pick(LETTERS)}-${pick('0123456789')}${pick('0123456789')}${pick('0123456789')}`;
    if (!used.has(s)) return s;
  }
  return 'AAA-000';
}

/** Chassis totals of a draft (attributes, armor, slots), through the same rules as a fiche. */
export const draftChassis = (d) => chassis({ statMode: 'chassis', head: d.head, torso: d.torso, undercarriage: d.undercarriage, modules: d.modules });

/** The other PC already using this chassis part, or null. Scrap parts are never taken (p.18). */
export function partOwner(chars, cat, name, selfId) {
  const part = findPart(cat, name);
  if (!part || part.scrap) return null;
  const key = SLOTS.find((s) => s.cat === cat).key;
  return chars.find((c) => c.id !== selfId && c.kind !== 'npc' && findPart(cat, c[key])?.name === part.name) || null;
}
/** The other PC already having this module, or null (p.22). */
export const moduleOwner = (chars, name, selfId) => chars.find((c) => c.id !== selfId && c.kind !== 'npc' && c.modules.includes(name)) || null;

export const programTotal = (d) => D.programs.reduce((t, p) => t + (d.programRatings[p.key] || 0), 0) + (d.specialRating || 0);

/** The model's gear as the robot will carry it: one item per group (the chosen one for « au choix »). */
export function gearItems(d) {
  const m = modelById(d.model);
  return (m?.gear || []).map((g, i) => (g.length === 1 ? g[0] : g[d.gear[i]] ?? null));
}

/**
 * What blocks a step (empty = the step is valid). ctx = { chars, id (robot being
 * edited), gm (GM mode: taken parts and modules are allowed) }.
 */
export function stepErrors(step, d, { chars = [], id = null, gm = false } = {}) {
  const R = getRules();
  const m = modelById(d.model);
  const e = [];
  switch (step) {
    case 'modele':
      if (!m) e.push('Choisissez un modèle.');
      break;
    case 'nom':
      if (!d.nick.trim()) e.push('Donnez un surnom à votre robot.');
      break;
    case 'chassis':
      for (const s of SLOTS) {
        if (!d[s.key]) { e.push(s.missing); continue; }
        const owner = partOwner(chars, s.cat, d[s.key], id);
        if (owner && !gm) e.push(`${d[s.key]} est déjà pris par ${owner.name || 'un autre robot'}.`);
      }
      break;
    case 'programmes': {
      const t = programTotal(d);
      if (t < R.creationProgramPoints) e.push(`Il reste ${plural(R.creationProgramPoints - t, 'point')} à répartir.`);
      if (t > R.creationProgramPoints) e.push(`${plural(t - R.creationProgramPoints, 'point')} de trop.`);
      if ([...Object.values(d.programRatings), d.specialRating].some((v) => v > R.creationProgramMax)) e.push(`Maximum ${R.creationProgramMax} par programme à la création.`);
      if (m && (d.specialRating || 0) < 1) e.push(`${m.special}, votre programme spécialiste, doit être au moins à 1.`);
      break;
    }
    case 'fonction':
      if (!m || !m.secondary.includes(d.secondary)) e.push('Choisissez une fonction secondaire.');
      break;
    case 'modules': {
      const slots = draftChassis(d).slots;
      if (d.modules.length > slots) e.push(`Trop de modules : votre châssis a ${plural(slots, 'emplacement')}.`);
      for (const name of d.modules) {
        const owner = moduleOwner(chars, name, id);
        if (owner && !gm) e.push(`${name} est déjà pris par ${owner.name || 'un autre robot'}.`);
      }
      break;
    }
    case 'equipement':
      if (id) break; // edit mode: gear is managed in Matériel
      (m?.gear || []).forEach((g, i) => { if (g.length > 1 && g[d.gear[i]] == null) e.push(`Choisissez : ${g.join(' ou ')}.`); });
      break;
    case 'recap':
      return STEPS.slice(0, -1).flatMap((s) => stepErrors(s.id, d, { chars, id, gm }));
  }
  return e;
}

/** The first step with an error, or the recap when everything is valid. */
export const firstInvalid = (d, ctx) => Math.max(0, STEPS.findIndex((s) => stepErrors(s.id, d, ctx).length));

function weaponFrom(name) {
  const ref = findWeapon(name);
  return { name, bonus: ref?.bonus ?? '', degats: ref?.degats ?? '', portee: ref?.portee ?? '', note: '' };
}

/** A new player robot from a finished draft: starting EP = today's ration (p.22). */
export function buildRobot(d) {
  const c = blankCharacter('pc');
  applyDraft(c, d);
  for (const name of gearItems(d).filter(Boolean)) {
    if (findWeapon(name)) c.weapons.push(weaponFrom(name));
    else c.equipment.push({ name, integre: false });
  }
  c.ep.current = Math.min(devBand(getDev().Energie).energyEp, epMax(c));
  return c;
}

/** Write a draft's choices onto a robot (creation or edit). Gear, EP, damage and XP are left alone. */
export function applyDraft(c, d) {
  c.model = d.model;
  c.name = draftName(d);
  c.player = d.player.trim();
  if (d.color) c.color = d.color;
  for (const s of SLOTS) c[s.key] = d[s.key];
  c.programRatings = {};
  for (const p of D.programs) if (d.programRatings[p.key]) c.programRatings[p.key] = d.programRatings[p.key];
  c.specialRating = d.specialRating || 0;
  c.secondary = [d.secondary, ...c.secondary.slice(1).filter((x) => x !== d.secondary)];
  const broken = new Set(c.brokenModules.map((i) => c.modules[i]));
  c.modules = [...d.modules];
  c.brokenModules = c.modules.map((n, i) => (broken.has(n) ? i : -1)).filter((i) => i >= 0);
  for (const k of ['buddy', 'hate', 'protect', 'dream']) c[k] = d[k].trim();
  return c;
}

// ---------- the wizard in the store (ui.wizard = { id, step, draft }) ----------

/** Open the wizard: a new robot, or an existing PC (`id`) to edit. */
export function startWizard(id = null) {
  const c = id ? store.char(id) : null;
  const draft = c ? draftFrom(c) : blankDraft();
  store.ui.wizard = { id: c?.id ?? null, step: 0, draft };
  store.go('equipe');
}
export const closeWizard = () => (store.ui.wizard = null);

/** Create (or save) the robot; returns its id, or null while a step is invalid. */
export function finishWizard() {
  const w = store.ui.wizard;
  if (!w) return null;
  const d = $stateSnapshot(w.draft);
  const ctx = { chars: store.chars, id: w.id, gm: store.ui.gm };
  if (stepErrors('recap', d, ctx).length) return null;
  store.ui.wizard = null;
  if (w.id && store.char(w.id)) {
    store.commitOn(w.id, `${draftName(d)} : fiche mise à jour`, (s) => applyDraft(s, d));
    store.openFiche(w.id, 'etat');
    return w.id;
  }
  const id = store.addChar(buildRobot(d), { label: `${draftName(d)} a rejoint l'équipe` });
  store.openFiche(id, 'etat');
  return id;
}
// A plain copy of the (possibly reactive) draft.
const $stateSnapshot = (v) => JSON.parse(JSON.stringify(v));

/** Attribute totals of a draft, for the live summary. */
export const draftAttrs = (d) => {
  const ch = draftChassis(d);
  return { ...Object.fromEntries(ATTRS.map((a) => [a, ch.attrMax[a]])), armor: ch.armorBase, slots: ch.known ? ch.slots : 0, known: ch.known };
};
