<script>
  // Home screen (T04, T17): first screen when no campaign exists, and what the
  // logo opens over a running campaign (« Reprendre »). Start a new campaign,
  // import one or try the demo; over a running campaign these replace it (it goes
  // to the automatic backups first, and the toast can undo).
  import Icon from '../components/Icon.svelte';
  import BackupList from '../components/BackupList.svelte';
  import { store, blankCampaign, VERSION, THEME_LABEL, THEME_ICON } from '../lib/store.svelte.js';
  import { readImport, NOT_MECHATRON } from '../lib/campaign.js';
  import { demoParty } from '../lib/demo.js';
  import { OLD_SAVE } from '../lib/store.svelte.js';
  import logo from '../assets/logo.png';

  let name = $state('');
  let fileInput;
  const hasBackups = store.backups().length > 0;
  const running = $derived(store.started);
  const cp = $derived(store.campaign);
  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc').length);

  const campaign = (n, extra = {}) => ({ ...blankCampaign(n), ...extra });
  /** Open a campaign: the first one, or in place of the running one (backed up, undoable). */
  const begin = (raw, label) => (store.started ? store.replaceAll(raw, label) : store.start(raw, label));
  function create(e) {
    e.preventDefault();
    if (begin({ version: VERSION, campaign: campaign(name.trim()), chars: [], activeId: null }, 'Campagne créée')) store.go('equipe', 'etat');
  }
  function demo() {
    // The demo is already in play: the black market is open.
    const c = campaign('Démo', { phase: 'play', demo: true });
    c.market.open = true;
    if (begin({ version: VERSION, campaign: c, ...demoParty() }, 'Démo chargée : 4 robots et 3 PNJ')) store.go('equipe', 'etat');
  }
  function resume() { store.leaveHome(); }
  async function openFile(e) {
    const f = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!f) return;
    const { kind, data } = await readImport(f);
    if (kind === 'campaign') begin(data, `Campagne « ${data.campaign.name || 'sans nom'} » importée`);
    else if (kind === 'robot') begin({ version: VERSION, campaign: campaign(''), chars: [{ ...data, id: undefined }] }, `${data.name || 'Robot'} ajouté à une nouvelle campagne`);
    else store.notify(kind === 'old' ? OLD_SAVE : NOT_MECHATRON);
    if (store.started && !store.ui.home) store.go('equipe', 'etat');
  }
</script>

<div class="welcome">
  <button class="icon-btn theme" aria-label={THEME_LABEL[store.ui.theme]} title={THEME_LABEL[store.ui.theme]} onclick={() => store.cycleTheme()}><Icon name={THEME_ICON[store.ui.theme]} /></button>

  <header>
    <img class="logo" src={logo} alt="Mutant : Année Zéro" width="624" height="236" />
    <h1>Compagnon Mechatron</h1>
    <p>Les fiches de l'équipe, l'énergie, les combats : toute la table de jeu sur un seul appareil.</p>
  </header>

  {#if running}
    <section class="panel resume">
      <h2>{cp.name || 'Campagne sans nom'}</h2>
      <p>{pcs} robot{pcs > 1 ? 's' : ''} dans l'équipe{cp.phase === 'play' ? `, jour ${cp.clock.day}` : ", création de l'équipe"}.</p>
      <button class="btn primary block" onclick={resume}><Icon name="chevron" size={18} />Reprendre la campagne</button>
      {#if cp.demo}<button class="btn block quit" onclick={() => store.quitDemo()}>Quitter la démo</button>{/if}
    </section>
    <p class="hint swap">Ouvrir une autre campagne remplace celle-ci, qui part dans les sauvegardes automatiques.</p>
  {/if}

  <form class="panel new" class:sub={running} onsubmit={create}>
    <h2>Nouvelle campagne</h2>
    <label class="field"><span>Nom de la campagne</span>
      <input class="input" bind:value={name} maxlength="80" autocomplete="off" placeholder="Par exemple : Opération Noatun" />
    </label>
    <button class="btn primary block" type="submit"><Icon name="plus" size={18} />Créer la campagne</button>
    <p class="hint">Créez les robots de l'équipe et c'est parti.</p>
  </form>

  <div class="others">
    <div class="panel opt">
      <h2>Importer une campagne</h2>
      <p>Un fichier <span class="num">.mechatron.json</span> exporté depuis ce compagnon, sur cet appareil ou un autre.</p>
      <button class="btn block" onclick={() => fileInput.click()}><Icon name="upload" size={18} />Choisir un fichier</button>
      <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={openFile} />
    </div>
    <div class="panel opt">
      <h2>Essayer la démo</h2>
      <p>Une équipe prête à jouer : robots de combat, de ferraille, de protocole et de nettoyage, et trois PNJ.</p>
      <button class="btn block" onclick={demo}><Icon name="robot" size={18} />Ouvrir la démo</button>
    </div>
  </div>

  {#if hasBackups}
    <section class="panel">
      <h2>Sauvegardes automatiques</h2>
      <BackupList onrestore={() => { store.leaveHome(); store.go('equipe', 'etat'); }} />
    </section>
  {/if}

  <footer>Pas de sauvegarde serveur : exportez la campagne pour la stocker.</footer>
</div>

<style>
  .welcome { position: relative; max-width: 34rem; margin: 0 auto; padding: max(28px, env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom)); }
  .theme { position: absolute; top: max(8px, env(safe-area-inset-top)); right: 8px; }
  header { padding: 18px 0 22px; }
  .logo { display: block; height: 64px; width: auto; margin-bottom: 18px; }
  h1 { font-size: 2.1rem; font-weight: 700; line-height: 1.05; letter-spacing: 0; }
  header p { margin: 10px 0 0; color: var(--muted); max-width: 36ch; }
  h2 { font-size: 1.15rem; margin-bottom: 6px; }
  .new { border-top: 3px solid var(--amber); padding-top: 14px; }
  .resume { border-top: 3px solid var(--amber); padding-top: 14px; display: grid; gap: 8px; }
  .resume h2 { margin: 0; }
  .resume p { margin: 0 0 4px; color: var(--muted); }
  .new.sub { border-top-color: var(--line); margin-top: 12px; }
  .swap { margin: 12px 2px 0; }
  .new h2 { margin-bottom: 12px; }
  .new .hint { margin-top: 8px; }
  .others { display: grid; gap: 12px; margin-top: 12px; }
  .others .panel + .panel { margin-top: 0; }
  .opt { display: flex; flex-direction: column; }
  .opt p { margin: 0 0 12px; font-size: .9rem; color: var(--muted); flex: 1; }
  .others + .panel { margin-top: 12px; }
  footer { margin-top: 24px; font-size: .82rem; color: var(--muted); }
  @media (min-width: 560px) {
    .others { grid-template-columns: 1fr 1fr; }
    .logo { height: 84px; }
    h1 { font-size: 2.6rem; }
  }
</style>
