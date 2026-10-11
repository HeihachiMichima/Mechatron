// Pure game-rule helpers. Everything reads the character object `c`
// and GAME_DATA; nothing here touches the DOM or storage.
import { GAME_DATA as D } from './data.js';
import { d6, pick } from './rng.js';

export const ATTRS = ['servos', 'stabilite', 'processeur', 'reseau'];
export const DEV_KEYS = ['Energie', 'Production', 'Défense', 'Information'];
export const DEV_LABELS = { Energie: 'Énergie', Production: 'Production', 'Défense': 'Défense', Information: 'Information' };

const norm = (s) => (s || '').trim().toLowerCase();

export function findPart(cat, name) {
  return (D.chassis[cat] || []).find((p) => norm(p.name) === norm(name)) || null;
}
export const findModule = (name) => D.modules.find((m) => norm(m.name) === norm(name)) || null;
export const findWeapon = (name) => D.weapons.find((w) => norm(w.name) === norm(name)) || null;
export const findSecondary = (name) => D.secondaryFunctions.find((f) => f.name === name) || null;
export const findEquipment = (name) => D.equipment.find((e) => norm(e.name) === norm(name)) || null;
export const modelOf = (c) => D.models.find((m) => m.id === c.model) || null;
export const hasSecondary = (c, name) => c.secondary.includes(name);

// Labels depend on the body: creatures use Force/Agilité/Intellect/Empathie.
export const attrLabels = (c) => (c?.body === 'creature' ? D.creatureLabels : D.attributeLabels);
export const attrLabel = (c, a) => attrLabels(c)[a].label;
// Attributes shown for this robot (drones/creatures entered directly may lack some).
export const shownAttrs = (c, ch) => ATTRS.filter((a) => c.statMode !== 'direct' || ch.attrMax[a] > 0 || a === 'servos');

export function chassis(c) {
  if (c.statMode === 'direct') {
    const d = c.direct || {};
    const attrMax = {};
    ATTRS.forEach((a) => (attrMax[a] = Math.max(0, Number(d[a]) || 0)));
    return { parts: [null, null, null], known: 3, direct: true, attrMax, armorBase: Math.max(0, Number(d.armor) || 0), slots: Math.max(Number(d.slots) || 0, (c.modules || []).filter(Boolean).length) };
  }
  const parts = [findPart('heads', c.head), findPart('torsos', c.torso), findPart('undercarriages', c.undercarriage)];
  const known = parts.filter(Boolean);
  const sum = (k) => known.reduce((t, p) => t + (typeof p[k] === 'number' ? p[k] : 0), 0);
  const attrMax = {};
  ATTRS.forEach((a) => (attrMax[a] = sum(a)));
  return { parts, known: known.length, attrMax, armorBase: sum('armor'), slots: known.length ? sum('slots') : D.defaults.slotsDefault };
}

export function attrCurrent(c, ch, a) {
  return Math.max(0, ch.attrMax[a] - (c.damage[a] || 0));
}

export function armorTotal(c, ch) {
  return ch.armorBase + (hasSecondary(c, 'Blindage supplémentaire') ? 3 : 0);
}
export function armorCurrent(c, ch) {
  return Math.max(0, armorTotal(c, ch) - (c.armorDamage || 0));
}

export function epMax(c) {
  if (c.statMode === 'direct' && c.kind === 'npc' && hasSecondary(c, 'Alimentation de secours')) return D.rules.epBackup;
  return hasSecondary(c, 'Alimentation de secours') ? D.rules.epBackup : D.rules.epBase;
}

export function autoHierarchy(c) {
  const m = modelOf(c);
  if (!m) return null;
  return m.hierarchy + (hasSecondary(c, "Unité d'élite") ? 2 : 0);
}
export function hierarchy(c) {
  return c.hierarchy !== '' && c.hierarchy != null ? c.hierarchy : autoHierarchy(c) ?? '—';
}

export function devBand(score) {
  const n = Number(score) || 0;
  return D.devThresholds.find((b) => n >= b.min) || D.devThresholds[D.devThresholds.length - 1];
}
export const fmtBonus = (n) => (n > 0 ? `+${n}` : String(n));

