// UI Rendering and Interaction
import {
  getState,
  subscribe,
  createPalette,
  createAlphaPalette,
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
  getSelectedPalette,
  setBackgroundPreview,
  importPalettes,
  replaceAllPalettes,
  updateStepName,
  updateColorLightness,
  updateColorAlpha,
} from './state.js';

import {
  hexToOklch,
  oklchToHex,
  hexToRgb255,
  contrastRatio,
  findBaseColorIndex,
} from './color-utils.js';

import { renderLightnessChart, makeChartInteractive } from './chart.js';
import { exportToFigmaJson, importFromFigmaJson, downloadJson } from './import-export.js';

let resizeObserver = null;
let chartCleanup = null;
let sliderDragging = false;
let chartDragging = false;

// Focus restoration targets for keyboard navigation
let pendingFocusPaletteId = null;
let pendingFocusModeId = null;

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

  document.getElementById('add-alpha-palette-btn').addEventListener('click', () => {
    createAlphaPalette();
  });

  document.getElementById('theme-select').addEventListener('change', (e) => {
    setTheme(e.target.value);
    applyTheme(e.target.value);
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    const state = getState();
    if (state.palettes.length === 0) return;
    const json = exportToFigmaJson(state.palettes);
    const base = state.collectionName.replace(/\s+/g, '-').toLowerCase();
    downloadJson(json, `${base}.json`);
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
        showSnackbar(`${result.palettes.length}件のパレットをインポートしました`, 'success');
      } catch (err) {
        showSnackbar('インポートに失敗しました: ' + err.message, 'error');
      }
    };
    reader.onerror = () => {
      showSnackbar('ファイルの読み込みに失敗しました', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('collection-name').addEventListener('change', (e) => {
    setCollectionName(e.target.value);
  });
}

// ===== Snackbar (M3) =====
function showSnackbar(message, type = 'info') {
  const existing = document.querySelector('.snackbar');
  if (existing) existing.remove();

  const snackbar = document.createElement('div');
  snackbar.className = `snackbar snackbar-${type}`;
  snackbar.setAttribute('role', 'status');
  snackbar.setAttribute('aria-live', 'polite');
  snackbar.textContent = message;
  document.body.appendChild(snackbar);

  requestAnimationFrame(() => snackbar.classList.add('snackbar-visible'));

  setTimeout(() => {
    snackbar.classList.remove('snackbar-visible');
    setTimeout(() => snackbar.remove(), 300);
  }, 4000);
}

function render(state) {
  renderPaletteCards(state);

  if (chartDragging) {
    // During chart drag, only update visuals without rebuilding DOM
    updateCenterPanelVisuals(state);
  } else {
    renderCenterPanel(state);
  }

  if (!sliderDragging && !chartDragging) {
    renderRightPanel(state);
  }
  document.getElementById('theme-select').value = state.theme;
  document.getElementById('collection-name').value = state.collectionName;

  // Disable export when no palettes (V23)
  const exportBtn = document.getElementById('export-btn');
  if (state.palettes.length === 0) {
    exportBtn.setAttribute('disabled', '');
  } else {
    exportBtn.removeAttribute('disabled');
  }
}

// Lightweight update during chart drag – no DOM rebuild
function updateCenterPanelVisuals(state) {
  const palette = getSelectedPalette();
  if (!palette) return;

  const activeMode = palette.modes.find((m) => m.id === palette.activeModeId) || palette.modes[0];
  const colors = activeMode ? activeMode.colors : [];
  const stepNames = palette.stepNames || colors.map((_, i) => String((i + 1) * 100));
  const isAlpha = palette.paletteType === 'alpha';
  const valueKey = isAlpha ? 'alpha' : 'L';

  // Re-draw chart canvas without replacing it
  const canvas = document.getElementById('lightness-chart');
  if (canvas) {
    renderLightnessChart(canvas, colors, palette.baseColorIndex, stepNames, { valueKey });
  }

  // Update swatch backgrounds and hex values in place
  const swatchEls = document.querySelectorAll('#color-swatches .color-swatch');
  swatchEls.forEach((el, i) => {
    if (i >= colors.length) return;
    const color = colors[i];
    const alpha = color.alpha !== undefined ? color.alpha : 1;
    const textColor = isAlpha
      ? (alpha > 0.5 ? (hexToOklch(color.hex).L > 0.6 ? '#000' : '#fff') : '#333')
      : (color.L > 0.6 ? '#000000' : '#ffffff');

    const swatchColor = el.querySelector('.swatch-color');
    if (swatchColor) {
      if (isAlpha) {
        const overlay = swatchColor.querySelector('.swatch-alpha-overlay');
        if (overlay) overlay.style.background = hexToRgba(color.hex, alpha);
        const alphaBadge = swatchColor.querySelector('.swatch-alpha-badge');
        if (alphaBadge) alphaBadge.textContent = Math.round(alpha * 100) + '%';
      } else {
        swatchColor.style.background = color.hex;
      }
      swatchColor.style.color = textColor;
    }

    const stepInput = el.querySelector('.swatch-step-input');
    if (stepInput) stepInput.style.color = textColor;

    const hexCode = el.querySelector('.swatch-hex');
    if (hexCode) {
      hexCode.textContent = isAlpha ? `${color.hex} · ${Math.round(alpha * 100)}%` : color.hex;
    }
  });

  // Update contrast table rows
  const rows = document.querySelectorAll('#contrast-tbody tr');
  rows.forEach((row, i) => {
    if (i >= colors.length) return;
    const color = colors[i];
    const alpha = color.alpha !== undefined ? color.alpha : 1;

    const chip = row.querySelector('.contrast-color-chip');
    if (chip) {
      if (isAlpha) {
        const overlay = chip.querySelector('.contrast-chip-overlay');
        if (overlay) overlay.style.background = hexToRgba(color.hex, alpha);
      } else {
        chip.style.background = color.hex;
      }
    }

    const codes = row.querySelectorAll('code');
    if (codes[0]) codes[0].textContent = color.hex;
    if (codes[1]) {
      codes[1].textContent = isAlpha
        ? `alpha: ${Math.round(alpha * 100)}%`
        : `oklch(${color.L.toFixed(3)} ${color.C.toFixed(3)} ${color.h.toFixed(1)})`;
    }

    const lightCR = contrastRatio(color.hex, palette.lightBg);
    const darkCR = contrastRatio(color.hex, palette.darkBg);
    const badges = row.querySelectorAll('.contrast-badge');
    if (badges[0]) {
      badges[0].textContent = lightCR.toFixed(2);
      badges[0].className = `contrast-badge ${getContrastLevel(lightCR)}`;
    }
    if (badges[1]) {
      badges[1].textContent = darkCR.toFixed(2);
      badges[1].className = `contrast-badge ${getContrastLevel(darkCR)}`;
    }
  });
}

// ===== Left Panel: Palette List =====
function renderPaletteCards(state) {
  const container = document.getElementById('palette-cards');
  container.innerHTML = '';

  state.palettes.forEach((palette, index) => {
    const isSelected = palette.id === state.selectedPaletteId;
    const card = document.createElement('div');
    card.className = `palette-card ${isSelected ? 'selected' : ''}`;
    card.dataset.paletteId = palette.id;

    // ARIA: listbox option pattern with roving tabindex
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', String(isSelected));
    card.setAttribute('tabindex', isSelected ? '0' : '-1');

    card.addEventListener('click', () => selectPalette(palette.id));

    // Keyboard navigation (roving tabindex in listbox)
    card.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('card-name-input')) return;
      const palettes = state.palettes;
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          if (index < palettes.length - 1) {
            pendingFocusPaletteId = palettes[index + 1].id;
            selectPalette(pendingFocusPaletteId);
          }
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          if (index > 0) {
            pendingFocusPaletteId = palettes[index - 1].id;
            selectPalette(pendingFocusPaletteId);
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          selectPalette(palette.id);
          break;
        case 'Delete':
          e.preventDefault();
          deletePalette(palette.id);
          break;
      }
    });

    const activeMode = palette.modes.find((m) => m.id === palette.activeModeId) || palette.modes[0];
    const colors = activeMode ? activeMode.colors : [];
    const isAlpha = palette.paletteType === 'alpha';

    const colorsHtml = colors
      .map(
        (c, i) => {
          const alpha = c.alpha !== undefined ? c.alpha : 1;
          const bgStyle = isAlpha
            ? `background:${hexToRgba(c.hex, alpha)}`
            : `background:${c.hex}`;
          return `<div class="card-color-chip" style="${bgStyle}" title="${c.hex}${isAlpha ? ' · ' + Math.round(alpha * 100) + '%' : ''}">
            ${i === palette.baseColorIndex ? '<span class="base-dot"></span>' : ''}
          </div>`;
        }
      )
      .join('');

    const typeLabel = isAlpha ? ' · Alpha' : '';
    // E15: No inline onclick handlers
    card.innerHTML = `
      <div class="card-header">
        <input class="card-name-input" value="${escapeHtml(palette.name)}" aria-label="パレット名" />
        <md-icon-button class="card-delete-btn" title="パレットを削除" aria-label="パレットを削除">
          <md-icon>close</md-icon>
        </md-icon-button>
      </div>
      <div class="card-colors${isAlpha ? ' alpha-card-colors' : ''}">${colorsHtml}</div>
      <div class="card-meta">${colors.length}色 · ${palette.modes.length}モード${typeLabel}</div>
    `;

    // E15: Use addEventListener instead of inline onclick for stopPropagation
    const nameInput = card.querySelector('.card-name-input');
    nameInput.addEventListener('click', (e) => e.stopPropagation());
    nameInput.addEventListener('change', (e) => {
      e.stopPropagation();
      updatePaletteName(palette.id, e.target.value);
    });
    nameInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') e.target.blur();
    });

    const deleteBtn = card.querySelector('.card-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePalette(palette.id);
    });

    container.appendChild(card);
  });

  // Restore focus after DOM rebuild (keyboard navigation)
  if (pendingFocusPaletteId) {
    const target = container.querySelector(`[data-palette-id="${pendingFocusPaletteId}"]`);
    if (target) target.focus();
    pendingFocusPaletteId = null;
  }
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
  const isAlpha = palette.paletteType === 'alpha';
  const chartTitle = isAlpha ? '透明度チャート' : '明度チャート';
  const infoColTitle = isAlpha ? 'Alpha' : 'OKLCH';

  container.innerHTML = `
    <div class="editor-section">
      <div class="preview-toggle-row">
        <span class="section-title" style="margin-bottom:0">カラースウォッチ</span>
        <div class="preview-bg-toggle" role="group" aria-label="背景プレビュー切り替え">
          <button class="bg-toggle-btn ${state.backgroundPreview === 'light' ? 'active' : ''}" data-bg="light"
                  aria-pressed="${state.backgroundPreview === 'light' ? 'true' : 'false'}">ライト</button>
          <button class="bg-toggle-btn ${state.backgroundPreview === 'dark' ? 'active' : ''}" data-bg="dark"
                  aria-pressed="${state.backgroundPreview === 'dark' ? 'true' : 'false'}">ダーク</button>
        </div>
      </div>
      <div class="color-swatches" id="color-swatches"
           style="background:${state.backgroundPreview === 'light' ? palette.lightBg : palette.darkBg}">
      </div>
    </div>

    <div class="editor-section">
      <span class="section-title">${chartTitle}</span>
      <div class="chart-container">
        <canvas id="lightness-chart" role="img" aria-label="${chartTitle} — ${colors.length}ステップ"></canvas>
      </div>
    </div>

    <div class="editor-section">
      <span class="section-title">コントラスト比</span>
      <div class="contrast-table-wrapper">
        <table class="contrast-table" id="contrast-table">
          <caption class="visually-hidden">各ステップのライト背景・ダーク背景に対するコントラスト比</caption>
          <thead>
            <tr>
              <th scope="col">ステップ</th>
              <th scope="col">カラー</th>
              <th scope="col">HEX</th>
              <th scope="col" class="oklch-cell">${infoColTitle}</th>
              <th scope="col">ライト背景</th>
              <th scope="col">ダーク背景</th>
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

  const stepNames = palette.stepNames || colors.map((_, i) => String((i + 1) * 100));

  renderSwatches(palette, colors, state, stepNames);
  renderContrastTable(palette, colors, stepNames);

  requestAnimationFrame(() => {
    const canvas = document.getElementById('lightness-chart');
    if (canvas) {
      const valueKey = isAlpha ? 'alpha' : 'L';
      renderLightnessChart(canvas, colors, palette.baseColorIndex, stepNames, { valueKey });
      setupChartInteractive(canvas, palette, colors, stepNames);
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

  const isAlpha = palette.paletteType === 'alpha';

  const curveSection = isAlpha ? '' : `
        <div class="setting-item">
          <label>明度カーブ</label>
          <div class="setting-control">
            <md-slider id="lightness-curve-range" min="-100" max="100" value="${Math.round(palette.lightnessCurve * 100)}" step="1" labeled></md-slider>
            <input type="number" id="lightness-curve-input" min="-100" max="100" value="${Math.round(palette.lightnessCurve * 100)}" step="1" class="number-input" />
          </div>
        </div>`;

  container.innerHTML = `
    <div class="editor-section">
      <span class="section-title">ベースカラー</span>
      <div class="base-color-row">
        <div class="color-picker-wrapper">
          <input type="color" id="base-color-picker" value="${palette.baseColor}" aria-label="ベースカラーピッカー" />
          <div class="color-preview" style="background:${palette.baseColor}"></div>
        </div>
        <input type="text" id="base-color-hex" class="hex-input" value="${palette.baseColor}"
               pattern="^#[0-9a-fA-F]{6}$" aria-label="ベースカラー HEX 値" />
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
        ${curveSection}
        <div class="setting-item">
          <label>ライト背景</label>
          <div class="bg-color-control">
            <input type="color" id="light-bg-picker" value="${palette.lightBg}" aria-label="ライト背景色ピッカー" />
            <input type="text" id="light-bg-hex" class="hex-input small" value="${palette.lightBg}" aria-label="ライト背景色 HEX 値" />
          </div>
        </div>
        <div class="setting-item">
          <label>ダーク背景</label>
          <div class="bg-color-control">
            <input type="color" id="dark-bg-picker" value="${palette.darkBg}" aria-label="ダーク背景色ピッカー" />
            <input type="text" id="dark-bg-hex" class="hex-input small" value="${palette.darkBg}" aria-label="ダーク背景色 HEX 値" />
          </div>
        </div>
      </div>
    </div>

    <md-divider></md-divider>

    <div class="editor-section" style="margin-top:20px">
      <span class="section-title">モード</span>
      <div class="modes-bar">
        <div class="mode-tabs" id="mode-tabs" role="tablist" aria-label="モード切り替え"></div>
        <button class="mode-add-btn" id="add-mode-btn" title="モードを追加" aria-label="モードを追加">+</button>
      </div>
    </div>
  `;

  bindPropertyEvents(palette);
  renderModeTabs(palette);
  renderBaseColorInfo(palette.baseColor);
}

function setupChartInteractive(canvas, palette, colors, stepNames) {
  // Cleanup previous listeners
  if (chartCleanup) chartCleanup();
  if (resizeObserver) resizeObserver.disconnect();

  const isAlpha = palette.paletteType === 'alpha';
  const valueKey = isAlpha ? 'alpha' : 'L';

  // Resize observer – get fresh colors from state
  resizeObserver = new ResizeObserver(() => {
    const p = getSelectedPalette();
    if (!p) return;
    const mode = p.modes.find((m) => m.id === p.activeModeId) || p.modes[0];
    const c = mode ? mode.colors : [];
    const sn = p.stepNames || c.map((_, i) => String((i + 1) * 100));
    const vk = p.paletteType === 'alpha' ? 'alpha' : 'L';
    renderLightnessChart(canvas, c, p.baseColorIndex, sn, { valueKey: vk });
  });
  resizeObserver.observe(canvas.parentElement);

  // Interactive drag
  chartCleanup = makeChartInteractive(
    canvas,
    colors,
    palette.baseColorIndex,
    stepNames,
    (colorIndex, newVal) => {
      if (isAlpha) {
        updateColorAlpha(palette.id, palette.activeModeId, colorIndex, newVal);
      } else {
        updateColorLightness(palette.id, palette.activeModeId, colorIndex, newVal);
      }
    },
    {
      valueKey,
      onDragStart: () => { chartDragging = true; },
      onDragEnd: () => {
        chartDragging = false;
        // Full re-render to sync everything
        render(getState());
      },
    }
  );
}

function bindPropertyEvents(palette) {
  const id = palette.id;
  const isAlpha = palette.paletteType === 'alpha';

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
    updatePaletteColorCount(id, parseInt(e.target.value, 10));
  });
  colorCountSlider.addEventListener('change', (e) => {
    sliderDragging = false;
    updatePaletteColorCount(id, parseInt(e.target.value, 10));
  });
  colorCountInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    colorCountSlider.value = val;
    updatePaletteColorCount(id, val);
  });

  // Lightness curve (md-slider) – only for non-alpha palettes
  if (!isAlpha) {
    const curveSlider = document.getElementById('lightness-curve-range');
    const curveInput = document.getElementById('lightness-curve-input');
    if (curveSlider && curveInput) {
      curveSlider.addEventListener('input', (e) => {
        sliderDragging = true;
        curveInput.value = e.target.value;
        updateLightnessCurve(id, parseInt(e.target.value, 10) / 100);
      });
      curveSlider.addEventListener('change', (e) => {
        sliderDragging = false;
        updateLightnessCurve(id, parseInt(e.target.value, 10) / 100);
      });
      curveInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        curveSlider.value = val;
        updateLightnessCurve(id, val / 100);
      });
    }
  }

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

  palette.modes.forEach((mode, index) => {
    const isActive = mode.id === palette.activeModeId;
    const tab = document.createElement('div');
    tab.className = `mode-tab ${isActive ? 'active' : ''}`;
    tab.dataset.modeId = mode.id;

    // ARIA: tab pattern with roving tabindex
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex', isActive ? '0' : '-1');

    tab.innerHTML = `
      <input class="mode-name-input" value="${escapeHtml(mode.name)}" aria-label="モード名" />
      ${palette.modes.length > 1 ? '<button class="mode-delete-btn" title="モードを削除" aria-label="モードを削除">✕</button>' : ''}
    `;

    tab.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        setActiveMode(palette.id, mode.id);
      }
    });

    // Keyboard navigation for tabs (Arrow Left/Right)
    tab.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('mode-name-input')) return;
      const modes = palette.modes;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (index < modes.length - 1) {
            pendingFocusModeId = modes[index + 1].id;
            setActiveMode(palette.id, pendingFocusModeId);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (index > 0) {
            pendingFocusModeId = modes[index - 1].id;
            setActiveMode(palette.id, pendingFocusModeId);
          }
          break;
        case 'Delete':
          e.preventDefault();
          if (palette.modes.length > 1) {
            deleteMode(palette.id, mode.id);
          }
          break;
      }
    });

    tab.querySelector('.mode-name-input').addEventListener('change', (e) => {
      updateModeName(palette.id, mode.id, e.target.value);
    });
    tab.querySelector('.mode-name-input').addEventListener('keydown', (e) => {
      e.stopPropagation();
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

  // Restore focus after DOM rebuild (keyboard navigation)
  if (pendingFocusModeId) {
    const target = tabsContainer.querySelector(`[data-mode-id="${pendingFocusModeId}"]`);
    if (target) target.focus();
    pendingFocusModeId = null;
  }
}

function renderSwatches(palette, colors, state, stepNames) {
  const container = document.getElementById('color-swatches');
  if (!container) return;

  const isAlpha = palette.paletteType === 'alpha';

  colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch ${i === palette.baseColorIndex ? 'is-base' : ''}`;

    const alpha = color.alpha !== undefined ? color.alpha : 1;
    const stepName = (stepNames && stepNames[i]) || String((i + 1) * 100);

    if (isAlpha) {
      // Alpha swatch with checkerboard
      const textColor = alpha > 0.5
        ? (hexToOklch(color.hex).L > 0.6 ? '#000' : '#fff')
        : '#333';

      swatch.innerHTML = `
        <div class="swatch-color alpha-swatch" style="color:${textColor}">
          <div class="swatch-alpha-overlay" style="background:${hexToRgba(color.hex, alpha)}">
            <input class="swatch-step-input" value="${escapeHtml(stepName)}"
                   style="color:${textColor}" aria-label="ステップ名" />
            <span class="swatch-alpha-badge" style="color:${textColor}">${Math.round(alpha * 100)}%</span>
            ${i === palette.baseColorIndex ? `<span class="swatch-base-badge" style="color:${textColor}">ベース</span>` : ''}
          </div>
        </div>
        <div class="swatch-info">
          <input type="color" class="swatch-picker" value="${color.hex}" aria-label="ステップ ${stepName} のカラーピッカー" />
          <code class="swatch-hex">${color.hex} · ${Math.round(alpha * 100)}%</code>
        </div>
      `;
    } else {
      const textColor = color.L > 0.6 ? '#000000' : '#ffffff';

      swatch.innerHTML = `
        <div class="swatch-color" style="background:${color.hex}; color:${textColor}">
          <input class="swatch-step-input" value="${escapeHtml(stepName)}"
                 style="color:${textColor}" aria-label="ステップ名" />
          ${i === palette.baseColorIndex ? '<span class="swatch-base-badge">ベース</span>' : ''}
        </div>
        <div class="swatch-info">
          <input type="color" class="swatch-picker" value="${color.hex}" aria-label="ステップ ${stepName} のカラーピッカー" />
          <code class="swatch-hex">${color.hex}</code>
        </div>
      `;
    }

    swatch.querySelector('.swatch-picker').addEventListener('input', (e) => {
      updateModeColor(palette.id, palette.activeModeId, i, e.target.value);
    });

    const stepInput = swatch.querySelector('.swatch-step-input');
    stepInput.addEventListener('change', (e) => {
      updateStepName(palette.id, i, e.target.value);
    });
    stepInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
    });

    container.appendChild(swatch);
  });
}

