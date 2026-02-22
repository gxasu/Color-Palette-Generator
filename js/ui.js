// UI Rendering and Interaction
import {
  getState,
  subscribe,
  createPalette,
  selectPalette,
  deletePalette,
  updatePaletteName,
  updatePaletteBaseColor,
  updatePaletteColorCount,
  updateLightnessCurve,
  updateLightBg,
  updateDarkBg,
  setActiveMode,
  addMode,
  deleteMode,
  updateModeName,
  updateModeColor,
  setTheme,
  setCollectionName,
  setCollectionSlug,
  getSelectedPalette,
  setBackgroundPreview,
  importPalettes,
  replaceAllPalettes,
  updatePaletteSlug,
  updateModeSlug,
} from './state.js';

import {
  hexToOklch,
  oklchToHex,
  hexToRgb255,
  contrastRatio,
  findBaseColorIndex,
} from './color-utils.js';

import { renderLightnessChart } from './chart.js';
import { exportToFigmaJson, importFromFigmaJson, downloadJson } from './import-export.js';

let resizeObserver = null;
let sliderDragging = false;

export function initUI() {
  subscribe(render);
  setupThemeToggle();
  setupGlobalEvents();
  render(getState());
}

function setupThemeToggle() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    applyTheme(getState().theme);
  });
  applyTheme(getState().theme);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function setupGlobalEvents() {
  document.getElementById('add-palette-btn').addEventListener('click', () => {
    createPalette();
  });

  document.getElementById('theme-select').addEventListener('change', (e) => {
    setTheme(e.target.value);
    applyTheme(e.target.value);
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    const state = getState();
    const slug = state.collectionSlug || 'color-palette';
    const json = exportToFigmaJson(state.palettes, slug);
    downloadJson(json, `${slug}.json`);
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importFromFigmaJson(ev.target.result);
        importPalettes(result.palettes);
        if (result.collectionName) {
          setCollectionName(result.collectionName);
        }
      } catch (err) {
        alert('インポートに失敗しました: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('collection-name').addEventListener('change', (e) => {
    setCollectionName(e.target.value);
  });

  document.getElementById('collection-slug').addEventListener('change', (e) => {
    setCollectionSlug(e.target.value);
  });
}

function render(state) {
  renderPaletteCards(state);
  renderCenterPanel(state);
  if (!sliderDragging) {
    renderRightPanel(state);
  }
  document.getElementById('theme-select').value = state.theme;
  document.getElementById('collection-name').value = state.collectionName;
  document.getElementById('collection-slug').value = state.collectionSlug || 'color-palette';
}

// ===== Left Panel: Palette List =====
function renderPaletteCards(state) {
  const container = document.getElementById('palette-cards');
  container.innerHTML = '';

  state.palettes.forEach((palette) => {
    const card = document.createElement('div');
    card.className = `palette-card ${palette.id === state.selectedPaletteId ? 'selected' : ''}`;
    card.addEventListener('click', () => selectPalette(palette.id));

    const activeMode = palette.modes.find((m) => m.id === palette.activeModeId) || palette.modes[0];
    const colors = activeMode ? activeMode.colors : [];

    const colorsHtml = colors
      .map(
        (c, i) =>
          `<div class="card-color-chip" style="background:${c.hex}" title="${c.hex}">
            ${i === palette.baseColorIndex ? '<span class="base-dot"></span>' : ''}
          </div>`
      )
      .join('');

    card.innerHTML = `
      <div class="card-header">
        <input class="card-name-input" value="${escapeHtml(palette.name)}"
               onclick="event.stopPropagation()" />
        <md-icon-button class="card-delete-btn" title="パレットを削除" onclick="event.stopPropagation()">
          <md-icon>close</md-icon>
        </md-icon-button>
      </div>
      <div class="card-colors">${colorsHtml}</div>
      <div class="card-meta">${colors.length}色 · ${palette.modes.length}モード</div>
    `;

    const nameInput = card.querySelector('.card-name-input');
    nameInput.addEventListener('change', (e) => {
      e.stopPropagation();
      updatePaletteName(palette.id, e.target.value);
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
    });

    card.querySelector('.card-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePalette(palette.id);
    });

    container.appendChild(card);
  });
}

