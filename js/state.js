// Application State Management
import { generatePalette, findBaseColorIndex, randomColor, getColorName, hexToOklch } from './color-utils.js';

let state = {
  palettes: [],
  selectedPaletteId: null,
  theme: 'system',
  collectionName: 'カラーパレット',
  backgroundPreview: 'light', // 'light' or 'dark' for the palette card preview
};

let listeners = [];

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify() {
  listeners.forEach((l) => l(state));
  saveToLocalStorage();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getUniqueName(baseName, existingNames) {
  if (!existingNames.includes(baseName)) return baseName;
  let counter = 2;
  while (existingNames.includes(`${baseName} ${counter}`)) counter++;
  return `${baseName} ${counter}`;
}

export function createPalette(baseHex = null) {
  const hex = baseHex || randomColor();
  const colorName = getColorName(hex);
  const existingNames = state.palettes.map((p) => p.name);
  const name = getUniqueName(colorName, existingNames);
  const id = generateId();

  const colors = generatePalette(hex, 11, 0.3);
  const baseIndex = findBaseColorIndex(colors, hex);

  const palette = {
    id,
    name,
    baseColor: hex,
    colorCount: 11,
    lightnessCurve: 0.3,
    lightBg: '#ffffff',
    darkBg: '#1a1a1a',
    baseColorIndex: baseIndex,
    modes: [
      {
        id: generateId(),
        name: 'ライト',
        colors: colors.map((c) => ({ ...c })),
      },
      {
        id: generateId(),
        name: 'ダーク',
        colors: generatePalette(hex, 11, -0.3).map((c) => ({ ...c })),
      },
    ],
    activeModeId: null,
  };
  palette.activeModeId = palette.modes[0].id;

  state = {
    ...state,
    palettes: [...state.palettes, palette],
    selectedPaletteId: id,
  };
  notify();
  return id;
}

export function selectPalette(id) {
  state = { ...state, selectedPaletteId: id };
  notify();
}

export function deletePalette(id) {
  const palettes = state.palettes.filter((p) => p.id !== id);
  let selectedPaletteId = state.selectedPaletteId;
  if (selectedPaletteId === id) {
    selectedPaletteId = palettes.length > 0 ? palettes[0].id : null;
  }
  state = { ...state, palettes, selectedPaletteId };
  notify();
}

export function updatePaletteName(id, name) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => (p.id === id ? { ...p, name } : p)),
  };
  notify();
}

export function updatePaletteBaseColor(id, hex) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== id) return p;
      const colors = generatePalette(hex, p.colorCount, p.lightnessCurve);
      const baseIndex = findBaseColorIndex(colors, hex);
      const darkColors = generatePalette(hex, p.colorCount, -Math.abs(p.lightnessCurve));
      return {
        ...p,
        baseColor: hex,
        baseColorIndex: baseIndex,
        name: p.name,
        modes: p.modes.map((m, i) => ({
          ...m,
          colors: i === 0 ? colors.map((c) => ({ ...c })) : darkColors.map((c) => ({ ...c })),
        })),
      };
    }),
  };
  notify();
}

export function updatePaletteColorCount(id, count) {
  count = Math.max(2, Math.min(20, count));
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== id) return p;
      const colors = generatePalette(p.baseColor, count, p.lightnessCurve);
      const baseIndex = findBaseColorIndex(colors, p.baseColor);
      const darkColors = generatePalette(p.baseColor, count, -Math.abs(p.lightnessCurve));
      return {
        ...p,
        colorCount: count,
        baseColorIndex: baseIndex,
        modes: p.modes.map((m, i) => ({
          ...m,
          colors: i === 0 ? colors.map((c) => ({ ...c })) : darkColors.map((c) => ({ ...c })),
        })),
      };
    }),
  };
  notify();
}

