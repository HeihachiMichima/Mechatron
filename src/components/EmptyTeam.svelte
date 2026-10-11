<script>
  // Shown in place of a robot's fiche when the team is empty (clean first launch,
  // or the last robot deleted). The welcome screen (T04) comes before this.
  import Icon from './Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { startWizard } from '../lib/creation.js';
</script>

<section class="panel empty">
  <Icon name="robot" size={40} />
  <h2>Créez votre premier robot</h2>
  <p>L'équipe est vide. L'assistant vous guide étape par étape, dans l'ordre du livre ; vous pouvez aussi ajouter un robot depuis un fichier (.json) ou un lien de partage.</p>
  <div class="acts">
    <button class="btn primary" onclick={() => startWizard()}><Icon name="plus" size={18} />Nouveau robot</button>
    <button class="btn" onclick={() => store.open({ type: 'export' })}>Ajouter depuis un fichier</button>
  </div>
</section>

<style>
  .empty { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 32px 18px; color: var(--muted); }
  h2 { color: var(--text); margin: 4px 0 0; }
  p { max-width: 42ch; margin: 0 0 8px; }
  .acts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
</style>
