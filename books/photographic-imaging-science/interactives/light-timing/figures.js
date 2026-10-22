import { number } from '../common/lesson-view.js';
import { overlap } from './model.js';

const cyan = '#40879a', orange = '#bb7946', green = '#65875b';

// Draw the actual pulse support and its intersections with representative rows.
// Pulse bars encode time only; irradiance amplitude is reported separately.
export function timingFigure(m) {
  const p = m.p, flash = p.source === 1;
  const lo = Math.min(0, flash ? p.flashStartMs - 0.5 : 0);
  const hi = Math.max(p.scanMs + p.exposureMs,
    flash ? p.flashStartMs + p.flashDurationMs + 0.5 : 0);
  const X = (t) => 102 + 554 * (t - lo) / (hi - lo);
  const pulses = [];
  if (flash) pulses.push([p.flashStartMs, p.flashStartMs + p.flashDurationMs]);
  else {
    const first = Math.floor((lo - m.phaseMs) / m.period) - 1;
    const last = Math.ceil((hi - m.phaseMs) / m.period);
    for (let k = first; k <= last; k++)
      pulses.push([m.phaseMs + k * m.period,
        m.phaseMs + (k + m.duty) * m.period]);
  }
  const color = flash ? orange : cyan;
  const bar = (a, b, y, height, fill, opacity = 1) => b > a
    ? `<rect x="${X(a)}" y="${y}" width="${X(b) - X(a)}" height="${height}" fill="${fill}" opacity="${opacity}"/>` : '';
  let body = `<text x="12" y="34">发光时段</text><path d="M102 29H656" stroke="currentColor" opacity=".15"/>`;
  for (const [a, b] of pulses)
    body += bar(Math.max(lo, a), Math.min(hi, b), 20, 18, color);
  body += `<text x="102" y="58" font-size="12">条高不表示强度；峰值见读数</text>
    <text x="12" y="87">全幅交集</text>`;
  if (m.window.duration > 0) {
    body += bar(m.window.start, m.window.end, 72, 17, green, 0.5);
    body += `<text x="665" y="87">${number(m.window.duration, 2)} ms</text>`;
  } else body += `<text x="102" y="87">共同窗口长度为零</text>`;
  const rowPositions = [...new Set([0, 0.25, 0.5, 0.75, 1, p.row / 100])].sort((a, b) => a - b);
  const step = 32, bottom = 121 + step * rowPositions.length;
  for (let i = 0; i < rowPositions.length; i++) {
    const r = rowPositions[i], y = 112 + step * i, start = r * p.scanMs;
    const end = start + p.exposureMs, chosen = Math.abs(r - p.row / 100) < 1e-10;
    body += `<text x="12" y="${y + 13}">行 ${number(100 * r, 0)}%</text>`;
    body += bar(start, end, y, 18, '#788087', 0.18);
    for (const [a, b] of pulses) {
      if (overlap(start, end, a, b) > 0)
        body += bar(Math.max(start, a), Math.min(end, b), y, 18, color, chosen ? 1 : 0.65);
    }
    if (chosen)
      body += `<rect x="${X(start)}" y="${y - 3}" width="${X(end) - X(start)}" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="665" y="${y + 13}">探针</text>`;
  }
  body += `<path d="M102 ${bottom}H656" stroke="currentColor" opacity=".4"/>`;
  for (let k = 0; k <= 4; k++) {
    const t = lo + (hi - lo) * k / 4;
    body += `<text x="${X(t)}" y="${bottom + 23}" text-anchor="${k === 0 ? 'start' : k === 4 ? 'end' : 'middle'}">${number(t, 2)}</text>`;
  }
  body += `<text x="379" y="${bottom + 49}" text-anchor="middle">时间 / ms</text>`;
  return `<svg class="drawing" viewBox="0 0 760 ${bottom + 62}" role="img" aria-label="周期或单次脉冲与逐行曝光窗口的精确交集"><style>text{fill:currentColor;font:14px sans-serif}</style>${body}</svg>`;
}
