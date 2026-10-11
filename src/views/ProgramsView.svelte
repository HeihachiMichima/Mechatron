<script>
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { getRules } from '../lib/settings.js';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { ATTRS, chassis, attrCurrent, programs, programPoints, devModFor, fmtBonus, modelOf, findSecondary, attrLabels } from '../lib/rules.js';
  import { secondaryItems } from '../lib/pickers.js';

  const c = $derived(store.c);
  const ch = $derived(chassis(c));
  const list = $derived(programs(c));
  const m = $derived(modelOf(c));
  const R = $derived(getRules());
  const max = $derived(R.programMax);
  const points = $derived(programPoints(c));

  function setRating(p, v) {
    store.commit(`${p.label} niveau ${v}`, (s) => {
      if (p.special) s.specialRating = v;
      else if (p.custom != null) s.customPrograms[p.custom].rating = v;
      else s.programRatings[p.key] = v;
    });
  }
  const poolSize = (p) => (p.attr ? attrCurrent(c, ch, p.attr) : 0) + Math.max(0, p.rating + devModFor(c, p));
  const roll = (p) => store.open({ type: 'roll', programId: p.id });

  function addSecondary() {
    store.open({
      type: 'picker', title: 'Ajouter une fonction secondaire', items: secondaryItems(m), search: true,
      onpick: (name) => store.commit(`${name} ajoutée`, (s) => s.secondary.push(name))
    });
  }
</script>

