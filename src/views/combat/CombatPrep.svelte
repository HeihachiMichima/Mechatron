<script>
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import { energyRules } from '../../lib/clock.js';
  import { store, newCombatant } from '../../lib/store.svelte.js';
  import ResetAllButton from '../../components/ResetAllButton.svelte';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { chassis, armorCurrent, status } from '../../lib/rules.js';

  let { onnext } = $props();
  const cb = $derived(store.combat);
  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  const entry = (id) => cb.combatants.find((x) => x.cid === id);
  const others = $derived(cb.combatants.map((x) => ({ x, c: store.char(x.cid) })).filter((r) => r.c && r.c.kind === 'npc'));
  const spareNpcs = $derived(store.chars.filter((c) => c.kind === 'npc' && !entry(c.id)));
  let showSpare = $state(false);
  const supply = $derived(energyRules(store.campaign).ration); // the GM pool follows the same supply level (p.73)
  const pcCount = $derived(Math.max(1, cb.combatants.filter((x) => store.char(x.cid)?.kind !== 'npc').length || pcs.length));
  const ready = $derived(cb.combatants.some((x) => x.side === 'ally') && cb.combatants.some((x) => x.side === 'enemy'));
  const tplName = (c) => D.npcTemplates.find((t) => t.id === c.template)?.name;

  function togglePc(c) {
    const e = entry(c.id);
    store.commitAll(e ? `${c.name || 'Robot'} quitte le combat` : `${c.name || 'Robot'} rejoint le combat`, (d) => {
      if (e) d.combat.combatants = d.combat.combatants.filter((x) => x.cid !== c.id);
      else d.combat.combatants.push(newCombatant(c.id, 'ally'));
    });
  }
  const addNpc = (c) => store.commitAll(`${c.name || 'PNJ'} ajouté`, (d) => d.combat.combatants.push(newCombatant(c.id, 'enemy')));
  const removeX = (r) => store.commitAll(`${r.c.name || 'PNJ'} retiré du combat`, (d) => (d.combat.combatants = d.combat.combatants.filter((y) => y.id !== r.x.id)));
  const setSide = (r, side) => store.commitAll(null, (d) => (d.combat.combatants.find((y) => y.id === r.x.id).side = side));
  const setPool = (v, label) => store.commitAll(label, (d) => (d.combat.gmPool = Math.max(0, v)));
</script>

