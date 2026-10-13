<script>
  // « Terminer la séance » (T11): one guided flow for the whole team. Opening it
  // makes an automatic backup; nothing changes until « Terminer la séance » at
  // the end, which is one undoable step (lib/xp.js applySession). Draft in
  // store.ui.session (not saved).
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { DEV_KEYS, DEV_LABELS } from '../../lib/rules.js';
  import { xpRules, sessionXp, rollDecay, applySession, sinceLast } from '../../lib/xp.js';
  import { downloadBlob, jsonBlob } from '../../lib/exports.js';
  import { campaignFileName } from '../../lib/campaign.js';

  const STEPS = ['Expérience', 'Niveaux', 'Relations', 'Récapitulatif'];
  const s = $derived(store.ui.session);
  const d = $derived(s.draft);
  const rules = $derived(xpRules(store.campaign));
  const qs = $derived(rules.questions.filter((q) => q.enabled));
  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  const since = $derived(sinceLast(store.data));
  const rolled = $derived(DEV_KEYS.every((k) => d.dev[k].roll != null));
  const go = (i) => { s.step = i; window.scrollTo({ top: 0 }); };
  const toggle = (map, cid, id) => (map[cid][id] = !map[cid][id]);
  function finish() {
    const draft = JSON.parse(JSON.stringify(d));
    let entry = null;
    store.commitAll('Séance terminée', (data) => (entry = applySession(data, draft)));
    s.done = entry;
  }
  function exportCampaign() {
    downloadBlob(jsonBlob(store.exportData()), campaignFileName(store.campaign.name));
    store.notify('Campagne exportée');
  }
</script>

