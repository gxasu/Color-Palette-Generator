// Material Web component imports
import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/slider/slider.js';
import '@material/web/divider/divider.js';

// Application Entry Point
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
