// Lightness/Alpha Chart Visualization using Canvas – Interactive drag support

const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };
const HIT_RADIUS = 12; // px tolerance for point picking

// Compute the position of each data point in CSS-pixel space.
function pointPositions(colors, chartW, chartH, valueKey = 'L') {
  const n = Math.max(1, colors.length - 1);
  return colors.map((c, i) => ({
    x: PADDING.left + (chartW / n) * i,
    y: PADDING.top + chartH * (1 - (c[valueKey] ?? c.L)),
    index: i,
  }));
}

// options: { valueKey: 'L' | 'alpha' }
export function renderLightnessChart(canvas, colors, baseColorIndex, stepNames, options = {}) {
  const { valueKey = 'L' } = options;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const chartW = w - PADDING.left - PADDING.right;
  const chartH = h - PADDING.top - PADDING.bottom;

  // Theme-aware colors
  const styles = getComputedStyle(document.documentElement);
  const textColor = styles.getPropertyValue('--md-sys-color-on-surface-variant').trim() || '#666';
  const gridColor = styles.getPropertyValue('--md-sys-color-outline-variant').trim() || '#e0e0e0';
  const lineColor = styles.getPropertyValue('--md-sys-color-primary').trim() || '#5e5e5e';

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = PADDING.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(w - PADDING.right, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = textColor;
  ctx.font = '10px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = PADDING.top + (chartH / 4) * i;
    const val = 1 - i / 4;
    if (valueKey === 'alpha') {
      ctx.fillText(Math.round(val * 100) + '%', PADDING.left - 6, y);
    } else {
      ctx.fillText(val.toFixed(1), PADDING.left - 6, y);
    }
  }

  // X-axis labels (use stepNames if provided)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const names = stepNames || colors.map((_, i) => String((i + 1) * 100));
  colors.forEach((_, i) => {
    const x = PADDING.left + (chartW / Math.max(1, colors.length - 1)) * i;
    ctx.fillText(names[i] || String((i + 1) * 100), x, h - PADDING.bottom + 8);
  });

  if (colors.length === 0) return;

  // Line
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pts = pointPositions(colors, chartW, chartH, valueKey);
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Points
  pts.forEach((p, i) => {
    const isBase = i === baseColorIndex;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isBase ? 7 : 5, 0, Math.PI * 2);

    if (valueKey === 'alpha') {
      // Draw checkerboard under point for alpha visualization
      const alpha = colors[i].alpha ?? 1;
      ctx.fillStyle = `rgba(128, 128, 128, ${alpha})`;
    } else {
      ctx.fillStyle = colors[i].hex;
    }
    ctx.fill();
    ctx.strokeStyle = isBase ? lineColor : gridColor;
    ctx.lineWidth = isBase ? 2.5 : 1.5;
    ctx.stroke();
  });
}

// Make the chart interactive: drag points vertically to change value.
// onValueChange(colorIndex, newVal) is called during drag.
// options: { valueKey: 'L' | 'alpha', onDragStart, onDragEnd }
export function makeChartInteractive(canvas, colors, baseColorIndex, stepNames, onValueChange, options = {}) {
  const { valueKey = 'L', onDragStart, onDragEnd } = options;
  let dragging = null; // index of point being dragged

  function getCSSCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function hitTest(x, y) {
    const rect = canvas.getBoundingClientRect();
    const chartW = rect.width - PADDING.left - PADDING.right;
    const chartH = rect.height - PADDING.top - PADDING.bottom;
    const pts = pointPositions(colors, chartW, chartH, valueKey);
    let closest = null;
    let minDist = HIT_RADIUS;
    pts.forEach((p) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < minDist) {
        minDist = d;
        closest = p.index;
      }
    });
    return closest;
  }

  function yToValue(y) {
    const rect = canvas.getBoundingClientRect();
    const chartH = rect.height - PADDING.top - PADDING.bottom;
    const val = 1 - (y - PADDING.top) / chartH;
    return Math.max(0, Math.min(1, val));
  }

  function onDown(e) {
    const { x, y } = getCSSCoords(e);
    const idx = hitTest(x, y);
    if (idx !== null) {
      dragging = idx;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      if (onDragStart) onDragStart();
    }
  }

  function onMove(e) {
    if (dragging === null) {
      // Hover cursor
      const { x, y } = getCSSCoords(e);
      canvas.style.cursor = hitTest(x, y) !== null ? 'grab' : 'default';
      return;
    }
    e.preventDefault();
    const { y } = getCSSCoords(e);
    const newVal = yToValue(y);
    onValueChange(dragging, newVal);
  }

  function onUp() {
    if (dragging !== null) {
      dragging = null;
      canvas.style.cursor = 'default';
      if (onDragEnd) onDragEnd();
    }
  }

  // Remove existing listeners by replacing canvas event handling
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  };
}