<section class="wiz" aria-label="Fin de séance">
  <header class="whead">
    <div class="title">
      <h1>Fin de séance</h1>
      {#if !s.done}<button class="btn small ghost" onclick={() => (store.ui.session = null)}>Fermer sans rien changer</button>{/if}
    </div>
    {#if !s.done}
      <ol class="rail">
        {#each STEPS as label, i (label)}
          <li><button class:current={i === s.step} class:done={i < s.step} aria-current={i === s.step ? 'step' : undefined} aria-label="Étape {i + 1} : {label}" onclick={() => go(i)}><span class="n num">{i + 1}</span><span class="l">{label}</span></button></li>
        {/each}
      </ol>
      <p class="hint">Une sauvegarde automatique a été faite. Rien ne change avant « Terminer la séance ».</p>
    {/if}
  </header>

  {#if s.done}
    <div class="panel donep">
      <h2>Séance terminée</h2>
      <ul class="list">{#each s.done.awards as a (a.cid)}<li><b>{a.name}</b><span class="num">+{a.total} PX</span></li>{/each}</ul>
      <p class="hint">Tout est au journal. Les robots peuvent dépenser leurs PX ({rules.costs.program} pour un programme +1, {rules.costs.secondary} pour une fonction secondaire).</p>
      <p class="remind">Exportez la campagne : c'est votre copie hors de ce navigateur, qui peut effacer ses données (surtout sur iPhone et iPad, après quelques jours sans visite).</p>
      <div class="acts">
        <button class="btn primary" onclick={exportCampaign}><Icon name="download" size={18} />Exporter la campagne</button>
        <button class="btn" onclick={() => (store.ui.session = null)}>Fermer</button>
      </div>
    </div>
  {:else if s.step === 0}
    <p class="lead">Une case par réponse « oui » ; le MJ a le dernier mot (ajustement à droite).</p>
    <div class="xp">
      {#each pcs as c (c.id)}
        <section class="panel robot">
          <div class="panel-head"><h2><span class="cdot" style="background:{c.color}"></span>{c.name || 'Sans nom'}</h2><b class="tot num">+{sessionXp(d, rules, c.id)} PX</b></div>
          <ul class="list">
            {#each qs as q (q.id)}
              <li><label class="chk"><input type="checkbox" checked={!!d.checks[c.id]?.[q.id]} onchange={() => toggle(d.checks, c.id, q.id)} /><span>{q.text}{#if q.xp !== 1}&nbsp;<em class="num">({q.xp} PX)</em>{/if}</span></label></li>
            {/each}
            {#each rules.bonusAwards as b (b.id)}
              <li><label class="chk bonus"><input type="checkbox" checked={!!d.bonus[c.id]?.[b.id]} onchange={() => toggle(d.bonus, c.id, b.id)} /><span>{b.text} <em class="num">(+{b.xp} PX)</em></span></label></li>
            {/each}
          </ul>
          <div class="adj"><span>Ajustement du MJ</span><Stepper value={d.adjust[c.id]} min={-10} max={10} label="Ajustement pour {c.name}" onchange={(v) => (d.adjust[c.id] = v)} size="sm" /></div>
        </section>
      {/each}
      {#if !pcs.length}<p class="muted">Aucun robot joueur.</p>{/if}
    </div>
  {:else if s.step === 1}
    <p class="lead">Après chaque séance, chaque niveau de développement baisse de 1D6 (lancer ouvert). Vous pouvez corriger les valeurs, par exemple après un ordre de travail réussi.</p>
    <button class="btn" onclick={() => rollDecay(d, store.data)}><Icon name="dice" size={18} />{rolled ? 'Relancer les 1D6' : 'Lancer 1D6 par niveau'}</button>
    <ul class="list devs">
      {#each DEV_KEYS as k (k)}
        <li>
          <span class="dn"><b>{DEV_LABELS[k]}</b><small class="num">{store.campaign.dev[k]}{d.dev[k].roll != null ? ` − ${d.dev[k].roll} (D6)` : ''}</small></span>
          <Stepper value={d.dev[k].value} min={0} max={100} label="Nouveau niveau {DEV_LABELS[k]}" onchange={(v) => (d.dev[k].value = v)} size="sm" />
        </li>
      {/each}
    </ul>
  {:else if s.step === 2}
    <p class="lead">Après la séance, chacun peut changer le PNJ qu'il protège, celui qu'il déteste et son grand rêve.</p>
    {#each pcs as c (c.id)}
      <section class="panel robot">
        <div class="panel-head"><h2><span class="cdot" style="background:{c.color}"></span>{c.name || 'Sans nom'}</h2></div>
        <label class="field"><span>Je dois protéger</span><input class="input" bind:value={d.relations[c.id].protect} /></label>
        <label class="field"><span>Je déteste</span><input class="input" bind:value={d.relations[c.id].hate} /></label>
        <label class="field"><span>Mon grand rêve</span><input class="input" bind:value={d.relations[c.id].dream} /></label>
      </section>
    {/each}
  {:else}
    <dl class="recap">
      <div><dt>Expérience</dt><dd>{pcs.map((c) => `${c.name || 'Sans nom'} +${sessionXp(d, rules, c.id)} PX`).join(', ') || '—'}</dd></div>
      <div><dt>Niveaux</dt><dd>{DEV_KEYS.map((k) => `${DEV_LABELS[k]} ${store.campaign.dev[k]} → ${d.dev[k].value}`).join(', ')}{rolled ? '' : ' (usure pas encore lancée)'}</dd></div>
      {#if since.days}<div><dt>Temps de jeu</dt><dd>{since.days} jour{since.days > 1 ? 's' : ''} depuis la séance précédente</dd></div>{/if}
      {#if since.deals.length}<div><dt>Marché noir</dt><dd>{since.deals.map((e) => `${e.type === 'sell' ? 'vente' : 'achat'} de ${e.name} (${e.price} PE)`).join(', ')}</dd></div>{/if}
    </dl>
  {/if}

  {#if !s.done}
    <footer class="wfoot">
      <button class="btn" disabled={s.step === 0} onclick={() => go(s.step - 1)}><Icon name="back" size={18} />Retour</button>
      {#if s.step < STEPS.length - 1}
        <button class="btn primary" onclick={() => go(s.step + 1)}>Suivant<Icon name="chevron" size={18} /></button>
      {:else}
        <button class="btn primary" onclick={finish}><Icon name="check" size={18} />Terminer la séance</button>
      {/if}
    </footer>
  {/if}
</section>

<style>
  .remind { margin: 8px 0 0; padding: 8px 10px; border-left: 3px solid var(--amber); background: var(--abyss); font-size: .9rem; }
  .wiz { display: grid; gap: 12px; max-width: 980px; }
  .whead { display: grid; gap: 8px; }
  .title { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  h1 { font-size: 1.4rem; }
  .rail { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .rail button { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 6px; justify-content: center; background: none; border: 0; border-bottom: 3px solid var(--line); color: var(--muted); padding: 0 2px; }
  .rail button.done { border-color: color-mix(in srgb, var(--amber) 50%, var(--line)); color: var(--text); }
  .rail button.current { border-color: var(--amber); color: var(--text); font-weight: 600; }
  .rail .n { font-size: .9rem; }
  .rail .l { font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 420px) { .rail .l { display: none; } .rail .n { font-size: 1rem; } }
  .lead { margin: 0; color: var(--muted); max-width: 70ch; }
  .xp { display: grid; gap: 12px; }
  @media (min-width: 900px) { .xp { grid-template-columns: 1fr 1fr; } }
  .robot + .robot { margin-top: 0; }
  .panel-head h2 { display: flex; align-items: center; gap: 8px; }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .tot { color: var(--amber); font-size: 1.2rem; }
  .chk { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; min-height: 44px; cursor: pointer; }
  .chk input { width: 20px; height: 20px; margin-top: 1px; flex: none; accent-color: var(--amber); }
  .chk em { font-style: normal; color: var(--amber); }
  .adj { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); font-size: .9rem; color: var(--muted); }
  .devs li { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 56px; }
  .dn { display: grid; }
  .dn small { color: var(--muted); }
  .recap { margin: 0; }
  .recap > div { padding: 10px 0; border-top: 1px solid var(--line); }
  .recap dt { font-size: .85rem; color: var(--muted); }
  .recap dd { margin: 2px 0 0; }
  .donep li { display: flex; justify-content: space-between; padding: 8px 0; }
  .donep li span { color: var(--amber); font-weight: 700; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .wfoot { position: sticky; bottom: calc(var(--nav-h) + env(safe-area-inset-bottom)); z-index: 5; display: flex; justify-content: space-between; gap: 8px; padding: 10px 0; background: var(--abyss); border-top: 1px solid var(--line); }
  @media (min-width: 960px) { .wfoot { bottom: 0; } }
  .wfoot .btn { min-width: 8.5em; }
</style>
