<script>
  // Apply a hit to any robot or creature: cover (ranged only), armor, then hit location (p.88-91).
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { chassis, shownAttrs, attrLabel, armorCurrent, resolveDamage, hasSecondary } from '../lib/rules.js';

  let { cid, amount = 1, ranged = false, ignoreArmor = false, source = '', attackerId = null } = $props();
  const id = cid ?? store.c.id;
  const c = $derived(store.char(id));
  const ch = $derived(c ? chassis(c) : null);
  let dmg = $state(amount);
  let isRanged = $state(ranged);
  let noArmor = $state(ignoreArmor);
  let location = $state('random');
  let result = $state(null);
  const attacker = attackerId ? store.char(attackerId) : null;
  const canChoose = $derived(attacker && hasSecondary(attacker, 'Anatomie robotique'));
  const covers = [{ name: 'Aucune', armor: 0 }, ...D.coverPresets];

  function apply() {
    let res;
    const name = c.name || 'Cible';
    store.commitOn(id, null, (t) => {
      res = resolveDamage(t, { amount: dmg, ranged: isRanged, coverRating: t.cover || 0, ignoreArmor: noArmor, location });
      if (isRanged && t.cover) t.cover = res.newCover;
      const cb = store.combat;
      if (res.taken > 0) cb.combatants.filter((x) => x.cid === t.id).forEach((x) => (x.overwatch = false));
      if (cb.active || cb.combatants.some((x) => x.cid === t.id)) store.log(`${source ? `${source} → ` : ''}${name}, ${dmg} dégât${dmg > 1 ? 's' : ''} : ${res.steps.join(' ; ')}`);
    });
    result = res;
    store.notify(res.taken ? `${name} : ${res.taken} dégât${res.taken > 1 ? 's' : ''} encaissé${res.taken > 1 ? 's' : ''}` : `${name} : tout est bloqué`, true);
  }
</script>

{#if c}
<Sheet title="Dégâts sur {c.name || 'la cible'}" subtitle={source || 'Couverture, armure, puis localisation'}>
  {#if !result}
    <div class="row">
      <div><b>Dégâts de l'attaque</b><span class="muted">arme + succès en plus</span></div>
      <Stepper value={dmg} min={1} max={40} label="dégâts" onchange={(v) => (dmg = v)} />
    </div>
    <div class="block">
      <span class="lbl">Type d'attaque</span>
      <div class="chips">
        <button class="chip" aria-pressed={!isRanged} onclick={() => (isRanged = false)}>Corps à corps</button>
        <button class="chip" aria-pressed={isRanged} onclick={() => (isRanged = true)}>Tir</button>
      </div>
    </div>
    {#if isRanged}
      <div class="block">
        <span class="lbl">Couverture de la cible</span>
        <div class="chips">
          {#each covers as cv (cv.name)}<button class="chip" aria-pressed={(c.cover || 0) === cv.armor} onclick={() => (store.char(id).cover = cv.armor)}>{cv.name}{cv.armor ? ` ${cv.armor}` : ''}</button>{/each}
        </div>
      </div>
    {/if}
    <div class="block">
      <label class="toggle"><input type="checkbox" bind:checked={noArmor} /><span>L'arme ignore l'armure (vibro-couteau…) <em class="muted">armure actuelle {armorCurrent(c, ch)}</em></span></label>
    </div>
    {#if c.body !== 'creature'}
      <div class="block">
        <span class="lbl">Localisation {canChoose ? '(Anatomie robotique : au choix)' : ''}</span>
        <div class="chips">
          <button class="chip" aria-pressed={location === 'random'} onclick={() => (location = 'random')}>Au hasard (D6)</button>
          {#each shownAttrs(c, ch) as a (a)}<button class="chip" aria-pressed={location === a} onclick={() => (location = a)}>{attrLabel(c, a)}</button>{/each}
          {#if c.modules.some(Boolean)}<button class="chip" aria-pressed={location === 'module'} onclick={() => (location = 'module')}>Module</button>{/if}
        </div>
      </div>
    {/if}
    <button class="btn primary block go" onclick={apply}>Appliquer {dmg} dégât{dmg > 1 ? 's' : ''}</button>
  {:else}
    {#if result.coverDice}
      <p class="lbl">Couverture</p>
      <div class="dice">{#each result.coverDice as v, i (i)}<span class="die" class:six={v === 6} class:one={v === 1}>{v}</span>{/each}</div>
    {/if}
    {#if result.armorDice}
      <p class="lbl">Armure</p>
      <div class="dice">{#each result.armorDice as v, i (i)}<span class="die" class:six={v === 6} class:one={v === 1}>{v}</span>{/each}</div>
    {/if}
    <ul class="steps">{#each result.steps as s, i (i)}<li>{s}</li>{/each}</ul>
    <div class="acts">
      <button class="btn" onclick={() => (result = null)}>Autre coup</button>
      <button class="btn primary" onclick={() => store.close()}>Terminé</button>
    </div>
  {/if}
</Sheet>
{/if}

<style>
  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; background: var(--abyss); border-left: 3px solid var(--fault); margin-bottom: 12px; }
  .row div { display: grid; }
  .row .muted { font-size: .85rem; }
  .block { margin-bottom: 12px; }
  .lbl { display: block; font-size: .85rem; color: var(--muted); margin: 0 0 6px; }
  .toggle { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
  .toggle input { width: 20px; height: 20px; accent-color: var(--amber); flex: none; }
  .toggle em { font-style: normal; font-size: .85rem; }
  .go { min-height: 52px; margin-top: 4px; }
  .dice { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .die { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 6px; background: var(--die-gear); color: #f0f0f0; font-family: var(--display); font-weight: 700; font-size: 1.2rem; box-shadow: inset 0 0 0 1px #5d666b; }
  .die.six { box-shadow: 0 0 0 3px var(--amber); }
  .die.one { box-shadow: 0 0 0 3px var(--fault); }
  .die:not(.six):not(.one) { opacity: .6; }
  .steps { margin: 4px 0 14px; padding-left: 18px; }
  .steps li { margin: 4px 0; }
  .acts { display: flex; gap: 8px; justify-content: flex-end; }
</style>
