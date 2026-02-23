// OKLCH Color Utilities
// Implements conversions: sRGB <-> Linear RGB <-> XYZ (D65) <-> OKLAB <-> OKLCH
// Also includes contrast ratio calculations per WCAG 2.1

export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

export function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const v = Math.round(Math.max(0, Math.min(1, c)) * 255);
    return v.toString(16).padStart(2, '0');
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function rgbToLinear(r, g, b) {
  return {
    lr: srgbToLinear(r),
    lg: srgbToLinear(g),
    lb: srgbToLinear(b),
  };
}

export function linearToXyz(lr, lg, lb) {
  return {
    x: 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
    y: 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
    z: 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  };
}

export function xyzToLinear(x, y, z) {
  return {
    lr:  4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
    lg: -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    lb: -0.0041960863 * x - 0.7034186147 * y + 1.7076147010 * z,
  };
}

export function xyzToOklab(x, y, z) {
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

export function oklabToXyz(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    x:  1.2270138511 * l - 0.5577999807 * m + 0.2812561490 * s,
    y: -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s,
    z: -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s,
  };
}

export function oklabToOklch(L, a, b) {
  const C = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { L, C, h };
}

export function oklchToOklab(L, C, h) {
  const hRad = h * (Math.PI / 180);
  return {
    L,
    a: C * Math.cos(hRad),
    b: C * Math.sin(hRad),
  };
}

// Full conversion chains
export function hexToOklch(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { lr, lg, lb } = rgbToLinear(r, g, b);
  const { x, y, z } = linearToXyz(lr, lg, lb);
  const { L, a, b: b2 } = xyzToOklab(x, y, z);
  return oklabToOklch(L, a, b2);
}

export function oklchToHex(L, C, h) {
  const { a, b } = oklchToOklab(L, C, h);
  const { x, y, z } = oklabToXyz(L, a, b);
  const { lr, lg, lb } = xyzToLinear(x, y, z);
  const r = linearToSrgb(lr);
  const g = linearToSrgb(lg);
  const b2 = linearToSrgb(lb);
  return rgbToHex(r, g, b2);
}

export function oklchToRgb(L, C, h) {
  const { a, b } = oklchToOklab(L, C, h);
  const { x, y, z } = oklabToXyz(L, a, b);
  const { lr, lg, lb } = xyzToLinear(x, y, z);
  return {
    r: Math.round(Math.max(0, Math.min(1, linearToSrgb(lr))) * 255),
    g: Math.round(Math.max(0, Math.min(1, linearToSrgb(lg))) * 255),
    b: Math.round(Math.max(0, Math.min(1, linearToSrgb(lb))) * 255),
  };
}

export function hexToRgb255(hex) {
  const { r, g, b } = hexToRgb(hex);
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Check if OKLCH color is within sRGB gamut
export function isInGamut(L, C, h) {
  const { a, b } = oklchToOklab(L, C, h);
  const { x, y, z } = oklabToXyz(L, a, b);
  const { lr, lg, lb } = xyzToLinear(x, y, z);
  const r = linearToSrgb(lr);
  const g = linearToSrgb(lg);
  const b2 = linearToSrgb(lb);
  const eps = 0.001;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b2 >= -eps && b2 <= 1 + eps;
}

// Gamut map: reduce chroma until color is in sRGB gamut
export function gamutMapOklch(L, C, h) {
  if (isInGamut(L, C, h)) return { L, C, h };
  let lo = 0;
  let hi = C;
  while (hi - lo > 0.0001) {
    const mid = (lo + hi) / 2;
    if (isInGamut(L, mid, h)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { L, C: lo, h };
}

// WCAG 2.1 Relative Luminance
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

// WCAG Contrast Ratio
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Generate lightness values using a curve parameter
// curve: -1.0 to 1.0 (0.3 default)
// Positive values push more values toward lighter end
// Negative values push toward darker end
export function generateLightnessValues(count, curve = 0.3) {
  const values = [];
  for (let i = 0; i < count; i++) {
    let t = count === 1 ? 0.5 : i / (count - 1);
    // Apply sigmoid-like curve
    if (curve !== 0) {
      const k = curve * 3;
      t = t < 0.5
        ? 0.5 * Math.pow(2 * t, 1 - k)
        : 1 - 0.5 * Math.pow(2 * (1 - t), 1 - k);
    }
    // Map t to lightness range (0.05 to 0.95 in OKLCH)
    const L = 0.05 + t * 0.90;
    values.push(L);
  }
  return values;
}

// Generate a palette of colors from OKLCH base
export function generatePalette(baseHex, colorCount, lightnessCurve = 0.3) {
  const { C, h } = hexToOklch(baseHex);
  const lightnessValues = generateLightnessValues(colorCount, lightnessCurve);

  return lightnessValues.map((L) => {
    const mapped = gamutMapOklch(L, C, h);
    const hex = oklchToHex(mapped.L, mapped.C, mapped.h);
    return {
      L: mapped.L,
      C: mapped.C,
      h: mapped.h,
      hex,
    };
  });
}

// Find the closest color in palette to the base color
export function findBaseColorIndex(colors, baseHex) {
  const baseOklch = hexToOklch(baseHex);
  let minDist = Infinity;
  let index = 0;
  colors.forEach((c, i) => {
    const dist = Math.abs(c.L - baseOklch.L);
    if (dist < minDist) {
      minDist = dist;
      index = i;
    }
  });
  return index;
}

// Generate a random pleasant color
export function randomColor() {
  const h = Math.random() * 360;
  const c = 0.1 + Math.random() * 0.15;
  const L = 0.4 + Math.random() * 0.3;
  const mapped = gamutMapOklch(L, c, h);
  return oklchToHex(mapped.L, mapped.C, mapped.h);
}

// Get an English color name for palette naming
export function getColorNameEn(hex) {
  const { h, C, L } = hexToOklch(hex);
  if (C < 0.04) {
    if (L < 0.2) return 'black';
    if (L > 0.85) return 'white';
    return 'gray';
  }
  const hueNames = [
    [15, 'red'],
    [45, 'orange'],
    [75, 'yellow'],
    [150, 'green'],
    [210, 'cyan'],
    [260, 'blue'],
    [310, 'purple'],
    [345, 'pink'],
    [360, 'red'],
  ];
  for (const [boundary, name] of hueNames) {
    if (h <= boundary) return name;
  }
  return 'red';
}
