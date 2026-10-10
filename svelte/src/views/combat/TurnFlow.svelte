<script>
  // Guided turn: action → target & conditions → rolls (attacker and
  // defender) → damage, stunts and reactions → next combatant.
  // Modules plug in where the book says they act (book ch.5, p.72-77):
  // enhancing effects ride along a roll or maneuver, reactive effects are
  // used when hit, other modules are an action. Every activation rolls the
  // overheating dice (lib/energy.js).
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import DiceTray from '../../components/DiceTray.svelte';
  import OverheatDice from '../../components/OverheatDice.svelte';
  import LogicConflict from './LogicConflict.svelte';
  import BlowerStep from './BlowerStep.svelte';
  import RecycleStep from './RecycleStep.svelte';
  import { store, payEp, availableEp } from '../../lib/store.svelte.js';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { order, current, isDown, endTurn } from '../../lib/combat.js';
  import { chassis, armorCurrent, combatWeapons, combatModules, poolFor, canTarget, rangeIndex, hasWorkingModule, resolveDamage, findWeapon, fmtBonus, attrCurrent, attrLabel, attrLabels, hasSecondary, status, epMax, ATTRS, isSwarm } from '../../lib/rules.js';
  import { rollActivation, settleActivation, actText, moduleFx, workingIndex, isEnergyWeapon, weaponPower, weaponBlock, POWER, chargeItems, spareEpacks, rollBlast, blastDice, rollD6 } from '../../lib/energy.js';

  const ACTION_KINDS = ['dmg', 'multi', 'fatigue', 'selfHarm', 'disable', 'control', 'grappleAtk', 'hold', 'blast', 'shift', 'escape', 'info'];
  const FREE_KINDS = ['repair', 'repairModule', 'drone'];

  const cb = $derived(store.combat);
  const ord = $derived(order(store.data));
  const actor = $derived(store.ui.turnActor ? ord.find((r) => r.x.id === store.ui.turnActor) ?? current(store.data) : current(store.data));
  const overwatchShot = $derived(!!store.ui.turnActor && actor?.x.id === store.ui.turnActor);
  const key = $derived(actor ? `${actor.x.id}:${cb.round}:${overwatchShot}` : '');
  const T = $derived(store.ui.turn);
  const fresh = (k) => ({
    key: k, step: 'action', action: null, targetId: null, weaponIdx: null, range: 'Proche', aim: false, defenseless: false, defend: false, manual: 0,
    atk: null, atkFirst: null, def: null, stunts: [], reactive: 0, emp: 0, ignoreArmor: null, result: null, lockStunts: [], fleeRange: 'Courte', flee: null,
    fullAttr: false, fullOk: false, armlock: false, saw: 0, tentHold: false, location: 'random', protector: null, protect: null,
    bonus: null, preActs: [], postActs: [], info: null,
    fx: null, fxObj: null, fxTargets: [], fxEp: 1, fxDist: {}, fxArmor: true, fxReact: 0, fxEmp: 0, fxFrom: '', fxTo: '', fxAttr: '', fxMods: [], fxResult: null,
    droneAct: null, droneTarget: null, droneRange: 'Proche', droneRoll: null, droneDone: null,
    transferTo: null, transferN: 1,
    helpers: [], calcBy: null, calc: null, atkPushed: false
  });

  $effect(() => {
    if (!key) return;
    if (!store.ui.turn || store.ui.turn.key !== key) {
      store.ui.turn = fresh(key);
      // Overwatch lasts until the robot's next turn.
      if (actor && actor.x.overwatch && !overwatchShot) store.commitAll(null, (d) => (d.combat.combatants.find((y) => y.id === actor.x.id).overwatch = false));
    }
  });

  const log = (t) => store.log(t);
  const sgn = (n) => fmtBonus(n).replace('-', '−');
  const nm = (c) => c?.name || 'Sans nom';
  const ep = (c) => availableEp(store.data, c);
  const X = (d, id) => d.combat.combatants.find((y) => y.id === id);
  const C = (d, id) => d.chars.find((y) => y.id === id);
  const opponents = $derived(actor ? ord.filter((r) => r.x.side !== actor.x.side && !isDown(r)) : []);
  const allies = $derived(actor ? ord.filter((r) => r.x.side === actor.x.side && r.x.id !== actor.x.id && !isDown(r)) : []);
  const everyone = $derived(ord.filter((r) => !isDown(r)));  // explosions hit anyone close
  const target = $derived(T?.targetId ? ord.find((r) => r.c.id === T.targetId) : null);
  const kind = $derived(T?.action === 'shoot' ? 'ranged' : 'melee');
  const weapons = $derived(actor ? combatWeapons(actor.c, kind).filter((x) => !(T?.action === 'melee' && T?.targetId && ord.find((r) => r.c.id === T.targetId)?.x.held?.by === actor.x.id) || x.index === -1) : []);
  const w = $derived(weapons.find((x) => x.index === T?.weaponIdx) ?? weapons[0]);
  const wRef = $derived(w ? findWeapon(w.name) : null);
  const wNote = $derived(`${w?.note || ''} ${wRef?.note || ''}`);
  const energy = $derived(isEnergyWeapon(w));
  const power = $derived(energy ? weaponPower(w) : null);
  const ignoresArmor = $derived(/ignore (toute )?l?'?armure|ignore toute armure|Ignore l'armure/i.test(wNote));
  const lock = $derived(actor?.x.lock);
  const lockedOnTarget = $derived(!!(lock && target && lock.target === target.c.id));
  const asleep = $derived(!!actor && status(actor.c).asleep);
  const holder = $derived(actor?.x.held ? ord.find((r) => r.x.id === actor.x.held.by) : null);

  // ---- module effects available to the actor ----
  const fxOf = (k) => (actor ? moduleFx(actor.c, k) : []);
  const fullFx = $derived(fxOf('fullAttr')[0] ?? null);
  const sawFx = $derived(fxOf('sawDmg')[0] ?? null);
  const tentFx = $derived(fxOf('grappleHit')[0] ?? null);
  const moveFx = $derived(fxOf('move'));
  const actionFx = $derived(fxOf(ACTION_KINDS));
  const freeFx = $derived(fxOf(FREE_KINDS));
  const otherMods = $derived(actor ? combatModules(actor.c).filter((m) => !m.broken && !(m.ref.fx || []).length && m.ref.combat === 'action') : []);
  // The chosen effect is kept in the turn state: a Fatal Error breaks the
  // module mid-activation and it would vanish from the working list.
  const curFx = $derived(T?.fxObj ?? null);
  const anatomy = $derived(!!actor && hasSecondary(actor.c, 'Anatomie robotique') && target && target.c.body !== 'creature');
  const armlockOk = $derived(!!actor && hasSecondary(actor.c, 'Clé de bras'));

  const mods = $derived.by(() => {
    if (!actor || !T) return [];
    const L = [];
    if (T.action === 'shoot') {
      const r = D.shootRanges.find((x) => x.id === T.range);
      if (r && !(r.id === 'Bras' && T.defenseless)) L.push({ label: `Portée ${r.label.toLowerCase()}${r.gm ? ' (MJ)' : ''}`, v: r.mod });
      if (T.aim) L.push({ label: actor.c.cover ? 'Visée appuyée' : 'Visée', v: actor.c.cover ? 2 : 1 });
    }
    if (T.armlock && kind === 'melee') L.push({ label: 'Clé de bras', v: 2 });
    if (grappling) L.push({ label: "Attaque d'immobilisation", v: 2 });
    if (lockedOnTarget) L.push({ label: 'Cible verrouillée', v: lock.atk });
    if (target?.x.lock && target.x.lock.target !== actor.c.id) L.push({ label: `${nm(target.c)} est focalisé ailleurs`, v: 1 });
    if (T.helpers?.length) L.push({ label: `Aide (${T.helpers.length})`, v: T.helpers.length });
    if (T.calc && T.calc.successes > 1) L.push({ label: `Calcul de ${nm(ord.find((r) => r.x.id === T.calcBy)?.c)}`, v: T.calc.successes - 1 });
    if (T.manual) L.push({ label: 'Autre modificateur', v: T.manual });
    return L.filter((m) => m.v !== 0);
  });
  const modSum = $derived(mods.reduce((t, m) => t + m.v, 0));
  const progKey = $derived(kind === 'melee' ? 'assaut' : 'tir');
  const pk0 = $derived(actor ? poolFor(actor.c, progKey) : null);
  // Grapple attack (book p.85): while you hold the target, unarmed only, +2, no defense.
  const grappling = $derived(!!(target && actor && kind === 'melee' && target.x.held?.by === actor.x.id));
  const atkPool = $derived(actor && w ? poolFor(actor.c, w.prog || progKey, { mod: modSum, gear: Number(w.bonus) || 0, full: T?.fullOk }) : null);
  const defWeapon = $derived(target ? combatWeapons(target.c, 'melee').filter((x) => !weaponBlock(target.c, x, ep(target.c))).sort((a, b) => (Number(b.bonus) || 0) - (Number(a.bonus) || 0))[0] : null);
  const defPool = $derived(target && T?.defend ? poolFor(target.c, 'assaut', { gear: Number(defWeapon?.bonus) || 0 }) : null);
  const drained = $derived(!!(energy && power === 'epack' && T?.atkFirst && T.atkFirst.gear > 0 && T.atkFirst.gearOnes === T.atkFirst.gear));
  const net = $derived(T?.atk && !drained ? Math.max(0, T.atk.successes - (T.defend ? T.def?.successes || 0 : 0)) : 0);
  const extra = $derived(Math.max(0, net - 1));
  const baseDmg = $derived((Number(w?.degats) || 0) + (lockedOnTarget ? lock.dmg : 0));
  const stuntDmg = $derived(T ? T.stunts.slice(0, extra).filter((s) => s === 'dmg').length : 0);
  const totalDmg = $derived(baseDmg + stuntDmg);
  const extraArms = $derived(!!target && hasWorkingModule(target.c, 'Bras supplémentaires'));
  const canDefend = $derived(!!target && !isDown(target) && !target.x.held && !grappling && (!target.x.defending || (extraArms && ep(target.c) >= 1)));
  const rolled = $derived(T?.atk && (!T.defend || T.def));
  const protectors = $derived(target ? ord.filter((r) => r.x.side === target.x.side && r.c.id !== target.c.id && !isDown(r) && r.c.model === 'security' && (r.c.specialRating || 0) > 0 && r.x.protectRound !== cb.round && !r.x.held) : []);
  const prot = $derived(T?.protector ? ord.find((r) => r.x.id === T.protector) : null);
  // Help (+1 each, costs the helper's action — book p.81; NPC groups attack
  // together the same way) and Calculate (Protocol Robot, book p.61).
  const supporters = $derived(actor && !overwatchShot ? allies.filter((r) => !r.x.acted && !r.x.lostAction && !r.x.held && !status(r.c).asleep) : []);
  const calculators = $derived(supporters.filter((r) => r.c.model === 'protocol' && (r.c.specialRating || 0) > 0));
  const calcRow = $derived(T?.calcBy ? ord.find((r) => r.x.id === T.calcBy) : null);
  const swarmTarget = $derived(!!target && isSwarm(target.c));
  const extraOpts = $derived.by(() => {
    if (!actor || !T || !['melee', 'shoot'].includes(T.action) || !target || isDown(target)) return [];
    const used = actor.x.extra?.round === cb.round ? actor.x.extra.used : [];
    return moduleFx(actor.c, 'extraAttack').filter((f) => f.progs.includes(T.action) && !used.includes(f.module) && ep(actor.c) >= f.cost);
  });

  function set(patch) { store.ui.turn = { ...store.ui.turn, ...patch }; }
  const firstFree = (ws, swarm) => ws.find((x) => !weaponBlock(actor.c, x, ep(actor.c)) && !!x.swarmOnly === swarm) ?? ws.find((x) => !weaponBlock(actor.c, x, ep(actor.c)) && !x.swarmOnly) ?? ws[0];
  function choose(action) {
    const first = opponents[0]?.c.id ?? null;
    const ws = actor ? combatWeapons(actor.c, action === 'shoot' ? 'ranged' : 'melee') : [];
    const tgt = action === 'target' ? first : lock ? (opponents.find((o) => o.c.id === lock.target)?.c.id ?? first) : first;
    const w0 = firstFree(ws, isSwarm(ord.find((r) => r.c.id === tgt)?.c));
    set({ action, step: action === 'melee' || action === 'shoot' ? 'setup' : action, targetId: tgt, weaponIdx: w0?.index ?? null, range: action === 'shoot' ? (rangeIndex(w0?.portee) >= 2 ? 'Courte' : 'Proche') : 'Bras' });
  }

  // ---- attack ----
  function toRoll() {
    const acts = [];
    let fullOk = false;
    let full = null;
    if (T.fullAttr && fullFx) { full = rollActivation(actor.c, fullFx.cost); fullOk = full.works; acts.push({ name: fullFx.module, act: full, who: actor.c.id, index: fullFx.index }); }
    let defOk = T.defend;
    let defAct = null;
    const again = T.defend && target.x.defending;
    if (again) { defAct = rollActivation(target.c, 1); defOk = defAct.works; acts.push({ name: 'Bras supplémentaires', act: defAct, who: target.c.id, index: workingIndex(target.c, 'Bras supplémentaires') }); }
    const ax = actor.x.id, aid = actor.c.id, wi = w?.index;
    const helpers = T.helpers.map((id) => ord.find((r) => r.x.id === id)).filter(Boolean);
    const calcBy = calcRow;
    store.commitAll(null, (d) => {
      acts.forEach((a) => { const c = C(d, a.who); settleActivation(d, c, a.index, a.act, payEp); log(`${nm(c)} : ${actText(a.name, a.act)}`); });
      const me = C(d, aid);
      helpers.forEach((h) => { X(d, h.x.id).lostAction = true; });
      if (helpers.length) log(`${helpers.map((h) => nm(h.c)).join(', ')} ${helpers.length > 1 ? 'aident' : 'aide'} ${nm(me)} (+${helpers.length}) : action utilisée`);
      if (calcBy) { X(d, calcBy.x.id).lostAction = true; log(`${nm(calcBy.c)} calcule pour ${nm(me)} : ${T.calc?.successes || 0} succès`); }

      if (energy && wi >= 0) {
        if (power === 'internal') { payEp(d, me, 1); log(`${nm(me)} tire sur son alimentation interne : −1 PE`); }
        if (power === 'crank') me.weapons[wi].crankDue = true;
      }
      if (T.defend && defOk && target) {
        const y = X(d, target.x.id);
        if (!again) { y.defending = true; y.lostAction = true; }
        y.defenses = (y.defenses || 0) + 1;
        log(`${nm(target.c)} se défend${again ? ' encore (Bras supplémentaires)' : ' : perd sa prochaine action'}`);
      }
    });
    set({ ...(wi >= 0 && actor.c.weapons[wi]?.oneUse ? { spentIdx: [...new Set([...(T.spentIdx || []), wi])] } : {}), step: 'roll', atk: null, atkFirst: null, atkPushed: false, def: null, stunts: [], fullOk, defend: T.defend && defOk, preActs: acts });
  }
  function onAtk(t, pushed) {
    set({ atk: t, atkPushed: !!pushed, ...(pushed ? {} : { atkFirst: t }) });
    if (!pushed && energy && power === 'epack' && t.gear > 0 && t.gearOnes === t.gear && w.index >= 0) {
      const aid = actor.c.id, wi = w.index;
      store.commitOn(aid, `${w.name} : E-pack vide`, (s) => { s.weapons[wi].empty = true; log(`${nm(s)} : l'E-pack de ${w.name} est vide, l'attaque est perdue`); });
    }
  }
  function toDamage() { set({ step: 'damage', stunts: Array.from({ length: extra }, () => 'dmg'), ignoreArmor: ignoresArmor, reactive: 0, emp: 0, saw: 0, tentHold: false, location: 'random', protector: null, protect: null }); }

  function applyDamage() {
    const tid = target.c.id, aid = actor.c.id, axid = actor.x.id, txid = target.x.id;
    const st = T.stunts.slice(0, extra);
    const ranged = kind === 'ranged';
    const post = [];
    const saw = T.saw > 0 && sawFx ? rollActivation(actor.c, T.saw) : null;
    if (saw) post.push({ name: sawFx.module, act: saw, who: aid, index: sawFx.index });
    const tent = T.tentHold && tentFx ? rollActivation(actor.c, tentFx.cost) : null;
    if (tent) post.push({ name: tentFx.module, act: tent, who: aid, index: tentFx.index });
    const ra = T.reactive > 0 ? rollActivation(target.c, T.reactive) : null;
    if (ra) post.push({ name: 'Armure réactive', act: ra, who: tid, index: workingIndex(target.c, 'Armure réactive') });
    const emp = T.emp > 0 ? rollActivation(target.c, T.emp) : null;
    if (emp) post.push({ name: 'Protection anti-IEM', act: emp, who: tid, index: workingIndex(target.c, 'Protection anti-IEM') });
    const amount = totalDmg + (saw?.works ? saw.effective : 0);
    const reduce = (ra?.works ? ra.effective : 0) + (emp?.works ? emp.effective : 0);
    const absorb = prot && T.protect ? T.protect.successes : 0;
    let res;
    store.commitAll(null, (d) => {
      post.forEach((a) => { const c = C(d, a.who); settleActivation(d, c, a.index, a.act, payEp); log(`${nm(c)} : ${actText(a.name, a.act)}`); });
      const t = C(d, tid);
      res = resolveDamage(t, { amount, ranged, melee: !ranged, coverRating: t.cover || 0, ignoreArmor: T.ignoreArmor, reduce, reduceLabel: ra?.works && emp?.works ? 'Armure réactive et anti-IEM' : ra?.works ? 'Armure réactive' : 'Protection anti-IEM', location: anatomy ? T.location : 'random', absorb, absorbLabel: prot ? `${nm(prot.c)} protège` : '' });
      if (ranged && t.cover) t.cover = res.newCover;
      if (prot) {
        X(d, prot.x.id).protectRound = d.combat.round;
        if (res.absorbed) { const p = C(d, prot.c.id); const r2 = resolveDamage(p, { amount: res.absorbed, ignoreArmor: true }); res.steps.push(`${nm(p)} : ${r2.steps.join(' ; ')}`); }
      }
      const ax = X(d, axid), tx = X(d, txid);
      const n = (k) => st.filter((s) => s === k).length;
      if (n('init')) ax.init = (ax.init || 0) + 2 * n('init');
      if (n('disarm')) tx.init = (tx.init || 0) - n('disarm');
      if (n('prone')) tx.prone = true;
      if (n('grapple') || tent?.works) tx.held = { by: axid, how: tent?.works && !n('grapple') ? 'Tentacules' : 'Immobilisé', mod: 0, with: 'Assaut opposé' };
      if (res.taken > 0) tx.overwatch = false;
      const extras = [n('init') && `+${2 * n('init')} initiative`, n('disarm') && 'désarme', n('prone') && 'renverse', (n('grapple') || tent?.works) && 'immobilise', saw?.works && `tronçonneuse +${saw.effective}`].filter(Boolean);
      log(`${nm(actor.c)} → ${nm(t)} (${w.name}) : ${amount} dégât${amount > 1 ? 's' : ''}${extras.length ? `, ${extras.join(', ')}` : ''}. ${res.steps.join(' ; ')}`);
    });
    store.notify(res.taken ? `${nm(target.c)} encaisse ${res.taken} dégât${res.taken > 1 ? 's' : ''}` : `${nm(target.c)} : tout est bloqué`, true);
    set({ step: 'result', result: res, postActs: post });
  }
  function armlockHold() {
    const axid = actor.x.id, txid = target.x.id;
    store.commitAll(`${nm(target.c)} est immobilisé`, (d) => { X(d, txid).held = { by: axid, how: 'Clé de bras', mod: -2, with: 'Assaut opposé' }; log(`${nm(actor.c)} fait une clé de bras à ${nm(target.c)} : immobilisé, −2 pour se libérer`); });
    set({ step: 'done', doneMsg: `${nm(target.c)} est immobilisé (−2 à ses tentatives pour se libérer).` });
  }
  function extraAttack(f) {
    const a = rollActivation(actor.c, f.cost);
    const axid = actor.x.id, aid = actor.c.id, mod = f.module;
    store.commitAll(null, (d) => {
      const c = C(d, aid), x = X(d, axid);
      settleActivation(d, c, f.index, a, payEp);
      x.extra = { round: d.combat.round, used: [...(x.extra?.round === d.combat.round ? x.extra.used : []), mod] };
      log(`${nm(c)} : ${actText(mod, a)}${a.works ? ' : attaque supplémentaire' : ''}`);
    });
    if (a.works) set({ step: 'setup', atk: null, atkFirst: null, def: null, stunts: [], result: null, defend: false, fullAttr: false, fullOk: false, armlock: false, preActs: [{ name: mod, act: a }], postActs: [], bonus: mod, saw: 0, tentHold: false, protector: null, protect: null });
    else set({ info: { name: mod, act: a } });
  }

  // ---- other actions ----
  function lockOn() {
    const s = T.lockStunts.slice(0, Math.max(0, (T.atk?.successes || 0) - 1));
    const n = (k) => s.filter((x) => x === k).length;
    store.commitAll(`${nm(actor.c)} verrouille ${nm(target.c)}`, (d) => {
      const x = X(d, actor.x.id);
      x.lock = { target: target.c.id, atk: 1 + n('atk'), dmg: n('dmg') };
      if (n('init')) x.init = (x.init || 0) + n('init');
      log(`${nm(actor.c)} verrouille ${nm(target.c)} : +${1 + n('atk')} aux attaques${n('dmg') ? `, +${n('dmg')} dégât` : ''}${n('init') ? `, +${n('init')} initiative` : ''}. Les autres ennemis ont +1 contre lui.`);
    });
    set({ step: 'done', doneMsg: `${nm(actor.c)} verrouille ${nm(target.c)} : +${1 + n('atk')} à ses attaques contre lui${n('dmg') ? `, +${n('dmg')} dégât` : ''}. Les autres ennemis ont +1 contre ${nm(actor.c)}.` });
  }
  // Calculate: withdraw the action after the roll, before pushing, and pick another.
  function withdraw() {
    log(`${nm(actor.c)} renonce à son attaque sur le conseil de ${nm(calcRow?.c)}`);
    set({ step: 'action', atk: null, atkFirst: null, def: null, defend: false, calc: null, calcBy: null, helpers: [], preActs: [] });
  }
  function finish() {
    const id = actor.x.id, cid = actor.c.id;
    const ow = overwatchShot;
    const spentIdx = T?.spentIdx || [];
    store.ui.turnActor = null;
    store.ui.turn = null;
    store.commitAll(null, (d) => {
      const me = C(d, cid);
      // One-use recycled weapons are thrown away once the turn they were used ends.
      if (me && spentIdx.length) { me.weapons = me.weapons.filter((x, i) => !(spentIdx.includes(i) && x.oneUse)); log(`${nm(me)} jette son arme recyclée`); }
      const x = X(d, id);
      if (ow) { x.overwatch = false; x.lostAction = true; log(`${nm(actor.c)} a tiré en surveillance`); return; }
      endTurn(d, x, log);
    });
    const nx = current(store.data);
    if (nx) store.notify(`Au tour de ${nm(nx.c)}`);
  }
  function wait(v) {
    store.commitAll(`${nm(actor.c)} attend (initiative ${v})`, (d) => (X(d, actor.x.id).init = v));
    log(`${nm(actor.c)} attend et passe à l'initiative ${v}`);
    store.ui.turn = null;
  }
  function flee(how = '') {
    store.commitAll(`${nm(actor.c)} s'échappe`, (d) => { X(d, actor.x.id).fled = true; });
    log(`${nm(actor.c)} quitte le combat${how ? ` (${how})` : ''}`);
    store.ui.turn = null;
  }
  function breakFree() {
    store.commitAll(`${nm(actor.c)} se libère`, (d) => { X(d, actor.x.id).held = null; });
    log(`${nm(actor.c)} se libère`);
  }
  const setCover = (v) => store.commitOn(actor.c.id, null, (c) => (c.cover = v));
  const stand = () => store.commitAll(`${nm(actor.c)} se relève`, (d) => (X(d, actor.x.id).prone = false));
  const overwatch = () => store.commitAll(`${nm(actor.c)} se met en surveillance`, (d) => (X(d, actor.x.id).overwatch = true));
  const covers = [{ name: 'À découvert', armor: 0 }, ...D.coverPresets];
  const stuntOpts = $derived([
    { id: 'dmg', label: '+1 dégât' }, { id: 'init', label: '+2 initiative' }, { id: 'disarm', label: 'Désarmer' }, { id: 'prone', label: 'Renverser' },
    ...(kind === 'melee' ? [{ id: 'grapple', label: 'Immobiliser' }] : [])
  ]);

  // Enhancing effect used alone (movement): pay, roll overheating, show it.
  function quickFx(f) {
    const a = rollActivation(actor.c, f.cost);
    const aid = actor.c.id;
    store.commitAll(null, (d) => { const c = C(d, aid); settleActivation(d, c, f.index, a, payEp); log(`${nm(c)} : ${actText(f.module, a)}${a.works ? ` : ${f.label.toLowerCase()}` : ''}`); });
    set({ info: { name: `${f.module} : ${f.label}`, act: a } });
  }

  // ---- energy management ----
  const charges = $derived(actor && actor.c.kind !== 'npc' ? chargeItems(actor.c) : []);
  const emptyWeapons = $derived(actor ? (actor.c.weapons || []).map((x, i) => ({ ...x, index: i })).filter((x) => isEnergyWeapon(x) && weaponPower(x) === 'epack' && x.empty) : []);
  const crankWeapons = $derived(actor ? (actor.c.weapons || []).map((x, i) => ({ ...x, index: i })).filter((x) => isEnergyWeapon(x) && weaponPower(x) === 'crank' && x.crankDue) : []);
  const spare = $derived(actor ? spareEpacks(actor.c) : []);
  const transferable = $derived(actor && actor.c.kind !== 'npc' && actor.c.body !== 'creature' ? allies.filter((r) => r.c.kind !== 'npc' && r.c.body !== 'creature') : []);
  function useCharge(item) {
    const roll = rollD6();
    const aid = actor.c.id;
    store.commitOn(aid, null, (s) => {
      const before = s.ep.current;
      s.ep.current = Math.min(epMax(s), before + roll);
      s.equipment.splice(item.index, 1);
      log(`${nm(s)} se recharge avec ${item.name} : D6 = ${roll}, +${s.ep.current - before} PE (${item.name} vidé)`);
      store.notify(`${item.name} : +${s.ep.current - before} PE`, true);
    });
  }
  function reload(wp) {
    const aid = actor.c.id;
    const sp = actor.c.kind !== 'npc' ? spare[0] : null;
    store.commitOn(aid, `${wp.name} rechargé`, (s) => {
      s.weapons[wp.index].empty = false;
      if (sp) s.equipment.splice(sp.index, 1);
      log(`${nm(s)} recharge ${wp.name} avec un E-pack neuf`);
    });
  }
  function crank(wp) {
    store.commitOn(actor.c.id, `${wp.name} remonté`, (s) => { s.weapons[wp.index].crankDue = false; log(`${nm(s)} remonte la manivelle de ${wp.name}`); });
    set({ step: 'done', doneMsg: `${wp.name} est prêt à tirer de nouveau.` });
  }
  function transfer() {
    const to = ord.find((r) => r.c.id === T.transferTo);
    if (!to) return;
    const n = T.transferN, aid = actor.c.id;
    let got = 0;
    store.commitAll(null, (d) => {
      const a = C(d, aid), b = C(d, to.c.id);
      got = Math.min(n, epMax(b) - b.ep.current, a.ep.current);
      a.ep.current -= got; b.ep.current += got;
      log(`${nm(a)} transfère ${got} PE à ${nm(b)} par câble`);
    });
    set({ step: 'done', doneMsg: `${got} PE transférés à ${nm(to.c)}.` });
  }

  // ---- module actions ----
  const single = (k) => ['dmg', 'fatigue', 'selfHarm', 'disable', 'control', 'grappleAtk'].includes(k);
  const multiK = (k) => ['multi', 'hold'].includes(k);
  const usesArmor = (k) => ['dmg', 'selfHarm', 'grappleAtk', 'multi', 'blast'].includes(k);
  function fxCandidates(f) {
    if (!f) return [];
    if (f.kind === 'blast') return [...opponents, ...allies, ...everyone.filter((r) => r.x.id === actor.x.id)];
    let L = opponents;
    if (f.robotOnly) L = L.filter((r) => r.c.body !== 'creature');
    if (f.kind === 'fatigue') L = L.filter((r) => r.c.body === 'creature');
    return L;
  }
  function pickFx(f) {
    const cand = fxCandidates(f);
    set({ step: 'fx', fx: f.key, fxObj: f, fxTargets: single(f.kind) && cand[0] ? [cand[0].c.id] : [], fxEp: f.perEp ? 1 : f.cost, fxDist: {}, fxArmor: f.armor !== false, fxReact: 0, fxEmp: 0, fxFrom: '', fxTo: '', fxAttr: '', fxMods: [], fxResult: null });
  }
  const fxTarget = $derived(curFx && single(curFx.kind) && T.fxTargets[0] ? ord.find((r) => r.c.id === T.fxTargets[0]) : null);
  const fxCost = $derived.by(() => {
    if (!curFx) return 0;
    if (multiK(curFx.kind)) return T.fxTargets.length;
    if (curFx.kind === 'disable') return T.fxMods.length;
    return curFx.perEp ? T.fxEp : curFx.cost;
  });
  const bestWeaponDmg = (c) => Math.max(1, ...combatWeapons(c, 'melee').concat(combatWeapons(c, 'ranged')).map((x) => Number(x.degats) || 0));
  const fxReady = $derived.by(() => {
    if (!curFx || T.fxResult) return false;
    if (fxCost < 1 && !(curFx.cost === 0)) return false;
    if (fxCost > ep(actor.c)) return false;
    const k = curFx.kind;
    if (single(k) && !fxTarget) return false;
    if (k === 'disable' && !T.fxMods.length) return false;
    if (multiK(k) && !T.fxTargets.length) return false;
    if (k === 'blast' && !T.fxTargets.length) return false;
    if (k === 'shift' && !(T.fxFrom && T.fxTo && T.fxFrom !== T.fxTo)) return false;
    if (k === 'repair' && !T.fxAttr) return false;
    if (k === 'repairModule' && T.fxAttr === '') return false;
    return true;
  });
  function toggleFxTarget(id) {
    const has = T.fxTargets.includes(id);
    set({ fxTargets: has ? T.fxTargets.filter((x) => x !== id) : [...T.fxTargets, id] });
  }
  function runFx() {
    const f = curFx, k = f.kind, n = fxCost;
    const a = rollActivation(actor.c, n);
    const per = a.ep ? a.effective / a.ep : 1; // Power Surge doubles each EP
    const aid = actor.c.id, axid = actor.x.id;
    const ra = fxTarget && T.fxReact > 0 ? rollActivation(fxTarget.c, T.fxReact) : null;
    const emp = fxTarget && T.fxEmp > 0 ? rollActivation(fxTarget.c, T.fxEmp) : null;
    const blasts = k === 'blast' ? Object.fromEntries(T.fxTargets.map((id) => [id, rollBlast(f.power, T.fxDist[id] || 'Proche', f.wd)])) : {};
    const lines = [];
    const reacts = [ra && { name: 'Armure réactive', act: ra, who: fxTarget.c.id, index: workingIndex(fxTarget.c, 'Armure réactive') }, emp && { name: 'Protection anti-IEM', act: emp, who: fxTarget.c.id, index: workingIndex(fxTarget.c, 'Protection anti-IEM') }].filter(Boolean);
    store.commitAll(null, (d) => {
      const me = C(d, aid), mx = X(d, axid);
      settleActivation(d, me, f.index, a, payEp);
      reacts.forEach((r) => settleActivation(d, C(d, r.who), r.index, r.act, payEp));
      log(`${nm(me)} : ${actText(f.module, a)}`);
      if (!a.works) return;
      const reduce = (ra?.works ? ra.effective : 0) + (emp?.works ? emp.effective : 0);
      const hit = (cid, amount, opts = {}) => { const t = C(d, cid); const r = resolveDamage(t, { amount, ignoreArmor: !T.fxArmor, ...opts }); lines.push({ name: nm(t), steps: r.steps }); if (r.taken) { const tx = d.combat.combatants.find((y) => y.cid === cid); if (tx) tx.overwatch = false; } return r; };
      const rOpts = { reduce, reduceLabel: ra?.works && emp?.works ? 'Armure réactive et anti-IEM' : ra?.works ? 'Armure réactive' : 'Protection anti-IEM' };
      if (k === 'dmg') hit(T.fxTargets[0], a.effective, rOpts);
      else if (k === 'selfHarm') { const t = C(d, T.fxTargets[0]); hit(t.id, bestWeaponDmg(t) + a.effective, rOpts); }
      else if (k === 'grappleAtk') { hit(T.fxTargets[0], a.effective, rOpts); const tx = d.combat.combatants.find((y) => y.cid === T.fxTargets[0]); if (tx) tx.held = { by: axid, how: f.module, mod: 0, with: 'Assaut opposé' }; }
      else if (k === 'multi') T.fxTargets.forEach((id) => hit(id, per));
      else if (k === 'blast') T.fxTargets.forEach((id) => { const b = blasts[id]; const t = C(d, id); if (!b.amount) { lines.push({ name: nm(t), steps: [`Souffle ${b.dice.length} dés (${T.fxDist[id] || 'Proche'}) : aucun 6`] }); return; } const r = resolveDamage(t, { amount: b.amount, ignoreArmor: !T.fxArmor }); lines.push({ name: nm(t), steps: [`Souffle ${b.dice.length} dés (${T.fxDist[id] || 'Proche'}) : ${b.amount} dégât${b.amount > 1 ? 's' : ''}`, ...r.steps] }); });
      else if (k === 'fatigue') { const t = C(d, T.fxTargets[0]); const ch = chassis(t); const cur = attrCurrent(t, ch, 'stabilite'); const h = Math.min(cur, a.effective); t.damage.stabilite = (t.damage.stabilite || 0) + h; lines.push({ name: nm(t), steps: [`${attrLabel(t, 'stabilite')} −${h} (fatigue, l'armure ne protège pas)${cur - h === 0 ? ' : brisé' : ''}`] }); }
      else if (k === 'disable') { const t = C(d, T.fxTargets[0]); T.fxMods.forEach((i) => { if (!(t.brokenModules || []).includes(i)) t.brokenModules = [...(t.brokenModules || []), i]; }); lines.push({ name: nm(t), steps: [`Désactivé : ${T.fxMods.map((i) => t.modules[i]).join(', ')}`] }); }
      else if (k === 'control') { const t = C(d, T.fxTargets[0]); lines.push({ name: nm(t), steps: [`${nm(me)} décide de sa prochaine action (jet normal pour la cible ; PE en plus pour lui faire utiliser un module)`] }); }
      else if (k === 'hold') T.fxTargets.forEach((id) => { const tx = d.combat.combatants.find((y) => y.cid === id); if (tx) tx.held = { by: axid, how: f.how || f.module, mod: f.breakMod || 0, with: f.breakWith || 'Assaut opposé' }; lines.push({ name: nm(C(d, id)), steps: [`Immobilisé (${f.breakWith} à ${sgn(f.breakMod)} pour se libérer)`] }); });
      else if (k === 'shift') { const ch = chassis(me); const moved = Math.min(a.effective, me.damage[T.fxTo] || 0, attrCurrent(me, ch, T.fxFrom)); me.damage[T.fxTo] -= moved; me.damage[T.fxFrom] = (me.damage[T.fxFrom] || 0) + moved; lines.push({ name: nm(me), steps: [`${moved} point${moved > 1 ? 's' : ''} déplacé${moved > 1 ? 's' : ''} : ${attrLabel(me, T.fxFrom)} → ${attrLabel(me, T.fxTo)}`] }); }
      else if (k === 'repair') { const h = Math.min(a.effective, me.damage[T.fxAttr] || 0); me.damage[T.fxAttr] -= h; lines.push({ name: nm(me), steps: [`${attrLabel(me, T.fxAttr)} +${h} (réparé)`] }); }
      else if (k === 'repairModule') { const i = Number(T.fxAttr); me.brokenModules = (me.brokenModules || []).filter((b) => b !== i); lines.push({ name: nm(me), steps: [`Module ${me.modules[i]} réparé`] }); }
      else if (k === 'escape') { mx.fled = true; lines.push({ name: nm(me), steps: ['Quitte le combat sans jet'] }); }
      else lines.push({ name: nm(me), steps: [f.label] });
      lines.forEach((l) => log(`${f.module} → ${l.name} : ${l.steps.join(' ; ')}`));
    });
    set({ fxResult: { act: a, lines, reacts } });
  }

  // ---- hover drone ----
  const dronePool = $derived(T?.droneRange ? { attr: 'stabilite', base: 3, prog: Math.max(0, 3 + (D.shootRanges.find((r) => r.id === T.droneRange)?.mod || 0)), neg: Math.max(0, -(3 + (D.shootRanges.find((r) => r.id === T.droneRange)?.mod || 0))), gear: 0 } : null);
  function droneOrder(f) {
    const a = rollActivation(actor.c, f.cost);
    const aid = actor.c.id;
    store.commitAll(null, (d) => { const c = C(d, aid); settleActivation(d, c, f.index, a, payEp); log(`${nm(c)} : ${actText(f.module, a)}${a.works ? ' : ordre de tir au drone' : ''}`); });
    set({ droneAct: a, droneRoll: null, droneDone: null, droneTarget: T.droneTarget ?? opponents[0]?.c.id ?? null });
  }
  function droneDamage() {
    const amount = 1 + Math.max(0, T.droneRoll.successes - 1);
    let res;
    store.commitAll(null, (d) => { const t = C(d, T.droneTarget); res = resolveDamage(t, { amount, ranged: true, coverRating: t.cover || 0 }); if (t.cover) t.cover = res.newCover; log(`Drone de ${nm(actor.c)} → ${nm(t)} : ${amount} dégât${amount > 1 ? 's' : ''}. ${res.steps.join(' ; ')}`); });
    set({ droneDone: res });
  }
