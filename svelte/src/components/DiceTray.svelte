<script>
  // One roll, start to finish: shows the pool, rolls, offers to push, and
  // settles the cost of pushing (EP / damage, gear wear). Reports the tally.
  import Icon from './Icon.svelte';
  import Stepper from './Stepper.svelte';
  import { store, payEp, availableEp } from '../lib/store.svelte.js';
  import { rollPool, push, canReroll, tally, maxPushes, attrLabel, chassis } from '../lib/rules.js';

  let { cid, title, pool, weaponIdx = null, onresult = () => {}, compact = false, autoRoll = false } = $props();
  const c = $derived(store.char(cid));
  let dice = $state(null);
  let pushes = $state(0);
  let rollId = $state(0);
  let appliedOnes = $state(0);
  let appliedGear = $state(0);
  let epPay = $state(0);
  const t = $derived(dice ? tally(dice) : null);
  const rerollable = $derived(dice ? dice.filter(canReroll).length : 0);
  const pendingOnes = $derived(pushes > 0 && t ? Math.max(0, t.baseOnes - appliedOnes) : 0);
  const pendingGear = $derived(pushes > 0 && t ? Math.max(0, t.gearOnes - appliedGear) : 0);
  const total = $derived(pool.base + pool.prog + pool.gear + pool.neg);
  const w = $derived(weaponIdx != null && weaponIdx >= 0 ? c?.weapons[weaponIdx] : null);

  function roll() {
    dice = rollPool({ base: pool.base, prog: pool.prog, gear: pool.gear, neg: pool.neg });
    pushes = 0; appliedOnes = 0; appliedGear = 0; rollId++;
    onresult(tally(dice), false);
  }
  function doPush() {
    dice = push(dice); pushes++; rollId++;
    const tt = tally(dice);
    epPay = Math.min(Math.max(0, tt.baseOnes - appliedOnes), availableEp(store.data, c));
    onresult(tt, true);
  }
  function apply() {
    const n = pendingOnes, ep = Math.min(epPay, n), dmg = n - ep;
    const attr = pool.attr;
    store.commitOn(cid, `${c.name || 'Robot'} : ${[ep ? `−${ep} PE` : '', dmg ? `${dmg} dégât${dmg > 1 ? 's' : ''} en ${attrLabel(c, attr)}` : ''].filter(Boolean).join(', ') || 'rien'}`, (s, d) => {
      payEp(d, s, ep);
      if (dmg) s.damage[attr] = Math.min(chassis(s).attrMax[attr], (s.damage[attr] || 0) + dmg);
    });
    appliedOnes += n;
  }
  function wear() {
    const n = pendingGear;
    store.commitOn(cid, `${w.name} : bonus −${n}`, (s) => (s.weapons[weaponIdx].bonus = Math.max(0, (Number(s.weapons[weaponIdx].bonus) || 0) - n)));
    appliedGear += n;
  }
  $effect(() => { if (autoRoll && !dice && total > 0) roll(); });
</script>