{#snippet row(p)}
  {@const dm = devModFor(c, p)}
  <li class="prow">
    <button class="pmain" onclick={() => roll(p)} aria-label="Lancer {p.label}, {poolSize(p)} dés">
      <span class="pname">{p.label}
        {#if p.devBonus}<span class="dev" class:neg={dm < 0} class:off={!c.online} title="Bonus du collectif ({p.devBonus})">{c.online ? fmtBonus(dm) : 'hors ligne'}</span>{/if}
      </span>
      {#if p.desc}<span class="pdesc">{p.desc}</span>{/if}
    </button>
    <span class="pool num" aria-hidden="true"><Icon name="dice" size={16} />{poolSize(p)}</span>
    <Stepper value={p.rating} min={0} {max} label={p.label} onchange={(v) => setRating(p, v)} size="sm" />
  </li>
{/snippet}

<div class="intro">
  <p>Touchez un programme pour lancer les dés. Le nombre à côté indique la réserve : attribut + programme + bonus du collectif.</p>
  {#if c.kind !== 'npc'}<span class="pts num" class:over={points > R.creationProgramPoints}>{points} pts <small class="muted">/ {R.creationProgramPoints} à la création, max {R.creationProgramMax} par programme</small></span>{/if}
</div>

<div class="grid">
  {#each ATTRS as a (a)}
    <section class="panel">
      <div class="panel-head">
        <h2>{attrLabels(c)[a].label}</h2>
        <span class="meta num">{attrCurrent(c, ch, a)}/{ch.attrMax[a]}</span>
      </div>
      <ul class="list">
        {#each list.filter((p) => p.attr === a && !p.special && p.custom == null) as p (p.id)}{@render row(p)}{/each}
      </ul>
    </section>
  {/each}

  <section class="panel">
    <div class="panel-head">
      <h2>Spécialiste et personnalisés</h2>
    </div>
    <ul class="list">
      {#each list.filter((p) => p.special) as p (p.id)}{@render row(p)}{/each}
      {#if !m}<li class="empty-li">Choisissez un modèle dans l'onglet Robot pour obtenir son programme spécialiste.</li>{/if}
      {#each c.customPrograms as cp, i (i)}
        <li class="custom">
          <input class="input" placeholder="Nom du programme" value={cp.label} oninput={(e) => store.type(c.id, `cp${i}.label`, (s) => (s.customPrograms[i].label = e.currentTarget.value))} aria-label="Nom du programme personnalisé" />
          <select class="input" value={cp.attr ?? ''} onchange={(e) => { const v = e.currentTarget.value || null; store.commit(null, (s) => (s.customPrograms[i].attr = v)); }} aria-label="Attribut">
            <option value="">Attribut ?</option>
            {#each ATTRS as a (a)}<option value={a}>{attrLabels(c)[a].label}</option>{/each}
          </select>
          <Stepper value={cp.rating} min={0} {max} label={cp.label || 'programme'} onchange={(v) => store.commit(`${cp.label || 'Programme'} niveau ${v}`, (s) => (s.customPrograms[i].rating = v))} size="sm" />
          <button class="icon-btn" aria-label="Lancer" onclick={() => roll({ id: 'custom' + i })}><Icon name="dice" /></button>
          <button class="icon-btn" aria-label="Supprimer" onclick={() => store.commit('Programme supprimé', (s) => s.customPrograms.splice(i, 1))}><Icon name="trash" /></button>
        </li>
      {/each}
    </ul>
    <button class="btn small ghost add" onclick={() => store.commit(null, (s) => s.customPrograms.push({ label: '', rating: 0, attr: null }))}><Icon name="plus" size={18} />Programme personnalisé</button>
  </section>

  <section class="panel wide">
    <div class="panel-head">
      <h2>Fonctions secondaires</h2>
      <span class="meta">{R.xpPerUpgrade} PX la nouvelle</span>
    </div>
    {#if c.secondary.length === 0}
      <p class="muted">Aucune fonction installée. À la création, choisissez-en une parmi les trois de votre modèle.</p>
    {/if}
    <ul class="list">
      {#each c.secondary as name, i (name + i)}
        {@const f = findSecondary(name)}
        <li class="sec">
          <div>
            <h3>{name || 'Fonction sans nom'}</h3>
            {#if f}<p class="muted">{f.desc}</p>{/if}
          </div>
          <button class="icon-btn" aria-label="Retirer {name}" onclick={() => store.commit(`${name} retirée`, (s) => s.secondary.splice(i, 1))}><Icon name="trash" /></button>
        </li>
      {/each}
    </ul>
    <button class="btn small add" onclick={addSecondary}><Icon name="plus" size={18} />Ajouter une fonction</button>
  </section>
</div>

<style>
  .intro { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 16px; margin: 0 2px 12px; }
  .intro p { margin: 0; color: var(--muted); font-size: .9rem; max-width: 60ch; }
  .pts { font-weight: 600; }
  .pts.over { color: var(--amber); }
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; align-items: start; } .wide { grid-column: 1 / -1; } }
  @media (min-width: 1500px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .prow { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 4px 0; }
  .pmain { display: grid; text-align: left; background: none; border: 0; padding: 8px 0; min-height: 48px; align-content: center; }
  .pmain:hover .pname { color: var(--amber); }
  .pname { font-family: var(--display); font-weight: 600; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; }
  .pdesc { font-size: .82rem; color: var(--muted); }
  .dev { font-family: var(--display); font-size: .75rem; font-weight: 700; padding: 1px 6px; border-radius: 3px; background: color-mix(in srgb, var(--amber) 18%, transparent); color: var(--amber); }
  .dev.neg { background: color-mix(in srgb, var(--fault) 18%, transparent); color: var(--fault); }
  .dev.off { background: var(--hull-2); color: var(--muted); font-weight: 500; }
  .pool { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: var(--muted); font-size: 1.05rem; }
  .custom { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 0; align-items: center; }
  .custom > :global(.stepper) { justify-self: start; }
  .custom .icon-btn:last-child { justify-self: end; }
  @media (min-width: 560px) { .custom { grid-template-columns: 1.4fr 1fr auto auto auto; } }
  .empty-li { padding: 10px 0; color: var(--muted); font-size: .9rem; }
  .add { margin-top: 10px; }
  .sec { display: flex; gap: 8px; justify-content: space-between; align-items: flex-start; padding: 10px 0; }
  .sec h3 { font-size: 1rem; }
  .sec p { margin: 2px 0 0; font-size: .9rem; }
</style>
