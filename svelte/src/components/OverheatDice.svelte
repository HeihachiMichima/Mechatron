<script>
  // Shows one module activation: the overheating dice and what happened.
  let { act, name = '', compact = false } = $props();
</script>

{#if act}
  <div class="oh" class:compact class:bad={act.incident} class:fail={!act.works}>
    <div class="row">
      {#if name}<b>{name}</b>{/if}
      <span class="dice">{#each act.dice as v, i (i)}<span class="die" class:one={v === 1} class:six={act.saver && v === 6}>{v}</span>{/each}</span>
      <span class="cost num">−{act.cost} PE</span>
    </div>
    {#if act.incident}
      <p><b>Surchauffe, D6 = {act.incident} : {act.oh?.name}</b>{#if !compact} {act.oh?.effect}{/if}</p>
      {#if act.incident === 1}<p class="auto">Module marqué comme cassé, sans effet.</p>
      {:else if act.incident === 2}<p class="auto">Le double des PE a été retiré.</p>
      {:else if act.incident === 6}<p class="auto">Chaque PE compte double : effet de {act.effective}.</p>
      {:else if !act.works}<p class="auto">L'action est sans effet.</p>{/if}
    {:else}
      <p class="auto">Pas de surchauffe{act.saver && act.cost < act.ep ? ', Économiseur d\'énergie : 1 PE de moins' : ''}.</p>
    {/if}
  </div>
{/if}

<style>
  .oh { padding: 8px 10px; border-left: 3px solid var(--coolant); background: var(--abyss); display: grid; gap: 4px; }
  .oh.bad { border-color: var(--fault); }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .row b { font-family: var(--display); }
  .dice { display: flex; gap: 4px; flex-wrap: wrap; }
  .die { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 5px; background: var(--die-gear); color: #f0f0f0; font-family: var(--display); font-weight: 700; font-size: .95rem; box-shadow: inset 0 0 0 1px #5d666b; }
  .die.one { box-shadow: 0 0 0 2px var(--fault); }
  .die.six { box-shadow: 0 0 0 2px var(--amber); }
  .cost { margin-left: auto; color: var(--coolant); font-weight: 700; }
  p { margin: 0; font-size: .88rem; }
  .bad p b { color: var(--fault); }
  .auto { color: var(--muted); font-size: .82rem; }
</style>