<div class="tray" class:compact>
  <div class="head">
    <b>{title}</b>
    <span class="pool num">
      <span class="pc base">{pool.base}</span>
      {#if pool.prog}<span class="pc prog">{pool.prog}</span>{/if}
      {#if pool.gear}<span class="pc gear">{pool.gear}</span>{/if}
      {#if pool.neg}<span class="pc neg">−{pool.neg}</span>{/if}
    </span>
  </div>
  {#if !dice}
    <button class="btn primary block go" disabled={total === 0} onclick={roll}><Icon name="dice" />Lancer {total} dé{total > 1 ? 's' : ''}</button>
  {:else}
    <div class="res"><span class="succ num" class:fail={t.successes === 0}>{t.successes}</span><span>{t.successes === 0 ? 'aucun succès' : 'succès'}{t.cancelled ? `, ${t.cancelled} annulé${t.cancelled > 1 ? 's' : ''}` : ''}{pushes ? ', forcé' : ''}</span></div>
    {#key rollId}
      <div class="dice">{#each dice as d, i (i)}<span class="die {d.t}" class:six={d.v === 6} class:one={d.v === 1} class:tumble={pushes === 0 || d.rerolled}>{d.v}</span>{/each}</div>
    {/key}
    {#if pendingOnes > 0}
      <div class="warn">
        <p><b>{pendingOnes} × 1</b> en dés de base : 1 PE ou 1 dégât en {attrLabel(c, pool.attr)} chacun.</p>
        <div class="split"><span>En PE</span><Stepper value={Math.min(epPay, pendingOnes)} min={0} max={Math.min(pendingOnes, availableEp(store.data, c))} label="PE" onchange={(v) => (epPay = v)} size="sm" /><span class="muted">dégâts : {pendingOnes - Math.min(epPay, pendingOnes)}</span><button class="btn small primary" onclick={apply}>Appliquer</button></div>
      </div>
    {/if}
    {#if pendingGear > 0 && w}
      <div class="warn"><p><b>{pendingGear} × 1</b> en dés d'équipement.</p><button class="btn small" onclick={wear}>{w.name} : bonus −{pendingGear}</button></div>
    {/if}
    {#if pushes < maxPushes(c) && rerollable > 0}
      <button class="btn small" onclick={doPush}>Forcer ({rerollable} dé{rerollable > 1 ? 's' : ''})</button>
    {/if}
  {/if}
</div>

<style>
  .tray { padding: 12px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; display: grid; gap: 10px; align-content: start; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .head b { font-family: var(--display); font-weight: 600; }
  .pool { display: flex; gap: 4px; }
  .pc { min-width: 24px; height: 24px; padding: 0 5px; display: grid; place-items: center; border-radius: 4px; font-size: .85rem; font-weight: 700; }
  .pc.base { background: var(--die-base); color: #2a2205; }
  .pc.prog { background: var(--die-prog); color: #08200c; }
  .pc.gear { background: var(--die-gear); color: #eee; box-shadow: inset 0 0 0 1px #5d666b; }
  .pc.neg { color: var(--fault); box-shadow: inset 0 0 0 2px var(--fault); }
  .go { min-height: 48px; }
  .res { display: flex; align-items: baseline; gap: 8px; font-family: var(--display); font-weight: 600; }
  .succ { font-size: 2.2rem; font-weight: 700; color: var(--amber); line-height: 1; }
  .succ.fail { color: var(--muted); }
  .dice { display: flex; flex-wrap: wrap; gap: 6px; }
  .die { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 6px; font-family: var(--display); font-weight: 700; font-size: 1.15rem; }
  .die.base { background: var(--die-base); color: #2a2205; }
  .die.prog { background: var(--die-prog); color: #08200c; }
  .die.gear { background: var(--die-gear); color: #f0f0f0; box-shadow: inset 0 0 0 1px #5d666b; }
  .die.neg { background: transparent; color: var(--fault); box-shadow: inset 0 0 0 2px var(--fault); }
  .die.six { box-shadow: 0 0 0 3px var(--amber); }
  .die.neg.six { box-shadow: inset 0 0 0 2px var(--fault), 0 0 0 3px var(--fault); background: color-mix(in srgb, var(--fault) 22%, transparent); }
  .die.one:not(.neg) { box-shadow: 0 0 0 3px var(--fault); }
  .die:not(.six):not(.one) { opacity: .6; }
  .tumble { animation: tumble .38s cubic-bezier(.3,1.4,.5,1); }
  @keyframes tumble { from { transform: rotate(-200deg) scale(.4); opacity: 0; } }
  .warn { border-left: 3px solid var(--fault); padding: 6px 10px; background: var(--hull); }
  .warn p { margin: 0 0 6px; font-size: .9rem; }
  .split { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: .9rem; }
</style>
