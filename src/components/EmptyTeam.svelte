<script>
  // Shown in place of a robot's fiche when the team is empty (clean first launch,
  // or the last robot deleted). The welcome screen (T04) comes before this.
  import Icon from './Icon.svelte';
  import { store, blankCharacter } from '../lib/store.svelte.js';
  function create() { store.openFiche(store.addChar(blankCharacter('pc'), { label: 'Nouveau robot créé' }), 'robot'); }
</script>

<section class="panel empty">
  <Icon name="robot" size={40} />
  <h2>Créez votre premier robot</h2>
  <p>L'équipe est vide. Créez un robot joueur, ou ajoutez-en un depuis un fichier (.json) ou un lien de partage.</p>
  <div class="acts">
    <button class="btn primary" onclick={create}><Icon name="plus" size={18} />Nouveau robot</button>
    <button class="btn" onclick={() => store.open({ type: 'export' })}>Ajouter depuis un fichier</button>
  </div>
</section>

<style>
  .empty { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 32px 18px; color: var(--muted); }
  h2 { color: var(--text); margin: 4px 0 0; }
  p { max-width: 42ch; margin: 0 0 8px; }
  .acts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
</style>
