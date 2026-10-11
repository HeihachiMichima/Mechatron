// Energy in play: activating modules (overheating, p.73 / book p.72) and
// powering energy weapons (reloading, book p.86). Pure helpers — callers
// pay the EP inside a store commit with payEp().
import { hasSecondary, overheatResult, findModule, findWeapon } from './rules.js';
import { d6 } from './rng.js';

/**
 * Roll the overheating dice for spending `ep` EP on a module.
 * - one Gear Die per EP; any 1 = overheating, roll one more D6 on the table;
 * - Power Saver (secondary function): one extra die, and if any die shows 6
 *   the module costs 1 EP less (0 if it cost 1).
 * Returns { ep, dice, incident, oh, cost, works, effective, saver }.
 * `works` is false when the action has no effect (Fatal Error, Crossed
 * Wires, Bluescreen); `effective` doubles on Power Surge.
 */
export function rollActivation(c, ep) {
  const saver = hasSecondary(c, "Économiseur d'énergie");
  const n = Math.max(0, ep) + (saver ? 1 : 0);
  const dice = Array.from({ length: n }, d6);
  const incident = dice.includes(1) ? d6() : null;
  let cost = ep;
  if (saver && dice.includes(6)) cost = Math.max(0, cost - 1);
  if (incident === 2) cost *= 2;
  return {
    ep, dice, incident, oh: incident ? overheatResult(incident) : null, cost, saver,
    works: ![1, 3, 4].includes(incident),
    effective: incident === 6 ? ep * 2 : ep
  };
}

/** Mutate `c` for an activation: pay EP (via payEp) and break the module on Fatal Error. */
export function settleActivation(data, c, modIndex, act, payEp) {
  payEp(data, c, act.cost);
  if (act.incident === 1 && modIndex != null && modIndex >= 0 && !(c.brokenModules || []).includes(modIndex)) c.brokenModules = [...(c.brokenModules || []), modIndex];
}

/** One-line log text for an activation. */
export function actText(name, act) {
  const paid = act.cost !== act.ep ? `, ${act.cost} payé${act.cost > 1 ? 's' : ''}` : '';
  return `${name} (${act.ep} PE${paid})${act.oh ? ` : surchauffe, ${act.oh.name}${act.works ? '' : ' (sans effet)'}` : ''}`;
}

/** Index of the first working copy of a module, or -1. */
export const workingIndex = (c, name) => (c.modules || []).findIndex((m, i) => m === name && !(c.brokenModules || []).includes(i));

/** Structured combat effects of every working module on `c`, optionally filtered by kind(s). */
export function moduleFx(c, kinds) {
  const ks = kinds ? [].concat(kinds) : null;
  const out = [];
  (c.modules || []).forEach((name, index) => {
    if (!name || (c.brokenModules || []).includes(index)) return;
    const ref = findModule(name);
    (ref?.fx || []).forEach((fx) => { if (!ks || ks.includes(fx.kind)) out.push({ ...fx, module: name, index, key: `${index}:${fx.id}` }); });
  });
  return out;
}

// ---------- energy weapons ----------
export const POWER = [
  { id: 'epack', label: 'E-pack', hint: "Vide si tous les dés d'équipement font 1 au premier jet." },
  { id: 'internal', label: 'Alimentation interne', hint: '1 PE par tir (branchement : jet de Réparation).' },
  { id: 'crank', label: 'Manivelle', hint: 'Après chaque tir, une action pour la remonter (sans jet).' }
];
export function isEnergyWeapon(w) {
  if (!w) return false;
  const ref = findWeapon(w.name);
  return /arme à énergie/i.test(`${w.note || ''} ${ref?.note || ''}`);
}
export const weaponPower = (w) => (POWER.some((p) => p.id === w?.power) ? w.power : 'epack');
/** Why a weapon can't fire right now, or ''. */
export function weaponBlock(c, w, avail) {
  if (!isEnergyWeapon(w)) return '';
  const p = weaponPower(w);
  if (p === 'epack' && w.empty) return 'E-pack vide';
  if (p === 'crank' && w.crankDue) return 'manivelle à remonter';
  if (p === 'internal' && avail < 1) return 'plus de PE';
  return '';
}

// ---------- items that hold EP ----------
/** Equipment entries that can recharge a robot with D6 EP (drained afterwards). */
export const chargeItems = (c) => (c.equipment || []).map((e, i) => ({ ...e, index: i })).filter((e) => /^(e-pack|batterie)$/i.test(e.name.trim()));
export const spareEpacks = (c) => (c.equipment || []).map((e, i) => ({ ...e, index: i })).filter((e) => /^e-pack$/i.test(e.name.trim()));

// ---------- explosions (book p.92) ----------
/** Dice for a blast at a distance: Arm's Length and Near use the full Blast Power; Short only if ≥ 7 (−6). */
export function blastDice(power, dist) {
  if (dist === 'Courte') return power >= 7 ? power - 6 : 0;
  if (dist === 'Bras' || dist === 'Proche') return power;
  return 0;
}
/** Roll a blast against one victim. Weapon damage 1: 1 per 6; +1 at Arm's Length. */
export function rollBlast(power, dist, weaponDmg = 1) {
  const n = blastDice(power, dist);
  const dice = Array.from({ length: n }, d6);
  const sixes = dice.filter((v) => v === 6).length;
  const base = sixes ? weaponDmg + sixes - 1 : 0;
  return { dice, amount: base + (dist === 'Bras' ? 1 : 0) };
}

export const rollD6 = d6;
