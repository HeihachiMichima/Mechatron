<script>
  // Top bar menu: the campaign (home, rename, export, import, new, automatic
  // backups, quit the demo) and the display theme (per device). The « Mode MJ »
  // switch sits in the top bar itself (T17).
  // Replacing the campaign asks first and offers to export it; every replacement is undoable and backed up (T04).
  import Sheet from '../components/Sheet.svelte';
  import Icon from '../components/Icon.svelte';
  import BackupList from '../components/BackupList.svelte';
  import { store, blankCampaign, VERSION, OLD_SAVE, THEME_LABEL, THEME_ICON } from '../lib/store.svelte.js';
  import { readImport, campaignFileName, NOT_MECHATRON } from '../lib/campaign.js';
  import { downloadBlob, jsonBlob } from '../lib/exports.js';

  let { pending = null } = $props();
  const cp = $derived(store.campaign);
  const nRobots = $derived(store.chars.length);
  let name = $state(store.campaign.name);
  // confirm: { kind: 'import', data } | { kind: 'new' } — a replacement waiting for « Remplacer ».
  let confirm = $state(pending ? { kind: 'import', data: pending } : null);
  let newName = $state('');
  let exported = $state(false);
  let showBackups = $state(false);
  let fileInput;

  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  function exportCampaign() {
    downloadBlob(jsonBlob(store.exportData()), campaignFileName(cp.name));
    exported = true;
    store.notify('Campagne exportée');
  }
  function rename(e) { e.preventDefault(); store.renameCampaign(name); name = store.campaign.name; }
  async function openFile(e) {
    const f = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!f) return;
    const { kind, data } = await readImport(f);
    if (kind === 'campaign') { exported = false; confirm = { kind: 'import', data }; }
    else if (kind === 'robot') { store.close(); store.openFiche(store.addChar({ ...data, id: undefined }, { label: `${data.name || 'Robot'} ajouté à vos robots` })); }
    else store.notify(kind === 'old' ? OLD_SAVE : NOT_MECHATRON);
  }
  function askNew() { exported = false; newName = ''; confirm = { kind: 'new' }; }
  function replace() {
    const c = confirm;
    confirm = null;
    store.close();
    if (c.kind === 'import') store.replaceAll(c.data, `Campagne « ${c.data.campaign.name || 'sans nom'} » importée`);
    else { store.replaceAll({ version: VERSION, campaign: blankCampaign(newName.trim()), chars: [], activeId: null }, 'Nouvelle campagne créée'); store.go('equipe', 'etat'); }
  }
</script>

<Sheet title={cp.name || 'Campagne sans nom'} subtitle={`${plural(nRobots, 'robot')}, journal : ${plural(cp.journal.length, 'entrée')}`}>
  {#if confirm}
    <div class="confirm" role="alertdialog" aria-label="Remplacer la campagne">
      {#if confirm.kind === 'import'}
        <p><b>Importer « {confirm.data.campaign.name || 'Campagne sans nom'} »</b> ({plural(confirm.data.chars.length, 'robot')}) remplace la campagne actuelle. Exporter d'abord ?</p>
      {:else}
        <p><b>Une nouvelle campagne</b> remplace la campagne actuelle. Exporter d'abord ?</p>
        <label class="field"><span>Nom de la nouvelle campagne</span><input class="input" bind:value={newName} maxlength="80" autocomplete="off" /></label>
      {/if}
      <p class="hint">Une copie de la campagne actuelle est aussi gardée dans les sauvegardes automatiques, et vous pourrez annuler juste après.</p>
      <div class="acts">
        <button class="btn small" onclick={exportCampaign}><Icon name="download" size={16} />{exported ? 'Exportée' : 'Exporter d\'abord'}</button>
        <button class="btn small ghost" onclick={() => (confirm = null)}>Annuler</button>
        <button class="btn small primary" onclick={replace}>Remplacer</button>
      </div>
    </div>
  {/if}

  <form class="rename" onsubmit={rename}>
    <label class="field"><span>Nom de la campagne</span><input class="input" bind:value={name} maxlength="80" autocomplete="off" placeholder="Campagne sans nom" /></label>
    <button class="btn" type="submit" disabled={name.trim() === cp.name}>Renommer</button>
  </form>

  <ul class="list menu">
    <li><button class="row" onclick={() => store.goHome()}><Icon name="back" /><span><b>Accueil</b><small>Reprendre, changer de campagne, importer, démo (le logo y mène aussi).</small></span></button></li>
    {#if cp.demo}<li><button class="row" onclick={() => store.quitDemo()}><Icon name="close" /><span><b>Quitter la démo</b><small>Retour à l'accueil ; la démo reste dans les sauvegardes automatiques.</small></span></button></li>{/if}
    <li><button class="row" onclick={exportCampaign}><Icon name="download" /><span><b>Exporter la campagne</b><small>Tout dans un fichier {campaignFileName(cp.name)} : robots, PNJ, niveaux, journal, combat.</small></span></button></li>
    <li><button class="row" onclick={() => fileInput.click()}><Icon name="upload" /><span><b>Importer</b><small>Une campagne (remplace celle-ci) ou un robot (ajouté à l'équipe).</small></span></button>
      <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={openFile} /></li>
    <li><button class="row" onclick={askNew}><Icon name="plus" /><span><b>Nouvelle campagne</b><small>Repartir d'une équipe vide.</small></span></button></li>
    <li><button class="row" aria-expanded={showBackups} onclick={() => (showBackups = !showBackups)}><Icon name="history" /><span><b>Restaurer une sauvegarde automatique</b><small>Les 3 dernières copies de ce navigateur.</small></span></button>
      {#if showBackups}<div class="sub"><BackupList onrestore={() => store.close()} /></div>{/if}</li>
    <li><button class="row" onclick={() => store.cycleTheme()}><Icon name={THEME_ICON[store.ui.theme]} /><span><b>{THEME_LABEL[store.ui.theme]}</b><small>Automatique, sombre ou clair : touchez pour changer.</small></span></button></li>
  </ul>
</Sheet>

<style>
  .rename { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 4px; }
  .rename .field { flex: 1; margin-bottom: 12px; }
  .rename .btn { margin-bottom: 12px; }
  .row { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 14px; padding: 8px 2px; background: none; border: 0; text-align: left; }
  .row:hover b { color: var(--amber); }
  .row > :global(svg) { flex: none; color: var(--muted); }
  .row span { display: grid; min-width: 0; }
  .row b { font-family: var(--display); font-weight: 600; font-size: 1.02rem; }
  .row small { font-size: .85rem; color: var(--muted); overflow-wrap: anywhere; }
  .sub { padding: 0 0 8px 36px; }
  .confirm { margin-bottom: 14px; padding: 12px; border-left: 3px solid var(--amber); background: var(--abyss); }
  .confirm p { margin: 0 0 8px; }
  .confirm .field { margin-bottom: 8px; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 8px; }
</style>
