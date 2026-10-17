import { randomGenerator, normal } from "../noise/model.js";
import { fitEdge, projectEdge } from "./geometry.js";

export const SIZE = 64,
  RADIUS = 12;
export const gaussianMTF = (frequency, sigma) =>
  Math.exp(-2 * Math.PI ** 2 * sigma ** 2 * frequency ** 2);
export const gaussianMTF50 = (sigma) =>
  Math.sqrt(Math.log(2)) / (Math.sqrt(2) * Math.PI * sigma);

// erf approximation, absolute error below 1.5e-7; sufficient for the teaching grid.
export function gaussianCDF(x) {
  if (x === 0) return 0.5;
  const z = Math.abs(x) / Math.SQRT2,
    t = 1 / (1 + 0.3275911 * z);
  const tail =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
    t *
    Math.exp(-z * z);
  return x > 0 ? 1 - tail / 2 : tail / 2;
}

export function makeEdge({
  sigma = 0.85,
  angle = 5,
  phase = 0.2,
  noise = 0,
  seed = 1,
  contrast = 1,
} = {}) {
  const theta = (angle * Math.PI) / 180,
    random = randomGenerator(seed),
    samples = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const distance =
        Math.cos(theta) * (x - (SIZE - 1) / 2) -
        Math.sin(theta) * (y - (SIZE - 1) / 2) -
        phase;
      const value =
        (1 - contrast) / 2 +
        contrast * gaussianCDF(distance / sigma) +
        noise * normal(random);
      samples.push({ x, y, distance, value });
    }
  return samples;
}

export function binEdge(samples, h) {
  const count = Math.round((2 * RADIUS) / h),
    sums = new Float64Array(count),
    counts = new Uint16Array(count);
  for (const sample of samples) {
    const index = Math.floor((sample.distance + RADIUS) / h);
    if (index >= 0 && index < count) {
      sums[index] += sample.value;
      counts[index]++;
    }
  }
  const bins = Array.from({ length: count }, (_, i) => ({
    x: -RADIUS + (i + 0.5) * h,
    count: counts[i],
    value: counts[i] ? sums[i] / counts[i] : null,
  }));
  const missing = bins.filter((b) => !b.count).length;
  // Interpolate internal holes only, and expose every missing bin to the caller.
  const occupied = bins.map((b, i) => (b.count ? i : -1)).filter((i) => i >= 0);
  if (occupied.length < 2) return { bins, filled: [], missing };
  const first = occupied[0],
    last = occupied.at(-1),
    filled = [];
  let right = 1;
  for (let i = first; i <= last; i++) {
    while (occupied[right] < i) right++;
    const a = occupied[right - 1],
      b = occupied[right];
    const value =
      bins[i].value ??
      bins[a].value + ((bins[b].value - bins[a].value) * (i - a)) / (b - a);
    filled.push({ x: bins[i].x, value });
  }
  return { bins, filled, missing };
}

export function derivative(esf, h, window = false) {
  const result = [];
  for (let i = 1; i < esf.length - 1; i++) {
    const x = esf[i].x,
      raw = (esf[i + 1].value - esf[i - 1].value) / (2 * h);
    const weight = window ? 0.54 + 0.46 * Math.cos((Math.PI * x) / RADIUS) : 1;
    result.push({ x, raw, value: raw * weight });
  }
  return result;
}

export const differenceResponse = (f, h) =>
  f === 0 ? 1 : Math.sin(2 * Math.PI * f * h) / (2 * Math.PI * f * h);

export function spectrum(lsf, h) {
  if (!lsf.length) return { raw: [], corrected: [] };
  const dc = Math.abs(lsf.reduce((sum, p) => sum + p.value, 0));
  if (dc < 1e-12) return { raw: [], corrected: [] };
  const raw = [],
    corrected = [],
    padding = 4;
  for (let k = 0; k <= Math.floor(lsf.length * padding * h * 0.5); k++) {
    const f = k / (lsf.length * padding * h);
    let re = 0,
      im = 0;
    for (const p of lsf) {
      re += p.value * Math.cos(2 * Math.PI * f * p.x);
      im -= p.value * Math.sin(2 * Math.PI * f * p.x);
    }
    const value = Math.hypot(re, im) / dc,
      response = Math.abs(differenceResponse(f, h));
    raw.push([f, value]);
    if (response >= 0.2) corrected.push([f, value / response]);
  }
  return { raw, corrected };
}

export function crossing50(points) {
  for (let i = 1; i < points.length; i++) {
    const [a, va] = points[i - 1],
      [b, vb] = points[i];
    if (va >= 0.5 && vb < 0.5) return a + ((b - a) * (va - 0.5)) / (va - vb);
  }
  return null;
}

export function analyze(parameters = {}) {
  const h = 1 / (parameters.factor ?? 4),
    observations = makeEdge(parameters);
  // Strip simulator distances before calling the estimator.
  const observed = observations.map(({ x, y, value }) => ({ x, y, value })),
    fit = fitEdge(observed);
  const angle = ((parameters.angle ?? 5) * Math.PI) / 180;
  const truthGeometry = {
    slope: Math.tan(angle),
    intercept: (SIZE - 1) / 2 + (parameters.phase ?? 0.2) / Math.cos(angle),
    centerY: (SIZE - 1) / 2,
  };
  function pipeline(geometry) {
    if (!geometry || !fit.levels?.ok) return null;
    const normalized = observed.map((p) => ({
      ...p,
      value: (p.value - fit.levels.dark) / fit.levels.contrast,
    }));
    const samples = projectEdge(normalized, geometry),
      esf = binEdge(samples, h);
    const lsf = derivative(esf.filled, h, parameters.window ?? false),
      frequencies = spectrum(lsf, h);
    return {
      h,
      samples,
      esf,
      lsf,
      ...frequencies,
      estimated50: esf.missing === 0 ? crossing50(frequencies.corrected) : null,
    };
  }
  const known = pipeline(truthGeometry),
    fitted = pipeline(fit.geometry);
  const active = parameters.geometry === "known" ? known : fitted;
  const empty = {
    h,
    samples: [],
    esf: { bins: [], filled: [], missing: 0 },
    lsf: [],
    raw: [],
    corrected: [],
    estimated50: null,
  };
  return {
    ...(active ?? empty),
    active,
    known,
    fitted,
    fit,
    truthGeometry,
    observations,
    analytic50: gaussianMTF50(parameters.sigma ?? 0.85),
  };
}
