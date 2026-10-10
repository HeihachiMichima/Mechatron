<script>
  // Guided turn: action → target & conditions → rolls (attacker and
  // defender) → damage, stunts and reactions → next combatant.
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import DiceTray from '../../components/DiceTray.svelte';
  import { store, payEp, availableEp } from '../../lib/store.svelte.js';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { order, current, isDown, endTurn } from '../../lib/combat.js';
  import { chassis, armorCurrent, combatWeapons, combatModules, poolFor, canTarget, rangeIndex, hasWorkingModule, resolveDamage, findWeapon, fmtBonus, attrCurrent, attrLabel } from '../../lib/rules.js';

  const cb = $derived(store.combat);
  const ord = $derived(order(store.data));
  const actor = $derived(store.ui.turnActor ? ord.find((r) => r.x.id === store.ui.turnActor) ?? current(store.data) : current(store.data));
  const overwatchShot = $derived(!!store.ui.turnActor && actor?.x.id === store.ui.turnActor);
  const key = $derived(actor ? `${actor.x.id}:${cb.round}:${overwatchShot}` : '');
  const T = $derived(store.ui.turn);
  const fresh = (k) => ({ key: k, step: 'action', action: null, targetId: null, weaponIdx: null, range: 'Proche', aim: false, defenseless: false, defend: false, manual: 0, atk: null, def: null, stunts: [], reactive: 0, emp: 0, ignoreArmor: null, result: null, lockStunts: [], fleeRange: 'Courte', flee: null });

  $effect(() => {
    if (!key) return;
    if (!store.ui.turn || store.ui.turn.key !== key) {
      store.ui.turn = fresh(key);
      // Overwatch lasts until the robot's next turn.
      if (actor && actor.x.overwatch && !overwatchShot) store.commitAll(null, (d) => (d.combat.combatants.find((y) => y.id === actor.x.id).overwatch = false));
    }
  });

  const log = (t) => store.log(t);
  const nm = (c) => c?.name || 'Sans nom';
  const opponents = $derived(actor ? ord.filter((r) => r.x.side !== actor.x.side && !isDown(r)) : []);
  const target = $derived(T?.targetId ? ord.find((r) => r.c.id === T.targetId) : null);
  const kind = $derived(T?.action === 'shoot' ? 'ranged' : 'melee');
  const weapons = $derived(actor ? combatWeapons(actor.c, kind) : []);
  const w = $derived(weapons.find((x) => x.index === T?.weaponIdx) ?? weapons[0]);
  const wRef = $derived(w ? findWeapon(w.name) : null);
  const wNote = $derived(`${w?.note || ''} ${wRef?.note || ''}`);
  const energy = $derived(/énergie/i.test(wNote));
  const ignoresArmor = $derived(/ignore (toute )?l?'?armure|ignore toute armure|Ignore l'armure/i.test(wNote));
  const lock = $derived(actor?.x.lock);
  const lockedOnTarget = $derived(!!(lock && target && lock.target === target.c.id));

  const mods = $derived.by(() => {
    if (!actor || !T) return [];
    const L = [];
    if (T.action === 'shoot') {
      const r = D.shootRanges.find((x) => x.id === T.range);
      if (r && !(r.id === 'Bras' && T.defenseless)) L.push({ label: `Portée ${r.label.toLowerCase()}${r.gm ? ' (MJ)' : ''}`, v: r.mod });
      if (T.aim) L.push({ label: actor.c.cover ? 'Visée appuyée' : 'Visée', v: actor.c.cover ? 2 : 1 });
    }
    if (lockedOnTarget) L.push({ label: 'Cible verrouillée', v: lock.atk });
    if (target?.x.lock && target.x.lock.target !== actor.c.id) L.push({ label: `${nm(target.c)} est focalisé ailleurs`, v: 1 });
    if (T.manual) L.push({ label: 'Autre modificateur', v: T.manual });
    return L.filter((m) => m.v !== 0);
  });
  const modSum = $derived(mods.reduce((t, m) => t + m.v, 0));
  const atkPool = $derived(actor && w ? poolFor(actor.c, kind === 'melee' ? 'assaut' : 'tir', { mod: modSum, gear: Number(w.bonus) || 0 }) : null);
  const defWeapon = $derived(target ? combatWeapons(target.c, 'melee').sort((a, b) => (Number(b.bonus) || 0) - (Number(a.bonus) || 0))[0] : null);
  const defPool = $derived(target && T?.defend ? poolFor(target.c, 'assaut', { gear: Number(defWeapon?.bonus) || 0 }) : null);
  const net = $derived(T?.atk ? Math.max(0, T.atk.successes - (T.defend ? T.def?.successes || 0 : 0)) : 0);
  const extra = $derived(Math.max(0, net - 1));
  const baseDmg = $derived((Number(w?.degats) || 0) + (lockedOnTarget ? lock.dmg : 0));
  const totalDmg = $derived(baseDmg + T?.stunts.slice(0, extra).filter((s) => s === 'dmg').length || 0);
  const canDefend = $derived(target && !target.x.defending && !isDown(target));
  const rolled = $derived(T?.atk && (!T.defend || T.def));

  function set(patch) { store.ui.turn = { ...store.ui.turn, ...patch }; }
  function choose(action) {
    const first = opponents[0]?.c.id ?? null;
    const ws = actor ? combatWeapons(actor.c, action === 'shoot' ? 'ranged' : 'melee') : [];
    const tgt = action === 'target' ? first : lock ? (opponents.find((o) => o.c.id === lock.target)?.c.id ?? first) : first;
    set({ action, step: action === 'melee' || action === 'shoot' ? 'setup' : action, targetId: tgt, weaponIdx: ws[0]?.index ?? null, range: action === 'shoot' ? (rangeIndex(ws[0]?.portee) >= 2 ? 'Courte' : 'Proche') : 'Bras' });
  }
  function toRoll() {
    if (T.defend && target) store.commitAll(`${nm(target.c)} se défend : perd sa prochaine action`, (d) => { const y = d.combat.combatants.find((z) => z.id === target.x.id); y.defending = true; y.lostAction = true; });
    set({ step: 'roll', atk: null, def: null, stunts: [] });
  }
  function toDamage() { set({ step: 'damage', stunts: Array.from({ length: extra }, () => 'dmg'), ignoreArmor: ignoresArmor, reactive: 0, emp: 0 }); }

  function applyDamage() {
    const tid = target.c.id, aid = actor.x.id, txid = target.x.id;
    const st = T.stunts.slice(0, extra);
    const ranged = kind === 'ranged';
    let res;
    store.commitOn(tid, null, (t, d) => {
      const reduce = (T.reactive || 0) + (T.emp || 0);
      payEp(d, t, reduce);
      res = resolveDamage(t, { amount: totalDmg, ranged, coverRating: t.cover || 0, ignoreArmor: T.ignoreArmor, reduce, reduceLabel: T.reactive && T.emp ? 'Armure réactive et anti-IEM' : T.reactive ? 'Armure réactive' : 'Protection anti-IEM' });
      if (ranged && t.cover) t.cover = res.newCover;
      const ax = d.combat.combatants.find((y) => y.id === aid), tx = d.combat.combatants.find((y) => y.id === txid);
      const n = (k) => st.filter((s) => s === k).length;
      if (n('init')) ax.init = (ax.init || 0) + 2 * n('init');
      if (n('disarm')) tx.init = (tx.init || 0) - n('disarm');
      if (n('prone')) tx.prone = true;
      if (res.taken > 0) tx.overwatch = false;
      const extras = [n('init') && `+${2 * n('init')} initiative`, n('disarm') && 'désarme', n('prone') && 'renverse', n('grapple') && 'immobilise'].filter(Boolean);
      log(`${nm(actor.c)} → ${nm(t)} (${w.name}) : ${totalDmg} dégât${totalDmg > 1 ? 's' : ''}${extras.length ? `, ${extras.join(', ')}` : ''}. ${res.steps.join(' ; ')}`);
    });
    store.notify(res.taken ? `${nm(target.c)} encaisse ${res.taken} dégât${res.taken > 1 ? 's' : ''}` : `${nm(target.c)} : tout est bloqué`, true);
    set({ step: 'result', result: res });
  }

  function lockOn() {
    const s = T.lockStunts.slice(0, Math.max(0, (T.atk?.successes || 0) - 1));
    const n = (k) => s.filter((x) => x === k).length;
    store.commitAll(`${nm(actor.c)} verrouille ${nm(target.c)}`, (d) => {
      const x = d.combat.combatants.find((y) => y.id === actor.x.id);
      x.lock = { target: target.c.id, atk: 1 + n('atk'), dmg: n('dmg') };
      if (n('init')) x.init = (x.init || 0) + n('init');
      log(`${nm(actor.c)} verrouille ${nm(target.c)} : +${1 + n('atk')} aux attaques${n('dmg') ? `, +${n('dmg')} dégât` : ''}${n('init') ? `, +${n('init')} initiative` : ''}. Les autres ennemis ont +1 contre lui.`);
    });
    set({ step: 'done', doneMsg: `${nm(actor.c)} verrouille ${nm(target.c)} : +${1 + n('atk')} à ses attaques contre lui${n('dmg') ? `, +${n('dmg')} dégât` : ''}. Les autres ennemis ont +1 contre ${nm(actor.c)}.` });
  }

  function finish() {
    const id = actor.x.id;
    const ow = overwatchShot;
    store.ui.turnActor = null;
    store.ui.turn = null;
    store.commitAll(null, (d) => {
      const x = d.combat.combatants.find((y) => y.id === id);
      if (ow) { x.overwatch = false; x.lostAction = true; log(`${nm(actor.c)} a tiré en surveillance`); return; }
      endTurn(d, x, log);
    });
    const nx = current(store.data);
    if (nx) store.notify(`Au tour de ${nm(nx.c)}`);
  }
  function wait(v) {
    store.commitAll(`${nm(actor.c)} attend (initiative ${v})`, (d) => (d.combat.combatants.find((y) => y.id === actor.x.id).init = v));
    log(`${nm(actor.c)} attend et passe à l'initiative ${v}`);
    store.ui.turn = null;
  }
  function flee() {
    store.commitAll(`${nm(actor.c)} s'échappe`, (d) => { d.combat.combatants.find((y) => y.id === actor.x.id).fled = true; });
    log(`${nm(actor.c)} quitte le combat`);
    store.ui.turn = null;
  }
  const setCover = (v) => store.commitOn(actor.c.id, null, (c) => (c.cover = v));
  const stand = () => store.commitAll(`${nm(actor.c)} se relève`, (d) => (d.combat.combatants.find((y) => y.id === actor.x.id).prone = false));
  const overwatch = () => store.commitAll(`${nm(actor.c)} se met en surveillance`, (d) => (d.combat.combatants.find((y) => y.id === actor.x.id).overwatch = true));
  const covers = [{ name: 'À découvert', armor: 0 }, ...D.coverPresets];
  const stuntOpts = $derived([
    { id: 'dmg', label: '+1 dégât' }, { id: 'init', label: '+2 initiative' }, { id: 'disarm', label: 'Désarmer' }, { id: 'prone', label: 'Renverser' },
    ...(kind === 'melee' ? [{ id: 'grapple', label: 'Immobiliser' }] : [])
  ]);
  const actionMods = $derived(actor ? combatModules(actor.c).filter((m) => !m.broken) : []);
  const ep = (c) => availableEp(store.data, c);
