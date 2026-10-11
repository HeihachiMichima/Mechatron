import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { setRng } from './lib/rng.js';

// Test hook (harmless in production): window.__mechatron.setRng(42) makes the dice reproducible.
window.__mechatron = { setRng };

mount(App, { target: document.getElementById('app') });
