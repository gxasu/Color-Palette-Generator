// Application State Management
import { generatePalette, findBaseColorIndex, randomColor, getColorNameEn, hexToOklch, gamutMapOklch, oklchToHex } from './color-utils.js';

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

function generateStepNames(count) {
  return Array.from({ length: count }, (_, i) => String((i + 1) * 100));
}

function generateAlphaValues(count) {
  return Array.from({ length: count }, (_, i) => {
    if (count === 1) return 1;
    const t = i / (count - 1);
    const alpha = Math.round((0.05 + t * 0.95) * 100) / 100;
    return alpha;
  });
}

function getUniqueName(baseName, existingNames) {
  if (!existingNames.includes(baseName)) return baseName;
  let counter = 2;
  while (existingNames.includes(`${baseName} ${counter}`)) counter++;
  return `${baseName} ${counter}`;
}

export function createPalette(baseHex = null) {
  const hex = baseHex || randomColor();
  const colorName = getColorNameEn(hex);
  const existingNames = state.palettes.map((p) => p.name);
  const name = getUniqueName(colorName, existingNames);
  const id = generateId();

  const colors = generatePalette(hex, 11, 0.3);
  const baseIndex = findBaseColorIndex(colors, hex);

  const modeId = generateId();
  const palette = {
    id,
    name,
    paletteType: 'oklch',
    baseColor: hex,
    colorCount: 11,
    lightnessCurve: 0.3,
    lightBg: '#ffffff',
    darkBg: '#1a1a1a',
    baseColorIndex: baseIndex,
    stepNames: generateStepNames(11),
    modes: [
      {
        id: modeId,
        name: 'Default',
        colors: colors.map((c) => ({ ...c })),
      },
    ],
    activeModeId: modeId,
  };

  state = {
    ...state,
    palettes: [...state.palettes, palette],
    selectedPaletteId: id,
  };
  notify();
  return id;
}

export function createAlphaPalette(baseHex = '#ffffff') {
  const colorName = getColorNameEn(baseHex);
  const existingNames = state.palettes.map((p) => p.name);
  const name = getUniqueName(colorName + '-alpha', existingNames);
  const id = generateId();
  const count = 11;

  const oklch = hexToOklch(baseHex);
  const alphaValues = generateAlphaValues(count);
  const colors = alphaValues.map((alpha) => ({
    L: oklch.L,
    C: oklch.C,
    h: oklch.h,
    hex: baseHex,
    alpha,
  }));

  const modeId = generateId();
  const palette = {
    id,
    name,
    paletteType: 'alpha',
    baseColor: baseHex,
    colorCount: count,
    lightnessCurve: 0,
    lightBg: '#ffffff',
    darkBg: '#1a1a1a',
    baseColorIndex: count - 1,
    stepNames: generateStepNames(count),
    modes: [
      {
        id: modeId,
        name: 'Default',
        colors,
      },
    ],
    activeModeId: modeId,
  };

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

      if (p.paletteType === 'alpha') {
        // For alpha palettes, update hex for all colors in all modes, keep alpha
        const oklch = hexToOklch(hex);
        return {
          ...p,
          baseColor: hex,
          modes: p.modes.map((m) => ({
            ...m,
            colors: m.colors.map((c) => ({
              L: oklch.L,
              C: oklch.C,
              h: oklch.h,
              hex,
              alpha: c.alpha,
            })),
          })),
        };
      }

      const colors = generatePalette(hex, p.colorCount, p.lightnessCurve);
      const baseIndex = findBaseColorIndex(colors, hex);
      return {
        ...p,
        baseColor: hex,
        baseColorIndex: baseIndex,
        name: p.name,
        modes: p.modes.map((m) => ({
          ...m,
          colors: colors.map((c) => ({ ...c })),
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

      // Preserve existing step names where possible, extend/truncate as needed
      const oldNames = p.stepNames || [];
      const stepNames = Array.from({ length: count }, (_, i) =>
        i < oldNames.length ? oldNames[i] : String((i + 1) * 100)
      );

      if (p.paletteType === 'alpha') {
        const oklch = hexToOklch(p.baseColor);
        const alphaValues = generateAlphaValues(count);
        const colors = alphaValues.map((alpha) => ({
          L: oklch.L,
          C: oklch.C,
          h: oklch.h,
          hex: p.baseColor,
          alpha,
        }));
        return {
          ...p,
          colorCount: count,
          baseColorIndex: count - 1,
          stepNames,
          modes: p.modes.map((m) => ({
            ...m,
            colors,
          })),
        };
      }

      const colors = generatePalette(p.baseColor, count, p.lightnessCurve);
      const baseIndex = findBaseColorIndex(colors, p.baseColor);
      return {
        ...p,
        colorCount: count,
        baseColorIndex: baseIndex,
        stepNames,
        modes: p.modes.map((m) => ({
          ...m,
          colors: colors.map((c) => ({ ...c })),
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
      if (p.paletteType === 'alpha') return p; // no curve for alpha palettes
      const colors = generatePalette(p.baseColor, p.colorCount, curve);
      const baseIndex = findBaseColorIndex(colors, p.baseColor);
      return {
        ...p,
        lightnessCurve: curve,
        baseColorIndex: baseIndex,
        modes: p.modes.map((m) => ({
          ...m,
          colors: colors.map((c) => ({ ...c })),
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

export function addMode(paletteId, name = 'new-mode') {
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== paletteId) return p;
      const existingNames = p.modes.map((m) => m.name);
      const uniqueName = getUniqueName(name, existingNames);

      // Copy colors from current active mode
      const activeMode = p.modes.find((m) => m.id === p.activeModeId) || p.modes[0];
      const newMode = {
        id: generateId(),
        name: uniqueName,
        colors: activeMode ? activeMode.colors.map((c) => ({ ...c })) : [],
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
                      i === colorIndex ? { ...oklch, hex, alpha: c.alpha } : c
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

export function updateStepName(paletteId, index, name) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== paletteId) return p;
      const stepNames = [...(p.stepNames || generateStepNames(p.colorCount))];
      stepNames[index] = name;
      return { ...p, stepNames };
    }),
  };
  notify();
}

export function updateColorLightness(paletteId, modeId, colorIndex, newL) {
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== paletteId) return p;
      return {
        ...p,
        modes: p.modes.map((m) => {
          if (m.id !== modeId) return m;
          return {
            ...m,
            colors: m.colors.map((c, i) => {
              if (i !== colorIndex) return c;
              const mapped = gamutMapOklch(newL, c.C, c.h);
              const hex = oklchToHex(mapped.L, mapped.C, mapped.h);
              return { L: mapped.L, C: mapped.C, h: mapped.h, hex, alpha: c.alpha };
            }),
          };
        }),
      };
    }),
  };
  notify();
}

export function updateColorAlpha(paletteId, modeId, colorIndex, newAlpha) {
  newAlpha = Math.max(0, Math.min(1, newAlpha));
  newAlpha = Math.round(newAlpha * 100) / 100;
  state = {
    ...state,
    palettes: state.palettes.map((p) => {
      if (p.id !== paletteId) return p;
      return {
        ...p,
        modes: p.modes.map((m) => {
          if (m.id !== modeId) return m;
          return {
            ...m,
            colors: m.colors.map((c, i) => {
              if (i !== colorIndex) return c;
              return { ...c, alpha: newAlpha };
            }),
          };
        }),
      };
    }),
  };
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