// Full program list: 12 basics, the model's specialist, then custom lines.
export function programs(c) {
  const list = D.programs.map((p) => ({ ...p, id: p.key, rating: c.programRatings[p.key] ?? 0 }));
  const m = modelOf(c);
  if (m) list.push({ id: '__special', key: '__special', label: m.special, attr: m.specialAttr || null, desc: D.specialPrograms?.[m.id] || 'programme spécialiste', devBonus: null, rating: c.specialRating || 0, special: true });
  c.customPrograms.forEach((cp, i) => list.push({ id: 'custom' + i, key: 'custom' + i, label: cp.label || 'Programme perso', attr: cp.attr || null, desc: '', devBonus: null, rating: cp.rating || 0, custom: i }));
  return list;
}

export function programPoints(c) {
  return D.programs.reduce((t, p) => t + (c.programRatings[p.key] || 0), 0) + (modelOf(c) ? c.specialRating || 0 : 0);
}

export function devModFor(c, prog) {
  if (!prog.devBonus || !c.online) return 0;
  return devBand(c.dev[prog.devBonus]).bonus;
}

// ---------- dice (all through rng.js) ----------

// Negative modifications beyond the program level become negative Program
// Dice (p.51): each 6 on them cancels a 6 on Base or Gear Dice.
export function rollPool({ base, prog, gear, neg = 0 }) {
  const dice = [];
  for (let i = 0; i < base; i++) dice.push({ t: 'base', v: d6() });
  for (let i = 0; i < prog; i++) dice.push({ t: 'prog', v: d6() });
  for (let i = 0; i < gear; i++) dice.push({ t: 'gear', v: d6() });
  for (let i = 0; i < neg; i++) dice.push({ t: 'neg', v: d6() });
  return dice;
}

export function canReroll(die) {
  if (die.v === 6) return false;
  if (die.v === 1 && D.rules.pushKeepsOnes && (die.t === 'base' || die.t === 'gear')) return false;
  return true;
}

export function push(dice) {
  return dice.map((d) => (canReroll(d) ? { ...d, v: d6(), rerolled: true } : { ...d, rerolled: false }));
}

export function tally(dice) {
  const raw = dice.filter((d) => d.t !== 'neg' && d.v === 6).length;
  const cancelled = Math.min(raw, dice.filter((d) => d.t === 'neg' && d.v === 6).length);
  return {
    successes: raw - cancelled,
    cancelled,
    baseOnes: dice.filter((d) => d.t === 'base' && d.v === 1).length,
    gearOnes: dice.filter((d) => d.t === 'gear' && d.v === 1).length,
    gear: dice.filter((d) => d.t === 'gear').length
  };
}

export function maxPushes(c) {
  return hasSecondary(c, 'Surrégime') ? 2 : 1;
}

export function hitLocation(roll) {
  return D.damageTable.find((r) => roll >= r.min && roll <= r.max)?.target ?? 'module';
}
export const overheatResult = (roll) => D.overheatTable.find((r) => r.roll === roll);

// ---------- status ----------
export function status(c, ch = chassis(c)) {
  const attrs = ATTRS.filter((a) => ch.attrMax[a] > 0);
  const broken = attrs.filter((a) => attrCurrent(c, ch, a) === 0);
  const creature = c.body === 'creature';
  const deactivated = creature ? attrCurrent(c, ch, 'servos') === 0 && ch.attrMax.servos > 0 : attrs.length > 0 && broken.length === attrs.length;
  return { broken, deactivated, asleep: c.kind !== 'npc' && c.ep.current === 0 && !creature };
}

// ---------- damage pipeline (p.88-91) ----------
const rollN = (n) => Array.from({ length: Math.max(0, n) }, d6);

/**
 * Resolve one hit against character `c` (mutated in place).
 * opts: { amount, ranged, coverRating, ignoreArmor, location: 'random'|attr|'module' }
 * Returns { steps: [text], cover: {dice, newRating}, armor: {dice}, taken, deactivated }
 */