</script>

{#if !actor}
  <section class="panel turn"><p class="muted">Personne ne peut agir.</p></section>
{:else if T}
  <section class="panel turn" style="--tc:{actor.c.kind !== 'npc' && actor.c.color ? actor.c.color : actor.x.side === 'enemy' ? 'var(--fault)' : 'var(--muted)'}">
    <header class="who">
      <Avatar c={actor.c} side={actor.x.side} size={54} label={false} current />
      <div>
        <span class="eyebrow">{overwatchShot ? 'Tir de surveillance' : T.bonus ? `Attaque supplémentaire (${T.bonus})` : `Au tour de`}</span>
        <h2>{nm(actor.c)}</h2>
        <span class="meta">{actor.x.side === 'ally' ? 'Allié' : 'Ennemi'}, initiative {actor.x.init}{lock ? `, verrouille ${nm(store.char(lock.target))} (+${lock.atk}${lock.dmg ? `, +${lock.dmg} dégât` : ''})` : ''}</span>
      </div>
      {#if actor.c.body !== 'creature'}
        <span class="epbadge" class:low={ep(actor.c) <= 1} title={actor.c.kind === 'npc' && cb.usePool ? 'Réserve du MJ' : 'Énergie'}><Icon name="bolt" size={14} /><b class="num">{ep(actor.c)}</b><small>{actor.c.kind === 'npc' && cb.usePool ? 'MJ' : 'PE'}</small></span>
      {/if}
    </header>

    <ol class="steps" aria-label="Étapes du tour">
      {#each [['action', 'Action'], ['setup', 'Cible'], ['roll', 'Dés'], ['damage', 'Dégâts']] as [id, lb], i (id)}
        {@const idx = ['action', 'setup', 'roll', 'damage', 'result'].indexOf(T.step)}
        <li class:on={T.step === id || (id === 'damage' && T.step === 'result')} class:done={idx > i && idx <= 4}>{lb}</li>
      {/each}
    </ol>

    {#if T.step === 'action'}
      {#if asleep}
        <p class="banner bad"><span>{nm(actor.c)} n'a plus de PE : <b>en veille</b>, totalement inactif. Il se réveille un tour après avoir reçu au moins 1 PE (transfert d'un allié, E-pack…).</span></p>
        <div class="actions"><button class="act pass" onclick={finish}><b>Fin du tour</b><span>Passer au suivant</span></button></div>
      {:else}
      {#if actor.x.lostAction && !overwatchShot}<p class="banner"><span>{nm(actor.c)} a utilisé son action pour se défendre ou tirer en surveillance : <b>manœuvres seulement</b> ce tour.</span></p>{/if}
      {#if actor.x.prone}<p class="banner">À terre. <button class="btn small" onclick={stand}>Se relever (manœuvre)</button></p>{/if}
      {#if actor.x.held}<p class="banner"><span>Immobilisé ({actor.x.held.how}{holder ? ` par ${nm(holder.c)}` : ''}) : aucune action physique. Se libérer : {actor.x.held.with}{actor.x.held.mod ? ` à ${sgn(actor.x.held.mod)}` : ''}, compte comme une action.</span> <button class="btn small" onclick={breakFree}>Libéré</button></p>{/if}
      {#if T.info}<OverheatDice act={T.info.act} name={T.info.name} compact />{/if}

      <div class="manoeuvre">
        <span class="lbl">Manœuvre</span>
        <div class="chips">
          {#each covers as cv (cv.name)}<button class="chip" aria-pressed={(actor.c.cover || 0) === cv.armor} onclick={() => setCover(cv.armor)}>{cv.armor ? `${cv.name} ${cv.armor}` : cv.name}</button>{/each}
          {#if combatWeapons(actor.c, 'ranged').length}<button class="chip" aria-pressed={actor.x.overwatch} onclick={overwatch} disabled={actor.x.overwatch}>Surveillance</button>{/if}
        </div>
        {#if moveFx.length || charges.length || emptyWeapons.length}
          <div class="chips">
            {#each moveFx as f (f.key)}<button class="chip en" disabled={ep(actor.c) < f.cost} onclick={() => quickFx(f)}><Icon name="bolt" size={13} />{f.module} : {f.short || f.label} ({f.cost} PE)</button>{/each}
            {#each charges as it (it.index)}<button class="chip en" disabled={actor.c.ep.current >= epMax(actor.c)} onclick={() => useCharge(it)}><Icon name="bolt" size={13} />Se recharger : {it.name} (+D6 PE)</button>{/each}
            {#each emptyWeapons as wp (wp.index)}<button class="chip en" disabled={actor.c.kind !== 'npc' && !spare.length} onclick={() => reload(wp)}>Recharger {wp.name}{actor.c.kind !== 'npc' ? (spare.length ? ` (E-pack, ${spare.length} en réserve)` : ' : aucun E-pack') : ''}</button>{/each}
          </div>
        {/if}
      </div>

      {#if freeFx.length && !overwatchShot}
        <span class="lbl">Sans action</span>
        <div class="chips">
          {#each freeFx as f (f.key)}<button class="chip en" disabled={ep(actor.c) < (f.cost || 1)} onclick={() => (f.kind === 'drone' ? set({ step: 'drone', fx: f.key, fxObj: f, droneAct: null, droneRoll: null, droneDone: null }) : pickFx(f))}><Icon name="bolt" size={13} />{f.module} : {f.short || f.label}</button>{/each}
        </div>
      {/if}

      <span class="lbl">Action</span>
      <div class="actions">
        {#if !actor.x.lostAction || overwatchShot}
          {#if !overwatchShot}
            {@const pa = poolFor(actor.c, 'assaut')}
            {@const paFull = fullFx && chassis(actor.c).attrMax[pa.attr] > 0}
            <button class="act melee" disabled={pa.base <= 0 && !paFull} onclick={() => choose('melee')}><b>Corps à corps</b><span>{pa.base <= 0 ? (paFull ? `${attrLabel(actor.c, pa.attr)} brisé : Système de secours (1 PE)` : `${attrLabel(actor.c, pa.attr)} hors service : impossible`) : `Assaut, ${pa.base + pa.prog} dés + arme${actor.x.held ? ' (attaque d\'immobilisation seulement)' : ''}`}</span></button>
          {/if}
          {#if combatWeapons(actor.c, 'ranged').length}
            {@const pt = poolFor(actor.c, 'tir')}
            {@const ptFull = fullFx && chassis(actor.c).attrMax[pt.attr] > 0}
            <button class="act shoot" disabled={pt.base <= 0 && !ptFull} onclick={() => choose('shoot')}><b>Tirer</b><span>{pt.base <= 0 ? (ptFull ? `${attrLabel(actor.c, pt.attr)} brisé : Système de secours (1 PE)` : `${attrLabel(actor.c, pt.attr)} hors service : impossible`) : `Tir, ${combatWeapons(actor.c, 'ranged').map((x) => x.name + (weaponBlock(actor.c, x, ep(actor.c)) ? ` (${weaponBlock(actor.c, x, ep(actor.c))})` : '')).join(', ')}`}</span></button>
          {/if}
          {#if !overwatchShot && canTarget(actor.c)}
            <button class="act target" onclick={() => choose('target')}><b>{lock ? 'Changer de cible' : 'Verrouiller une cible'}</b><span>Cible niveau {actor.c.specialRating}, coûte l'action</span></button>
          {/if}
          {#if !overwatchShot && (actionFx.length || otherMods.length)}
            <button class="act mod" onclick={() => choose('module')}><b>Module</b><span>{[...new Set([...actionFx.map((f) => f.module), ...otherMods.map((m) => m.name)])].join(', ')}</span></button>
          {/if}
          {#if !overwatchShot}
            {#if opponents.some((o) => o.c.body !== 'creature') || (actor.c.model === 'companion' && (actor.c.specialRating || 0) > 0)}<button class="act logic" onclick={() => set({ step: 'logic' })}><b>Raisonner</b><span>{actor.c.model === 'companion' && (actor.c.specialRating || 0) > 0 ? 'Interaction ou Manipuler' : 'Interaction contre Contestation'}</span></button>{/if}
            {#if hasSecondary(actor.c, 'Souffleur de déchets') && (actor.c.specialRating || 0) > 0}<button class="act" onclick={() => set({ step: 'blower' })}><b>Souffleur de déchets</b><span>Nettoyer, portée Proche</span></button>{/if}
            {#if actor.c.model === 'scrap' && (actor.c.specialRating || 0) > 0}<button class="act" onclick={() => set({ step: 'recycle' })}><b>Recycler</b><span>Trouver une arme ou un outil</span></button>{/if}
            {#each crankWeapons as wp (wp.index)}<button class="act en" onclick={() => crank(wp)}><b>Remonter la manivelle</b><span>{wp.name}, sans jet</span></button>{/each}
            {#if transferable.length && actor.c.ep.current > 0}<button class="act en" onclick={() => set({ step: 'transfer', transferTo: transferable[0].c.id, transferN: 1 })}><b>Transférer des PE</b><span>À un allié, par câble</span></button>{/if}
            <button class="act" onclick={() => set({ step: 'wait', waitTo: Math.max(0, (actor.x.init || 1) - 1) })}><b>Attendre</b><span>Baisser son initiative</span></button>
            <button class="act" onclick={() => choose('flee')}><b>Fuir</b><span>Jet de Déplacement</span></button>
          {/if}
        {/if}
        <button class="act pass" onclick={finish}><b>{overwatchShot ? 'Annuler le tir' : 'Fin du tour'}</b><span>{overwatchShot ? 'Garder la surveillance' : 'Passer au suivant'}</span></button>
      </div>
      {/if}

    {:else if T.step === 'setup'}
      {#if T.preActs.length}{#each T.preActs as a, i (i)}<OverheatDice act={a.act} name={a.name} compact />{/each}{/if}
      <span class="lbl">Cible</span>
      <div class="targets">
        {#each (T.bonus === 'Accélérateur' ? opponents.filter((o) => o.c.id === T.targetId) : opponents) as o (o.x.id)}
          <button class="tg" aria-pressed={T.targetId === o.c.id} onclick={() => set({ targetId: o.c.id, defend: false })}>
            <Avatar c={o.c} side={o.x.side} size={44} selected={T.targetId === o.c.id} />
            <span class="tgi num">arm. {armorCurrent(o.c, chassis(o.c))}{o.c.cover ? `, couv. ${o.c.cover}` : ''}{lock?.target === o.c.id ? ', verrouillé' : ''}</span>
          </button>
        {/each}
        {#if !opponents.length}<p class="muted">Aucune cible debout.</p>{/if}
      </div>
      {#if grappling}<p class="hint">{nm(target.c)} est immobilisé par vous : attaque d'immobilisation, sans arme, +2, impossible à parer.</p>{/if}
      {#if T.bonus === 'Accélérateur'}<p class="hint">Accélérateur : même cible, sans manœuvre en plus.</p>{:else if T.bonus === 'Bras supplémentaires'}<p class="hint">Bras supplémentaires : ce 2e Assaut coûte aussi la manœuvre du tour.</p>{/if}

      <span class="lbl">{kind === 'melee' ? 'Arme de contact' : 'Arme'}</span>
      <div class="chips">
        {#each weapons as x (x.index)}
          {@const blk = weaponBlock(actor.c, x, ep(actor.c)) || (x.swarmOnly && !swarmTarget ? 'essaims seulement' : '')}
          <button class="chip" aria-pressed={w?.index === x.index} disabled={!!blk} onclick={() => set({ weaponIdx: x.index, range: rangeIndex(T.range) > rangeIndex(x.portee) ? x.portee : T.range })}>{x.name} {x.bonus !== '' && x.bonus != null ? `+${x.bonus}` : ''}, dégâts {x.degats}{blk ? ` (${blk})` : ''}</button>
        {/each}
      </div>
      {#if swarmTarget && !w?.swarmOnly}<p class="hint warn">{nm(target.c)} est un essaim : seuls le feu, les explosions, Nettoyer et l'Impulsion énergétique le blessent.</p>{/if}
      {#if w?.swarmOnly}<p class="hint">Nettoyer : l'équipement de nettoyage compte comme une arme, dégâts 3, portée Courte, sans bonus.</p>{/if}
      {#if energy && w.index >= 0}
        <p class="hint en-hint"><Icon name="bolt" size={13} />Arme à énergie, source : <b>{POWER.find((p) => p.id === power).label}</b>. {POWER.find((p) => p.id === power).hint}{power === 'internal' ? ` Reste ${ep(actor.c)} PE.` : ''}</p>
      {/if}

      {#if kind === 'ranged'}
        <span class="lbl">Portée de la cible</span>
        <div class="chips">
          {#each D.shootRanges as r (r.id)}
            <button class="chip" aria-pressed={T.range === r.id} disabled={rangeIndex(r.id) > rangeIndex(w?.portee)} onclick={() => set({ range: r.id })}>{r.label} {fmtBonus(r.mod)}{r.gm ? '*' : ''}</button>
          {/each}
        </div>
        {#if T.range === 'Lointaine'}<p class="hint">* Lointaine n'a pas de modificateur dans le livre : −3 par défaut, au MJ de trancher.</p>{/if}
        <div class="toggles">
          <label class="tog"><input type="checkbox" checked={T.aim} onchange={(e) => set({ aim: e.currentTarget.checked })} /><span>Viser (manœuvre) : +1{actor.c.cover ? ', +2 car à couvert' : ''}</span></label>
          {#if T.range === 'Bras'}<label class="tog"><input type="checkbox" checked={T.defenseless} onchange={(e) => set({ defenseless: e.currentTarget.checked })} /><span>Cible sans défense (pas de −3)</span></label>{/if}
        </div>
      {:else if target}
        <div class="toggles">
          {#if !T.armlock}<label class="tog"><input type="checkbox" checked={T.defend} disabled={!canDefend} onchange={(e) => set({ defend: e.currentTarget.checked })} /><span>{nm(target.c)} se défend {target.x.held ? '(immobilisé : impossible)' : !target.x.defending ? '(perd sa prochaine action)' : extraArms && ep(target.c) >= 1 ? '(Bras supplémentaires : 1 PE)' : '(a déjà défendu ce tour)'}</span></label>{/if}
          {#if armlockOk}<label class="tog"><input type="checkbox" checked={T.armlock} onchange={(e) => set({ armlock: e.currentTarget.checked, defend: false })} /><span>Clé de bras : +2, pas de dégât, la cible est immobilisée (−2 pour se libérer)</span></label>{/if}
        </div>
      {/if}
      {#if fullFx}
        {@const pk = poolFor(actor.c, progKey)}
        {@const mx = chassis(actor.c).attrMax[pk.attr]}
        {#if pk.base < mx}
          <label class="tog en-tog"><input type="checkbox" checked={T.fullAttr} disabled={ep(actor.c) < fullFx.cost} onchange={(e) => set({ fullAttr: e.currentTarget.checked })} /><span>Système de secours ({fullFx.cost} PE) : {attrLabel(actor.c, pk.attr)} complet, {mx} dés de base au lieu de {pk.base}</span></label>
        {/if}
      {/if}

      {#if supporters.length && !T.bonus}
        <div class="support">
          <span class="lbl">Soutien (coûte l'action de l'allié, pas sa manœuvre)</span>
          <div class="chips">
            {#each supporters.filter((r) => r.x.id !== T.calcBy) as r (r.x.id)}<button class="chip" aria-pressed={T.helpers.includes(r.x.id)} onclick={() => set({ helpers: T.helpers.includes(r.x.id) ? T.helpers.filter((x) => x !== r.x.id) : [...T.helpers, r.x.id] })}>Aide : {nm(r.c)} +1{actor.c.group && r.c.group === actor.c.group ? ' (groupe)' : ''}</button>{/each}
            {#each calculators.filter((r) => !T.helpers.includes(r.x.id)) as r (r.x.id)}<button class="chip en" aria-pressed={T.calcBy === r.x.id} onclick={() => set({ calcBy: T.calcBy === r.x.id ? null : r.x.id, calc: null })}>Calculer : {nm(r.c)}</button>{/each}
          </div>
          {#if calcRow}
            {#key calcRow.x.id}<DiceTray cid={calcRow.c.id} title="{nm(calcRow.c)} : Calculer" pool={poolFor(calcRow.c, '__special')} onresult={(t) => set({ calc: t })} compact />{/key}
            {#if T.calc}<p class="hint">{T.calc.successes ? `Réussi : ${nm(actor.c)} pourra renoncer après son jet (avant de forcer)${T.calc.successes > 1 ? `, +${T.calc.successes - 1} à son attaque` : ''}.` : 'Calcul raté : sans effet.'}</p>{/if}
          {/if}
        </div>
      {/if}
      <div class="mods">
        <span class="lbl">Modificateurs (dés de programme)</span>
        {#if mods.length}<ul>{#each mods as m (m.label)}<li><span>{m.label}</span><b class="num" class:neg={m.v < 0}>{fmtBonus(m.v)}</b></li>{/each}</ul>{:else}<p class="muted">Aucun.</p>{/if}
        <div class="manual"><span>Autre (difficulté, aide…)</span><Stepper value={T.manual} min={-6} max={6} label="modificateur" onchange={(v) => set({ manual: v })} size="sm" /></div>
      </div>

      <div class="nav">
        <button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button>
        <button class="btn primary" disabled={!target || !w || !!weaponBlock(actor.c, w, ep(actor.c)) || (w.swarmOnly && !swarmTarget) || (pk0.base <= 0 && !T.fullAttr) || (!!T.calcBy && !T.calc)} onclick={toRoll}>Aux dés<Icon name="chevron" size={18} /></button>
      </div>

    {:else if T.step === 'roll'}
      {#if T.preActs.length}{#each T.preActs as a, i (i)}<OverheatDice act={a.act} name={a.name} compact />{/each}{/if}
      <div class="trays" class:two={T.defend}>
        <DiceTray cid={actor.c.id} title="{nm(actor.c)} : {kind === 'melee' ? 'Assaut' : 'Tir'} ({w.name})" pool={atkPool} weaponIdx={w.index >= 0 ? w.index : null} onresult={onAtk} noPush={drained} />
        {#if T.defend}
          <DiceTray cid={target.c.id} title="{nm(target.c)} se défend (Assaut{defWeapon && defWeapon.index >= 0 ? `, ${defWeapon.name}` : ''})" pool={defPool} weaponIdx={defWeapon && defWeapon.index >= 0 ? defWeapon.index : null} onresult={(t) => set({ def: t })} />
        {/if}
      </div>
      {#if drained}
        <p class="banner bad"><span>Tous les dés d'équipement font 1 au premier jet : l'E-pack de {w.name} est vide. L'attaque est sans effet ; rechargez (manœuvre) ou changez d'arme.</span></p>
      {:else if rolled}
        <div class="outcome" class:hit={net > 0}>
          {#if net > 0}
            <b>Touché</b> : {net} succès net{T.defend ? ` (${T.atk.successes} − ${T.def.successes} annulés par la défense)` : ''}.
          {:else}
            <b>Raté</b>{T.defend && T.def.successes ? ` : la défense annule tout (${T.def.successes} succès)` : ''}.
          {/if}
          {#if T.defend && T.def.successes > T.atk.successes}
            <p class="sub">{nm(target.c)} a {T.def.successes - T.atk.successes} succès de défense en trop : contre-attaque (dégâts de son arme), +2 initiative, désarmer ou renverser.</p>
            <button class="btn small" onclick={() => store.open({ type: 'damage', cid: actor.c.id, amount: Number(defWeapon?.degats) || 1, ranged: false, source: `${nm(target.c)} contre-attaque` })}>Contre-attaque sur {nm(actor.c)}</button>
          {/if}
        </div>
      {/if}
      <div class="nav">
        <button class="btn ghost" onclick={() => set({ step: 'setup', atk: null, atkFirst: null, def: null })}>Retour</button>
        {#if T.calc?.successes && T.atk && !T.atkPushed && !drained}<button class="btn en-btn" onclick={withdraw}>Renoncer (calcul de {nm(calcRow?.c)})</button>{/if}
        {#if rolled && net > 0 && T.armlock}<button class="btn primary" onclick={armlockHold}>Immobiliser {nm(target.c)}<Icon name="chevron" size={18} /></button>
        {:else if rolled && net > 0}<button class="btn primary" onclick={toDamage}>Dégâts<Icon name="chevron" size={18} /></button>
        {:else if rolled || drained}
          {#each extraOpts as f (f.key)}<button class="btn en-btn" onclick={() => { log(`${nm(actor.c)} rate ${nm(target.c)} (${w.name})`); extraAttack(f); }}><Icon name="bolt" size={16} />Réattaquer : {f.module} ({f.cost} PE)</button>{/each}
          <button class="btn primary" onclick={() => { log(`${nm(actor.c)} rate ${nm(target.c)} (${w.name})`); finish(); }}>Fin du tour<Icon name="chevron" size={18} /></button>
        {/if}
      </div>
      {#if T.info}<OverheatDice act={T.info.act} name={T.info.name} compact />{/if}

    {:else if T.step === 'damage'}
      {@const tch = chassis(target.c)}
      <div class="dmgline">
        <span class="big num">{totalDmg}{T.saw ? `+${T.saw}` : ''}</span>
        <span>dégât{totalDmg > 1 ? 's' : ''} sur <b>{nm(target.c)}</b><br /><small class="muted">{w.name} {w.degats}{lockedOnTarget && lock.dmg ? ` + ${lock.dmg} verrouillage` : ''}{stuntDmg ? ` + ${stuntDmg} succès` : ''}{T.saw ? ` + ${T.saw} tronçonneuse si pas de surchauffe` : ''}</small></span>
      </div>
      {#if extra}
        <span class="lbl">Succès en plus : un effet chacun</span>
        {#each Array.from({ length: extra }) as _, i (i)}
          <div class="chips stunt">
            <span class="sn num">{i + 2}</span>
            {#each stuntOpts as o (o.id)}<button class="chip" aria-pressed={T.stunts[i] === o.id} onclick={() => { const s = [...T.stunts]; s[i] = o.id; set({ stunts: s }); }}>{o.label}</button>{/each}
          </div>
        {/each}
      {/if}
      {#if (sawFx && kind === 'melee' && w.index === -1) || (tentFx && kind === 'melee') || anatomy}
        <div class="boosts">
          <span class="lbl">{nm(actor.c)}</span>
          {#if sawFx && kind === 'melee' && w.index === -1}
            <div class="react"><span><Icon name="bolt" size={13} />Tronçonneuse : +1 dégât par PE</span><Stepper value={T.saw} min={0} max={ep(actor.c)} label="tronçonneuse" onchange={(v) => set({ saw: v })} size="sm" /></div>
          {/if}
          {#if tentFx && kind === 'melee'}
            <label class="tog"><input type="checkbox" checked={T.tentHold} disabled={ep(actor.c) < tentFx.cost + T.saw} onchange={(e) => set({ tentHold: e.currentTarget.checked })} /><span>Tentacules ({tentFx.cost} PE) : immobiliser sans dépenser de succès</span></label>
          {/if}
          {#if anatomy}
            <div class="react"><span>Anatomie robotique : système visé</span>
              <select class="input sel" value={T.location} onchange={(e) => set({ location: e.currentTarget.value })}>
                <option value="random">Au hasard (D6)</option>
                {#each ATTRS.filter((a) => tch.attrMax[a] > 0) as a (a)}<option value={a}>{attrLabels(target.c)[a].label}</option>{/each}
                {#if (target.c.modules || []).some((m, i) => m && !(target.c.brokenModules || []).includes(i))}<option value="module">Un module</option>{/if}
              </select>
            </div>
          {/if}
        </div>
      {/if}
      <div class="prot">
        <span class="lbl">Protection de {nm(target.c)}</span>
        <ul>
          {#if kind === 'ranged'}<li>Couverture : <b>{target.c.cover || 'aucune'}</b>{target.c.cover ? ' (lancée en premier)' : ''}</li>{/if}
          <li>Armure : <b>{armorCurrent(target.c, tch)}</b> dés{kind === 'melee' && hasSecondary(target.c, 'Revêtement caoutchouté') ? ' + 2 (revêtement caoutchouté)' : ''}</li>
        </ul>
        <label class="tog"><input type="checkbox" checked={T.ignoreArmor} onchange={(e) => set({ ignoreArmor: e.currentTarget.checked })} /><span>L'arme ignore l'armure{ignoresArmor ? ' (vibro-couteau)' : ''}</span></label>
        {#if hasWorkingModule(target.c, 'Armure réactive')}
          <div class="react"><span><Icon name="bolt" size={13} />Armure réactive : PE dépensés <small class="muted">(disponibles {ep(target.c)})</small></span><Stepper value={T.reactive} min={0} max={Math.max(0, Math.min(ep(target.c) - T.emp, totalDmg + T.saw))} label="armure réactive" onchange={(v) => set({ reactive: v })} size="sm" /></div>
        {/if}
        {#if energy && hasWorkingModule(target.c, 'Protection anti-IEM')}
          <div class="react"><span><Icon name="bolt" size={13} />Protection anti-IEM : PE dépensés</span><Stepper value={T.emp} min={0} max={Math.max(0, Math.min(ep(target.c) - T.reactive, totalDmg + T.saw))} label="anti-IEM" onchange={(v) => set({ emp: v })} size="sm" /></div>
        {/if}
        {#if T.reactive || T.emp}<p class="hint">Les PE de réaction lancent aussi les dés de surchauffe.</p>{/if}
        {#if protectors.length}
          <span class="lbl">Protéger (robot de sécurité à portée Proche, une fois par tour)</span>
          <div class="chips">
            <button class="chip" aria-pressed={!T.protector} onclick={() => set({ protector: null, protect: null })}>Personne</button>
            {#each protectors as p (p.x.id)}<button class="chip" aria-pressed={T.protector === p.x.id} onclick={() => set({ protector: p.x.id, protect: null })}>{nm(p.c)}</button>{/each}
          </div>
          {#if prot}
            {#key prot.x.id}<DiceTray cid={prot.c.id} title="{nm(prot.c)} : Protéger" pool={poolFor(prot.c, '__special')} onresult={(t) => set({ protect: t })} compact />{/key}
            {#if T.protect}<p class="hint">{T.protect.successes ? `${nm(prot.c)} encaissera jusqu'à ${T.protect.successes} dégât${T.protect.successes > 1 ? 's' : ''} à la place de ${nm(target.c)}.` : 'Aucun succès : pas de protection.'}</p>{/if}
          {/if}
        {/if}
      </div>
      <div class="nav">
        <button class="btn ghost" onclick={() => set({ step: 'roll' })}>Retour</button>
        <button class="btn primary" disabled={!!prot && !T.protect} onclick={applyDamage}>Appliquer les dégâts<Icon name="chevron" size={18} /></button>
      </div>

    {:else if T.step === 'result'}
      {@const r = T.result}
      {#if T.postActs.length}{#each T.postActs as a, i (i)}<OverheatDice act={a.act} name={a.name} compact />{/each}{/if}
      {#if r.coverDice}<span class="lbl">Couverture</span><div class="dice">{#each r.coverDice as v, i (i)}<span class="die" class:six={v === 6} class:one={v === 1}>{v}</span>{/each}</div>{/if}
      {#if r.armorDice}<span class="lbl">Armure</span><div class="dice">{#each r.armorDice as v, i (i)}<span class="die" class:six={v === 6} class:one={v === 1}>{v}</span>{/each}</div>{/if}
      <ul class="res">{#each r.steps as s, i (i)}<li>{s}</li>{/each}</ul>
      {#if r.deactivated}<p class="banner bad">{nm(target.c)} est hors service.</p>{/if}
      {#if T.info}<OverheatDice act={T.info.act} name={T.info.name} compact />{/if}
      <div class="nav"><span></span>
        {#each extraOpts as f (f.key)}<button class="btn en-btn" onclick={() => extraAttack(f)}><Icon name="bolt" size={16} />Réattaquer : {f.module} ({f.cost} PE{f.maneuver ? ' + manœuvre' : ''})</button>{/each}
        <button class="btn primary big" onclick={finish}>Fin du tour<Icon name="chevron" size={18} /></button>
      </div>

    {:else if T.step === 'done'}
      <p class="banner">{T.doneMsg}</p>
      <div class="nav"><span></span><button class="btn primary big" onclick={finish}>Fin du tour<Icon name="chevron" size={18} /></button></div>

    {:else if T.step === 'target'}
      <p class="hint">Cible (Stabilité). Réussite : +1 à toutes vos attaques contre elle, mais tous les autres ennemis ont +1 contre vous. Échec : impossible de la reverrouiller avant qu'elle se rapproche d'une portée.</p>
      <span class="lbl">Cible à verrouiller</span>
      <div class="targets">
        {#each opponents as o (o.x.id)}<button class="tg" aria-pressed={T.targetId === o.c.id} onclick={() => set({ targetId: o.c.id, atk: null })}><Avatar c={o.c} side={o.x.side} size={44} selected={T.targetId === o.c.id} /></button>{/each}
      </div>
      {#if target}
        <DiceTray cid={actor.c.id} title="{nm(actor.c)} : Cible" pool={poolFor(actor.c, '__special')} onresult={(t) => set({ atk: t, lockStunts: Array.from({ length: Math.max(0, t.successes - 1) }, () => 'atk') })} />
        {#if T.atk && T.atk.successes > 0}
          {#if T.atk.successes > 1}
            <span class="lbl">Succès en plus</span>
            {#each Array.from({ length: T.atk.successes - 1 }) as _, i (i)}
              <div class="chips stunt"><span class="sn num">{i + 2}</span>
                {#each [['atk', '+1 attaque'], ['init', '+1 initiative'], ['dmg', '+1 dégât']] as [id, lb] (id)}<button class="chip" aria-pressed={T.lockStunts[i] === id} onclick={() => { const s = [...T.lockStunts]; s[i] = id; set({ lockStunts: s }); }}>{lb}</button>{/each}
              </div>
            {/each}
          {/if}
          <div class="nav"><span></span><button class="btn primary" onclick={lockOn}>Verrouiller {nm(target.c)}<Icon name="chevron" size={18} /></button></div>
        {:else if T.atk}
          <div class="nav"><span class="muted">Échec du verrouillage.</span><button class="btn primary" onclick={() => { log(`${nm(actor.c)} échoue à verrouiller ${nm(target.c)}`); finish(); }}>Fin du tour</button></div>
        {/if}
      {/if}
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action', atk: null })}>Retour</button><span></span></div>

    {:else if T.step === 'module'}
      <span class="lbl">Activer un module (c'est votre action)</span>
      <ul class="list mods-list">
        {#each actionFx as f (f.key)}
          {@const need = f.perEp || f.kind === 'multi' || f.kind === 'hold' || f.kind === 'disable' ? 1 : f.cost}
          <li><button class="modbtn" disabled={ep(actor.c) < need} onclick={() => pickFx(f)}>
            <b>{f.module}</b> <span class="tag">{f.perEp ? '1 PE et plus' : `${f.cost} PE`}{f.range ? `, portée ${f.range}` : ''}</span>
            <span class="muted">{f.label}</span>
          </button></li>
        {/each}
        {#each otherMods as m (m.index)}
          <li><button class="modbtn" onclick={() => store.open({ type: 'module', index: m.index, cid: actor.c.id })}>
            <b>{m.name}</b> <span class="tag">{m.ref.cost}</span>
            <span class="muted">{m.ref.effect}</span>
          </button></li>
        {/each}
      </ul>
      {#if ep(actor.c) < 1}<p class="callout">{actor.c.kind === 'npc' && cb.usePool ? 'La réserve du MJ est vide.' : "Plus de PE : impossible d'activer un module."}</p>{/if}
      <p class="hint">Chaque PE dépensé lance un dé de surchauffe. Les modules « avec une attaque » (Accélérateur, Tronçonneuse…) se règlent pendant l'attaque ; les réactions quand on est touché.</p>
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button><span></span></div>

    {:else if T.step === 'fx' && curFx}
      {@const f = curFx}
      {@const cand = fxCandidates(f)}
      <div class="fxhead"><b>{f.module}</b><span>{f.label}{f.range ? ` (portée ${f.range})` : ''}</span></div>
      {#if !T.fxResult}
        {#if single(f.kind) || multiK(f.kind) || f.kind === 'blast'}
          <span class="lbl">{single(f.kind) ? 'Cible' : f.kind === 'blast' ? 'Personnes prises dans l\'explosion (alliés compris)' : 'Cibles (1 PE chacune)'}</span>
          <div class="targets">
            {#each cand as o (o.x.id)}
              <button class="tg" aria-pressed={T.fxTargets.includes(o.c.id)} onclick={() => (single(f.kind) ? set({ fxTargets: [o.c.id], fxMods: [], fxReact: 0, fxEmp: 0 }) : toggleFxTarget(o.c.id))}>
                <Avatar c={o.c} side={o.x.side} size={44} selected={T.fxTargets.includes(o.c.id)} />
              </button>
            {/each}
            {#if !cand.length}<p class="muted">{f.kind === 'fatigue' ? 'Aucun être vivant en face : les robots ne subissent jamais de fatigue.' : f.robotOnly ? 'Aucun robot en face.' : 'Aucune cible.'}</p>{/if}
          </div>
        {/if}
        {#if f.kind === 'blast'}
          {#each T.fxTargets as id (id)}
            {@const r = ord.find((o) => o.c.id === id)}
            {#if r}
              <div class="chips stunt"><span class="tname">{nm(r.c)}</span>
                {#each ['Bras', 'Proche', 'Courte'] as dd (dd)}<button class="chip" aria-pressed={(T.fxDist[id] || 'Proche') === dd} disabled={!blastDice(f.power, dd)} onclick={() => set({ fxDist: { ...T.fxDist, [id]: dd } })}>{dd} ({blastDice(f.power, dd)} dés{dd === 'Bras' ? ', +1' : ''})</button>{/each}
              </div>
            {/if}
          {/each}
          <p class="hint">Souffle {f.power} : autant de dés de base par victime à portée Proche ou Bras (+1 dégât au contact), {f.power - 6} dés à portée Courte. Chaque 6 = 1 dégât, l'armure protège.</p>
        {/if}
        {#if f.kind === 'disable' && fxTarget}
          <span class="lbl">Fonctions à désactiver (1 PE chacune)</span>
          <div class="chips">
            {#each (fxTarget.c.modules || []).map((m, i) => ({ m, i })).filter((o) => o.m && !(fxTarget.c.brokenModules || []).includes(o.i)) as o (o.i)}<button class="chip" aria-pressed={T.fxMods.includes(o.i)} onclick={() => set({ fxMods: T.fxMods.includes(o.i) ? T.fxMods.filter((x) => x !== o.i) : [...T.fxMods, o.i] })}>{o.m}</button>{/each}
          </div>
          {#if !(fxTarget.c.modules || []).some((m, i) => m && !(fxTarget.c.brokenModules || []).includes(i))}<p class="muted">Aucun module actif chez {nm(fxTarget.c)} : alarmes, systèmes de défense… se gèrent à la main.</p>{/if}
        {/if}
        {#if f.kind === 'shift'}
          {@const ch = chassis(actor.c)}
          <div class="pair">
            <label class="field"><span>Prendre sur</span><select class="input" value={T.fxFrom} onchange={(e) => set({ fxFrom: e.currentTarget.value })}><option value="">—</option>{#each ATTRS.filter((a) => attrCurrent(actor.c, ch, a) > 0) as a (a)}<option value={a}>{attrLabel(actor.c, a)} ({attrCurrent(actor.c, ch, a)})</option>{/each}</select></label>
            <label class="field"><span>Pour réparer</span><select class="input" value={T.fxTo} onchange={(e) => set({ fxTo: e.currentTarget.value })}><option value="">—</option>{#each ATTRS.filter((a) => (actor.c.damage[a] || 0) > 0) as a (a)}<option value={a}>{attrLabel(actor.c, a)} ({attrCurrent(actor.c, ch, a)}/{ch.attrMax[a]})</option>{/each}</select></label>
          </div>
        {/if}
        {#if f.kind === 'repair'}
          {@const ch = chassis(actor.c)}
          <label class="field"><span>Attribut à réparer</span><select class="input" value={T.fxAttr} onchange={(e) => set({ fxAttr: e.currentTarget.value })}><option value="">—</option>{#each ATTRS.filter((a) => (actor.c.damage[a] || 0) > 0) as a (a)}<option value={a}>{attrLabel(actor.c, a)} ({attrCurrent(actor.c, ch, a)}/{ch.attrMax[a]})</option>{/each}</select></label>
          {#if !ATTRS.some((a) => (actor.c.damage[a] || 0) > 0)}<p class="muted">Aucun dégât à réparer.</p>{/if}
        {/if}
        {#if f.kind === 'repairModule'}
          <label class="field"><span>Module cassé</span><select class="input" value={T.fxAttr} onchange={(e) => set({ fxAttr: e.currentTarget.value })}><option value="">—</option>{#each (actor.c.brokenModules || []) as i (i)}<option value={String(i)}>{actor.c.modules[i]}</option>{/each}</select></label>
          {#if !(actor.c.brokenModules || []).length}<p class="muted">Aucun module cassé.</p>{/if}
        {/if}
        {#if f.perEp && !multiK(f.kind) && f.kind !== 'disable'}
          <div class="react"><span><Icon name="bolt" size={13} />PE dépensés <small class="muted">(disponibles {ep(actor.c)})</small></span><Stepper value={T.fxEp} min={1} max={Math.max(1, ep(actor.c))} label="PE" onchange={(v) => set({ fxEp: v })} size="sm" /></div>
        {/if}
        {#if f.kind === 'selfHarm' && fxTarget}<p class="hint">{nm(fxTarget.c)} s'inflige {bestWeaponDmg(fxTarget.c)} (son arme) + {T.fxEp} = {bestWeaponDmg(fxTarget.c) + T.fxEp} dégâts.</p>{/if}
        {#if usesArmor(f.kind)}<label class="tog"><input type="checkbox" checked={T.fxArmor} onchange={(e) => set({ fxArmor: e.currentTarget.checked })} /><span>L'armure de la cible protège</span></label>{/if}
        {#if fxTarget && ['dmg', 'selfHarm', 'grappleAtk'].includes(f.kind)}
          {#if hasWorkingModule(fxTarget.c, 'Armure réactive')}
            <div class="react"><span>{nm(fxTarget.c)} : Armure réactive (PE)</span><Stepper value={T.fxReact} min={0} max={Math.max(0, ep(fxTarget.c) - T.fxEmp)} label="armure réactive" onchange={(v) => set({ fxReact: v })} size="sm" /></div>
          {/if}
          {#if f.energy && hasWorkingModule(fxTarget.c, 'Protection anti-IEM')}
            <div class="react"><span>{nm(fxTarget.c)} : Protection anti-IEM (PE)</span><Stepper value={T.fxEmp} min={0} max={Math.max(0, ep(fxTarget.c) - T.fxReact)} label="anti-IEM" onchange={(v) => set({ fxEmp: v })} size="sm" /></div>
          {/if}
        {/if}
        <div class="nav">
          <button class="btn ghost" onclick={() => set({ step: FREE_KINDS.includes(f.kind) ? 'action' : 'module', fx: null })}>Retour</button>
          <button class="btn primary" disabled={!fxReady} onclick={runFx}><Icon name="bolt" size={18} />Activer : {fxCost} PE</button>
        </div>
        {#if fxCost > ep(actor.c)}<p class="callout">Pas assez de PE ({ep(actor.c)} disponibles).</p>{/if}
      {:else}
        <OverheatDice act={T.fxResult.act} name={f.module} />
        {#each T.fxResult.reacts as a, i (i)}<OverheatDice act={a.act} name={a.name} compact />{/each}
        {#if T.fxResult.lines.length}<ul class="res">{#each T.fxResult.lines as l, i (i)}<li><b>{l.name}</b> : {l.steps.join(' ; ')}</li>{/each}</ul>{/if}
        <div class="nav"><span></span>
          {#if FREE_KINDS.includes(f.kind)}<button class="btn primary" onclick={() => set({ step: 'action', fx: null })}>Retour aux actions<Icon name="chevron" size={18} /></button>
          {:else if f.kind === 'escape' && T.fxResult.act.works}<button class="btn primary big" onclick={() => { store.ui.turn = null; }}>Continuer<Icon name="chevron" size={18} /></button>
          {:else}<button class="btn primary big" onclick={finish}>Fin du tour<Icon name="chevron" size={18} /></button>{/if}
        </div>
      {/if}

    {:else if T.step === 'drone' && curFx}
      {@const f = curFx}
      <div class="fxhead"><b>{f.module}</b><span>Le drone agit à votre tour : une action et une manœuvre. Tir niveau 3 (Stabilité 3), laser léger dégât 1, sans bonus d'équipement, jet impossible à forcer.</span></div>
      {#if !T.droneAct}
        <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action', fx: null })}>Retour</button><button class="btn primary" disabled={ep(actor.c) < f.cost} onclick={() => droneOrder(f)}><Icon name="bolt" size={18} />Donner l'ordre : {f.cost} PE</button></div>
      {:else}
        <OverheatDice act={T.droneAct} name={f.module} compact />
        {#if T.droneAct.works && !T.droneDone}
          <span class="lbl">Cible du drone</span>
          <div class="targets">{#each opponents as o (o.x.id)}<button class="tg" aria-pressed={T.droneTarget === o.c.id} onclick={() => set({ droneTarget: o.c.id })}><Avatar c={o.c} side={o.x.side} size={44} selected={T.droneTarget === o.c.id} /></button>{/each}</div>
          <div class="chips">{#each D.shootRanges.filter((r) => !r.gm) as r (r.id)}<button class="chip" aria-pressed={T.droneRange === r.id} onclick={() => set({ droneRange: r.id, droneRoll: null })}>{r.label} {fmtBonus(r.mod)}</button>{/each}</div>
          {#if T.droneTarget}
            {#key T.droneRange}<DiceTray cid={actor.c.id} title="Drone : Tir" pool={dronePool} noPush onresult={(t) => set({ droneRoll: t })} />{/key}
            {#if T.droneRoll}
              <div class="nav"><span class="muted">{T.droneRoll.successes ? `Touché : ${1 + T.droneRoll.successes - 1} dégât${T.droneRoll.successes > 1 ? 's' : ''}` : 'Raté.'}</span>
                {#if T.droneRoll.successes}<button class="btn primary" onclick={droneDamage}>Appliquer</button>{:else}<button class="btn primary" onclick={() => set({ step: 'action', fx: null })}>Retour aux actions</button>{/if}
              </div>
            {/if}
          {/if}
        {:else}
          {#if T.droneDone}<ul class="res">{#each T.droneDone.steps as s, i (i)}<li>{s}</li>{/each}</ul>{/if}
          <div class="nav"><span></span><button class="btn primary" onclick={() => set({ step: 'action', fx: null })}>Retour aux actions<Icon name="chevron" size={18} /></button></div>
        {/if}
      {/if}

    {:else if T.step === 'logic'}
      <LogicConflict {actor} {opponents} onback={() => set({ step: 'action' })} ondone={(m) => set({ step: 'done', doneMsg: m })} />

    {:else if T.step === 'blower'}
      <BlowerStep {actor} {opponents} onback={() => set({ step: 'action' })} ondone={(m) => set({ step: 'done', doneMsg: m })} />

    {:else if T.step === 'recycle'}
      <RecycleStep {actor} onback={() => set({ step: 'action' })} ondone={(m) => set({ step: 'done', doneMsg: m })} />

    {:else if T.step === 'transfer'}
      <p class="hint">Transfert par câble : vous perdez les PE que l'allié reçoit (sans dépasser son maximum). Un allié en veille se réveille un tour plus tard.</p>
      <span class="lbl">Allié</span>
      <div class="targets">
        {#each transferable as o (o.x.id)}<button class="tg" aria-pressed={T.transferTo === o.c.id} onclick={() => set({ transferTo: o.c.id })}><Avatar c={o.c} side={o.x.side} size={44} selected={T.transferTo === o.c.id} /><span class="tgi num">{o.c.ep.current}/{epMax(o.c)} PE</span></button>{/each}
      </div>
      <div class="react"><span>PE à transférer</span><Stepper value={T.transferN} min={1} max={Math.max(1, actor.c.ep.current)} label="PE à transférer" onchange={(v) => set({ transferN: v })} size="sm" /></div>
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button><button class="btn primary" disabled={!T.transferTo} onclick={transfer}>Transférer</button></div>

    {:else if T.step === 'wait'}
      <p>Au lieu d'agir, {nm(actor.c)} baisse son initiative. Elle reste à cette valeur pour la suite du combat.</p>
      <div class="manual"><span>Nouvelle initiative</span><Stepper value={T.waitTo} min={0} max={Math.max(0, (actor.x.init || 1) - 1)} label="nouvelle initiative" onchange={(v) => set({ waitTo: v })} /></div>
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button><button class="btn primary" onclick={() => wait(T.waitTo)}>Attendre</button></div>

    {:else if T.step === 'flee'}
      {@const esc = fxOf('escape')}
      {#if esc.length}
        <span class="lbl">Sans jet, avec un module</span>
        <div class="chips">{#each esc as f (f.key)}<button class="chip en" disabled={ep(actor.c) < f.cost} onclick={() => pickFx(f)}><Icon name="bolt" size={13} />{f.module} ({f.cost} PE)</button>{/each}</div>
      {/if}
      <span class="lbl">Distance de l'ennemi le plus proche</span>
      <div class="chips">
        {#each Object.entries(D.fleeMods) as [r, m] (r)}<button class="chip" aria-pressed={T.fleeRange === r} onclick={() => set({ fleeRange: r, flee: null })}>{r} {m == null ? '(auto)' : fmtBonus(m)}</button>{/each}
      </div>
      {#if D.fleeMods[T.fleeRange] == null}
        <p>À portée Lointaine, la fuite réussit sans jet.</p>
        <div class="nav"><span></span><button class="btn primary" onclick={() => flee()}>S'échapper</button></div>
      {:else}
        {#key T.fleeRange}<DiceTray cid={actor.c.id} title="{nm(actor.c)} : Déplacement" pool={poolFor(actor.c, 'deplacement', { mod: D.fleeMods[T.fleeRange] - (hasSecondary(actor.c, 'Blindage supplémentaire') ? 1 : 0) })} onresult={(t) => set({ flee: t })} />{/key}
        {#if hasSecondary(actor.c, 'Blindage supplémentaire')}<p class="hint">Blindage supplémentaire : −1 compris.</p>{/if}
        {#if T.flee}
          <div class="nav"><span class="muted">{T.flee.successes ? 'Réussite : la voie est libre.' : 'Échec : bloqué à la même portée.'}</span>
            {#if T.flee.successes}<button class="btn primary" onclick={() => flee()}>S'échapper</button>{:else}<button class="btn primary" onclick={() => { log(`${nm(actor.c)} ne parvient pas à fuir`); finish(); }}>Fin du tour</button>{/if}
          </div>
        {/if}
      {/if}
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action', flee: null })}>Retour</button><span></span></div>
    {/if}

    {#if T.step !== 'action' && T.step !== 'result' && T.step !== 'done'}
      <button class="skip" onclick={finish}>Terminer le tour sans finir</button>
    {/if}
  </section>
{/if}

<style>
  .turn { box-shadow: inset 0 0 0 1px var(--line), inset 0 4px 0 var(--tc); display: grid; gap: 10px; }
  .who { display: flex; align-items: center; gap: 14px; }
  .who > div { flex: 1; min-width: 0; }
  .who h2 { font-size: 1.45rem; line-height: 1.1; }
  .eyebrow { font-size: .8rem; color: var(--muted); }
  .who .meta { font-size: .85rem; color: var(--muted); }
  .epbadge { display: inline-flex; align-items: center; gap: 3px; padding: 6px 9px; border-radius: 999px; background: var(--abyss); color: var(--coolant); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--coolant) 45%, var(--line)); flex: none; }
  .epbadge b { font-size: 1.05rem; }
  .epbadge small { font-size: .7rem; color: var(--muted); }
  .epbadge.low { color: var(--fault); box-shadow: inset 0 0 0 1px var(--fault); }
  .steps { list-style: none; margin: 2px 0 4px; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .steps li { font-size: .75rem; color: var(--muted); padding-top: 6px; border-top: 3px solid var(--line); }
  .steps li.done { border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
  .steps li.on { border-color: var(--amber); color: var(--text); font-weight: 600; }
  .lbl { display: block; font-size: .82rem; color: var(--muted); margin-top: 4px; }
  .banner { margin: 0; padding: 10px 12px; border-left: 3px solid var(--amber); background: var(--abyss); display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .banner.bad { border-color: var(--fault); }
  .manoeuvre { display: grid; gap: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
  .chip.en { border-color: color-mix(in srgb, var(--coolant) 50%, var(--line)); display: inline-flex; align-items: center; gap: 4px; }
  .actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .act { display: grid; gap: 3px; text-align: left; padding: 12px; min-height: 68px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; border-left: 4px solid var(--line); }
  .act:hover { border-color: var(--muted); }
  .act b { font-family: var(--display); font-weight: 700; font-size: 1.02rem; }
  .act span { font-size: .8rem; color: var(--muted); }
  .act.melee { border-left-color: var(--fault); }
  .act.shoot { border-left-color: var(--coolant); }
  .act.target { border-left-color: var(--amber); }
  .act.logic { border-left-color: var(--muted); }
  .support { display: grid; gap: 6px; }
  .hint.warn { color: var(--fault); }
  .act.mod, .act.en { border-left-color: color-mix(in srgb, var(--coolant) 55%, var(--line)); }
  .act.pass { border-style: dashed; }
  .act:disabled { opacity: .5; cursor: not-allowed; }
  .act:disabled span { color: var(--fault); }
  .targets { display: flex; flex-wrap: wrap; gap: 4px; }
  .tg { display: grid; justify-items: center; background: none; border: 0; padding: 4px; border-radius: 8px; }
  .tg[aria-pressed='true'] { background: var(--hull-2); }
  .tgi { font-size: .72rem; color: var(--muted); }
  .toggles { display: grid; gap: 6px; }
  .tog { display: flex; gap: 10px; align-items: center; cursor: pointer; font-size: .92rem; }
  .tog input { width: 20px; height: 20px; accent-color: var(--amber); flex: none; }
  .en-tog { padding: 8px 10px; border-left: 3px solid var(--coolant); background: var(--abyss); }
  .en-hint { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
  .mods { padding: 10px 12px; background: var(--abyss); border-radius: 4px; }
  .mods ul { list-style: none; margin: 4px 0 8px; padding: 0; display: grid; gap: 4px; }
  .mods li { display: flex; justify-content: space-between; font-size: .92rem; }
  .mods b { color: var(--amber); }
  .mods b.neg { color: var(--fault); }
  .mods .muted { margin: 4px 0 8px; font-size: .9rem; }
  .manual { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: .9rem; }
  .nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav .primary { margin-left: auto; }
  .en-btn { border-color: color-mix(in srgb, var(--coolant) 55%, var(--line)); display: inline-flex; align-items: center; gap: 6px; }
  .big { min-height: 52px; padding: 0 22px; }
  .trays { display: grid; gap: 10px; }
  @media (min-width: 720px) { .trays.two { grid-template-columns: 1fr 1fr; } }
  .outcome { padding: 10px 12px; border-left: 3px solid var(--muted); background: var(--abyss); }
  .outcome.hit { border-color: var(--amber); }
  .outcome .sub { margin: 6px 0; font-size: .88rem; color: var(--muted); }
  .dmgline { display: flex; align-items: center; gap: 14px; padding: 10px 12px; background: var(--abyss); border-left: 3px solid var(--fault); }
  .dmgline .big { font-size: 2.6rem; font-weight: 700; color: var(--fault); min-height: 0; padding: 0; line-height: 1; }
  .stunt { align-items: center; }
  .sn { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: var(--amber); color: var(--amber-ink); font-weight: 700; font-size: .85rem; }
  .tname { font-size: .88rem; min-width: 6em; }
  .boosts { display: grid; gap: 6px; padding: 8px 10px; border-left: 3px solid var(--coolant); background: var(--abyss); }
  .prot ul { margin: 4px 0 8px; padding-left: 18px; font-size: .92rem; }
  .react { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; font-size: .9rem; }
  .react > span { display: inline-flex; gap: 5px; align-items: center; flex-wrap: wrap; }
  .sel { max-width: 50%; min-height: 40px; }
  .dice { display: flex; flex-wrap: wrap; gap: 6px; }
  .die { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 6px; background: var(--die-gear); color: #f0f0f0; font-family: var(--display); font-weight: 700; box-shadow: inset 0 0 0 1px #5d666b; }
  .die.six { box-shadow: 0 0 0 3px var(--amber); }
  .die.one { box-shadow: 0 0 0 3px var(--fault); }
  .die:not(.six):not(.one) { opacity: .6; }
  .res { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
  .mods-list li { padding: 0; }
  .modbtn { width: 100%; display: grid; gap: 3px; text-align: left; background: none; border: 0; padding: 10px 0; color: inherit; }
  .modbtn:disabled { opacity: .5; }
  .modbtn b { font-family: var(--display); }
  .modbtn .muted { font-size: .85rem; }
  .tag { font-size: .75rem; color: var(--coolant); }
  .fxhead { display: grid; gap: 2px; padding: 8px 10px; border-left: 3px solid var(--coolant); background: var(--abyss); }
  .fxhead b { font-family: var(--display); font-size: 1.1rem; }
  .fxhead span { font-size: .88rem; color: var(--muted); }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .callout { margin: 0; padding: 8px 10px; border-left: 3px solid var(--fault); background: var(--abyss); font-size: .9rem; }
  .skip { justify-self: start; background: none; border: 0; color: var(--muted); font-size: .85rem; text-decoration: underline; padding: 6px 0; }
</style>
