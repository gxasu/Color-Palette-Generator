// Lightness Chart Visualization using Canvas
export function renderLightnessChart(canvas, colors, baseColorIndex) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Get computed styles for theme-aware colors
  const styles = getComputedStyle(document.documentElement);
  const textColor = styles.getPropertyValue('--color-text-secondary').trim() || '#666';
  const gridColor = styles.getPropertyValue('--color-border').trim() || '#e0e0e0';
  const lineColor = styles.getPropertyValue('--color-primary').trim() || '#6366f1';

  ctx.clearRect(0, 0, w, h);

  // Draw grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = textColor;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const val = (1 - i / 4).toFixed(1);
    ctx.fillText(val, padding.left - 6, y);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  colors.forEach((_, i) => {
    const x = padding.left + (chartW / Math.max(1, colors.length - 1)) * i;
    ctx.fillText((i + 1) * 100, x, h - padding.bottom + 8);
  });

  if (colors.length === 0) return;

  // Draw line connecting lightness values
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  colors.forEach((color, i) => {
    const x = padding.left + (chartW / Math.max(1, colors.length - 1)) * i;
    const y = padding.top + chartH * (1 - color.L);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw points
  colors.forEach((color, i) => {
    const x = padding.left + (chartW / Math.max(1, colors.length - 1)) * i;
    const y = padding.top + chartH * (1 - color.L);

    // Point fill with actual color
    ctx.beginPath();
    ctx.arc(x, y, i === baseColorIndex ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = color.hex;
    ctx.fill();
    ctx.strokeStyle = i === baseColorIndex ? lineColor : gridColor;
    ctx.lineWidth = i === baseColorIndex ? 2.5 : 1.5;
    ctx.stroke();
  });
}
