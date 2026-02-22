// Figma JSON Import/Export
import { hexToOklch, generatePalette, findBaseColorIndex, oklchToHex } from './color-utils.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Export all palettes to Figma Variables JSON format
export function exportToFigmaJson(palettes, collectionName = 'Color Palette') {
  const collection = {
    name: collectionName,
    modes: [],
    variables: [],
  };

  // Collect all unique mode names across palettes
  const allModeNames = new Set();
  palettes.forEach((p) => {
    p.modes.forEach((m) => allModeNames.add(m.name));
  });

  collection.modes = Array.from(allModeNames).map((name) => ({
    name,
    modeId: name.toLowerCase().replace(/\s+/g, '-'),
  }));

  // Create variables for each palette color
  palettes.forEach((palette) => {
    palette.modes[0].colors.forEach((_, colorIndex) => {
      const step = (colorIndex + 1) * 100;
      const variable = {
        name: `${palette.name}/${step}`,
        type: 'color',
        values: {},
      };

      collection.modes.forEach((mode) => {
        const paletteMode = palette.modes.find((m) => m.name === mode.name);
        if (paletteMode && paletteMode.colors[colorIndex]) {
          const color = paletteMode.colors[colorIndex];
          const hex = color.hex;
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          variable.values[mode.modeId] = {
            r: Math.round(r * 1000) / 1000,
            g: Math.round(g * 1000) / 1000,
            b: Math.round(b * 1000) / 1000,
            a: 1,
          };
        }
      });

      collection.variables.push(variable);
    });
  });

  return JSON.stringify(collection, null, 2);
}

// Import from Figma Variables JSON format
export function importFromFigmaJson(jsonString) {
  const data = JSON.parse(jsonString);

  if (!data.variables || !data.modes) {
    throw new Error('Invalid Figma JSON format: missing variables or modes');
  }

  // Group variables by palette name (folder)
  const paletteGroups = {};
  data.variables.forEach((variable) => {
    const parts = variable.name.split('/');
    const paletteName = parts.length > 1 ? parts[0] : 'Default';
    if (!paletteGroups[paletteName]) {
      paletteGroups[paletteName] = [];
    }
    paletteGroups[paletteName].push(variable);
  });

  const palettes = [];

  Object.entries(paletteGroups).forEach(([name, variables]) => {
    // Sort variables by their step number
    variables.sort((a, b) => {
      const aStep = parseInt(a.name.split('/').pop()) || 0;
      const bStep = parseInt(b.name.split('/').pop()) || 0;
      return aStep - bStep;
    });

    const modes = data.modes.map((mode) => {
      const colors = variables.map((variable) => {
        const value = variable.values[mode.modeId] || variable.values[Object.keys(variable.values)[0]];
        if (!value) return { L: 0.5, C: 0, h: 0, hex: '#808080' };

        const r = Math.round((value.r || 0) * 255);
        const g = Math.round((value.g || 0) * 255);
        const b = Math.round((value.b || 0) * 255);
        const hex = '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
        const oklch = hexToOklch(hex);
        return { ...oklch, hex };
      });

      return {
        id: generateId(),
        name: mode.name,
        colors,
      };
    });

    // Determine base color from middle of first mode
    const firstModeColors = modes[0]?.colors || [];
    const midIndex = Math.floor(firstModeColors.length / 2);
    const baseColor = firstModeColors[midIndex]?.hex || '#808080';

    palettes.push({
      id: generateId(),
      name,
      baseColor,
      colorCount: variables.length,
      lightnessCurve: 0.3,
      lightBg: '#ffffff',
      darkBg: '#1a1a1a',
      baseColorIndex: midIndex,
      modes,
      activeModeId: modes[0]?.id,
    });
  });

  return {
    palettes,
    collectionName: data.name || 'Imported Collection',
  };
}

// Download helper
export function downloadJson(content, filename) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
