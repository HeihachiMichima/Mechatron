<script>
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import OverheatDice from '../../components/OverheatDice.svelte';
  import { store, payEp, availableEp } from '../../lib/store.svelte.js';
  import { order, rollInits } from '../../lib/combat.js';
  import { chassis, attrCurrent, hasSecondary } from '../../lib/rules.js';
  import { moduleFx, rollActivation, settleActivation, actText } from '../../lib/energy.js';

  let { onback, onstart } = $props();
  const cb = $derived(store.combat);
  const sorted = $derived(order(store.data));
  const rows = $derived(cb.combatants.map((x) => ({ x, c: store.char(x.cid) })).filter((r) => r.c && !r.x.fled));
  const missing = $derived(rows.filter((r) => r.x.init == null).length);
  const log = (t) => store.log(t);

  // Accelerator (book p.73): +2 initiative per EP, decided before rolling.
  let accel = $state({});
  let accelActs = $state({});
  const accelFx = (c) => moduleFx(c, 'initBoost')[0] ?? null;
  function rollSome(list, label) {
    const acts = {};
    list.forEach((r) => { const f = accelFx(r.c); const n = accel[r.x.id] || 0; if (f && n > 0) acts[r.x.id] = { f, act: rollActivation(r.c, n) }; });
    store.commitAll(label, (d) => {
      rollInits(d, list.map((r) => d.combat.combatants.find((y) => y.id === r.x.id)), log);
      Object.entries(acts).forEach(([xid, { f, act }]) => {
        const y = d.combat.combatants.find((z) => z.id === xid);
        const c = d.chars.find((z) => z.id === y.cid);
        settleActivation(d, c, f.index, act, payEp);
        if (act.works) y.init += 2 * act.effective;
        log(`${c.name || 'Sans nom'} : ${actText(f.module, act)}${act.works ? `, initiative +${2 * act.effective}` : ''}`);
      });
    });
    accelActs = { ...accelActs, ...Object.fromEntries(Object.entries(acts).map(([k, v]) => [k, v.act])) };
    const left = { ...accel }; Object.keys(acts).forEach((k) => delete left[k]); accel = left;
  }
  const setInit = (r, v) => store.commitAll(null, (d) => (d.combat.combatants.find((y) => y.id === r.x.id).init = v));
  function toggleSurprise(r) {
    store.commitAll(null, (d) => {
      const y = d.combat.combatants.find((z) => z.id === r.x.id);
      y.surprise = !y.surprise;
      if (y.init != null) y.init += y.surprise ? 2 : -2;
    });
  }
  const stab = (c) => attrCurrent(c, chassis(c), 'stabilite');
  const tieNote = (i) => {
    const a = sorted[i], b = sorted[i + 1];
    if (!a || !b || a.x.init !== b.x.init || a.x.init == null) return '';
    return stab(a.c) !== stab(b.c) ? `égalité : Stabilité ${stab(a.c)} contre ${stab(b.c)}` : 'égalité parfaite : départagée au dé';
  };
</script>

