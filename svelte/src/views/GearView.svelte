<script>
  import Icon from '../components/Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { chassis, findModule, findWeapon, findEquipment, modelOf } from '../lib/rules.js';
  import { moduleItems, weaponItems, equipmentItems } from '../lib/pickers.js';

  const c = $derived(store.c);
  const ch = $derived(chassis(c));
  const m = $derived(modelOf(c));
  const filled = $derived(c.modules.filter((x) => x).length);
  const rows = $derived(Array.from({ length: Math.max(ch.slots, c.modules.length) }, (_, i) => c.modules[i] || ''));
  const tagLabel = (t) => (t === 'R' ? 'Réactif' : t === 'E' ? 'Amélioration' : null);

  function pickModule(i) {
    store.open({
      type: 'picker', title: i < c.modules.length && c.modules[i] ? 'Remplacer le module' : 'Installer un module', items: moduleItems(), search: true, allowCustom: true,
      onpick: (name) => store.commit(`${name} installé`, (s) => { while (s.modules.length <= i) s.modules.push(''); s.modules[i] = name; })
    });
  }
  function removeModule(i) {
    const name = c.modules[i];
    store.commit(`${name || 'Emplacement'} retiré`, (s) => {
      s.brokenModules = (s.brokenModules || []).filter((x) => x !== i).map((x) => (x > i && i >= ch.slots ? x - 1 : x));
      if (i >= ch.slots) s.modules.splice(i, 1); else s.modules[i] = '';
    });
  }
  const isBroken = (i) => (c.brokenModules || []).includes(i);
  const repair = (i) => store.commit(`${c.modules[i]} réparé`, (s) => (s.brokenModules = (s.brokenModules || []).filter((x) => x !== i)));
  function addWeapon() {
    store.open({
      type: 'picker', title: 'Ajouter une arme', items: weaponItems(), search: true, allowCustom: true,
      onpick: (name) => {
        const w = findWeapon(name);
        store.commit(`${name} ajoutée`, (s) => s.weapons.push({ name, bonus: w?.bonus ?? '', degats: w?.degats ?? '', portee: w?.portee ?? '' }));
      }
    });
  }
  function addEquip() {
    store.open({
      type: 'picker', title: 'Ajouter un équipement', items: equipmentItems(), search: true, allowCustom: true,
      onpick: (name) => store.commit(`${name} ajouté`, (s) => s.equipment.push({ name, integre: false }))
    });
  }
  const rollWeapon = (i) => store.open({ type: 'roll', weapon: i });
</script>

