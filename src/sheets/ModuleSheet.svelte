<script>
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import OverheatDice from '../components/OverheatDice.svelte';
  import { store, payEp, availableEp } from '../lib/store.svelte.js';
  import { findModule, epMax, hasSecondary } from '../lib/rules.js';
  import { rollActivation, settleActivation, actText } from '../lib/energy.js';

  let { index, cid = null } = $props();
  const id = cid ?? store.c.id;
  const me = store.char(id) ?? store.c;
  const name = me.modules[index];
  const mod = findModule(name);
  const c = $derived(store.char(id) ?? store.c);
  const pool = $derived(c.kind === 'npc' && store.combat.usePool);
  const avail = $derived(availableEp(store.data, c));
  const broken = $derived((c.brokenModules || []).includes(index));
  const saver = $derived(hasSecondary(c, "Économiseur d'énergie"));
  let spend = $state(Math.min(1, availableEp(store.data, me)));
  let act = $state(null);
  let n = $state(0);

  function activate() {
    const a = rollActivation(c, spend);
    store.commitOn(id, `${name} : −${a.cost} PE${pool ? ' (réserve du MJ)' : ''}`, (s, d) => {
      settleActivation(d, s, index, a, payEp);
      if (d.combat.active) store.log(`${s.name || 'Robot'} active ${actText(name, a)}`);
    });
    act = a;
    n++;
  }
</script>

<Sheet title={name} subtitle={[mod?.cost, mod?.tag === 'R' ? 'réactif' : mod?.tag === 'E' ? 'amélioration' : ''].filter(Boolean).join(', ')}>
  <p class="effect">{mod?.effect ?? 'Effet non renseigné.'}</p>
  <div class="spend">
    <div>
      <b>PE à dépenser</b>
      <span class="muted">{pool ? `réserve du MJ : ${avail}` : `disponibles : ${avail}/${epMax(c)}`}</span>
    </div>
    <Stepper value={spend} min={avail > 0 ? 1 : 0} max={avail} label="PE à dépenser" onchange={(v) => (spend = v)} />
  </div>
  <p class="hint">Activer lance autant de dés de surchauffe que de PE dépensés{saver ? ' (+1 : Économiseur d\'énergie, un 6 retire 1 PE du coût)' : ''}. Un seul 1 suffit à provoquer un incident.</p>
  {#if broken}<p class="callout warn">Ce module est cassé : il faut le Réparer avant de l'utiliser (onglet Matériel).</p>{/if}
  <button class="btn primary block go" disabled={spend < 1 || broken || spend > avail} onclick={activate}><Icon name="bolt" />Activer pour {spend} PE</button>
  {#if avail === 0 && !act}<p class="callout">{pool ? 'La réserve du MJ est vide (espace Combat).' : "Plus d'énergie : rechargez dans l'onglet État."}</p>{/if}
  {#if act}{#key n}<div class="res"><OverheatDice {act} /></div>{/key}{/if}
</Sheet>

<style>
  .effect { margin: 0 0 14px; }
  .spend { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; background: var(--abyss); border-left: 3px solid var(--coolant); }
  .spend div { display: grid; }
  .spend .muted { font-size: .85rem; }
  .go { min-height: 52px; margin-top: 12px; }
  .res { margin-top: 14px; }
  .callout { padding: 10px 12px; margin: 10px 0 0; border-left: 3px solid var(--line); background: var(--abyss); }
  .callout.warn { border-color: var(--fault); }
</style>
