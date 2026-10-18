import { adcErrors, PATTERN, crossingTruth } from "../adc-errors/model.js";
export const WIDTH = 48,
  HEIGHT = 32,
  REFERENCES = [8, 20, 32, 44],
  DISPLAY_DN = 8;
export function parameters(input = {}) {
  const p = {
    bits: 8,
    curvature: 0.45,
    offset: 4,
    signal: 0.6,
    calSignal: 0,
    gradient: 1,
    row: 16,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    ![6, 8, 10].includes(p.bits) ||
    Math.abs(p.curvature) > 0.8 ||
    p.offset < 0 ||
    p.offset > 6 ||
    p.signal < 0 ||
    p.signal > 0.7 ||
    p.calSignal < 0 ||
    p.calSignal > 0.4 ||
    ![0, 1].includes(p.gradient) ||
    !Number.isInteger(p.row) ||
    p.row < 0 ||
    p.row >= HEIGHT
  )
    throw RangeError("Invalid column stripe parameters");
  return p;
}
// Observation-only correction relative to explicitly designated stable reference columns.
export function columnCorrection(
  frame,
  width,
  height,
  references = REFERENCES,
) {
  if (
    frame.length !== width * height ||
    !frame.every(Number.isFinite) ||
    !Number.isInteger(height) ||
    height < 1 ||
    !Number.isInteger(width) ||
    width < 1 ||
    !references.length ||
    !references.every((j) => Number.isInteger(j) && j >= 0 && j < width)
  )
    throw RangeError("Invalid calibration frame");
  const means = Array.from(
    { length: width },
    (_, j) =>
      Array.from({ length: height }, (_, y) => frame[y * width + j]).reduce(
        (a, b) => a + b,
        0,
      ) / height,
  );
  const reference =
    references.reduce((s, j) => s + means[j], 0) / references.length;
  return means.map((v) => v - reference);
}
export function columnStripes(input = {}) {
  const p = parameters(input),
    cal = adcErrors({ ...p, signal: p.calSignal });
  const calibration = Float64Array.from(
    { length: WIDTH * HEIGHT },
    (_, i) => cal.columns[(i % WIDTH) % PATTERN.length].code,
  );
  const correction = columnCorrection(calibration, WIDTH, HEIGHT);
  const rows = Array.from({ length: HEIGHT }, (_, y) =>
    adcErrors({
      ...p,
      signal: p.signal * (p.gradient ? 0.2 + (0.8 * y) / (HEIGHT - 1) : 1),
    }),
  );
  const observed = new Float64Array(WIDTH * HEIGHT),
    reference = new Float64Array(observed.length),
    rawError = new Float64Array(observed.length),
    residual = new Float64Array(observed.length);
  let clipped = 0,
    mismatches = 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        c = rows[y].columns[x % PATTERN.length];
      observed[i] = c.code;
      reference[i] = rows[y].baseline;
      rawError[i] = observed[i] - reference[i];
      residual[i] = rawError[i] - correction[x];
      clipped += Number(c.clipped);
      mismatches += Number(c.code !== crossingTruth(c.voltage, p).code);
    }
  const rms = (values) =>
    Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);
  return {
    p,
    rows,
    calibration,
    correction,
    observed,
    reference,
    rawError,
    residual,
    clipped,
    mismatches,
    rawRms: rms(rawError),
    residualRms: rms(residual),
  };
}
