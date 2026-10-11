// Experience (T11): the GM's XP rules, the end-of-session wizard and spending XP.
// Book (p.26): 1 XP per « yes » to the end-of-session questions; 5 XP buy a
// program level (max 5) or a new secondary function (which also needs scrap).
// campaign.rules.xp = { questions: [{ id, text, xp, enabled }], costs: { program, secondary },
//                       bonusAwards: [{ id, text, xp }] }   (missing = the book's values)
// campaign.xp = { log: [session], spent: [spend] }
//   session = { at, day, ledger, awards: [{ cid, name, total, items }], dev: { key: [before, after] } }
//   spend   = { at, cid, name, what, cost }
import { GAME_DATA as D } from './data.js';
import { getRules } from './settings.js';
import { DEV_KEYS, DEV_LABELS, findSecondary } from './rules.js';
import { d6 } from './rng.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Math.max(0, Math.round(Number(v))) : d);
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

/** The book's XP rules (p.26). */
export function bookXp() {
  const R = getRules();
  return {
    questions: D.xpQuestions.map((text, i) => ({ id: `q${i + 1}`, text, xp: 1, enabled: true })),
    costs: { program: R.xpPerUpgrade, secondary: R.xpPerUpgrade },
    bonusAwards: []
  };
}

/** The XP rules in force: the GM's (campaign.rules.xp), else the book's. */
export function xpRules(campaign) {
  const b = bookXp();
  const ov = campaign?.rules?.xp;
  if (!isObj(ov)) return b;
  const list = (raw, fallback) => (Array.isArray(raw) ? raw.filter(isObj).map((q, i) => ({ id: String(q.id || `x${i}`), text: String(q.text ?? ''), xp: int(q.xp, 1), enabled: q.enabled !== false })).filter((q) => q.text.trim()) : fallback);
  return {
    questions: list(ov.questions, b.questions),
    costs: { program: int(ov.costs?.program, b.costs.program), secondary: int(ov.costs?.secondary, b.costs.secondary) },
    bonusAwards: list(ov.bonusAwards, []).map(({ enabled, ...a }) => a)
  };
}

/** Normalise campaign.xp. */
export function normalizeXp(raw) {
  const arr = (v) => (Array.isArray(v) ? v.filter(isObj).map((e) => JSON.parse(JSON.stringify(e))) : []);
  return { log: arr(raw?.log), spent: arr(raw?.spent) };
}

// ---------- end of session ----------

const pcs = (data) => data.chars.filter((c) => c.kind !== 'npc');

/** A fresh session draft: « participé » (the first question) ticked for every PC, DEV not rolled yet. */
export function sessionDraft(data) {
  const rules = xpRules(data.campaign);
  const first = rules.questions.find((q) => q.enabled)?.id;
  const draft = { checks: {}, bonus: {}, adjust: {}, dev: {}, relations: {} };
  for (const c of pcs(data)) {
    draft.checks[c.id] = first ? { [first]: true } : {};
    draft.bonus[c.id] = {};
    draft.adjust[c.id] = 0;
    draft.relations[c.id] = { protect: c.protect, hate: c.hate, dream: c.dream };
  }
  for (const k of DEV_KEYS) draft.dev[k] = { roll: null, value: data.campaign.dev[k] };
  return draft;
}

/** XP a robot gets from the draft: ticked questions + bonus awards + the GM's adjustment (never below 0). */
export function sessionXp(draft, rules, cid) {
  const q = rules.questions.filter((x) => x.enabled && draft.checks[cid]?.[x.id]).reduce((t, x) => t + x.xp, 0);
  const b = rules.bonusAwards.filter((x) => draft.bonus[cid]?.[x.id]).reduce((t, x) => t + x.xp, 0);
  return Math.max(0, q + b + (draft.adjust[cid] || 0));
}

/** Roll the 1D6 wear of every DEV level (p.108) into the draft; the GM can still change the values. */
export function rollDecay(draft, data) {
  for (const k of DEV_KEYS) {
    const roll = d6();
    draft.dev[k] = { roll, value: Math.max(0, data.campaign.dev[k] - roll) };
  }
}

/** What happened since the previous session: days on the clock and market deals. */
export function sinceLast(data) {
  const last = data.campaign.xp.log.at(-1);
  const day = data.campaign.clock?.day ?? 1;
  const ledger = data.campaign.market?.ledger ?? [];
  const deals = ledger.slice(last ? Math.min(last.ledger ?? 0, ledger.length) : 0);
  return { days: last ? Math.max(0, day - (last.day ?? day)) : day - 1, deals };
}

