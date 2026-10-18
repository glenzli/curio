// Single-slope teaching ADC: voltage thresholds at integer clock positions.
// Fixed 16 ideal-LSB pedestal keeps all dark-column inputs in range.
export const PATTERN = [
  -1, 0.25, -0.5, 1, -0.25, 0.75, -0.75, 0.5, 0, -0.5, 1, -1,
];
export function parameters({
  bits = 8,
  curvature = 0.45,
  offset = 2,
  signal = 0.375,
  column = 3,
  progress = 100,
} = {}) {
  for (const [v, lo, hi] of [
    [bits, 6, 10],
    [curvature, -0.8, 0.8],
    [offset, 0, 6],
    [signal, 0, 1],
    [column, 0, 11],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid ADC error parameters");
  if (!Number.isInteger(bits) || !Number.isInteger(column))
    throw new RangeError("Integer bit depth and column required");
  return { bits, curvature, offset, signal, column, progress };
}
export const ramp = (t, a) => t + a * t * (1 - t);
export function thresholds(input = {}) {
  const p = parameters(input),
    L = 2 ** p.bits;
  return Array.from({ length: L + 1 }, (_, k) => ramp(k / L, p.curvature));
}
export function codeFromThresholds(voltage, edges) {
  if (!Number.isFinite(voltage) || edges.length < 3)
    throw new RangeError("Invalid voltage or thresholds");
  let lo = 0,
    hi = edges.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (voltage >= edges[mid]) lo = mid;
    else hi = mid - 1;
  }
  return Math.min(edges.length - 2, lo);
}
// Independent continuous crossing root, then the declared clock latch rule.
export function crossingTruth(voltage, input = {}) {
  const p = parameters(input),
    L = 2 ** p.bits;
  if (!Number.isFinite(voltage)) throw new RangeError("Invalid voltage");
  if (voltage < 0) return { fraction: 0, code: 0, clipped: true };
  if (voltage >= 1)
    return { fraction: voltage === 1 ? 1 : null, code: L - 1, clipped: true };
  const a = p.curvature,
    t = (2 * voltage) / (1 + a + Math.sqrt((1 + a) ** 2 - 4 * a * voltage)),
    count = t * L;
  // Snap only roundoff-sized deviations at mathematically exact transitions.
  const k =
    Math.abs(count - Math.round(count)) < 1e-10
      ? Math.round(count)
      : Math.floor(count);
  return { fraction: t, code: Math.min(L - 1, k), clipped: false };
}
export function adcErrors(input = {}) {
  const p = parameters(input),
    L = 2 ** p.bits,
    delta = 1 / L,
    pedestal = 16 * delta,
    edges = thresholds(p),
    tau = p.progress / 100;
  const baseline = codeFromThresholds(pedestal + p.signal, edges),
    dark0 = codeFromThresholds(pedestal, edges);
  const columns = PATTERN.map((pattern, j) => {
    const bias = pattern * p.offset * delta,
      voltage = pedestal + p.signal + bias,
      darkVoltage = pedestal + bias;
    const code = codeFromThresholds(voltage, edges),
      dark = codeFromThresholds(darkVoltage, edges),
      truth = crossingTruth(voltage, p);
    return {
      j,
      bias,
      voltage,
      code,
      dark,
      truth,
      rawError: code - baseline,
      darkError: code - dark - (baseline - dark0),
      clipped: voltage < 0 || voltage >= 1,
      finished: tau >= 1 || voltage <= ramp(tau, p.curvature),
    };
  });
  return {
    ...p,
    L,
    delta,
    pedestal,
    edges,
    columns,
    baseline,
    dark0,
    tau,
    totalUs: L / 10,
    rampVoltage: ramp(tau, p.curvature),
    counter: Math.min(L - 1, Math.floor(L * tau)),
    dnl: Array.from(
      { length: L },
      (_, k) => (edges[k + 1] - edges[k]) / delta - 1,
    ),
    inl: edges.map((v, k) => (v - k * delta) / delta),
    dnlTruth: Array.from(
      { length: L },
      (_, k) => p.curvature * (1 - (2 * k + 1) / L),
    ),
    inlTruth: edges.map((_, k) => p.curvature * k * (1 - k / L)),
  };
}
