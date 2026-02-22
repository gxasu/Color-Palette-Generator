// Figma JSON Import/Export – DTCG (Design Token Community Group) format
import { hexToOklch } from './color-utils.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Export palettes to Figma Variables JSON (DTCG) format.
// Exports one mode at a time – Figma expects a separate file per mode.
export function exportToFigmaJson(palettes, modeName = 'light') {
  const output = {};

  palettes.forEach((palette) => {
    const mode =
      palette.modes.find((m) => m.name === modeName) || palette.modes[0];
    const paletteObj = {};

    mode.colors.forEach((color, i) => {
      const step = String((i + 1) * 10);
      const hex = color.hex.toUpperCase();
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const stepObj = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [r, g, b],
          alpha: 1,
          hex,
        },
        $extensions: {
          'com.figma.scopes': ['ALL_SCOPES'],
          'com.figma.isOverride': true,
        },
      };

      if (i === palette.baseColorIndex) {
        stepObj.$description = 'Base Color';
      }

      paletteObj[step] = stepObj;
    });

    output[palette.name] = paletteObj;
  });

  output.$extensions = {
    'com.figma.modeName': modeName,
  };

  return JSON.stringify(output, null, 2);
}

// Import from Figma Variables JSON (DTCG) format.
export function importFromFigmaJson(jsonString) {
  const data = JSON.parse(jsonString);

  // Detect: DTCG format has palette-name keys with step sub-keys,
  // while the old custom format has "variables" and "modes" arrays.
  if (data.variables && data.modes) {
    return importLegacyFormat(data);
  }

  const modeName =
    data.$extensions?.['com.figma.modeName'] || 'light';
  const palettes = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith('$')) return; // skip $extensions etc.
    if (typeof value !== 'object' || value === null) return;

    const steps = Object.entries(value)
      .filter(([k]) => !k.startsWith('$'))
      .sort(([a], [b]) => parseInt(a) - parseInt(b));

    if (steps.length === 0) return;

    let baseColorIndex = Math.floor(steps.length / 2);

    const colors = steps.map(([, stepData], i) => {
      const hex = stepData.$value?.hex || '#808080';
      const oklch = hexToOklch(hex);

      if (stepData.$description === 'Base Color') {
        baseColorIndex = i;
      }

      return { ...oklch, hex };
    });

    const baseColor = colors[baseColorIndex]?.hex || '#808080';
    const modeId = generateId();

    palettes.push({
      id: generateId(),
      name: key,
      baseColor,
      colorCount: colors.length,
      lightnessCurve: 0.3,
      lightBg: '#ffffff',
      darkBg: '#1a1a1a',
      baseColorIndex,
      modes: [
        {
          id: modeId,
          name: modeName,
          colors,
        },
      ],
      activeModeId: modeId,
    });
  });

  return {
    palettes,
    collectionName: null,
  };
}

// Legacy format support (old custom JSON with "variables" / "modes" arrays)
function importLegacyFormat(data) {
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
    variables.sort((a, b) => {
      const aStep = parseInt(a.name.split('/').pop()) || 0;
      const bStep = parseInt(b.name.split('/').pop()) || 0;
      return aStep - bStep;
    });

    const modes = data.modes.map((mode) => {
      const colors = variables.map((variable) => {
        const value =
          variable.values[mode.modeId] ||
          variable.values[Object.keys(variable.values)[0]];
        if (!value) return { L: 0.5, C: 0, h: 0, hex: '#808080' };

        const r = Math.round((value.r || 0) * 255);
        const g = Math.round((value.g || 0) * 255);
        const b = Math.round((value.b || 0) * 255);
        const hex =
          '#' +
          [r, g, b]
            .map((c) =>
              Math.max(0, Math.min(255, c))
                .toString(16)
                .padStart(2, '0')
            )
            .join('');
        const oklch = hexToOklch(hex);
        return { ...oklch, hex };
      });

      return {
        id: generateId(),
        name: mode.name,
        colors,
      };
    });

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
    collectionName: data.name || null,
  };
}

// Download helper
export function downloadJson(content, filename) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