/** Apply a finished session (inside commitAll): XP, DEV, relations, history, journal. Returns the session entry. */
export function applySession(data, draft) {
  const rules = xpRules(data.campaign);
  const since = sinceLast(data);
  const awards = pcs(data).map((c) => {
    const total = sessionXp(draft, rules, c.id);
    const items = [
      ...rules.questions.filter((x) => x.enabled && draft.checks[c.id]?.[x.id]).map((x) => ({ text: x.text, xp: x.xp })),
      ...rules.bonusAwards.filter((x) => draft.bonus[c.id]?.[x.id]).map((x) => ({ text: x.text, xp: x.xp })),
      ...(draft.adjust[c.id] ? [{ text: 'Ajustement du MJ', xp: draft.adjust[c.id] }] : [])
    ];
    c.xp.current += total;
    const r = draft.relations[c.id];
    if (r) { c.protect = String(r.protect ?? '').trim(); c.hate = String(r.hate ?? '').trim(); c.dream = String(r.dream ?? '').trim(); }
    return { cid: c.id, name: c.name || 'Robot sans nom', total, items };
  });
  const dev = {};
  for (const k of DEV_KEYS) {
    const before = data.campaign.dev[k];
    const after = Math.max(0, Math.min(D.defaults.devMax, int(draft.dev[k]?.value, before)));
    data.campaign.dev[k] = after;
    dev[k] = [before, after];
  }
  const day = data.campaign.clock?.day ?? null;
  const entry = { at: new Date().toISOString(), day, ledger: data.campaign.market?.ledger?.length ?? 0, awards, dev };
  data.campaign.xp.log.push(entry);
  const lines = [
    `Fin de séance ${data.campaign.xp.log.length}`,
    ...awards.map((a) => `${a.name} : +${a.total} PX`),
    `Niveaux : ${DEV_KEYS.map((k) => `${DEV_LABELS[k]} ${dev[k][0]} → ${dev[k][1]}`).join(', ')}`,
    ...(since.days ? [`${plural(since.days, 'jour')} de jeu depuis la séance précédente`] : []),
    ...(since.deals.length ? [`Marché noir : ${since.deals.map((e) => `${e.type === 'sell' ? 'vente' : 'achat'} de ${e.name} (${e.price} PE)`).join(', ')}`] : [])
  ];
  data.campaign.journal.push({ at: entry.at, ...(day ? { day } : {}), text: lines.join('\n') });
  return entry;
}

// ---------- spending XP ----------

const spendLog = (data, c, what, cost) => {
  const at = new Date().toISOString();
  data.campaign.xp.spent.push({ at, cid: c.id, name: c.name || 'Robot sans nom', what, cost });
  data.campaign.journal.push({ at, text: `${c.name || 'Robot'} dépense ${cost} PX : ${what}` });
};

/**
 * Why robot `c` can't raise program `key` ('__special' = its specialist program),
 * or null. rules = xpRules(campaign).
 */
export function programBlock(c, key, rules) {
  const max = getRules().programMax;
  const level = key === '__special' ? c.specialRating || 0 : c.programRatings[key] || 0;
  if (level >= max) return `Déjà au maximum (${max}).`;
  if (c.xp.current < rules.costs.program) return `Il faut ${rules.costs.program} PX, ${c.name || 'ce robot'} en a ${c.xp.current}.`;
  return null;
}
/** Raise a program by 1 for its XP cost (inside a commit). Returns null or the reason. */
export function spendProgram(data, cid, key) {
  const c = data.chars.find((x) => x.id === cid);
  if (!c) return 'Robot introuvable.';
  const rules = xpRules(data.campaign);
  const why = programBlock(c, key, rules);
  if (why) return why;
  c.xp.current -= rules.costs.program;
  let label;
  if (key === '__special') { c.specialRating = (c.specialRating || 0) + 1; label = `programme spécialiste ${c.specialRating}`; }
  else { c.programRatings[key] = (c.programRatings[key] || 0) + 1; label = `${D.programs.find((p) => p.key === key)?.label ?? key} ${c.programRatings[key]}`; }
  spendLog(data, c, label, rules.costs.program);
  return null;
}

/** Why `c` can't learn secondary function `name`, or null. */
export function secondaryBlock(c, name, rules) {
  if (!findSecondary(name)) return 'Fonction inconnue.';
  if (c.secondary.includes(name)) return `${c.name || 'Ce robot'} a déjà cette fonction.`;
  if (c.xp.current < rules.costs.secondary) return `Il faut ${rules.costs.secondary} PX, ${c.name || 'ce robot'} en a ${c.xp.current}.`;
  return null;
}
/** Learn a secondary function for its XP cost (any model's, p.21). Returns null or the reason. */
export function spendSecondary(data, cid, name) {
  const c = data.chars.find((x) => x.id === cid);
  if (!c) return 'Robot introuvable.';
  const rules = xpRules(data.campaign);
  const why = secondaryBlock(c, name, rules);
  if (why) return why;
  c.xp.current -= rules.costs.secondary;
  c.secondary.push(name);
  spendLog(data, c, `fonction secondaire ${name}`, rules.costs.secondary);
  return null;
}
