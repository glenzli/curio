// Time is in ms. Irradiance is relative to E_ref; dose is in E_ref * ms.
export const FLASH_DOSE = 8;

export function parameters(input = {}) {
  const p = {
    source: 0, scanMs: 8, exposureMs: 2, row: 50,
    frequency: 100, duty: 25, phase: 0,
    flashStartMs: 8.5, flashDurationMs: 1, ambient: 0.2,
    ...input,
  };
  for (const [key, lo, hi] of [
    ['source', 0, 1], ['scanMs', 0, 20], ['exposureMs', 0.25, 20],
    ['row', 0, 100], ['frequency', 50, 2000], ['duty', 10, 100],
    ['phase', 0, 100], ['flashStartMs', -5, 35],
    ['flashDurationMs', 0.1, 8], ['ambient', 0, 1],
  ]) if (!Number.isFinite(p[key]) || p[key] < lo || p[key] > hi)
    throw new RangeError('Light timing input outside teaching domain: ' + key);
  if (!Number.isInteger(p.source)) throw new RangeError('Unknown light source');
  return p;
}

export function overlap(a, b, c, d) {
  if (![a, b, c, d].every(Number.isFinite) || b < a || d < c)
    throw new RangeError('Invalid time intervals');
  return Math.max(0, Math.min(b, d) - Math.max(a, c));
}

// An antiderivative counts full periods and the remaining on-time, including
// negative times. Endpoints have measure zero; intervals are half open.
export function pwmOnTime(start, end, period, duty, phase = 0) {
  if (![start, end, period, duty, phase].every(Number.isFinite) ||
      end < start || period <= 0 || duty <= 0 || duty > 1)
    throw new RangeError('Invalid periodic pulse train');
  if (duty === 1) return end - start;
  const on = period * duty;
  const primitive = (time) => {
    const cycles = (time - phase) / period, whole = Math.floor(cycles);
    return whole * on + Math.min(on, (cycles - whole) * period);
  };
  return Math.max(0, Math.min(end - start, primitive(end) - primitive(start)));
}

// Independent reference: partition the integration interval at every pulse
// edge and sum midpoint irradiance times subinterval width. No primitive.
export function pwmReference(start, end, period, duty, phase = 0) {
  if (![start, end, period, duty, phase].every(Number.isFinite) ||
      end < start || period <= 0 || duty <= 0 || duty > 1)
    throw new RangeError('Invalid periodic reference interval');
  const first = Math.floor((start - phase) / period) - 1;
  const last = Math.ceil((end - phase) / period) + 1;
  const edges = [start, end];
  for (let k = first; k <= last; k++) {
    for (const edge of [phase + k * period, phase + (k + duty) * period])
      if (edge > start && edge < end) edges.push(edge);
  }
  edges.sort((a, b) => a - b);
  let dose = 0;
  for (let k = 1; k < edges.length; k++) {
    const midpoint = (edges[k - 1] + edges[k]) / 2;
    const cycle = (midpoint - phase) / period;
    if (cycle - Math.floor(cycle) < duty)
      dose += (edges[k] - edges[k - 1]) / duty;
  }
  return dose;
}

export function commonWindow(scanMs, exposureMs) {
  if (![scanMs, exposureMs].every(Number.isFinite) || scanMs < 0 || exposureMs <= 0)
    throw new RangeError('Invalid exposure windows');
  return { start: scanMs, end: exposureMs, duration: Math.max(0, exposureMs - scanMs) };
}

export function rowDose(row, input = {}) {
  const p = parameters(input);
  if (!Number.isFinite(row) || row < 0 || row > 1)
    throw new RangeError('Invalid normalized row');
  const start = row * p.scanMs, end = start + p.exposureMs;
  const period = 1000 / p.frequency, duty = p.duty / 100;
  const phaseMs = period * p.phase / 100;
  const illuminated = p.source === 0
    ? pwmOnTime(start, end, period, duty, phaseMs)
    : overlap(start, end, p.flashStartMs, p.flashStartMs + p.flashDurationMs);
  const light = p.source === 0 ? illuminated / duty
    : FLASH_DOSE * illuminated / p.flashDurationMs;
  const ambient = p.source === 1 ? p.ambient * p.exposureMs : 0;
  return { row, start, end, illuminated, light, ambient, total: light + ambient,
    ratio: (light + ambient) / p.exposureMs };
}

export function lightTiming(input = {}) {
  const p = parameters(input);
  const rows = Array.from({ length: 129 }, (_, k) => rowDose(k / 128, p));
  const selected = rowDose(p.row / 100, p), window = commonWindow(p.scanMs, p.exposureMs);
  const period = 1000 / p.frequency, duty = p.duty / 100, phaseMs = period * p.phase / 100;
  const referenceError = p.source === 0
    ? Math.max(...rows.map((r) => Math.abs(r.light -
      pwmReference(r.start, r.end, period, duty, phaseMs))))
    : Math.max(...rows.map((r) => {
      // Subtract the pulse's cumulative clamped ramp at both row endpoints.
      const cumulative = (t) => Math.min(1, Math.max(0,
        (t - p.flashStartMs) / p.flashDurationMs));
      return Math.abs(r.light - FLASH_DOSE * (cumulative(r.end) - cumulative(r.start)));
    }));
  return { p, rows, selected, window, period, duty, phaseMs, referenceError,
    peak: p.source === 0 ? 1 / duty : FLASH_DOSE / p.flashDurationMs,
    min: Math.min(...rows.map((r) => r.ratio)),
    max: Math.max(...rows.map((r) => r.ratio)),
    allFlashCaptured: p.source === 1 && p.flashStartMs >= window.start &&
      p.flashStartMs + p.flashDurationMs <= window.end,
  };
}