<section class="panel">
  <div class="panel-head"><h2>Équipe</h2><span class="meta">touchez pour inclure</span></div>
  <div class="avatars">
    {#each pcs as c (c.id)}
      <button class="avbtn" aria-pressed={!!entry(c.id)} onclick={() => togglePc(c)} aria-label="{c.name || 'Sans nom'} : {entry(c.id) ? 'dans le combat' : 'hors combat'}">
        <Avatar {c} selected={!!entry(c.id)} dim={!entry(c.id)} down={status(c).deactivated} />
        {#if entry(c.id)}<span class="tick"><Icon name="check" size={14} /></span>{/if}
      </button>
    {/each}
    {#if pcs.length === 0}<p class="muted">Aucun personnage joueur. Créez-en un dans l'espace Équipe.</p>{/if}
  </div>
</section>

<section class="panel">
  <div class="panel-head"><h2>Adversaires et PNJ</h2><span class="meta">{others.length}</span></div>
  {#if others.length === 0}<p class="muted">Aucun PNJ. Ajoutez des adversaires depuis les modèles du livre.</p>{/if}
  <ul class="list">
    {#each others as r (r.x.id)}
      {@const ch = chassis(r.c)}
      <li class="npc">
        <Avatar c={r.c} side={r.x.side} size={40} label={false} />
        <div class="who">
          <b>{r.c.name || 'Sans nom'}</b>
          <span class="muted">{tplName(r.c) || 'PNJ'}, armure {armorCurrent(r.c, ch)}, {r.c.weapons.map((w) => w.name).join(', ') || 'sans arme'}</span>
        </div>
        <div class="chips side">
          <button class="chip" aria-pressed={r.x.side === 'ally'} onclick={() => setSide(r, 'ally')}>Allié</button>
          <button class="chip" aria-pressed={r.x.side === 'enemy'} onclick={() => setSide(r, 'enemy')}>Ennemi</button>
        </div>
        <button class="icon-btn" aria-label="Modifier {r.c.name}" title="Modifier" onclick={() => store.open({ type: 'enemyEdit', cid: r.c.id })}><Icon name="edit" /></button>
        <button class="icon-btn" aria-label="Dupliquer {r.c.name}" title="Dupliquer" onclick={() => store.open({ type: 'duplicate', cid: r.c.id })}><Icon name="copy" /></button>
        <button class="icon-btn" aria-label="Retirer {r.c.name}" title="Retirer du combat" onclick={() => removeX(r)}><Icon name="close" /></button>
      </li>
    {/each}
  </ul>
  <div class="acts">
    <button class="btn primary" onclick={() => store.open({ type: 'templates', mode: 'combat' })}><Icon name="plus" size={18} />Depuis les modèles du livre</button>
    {#if spareNpcs.length}<button class="btn" aria-expanded={showSpare} onclick={() => (showSpare = !showSpare)}>PNJ existants ({spareNpcs.length})</button>{/if}
  </div>
  {#if showSpare}
    <div class="avatars spare">
      {#each spareNpcs as c (c.id)}
        <button class="avbtn" onclick={() => addNpc(c)} aria-label="Ajouter {c.name}"><Avatar {c} side="enemy" dim size={44} /></button>
      {/each}
    </div>
  {/if}
</section>

{#if others.length}
  <section class="panel pool">
    <div class="panel-head"><h2>Réserve du MJ</h2><span class="meta">PE des PNJ</span></div>
    <div class="pool-row">
      <span class="num pv">{cb.gmPool}</span>
      <Stepper value={cb.gmPool} min={0} max={200} label="réserve" onchange={(v) => setPool(v, null)} size="sm" />
      <button class="btn small" onclick={() => setPool(supply * pcCount, `Réserve : ${supply * pcCount} PE`)}>Remplir : {supply} × {pcCount} PJ</button>
    </div>
    <label class="toggle"><input type="checkbox" checked={cb.usePool} onchange={(e) => store.commitAll(null, (d) => (d.combat.usePool = e.currentTarget.checked))} /><span>Les PNJ paient leurs PE dans cette réserve</span></label>
  </section>
{/if}

<div class="reset"><ResetAllButton small /><span class="muted">Avant un nouveau combat : dégâts, armure, modules, PE et armes au maximum, pour tous.</span></div>

<div class="cta">
  <button class="btn primary big" disabled={!ready} onclick={onnext}>Initiative<Icon name="chevron" size={18} /></button>
  {#if !ready}<span class="muted">Il faut au moins un allié et un ennemi.</span>{/if}
</div>

<style>
  .reset { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 12px 0; }
  .reset .muted { font-size: .85rem; }
  .avatars { display: flex; flex-wrap: wrap; gap: 10px 6px; }
  .avbtn { position: relative; background: none; border: 0; padding: 4px; border-radius: 8px; }
  .avbtn:hover { background: var(--hull-2); }
  .tick { position: absolute; top: 2px; right: 8px; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: var(--amber); color: var(--amber-ink); }
  .npc { display: flex; align-items: center; gap: 10px; padding: 8px 0; flex-wrap: wrap; }
  .who { flex: 1 1 160px; min-width: 0; display: grid; }
  .who b { font-family: var(--display); font-weight: 600; }
  .who .muted { font-size: .82rem; }
  .side .chip { min-height: 32px; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .spare { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .pool-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .pv { font-size: 2rem; font-weight: 700; color: var(--coolant); }
  .toggle { display: flex; gap: 10px; align-items: center; margin-top: 10px; font-size: .9rem; cursor: pointer; }
  .toggle input { width: 20px; height: 20px; accent-color: var(--amber); }
  .cta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px; }
  .big { min-height: 52px; padding: 0 22px; font-size: 1.05rem; }
</style>
