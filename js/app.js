// Material Web component imports (only components actually used in the app)
import '@material/web/button/filled-tonal-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/slider/slider.js';
import '@material/web/divider/divider.js';
import '@fontsource/roboto-condensed/700.css';

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
