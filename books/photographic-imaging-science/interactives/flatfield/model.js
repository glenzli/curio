import { randomGenerator, normal, poisson } from "../noise/model.js";

export const FULL_WELL = 12000,
  BLACK = 128,
  LEVELS = 16;
export const average = (values) =>
  values.reduce((s, v) => s + v, 0) / values.length;
export function sampleVariance(values) {
  if (values.length < 2)
    throw new RangeError("At least two observations required");
  const m = average(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}
function responseMap(count, prnu, seed) {
  const random = randomGenerator(seed),
    raw = Array.from({ length: count }, () => normal(random));
  const m = average(raw),
    sigma = Math.sqrt(sampleVariance(raw));
  return raw.map((v) => 1 + (prnu * (v - m)) / sigma);
}

// The estimator below accepts only recorded arrays and calibration metadata.
export function pairMoments(first, second) {
  if (first.length !== second.length || first.length < 2)
    throw new RangeError("Mismatched flat fields");
  const difference = first.map((v, i) => v - second[i]);
  return {
    mean: (average(first) + average(second)) / 2 - BLACK,
    temporal: sampleVariance(difference) / 2,
    spatial: (sampleVariance(first) + sampleVariance(second)) / 2,
    differenceMean: average(difference),
    difference,
  };
}

export function linearFit(points) {
  if (points.length < 3) return null;
  const xm = average(points.map((p) => p[0])),
    ym = average(points.map((p) => p[1]));
  const xx = points.reduce((s, p) => s + (p[0] - xm) ** 2, 0);
  if (xx <= 0) return null;
  const slope = points.reduce((s, p) => s + (p[0] - xm) * (p[1] - ym), 0) / xx;
  const intercept = ym - slope * xm;
  return {
    slope,
    intercept,
    residuals: points.map(([x, y]) => [x, y - slope * x - intercept]),
  };
}

// No gain truth or generated photon counts enter fitting or point selection.
export function fitTransfer(
  measurements,
  { white, fitMax = 0.75, excludeClipped = true } = {},
) {
  if (!Number.isFinite(white) || white <= BLACK)
    throw new RangeError("Invalid calibrated white");
  const range = white - BLACK;
  const selected = measurements.filter(
    (p) =>
      p.mean > 0.03 * range &&
      p.mean < fitMax * range &&
      (!excludeClipped || p.clipped < 0.001),
  );
  const temporal = linearFit(selected.map((p) => [p.mean, p.temporal]));
  const spatial = linearFit(selected.map((p) => [p.mean, p.spatial]));
  const dark = measurements[0];
  // 1/12 DN² is an approximation to uniform, independent quantization error.
  const readNoise =
    temporal?.slope > 0 && dark.temporal >= 1 / 12
      ? Math.sqrt(dark.temporal - 1 / 12) / temporal.slope
      : null;
  return {
    selected: selected.map((p) => p.level),
    temporal,
    spatial,
    readNoise,
  };
}

export function simulate({
  gain = 0.2,
  readNoise = 10,
  prnu = 0.02,
  drift = 0,
  side = 32,
  pairs = 4,
  seed = 20261018,
  patternSeed = 100003,
} = {}) {
  if (
    !Number.isFinite(gain) ||
    gain <= 0 ||
    gain > 1 ||
    !Number.isFinite(readNoise) ||
    readNoise < 0 ||
    readNoise > 30 ||
    !Number.isFinite(prnu) ||
    prnu < 0 ||
    prnu > 0.05 ||
    !Number.isFinite(drift) ||
    Math.abs(drift) > 0.2 ||
    ![16, 32, 48, 64].includes(side) ||
    !Number.isInteger(pairs) ||
    pairs < 1 ||
    pairs > 16
  )
    throw new RangeError("Flat-field inputs outside teaching domain");
  const count = side * side,
    responses = responseMap(count, prnu, patternSeed),
    white = BLACK + gain * FULL_WELL;
  const measurements = [];
  for (let level = 0; level < LEVELS; level++) {
    const mu = (FULL_WELL * 1.25 * level) / (LEVELS - 1),
      random = randomGenerator(seed + 1009 * level);
    let mean = 0,
      temporal = 0,
      spatial = 0,
      clipped = 0,
      display = null;
    for (let pair = 0; pair < pairs; pair++) {
      const frames = [-1, 1].map((sign) =>
        Float64Array.from(responses, (response) => {
          const charge = poisson(
            mu * response * (1 + (sign * drift) / 2),
            random,
          );
          const voltage =
            Math.min(FULL_WELL, charge) + readNoise * normal(random);
          const recorded = Math.max(
            0,
            Math.min(Math.floor(white), Math.round(BLACK + gain * voltage)),
          );
          // Only observed DN marks clipping; latent charge is not used to select fit points.
          if (recorded >= white - 2) clipped++;
          return recorded;
        }),
      );
      const m = pairMoments(...frames);
      mean += m.mean;
      temporal += m.temporal;
      spatial += m.spatial;
      if (pair === 0)
        display = {
          first: frames[0],
          second: frames[1],
          difference: m.difference,
          differenceMean: m.differenceMean,
        };
    }
    measurements.push({
      level,
      mean: mean / pairs,
      temporal: temporal / pairs,
      spatial: spatial / pairs,
      clipped: clipped / (2 * count * pairs),
      display,
    });
  }
  return {
    measurements,
    white,
    side,
    pairs,
    responses,
    truth: {
      gain,
      readNoise,
      prnu,
      drift,
      readVariance: (gain * readNoise) ** 2,
      quantizationVariance: 1 / 12,
    },
  };
}

// Linear, unsaturated expectation. Quantization is a stated approximation.
export function expectedVariance(
  mean,
  { gain, readNoise, prnu = 0, drift = 0 },
  method = "temporal",
) {
  const temporal = gain * mean + (gain * readNoise) ** 2 + 1 / 12;
  return (
    temporal +
    (method === "spatial"
      ? prnu ** 2 * mean ** 2 * (1 + drift ** 2 / 4)
      : 0.5 * (prnu * drift * mean) ** 2)
  );
}
