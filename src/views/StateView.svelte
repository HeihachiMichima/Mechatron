<script>
  import Segments from '../components/Segments.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { getRules, getDev } from '../lib/settings.js';
  import { ATTRS, chassis, attrCurrent, armorTotal, armorCurrent, epMax, devBand, hasSecondary, shownAttrs, attrLabels } from '../lib/rules.js';

  const c = $derived(store.c);
  const ch = $derived(chassis(c));
  const maxEp = $derived(epMax(c));
  const ration = $derived(Math.min(devBand(getDev().Energie).energyEp, maxEp));
  const solar = $derived(getRules().outsideSolarEp);

  const L = $derived(attrLabels(c));
  const attrs = $derived(shownAttrs(c, ch));
  const npcPool = $derived(c.kind === 'npc' && store.combat.usePool);
  const creature = $derived(c.body === 'creature');
  const per = $derived(getRules().xpPerUpgrade);

  function setAttr(a, cur) {
    const max = ch.attrMax[a];
    const before = attrCurrent(c, ch, a);
    if (cur === before) return;
    const label = L[a].label;
    store.commit(cur < before ? `${label} : ${before - cur} dégât${before - cur > 1 ? 's' : ''}` : `${label} réparé (${cur}/${max})`, (s) => (s.damage[a] = max - cur));
  }
  function setArmor(cur) {
    const tot = armorTotal(c, ch);
    store.commit(`Armure ${cur}/${tot}`, (s) => (s.armorDamage = tot - cur));
  }
  function setEp(v, label) {
    const n = Math.max(0, Math.min(maxEp, v));
    store.commit(label ?? `Énergie ${n}/${maxEp} PE`, (s) => (s.ep.current = n));
  }
  const repairAll = () => store.commit('Toutes les réparations faites', (s) => { ATTRS.forEach((a) => (s.damage[a] = 0)); s.armorDamage = 0; });
  const anyDamage = $derived(ATTRS.some((a) => c.damage[a] > 0) || c.armorDamage > 0);
  const covers = [{ name: 'Aucune', armor: 0 }, ...D.coverPresets];
</script>

