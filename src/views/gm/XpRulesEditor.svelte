<script>
  // MJ → Règles de l'expérience (T11): the end-of-session questions (text, XP,
  // on/off, order), bonus awards, the cost of an upgrade, and « Valeurs du
  // livre ». Stored whole in campaign.rules.xp; read through xpRules().
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { xpRules, bookXp } from '../../lib/xp.js';

  const rules = $derived(xpRules(store.campaign));
  const custom = $derived(!!store.campaign.rules.xp);
  const book = bookXp();
  let newQ = $state('');
  let newB = $state('');
  const uid = () => Math.random().toString(36).slice(2, 8);

  // Every edit writes the whole rule set (simple to read back, one undo step).
  function save(label, fn) {
    const r = JSON.parse(JSON.stringify(rules));
    fn(r);
    store.commitAll(label, (d) => (d.campaign.rules.xp = r));
  }
  const move = (i, by) => save(null, (r) => { const [q] = r.questions.splice(i, 1); r.questions.splice(i + by, 0, q); });
  function addQ(e) { e.preventDefault(); if (!newQ.trim()) return; const t = newQ.trim(); save('Question ajoutée', (r) => r.questions.push({ id: uid(), text: t, xp: 1, enabled: true })); newQ = ''; }
  function addB(e) { e.preventDefault(); if (!newB.trim()) return; const t = newB.trim(); save('Récompense ajoutée', (r) => r.bonusAwards.push({ id: uid(), text: t, xp: 1 })); newB = ''; }
  const reset = () => store.commitAll("Règles de l'expérience : valeurs du livre", (d) => delete d.campaign.rules.xp);
</script>

<section class="panel xpr">
  <div class="panel-head"><h2>Règles de l'expérience</h2>{#if custom}<span class="tag">réglées par le MJ</span>{/if}</div>
  <p class="hint top">Le livre (p.26) : 1 PX par réponse « oui », {book.costs.program} PX pour un programme +1 ou une fonction secondaire.</p>

  <h3>Questions de fin de séance</h3>
  <ul class="list">
    {#each rules.questions as q, i (q.id)}
      <li class="row" class:off={!q.enabled}>
        <label class="chk"><input type="checkbox" checked={q.enabled} onchange={(e) => save(null, (r) => (r.questions[i].enabled = e.currentTarget.checked))} aria-label="Question active" /></label>
        <input class="input txt" value={q.text} onchange={(e) => save(null, (r) => (r.questions[i].text = e.currentTarget.value.trim() || q.text))} aria-label="Texte de la question {i + 1}" />
        <Stepper value={q.xp} min={0} max={5} label="PX de la question {i + 1}" onchange={(v) => save(null, (r) => (r.questions[i].xp = v))} size="sm" />
        <span class="mv">
          <button class="icon-btn" disabled={i === 0} aria-label="Monter la question {i + 1}" onclick={() => move(i, -1)}><Icon name="chevron" size={18} /></button>
          <button class="icon-btn down" disabled={i === rules.questions.length - 1} aria-label="Descendre la question {i + 1}" onclick={() => move(i, 1)}><Icon name="chevron" size={18} /></button>
          <button class="icon-btn" aria-label="Supprimer la question {i + 1}" onclick={() => save('Question supprimée', (r) => r.questions.splice(i, 1))}><Icon name="trash" size={18} /></button>
        </span>
      </li>
    {/each}
  </ul>
  <form class="add" onsubmit={addQ}><input class="input" bind:value={newQ} placeholder="Nouvelle question" aria-label="Nouvelle question" /><button class="btn" type="submit" disabled={!newQ.trim()}><Icon name="plus" size={18} />Ajouter</button></form>

  <h3>Récompenses en plus</h3>
  <p class="hint">Par exemple « Ordre de travail accompli » : une case de plus pour chaque robot en fin de séance.</p>
  <ul class="list">
    {#each rules.bonusAwards as b, i (b.id)}
      <li class="row">
        <input class="input txt" value={b.text} onchange={(e) => save(null, (r) => (r.bonusAwards[i].text = e.currentTarget.value.trim() || b.text))} aria-label="Récompense {i + 1}" />
        <Stepper value={b.xp} min={0} max={5} label="PX de la récompense {i + 1}" onchange={(v) => save(null, (r) => (r.bonusAwards[i].xp = v))} size="sm" />
        <button class="icon-btn" aria-label="Supprimer la récompense {i + 1}" onclick={() => save('Récompense supprimée', (r) => r.bonusAwards.splice(i, 1))}><Icon name="trash" size={18} /></button>
      </li>
    {/each}
  </ul>
  <form class="add" onsubmit={addB}><input class="input" bind:value={newB} placeholder="Nouvelle récompense" aria-label="Nouvelle récompense" /><button class="btn" type="submit" disabled={!newB.trim()}><Icon name="plus" size={18} />Ajouter</button></form>

  <h3>Coûts</h3>
  <div class="costs">
    <div class="cost"><span>Programme +1 <small>(livre : {book.costs.program})</small></span><Stepper value={rules.costs.program} min={1} max={20} label="Coût d'un programme +1" onchange={(v) => save(`Programme +1 : ${v} PX`, (r) => (r.costs.program = v))} size="sm" /></div>
    <div class="cost"><span>Fonction secondaire <small>(livre : {book.costs.secondary})</small></span><Stepper value={rules.costs.secondary} min={1} max={20} label="Coût d'une fonction secondaire" onchange={(v) => save(`Fonction secondaire : ${v} PX`, (r) => (r.costs.secondary = v))} size="sm" /></div>
  </div>
  <button class="btn small ghost reset" disabled={!custom} onclick={reset}>Valeurs du livre</button>
</section>

<style>
  .xpr { grid-column: 1 / -1; }
  .top { margin: -4px 0 10px; }
  .tag { font-size: .72rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; background: var(--hull-2); }
  h3 { font-size: 1rem; margin: 14px 0 4px; }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 0; }
  .row.off .txt { opacity: .55; }
  .chk { display: inline-grid; place-items: center; width: 40px; min-height: 44px; }
  .chk input { width: 20px; height: 20px; accent-color: var(--amber); }
  .txt { flex: 1; min-width: 12em; }
  .mv { display: inline-flex; }
  .mv :global(svg) { rotate: -90deg; }
  .mv .down :global(svg) { rotate: 90deg; }
  .mv button:last-child :global(svg) { rotate: 0deg; }
  .add { display: flex; gap: 8px; margin-top: 6px; }
  .add .input { flex: 1; min-width: 0; }
  .costs { display: grid; gap: 4px; }
  .cost { display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 52px; }
  .cost small { color: var(--muted); }
  .reset { margin-top: 8px; }
</style>