export function updateLightnessCurve(id, curve) {
  curve = Math.max(-1, Math.min(1, curve));
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== id) return p;
      const colors = generatePalette(p.baseColor, p.colorCount, curve);
      const baseIndex = findBaseColorIndex(colors, p.baseColor);
      const darkColors = generatePalette(p.baseColor, p.colorCount, -Math.abs(curve));
      return {
        ...p,
        lightnessCurve: curve,
        baseColorIndex: baseIndex,
        modes: p.modes.map((m, i) => ({
          ...m,
          colors: i === 0 ? colors.map((c) => ({ ...c })) : darkColors.map((c) => ({ ...c })),
        })),
      };
    }),
  };
  notify();
}

export function updateLightBg(id, hex) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => (p.id === id ? { ...p, lightBg: hex } : p)),
  };
  notify();
}

export function updateDarkBg(id, hex) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => (p.id === id ? { ...p, darkBg: hex } : p)),
  };
  notify();
}

export function setActiveMode(paletteId, modeId) {
  state = {
    ...state,
    palettes: state.palettes.map((p) =>
      p.id === paletteId ? { ...p, activeModeId: modeId } : p
    ),
  };
  notify();
}

export function addMode(paletteId, name = '新規モード') {
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== paletteId) return p;
      const existingNames = p.modes.map((m) => m.name);
      const uniqueName = getUniqueName(name, existingNames);
      const colors = generatePalette(p.baseColor, p.colorCount, p.lightnessCurve);
      const newMode = {
        id: generateId(),
        name: uniqueName,
        colors: colors.map((c) => ({ ...c })),
      };
      return {
        ...p,
        modes: [...p.modes, newMode],
        activeModeId: newMode.id,
      };
    }),
  };
  notify();
}

export function deleteMode(paletteId, modeId) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== paletteId || p.modes.length <= 1) return p;
      const modes = p.modes.filter((m) => m.id !== modeId);
      return {
        ...p,
        modes,
        activeModeId: p.activeModeId === modeId ? modes[0].id : p.activeModeId,
      };
    }),
  };
  notify();
}

export function updateModeName(paletteId, modeId, name) {
  state = {
    ...state,
    palettes: state.palettes.map((p) =>
      p.id === paletteId
        ? {
            ...p,
            modes: p.modes.map((m) => (m.id === modeId ? { ...m, name } : m)),
          }
        : p
    ),
  };
  notify();
}

export function updateModeColor(paletteId, modeId, colorIndex, hex) {
  const oklch = hexToOklch(hex);
  state = {
    ...state,
    palettes: state.palettes.map((p) =>
      p.id === paletteId
        ? {
            ...p,
            modes: p.modes.map((m) =>
              m.id === modeId
                ? {
                    ...m,
                    colors: m.colors.map((c, i) =>
                      i === colorIndex ? { ...oklch, hex } : c
                    ),
                  }
                : m
            ),
          }
        : p
    ),
  };
  notify();
}

export function setTheme(theme) {
  state = { ...state, theme };
  notify();
}

export function setCollectionName(name) {
  state = { ...state, collectionName: name };
  notify();
}

export function setBackgroundPreview(mode) {
  state = { ...state, backgroundPreview: mode };
  notify();
}

export function getSelectedPalette() {
  return state.palettes.find((p) => p.id === state.selectedPaletteId) || null;
}

export function importPalettes(palettes) {
  state = {
    ...state,
    palettes: [...state.palettes, ...palettes],
    selectedPaletteId: palettes.length > 0 ? palettes[0].id : state.selectedPaletteId,
  };
  notify();
}

export function replaceAllPalettes(palettes) {
  state = {
    ...state,
    palettes,
    selectedPaletteId: palettes.length > 0 ? palettes[0].id : null,
  };
  notify();
}

// Persistence
function saveToLocalStorage() {
  try {
    localStorage.setItem('color-palette-generator', JSON.stringify(state));
  } catch (e) {
    // silently fail
  }
}

export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('color-palette-generator');
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      notify();
      return true;
    }
  } catch (e) {
    // silently fail
  }
  return false;
}