</script>

{#if !actor}
  <section class="panel turn"><p class="muted">Personne ne peut agir.</p></section>
{:else if T}
  <section class="panel turn" style="--tc:{actor.c.kind !== 'npc' && actor.c.color ? actor.c.color : actor.x.side === 'enemy' ? 'var(--fault)' : 'var(--muted)'}">
    <header class="who">
      <Avatar c={actor.c} side={actor.x.side} size={54} label={false} current />
      <div>
        <span class="eyebrow">{overwatchShot ? 'Tir de surveillance' : `Au tour de`}</span>
        <h2>{nm(actor.c)}</h2>
        <span class="meta">{actor.x.side === 'ally' ? 'Allié' : 'Ennemi'}, initiative {actor.x.init}{actor.c.kind !== 'npc' && actor.c.body !== 'creature' ? `, ${actor.c.ep.current} PE` : ''}{lock ? `, verrouille ${nm(store.char(lock.target))} (+${lock.atk}${lock.dmg ? `, +${lock.dmg} dégât` : ''})` : ''}</span>
      </div>
    </header>

    <ol class="steps" aria-label="Étapes du tour">
      {#each [['action', 'Action'], ['setup', 'Cible'], ['roll', 'Dés'], ['damage', 'Dégâts']] as [id, lb], i (id)}
        {@const idx = ['action', 'setup', 'roll', 'damage', 'result'].indexOf(T.step)}
        <li class:on={T.step === id || (id === 'damage' && T.step === 'result')} class:done={idx > i && idx <= 4}>{lb}</li>
      {/each}
    </ol>

    {#if T.step === 'action'}
      {#if actor.x.lostAction && !overwatchShot}<p class="banner">{nm(actor.c)} a utilisé son action pour se défendre ou tirer en surveillance : <b>manœuvres seulement</b> ce tour.</p>{/if}
      {#if actor.x.prone}<p class="banner">À terre. <button class="btn small" onclick={stand}>Se relever (manœuvre)</button></p>{/if}

      <div class="manoeuvre">
        <span class="lbl">Manœuvre</span>
        <div class="chips">
          {#each covers as cv (cv.name)}<button class="chip" aria-pressed={(actor.c.cover || 0) === cv.armor} onclick={() => setCover(cv.armor)}>{cv.armor ? `${cv.name} ${cv.armor}` : cv.name}</button>{/each}
          {#if combatWeapons(actor.c, 'ranged').length}<button class="chip" aria-pressed={actor.x.overwatch} onclick={overwatch} disabled={actor.x.overwatch}>Surveillance</button>{/if}
        </div>
      </div>

      <span class="lbl">Action</span>
      <div class="actions">
        {#if !actor.x.lostAction || overwatchShot}
          {#if !overwatchShot}
            {@const pa = poolFor(actor.c, 'assaut')}
            <button class="act melee" disabled={pa.base <= 0} onclick={() => choose('melee')}><b>Corps à corps</b><span>{pa.base <= 0 ? `${attrLabel(actor.c, pa.attr)} hors service : impossible` : `Assaut, ${pa.base + pa.prog} dés + arme`}</span></button>
          {/if}
          {#if combatWeapons(actor.c, 'ranged').length}
            {@const pt = poolFor(actor.c, 'tir')}
            <button class="act shoot" disabled={pt.base <= 0} onclick={() => choose('shoot')}><b>Tirer</b><span>{pt.base <= 0 ? `${attrLabel(actor.c, pt.attr)} hors service : impossible` : `Tir, ${combatWeapons(actor.c, 'ranged').map((x) => x.name).join(', ')}`}</span></button>
          {/if}
          {#if !overwatchShot && canTarget(actor.c)}
            <button class="act target" onclick={() => choose('target')}><b>{lock ? 'Changer de cible' : 'Verrouiller une cible'}</b><span>Cible niveau {actor.c.specialRating}, coûte l'action</span></button>
          {/if}
          {#if !overwatchShot && actionMods.length}
            <button class="act mod" onclick={() => choose('module')}><b>Module</b><span>{actionMods.map((m) => m.name).join(', ')}</span></button>
          {/if}
          {#if !overwatchShot}
            <button class="act" onclick={() => set({ step: 'wait', waitTo: Math.max(0, (actor.x.init || 1) - 1) })}><b>Attendre</b><span>Baisser son initiative</span></button>
            <button class="act" onclick={() => choose('flee')}><b>Fuir</b><span>Jet de Déplacement</span></button>
          {/if}
        {/if}
        <button class="act pass" onclick={finish}><b>{overwatchShot ? 'Annuler le tir' : 'Fin du tour'}</b><span>{overwatchShot ? 'Garder la surveillance' : 'Passer au suivant'}</span></button>
      </div>

    {:else if T.step === 'setup'}
      <span class="lbl">Cible</span>
      <div class="targets">
        {#each opponents as o (o.x.id)}
          <button class="tg" aria-pressed={T.targetId === o.c.id} onclick={() => set({ targetId: o.c.id, defend: false })}>
            <Avatar c={o.c} side={o.x.side} size={44} selected={T.targetId === o.c.id} />
            <span class="tgi num">arm. {armorCurrent(o.c, chassis(o.c))}{o.c.cover ? `, couv. ${o.c.cover}` : ''}{lock?.target === o.c.id ? ', verrouillé' : ''}</span>
          </button>
        {/each}
        {#if !opponents.length}<p class="muted">Aucune cible debout.</p>{/if}
      </div>

      <span class="lbl">{kind === 'melee' ? 'Arme de contact' : 'Arme'}</span>
      <div class="chips">
        {#each weapons as x (x.index)}<button class="chip" aria-pressed={w?.index === x.index} onclick={() => set({ weaponIdx: x.index, range: rangeIndex(T.range) > rangeIndex(x.portee) ? x.portee : T.range })}>{x.name} {x.bonus !== '' && x.bonus != null ? `+${x.bonus}` : ''}, dégâts {x.degats}</button>{/each}
      </div>

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
          <label class="tog"><input type="checkbox" checked={T.defend} disabled={!canDefend} onchange={(e) => set({ defend: e.currentTarget.checked })} /><span>{nm(target.c)} se défend {canDefend ? '(perd sa prochaine action)' : '(a déjà défendu ce tour)'}</span></label>
        </div>
      {/if}

      <div class="mods">
        <span class="lbl">Modificateurs (dés de programme)</span>
        {#if mods.length}<ul>{#each mods as m (m.label)}<li><span>{m.label}</span><b class="num" class:neg={m.v < 0}>{fmtBonus(m.v)}</b></li>{/each}</ul>{:else}<p class="muted">Aucun.</p>{/if}
        <div class="manual"><span>Autre (difficulté, aide…)</span><Stepper value={T.manual} min={-6} max={6} label="modificateur" onchange={(v) => set({ manual: v })} size="sm" /></div>
      </div>

      <div class="nav">
        <button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button>
        <button class="btn primary" disabled={!target || !w} onclick={toRoll}>Aux dés<Icon name="chevron" size={18} /></button>
      </div>

    {:else if T.step === 'roll'}
      <div class="trays" class:two={T.defend}>
        <DiceTray cid={actor.c.id} title="{nm(actor.c)} : {kind === 'melee' ? 'Assaut' : 'Tir'} ({w.name})" pool={atkPool} weaponIdx={w.index >= 0 ? w.index : null} onresult={(t) => set({ atk: t })} />
        {#if T.defend}
          <DiceTray cid={target.c.id} title="{nm(target.c)} se défend (Assaut{defWeapon && defWeapon.index >= 0 ? `, ${defWeapon.name}` : ''})" pool={defPool} weaponIdx={defWeapon && defWeapon.index >= 0 ? defWeapon.index : null} onresult={(t) => set({ def: t })} />
        {/if}
      </div>
      {#if rolled}
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
        <button class="btn ghost" onclick={() => set({ step: 'setup', atk: null, def: null })}>Retour</button>
        {#if rolled && net > 0}<button class="btn primary" onclick={toDamage}>Dégâts<Icon name="chevron" size={18} /></button>
        {:else if rolled}<button class="btn primary" onclick={() => { log(`${nm(actor.c)} rate ${nm(target.c)} (${w.name})`); finish(); }}>Fin du tour<Icon name="chevron" size={18} /></button>{/if}
      </div>

    {:else if T.step === 'damage'}
      {@const tch = chassis(target.c)}
      <div class="dmgline">
        <span class="big num">{totalDmg}</span>
        <span>dégât{totalDmg > 1 ? 's' : ''} sur <b>{nm(target.c)}</b><br /><small class="muted">{w.name} {w.degats}{lockedOnTarget && lock.dmg ? ` + ${lock.dmg} verrouillage` : ''}{T.stunts.slice(0, extra).filter((s) => s === 'dmg').length ? ` + ${T.stunts.slice(0, extra).filter((s) => s === 'dmg').length} succès` : ''}</small></span>
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
      <div class="prot">
        <span class="lbl">Protection de {nm(target.c)}</span>
        <ul>
          {#if kind === 'ranged'}<li>Couverture : <b>{target.c.cover || 'aucune'}</b>{target.c.cover ? ' (lancée en premier)' : ''}</li>{/if}
          <li>Armure : <b>{armorCurrent(target.c, tch)}</b> dés</li>
        </ul>
        <label class="tog"><input type="checkbox" checked={T.ignoreArmor} onchange={(e) => set({ ignoreArmor: e.currentTarget.checked })} /><span>L'arme ignore l'armure{ignoresArmor ? ' (vibro-couteau)' : ''}</span></label>
        {#if hasWorkingModule(target.c, 'Armure réactive')}
          <div class="react"><span>Armure réactive : PE dépensés <small class="muted">(disponibles {ep(target.c)})</small></span><Stepper value={T.reactive} min={0} max={Math.min(ep(target.c), totalDmg)} label="armure réactive" onchange={(v) => set({ reactive: v })} size="sm" /></div>
        {/if}
        {#if energy && hasWorkingModule(target.c, 'Protection anti-IEM')}
          <div class="react"><span>Protection anti-IEM : PE dépensés</span><Stepper value={T.emp} min={0} max={Math.min(ep(target.c), totalDmg)} label="anti-IEM" onchange={(v) => set({ emp: v })} size="sm" /></div>
        {/if}
      </div>
      <div class="nav">
        <button class="btn ghost" onclick={() => set({ step: 'roll' })}>Retour</button>
        <button class="btn primary" onclick={applyDamage}>Appliquer les dégâts<Icon name="chevron" size={18} /></button>
      </div>

    {:else if T.step === 'result'}
      {@const r = T.result}
      {#if r.coverDice}<span class="lbl">Couverture</span><div class="dice">{#each r.coverDice as v, i (i)}<span class="die" class:six={v === 6} class:one={v === 1}>{v}</span>{/each}</div>{/if}
      {#if r.armorDice}<span class="lbl">Armure</span><div class="dice">{#each r.armorDice as v, i (i)}<span class="die" class:six={v === 6} class:one={v === 1}>{v}</span>{/each}</div>{/if}
      <ul class="res">{#each r.steps as s, i (i)}<li>{s}</li>{/each}</ul>
      {#if r.deactivated}<p class="banner bad">{nm(target.c)} est hors service.</p>{/if}
      <div class="nav"><span></span><button class="btn primary big" onclick={finish}>Fin du tour<Icon name="chevron" size={18} /></button></div>

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
      <span class="lbl">Modules utiles en combat</span>
      <ul class="list mods-list">
        {#each actionMods as m (m.index)}
          <li><button class="modbtn" onclick={() => store.open({ type: 'module', index: m.index, cid: actor.c.id })}>
            <b>{m.name}</b> <span class="tag">{m.ref.combat === 'reaction' ? 'réaction' : m.ref.combat === 'boost' ? 'avec une attaque' : 'action'}{m.ref.cost ? `, ${m.ref.cost}` : ''}</span>
            <span class="muted">{m.ref.effect}</span>
          </button></li>
        {/each}
      </ul>
      <p class="hint">Les modules « avec une attaque » s'activent en plus d'un jet (sans coûter l'action) ; les réactions servent quand on est touché.</p>
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button><button class="btn primary" onclick={finish}>Fin du tour<Icon name="chevron" size={18} /></button></div>

    {:else if T.step === 'wait'}
      <p>Au lieu d'agir, {nm(actor.c)} baisse son initiative. Elle reste à cette valeur pour la suite du combat.</p>
      <div class="manual"><span>Nouvelle initiative</span><Stepper value={T.waitTo} min={0} max={Math.max(0, (actor.x.init || 1) - 1)} label="nouvelle initiative" onchange={(v) => set({ waitTo: v })} /></div>
      <div class="nav"><button class="btn ghost" onclick={() => set({ step: 'action' })}>Retour</button><button class="btn primary" onclick={() => wait(T.waitTo)}>Attendre</button></div>

    {:else if T.step === 'flee'}
      <span class="lbl">Distance de l'ennemi le plus proche</span>
      <div class="chips">
        {#each Object.entries(D.fleeMods) as [r, m] (r)}<button class="chip" aria-pressed={T.fleeRange === r} onclick={() => set({ fleeRange: r, flee: null })}>{r} {m == null ? '(auto)' : fmtBonus(m)}</button>{/each}
      </div>
      {#if D.fleeMods[T.fleeRange] == null}
        <p>À portée Lointaine, la fuite réussit sans jet.</p>
        <div class="nav"><span></span><button class="btn primary" onclick={flee}>S'échapper</button></div>
      {:else}
        {#key T.fleeRange}<DiceTray cid={actor.c.id} title="{nm(actor.c)} : Déplacement" pool={poolFor(actor.c, 'deplacement', { mod: D.fleeMods[T.fleeRange] })} onresult={(t) => set({ flee: t })} />{/key}
        {#if T.flee}
          <div class="nav"><span class="muted">{T.flee.successes ? 'Réussite : la voie est libre.' : 'Échec : bloqué à la même portée.'}</span>
            {#if T.flee.successes}<button class="btn primary" onclick={flee}>S'échapper</button>{:else}<button class="btn primary" onclick={() => { log(`${nm(actor.c)} ne parvient pas à fuir`); finish(); }}>Fin du tour</button>{/if}
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
  .who h2 { font-size: 1.45rem; line-height: 1.1; }
  .eyebrow { font-size: .8rem; color: var(--muted); }
  .who .meta { font-size: .85rem; color: var(--muted); }
  .steps { list-style: none; margin: 2px 0 4px; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .steps li { font-size: .75rem; color: var(--muted); padding-top: 6px; border-top: 3px solid var(--line); }
  .steps li.done { border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
  .steps li.on { border-color: var(--amber); color: var(--text); font-weight: 600; }
  .lbl { display: block; font-size: .82rem; color: var(--muted); margin-top: 4px; }
  .banner { margin: 0; padding: 10px 12px; border-left: 3px solid var(--amber); background: var(--abyss); display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .banner.bad { border-color: var(--fault); color: var(--fault); font-weight: 600; }
  .manoeuvre { display: grid; gap: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
  .actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .act { display: grid; gap: 3px; text-align: left; padding: 12px; min-height: 68px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; border-left: 4px solid var(--line); }
  .act:hover { border-color: var(--muted); }
  .act b { font-family: var(--display); font-weight: 700; font-size: 1.02rem; }
  .act span { font-size: .8rem; color: var(--muted); }
  .act.melee { border-left-color: var(--fault); }
  .act.shoot { border-left-color: var(--coolant); }
  .act.target { border-left-color: var(--amber); }
  .act.mod { border-left-color: color-mix(in srgb, var(--coolant) 55%, var(--line)); }
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
  .mods { padding: 10px 12px; background: var(--abyss); border-radius: 4px; }
  .mods ul { list-style: none; margin: 4px 0 8px; padding: 0; display: grid; gap: 4px; }
  .mods li { display: flex; justify-content: space-between; font-size: .92rem; }
  .mods b { color: var(--amber); }
  .mods b.neg { color: var(--fault); }
  .mods .muted { margin: 4px 0 8px; font-size: .9rem; }
  .manual { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: .9rem; }
  .nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav .primary { margin-left: auto; }
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
  .prot ul { margin: 4px 0 8px; padding-left: 18px; font-size: .92rem; }
  .react { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; font-size: .9rem; }
  .dice { display: flex; flex-wrap: wrap; gap: 6px; }
  .die { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 6px; background: var(--die-gear); color: #f0f0f0; font-family: var(--display); font-weight: 700; box-shadow: inset 0 0 0 1px #5d666b; }
  .die.six { box-shadow: 0 0 0 3px var(--amber); }
  .die.one { box-shadow: 0 0 0 3px var(--fault); }
  .die:not(.six):not(.one) { opacity: .6; }
  .res { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
  .mods-list li { padding: 0; }
  .modbtn { width: 100%; display: grid; gap: 3px; text-align: left; background: none; border: 0; padding: 10px 0; }
  .modbtn b { font-family: var(--display); }
  .modbtn .muted { font-size: .85rem; }
  .tag { font-size: .75rem; color: var(--coolant); }
  .skip { justify-self: start; background: none; border: 0; color: var(--muted); font-size: .85rem; text-decoration: underline; padding: 6px 0; }
</style>
