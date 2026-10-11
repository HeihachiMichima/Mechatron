import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { setRng } from './lib/rng.js';

// Test hook (harmless in production): window.__mechatron.setRng(42) makes the dice reproducible.
window.__mechatron = { setRng };

mount(App, { target: document.getElementById('app') });

// Home-screen install (T16): the manifest and icons sit next to index.html on the
// site. Linked only when served over http(s): opened by double-click (file://)
// the browser would refuse to read it and log an error.
if (/^https?:$/.test(location.protocol)) {
  const link = Object.assign(document.createElement('link'), { rel: 'manifest', href: 'manifest.webmanifest' });
  document.head.append(link);
}