{#if c.statMode !== 'direct' && ch.known < 3}
  <div class="panel empty">
    <h2>{ch.known === 0 ? 'Commencez par le châssis' : `Châssis incomplet (${ch.known}/3)`}</h2>
    <p>Vos attributs et votre armure sont la somme de la tête, du torse et du support.</p>
    <button class="btn primary" onclick={() => (store.ui.tab = 'robot')}>Compléter le châssis</button>
  </div>
{/if}

<div class="grid">
  <section class="panel">
    <div class="panel-head">
      <h2>Attributs</h2>
      <div class="head-acts">
        <button class="btn small" onclick={() => store.open({ type: 'damage', cid: c.id })} title="Armure puis localisation au D6">Subir des dégâts</button>
        {#if anyDamage}<button class="btn small ghost" onclick={repairAll}>Tout réparer</button>{/if}
      </div>
    </div>
    <ul class="list attrs">
      {#each attrs as a (a)}
        {@const cur = attrCurrent(c, ch, a)}
        {@const max = ch.attrMax[a]}
        <li>
          <div class="attr-top">
            <div>
              <h3>{L[a].label}</h3>
              <span class="muted small">{L[a].sub}</span>
            </div>
            <div class="score num" class:hurt={cur < max}>
              {cur}<small>/{max}</small>
              {#if max > 0 && cur === 0}<span class="broken">hors service</span>{/if}
            </div>
            <Stepper value={cur} min={0} {max} label={L[a].label} onchange={(v) => setAttr(a, v)} size="sm" bare />
          </div>
          <Segments {max} current={cur} onset={(v) => setAttr(a, v)} label={L[a].label} />
        </li>
      {/each}
    </ul>
    <p class="hint">{#if creature}Les dégâts réduisent la Force ; à 0, la créature est hors de combat.{:else}Touchez une case pour noter un dégât. « Subir des dégâts » lance l'armure puis la localisation (D6 : 1-2 Servos, 3 Stabilité, 4 Processeur, 5 Réseau, 6 un module). Un attribut à 0 est brisé ; les quatre à 0 : désactivation définitive.{/if}</p>
  </section>

  <div class="col">
    {#if creature}
    {:else if npcPool}
    <section class="panel energy">
      <div class="panel-head"><h2>Énergie</h2><span class="meta">PNJ</span></div>
      <p class="pool">Ce PNJ paie ses modules et ses jets forcés dans la <b>réserve du MJ</b> : <b class="num">{store.combat.gmPool} PE</b>.</p>
      <button class="btn small" onclick={() => (store.ui.tab = 'combat')}>Gérer la réserve (onglet Combat)</button>
    </section>
    {:else}
    <section class="panel energy">
      <div class="panel-head">
        <h2>Énergie</h2>
        <span class="meta">max {maxEp} PE{hasSecondary(c, 'Alimentation de secours') ? ' (alimentation de secours)' : ''}</span>
      </div>
      <div class="ep-row">
        <button class="ep-btn" aria-label="Dépenser 1 PE" disabled={c.ep.current <= 0} onclick={() => setEp(c.ep.current - 1, `−1 PE (${c.ep.current - 1}/${maxEp})`)}><Icon name="minus" /></button>
        <div class="ep-val">
          <Icon name="bolt" size={26} />
          <span class="num">{c.ep.current}</span><small class="num">/{maxEp}</small>
        </div>
        <button class="ep-btn" aria-label="Ajouter 1 PE" disabled={c.ep.current >= maxEp} onclick={() => setEp(c.ep.current + 1, `+1 PE (${c.ep.current + 1}/${maxEp})`)}><Icon name="plus" /></button>
      </div>
      <Segments max={maxEp} current={c.ep.current} tone="coolant" onset={(v) => setEp(v)} label="Énergie" />
      <div class="actions">
        {#if c.online}
          <button class="btn small" disabled={c.ep.current >= ration} onclick={() => setEp(ration, `Rechargé jusqu'à ${ration} PE`)}>Recharger jusqu'à {ration}</button>
        {:else}
          <button class="btn small" disabled={c.ep.current >= maxEp} onclick={() => setEp(c.ep.current + solar, `Soleil : +${solar} PE`)}>Soleil (+{solar})</button>
        {/if}
        <button class="btn small" disabled={c.ep.current <= 0} onclick={() => setEp(c.ep.current - 1, 'Nouveau jour : −1 PE')}>Nouveau jour (−1)</button>
      </div>
      <p class="hint">{#if c.online}Une borne recharge jusqu'au niveau de rationnement (Énergie {getDev().Energie}), jamais au-delà.{:else}Hors du collectif, chaque robot regagne 1 PE par jour en plein air.{/if} Un PE par jour pour fonctionner ; à 0 PE, le robot passe en veille.</p>
    </section>
    {/if}

    <section class="panel">
      <div class="panel-head">
        <h2>Protection</h2>
        <span class="meta">armure puis couverture, deux jets</span>
      </div>
      <div class="attr-top">
        <div>
          <h3>Armure</h3>
          <span class="muted small">châssis {ch.armorBase}{hasSecondary(c, 'Blindage supplémentaire') ? ' + blindage 3' : ''}</span>
        </div>
        <div class="score num" class:hurt={armorCurrent(c, ch) < armorTotal(c, ch)}>{armorCurrent(c, ch)}<small>/{armorTotal(c, ch)}</small></div>
        <Stepper value={armorCurrent(c, ch)} min={0} max={armorTotal(c, ch)} label="Armure" onchange={setArmor} size="sm" bare />
      </div>
      <Segments max={armorTotal(c, ch)} current={armorCurrent(c, ch)} tone="steel" onset={setArmor} label="Armure" />
      <h3 class="cover-h">Couverture <span class="muted small">contre les tirs uniquement</span></h3>
      <div class="chips">
        {#each covers as cv (cv.name)}
          <button class="chip" aria-pressed={c.cover === cv.armor} onclick={() => store.commit(cv.armor ? `Couverture : ${cv.name.toLowerCase()} (${cv.armor})` : 'Plus de couverture', (s) => (s.cover = cv.armor))}>{cv.name}{cv.armor ? ` ${cv.armor}` : ''}</button>
        {/each}
      </div>
    </section>

    {#if c.kind !== 'npc'}
    <section class="panel">
      <div class="panel-head">
        <h2>Expérience</h2>
        <span class="meta">{per} PX = un programme +1 ou une fonction</span>
      </div>
      <div class="xp-row">
        <Stepper value={c.xp.current} min={0} max={999} label="Expérience" onchange={(v) => store.commit(`Expérience : ${v} PX`, (s) => (s.xp.current = v))} />
        <button class="btn small" disabled={c.xp.current < per} onclick={() => store.commit(`${per} PX dépensés`, (s) => (s.xp.current -= per))}>Dépenser {per} PX</button>
        <button class="btn small primary" onclick={() => store.open({ type: 'xp' })}>Fin de séance</button>
      </div>
    </section>
    {/if}

    <button class="btn block free-roll" onclick={() => store.open({ type: 'roll', free: true })}><Icon name="dice" />Jet libre</button>
  </div>
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .col > .panel + .panel { margin-top: 0; }
  .col { display: grid; gap: 12px; align-content: start; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1.1fr 1fr; align-items: start; } }
  /* Wide screens: the right-hand column splits in two, the whole width is used. */
  @media (min-width: 1500px) { .grid { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); } .col { grid-template-columns: 1fr 1fr; } }
  .empty { margin-bottom: 12px; border-left: 3px solid var(--amber); }
  .empty h2 { font-size: 1.2rem; }
  .empty p { margin: 6px 0 12px; color: var(--muted); }
  .attrs li { padding: 12px 0; display: grid; gap: 10px; }
  .attrs li:first-child { padding-top: 2px; }
  .attr-top { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; }
  h3 { font-size: 1.05rem; }
  .small { font-size: .82rem; }
  .score { font-size: 1.7rem; font-weight: 700; line-height: 1; text-align: right; position: relative; }
  .score small { font-size: .55em; color: var(--muted); font-weight: 500; }
  .score.hurt { color: var(--fault); }
  .broken { display: block; font-family: var(--body); font-size: .7rem; font-weight: 600; color: var(--fault); }
  .energy { box-shadow: inset 0 0 0 1px var(--line), inset 3px 0 0 var(--coolant); }
  .ep-row { display: flex; align-items: center; justify-content: space-between; margin: 2px 0 12px; }
  .ep-btn { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 4px; border: 1px solid var(--line); background: var(--abyss); color: var(--text); }
  .ep-btn:disabled { opacity: .3; }
  .ep-btn:not(:disabled):active { background: var(--hull-2); }
  .ep-val { display: flex; align-items: baseline; gap: 6px; color: var(--coolant); }
  .ep-val :global(svg) { align-self: center; }
  .ep-val span { font-size: 3rem; font-weight: 700; line-height: 1; }
  .ep-val small { font-size: 1.2rem; color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .cover-h { margin: 16px 0 8px; font-size: 1rem; }
  .pool { margin: 0 0 10px; }
  .head-acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .xp-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .free-roll { min-height: 52px; }
</style>