// ===== Center Panel: Swatches, Chart, Contrast =====
function renderCenterPanel(state) {
  const container = document.getElementById('panel-center');
  const palette = getSelectedPalette();

  if (!palette) {
    container.innerHTML = `
      <div class="empty-state">
        <md-icon class="empty-icon">palette</md-icon>
        <p>パレットを選択するか、新しく作成してください。</p>
      </div>`;
    return;
  }

  const activeMode = palette.modes.find((m) => m.id === palette.activeModeId) || palette.modes[0];
  const colors = activeMode ? activeMode.colors : [];

  container.innerHTML = `
    <div class="editor-section">
      <div class="preview-toggle-row">
        <span class="section-title" style="margin-bottom:0">カラースウォッチ</span>
        <div class="preview-bg-toggle">
          <button class="bg-toggle-btn ${state.backgroundPreview === 'light' ? 'active' : ''}" data-bg="light">ライト</button>
          <button class="bg-toggle-btn ${state.backgroundPreview === 'dark' ? 'active' : ''}" data-bg="dark">ダーク</button>
        </div>
      </div>
      <div class="color-swatches" id="color-swatches"
           style="background:${state.backgroundPreview === 'light' ? palette.lightBg : palette.darkBg}">
      </div>
    </div>

    <div class="editor-section">
      <span class="section-title">明度チャート</span>
      <div class="chart-container">
        <canvas id="lightness-chart"></canvas>
      </div>
    </div>

    <div class="editor-section">
      <span class="section-title">コントラスト比</span>
      <div class="contrast-table-wrapper">
        <table class="contrast-table" id="contrast-table">
          <thead>
            <tr>
              <th>ステップ</th>
              <th>カラー</th>
              <th>HEX</th>
              <th class="oklch-cell">OKLCH</th>
              <th>ライト背景</th>
              <th>ダーク背景</th>
            </tr>
          </thead>
          <tbody id="contrast-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // Bind center-panel events
  document.querySelectorAll('.bg-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setBackgroundPreview(btn.dataset.bg);
    });
  });

  renderSwatches(palette, colors, state);
  renderContrastTable(palette, colors);

  requestAnimationFrame(() => {
    const canvas = document.getElementById('lightness-chart');
    if (canvas) {
      renderLightnessChart(canvas, colors, palette.baseColorIndex);
      setupChartResize(canvas, colors, palette.baseColorIndex);
    }
  });
}

// ===== Right Panel: Properties =====
function renderRightPanel(state) {
  const container = document.getElementById('panel-right');
  const palette = getSelectedPalette();

  if (!palette) {
    container.innerHTML = `
      <div class="empty-state">
        <md-icon class="empty-icon">tune</md-icon>
        <p>パレットを選択してください。</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="editor-section">
      <span class="section-title">エクスポートキー</span>
      <input type="text" id="palette-slug" class="md-input-compact slug-input" value="${escapeHtml(palette.slug || '')}"
             placeholder="palette-key" />
      <p class="body-small" style="margin-top:4px">JSONエクスポート時の変数名に使用されます</p>
    </div>

    <md-divider></md-divider>

    <div class="editor-section" style="margin-top:20px">
      <span class="section-title">ベースカラー</span>
      <div class="base-color-row">
        <div class="color-picker-wrapper">
          <input type="color" id="base-color-picker" value="${palette.baseColor}" />
          <div class="color-preview" style="background:${palette.baseColor}"></div>
        </div>
        <input type="text" id="base-color-hex" class="hex-input" value="${palette.baseColor}"
               pattern="^#[0-9a-fA-F]{6}$" />
      </div>
      <div class="color-info-oklch" id="base-color-info"></div>
    </div>

    <md-divider></md-divider>

    <div class="editor-section" style="margin-top:20px">
      <span class="section-title">パレット設定</span>
      <div class="settings-grid">
        <div class="setting-item">
          <label>カラー数</label>
          <div class="setting-control">
            <md-slider id="color-count-range" min="2" max="20" value="${palette.colorCount}" step="1" labeled></md-slider>
            <input type="number" id="color-count-input" min="2" max="20" value="${palette.colorCount}" class="number-input" />
          </div>
        </div>
        <div class="setting-item">
          <label>明度カーブ</label>
          <div class="setting-control">
            <md-slider id="lightness-curve-range" min="-100" max="100" value="${Math.round(palette.lightnessCurve * 100)}" step="1" labeled></md-slider>
            <input type="number" id="lightness-curve-input" min="-100" max="100" value="${Math.round(palette.lightnessCurve * 100)}" step="1" class="number-input" />
          </div>
        </div>
        <div class="setting-item">
          <label>ライト背景</label>
          <div class="bg-color-control">
            <input type="color" id="light-bg-picker" value="${palette.lightBg}" />
            <input type="text" id="light-bg-hex" class="hex-input small" value="${palette.lightBg}" />
          </div>
        </div>
        <div class="setting-item">
          <label>ダーク背景</label>
          <div class="bg-color-control">
            <input type="color" id="dark-bg-picker" value="${palette.darkBg}" />
            <input type="text" id="dark-bg-hex" class="hex-input small" value="${palette.darkBg}" />
          </div>
        </div>
      </div>
    </div>

    <md-divider></md-divider>

    <div class="editor-section" style="margin-top:20px">
      <span class="section-title">モード</span>
      <div class="modes-bar">
        <div class="mode-tabs" id="mode-tabs"></div>
        <button class="mode-add-btn" id="add-mode-btn" title="モードを追加">+</button>
      </div>
    </div>
  `;

  bindPropertyEvents(palette);
  renderModeTabs(palette);
  renderBaseColorInfo(palette.baseColor);
}

function setupChartResize(canvas, colors, baseColorIndex) {
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(() => {
    renderLightnessChart(canvas, colors, baseColorIndex);
  });
  resizeObserver.observe(canvas.parentElement);
}

function bindPropertyEvents(palette) {
  const id = palette.id;

  // Palette slug
  document.getElementById('palette-slug').addEventListener('change', (e) => {
    updatePaletteSlug(id, e.target.value);
  });

  // Base color
  document.getElementById('base-color-picker').addEventListener('input', (e) => {
    updatePaletteBaseColor(id, e.target.value);
  });
  document.getElementById('base-color-hex').addEventListener('change', (e) => {
    const val = e.target.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      updatePaletteBaseColor(id, val);
    }
  });

  // Color count (md-slider)
  const colorCountSlider = document.getElementById('color-count-range');
  const colorCountInput = document.getElementById('color-count-input');
  colorCountSlider.addEventListener('input', (e) => {
    sliderDragging = true;
    colorCountInput.value = e.target.value;
    updatePaletteColorCount(id, parseInt(e.target.value));
  });
  colorCountSlider.addEventListener('change', (e) => {
    sliderDragging = false;
    updatePaletteColorCount(id, parseInt(e.target.value));
  });
  colorCountInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    colorCountSlider.value = val;
    updatePaletteColorCount(id, val);
  });

  // Lightness curve (md-slider)
  const curveSlider = document.getElementById('lightness-curve-range');
  const curveInput = document.getElementById('lightness-curve-input');
  curveSlider.addEventListener('input', (e) => {
    sliderDragging = true;
    curveInput.value = e.target.value;
    updateLightnessCurve(id, parseInt(e.target.value) / 100);
  });
  curveSlider.addEventListener('change', (e) => {
    sliderDragging = false;
    updateLightnessCurve(id, parseInt(e.target.value) / 100);
  });
  curveInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    curveSlider.value = val;
    updateLightnessCurve(id, val / 100);
  });

  // Background colors
  document.getElementById('light-bg-picker').addEventListener('input', (e) => {
    updateLightBg(id, e.target.value);
  });
  document.getElementById('light-bg-hex').addEventListener('change', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value.trim())) updateLightBg(id, e.target.value.trim());
  });
  document.getElementById('dark-bg-picker').addEventListener('input', (e) => {
    updateDarkBg(id, e.target.value);
  });
  document.getElementById('dark-bg-hex').addEventListener('change', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value.trim())) updateDarkBg(id, e.target.value.trim());
  });

  // Add mode
  document.getElementById('add-mode-btn').addEventListener('click', () => {
    addMode(id);
  });
}

function renderModeTabs(palette) {
  const tabsContainer = document.getElementById('mode-tabs');
  tabsContainer.innerHTML = '';

  palette.modes.forEach((mode) => {
    const tab = document.createElement('div');
    tab.className = `mode-tab ${mode.id === palette.activeModeId ? 'active' : ''}`;

    tab.innerHTML = `
      <div class="mode-tab-labels">
        <input class="mode-name-input" value="${escapeHtml(mode.name)}" />
        <input class="mode-slug-input" value="${escapeHtml(mode.slug || '')}" placeholder="key" />
      </div>
      ${palette.modes.length > 1 ? '<button class="mode-delete-btn" title="モードを削除">✕</button>' : ''}
    `;

    tab.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        setActiveMode(palette.id, mode.id);
      }
    });

    tab.querySelector('.mode-name-input').addEventListener('change', (e) => {
      updateModeName(palette.id, mode.id, e.target.value);
    });
    tab.querySelector('.mode-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
    });

    tab.querySelector('.mode-slug-input').addEventListener('change', (e) => {
      updateModeSlug(palette.id, mode.id, e.target.value);
    });
    tab.querySelector('.mode-slug-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
    });

    const deleteBtn = tab.querySelector('.mode-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMode(palette.id, mode.id);
      });
    }

    tabsContainer.appendChild(tab);
  });
}

function renderSwatches(palette, colors, state) {
  const container = document.getElementById('color-swatches');
  if (!container) return;

  colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch ${i === palette.baseColorIndex ? 'is-base' : ''}`;

    const textColor = color.L > 0.6 ? '#000000' : '#ffffff';
    const step = (i + 1) * 100;

    swatch.innerHTML = `
      <div class="swatch-color" style="background:${color.hex}; color:${textColor}">
        <span class="swatch-step">${step}</span>
        ${i === palette.baseColorIndex ? '<span class="swatch-base-badge">ベース</span>' : ''}
      </div>
      <div class="swatch-info">
        <input type="color" class="swatch-picker" value="${color.hex}" />
        <code class="swatch-hex">${color.hex}</code>
      </div>
    `;

    swatch.querySelector('.swatch-picker').addEventListener('input', (e) => {
      updateModeColor(palette.id, palette.activeModeId, i, e.target.value);
    });

    container.appendChild(swatch);
  });
}

