<script>
  // Marché space: the black market (T09 and T10 fill it). Locked while the team is being created.
  import Icon from '../components/Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  const creating = $derived(store.campaign.phase === 'creation');
</script>

<section class="panel closed">
  <Icon name="marche" size={40} />
  <h2>{creating ? 'Le marché noir est fermé' : 'Le marché noir arrive bientôt'}</h2>
  <p>{creating ? "Le marché noir ouvre une fois l'équipe créée." : 'Acheter et vendre des pièces, des armes et des modules contre des PE : prévu dans une prochaine version du compagnon.'}</p>
</section>

<style>
  .closed { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 32px 18px; color: var(--muted); }
  h2 { color: var(--text); margin: 4px 0 0; }
  p { max-width: 46ch; margin: 0; }
</style>
