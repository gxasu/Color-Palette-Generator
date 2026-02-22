// Main Application Entry Point
import { loadFromLocalStorage, createPalette, getState } from './state.js';
import { initUI } from './ui.js';

function init() {
  const loaded = loadFromLocalStorage();
  if (!loaded || getState().palettes.length === 0) {
    createPalette('#6366f1');
  }
  initUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