function renderContrastTable(palette, colors, stepNames) {
  const tbody = document.getElementById('contrast-tbody');
  if (!tbody) return;

  const isAlpha = palette.paletteType === 'alpha';

  colors.forEach((color, i) => {
    const stepName = (stepNames && stepNames[i]) || String((i + 1) * 100);
    const lightCR = contrastRatio(color.hex, palette.lightBg);
    const darkCR = contrastRatio(color.hex, palette.darkBg);
    const alpha = color.alpha !== undefined ? color.alpha : 1;

    const tr = document.createElement('tr');

    const colorChipHtml = isAlpha
      ? `<div class="contrast-color-chip alpha-chip">
           <div class="contrast-chip-overlay" style="background:${hexToRgba(color.hex, alpha)}">
             ${i === palette.baseColorIndex ? '<span class="contrast-base-dot"></span>' : ''}
           </div>
         </div>`
      : `<div class="contrast-color-chip" style="background:${color.hex}">
           ${i === palette.baseColorIndex ? '<span class="contrast-base-dot"></span>' : ''}
         </div>`;

    const infoHtml = isAlpha
      ? `<code>alpha: ${Math.round(alpha * 100)}%</code>`
      : `<code>oklch(${color.L.toFixed(3)} ${color.C.toFixed(3)} ${color.h.toFixed(1)})</code>`;

    tr.innerHTML = `
      <td class="step-cell">${escapeHtml(stepName)}</td>
      <td>${colorChipHtml}</td>
      <td><code>${color.hex}</code></td>
      <td class="oklch-cell">${infoHtml}</td>
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

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
