<script>
  // Séance space: « Terminer la séance » (T11 wizard: XP for the whole team, DEV
  // wear, relations, summary), each robot's XP and spending, the history of
  // sessions, and the campaign journal.
  import Icon from '../components/Icon.svelte';
  import SessionWizard from './session/SessionWizard.svelte';
  import { store } from '../lib/store.svelte.js';
  import { xpRules, sessionDraft } from '../lib/xp.js';

  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  const rules = $derived(xpRules(store.campaign));
  const sessions = $derived([...store.campaign.xp.log].map((s, i) => ({ ...s, n: i + 1 })).reverse());
  // Newest first.
  const journal = $derived([...store.campaign.journal].reverse());
  let text = $state('');

  function startSession() {
    store.backup('Fin de séance');
    store.ui.session = { step: 0, draft: sessionDraft(store.data), done: null };
    window.scrollTo({ top: 0 });
  }
  function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    store.addJournal(text);
    text = '';
  }
  const fmt = (at) => {
    const d = new Date(at);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };
</script>

{#if store.ui.session}
<SessionWizard />
{:else}
<div class="grid">
  <div class="col">
    <section class="panel end">
      <div class="panel-head"><h2>Fin de séance</h2></div>
      <p class="hint top">Pour toute l'équipe d'un coup : les PX (questions du MJ), l'usure des niveaux (1D6 chacun), les relations et le résumé au journal. Une sauvegarde automatique est faite avant.</p>
      <button class="btn primary block go" disabled={!pcs.length} onclick={startSession}><Icon name="seance" size={20} />Terminer la séance</button>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Expérience</h2><span class="meta">{rules.costs.program} PX = un programme +1, {rules.costs.secondary} PX = une fonction</span></div>
      {#if pcs.length === 0}<p class="muted">Aucun robot joueur pour l'instant.</p>{/if}
      <ul class="list">
        {#each pcs as c (c.id)}
          <li class="xp">
            <span class="who"><span class="cdot" style="background:{c.color}"></span><span class="nm">{c.name || 'Sans nom'}</span></span>
            <b class="num pts">{c.xp.current} PX</b>
            <button class="btn small" onclick={() => store.open({ type: 'xpSpend', cid: c.id })}>Dépenser</button>
          </li>
        {/each}
      </ul>
    </section>

    {#if sessions.length}
      <section class="panel">
        <div class="panel-head"><h2>Séances</h2><span class="meta">{sessions.length}</span></div>
        <ol class="list hist">
          {#each sessions as s (s.n)}
            <li><span class="when">Séance {s.n}{s.day ? `, jour ${s.day}` : ''}, {fmt(s.at)}</span><p>{s.awards.map((a) => `${a.name} +${a.total} PX`).join(', ') || 'aucun PX'}</p></li>
          {/each}
        </ol>
      </section>
    {/if}
  </div>

  <section class="panel">
    <div class="panel-head"><h2>Journal de campagne</h2><span class="meta">{journal.length} entrée{journal.length > 1 ? 's' : ''}</span></div>
    <form class="add" onsubmit={add}>
      <textarea class="input" bind:value={text} rows="3" placeholder="Ordres de travail, PNJ rencontrés, secrets de la Fraternité, indices sur les humains…" aria-label="Nouvelle entrée du journal"></textarea>
      <button class="btn primary" type="submit" disabled={!text.trim()}><Icon name="plus" size={18} />Ajouter au journal</button>
    </form>
    {#if journal.length === 0}<p class="muted empty">Le journal est vide.</p>{/if}
    <ol class="list entries">
      {#each journal as j, i (journal.length - i)}
        <li><span class="when">{#if j.day != null}Jour {j.day}, {/if}{fmt(j.at)}</span><p>{j.text}</p></li>
      {/each}
    </ol>
  </section>
</div>
{/if}

<style>
  .grid { display: grid; gap: 12px; }
  .col { display: grid; gap: 12px; align-content: start; }
  .grid .panel + .panel { margin-top: 0; }
  @media (min-width: 900px) { .grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); align-items: start; } }
  .xp { display: flex; align-items: center; gap: 10px; min-height: 52px; }
  .who { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-family: var(--display); font-weight: 600; }
  .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .pts { color: var(--amber); }
  .top { margin: -4px 0 12px; }
  .go { min-height: 52px; }
  .end { border-left: 3px solid var(--amber); }
  .hist li { padding: 8px 0; }
  .hist p { margin: 2px 0 0; }
  .add { display: grid; gap: 8px; margin-bottom: 8px; }
  .add textarea { min-height: 84px; }
  .add .btn { justify-self: end; }
  .empty { margin: 4px 0 0; }
  .entries li { padding: 10px 0; }
  .when { font-size: .8rem; color: var(--muted); }
  .entries p { margin: 2px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
