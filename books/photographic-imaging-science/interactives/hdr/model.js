import { randomGenerator, normal, poisson } from "../noise/model.js";

export const WIDTH = 144, HEIGHT = 72;
export const FULL_WELL = 2000, READ_NOISE = 3, CAMERA_SHIFT = 3, SHADOW_RATE = 2000;

export function exposurePlan(timeMs, stops, fixedTotal = false) {
  const ratio = 2 ** stops;
  const long = timeMs / 1000 / (fixedTotal ? 1 + 1 / ratio : 1);
  return { short: long / ratio, long, total: long * (1 + 1 / ratio), ratio };
}

export const rateVariance = (rate, exposure, readNoise = READ_NOISE) =>
  rate / exposure + readNoise ** 2 / exposure ** 2;

export function shadowSNR(plan, rate = SHADOW_RATE, readNoise = READ_NOISE) {
  const shortVariance = rateVariance(rate, plan.short, readNoise);
  const longVariance = rateVariance(rate, plan.long, readNoise);
  return {
    short: rate / Math.sqrt(shortVariance), long: rate / Math.sqrt(longVariance),
    fused: rate * Math.sqrt(1 / shortVariance + 1 / longVariance),
    single: rate / Math.sqrt(rateVariance(rate, plan.total, readNoise)),
  };
}

// A synthetic monochrome scene in e-/s. Motion occurs between frame centers;
// intra-exposure motion, optical blur and CFA processing are deliberately absent.
export function sceneRate(x, y, movement = 0) {
  if (x >= 0.36 * WIDTH + movement && x < 0.46 * WIDTH + movement &&
      y >= 0.24 * HEIGHT && y < 0.88 * HEIGHT)
    return Math.floor(y / 5) % 2 ? 42000 : 28000;
  if (x >= 0.72 * WIDTH && x < 0.93 * WIDTH && y >= 0.12 * HEIGHT && y < 0.56 * HEIGHT) {
    if (x >= 0.83 * WIDTH && x < 0.88 * WIDTH && y < 0.28 * HEIGHT) return 4e6;
    return 3e5;
  }
  const pattern = Math.floor(x / 9) % 2 ? 1.16 : 1;
  return SHADOW_RATE * 2 ** (5 * x / (WIDTH - 1)) * pattern;
}

export function capture({ exposure, shift = 0, movement = 0, noise = false, seed = 1 }) {
  const random = randomGenerator(seed);
  const values = new Float64Array(WIDTH * HEIGHT), variances = new Float64Array(values.length);
  const valid = new Uint8Array(values.length);
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x, mean = sceneRate(x - shift, y, movement) * exposure;
    const electrons = noise ? poisson(mean, random) : mean;
    const read = Math.min(FULL_WELL, electrons) + (noise ? READ_NOISE * normal(random) : 0);
    values[i] = Math.min(FULL_WELL, read);
    variances[i] = mean + READ_NOISE ** 2;
    valid[i] = electrons < FULL_WELL && read < FULL_WELL ? 1 : 0;
  }
  return { values, variances, valid, exposure };
}

// Linear resampling of independent source pixels. A clipped contributing pixel
// invalidates the sample; no edge replication or extrapolation is performed.
export function sampleRate(frame, x, y) {
  if (x < 0 || x > WIDTH - 1 || y < 0 || y >= HEIGHT) return null;
  const a = Math.floor(x), b = Math.ceil(x), alpha = x - a;
  const ia = y * WIDTH + a, ib = y * WIDTH + b;
  if (!frame.valid[ia] || !frame.valid[ib]) return null;
  return {
    value: ((1 - alpha) * frame.values[ia] + alpha * frame.values[ib]) / frame.exposure,
    variance: ((1 - alpha) ** 2 * frame.variances[ia] + alpha ** 2 * frame.variances[ib]) / frame.exposure ** 2,
  };
}

export function fuseRates(short, long, deghost = false) {
  if (!short && !long) return { value: null, longWeight: 0, rejected: false };
  if (!short) return { value: long.value, longWeight: 1, rejected: false };
  if (!long) return { value: short.value, longWeight: 0, rejected: false };
  if (deghost && Math.abs(short.value - long.value) > 3 * Math.sqrt(short.variance + long.variance))
    return { value: short.value, longWeight: 0, rejected: true };
  if (short.variance === 0) return { value: short.value, longWeight: 0, rejected: false };
  if (long.variance === 0) return { value: long.value, longWeight: 1, rejected: false };
  const weight = short.variance / (short.variance + long.variance);
  return { value: (1 - weight) * short.value + weight * long.value, longWeight: weight, rejected: false };
}

export function fuseImage(short, long, offset, deghost = false) {
  const values = new Float64Array(WIDTH * HEIGHT), weights = new Float64Array(values.length);
  const valid = new Uint8Array(values.length), rejected = new Uint8Array(values.length);
  let missing = 0, rejectionCount = 0;
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x;
    const result = fuseRates(sampleRate(short, x, y), sampleRate(long, x + offset, y), deghost);
    valid[i] = result.value === null ? 0 : 1;
    values[i] = result.value ?? 0; weights[i] = result.longWeight;
    rejected[i] = result.rejected ? 1 : 0;
    if (!valid[i]) missing++;
    if (result.rejected) rejectionCount++;
  }
  return { values, weights, valid, rejected, missing, rejectionCount };
}
