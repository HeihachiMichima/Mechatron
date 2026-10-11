<script>
  import Sheet from '../components/Sheet.svelte';
  import { store, normalize, ensureColor, isCurrentSave, OLD_SAVE } from '../lib/store.svelte.js';
  import { downloadBlob as dl } from '../lib/exports.js';
  import { slug, jsonBlob, downloadBlob, shareOrDownload, readJsonFile, shareUrl, toText, cardBlob } from '../lib/exports.js';

  const c = $derived(store.c);
  let preview = $state(null);
  let blob = null;
  let fileInput;
  let confirmReset = $state(false); // holds a pending table file
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  $effect(() => {
    let url;
    if (!c) return;
    const snap = JSON.parse(store.snapshot());
    cardBlob(snap).then((b) => { blob = b; url = URL.createObjectURL(b); preview = url; });
    return () => url && URL.revokeObjectURL(url);
  });

  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    store.notify(done);
  }
  async function copyLink() { copy(await shareUrl(JSON.parse(store.snapshot())), 'Lien copié'); }
  async function shareLink() {
    const url = await shareUrl(JSON.parse(store.snapshot()));
    try { await navigator.share({ title: c.name || 'Robot Mechatron', text: `Fiche de ${c.name || 'mon robot'}`, url }); } catch {}
  }
  async function saveImage() {
    const r = await shareOrDownload(blob ?? (await cardBlob(JSON.parse(store.snapshot()))), `${slug(c)}.png`, c.name || 'Robot Mechatron');
    if (r === 'downloaded') store.notify('Image enregistrée');
  }
  function saveJson() {
    downloadBlob(jsonBlob(JSON.parse(store.snapshot())), `${slug(c)}.json`);
    store.notify('Sauvegarde téléchargée');
  }
  async function openJson(e) {
    const f = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!f) return;
    try {
      const data = await readJsonFile(f);
      store.close();
      if (Array.isArray(data?.chars)) {
        const n = data.chars.length;
        store.commitAll(`${n} robot${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`, (d) => data.chars.forEach((ch) => { const c = normalize({ ...ch, id: undefined, color: '' }); d.chars.push(c); ensureColor(d.chars, d.chars[d.chars.length - 1]); }));
      } else store.addChar({ ...data, id: undefined }, { label: `${data.name || 'Robot'} ajouté à vos robots` });
    } catch {
      store.notify("Ce fichier n'est pas une sauvegarde de fiche (.json) lisible.");
    }
  }
  function print() { store.close(); setTimeout(() => window.print(), 250); }
  function saveAll() {
    const all = JSON.parse(JSON.stringify($state.snapshot(store.data)));
    dl(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }), 'mechatron-table.json');
    store.notify('Toute la table téléchargée');
  }
  function restoreAll() { tableInput.click(); }
  let tableInput;
  async function openTable(e) {
    const f = e.currentTarget.files[0]; e.currentTarget.value = '';
    if (!f) return;
    try {
      const data = await readJsonFile(f);
      if (!Array.isArray(data?.chars)) throw new Error();
      if (!isCurrentSave(data)) { store.notify(OLD_SAVE); return; }
      if (!confirmReset) { confirmReset = data; return; }
    } catch { store.notify("Ce fichier n'est pas une sauvegarde de table (.json)."); }
  }
  function confirmRestore() { const d = confirmReset; confirmReset = false; store.close(); store.replaceAll(d, 'Table restaurée'); }
</script>

