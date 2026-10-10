<script>
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { store, payEp, availableEp } from '../lib/store.svelte.js';
  import { findModule, epMax, rollPool, rollD6, overheatResult } from '../lib/rules.js';

  let { index, cid = null } = $props();
  const id = cid ?? store.c.id;
  const me = store.char(id) ?? store.c;
  const name = me.modules[index];
  const mod = findModule(name);
  const c = $derived(store.char(id) ?? store.c);
  const pool = $derived(c.kind === 'npc' && store.combat.usePool);
  const avail = $derived(availableEp(store.data, c));
  const broken = $derived((c.brokenModules || []).includes(index));
  let spend = $state(Math.min(1, availableEp(store.data, me)));
  let dice = $state(null);
  let incident = $state(null);
  let n = $state(0);

  function activate() {
    const cost = spend;
    dice = rollPool({ base: 0, prog: 0, gear: cost });
    incident = dice.some((d) => d.v === 1) ? rollD6() : null;
    const o = incident ? overheatResult(incident) : null;
    const extra = incident === 2 ? cost : 0; // Glitch: drains twice the EP
    store.commitOn(id, `${name} activé : −${cost + extra} PE${pool ? ' (réserve du MJ)' : ''}`, (s, d) => {
      payEp(d, s, cost + extra);
      if (incident === 1) s.brokenModules = [...(s.brokenModules || []), index];
      if (d.combat.active) store.log(`${s.name || 'Robot'} active ${name} (${cost} PE)${o ? ` : surchauffe, ${o.name}` : ''}`);
    });
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
  <p class="hint">Activer lance autant de dés de surchauffe que de PE dépensés. Un seul 1 suffit à provoquer un incident.</p>
  {#if broken}<p class="callout warn">Ce module est cassé : il faut le Réparer avant de l'utiliser (onglet Matériel).</p>{/if}
  <button class="btn primary block go" disabled={spend < 1 || broken || spend > avail} onclick={activate}><Icon name="bolt" />Activer pour {spend} PE</button>
  {#if avail === 0 && !dice}<p class="callout">{pool ? 'La réserve du MJ est vide (onglet Combat).' : "Plus d'énergie : rechargez dans l'onglet État."}</p>{/if}

  {#if dice}
    {#key n}
      <div class="dice">{#each dice as d, i (i)}<span class="die" class:one={d.v === 1}>{d.v}</span>{/each}</div>
    {/key}
    {#if incident}
      <div class="callout warn">
        <p class="oh"><b>Surchauffe, D6 = {incident} : {overheatResult(incident)?.name ?? 'voir la table du livre'}</b></p>
        {#if overheatResult(incident)}<p>{overheatResult(incident).effect}</p>{/if}
        {#if incident === 1}<p class="auto">Module marqué comme cassé.</p>{:else if incident === 2}<p class="auto">Le double des PE a été retiré.</p>{/if}
      </div>
    {:else}
      <p class="callout ok">Aucune surchauffe, le module fonctionne.</p>
    {/if}
  {/if}
</Sheet>

<style>
  .effect { margin: 0 0 14px; }
  .spend { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; background: var(--abyss); border-left: 3px solid var(--coolant); }
  .spend div { display: grid; }
  .spend .muted { font-size: .85rem; }
  .go { min-height: 52px; margin-top: 12px; }
  .dice { display: flex; gap: 8px; margin: 16px 0 10px; flex-wrap: wrap; }
  .die { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 7px; background: var(--die-gear); color: #f0f0f0; font-family: var(--display); font-size: 1.4rem; font-weight: 700; box-shadow: inset 0 0 0 1px #5d666b; animation: tumble .38s cubic-bezier(.3,1.4,.5,1); }
  .die.one { box-shadow: 0 0 0 3px var(--fault); }
  @keyframes tumble { from { transform: rotate(-200deg) scale(.4); opacity: 0; } }
  .callout { padding: 10px 12px; margin: 10px 0 0; border-left: 3px solid var(--line); background: var(--abyss); }
  .callout p { margin: 0; }
  .callout p.auto { margin-top: 6px; font-size: .85rem; color: var(--muted); }
  .callout p.oh { margin-bottom: 4px; color: var(--fault); }
  .callout.warn { border-color: var(--fault); }
  .callout.ok { border-color: var(--coolant); }
</style>
