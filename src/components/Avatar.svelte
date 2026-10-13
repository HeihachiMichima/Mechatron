<script>
  // Round profile badge: initials inside a ring in the robot's color.
  import { initials } from '../lib/combat.js';
  let { c, side = null, size = 52, selected = false, dim = false, down = false, current = false, label = true } = $props();
  const pcColor = $derived(c.kind !== 'npc' && !!c.color);
  const ring = $derived(pcColor ? c.color : side === 'enemy' ? 'var(--fault)' : 'var(--muted)');
  // Text on the filled (selected) disc: dark on the light player colors, else per theme.
  const ink = $derived(pcColor ? '#10181a' : 'var(--on-ring)');
</script>

<span class="av" class:selected class:dim class:down class:current style="--ring:{ring}; --ink:{ink}; --s:{size}px">
  <span class="disc"><span class="ini">{initials(c.name)}</span></span>
  {#if label}<span class="lab">{(c.name || 'Sans nom').split(' ')[0]}</span>{/if}
</span>

<style>
  .av { display: inline-grid; justify-items: center; gap: 4px; width: calc(var(--s) + 18px); }
  .disc { width: var(--s); height: var(--s); border-radius: 50%; display: grid; place-items: center; position: relative;
    background: color-mix(in srgb, var(--ring) 14%, var(--abyss)); box-shadow: inset 0 0 0 3px var(--ring); transition: transform .15s, box-shadow .15s; }
  .ini { font-family: var(--display); font-weight: 700; font-size: calc(var(--s) * .34); color: var(--text); letter-spacing: .02em; }
  .lab { font-size: .78rem; color: var(--muted); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .selected .disc { background: var(--ring); }
  .selected .ini { color: var(--ink); }
  .selected .lab { color: var(--text); font-weight: 600; }
  .dim .disc { opacity: .75; filter: grayscale(.85); }
  .dim .lab { opacity: .9; }
  .current .disc { transform: scale(1.12); box-shadow: inset 0 0 0 3px var(--ring), 0 0 0 3px var(--abyss), 0 0 0 5px var(--amber); }
  .current .lab { color: var(--amber); font-weight: 600; }
  .down .disc::after { content: ''; position: absolute; inset: 22%; background: linear-gradient(45deg, transparent 45%, var(--fault) 45% 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, var(--fault) 45% 55%, transparent 55%); }
  .down .disc { opacity: .55; }
  @media (prefers-reduced-motion: reduce) { .disc { transition: none; } }
</style>