<Sheet title="Exporter et partager" subtitle={c ? c.name || 'Robot sans nom' : 'Aucun robot pour l’instant'} wide>
  {#if c}
  <h3 class="sec">Partager</h3>
  <div class="opt card-opt">
    <div class="thumb">{#if preview}<img src={preview} alt="Aperçu de la carte du robot" />{/if}</div>
    <div class="txt">
      <b>Carte image</b>
      <p>Un résumé visuel en PNG, pour Discord ou un message au MJ.</p>
      <div class="acts"><button class="btn small primary" onclick={saveImage} disabled={!preview}>{canShare ? 'Partager l\'image' : 'Enregistrer l\'image'}</button></div>
    </div>
  </div>
  <div class="opt">
    <div class="txt">
      <b>Lien de partage</b>
      <p>Toute la fiche tient dans le lien. La personne qui l'ouvre peut l'importer chez elle.</p>
      <div class="acts">
        <button class="btn small" onclick={copyLink}>Copier le lien</button>
        {#if canShare}<button class="btn small" onclick={shareLink}>Partager le lien</button>{/if}
      </div>
    </div>
  </div>
  <div class="opt">
    <div class="txt">
      <b>Texte</b>
      <p>Un résumé à coller dans Discord, un forum ou vos notes.</p>
      <details><summary>Aperçu</summary><pre>{toText(c)}</pre></details>
      <div class="acts"><button class="btn small" onclick={() => copy(toText(c), 'Texte copié')}>Copier le texte</button></div>
    </div>
  </div>

  {/if}

  <h3 class="sec">Sauvegarder</h3>
  <div class="opt">
    <div class="txt">
      <b>{c ? 'Ce robot (.json)' : 'Un robot (.json)'}</b>
      <p>Tout est déjà enregistré dans ce navigateur. Le fichier sert de copie ou à donner un robot à quelqu'un. Ouvrir un fichier l'ajoute à vos robots.</p>
      <div class="acts">
        {#if c}<button class="btn small" onclick={saveJson}>Télécharger ce robot</button>{/if}
        <button class="btn small" onclick={() => fileInput.click()}>Ajouter depuis un fichier</button>
        <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={openJson} />
      </div>
    </div>
  </div>
  {#if c}
  <div class="opt">
    <div class="txt">
      <b>Fiche imprimable</b>
      <p>Une version A4 claire et complète. Choisissez « Enregistrer en PDF » dans la fenêtre d'impression pour obtenir un PDF.</p>
      <div class="acts"><button class="btn small" onclick={print}>Imprimer ou PDF</button></div>
    </div>
  </div>
  {/if}

  <div class="opt">
    <div class="txt">
      <b>Toute la table</b>
      <p>Toute la campagne (robots de l'équipe et PNJ, niveaux de développement, journal, combat en cours) dans un seul fichier, pour changer d'appareil ou faire une copie de sécurité.</p>
      <div class="acts">
        <button class="btn small" onclick={saveAll}>Télécharger la table</button>
        <button class="btn small" onclick={restoreAll}>Restaurer une table</button>
        <input type="file" accept="application/json,.json" hidden bind:this={tableInput} onchange={openTable} />
      </div>
      {#if confirmReset}
        <div class="confirm">
          <p>Remplacer toute la campagne par celle du fichier ({confirmReset.chars.length} robot{confirmReset.chars.length > 1 ? 's' : ''}) ? Annulable juste après.</p>
          <div class="acts"><button class="btn small" onclick={() => (confirmReset = false)}>Garder les miens</button><button class="btn small primary" onclick={confirmRestore}>Remplacer</button></div>
        </div>
      {/if}
    </div>
  </div>
</Sheet>

<style>
  .sec { font-size: .95rem; color: var(--muted); font-weight: 500; margin: 18px 0 4px; }
  .sec:first-child { margin-top: 0; }
  .opt { display: flex; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); }
  .sec + .opt { border-top: 0; }
  .txt { flex: 1; min-width: 0; }
  .txt b { font-family: var(--display); font-size: 1.05rem; font-weight: 600; }
  .txt p { margin: 2px 0 10px; font-size: .9rem; color: var(--muted); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .thumb { width: 96px; flex: none; aspect-ratio: 4 / 5; background: var(--abyss); border: 1px solid var(--line); }
  .thumb img { width: 100%; height: 100%; display: block; object-fit: cover; }
  details { margin: 0 0 10px; }
  summary { cursor: pointer; font-size: .9rem; color: var(--muted); min-height: 32px; }
  .confirm { margin-top: 10px; padding: 10px 12px; border-left: 3px solid var(--amber); background: var(--abyss); }
  .confirm p { color: var(--text); }
  pre { white-space: pre-wrap; font: .82rem/1.45 var(--body); background: var(--abyss); padding: 10px; margin: 6px 0 0; border: 1px solid var(--line); max-height: 200px; overflow: auto; }
</style>
