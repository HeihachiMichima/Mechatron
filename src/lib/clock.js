// Day/night clock and energy engine (T07): pure functions on the save, called
// inside store.commitAll. Book rules (p.72, p.108-110, p.112), all from data.js:
// - each evening every running robot spends `dailyDrain` EP (1); at 0 EP it goes
//   into sleep mode (status().asleep);
// - at night a connected robot (c.online) recharges at its base station UP TO the
//   ration (the Énergie DEV band), never above it nor above its max (10, or 12
//   with Alimentation de secours); a robot already above the ration gets nothing;
// - a robot that isn't connected (the app's « outside ») gets `outsideSolarEp` (1)
//   from its built-in solar cells, plus D6 with Panneaux solaires under a clear sky;
// - Scrap Robots have no base station (p.112): excluded from the station charge by
//   default, the GM includes them when they found energy;
// - E-pack and Batterie give D6 EP and are then empty; a Banque d'énergie stores
//   up to 5 EP, both ways.
// GM overrides live in campaign.rules.energy { dailyDrain, outsideSolarEp, overrideRation }.
// Creatures are untouched; NPCs only take part when the GM's EP pool is off.
import { GAME_DATA as D } from './data.js';
import { epMax, devBand, hasSecondary, status } from './rules.js';
import { getRules } from './settings.js';
import { d6 } from './rng.js';

