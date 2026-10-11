<script>
  // « Donner des PE »: by cable between robots, into or out of a Banque
  // d'énergie, and emptying an E-pack or a Batterie (D6). Rules in lib/clock.js.
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { transfer, drainPack, clockRobots, isBank, isPack, bankCapacity } from '../../lib/clock.js';
  import { epMax } from '../../lib/rules.js';

  const robots = $derived(clockRobots(store.data).filter((c) => c.kind !== 'npc' || store.ui.gm));
  // Every end of a transfer: each robot, then each bank it carries. Value « id » or « id:index ».
  const ends = $derived(robots.flatMap((c) => [
    { key: c.id, end: { id: c.id }, label: `${c.name || 'Sans nom'} (${c.ep.current}/${epMax(c)} PE)`, has: c.ep.current },
    ...c.equipment.map((e, i) => (isBank(e.name) ? { key: `${c.id}:${i}`, end: { id: c.id, item: i }, label: `${e.name} de ${c.name || 'Sans nom'} (${e.charge || 0}/${bankCapacity()})`, has: e.charge || 0 } : null)).filter(Boolean)
  ]));
  const packs = $derived(robots.flatMap((c) => c.equipment.map((e, i) => (isPack(e.name) ? { c, i, name: e.name } : null)).filter(Boolean)));
  let from = $state('');
  let to = $state('');
  let n = $state(1);
  const src = $derived(ends.find((e) => e.key === from) ?? ends[0]);
  const dst = $derived(ends.find((e) => e.key === to && e.key !== src?.key) ?? ends.find((e) => e.key !== src?.key));

  function give() {
    const a = src, b = dst;
    if (!a || !b) return;
    let got = 0;
    store.commitAll(null, (d) => (got = transfer(d, a.end, b.end, n)));
    store.notify(got ? `${got} PE transféré${got > 1 ? 's' : ''}` : 'Rien à transférer', !!got);
  }
  function empty(p) {
    let r = null;
    store.commitAll(null, (d) => (r = drainPack(d, p.c.id, p.i)));
    if (r) store.notify(`${p.name} : D6 = ${r.roll}, +${r.gain} PE`, true);
  }
</script>

<section class="panel">
  <div class="panel-head"><h2>Donner des PE</h2></div>
  {#if ends.length < 2}
    <p class="muted">Il faut au moins deux robots, ou une banque d'énergie.</p>
  {:else}
    <div class="form">
      <label class="field"><span>De</span>
        <select class="input" value={src?.key} onchange={(e) => (from = e.currentTarget.value)}>{#each ends as e (e.key)}<option value={e.key}>{e.label}</option>{/each}</select></label>
      <label class="field"><span>À</span>
        <select class="input" value={dst?.key} onchange={(e) => (to = e.currentTarget.value)}>{#each ends.filter((e) => e.key !== src?.key) as e (e.key)}<option value={e.key}>{e.label}</option>{/each}</select></label>
      <div class="row">
        <Stepper value={n} min={1} max={12} label="PE à donner" onchange={(v) => (n = v)} />
        <button class="btn primary" disabled={!src?.has} onclick={give}><Icon name="bolt" size={18} />Donner {n} PE</button>
      </div>
    </div>
    <p class="hint">Par câble entre robots (attention à la fièvre des machines) ; une banque d'énergie garde jusqu'à {bankCapacity()} PE.</p>
  {/if}
  {#if packs.length}
    <div class="packs">
      {#each packs as p (`${p.c.id}:${p.i}`)}
        <button class="chip" disabled={p.c.ep.current >= epMax(p.c)} onclick={() => empty(p)}>{p.c.name || 'Sans nom'} : vider {p.name} (+D6)</button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .form { display: grid; gap: 0 12px; }
  @media (min-width: 640px) { .form { grid-template-columns: 1fr 1fr; } .row { grid-column: 1 / -1; } }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .packs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .chip { min-height: 40px; }
</style>
