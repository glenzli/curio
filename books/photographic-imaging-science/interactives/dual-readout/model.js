import { randomGenerator, normal, poisson } from "../noise/model.js";
export const gainH = 80e-6,
  gainL = 20e-6,
  voltageLimit = 0.8;
export function parameters(input = {}) {
  const p = {
    mean: 64,
    commonNoise: 1.5,
    highNoise: 1,
    lowNoise: 4,
    mode: "shared",
    seed: 20261018,
    ...input,
  };
  if (
    ![p.mean, p.commonNoise, p.highNoise, p.lowNoise].every(Number.isFinite) ||
    p.mean < 0 ||
    p.mean > 65536 ||
    Math.min(p.commonNoise, p.highNoise, p.lowNoise) < 0 ||
    Math.max(p.commonNoise, p.highNoise, p.lowNoise) > 20 ||
    !["shared", "independent"].includes(p.mode) ||
    !Number.isSafeInteger(p.seed)
  )
    throw new RangeError("Invalid dual readout model");
  return p;
}
// Propagate independent source variances through their actual two-channel paths.
export function dualMetrics(input = {}) {
  const p = parameters(input),
    shared = p.mode === "shared";
  const variances = shared
    ? [p.mean, p.commonNoise ** 2, p.highNoise ** 2, p.lowNoise ** 2]
    : [
        p.mean,
        p.commonNoise ** 2,
        p.highNoise ** 2,
        p.mean,
        p.commonNoise ** 2,
        p.lowNoise ** 2,
      ];
  const paths = shared
    ? [
        [1, 1, 1, 0],
        [1, 1, 0, 1],
      ]
    : [
        [1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1],
      ];
  const cov = paths.map((a) =>
    paths.map((b) => variances.reduce((sum, v, i) => sum + a[i] * b[i] * v, 0)),
  );
  const denominator = cov[0][0] + cov[1][1] - 2 * cov[0][1];
  const weightH = denominator > 0 ? (cov[1][1] - cov[0][1]) / denominator : 0.5;
  const weights = [weightH, 1 - weightH];
  const variance = cov.reduce(
    (sum, row, i) =>
      sum + row.reduce((s, v, j) => s + weights[i] * weights[j] * v, 0),
    0,
  );
  const omitCovariance =
    weightH ** 2 * cov[0][0] + (1 - weightH) ** 2 * cov[1][1];
  return {
    p,
    cov,
    weightH,
    variance,
    omitCovariance,
    highLimit: voltageLimit / gainH,
    lowLimit: voltageLimit / gainL,
  };
}
// Conditional covariance and scalar quadratic minimization, independent of path matrix.
export function dualTruth(input = {}) {
  const p = parameters(input),
    a = p.mean + p.commonNoise ** 2,
    h = p.highNoise ** 2,
    l = p.lowNoise ** 2;
  if (p.mode === "shared")
    return {
      covariance: a,
      variance: a + (h + l > 0 ? (h * l) / (h + l) : 0),
      weightH: h + l > 0 ? l / (h + l) : 0.5,
    };
  return {
    covariance: 0,
    variance: 2 * a + h + l > 0 ? ((a + h) * (a + l)) / (2 * a + h + l) : 0,
    weightH: 2 * a + h + l > 0 ? (a + l) / (2 * a + h + l) : 0.5,
  };
}
export function dualObservations(input = {}, count = 4096) {
  const m = dualMetrics(input),
    p = m.p;
  if (!Number.isInteger(count) || count < 2 || count > 100000)
    throw new RangeError("Invalid dual observation count");
  const random = randomGenerator(p.seed),
    samples = [];
  let highClipped = 0,
    lowClipped = 0,
    bothClipped = 0,
    fallback = 0,
    example;
  for (let i = 0; i < count; i++) {
    const qH = poisson(p.mean, random),
      upstreamH = p.commonNoise * normal(random);
    const qL = p.mode === "shared" ? qH : poisson(p.mean, random);
    const upstreamL =
      p.mode === "shared" ? upstreamH : p.commonNoise * normal(random);
    const highVolts =
      (qH + upstreamH) * gainH + gainH * p.highNoise * normal(random);
    const lowVolts =
      (qL + upstreamL) * gainL + gainL * p.lowNoise * normal(random);
    const clipH = highVolts >= voltageLimit,
      clipL = lowVolts >= voltageLimit;
    const high = Math.min(voltageLimit, highVolts) / gainH,
      low = Math.min(voltageLimit, lowVolts) / gainL;
    if (clipH) highClipped++;
    if (clipL) lowClipped++;
    if (clipH && clipL) bothClipped++;
    // Declared teaching selector. The linear variance formula does not cover this switch.
    if (clipH && !clipL) fallback++;
    const fused = clipH
      ? low
      : clipL
        ? high
        : m.weightH * high + (1 - m.weightH) * low;
    if (i === 0)
      example = {
        chargeH: qH,
        chargeL: qL,
        upstreamH,
        upstreamL,
        highVolts,
        lowVolts,
      };
    samples.push({ high, low, fused });
  }
  return { samples, highClipped, lowClipped, bothClipped, fallback, example };
}
// Only observed values enter estimates; do not subtract generating charges/noises.
export function dualMoments(samples) {
  if (
    samples.length < 2 ||
    !samples.every((s) => [s.high, s.low, s.fused].every(Number.isFinite))
  )
    throw new RangeError("Invalid dual observations");
  const keys = ["high", "low", "fused"],
    means = Object.fromEntries(
      keys.map((k) => [
        k,
        samples.reduce((s, x) => s + x[k], 0) / samples.length,
      ]),
    );
  const variance = (k) =>
    samples.reduce((s, x) => s + (x[k] - means[k]) ** 2, 0) /
    (samples.length - 1);
  const covariance =
    samples.reduce(
      (s, x) => s + (x.high - means.high) * (x.low - means.low),
      0,
    ) /
    (samples.length - 1);
  return {
    means,
    highVariance: variance("high"),
    lowVariance: variance("low"),
    fusedVariance: variance("fused"),
    covariance,
  };
}
