<script>
  // One encounter of the library (T15): name, tags, map, NPCs from the book's
  // templates, surprise, GM pool, notes. Saved as you go (not an undo step).
  import Stepper from '../../components/Stepper.svelte';
  import Icon from '../../components/Icon.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { SURPRISE } from '../../lib/encounters.js';

  let { id, ondone } = $props();
  const enc = $derived(store.campaign.encounters.find((e) => e.id === id));
  const maps = $derived(store.campaign.maps);
  const groups = [...new Set(D.npcTemplates.map((t) => t.group))];
  const save = (patch) => store.saveEncounter({ ...$state.snapshot(enc), ...patch });
  const setEnemy = (i, patch) => save({ enemies: enc.enemies.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  let tagText = $state('');
  $effect(() => { if (enc) tagText = enc.tags.join(', '); });
</script>

{#if enc}
  <div class="ed">
    <label class="field"><span>Nom</span><input class="input" value={enc.name} oninput={(e) => save({ name: e.currentTarget.value })} placeholder="Sans nom" /></label>
    <label class="field"><span>Mots-clés (séparés par des virgules)</span><input class="input" value={tagText} onchange={(e) => save({ tags: e.currentTarget.value })} placeholder="embuscade, nuit" /></label>
    <label class="field"><span>Carte</span>
      <select class="input" value={enc.mapId ?? ''} onchange={(e) => save({ mapId: e.currentTarget.value || null })}>
        <option value="">Sans carte</option>
        {#each maps as m (m.id)}<option value={m.id}>{m.name || 'Sans nom'} ({m.w} × {m.h})</option>{/each}
      </select>
    </label>

    <span class="lbl">PNJ</span>
    <ul class="list foes">
      {#each enc.enemies as e, i (i)}
        <li>
          <select class="input tpl" aria-label="Modèle {i + 1}" value={e.template} onchange={(ev) => setEnemy(i, { template: ev.currentTarget.value })}>
            {#each groups as g (g)}<optgroup label={g}>{#each D.npcTemplates.filter((t) => t.group === g) as t (t.id)}<option value={t.id}>{t.name}</option>{/each}</optgroup>{/each}
          </select>
          <Stepper value={e.count} min={1} max={12} label="nombre de {D.npcTemplates.find((t) => t.id === e.template)?.name}" onchange={(v) => setEnemy(i, { count: v })} size="sm" />
          <div class="chips">
            <button class="chip" aria-pressed={e.side === 'enemy'} onclick={() => setEnemy(i, { side: 'enemy' })}>Adversaire</button>
            <button class="chip" aria-pressed={e.side === 'ally'} onclick={() => setEnemy(i, { side: 'ally' })}>Allié</button>
          </div>
          <button class="icon-btn" aria-label="Retirer" onclick={() => save({ enemies: enc.enemies.filter((_, j) => j !== i) })}><Icon name="close" /></button>
        </li>
      {/each}
    </ul>
    <button class="btn small add" onclick={() => save({ enemies: [...enc.enemies, { template: 'guard', count: 1, side: 'enemy' }] })}><Icon name="plus" size={16} />Ajouter des PNJ</button>

    <span class="lbl">Surprise (+2 à l'initiative pendant tout le combat, p.83)</span>
    <div class="chips">
      {#each SURPRISE as s (s.id)}<button class="chip" aria-pressed={enc.surprise === s.id} onclick={() => save({ surprise: s.id })}>{s.id === 'none' ? 'Personne' : s.id === 'allies' ? "L'équipe" : 'Les adversaires'}</button>{/each}
    </div>

    <label class="field pool"><span>Réserve du MJ (PE), vide = ration × nombre de PJ</span>
      <input class="input num" type="number" min="0" max="200" value={enc.gmPool ?? ''} onchange={(e) => save({ gmPool: e.currentTarget.value })} placeholder="auto" />
    </label>
    <label class="field"><span>Notes</span><textarea class="input notes" value={enc.notes} oninput={(e) => save({ notes: e.currentTarget.value })}></textarea></label>
    {#if ondone}<div class="end"><button class="btn primary" onclick={ondone}>Terminé</button></div>{/if}
  </div>
{/if}

<style>
  .ed { display: grid; gap: 4px; }
  .lbl { font-size: .85rem; color: var(--muted); margin-top: 6px; }
  .foes li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 0; }
  .tpl { flex: 1 1 200px; width: auto; }
  .add { justify-self: start; margin: 4px 0 8px; }
  .pool .input { width: 120px; }
  .notes { min-height: 80px; }
  .end { display: flex; justify-content: flex-end; }
</style>
