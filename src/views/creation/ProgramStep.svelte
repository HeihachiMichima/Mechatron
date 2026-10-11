<script>
  // Step 4: 10 points across the programs, at most 3 each, the specialist at
  // least 1 (p.21). Each row shows the attribute the program rolls with.
  import Stepper from '../../components/Stepper.svelte';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { ATTRS } from '../../lib/rules.js';
  import { getRules } from '../../lib/settings.js';
  import { modelById, programTotal, draftAttrs } from '../../lib/creation.js';

  let { draft } = $props();
  const R = getRules();
  const m = $derived(modelById(draft.model));
  const total = $derived(programTotal(draft));
  const left = $derived(R.creationProgramPoints - total);
  const tot = $derived(draftAttrs(draft));
  const L = D.attributeLabels;
  const set = (k, v) => (draft.programRatings[k] = v);
</script>

<div class="budget" class:done={left === 0} role="status">
  <b class="num">{total}</b><span>/ {R.creationProgramPoints} points</span>
  <small>{left > 0 ? `il en reste ${left}` : left < 0 ? `${-left} de trop` : 'tout est réparti'}, max {R.creationProgramMax} par programme</small>
</div>

{#if m}
  <div class="row special">
    <div><b>{m.special}</b><small>Programme spécialiste ({L[m.specialAttr].label} {tot[m.specialAttr]}), au moins 1</small></div>
    <Stepper value={draft.specialRating || 0} min={0} max={R.creationProgramMax} label={m.special} onchange={(v) => (draft.specialRating = v)} size="sm" />
  </div>
{/if}

<div class="groups">
  {#each ATTRS as a (a)}
    <section>
      <h3>{L[a].label} <span class="num muted">{tot[a]}</span></h3>
      {#each D.programs.filter((p) => p.attr === a) as p (p.key)}
        <div class="row">
          <div><b>{p.label}</b>{#if p.desc}<small>{p.desc}</small>{/if}</div>
          <Stepper value={draft.programRatings[p.key] || 0} min={0} max={R.creationProgramMax} label={p.label} onchange={(v) => set(p.key, v)} size="sm" />
        </div>
      {/each}
    </section>
  {/each}
</div>

<style>
  .budget { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; padding: 10px 12px; margin-bottom: 10px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .budget b { font-size: 1.6rem; color: var(--amber); line-height: 1; }
  .budget small { flex-basis: 100%; color: var(--muted); font-size: .85rem; }
  .budget.done small { color: var(--text); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; border-top: 1px solid var(--line); }
  .row > div { display: grid; min-width: 0; }
  .row b { font-family: var(--display); font-weight: 600; }
  .row small { font-size: .8rem; color: var(--muted); }
  .special { border: 1px solid var(--amber); border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; }
  .special b { color: var(--amber); }
  .groups { display: grid; gap: 4px 24px; }
  @media (min-width: 720px) { .groups { grid-template-columns: 1fr 1fr; } }
  h3 { font-size: .95rem; margin: 12px 0 2px; display: flex; gap: 8px; align-items: baseline; }
</style>
