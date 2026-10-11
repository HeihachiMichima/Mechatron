<script>
  import Sheet from '../components/Sheet.svelte';
  import { store, normalize, blankCampaign, VERSION } from '../lib/store.svelte.js';
  import { modelOf } from '../lib/rules.js';
  const data = $derived(normalize(store.incoming));
  const m = $derived(modelOf(data));
  const clearHash = () => history.replaceState(null, '', location.pathname + location.search);
  function accept() {
    const d = store.incoming; store.incoming = null; clearHash(); store.close();
    // From the welcome screen: the robot starts a new campaign.
    if (!store.started) store.start({ version: VERSION, campaign: blankCampaign(''), chars: [{ ...d, id: undefined }] }, `${d.name || 'Robot'} ajouté à une nouvelle campagne`);
    else store.openFiche(store.addChar({ ...d, id: undefined }, { label: `${d.name || 'Robot'} ajouté à vos robots` }));
  }
  function decline() { store.incoming = null; clearHash(); store.close(); }
</script>

<Sheet title="Robot partagé">
  <p>Ce lien contient la fiche de <b>{data.name || 'Robot sans nom'}</b>{m ? `, ${m.name.toLowerCase()}` : ''}.</p>
  <p class="muted">{store.started ? 'Il sera ajouté à vos robots ; vos fiches actuelles ne changent pas.' : 'Une nouvelle campagne sera créée avec ce robot.'}</p>
  <div class="acts">
    <button class="btn" onclick={decline}>Ignorer</button>
    <button class="btn primary" onclick={accept}>Ajouter à mes robots</button>
  </div>
</Sheet>

<style>
  .acts { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 12px; }
</style>
