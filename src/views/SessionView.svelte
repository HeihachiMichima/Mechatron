<script>
  // Séance space: end of session (XP questions per robot, wear of the collective's
  // levels) and the campaign journal. T11 turns the end of session into a wizard.
  import Icon from '../components/Icon.svelte';
  import { store, pushJournal } from '../lib/store.svelte.js';
  import { getRules } from '../lib/settings.js';
  import { DEV_KEYS, DEV_LABELS } from '../lib/rules.js';
  import { d6 } from '../lib/rng.js';

  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  const per = $derived(getRules().xpPerUpgrade);
  const dev = $derived(store.campaign.dev);
  // Newest first.
  const journal = $derived([...store.campaign.journal].reverse());
  let text = $state('');

  function decay() {
    const rolls = DEV_KEYS.map(() => d6());
    const line = `Usure : ${DEV_KEYS.map((k, i) => `${DEV_LABELS[k]} −${rolls[i]}`).join(', ')}`;
    store.commitAll(line, (d) => {
      DEV_KEYS.forEach((k, i) => (d.campaign.dev[k] = Math.max(0, d.campaign.dev[k] - rolls[i])));
      pushJournal(d, line);
    });
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

<div class="grid">
  <div class="col">
    <section class="panel">
      <div class="panel-head"><h2>Expérience</h2><span class="meta">{per} PX = un programme +1 ou une fonction</span></div>
      {#if pcs.length === 0}<p class="muted">Aucun robot joueur pour l'instant.</p>{/if}
      <ul class="list">
        {#each pcs as c (c.id)}
          <li class="xp">
            <span class="who"><span class="cdot" style="background:{c.color}"></span><span class="nm">{c.name || 'Sans nom'}</span></span>
            <b class="num pts">{c.xp.current} PX</b>
            <button class="btn small" onclick={() => store.open({ type: 'xp', cid: c.id })}>Questions</button>
          </li>
        {/each}
      </ul>
      <p class="hint">Les questions de fin de séance donnent 1 PX par réponse « oui ». Les PX se dépensent sur la fiche (État).</p>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Usure des niveaux</h2></div>
      <p class="levels num">{#each DEV_KEYS as k, i (k)}<span>{DEV_LABELS[k]} <b>{dev[k]}</b></span>{/each}</p>
      <button class="btn small" onclick={decay}>Fin de séance : −1D6 à chaque niveau</button>
      <p class="hint">Le résultat est noté dans le journal. Les niveaux se règlent à la main dans l'espace Énergie.</p>
    </section>
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
  .levels { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0 0 12px; color: var(--muted); font-size: .9rem; }
  .levels b { color: var(--text); font-size: 1.05rem; }
  .add { display: grid; gap: 8px; margin-bottom: 8px; }
  .add textarea { min-height: 84px; }
  .add .btn { justify-self: end; }
  .empty { margin: 4px 0 0; }
  .entries li { padding: 10px 0; }
  .when { font-size: .8rem; color: var(--muted); }
  .entries p { margin: 2px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
