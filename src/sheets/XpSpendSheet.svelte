<script>
  // Spend XP (T11, book p.26): a program +1 (max 5) or a new secondary function
  // of any model (it also needs scrap and some time to install). Costs come from
  // the GM's XP rules. Each spend is one undoable commit, logged.
  import Sheet from '../components/Sheet.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { getRules } from '../lib/settings.js';
  import { modelOf } from '../lib/rules.js';
  import { secondaryItems } from '../lib/pickers.js';
  import { xpRules, programBlock, secondaryBlock, spendProgram, spendSecondary } from '../lib/xp.js';

  let { cid: cidProp } = $props();
  const cid = cidProp; // captured: props vanish once the sheet closes
  const c = $derived(store.char(cid));
  const rules = $derived(xpRules(store.campaign));
  const max = getRules().programMax;
  let tab = $state('programmes');
  let q = $state('');
  const m = $derived(c ? modelOf(c) : null);
  const progs = $derived(c ? [...(m ? [{ key: '__special', label: m.special, level: c.specialRating || 0, special: true }] : []), ...D.programs.map((p) => ({ key: p.key, label: p.label, level: c.programRatings[p.key] || 0 }))] : []);
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const funcs = $derived(c ? secondaryItems(m).filter((f) => !q || norm(`${f.title} ${f.detail}`).includes(norm(q))) : []);
  const groups = $derived([...new Set(funcs.map((f) => f.group))]);

  function raise(p) {
    let why = null;
    store.commitOn(cid, `${c.name || 'Robot'} : ${p.label} ${p.level + 1} (${rules.costs.program} PX)`, (_, d) => (why = spendProgram(d, cid, p.key)));
    if (why) store.notify(why);
  }
  function learn(name) {
    let why = null;
    store.commitOn(cid, `${c.name || 'Robot'} apprend ${name} (${rules.costs.secondary} PX)`, (_, d) => (why = spendSecondary(d, cid, name)));
    if (why) store.notify(why);
  }
</script>

{#if c}
<Sheet title="Dépenser des PX" subtitle="{c.name || 'Sans nom'} : {c.xp.current} PX" wide>
  <div class="chips tabs" role="tablist">
    <button class="chip" role="tab" aria-selected={tab === 'programmes'} aria-pressed={tab === 'programmes'} onclick={() => (tab = 'programmes')}>Programme +1 ({rules.costs.program} PX)</button>
    <button class="chip" role="tab" aria-selected={tab === 'fonctions'} aria-pressed={tab === 'fonctions'} onclick={() => (tab = 'fonctions')}>Fonction secondaire ({rules.costs.secondary} PX)</button>
  </div>
  {#if tab === 'programmes'}
    <p class="hint">Chaque programme monte d'un niveau, jusqu'à {max}.</p>
    <ul class="list">
      {#each progs as p (p.key)}
        {@const why = programBlock(c, p.key, rules)}
        <li class="row">
          <span class="nm"><b>{p.label}</b>{#if p.special}<small>spécialiste</small>{/if}</span>
          <span class="lv num">{p.level}{#if p.level < max}<span class="to"> → {p.level + 1}</span>{/if}</span>
          <button class="btn small" disabled={!!why} title={why || ''} onclick={() => raise(p)}>Monter</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hint">N'importe quelle fonction, même d'un autre modèle. Il faut aussi la ferraille qui convient, et un peu de temps pour l'installer.</p>
    <input class="input" type="search" bind:value={q} placeholder="Rechercher une fonction" aria-label="Rechercher une fonction" />
    {#each groups as g (g)}
      <h3 class="sec">{g}</h3>
      <ul class="list">
        {#each funcs.filter((f) => f.group === g) as f (f.value)}
          {@const why = secondaryBlock(c, f.value, rules)}
          <li class="row">
            <span class="nm"><b>{f.title}</b><small>{f.detail}</small></span>
            <button class="btn small" disabled={!!why} title={why || ''} onclick={() => learn(f.value)}>{c.secondary.includes(f.value) ? 'Acquise' : 'Apprendre'}</button>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
  {#if c.xp.current < Math.min(rules.costs.program, rules.costs.secondary)}<p class="callout">Pas assez de PX pour l'instant : ils se gagnent en fin de séance (espace Séance).</p>{/if}
</Sheet>
{/if}

<style>
  .tabs { margin-bottom: 8px; }
  .row { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 4px 0; }
  .nm { flex: 1; min-width: 0; display: grid; }
  .nm b { font-family: var(--display); font-weight: 600; }
  .nm small { font-size: .82rem; color: var(--muted); }
  .lv { font-size: 1.1rem; font-weight: 700; }
  .to { color: var(--amber); }
  .sec { font-size: .9rem; color: var(--muted); font-weight: 500; margin: 14px 0 2px; }
  .callout { margin: 12px 0 0; padding: 10px 12px; border-left: 3px solid var(--line); background: var(--abyss); }
</style>