<section class="panel">
  <div class="panel-head"><h2>Initiative</h2><span class="meta">1D6, sans forcer</span></div>
  <p class="hint first">Lancez pour chacun ou saisissez le résultat des dés réels. Tactiques SWAT : deux dés, le meilleur. Un groupe identique de PNJ partage un jet. Attaque surprise : +2 pour tout le combat. Accélérateur : choisissez les PE avant de lancer (+2 par PE ; avec « Saisir », ajoutez le bonus vous-même).</p>
  <div class="acts">
    <button class="btn primary" disabled={missing === 0} onclick={() => rollSome(rows.filter((r) => r.x.init == null), 'Initiative lancée')}><Icon name="dice" size={18} />{missing === 0 ? 'Tous ont une initiative' : missing === rows.length ? 'Lancer pour tous' : `Lancer pour ${missing === 1 ? 'le dernier' : `les ${missing} restants`}`}</button>
    <button class="btn ghost" onclick={() => rollSome(rows, 'Initiative relancée')}>Tout relancer</button>
  </div>
  <ul class="list rows">
    {#each rows as r (r.x.id)}
      <li class="row">
        <Avatar c={r.c} side={r.x.side} size={40} label={false} />
        <div class="who">
          <b>{r.c.name || 'Sans nom'}</b>
          <span class="muted">{r.x.side === 'ally' ? 'Allié' : 'Ennemi'}, Stabilité {stab(r.c)}{hasSecondary(r.c, 'Tactiques SWAT') ? ', SWAT' : ''}</span>
        </div>
        <button class="chip" aria-pressed={r.x.surprise} onclick={() => toggleSurprise(r)} title="Attaque surprise : +2">Surprise +2</button>
        {#if accelFx(r.c) && r.x.init == null}
          <span class="acc" title="Accélérateur : +2 par PE, à décider avant le jet"><span>Accél. <small class="muted">{availableEp(store.data, r.c)} PE</small></span><Stepper value={accel[r.x.id] || 0} min={0} max={availableEp(store.data, r.c)} label="PE d'Accélérateur pour {r.c.name}" onchange={(v) => (accel = { ...accel, [r.x.id]: v })} size="sm" /></span>
        {/if}
        <div class="val">
          {#if r.x.init == null}
            <button class="btn small" onclick={() => rollSome([r], null)}><Icon name="dice" size={16} />Lancer</button>
            <button class="btn small ghost" onclick={() => setInit(r, 1)}>Saisir</button>
          {:else}
            <Stepper value={r.x.init} min={0} max={30} label="initiative de {r.c.name}" onchange={(v) => setInit(r, v)} size="sm" />
            <button class="icon-btn" aria-label="Relancer pour {r.c.name}" title="Relancer" onclick={() => rollSome([r], null)}><Icon name="dice" /></button>
          {/if}
        </div>
        {#if accelActs[r.x.id]}<div class="accres"><OverheatDice act={accelActs[r.x.id]} name="Accélérateur" compact /></div>{/if}
      </li>
    {/each}
  </ul>
</section>

<section class="panel">
  <div class="panel-head"><h2>Ordre de jeu</h2></div>
  {#if missing}<p class="muted">{missing} combattant{missing > 1 ? 's' : ''} sans initiative.</p>{/if}
  <ol class="order">
    {#each sorted.filter((r) => r.x.init != null) as r, i (r.x.id)}
      <li>
        <span class="n num">{r.x.init}</span>
        <Avatar c={r.c} side={r.x.side} size={30} label={false} />
        <span class="nm" class:enemy={r.x.side === 'enemy'}>{r.c.name || 'Sans nom'}</span>
        {#if tieNote(i)}<em class="tie">{tieNote(i)}</em>{/if}
      </li>
    {/each}
  </ol>
</section>

<div class="cta">
  <button class="btn" onclick={onback}><Icon name="chevron" size={18} />Préparation</button>
  <button class="btn primary big" disabled={missing > 0} onclick={onstart}>{cb.active ? 'Reprendre le combat' : 'Commencer le combat'}<Icon name="chevron" size={18} /></button>
</div>

<style>
  .first { margin: -4px 0 12px; max-width: 70ch; }
  .acts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 0; flex-wrap: wrap; }
  .who { flex: 1 1 150px; display: grid; min-width: 0; }
  .who b { font-family: var(--display); font-weight: 600; }
  .who .muted { font-size: .82rem; }
  .val { display: flex; align-items: center; gap: 4px; }
  .acc { display: inline-flex; align-items: center; gap: 6px; font-size: .85rem; color: var(--coolant); }
  .acc small { font-size: .75rem; }
  .accres { flex-basis: 100%; }
  .order { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .order li { display: flex; align-items: center; gap: 10px; }
  .n { min-width: 34px; height: 34px; display: grid; place-items: center; font-weight: 700; font-size: 1.15rem; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .nm { font-family: var(--display); font-weight: 600; }
  .nm.enemy { color: var(--fault); }
  .tie { font-style: normal; font-size: .8rem; color: var(--muted); }
  .cta { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .cta .btn:first-child :global(svg) { transform: rotate(180deg); }
  .big { min-height: 52px; padding: 0 22px; font-size: 1.05rem; }
</style>
