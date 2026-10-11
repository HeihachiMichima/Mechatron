<script>
  import TopBar from './components/TopBar.svelte';
  import VitalsPlate from './components/VitalsPlate.svelte';
  import PcTabs from './components/PcTabs.svelte';
  import Nav from './components/Nav.svelte';
  import Toast from './components/Toast.svelte';
  import PrintSheet from './components/PrintSheet.svelte';
  import StateView from './views/StateView.svelte';
  import ProgramsView from './views/ProgramsView.svelte';
  import GearView from './views/GearView.svelte';
  import RobotView from './views/RobotView.svelte';
  import CollectiveView from './views/CollectiveView.svelte';
  import RollSheet from './sheets/RollSheet.svelte';
  import ModuleSheet from './sheets/ModuleSheet.svelte';
  import WeaponSheet from './sheets/WeaponSheet.svelte';
  import PickerSheet from './sheets/PickerSheet.svelte';
  import ExportSheet from './sheets/ExportSheet.svelte';
  import IncomingSheet from './sheets/IncomingSheet.svelte';
  import XpSheet from './sheets/XpSheet.svelte';
  import RosterSheet from './sheets/RosterSheet.svelte';
  import TemplateSheet from './sheets/TemplateSheet.svelte';
  import DamageSheet from './sheets/DamageSheet.svelte';
  import CombatantSheet from './sheets/CombatantSheet.svelte';
  import EnemyEditSheet from './sheets/EnemyEditSheet.svelte';
  import DuplicateSheet from './sheets/DuplicateSheet.svelte';
  import CombatView from './views/CombatView.svelte';
  import EmptyTeam from './components/EmptyTeam.svelte';
  import WelcomeView from './views/WelcomeView.svelte';
  import CampaignSheet from './sheets/CampaignSheet.svelte';
  import { store } from './lib/store.svelte.js';
  import { parseShareHash } from './lib/exports.js';

  const views = { combat: CombatView, etat: StateView, programmes: ProgramsView, materiel: GearView, robot: RobotView, collectif: CollectiveView };
  // The fiche views need a robot; Combat and Collectif work with an empty team.
  const needsRobot = new Set(['etat', 'programmes', 'materiel', 'robot']);
  const View = $derived(!store.c && needsRobot.has(store.ui.tab || 'etat') ? EmptyTeam : views[store.ui.tab] || StateView);
  // Sheets about one robot can't stay open once there is none.
  const robotSheets = new Set(['roll', 'module', 'damage', 'weapon', 'xp']);
  const orphan = $derived(!store.c && !!store.ui.sheet && robotSheets.has(store.ui.sheet.type));
  $effect(() => { if (orphan) store.close(); });
  const sheet = $derived(orphan ? null : store.ui.sheet);

  $effect(() => {
    document.documentElement.dataset.theme = store.ui.theme;
    const dark = store.ui.theme === 'dark' || (store.ui.theme === 'auto' && !matchMedia('(prefers-color-scheme: light)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1b3a40' : '#f6f9f7');
  });

  async function checkHash() {
    try {
      const data = await parseShareHash();
      if (data) { store.incoming = data; store.open({ type: 'incoming' }); }
    } catch { store.notify('Ce lien de partage est incomplet ou abîmé.'); }
  }
  $effect(() => { checkHash(); window.addEventListener('hashchange', checkHash); return () => window.removeEventListener('hashchange', checkHash); });
</script>

{#if !store.started}
<WelcomeView />
{:else}
<div class="app">
  <Nav />
  <div class="main">
    <header class="head" style="--pc:{store.c?.color || 'var(--line)'}">
      <TopBar />
      <PcTabs />
      {#if store.c}<VitalsPlate />{/if}
    </header>
    <main id="contenu">
      {#key store.ui.tab}<View />{/key}
    </main>
  </div>
</div>
{/if}

{#if sheet?.type === 'roll'}{#key sheet}<RollSheet programId={sheet.programId} weapon={sheet.weapon} free={sheet.free} cid={sheet.cid} />{/key}
{:else if sheet?.type === 'module'}{#key sheet}<ModuleSheet index={sheet.index} cid={sheet.cid} />{/key}
{:else if sheet?.type === 'damage'}{#key sheet}<DamageSheet {...sheet} />{/key}
{:else if sheet?.type === 'roster'}<RosterSheet />
{:else if sheet?.type === 'templates'}<TemplateSheet mode={sheet.mode} />
{:else if sheet?.type === 'combatant'}{#key sheet}<CombatantSheet xid={sheet.xid} />{/key}
{:else if sheet?.type === 'enemyEdit'}{#key sheet}<EnemyEditSheet cid={sheet.cid} />{/key}
{:else if sheet?.type === 'duplicate'}{#key sheet}<DuplicateSheet cid={sheet.cid} />{/key}
{:else if sheet?.type === 'weapon'}{#key sheet}<WeaponSheet index={sheet.index} />{/key}
{:else if sheet?.type === 'picker'}<PickerSheet {...sheet} />
{:else if sheet?.type === 'export'}<ExportSheet />
{:else if sheet?.type === 'campaign'}{#key sheet}<CampaignSheet pending={sheet.pending} />{/key}
{:else if sheet?.type === 'xp'}<XpSheet />
{:else if sheet?.type === 'incoming' && store.incoming}<IncomingSheet />{/if}

<Toast />
<PrintSheet />

<style>
  .head { position: sticky; top: 0; z-index: 20; box-shadow: 0 6px 18px rgb(3 14 16 / .25); }
  /* No max width: on a big screen the views spread over the whole window (extra columns below). */
  main { padding: 14px 12px calc(var(--nav-h) + 28px + env(safe-area-inset-bottom)); }
  @media (min-width: 720px) { main { padding-left: 20px; padding-right: 20px; } }
  @media (min-width: 960px) {
    .main { margin-left: 96px; }
    main { padding-bottom: 40px; }
  }
  @media (min-width: 1400px) { main { padding-left: 28px; padding-right: 28px; } }
  @media print { .app, :global(.toast-zone) { display: none !important; } }
  :global(body) { min-height: 100dvh; }
</style>