const BANK = 'Banque d\'énergie';
export const bankCapacity = () => D.equipment.find((e) => e.name === BANK)?.capacity ?? 0;
const plain = (s) => (s || '').trim().toLowerCase().replace(/[’`]/g, "'");
export const isBank = (name) => plain(name) === plain(BANK);
export const isPack = (name) => /^(e-pack|batterie)$/i.test((name || '').trim());

/** A fresh clock: day 1, morning, clear sky. */
export const blankClock = () => ({ day: 1, phase: 'day', clearSky: true, charged: false, exclude: [], report: null });

/** Rebuild a saved clock from its known fields. */
export function normalizeClock(raw) {
  const b = blankClock();
  if (!raw || typeof raw !== 'object') return b;
  const report = raw.report && typeof raw.report === 'object'
    ? { title: String(raw.report.title ?? ''), lines: (Array.isArray(raw.report.lines) ? raw.report.lines : []).filter((l) => l && typeof l === 'object').map((l) => ({ id: String(l.id ?? ''), name: String(l.name ?? ''), text: String(l.text ?? '') })) }
    : null;
  return {
    day: Math.max(1, Math.floor(Number(raw.day)) || 1),
    phase: raw.phase === 'night' ? 'night' : 'day',
    clearSky: raw.clearSky !== false,
    charged: !!raw.charged,
    exclude: (Array.isArray(raw.exclude) ? raw.exclude : []).filter((x) => typeof x === 'string'),
    report
  };
}

/**
 * The energy rules in force: book (and house) values, then the GM's overrides.
 * `bookRation` is what the Énergie level gives; `ration` is what applies.
 */
export function energyRules(campaign) {
  const R = getRules();
  const ov = campaign?.rules?.energy || {};
  const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.floor(Number(v))));
  const bookRation = devBand(campaign?.dev?.Energie ?? R.devStart).energyEp;
  return {
    dailyDrain: num(ov.dailyDrain) ?? R.dailyDrain,
    outsideSolarEp: num(ov.outsideSolarEp) ?? R.outsideSolarEp,
    ration: num(ov.overrideRation) ?? bookRation,
    bookRation,
    book: { dailyDrain: R.dailyDrain, outsideSolarEp: R.outsideSolarEp, ration: bookRation }
  };
}

/** Robots the clock looks after: not creatures, not destroyed; NPCs only without the GM pool. */
export const clockRobots = (data) => data.chars.filter((c) => c.body !== 'creature' && !status(c).deactivated && (c.kind !== 'npc' || !data.combat.usePool));

/** Scrap Robots have no base station: excluded from the night charge unless the GM includes them. */
export const defaultExclude = (data) => clockRobots(data).filter((c) => c.model === 'scrap').map((c) => c.id);

const name = (c) => c.name || 'Robot sans nom';
const epLine = (c) => `${c.ep.current}/${epMax(c)} PE`;

function finish(data, title, lines) {
  data.campaign.clock.report = { title, lines: lines.map(({ id, name, text }) => ({ id, name, text })) };
  const text = [title, ...lines.map((l) => `${l.name} : ${l.text}`)].join('\n');
  data.campaign.journal.push({ at: new Date().toISOString(), day: data.campaign.clock.day, text });
  return data.campaign.clock.report;
}

/** Evening: daily drain, sleep mode at 0, then night. Returns the report, or null if it isn't day. */
export function endDay(data) {
  const clock = data.campaign.clock;
  if (clock.phase !== 'day') return null;
  const { dailyDrain } = energyRules(data.campaign);
  const lines = clockRobots(data).map((c) => {
    const before = c.ep.current;
    c.ep.current = Math.max(0, before - dailyDrain);
    const spent = before - c.ep.current;
    const sleep = c.ep.current === 0 && c.kind !== 'npc'; // NPCs have no sleep mode (rules.status)
    return { id: c.id, name: name(c), text: `${spent ? `−${spent} PE` : 'rien à dépenser'} (${epLine(c)})${sleep ? (before > 0 ? ', passe en veille' : ', toujours en veille') : ''}` };
  });
  clock.phase = 'night';
  clock.charged = false;
  clock.exclude = defaultExclude(data);
  return finish(data, `Jour ${clock.day}, soir : consommation quotidienne`, lines);
}

/**
 * Night: base station up to the ration for connected robots, solar cells for
 * the others. `exclude` (default: the clock's list) = no base station for a
 * connected robot, no Panneaux solaires for one outside (it didn't stay idle).
 * Only once per night, after endDay; returns null otherwise. EP never go down.
 */
export function nightCharge(data, { exclude } = {}) {
  const clock = data.campaign.clock;
  if (clock.phase !== 'night' || clock.charged) return null;
  const skip = new Set(exclude ?? clock.exclude);
  const { ration, outsideSolarEp } = energyRules(data.campaign);
  const lines = clockRobots(data).map((c) => {
    const before = c.ep.current;
    const max = epMax(c);
    let text;
    if (c.online) {
      const cap = Math.min(ration, max);
      if (skip.has(c.id)) text = c.model === 'scrap' ? 'pas de borne (robot de rebut), pas de recharge' : 'exclu cette nuit, pas de recharge';
      else if (before >= cap) text = `déjà au rationnement (${cap}), pas de recharge`;
      else { c.ep.current = cap; text = `borne : +${cap - before} PE`; }
    } else {
      c.ep.current = Math.max(before, Math.min(max, before + outsideSolarEp));
      const parts = [`soleil +${c.ep.current - before}`];
      if (hasSecondary(c, 'Panneaux solaires')) {
        if (!clock.clearSky) parts.push('panneaux solaires : ciel couvert');
        else if (skip.has(c.id)) parts.push('panneaux solaires : pas resté inactif');
        else {
          const roll = d6();
          const b2 = c.ep.current;
          c.ep.current = Math.max(b2, Math.min(max, b2 + roll));
          parts.push(`panneaux solaires D6 = ${roll}, +${c.ep.current - b2}`);
        }
      }
      text = `dehors : ${parts.join(', ')} PE`;
    }
    const woke = before === 0 && c.ep.current > 0;
    return { id: c.id, name: name(c), text: `${text} (${epLine(c)})${woke ? ', se réveille' : ''}` };
  });
  clock.charged = true;
  return finish(data, `Jour ${clock.day}, nuit : recharge${clock.clearSky ? '' : ' (ciel couvert)'}`, lines);
}

/** Morning: next day, per-day flags reset. Only at night; returns false otherwise. */
export function startDay(data) {
  const clock = data.campaign.clock;
  if (clock.phase !== 'night') return false;
  clock.day += 1;
  clock.phase = 'day';
  clock.charged = false;
  clock.exclude = [];
  for (const c of data.chars) c.daily = { barter: false };
  data.campaign.clock.report = null;
  data.campaign.journal.push({ at: new Date().toISOString(), day: clock.day, text: `Jour ${clock.day} : nouvelle journée` });
  return true;
}

// ---------- transfers (cable, Banque d'énergie, E-pack / Batterie) ----------

const ref = (data, end) => {
  const c = data.chars.find((x) => x.id === end?.id);
  // Creatures have no EP; a destroyed robot can't give or take any.
  if (!c || c.body === 'creature' || status(c).deactivated) return null;
  if (end.item == null) return { c, get: () => c.ep.current, room: () => epMax(c) - c.ep.current, add: (n) => (c.ep.current += n), label: name(c) };
  const it = c.equipment[end.item];
  if (!it || !isBank(it.name)) return null;
  return { c, get: () => it.charge || 0, room: () => bankCapacity() - (it.charge || 0), add: (n) => (it.charge = (it.charge || 0) + n), label: `${it.name} de ${name(c)}` };
};

/**
 * Move EP between two ends: { id } is a robot, { id, item } a Banque d'énergie in
 * its equipment. Moves at most n, what the source has and what the target holds.
 * Returns the EP moved (and a journal line), or 0.
 */
export function transfer(data, from, to, n) {
  const a = ref(data, from), b = ref(data, to);
  if (!a || !b || (from.id === to.id && (from.item ?? null) === (to.item ?? null))) return 0;
  const got = Math.max(0, Math.min(Math.floor(n) || 0, a.get(), b.room()));
  if (!got) return 0;
  a.add(-got); b.add(got);
  data.campaign.journal.push({ at: new Date().toISOString(), day: data.campaign.clock.day, text: `${a.label} donne ${got} PE à ${b.label}` });
  return got;
}

/** Empty an E-pack or a Batterie into its robot: +D6 EP (capped), the item is used up. Returns the gain or null. */
export function drainPack(data, id, index) {
  const c = data.chars.find((x) => x.id === id);
  const it = c?.equipment[index];
  if (!it || !isPack(it.name)) return null;
  const roll = d6();
  const before = c.ep.current;
  c.ep.current = Math.max(before, Math.min(epMax(c), before + roll));
  c.equipment.splice(index, 1);
  data.campaign.journal.push({ at: new Date().toISOString(), day: data.campaign.clock.day, text: `${name(c)} vide ${it.name} : D6 = ${roll}, +${c.ep.current - before} PE` });
  return { roll, gain: c.ep.current - before };
}
