<script>
  // The team creation wizard (T06): the book's creation steps in order
  // (p.16-29), one screen each, Back/Next, a numbered rail of the 9 steps.
  // The draft lives in store.ui.wizard (not saved); lib/creation.js checks it
  // and builds the robot. Players can only go forward through valid steps; in
  // GM mode every step can be opened.
  import Icon from '../../components/Icon.svelte';
  import ChassisStep from './ChassisStep.svelte';
  import ProgramStep from './ProgramStep.svelte';
  import ModuleStep from './ModuleStep.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { ATTRS, findWeapon, findEquipment, devBand } from '../../lib/rules.js';
  import { getDev } from '../../lib/settings.js';
  import { STEPS, SLOTS, stepErrors, modelById, draftName, draftAttrs, newSerial, gearItems, closeWizard, finishWizard } from '../../lib/creation.js';

  const w = $derived(store.ui.wizard);
  const d = $derived(w.draft);
  const edit = $derived(!!w.id);
  const ctx = $derived({ chars: store.chars, id: w.id, gm: store.ui.gm });
  const step = $derived(STEPS[w.step]);
  const errors = $derived(stepErrors(step.id, d, ctx));
  const m = $derived(modelById(d.model));
  const tot = $derived(draftAttrs(d));
  const L = D.attributeLabels;
  const ration = $derived(devBand(getDev().Energie).energyEp);
  const others = $derived(store.chars.filter((c) => c.kind !== 'npc' && c.id !== w.id));
  // A step can be opened when every step before it is valid (always in GM mode).
  const reachable = (i) => store.ui.gm || STEPS.slice(0, i).every((s) => !stepErrors(s.id, d, ctx).length);
  const done = (i) => i < w.step || (i !== w.step && !stepErrors(STEPS[i].id, d, ctx).length && reachable(i));
  let top;
  function goto(i) { w.step = i; top?.scrollIntoView({ block: 'start' }); window.scrollTo({ top: 0 }); }
  let armed = $state(false);
  function quit() {
    if (!armed && d.model) { armed = true; setTimeout(() => (armed = false), 3500); return; }
    closeWizard();
  }
  const pickModel = (id) => { if (d.model !== id) { d.model = id; d.secondary = ''; d.gear = []; d.specialRating = d.specialRating || 0; } };
  const colorOwner = (hex) => others.find((c) => c.color === hex);
  const gearLabel = (name) => {
    const wpn = findWeapon(name);
    if (wpn) return `arme, bonus ${wpn.bonus ?? '—'}, dégâts ${wpn.degats}, portée ${wpn.portee.toLowerCase()}`;
    return findEquipment(name)?.note || '';
  };
  const progLine = $derived(D.programs.filter((p) => d.programRatings[p.key]).map((p) => `${p.label} ${d.programRatings[p.key]}`).join(', '));
</script>