export function resolveDamage(c, opts) {
  const ch = chassis(c);
  const labels = attrLabels(c);
  const steps = [];
  let dmg = Math.max(0, opts.amount | 0);
  const out = { steps, coverDice: null, armorDice: null, newCover: opts.coverRating ?? 0, taken: 0 };

  if (opts.ranged && opts.coverRating > 0 && dmg > 0) {
    const dice = rollN(opts.coverRating);
    const blocked = Math.min(dmg, dice.filter((v) => v === 6).length);
    dmg -= blocked;
    out.coverDice = dice;
    let wear = 0;
    if (dmg > 0) { wear = dice.filter((v) => v === 1).length; out.newCover = Math.max(0, opts.coverRating - wear); }
    steps.push(`Couverture ${opts.coverRating} : ${blocked} bloqué${blocked > 1 ? 's' : ''}${wear ? `, couverture −${wear}` : ''}`);
  }
  // Rubberized: +2 Armor against close combat (and falls) only (book p.66).
  const rubber = opts.melee && hasSecondary(c, 'Revêtement caoutchouté') ? 2 : 0;
  const armor = armorCurrent(c, ch) + rubber;
  if (!opts.ignoreArmor && armor > 0 && dmg > 0) {
    const dice = rollN(armor);
    const blocked = Math.min(dmg, dice.filter((v) => v === 6).length);
    dmg -= blocked;
    out.armorDice = dice;
    let wear = 0;
    if (dmg > 0) { wear = Math.min(armorCurrent(c, ch), dice.filter((v) => v === 1).length); c.armorDamage = (c.armorDamage || 0) + wear; }
    steps.push(`Armure ${armor}${rubber ? ' (dont caoutchouc +2)' : ''} : ${blocked} bloqué${blocked > 1 ? 's' : ''}${wear ? `, armure −${wear}` : ''}`);
  } else if (opts.ignoreArmor && dmg > 0) steps.push('Armure ignorée');

  if (opts.reduce > 0 && dmg > 0) {
    const r = Math.min(dmg, opts.reduce);
    dmg -= r;
    steps.push(`${opts.reduceLabel || 'Réduction'} : −${r}`);
  }
  // Protect (Security Robot): an ally takes some points in your place.
  if (opts.absorb > 0 && dmg > 0) {
    const a = Math.min(dmg, opts.absorb);
    dmg -= a;
    out.absorbed = a;
    steps.push(`${opts.absorbLabel || 'Protection'} : ${a} encaissé${a > 1 ? 's' : ''} à sa place`);
  }
  if (dmg === 0) { steps.push('Aucun dégât ne passe.'); return out; }
  out.taken = dmg;

  if (c.body === 'creature') {
    const before = attrCurrent(c, ch, 'servos');
    const hit = Math.min(before, dmg);
    c.damage.servos = (c.damage.servos || 0) + hit;
    steps.push(`${labels.servos.label} −${hit}${before - hit === 0 ? ' : hors de combat' : ''}`);
    out.deactivated = before - hit === 0;
    return out;
  }

  const table = c.body === 'drone' ? D.droneDamageTable : D.damageTable;
  const working = () => (c.modules || []).map((m, i) => (m && !(c.brokenModules || []).includes(i) ? i : -1)).filter((i) => i >= 0);
  let guard = 0;
  let forced = opts.location && opts.location !== 'random' ? opts.location : null;
  while (dmg > 0 && guard++ < 60) {
    const alive = ATTRS.filter((a) => ch.attrMax[a] > 0 && attrCurrent(c, ch, a) > 0);
    if (!alive.length) break;
    let target = forced;
    forced = null;
    let roll = null;
    if (!target) { roll = d6(); target = table.find((r) => roll >= r.min && roll <= r.max)?.target ?? 'module'; }
    if (target === 'module') {
      const w = working();
      if (!w.length) { if (roll == null) continue; continue; } // no module left: re-roll
      const idx = pick(w);
      c.brokenModules = [...(c.brokenModules || []), idx];
      steps.push(`${roll != null ? `D6 ${roll} : ` : ''}module ${c.modules[idx]} cassé`);
      dmg -= 1;
      continue;
    }
    const cur = attrCurrent(c, ch, target);
    if (cur === 0) continue; // already broken: re-roll
    const hit = Math.min(cur, dmg);
    c.damage[target] = (c.damage[target] || 0) + hit;
    dmg -= hit;
    steps.push(`${roll != null ? `D6 ${roll} : ` : ''}${labels[target].label} −${hit}${cur - hit === 0 ? ' (brisé)' : ''}`);
  }
  out.deactivated = status(c, ch).deactivated;
  if (out.deactivated) steps.push('Tous les attributs sont brisés : désactivé.');
  return out;
}

