// Figma JSON Import/Export – DTCG (Design Token Community Group) format
// All modes are stored in a single file:
//   $value = default mode, $extensions["com.figma.mode.<name>"] = additional modes
import { hexToOklch } from './color-utils.js';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function sanitizeHex(value) {
  if (typeof value === 'string' && HEX_RE.test(value.slice(0, 7))) {
    return value.slice(0, 7);
  }
  return '#808080';
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function colorToComponents(color) {
  const hex = sanitizeHex(color.hex).toUpperCase();
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const alpha = color.alpha !== undefined ? color.alpha : 1;

  let hexStr = hex;
  if (alpha < 1) {
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    hexStr = hex + alphaHex;
  }

  return { r, g, b, alpha, hexStr };
}

// Export all palettes with all modes into a single Figma DTCG JSON file.
export function exportToFigmaJson(palettes) {
  const output = {};

  // Collect all unique mode names (first mode = default)
  const allModeNames = [];
  const modeNameSet = new Set();
  palettes.forEach((p) => {
    p.modes.forEach((m) => {
      if (!modeNameSet.has(m.name)) {
        modeNameSet.add(m.name);
        allModeNames.push(m.name);
      }
    });
  });

  const defaultModeName = allModeNames[0] || 'Default';
  const additionalModeNames = allModeNames.slice(1);

  palettes.forEach((palette) => {
    const paletteObj = {};
    const stepNames = palette.stepNames || [];

    // Get colors for the default mode
    const defaultMode =
      palette.modes.find((m) => m.name === defaultModeName) || palette.modes[0];
    const defaultColors = defaultMode ? defaultMode.colors : [];

    defaultColors.forEach((color, i) => {
      const step = stepNames[i] || String((i + 1) * 100);
      const { r, g, b, alpha, hexStr } = colorToComponents(color);

      const stepObj = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [r, g, b],
          alpha,
          hex: hexStr,
        },
        $extensions: {
          'com.figma.scopes': ['ALL_SCOPES'],
          'com.figma.isOverride': true,
        },
      };

      if (i === palette.baseColorIndex) {
        stepObj.$description = 'Base Color';
      }

      // Add additional mode values into $extensions
      additionalModeNames.forEach((modeName) => {
        const mode = palette.modes.find((m) => m.name === modeName);
        if (mode && mode.colors[i]) {
          const mc = mode.colors[i];
          const { r: mr, g: mg, b: mb, alpha: mAlpha, hexStr: mHexStr } =
            colorToComponents(mc);

          stepObj.$extensions[`com.figma.mode.${modeName}`] = {
            colorSpace: 'srgb',
            components: [mr, mg, mb],
            alpha: mAlpha,
            hex: mHexStr,
          };
        }
      });

      paletteObj[step] = stepObj;
    });

    output[palette.name] = paletteObj;
  });

  output.$extensions = {
    'com.figma.modeName': defaultModeName,
  };

  return JSON.stringify(output, null, 2);
}

// Import from Figma Variables JSON (DTCG) format.
// Reads all modes: $value = default mode, $extensions["com.figma.mode.*"] = extra modes
export function importFromFigmaJson(jsonString) {
  const data = JSON.parse(jsonString);

  // Detect legacy format
  if (data.variables && data.modes) {
    return importLegacyFormat(data);
  }

  const defaultModeName =
    data.$extensions?.['com.figma.modeName'] || 'Default';
  const palettes = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith('$')) return;
    if (typeof value !== 'object' || value === null) return;

    const steps = Object.entries(value)
      .filter(([k]) => !k.startsWith('$'))
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));

    if (steps.length === 0) return;

    // Collect all mode names from extensions across all steps
    const modeNameSet = new Set([defaultModeName]);
    steps.forEach(([, stepData]) => {
      if (stepData.$extensions) {
        Object.keys(stepData.$extensions).forEach((k) => {
          if (k.startsWith('com.figma.mode.')) {
            modeNameSet.add(k.replace('com.figma.mode.', ''));
          }
        });
      }
    });

    const importedStepNames = steps.map(([stepKey]) => stepKey);
    let baseColorIndex = Math.floor(steps.length / 2);
    let hasAlpha = false;
    let firstHex = null;
    let allSameHex = true;

    // Build colors for each mode
    const modes = [];

    modeNameSet.forEach((modeName) => {
      const colors = steps.map(([, stepData], i) => {
        let colorValue;
        if (modeName === defaultModeName) {
          colorValue = stepData.$value;
        } else {
          colorValue =
            stepData.$extensions?.[`com.figma.mode.${modeName}`] ||
            stepData.$value;
        }

        const hex = sanitizeHex(colorValue?.hex);
        const oklch = hexToOklch(hex);
        const alpha =
          colorValue?.alpha !== undefined ? colorValue.alpha : 1;

        if (alpha < 1) hasAlpha = true;
        if (firstHex === null) firstHex = hex.toUpperCase();
        if (hex.toUpperCase() !== firstHex) allSameHex = false;

        if (stepData.$description === 'Base Color') {
          baseColorIndex = i;
        }

        return { ...oklch, hex, alpha };
      });

      modes.push({
        id: generateId(),
        name: modeName,
        colors,
      });
    });

    const paletteType = allSameHex && hasAlpha ? 'alpha' : 'oklch';
    const baseColor = modes[0]?.colors[baseColorIndex]?.hex || '#808080';

    palettes.push({
      id: generateId(),
      name: key,
      paletteType,
      baseColor,
      colorCount: steps.length,
      stepNames: importedStepNames,
      lightnessCurve: paletteType === 'alpha' ? 0 : 0.3,
      lightBg: '#ffffff',
      darkBg: '#1a1a1a',
      baseColorIndex,
      modes,
      activeModeId: modes[0]?.id,
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
      const aStep = parseInt(a.name.split('/').pop(), 10) || 0;
      const bStep = parseInt(b.name.split('/').pop(), 10) || 0;
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
        const hex = sanitizeHex(
          '#' +
          [r, g, b]
            .map((c) =>
              Math.max(0, Math.min(255, c))
                .toString(16)
                .padStart(2, '0')
            )
            .join('')
        );
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
      paletteType: 'oklch',
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
  // E17: Delay revocation to ensure browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
