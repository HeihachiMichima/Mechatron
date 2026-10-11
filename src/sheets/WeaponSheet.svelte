<script>
  import Sheet from '../components/Sheet.svelte';
  import { store } from '../lib/store.svelte.js';
  import { findWeapon } from '../lib/rules.js';
  import { isEnergyWeapon, weaponPower, POWER } from '../lib/energy.js';
  let { index: indexProp } = $props();
  const index = indexProp; // captured: props vanish once the sheet closes
  const w = $derived(store.c?.weapons[index]);
  const typed = (field) => (e) => store.type(store.c.id, `w${index}.${field}`, (s) => (s.weapons[index][field] = e.currentTarget.value));
  const ranges = ['Bras', 'Proche', 'Courte', 'Longue', 'Lointaine'];
  const ref = $derived(w ? findWeapon(w.name) : null);
  function remove() { const n = w.name; store.close(); store.commit(`${n} retirée`, (s) => s.weapons.splice(index, 1)); }
  function reset() { store.commit(`${w.name} : valeurs du livre`, (s) => Object.assign(s.weapons[index], { bonus: ref.bonus ?? '', degats: ref.degats, portee: ref.portee })); }
</script>

{#if w}
<Sheet title="Modifier l'arme">
  <label class="field"><span>Nom</span><input class="input" value={w.name} oninput={typed('name')} /></label>
  <div class="row">
    <label class="field"><span>Bonus</span><input class="input num" inputmode="numeric" value={w.bonus} oninput={typed('bonus')} /></label>
    <label class="field"><span>Dégâts</span><input class="input num" inputmode="numeric" value={w.degats} oninput={typed('degats')} /></label>
  </div>
  <label class="field"><span>Portée</span>
    <select class="input" value={w.portee} onchange={(e) => store.commit(`Portée : ${e.currentTarget.value}`, (s) => (s.weapons[index].portee = e.currentTarget.value))}>
      {#each ranges as r (r)}<option value={r}>{r}</option>{/each}
      {#if w.portee && !ranges.includes(w.portee)}<option value={w.portee}>{w.portee}</option>{/if}
    </select>
  </label>
  {#if ref?.note}<p class="hint">{ref.note}</p>{/if}
  {#if isEnergyWeapon(w)}
    <div class="field"><span>Source d'énergie</span>
      <div class="chips">
        {#each POWER as p (p.id)}<button class="chip" aria-pressed={weaponPower(w) === p.id} onclick={() => store.commit(`${w.name} : ${p.label}`, (s) => Object.assign(s.weapons[index], { power: p.id, empty: false, crankDue: false }))}>{p.label}</button>{/each}
      </div>
      <p class="hint">{POWER.find((p) => p.id === weaponPower(w)).hint}{weaponPower(w) === 'crank' ? ' Installer la manivelle : quelques heures et le programme Fabriquer.' : ''}</p>
      {#if weaponPower(w) === 'epack' && w.empty}<button class="btn small" onclick={() => store.commit(`${w.name} : E-pack neuf`, (s) => (s.weapons[index].empty = false))}>E-pack vide : en mettre un neuf</button>{/if}
      {#if weaponPower(w) === 'crank' && w.crankDue}<button class="btn small" onclick={() => store.commit(`${w.name} remonté`, (s) => (s.weapons[index].crankDue = false))}>Remonter la manivelle</button>{/if}
    </div>
  {/if}
  <div class="actions">
    {#if ref}<button class="btn small" onclick={reset}>Valeurs du livre</button>{/if}
    <button class="btn small danger" onclick={remove}>Retirer l'arme</button>
    <button class="btn small primary" onclick={() => store.close()}>Terminé</button>
  </div>
</Sheet>
{/if}

<style>
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .actions .primary { margin-left: auto; }
</style>
