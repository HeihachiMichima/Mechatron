// Combat flow helpers (pure functions over the store's data object).
// The current actor is the first combatant, in initiative order, who
// hasn't acted this round — so "waiting" (lowering initiative) just works.
import { chassis, attrCurrent, status, rollInitiative } from './rules.js';

export const charOf = (data, x) => data.chars.find((c) => c.id === x.cid);

export function order(data) {
  return data.combat.combatants
    .map((x) => ({ x, c: charOf(data, x) }))
    .filter((r) => r.c && !r.x.fled)
    .sort((a, b) => {
      const ia = a.x.init ?? -99, ib = b.x.init ?? -99;
      if (ib !== ia) return ib - ia;
      const sa = attrCurrent(a.c, chassis(a.c), 'stabilite'), sb = attrCurrent(b.c, chassis(b.c), 'stabilite');
      if (sb !== sa) return sb - sa;
      return b.x.tie - a.x.tie;
    });
}

export const isDown = (r) => status(r.c).deactivated;
export const current = (data) => order(data).find((r) => !r.x.acted && !isDown(r)) || null;

export function sideCounts(data) {
  const live = order(data).filter((r) => !isDown(r));
  return { ally: live.filter((r) => r.x.side === 'ally').length, enemy: live.filter((r) => r.x.side === 'enemy').length };
}

/** Mark the actor done; start a new round when everybody has acted. Returns true on new round. */
export function endTurn(data, x, log) {
  if (x) { x.acted = true; x.lostAction = false; }
  if (current(data)) return false;
  data.combat.round++;
  data.combat.combatants.forEach((y) => { y.acted = false; y.defending = false; });
  log(`— Tour ${data.combat.round} —`);
  return true;
}

/** Roll initiative for the given combatants; identical NPC groups share a roll. */
export function rollInits(data, list, log) {
  const groups = {};
  const lines = [];
  list.forEach((x) => {
    const c = charOf(data, x);
    if (!c) return;
    let v, text;
    if (c.group && groups[c.group] != null) { v = groups[c.group]; text = `${v} (groupe)`; }
    else { const r = rollInitiative(c); v = r.value; text = r.text; if (c.group) groups[c.group] = v; }
    x.init = v + (x.surprise ? 2 : 0);
    lines.push(`${c.name || 'Sans nom'} ${text}${x.surprise ? ' +2 surprise' : ''}`);
  });
  if (lines.length) log(`Initiative : ${lines.join(', ')}`);
}

export function initials(name) {
  const w = (name || '?').trim().split(/\s+/);
  const last = w[w.length - 1];
  if (w.length > 1 && /^\d+$/.test(last)) return (w[0][0] || '?').toUpperCase() + last;
  return ((w[0] || '?').slice(0, 2)).replace(/^./, (m) => m.toUpperCase());
}