// ---------- combat helpers ----------
export const RANGES = ['Bras', 'Proche', 'Courte', 'Longue', 'Lointaine'];
export const rangeIndex = (r) => Math.max(0, RANGES.indexOf(r));

export function weaponKind(w) {
  const ref = findWeapon(w?.name);
  if (ref?.kind) return ref.kind;
  return (w?.portee || 'Bras') === 'Bras' ? 'melee' : 'ranged';
}

/** Swarms can only be hurt by fire, explosions, Clean and Energy Pulse (book p.59). */
export const isSwarm = (c) => !!c && (['zone-rats', 'worm-swarm'].includes(c.template) || /essaim/i.test(`${c.name || ''} ${c.notes || ''}`));

/**
 * Weapons usable for an attack kind; melee always offers bare hands (index -1).
 * A Cleaning Robot's gear counts as a ranged weapon against swarms (index -2,
 * rolled with Clean: damage 3, Short range, no Gear Bonus — book p.59).
 * One-use recycled weapons already fired (`spent`) are left out.
 */
export function combatWeapons(c, kind) {
  const list = (c.weapons || []).map((w, i) => ({ ...w, index: i, kind: weaponKind(w) })).filter((w) => w.kind === kind && !w.spent);
  if (kind === 'melee') list.push({ index: -1, name: 'Mains nues', bonus: '', degats: hasSecondary(c, 'Outil de coupe') ? 2 : 1, portee: 'Bras', kind: 'melee', note: '' });
  if (kind === 'ranged' && c.model === 'cleaning' && (c.specialRating || 0) > 0) list.push({ index: -2, name: 'Nettoyer', bonus: '', degats: 3, portee: 'Courte', kind: 'ranged', note: 'Équipement de nettoyage, contre les essaims uniquement.', prog: '__special', swarmOnly: true });
  return list;
}

export const hasWorkingModule = (c, name) => (c.modules || []).some((m, i) => m === name && !(c.brokenModules || []).includes(i));
export const combatModules = (c, role) => (c.modules || []).map((m, i) => ({ name: m, index: i, ref: findModule(m), broken: (c.brokenModules || []).includes(i) })).filter((m) => m.name && m.ref?.combat && (!role || m.ref.combat === role));

/** Dice for an attack or defense roll. progKey: 'assaut' | 'tir' | '__special'. */
export function poolFor(c, progKey, { mod = 0, gear = 0, full = false } = {}) {
  const ch = chassis(c);
  const p = programs(c).find((x) => x.id === progKey || x.key === progKey);
  const attr = p?.attr ?? (progKey === 'tir' ? 'stabilite' : 'servos');
  // full: Back-Up System rolls with the full attribute score despite damage.
  const base = full ? ch.attrMax[attr] : attrCurrent(c, ch, attr);
  const dev = p ? devModFor(c, p) : 0;
  const raw = (p?.rating || 0) + dev + mod;
  return { attr, base, rating: p?.rating || 0, dev, mod, prog: Math.max(0, raw), neg: Math.max(0, -raw), gear: Math.max(0, gear | 0), label: p?.label || progKey };
}

export const canTarget = (c) => c.model === 'battle' && (c.specialRating || 0) > 0 && c.body !== 'creature';

// ---------- initiative (p.79) ----------
export function rollInitiative(c) {
  const a = d6();
  if (hasSecondary(c, 'Tactiques SWAT')) { const b = d6(); return { value: Math.max(a, b), text: `${a} et ${b}, garde ${Math.max(a, b)}` }; }
  return { value: a, text: String(a) };
}

export function rollD6() {
  return d6();
}