function renderContrastTable(palette, colors) {
  const tbody = document.getElementById('contrast-tbody');
  if (!tbody) return;

  colors.forEach((color, i) => {
    const step = (i + 1) * 100;
    const lightCR = contrastRatio(color.hex, palette.lightBg);
    const darkCR = contrastRatio(color.hex, palette.darkBg);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="step-cell">${step}</td>
      <td>
        <div class="contrast-color-chip" style="background:${color.hex}">
          ${i === palette.baseColorIndex ? '<span class="contrast-base-dot"></span>' : ''}
        </div>
      </td>
      <td><code>${color.hex}</code></td>
      <td class="oklch-cell"><code>oklch(${color.L.toFixed(3)} ${color.C.toFixed(3)} ${color.h.toFixed(1)})</code></td>
      <td>
        <span class="contrast-badge ${getContrastLevel(lightCR)}">${lightCR.toFixed(2)}</span>
      </td>
      <td>
        <span class="contrast-badge ${getContrastLevel(darkCR)}">${darkCR.toFixed(2)}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBaseColorInfo(hex) {
  const el = document.getElementById('base-color-info');
  if (!el) return;
  const oklch = hexToOklch(hex);
  const rgb = hexToRgb255(hex);
  el.innerHTML = `
    <span class="info-label">RGB</span> <code>${rgb.r}, ${rgb.g}, ${rgb.b}</code>
    <span class="info-label">OKLCH</span> <code>${oklch.L.toFixed(3)}, ${oklch.C.toFixed(3)}, ${oklch.h.toFixed(1)}</code>
  `;
}

function getContrastLevel(ratio) {
  if (ratio >= 7) return 'level-aaa';
  if (ratio >= 4.5) return 'level-aa';
  if (ratio >= 3) return 'level-a';
  return 'level-fail';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