<div class="grid">
  <section class="panel">
    <div class="panel-head">
      <h2>Modules</h2>
      <span class="meta num">{filled}/{ch.slots} emplacements</span>
    </div>
    <ul class="list">
      {#each rows as name, i (i)}
        {@const mod = findModule(name)}
        <li class="mod" class:extra={i >= ch.slots} class:broken={isBroken(i)}>
          {#if name}
            <div class="mod-head">
              <div>
                <h3>{name}</h3>
                <div class="tags">
                  {#if mod?.cost}<span class="tag ep"><Icon name="bolt" size={13} />{mod.cost}</span>{/if}
                  {#if mod && tagLabel(mod.tag)}<span class="tag">{tagLabel(mod.tag)}</span>{/if}
                  {#if i >= ch.slots}<span class="tag warn">hors emplacement</span>{/if}
                  {#if isBroken(i)}<span class="tag bad">cassé</span>{/if}
                </div>
              </div>
              {#if isBroken(i)}
                <button class="btn small" onclick={() => repair(i)} title="Après un jet de Réparation réussi">Réparé</button>
              {:else}
                <button class="btn small primary" onclick={() => store.open({ type: 'module', index: i })}><Icon name="bolt" size={16} />Activer</button>
              {/if}
            </div>
            <p class="effect">{mod?.effect ?? (mod ? 'Effet à compléter dans data.js.' : 'Module personnalisé.')}</p>
            <div class="row-actions">
              <button class="btn small ghost" onclick={() => pickModule(i)}><Icon name="edit" size={16} />Remplacer</button>
              <button class="btn small ghost" onclick={() => removeModule(i)}><Icon name="trash" size={16} />Retirer</button>
            </div>
          {:else}
            <button class="slot" onclick={() => pickModule(i)}><Icon name="plus" size={18} />Emplacement libre : installer un module</button>
          {/if}
        </li>
      {/each}
    </ul>
    <button class="btn small ghost add" onclick={() => pickModule(rows.length)}><Icon name="plus" size={18} />Emplacement supplémentaire</button>
  </section>

  <div class="col">
    <section class="panel">
      <div class="panel-head">
        <h2>Armes</h2>
        <span class="meta">touchez pour attaquer</span>
      </div>
      {#if c.weapons.length === 0}<p class="muted">Aucune arme. {m?.startingGear ? `Départ : ${m.startingGear}.` : ''}</p>{/if}
      <ul class="list">
        {#each c.weapons as w, i (i)}
          {@const ref = findWeapon(w.name)}
          <li class="weapon">
            <button class="wmain" onclick={() => rollWeapon(i)} aria-label="Attaquer avec {w.name}">
              <h3>{w.name}</h3>
              <span class="stats">
                <span><b class="num">{w.bonus !== '' && w.bonus != null ? `+${w.bonus}` : '—'}</b> bonus</span>
                <span><b class="num">{w.degats || '—'}</b> dégâts</span>
                <span><b>{w.portee || '—'}</b></span>
              </span>
              {#if ref?.note}<span class="note">{ref.note}</span>{/if}
            </button>
            <button class="icon-btn" aria-label="Modifier {w.name}" onclick={() => store.open({ type: 'weapon', index: i })}><Icon name="edit" /></button>
          </li>
        {/each}
      </ul>
      <button class="btn small add" onclick={addWeapon}><Icon name="plus" size={18} />Ajouter une arme</button>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Équipement</h2>
      </div>
      {#if c.equipment.length === 0}<p class="muted">Rien dans le compartiment de stockage.</p>{/if}
      <ul class="list">
        {#each c.equipment as e, i (i)}
          {@const ref = findEquipment(e.name)}
          <li class="equip">
            <div>
              <h3>{e.name}</h3>
              {#if ref?.note}<p class="muted">{ref.note}</p>{/if}
            </div>
            <button class="chip" aria-pressed={e.integre} onclick={() => store.commit(e.integre ? `${e.name} : transporté` : `${e.name} : intégré`, (s) => (s.equipment[i].integre = !s.equipment[i].integre))}>Intégré</button>
            <button class="icon-btn" aria-label="Retirer {e.name}" onclick={() => store.commit(`${e.name} retiré`, (s) => s.equipment.splice(i, 1))}><Icon name="trash" /></button>
          </li>
        {/each}
      </ul>
      <button class="btn small add" onclick={addEquip}><Icon name="plus" size={18} />Ajouter un équipement</button>
    </section>
  </div>
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .col > .panel + .panel { margin-top: 0; }
  .col { display: grid; gap: 12px; align-content: start; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; align-items: start; } }
  h3 { font-size: 1.05rem; }
  .mod { padding: 12px 0; }
  .mod-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .tag { display: inline-flex; align-items: center; gap: 3px; font-size: .78rem; padding: 1px 7px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .tag.ep { color: var(--coolant); }
  .tag.warn { color: var(--amber); }
  .tag.bad { color: var(--fault); }
  .mod.broken h3 { color: var(--fault); text-decoration: line-through; text-decoration-thickness: 1px; }
  .effect { margin: 8px 0 4px; font-size: .92rem; max-width: 65ch; }
  .row-actions { display: flex; gap: 4px; margin-left: -12px; }
  .slot { width: 100%; min-height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: transparent; border: 1px dashed var(--line); border-radius: 4px; color: var(--muted); text-align: left; }
  .slot:hover { border-color: var(--amber); color: var(--text); }
  .add { margin-top: 10px; }
  .weapon { display: flex; align-items: center; gap: 4px; }
  .wmain { flex: 1; display: grid; gap: 4px; text-align: left; background: none; border: 0; padding: 12px 0; }
  .wmain:hover h3 { color: var(--amber); }
  .stats { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: .88rem; color: var(--muted); }
  .stats b { color: var(--text); font-size: 1rem; }
  .note { font-size: .82rem; color: var(--muted); }
  .equip { display: flex; align-items: center; gap: 8px; padding: 10px 0; }
  .equip > div { flex: 1; }
  .equip p { margin: 2px 0 0; font-size: .85rem; }
</style>