<section class="wiz" bind:this={top} aria-label="Assistant de création">
  <header class="whead">
    <div class="title">
      <h1>{edit ? `Modifier ${draftName(d) || 'le robot'}` : 'Nouveau robot'}</h1>
      <button class="btn small ghost quit" class:armed onclick={quit}>{armed ? 'Toucher encore pour abandonner' : edit ? 'Fermer sans enregistrer' : 'Abandonner'}</button>
    </div>
    <ol class="rail">
      {#each STEPS as s, i (s.id)}
        <li>
          <button class:current={i === w.step} class:done={done(i)} disabled={!reachable(i)} aria-current={i === w.step ? 'step' : undefined} aria-label="Étape {i + 1} : {s.label}" onclick={() => goto(i)}>
            <span class="n num">{i + 1}</span>
          </button>
        </li>
      {/each}
    </ol>
    <p class="where">Étape {w.step + 1} sur {STEPS.length} : <b>{step.label}</b></p>
  </header>

  <div class="body">
    {#if step.id === 'modele'}
      <p class="lead">Le modèle est la base du robot : il fixe son programme spécialiste, sa hiérarchie et les fonctions secondaires possibles. Il ne change plus ensuite.</p>
      <div class="models">
        {#each D.models as mo (mo.id)}
          <button class="card" aria-pressed={d.model === mo.id} onclick={() => pickModel(mo.id)}>
            <span class="cn">{mo.name}</span>
            <span class="cs">{mo.special} <small>({L[mo.specialAttr].label})</small>, hiérarchie {mo.hierarchy}</span>
            <span class="cf">{mo.secondary.join(', ')}</span>
          </button>
        {/each}
      </div>

    {:else if step.id === 'nom'}
      <label class="field"><span>Surnom</span><input class="input" bind:value={d.nick} maxlength="40" autocomplete="off" placeholder="ex. Rani" /></label>
      <div class="field">
        <span>Numéro de série</span>
        <div class="serial">
          <input class="input num" bind:value={d.serial} maxlength="16" autocomplete="off" placeholder="ex. NON-836" aria-label="Numéro de série" />
          <button class="btn" onclick={() => (d.serial = newSerial(store.chars))}><Icon name="dice" size={18} />Générer</button>
        </div>
        <small class="hint">Trois lettres et trois chiffres, unique dans Mechatron-7.{m?.id === 'scrap' ? ' Un robot de rebut peut s\'en passer, ou inventer le sien.' : ''}</small>
      </div>
      <label class="field"><span>Joueur ou joueuse</span><input class="input" bind:value={d.player} maxlength="40" autocomplete="off" /></label>
      <div class="field">
        <span>Couleur de l'onglet</span>
        <div class="swatches" role="radiogroup" aria-label="Couleur de l'onglet">
          {#each D.pcColors as col (col.hex)}
            {@const owner = colorOwner(col.hex)}
            <button class="sw" role="radio" aria-checked={d.color === col.hex} class:taken={!!owner} style="--sw:{col.hex}"
              aria-label="{col.name}{owner ? `, déjà pris par ${owner.name || 'un autre robot'}` : ''}" title={col.name} onclick={() => (d.color = col.hex)}></button>
          {/each}
        </div>
        <small class="hint">Sans choix, une couleur libre est attribuée.</small>
      </div>

    {:else if step.id === 'chassis'}
      <ChassisStep draft={d} selfId={w.id} />

    {:else if step.id === 'programmes'}
      <ProgramStep draft={d} />

    {:else if step.id === 'fonction'}
      <p class="lead">Une fonction secondaire au départ, parmi les trois de votre modèle. Les autres s'apprennent en jeu (5 PX).</p>
      <div class="list-cards" role="radiogroup" aria-label="Fonction secondaire">
        {#each m?.secondary ?? [] as name (name)}
          {@const f = D.secondaryFunctions.find((x) => x.name === name)}
          <button class="card" role="radio" aria-checked={d.secondary === name} onclick={() => (d.secondary = name)}>
            <span class="cn">{name}</span>
            <span class="cf">{f?.desc}</span>
          </button>
        {/each}
      </div>

    {:else if step.id === 'modules'}
      <ModuleStep draft={d} selfId={w.id} />

    {:else if step.id === 'equipement'}
      {#if edit}
        <p class="lead">L'équipement se modifie dans l'onglet Matériel de la fiche.</p>
      {:else}
        <p class="lead">Votre modèle part avec ce matériel{m?.gear.some((g) => g.length > 1) ? ', avec un choix à faire' : ''}.</p>
        {#if !m?.gear.length}<p class="callout">Aucun équipement de départ : un robot de rebut trouve ce qu'il lui faut dans sa collection.</p>{/if}
        <ul class="list gear">
          {#each m?.gear ?? [] as g, i (i)}
            <li>
              {#if g.length === 1}
                <div class="gi"><Icon name="check" size={18} /><span><b>{g[0]}</b><small>{gearLabel(g[0])}</small></span></div>
              {:else}
                <span class="ol">Au choix</span>
                <div class="list-cards two" role="radiogroup" aria-label="Au choix : {g.join(' ou ')}">
                  {#each g as name, j (name)}
                    <button class="card" role="radio" aria-checked={d.gear[i] === j} onclick={() => (d.gear[i] = j)}>
                      <span class="cn">{name}</span><span class="cf">{gearLabel(name)}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
        <p class="ep"><Icon name="bolt" size={18} />Énergie de départ : <b class="num">{ration} PE</b>, le niveau de rationnement actuel (Énergie {getDev().Energie}).</p>
      {/if}

    {:else if step.id === 'relations'}
      <p class="lead">Facultatif, et modifiable après chaque séance.</p>
      <label class="field"><span>Mon binôme <small>(le PJ dont vous êtes le plus proche)</small></span><input class="input" bind:value={d.buddy} list="wiz-pcs" autocomplete="off" /></label>
      {#if others.length}
        <datalist id="wiz-pcs">{#each others as c (c.id)}<option value={c.name}></option>{/each}</datalist>
        <div class="chips quick">{#each others as c (c.id)}<button class="chip" aria-pressed={d.buddy === c.name} onclick={() => (d.buddy = c.name)}>{c.name || 'Sans nom'}</button>{/each}</div>
      {/if}
      <label class="field"><span>Je déteste <small>(un PNJ)</small></span><input class="input" bind:value={d.hate} autocomplete="off" /></label>
      <label class="field"><span>Je dois protéger <small>(un PNJ)</small></span><input class="input" bind:value={d.protect} autocomplete="off" /></label>
      <label class="field"><span>Mon grand rêve</span><input class="input" bind:value={d.dream} autocomplete="off" /></label>

    {:else if step.id === 'recap'}
      <dl class="recap">
        <div><dt>Modèle <button class="link" onclick={() => goto(0)}>Modifier</button></dt><dd>{m?.name ?? '—'}{#if m}, hiérarchie {m.hierarchy + (d.secondary === "Unité d'élite" ? 2 : 0)}{/if}</dd></div>
        <div><dt>Nom <button class="link" onclick={() => goto(1)}>Modifier</button></dt><dd>{draftName(d) || '—'}{d.player ? `, joué par ${d.player}` : ''}</dd></div>
        <div><dt>Châssis <button class="link" onclick={() => goto(2)}>Modifier</button></dt>
          <dd>{SLOTS.map((s) => d[s.key] || '?').join(', ')}
            <span class="stats num">{#each ATTRS as a (a)}<span>{L[a].short} <b>{tot[a]}</b></span>{/each}<span>Arm. <b>{tot.armor}</b></span><span>Empl. <b>{tot.slots}</b></span></span></dd></div>
        <div><dt>Programmes <button class="link" onclick={() => goto(3)}>Modifier</button></dt><dd>{m ? `${m.special} ${d.specialRating || 0}` : ''}{progLine ? `, ${progLine}` : ''}</dd></div>
        <div><dt>Fonction secondaire <button class="link" onclick={() => goto(4)}>Modifier</button></dt><dd>{d.secondary || '—'}</dd></div>
        <div><dt>Modules <button class="link" onclick={() => goto(5)}>Modifier</button></dt><dd>{d.modules.join(', ') || 'aucun'}</dd></div>
        {#if !edit}<div><dt>Équipement <button class="link" onclick={() => goto(6)}>Modifier</button></dt><dd>{gearItems(d).map((x) => x ?? '?').join(', ') || 'aucun'} ; {ration} PE</dd></div>{/if}
        <div><dt>Relations <button class="link" onclick={() => goto(7)}>Modifier</button></dt>
          <dd>{[d.buddy && `binôme : ${d.buddy}`, d.hate && `déteste : ${d.hate}`, d.protect && `protège : ${d.protect}`, d.dream && `rêve : ${d.dream}`].filter(Boolean).join(' ; ') || 'à définir plus tard'}</dd></div>
      </dl>
    {/if}
  </div>

  {#if errors.length}
    <ul class="errors" role="status">{#each errors as e (e)}<li>{e}</li>{/each}</ul>
  {/if}

  <footer class="wfoot">
    <button class="btn" disabled={w.step === 0} onclick={() => goto(w.step - 1)}><Icon name="back" size={18} />Retour</button>
    {#if step.id === 'recap'}
      <button class="btn primary" disabled={errors.length > 0} onclick={finishWizard}><Icon name="check" size={18} />{edit ? 'Enregistrer' : 'Créer le robot'}</button>
    {:else}
      <button class="btn primary" disabled={errors.length > 0 && !store.ui.gm} onclick={() => goto(w.step + 1)}>Suivant<Icon name="chevron" size={18} /></button>
    {/if}
  </footer>
</section>

<style>
  .wiz { display: grid; gap: 12px; max-width: 980px; scroll-margin-top: 80px; }
  .whead { display: grid; gap: 10px; }
  .title { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  h1 { font-size: 1.4rem; }
  .quit { color: var(--muted); }
  .quit.armed { color: var(--amber); border-color: var(--amber); }
  /* The rail: the 9 stations of the assembly line, joined by a track. */
  .rail { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(9, 1fr); position: relative; }
  .rail::before { content: ''; position: absolute; left: 5%; right: 5%; top: 50%; height: 2px; background: var(--line); }
  .rail li { display: grid; justify-items: center; position: relative; }
  /* Each button fills its column (44 px tall touch target); the circle is drawn inside. */
  .rail button { width: 100%; min-height: 44px; display: grid; place-items: center; background: none; border: 0; padding: 0; color: var(--muted); }
  .rail .n { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--line); background: var(--abyss); font-size: .95rem; }
  .rail button.done .n { border-color: var(--amber); color: var(--text); }
  .rail button.current .n { background: var(--amber); border-color: var(--amber); color: var(--amber-ink); font-weight: 700; }
  .rail button:disabled { opacity: .55; cursor: default; }
  .rail button:focus-visible { outline: none; }
  .rail button:focus-visible .n { outline: 2px solid var(--amber); outline-offset: 2px; }
  .where { margin: 0; color: var(--muted); }
  .where b { color: var(--text); font-family: var(--display); font-size: 1.15rem; }
  .body { display: grid; gap: 4px; }
  .lead { margin: 0 0 8px; color: var(--muted); max-width: 70ch; }
  .models { display: grid; gap: 8px; }
  @media (min-width: 560px) { .models { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1100px) { .models { grid-template-columns: repeat(4, 1fr); } }
  .list-cards { display: grid; gap: 8px; }
  @media (min-width: 720px) { .list-cards { grid-template-columns: repeat(3, 1fr); } .list-cards.two { grid-template-columns: 1fr 1fr; } }
  .card { display: grid; gap: 3px; align-content: start; text-align: left; padding: 12px; min-height: 64px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .card[aria-pressed='true'], .card[aria-checked='true'] { border-color: var(--amber); box-shadow: inset 0 0 0 1px var(--amber); }
  .card[aria-pressed='true'] .cn, .card[aria-checked='true'] .cn { color: var(--amber); }
  .cn { font-family: var(--display); font-weight: 600; font-size: 1.05rem; }
  .cs { font-size: .9rem; }
  .cs small { color: var(--muted); }
  .cf { font-size: .85rem; color: var(--muted); }
  .serial { display: flex; gap: 8px; }
  .serial .input { flex: 1; min-width: 0; letter-spacing: .04em; }
  .field > span small { color: var(--muted); }
  .swatches { display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { width: 40px; height: 40px; border-radius: 50%; background: var(--sw); border: 2px solid var(--hull); box-shadow: 0 0 0 1px var(--line); position: relative; }
  .sw[aria-checked='true'] { box-shadow: 0 0 0 3px var(--text); }
  .sw.taken::after { content: ''; position: absolute; inset: 14px; border-radius: 50%; background: var(--hull); opacity: .7; }
  .quick { margin: -6px 0 12px; }
  .gear li { padding: 10px 0; }
  .gi { display: flex; gap: 10px; align-items: flex-start; }
  .gi > :global(svg) { color: var(--amber); flex: none; margin-top: 2px; }
  .gi span, .gi b { display: grid; }
  .gi small, .ol { font-size: .85rem; color: var(--muted); }
  .ol { display: block; margin-bottom: 6px; }
  .ep { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 12px 0 0; }
  .ep :global(svg), .ep b { color: var(--coolant); }
  .callout { margin: 0; padding: 10px 12px; border-left: 3px solid var(--line); background: var(--abyss); }
  .recap { margin: 0; display: grid; gap: 0; }
  .recap > div { padding: 10px 0; border-top: 1px solid var(--line); }
  .recap dt { display: flex; justify-content: space-between; align-items: center; font-size: .85rem; color: var(--muted); }
  .recap dd { margin: 2px 0 0; }
  .link { background: none; border: 0; color: var(--amber); font-size: .85rem; min-height: 36px; padding: 0 4px; }
  .stats { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; color: var(--muted); font-size: .9rem; }
  .stats b { color: var(--text); }
  .errors { margin: 0; padding: 10px 12px 10px 28px; background: var(--abyss); border-left: 3px solid var(--amber); }
  .errors li { margin: 2px 0; }
  .wfoot {
    position: sticky; bottom: calc(var(--nav-h) + env(safe-area-inset-bottom)); z-index: 5;
    display: flex; justify-content: space-between; gap: 8px; padding: 10px 0; background: var(--abyss); border-top: 1px solid var(--line);
  }
  @media (min-width: 960px) { .wfoot { bottom: 0; } }
  .wfoot .btn { min-width: 8.5em; }
</style>
