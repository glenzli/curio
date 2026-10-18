import { randomGenerator, normal } from "../noise/model.js";
export const MIX = [
  [1.4, -0.3, -0.1],
  [-0.15, 1.3, -0.15],
  [-0.1, -0.4, 1.5],
];
export function parameters({
  exposure = 0,
  red = 2,
  blue = 2.5,
  shared = 8,
  mixing = 1,
  progress = 100,
  seed = 20261018,
} = {}) {
  for (const [v, lo, hi] of [
    [exposure, -2, 2],
    [red, 1, 4],
    [blue, 1, 4],
    [shared, 0, 20],
    [mixing, 0, 1],
    [progress, 0, 100],
    [seed, 0, 4294967295],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid noise propagation");
  if (!Number.isInteger(seed)) throw new RangeError("Integer seed required");
  return { exposure, red, blue, shared, mixing, progress, seed };
}
export const transform = (A, x) =>
  A.map((row) => row.reduce((sum, a, j) => sum + a * x[j], 0));
export const multiply = (A, B) =>
  A.map((row) =>
    B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)),
  );
const eye = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
export function propagation(input = {}) {
  const p = parameters(input),
    mu = [800, 1600, 640].map((v) => v * 2 ** p.exposure),
    g = [p.red, 1, p.blue],
    W = eye.map((row, i) => row.map((v) => v * g[i])),
    M = MIX.map((row, i) =>
      row.map((v, j) => p.mixing * v + (1 - p.mixing) * (i === j ? 1 : 0)),
    ),
    covariance = mu.map((v, i) =>
      mu.map((_, j) => (i === j ? v + 16 : 0) + p.shared ** 2),
    );
  const matrices = [eye, W, multiply(M, W)],
    stages = matrices.map((A) => {
      const temp = multiply(A, covariance),
        cov = temp.map((row) =>
          A.map((other) => row.reduce((s, v, k) => s + v * other[k], 0)),
        );
      return { mean: transform(A, mu), covariance: cov };
    });
  return { ...p, mu, g, W, M, matrices, stages };
}
// Independent latent-source expansion: one independent channel term each,
// plus a shared normal term. No covariance-matrix product here.
export function propagationTruth(input = {}) {
  const p = parameters(input),
    means = [800, 1600, 640].map((v) => v * 2 ** p.exposure),
    g = [p.red, 1, p.blue];
  const maps = [
    (i, k) => (i === k ? 1 : 0),
    (i, k) => (i === k ? g[k] : 0),
    (i, k) =>
      ((1 - p.mixing) * (i === k ? 1 : 0) + p.mixing * MIX[i][k]) * g[k],
  ];
  return maps.map((a) => ({
    mean: [0, 1, 2].map((i) => means.reduce((s, v, k) => s + a(i, k) * v, 0)),
    covariance: [0, 1, 2].map((i) =>
      [0, 1, 2].map(
        (j) =>
          means.reduce((s, v, k) => s + a(i, k) * a(j, k) * (v + 16), 0) +
          p.shared ** 2 *
            [0, 1, 2].reduce((s, k) => s + a(i, k), 0) *
            [0, 1, 2].reduce((s, k) => s + a(j, k), 0),
      ),
    ),
  }));
}
export function observations(input = {}, count = 4096) {
  const p = parameters(input),
    mu = [800, 1600, 640].map((v) => v * 2 ** p.exposure),
    random = randomGenerator(p.seed);
  if (!Number.isInteger(count) || count < 2 || count > 100000)
    throw new RangeError("Invalid sample count");
  return Array.from({ length: count }, () => {
    const common = p.shared * normal(random);
    return mu.map((v) => v + Math.sqrt(v + 16) * normal(random) + common);
  });
}
export function moments(samples) {
  if (
    samples.length < 2 ||
    samples.some((x) => x.length !== 3 || x.some((v) => !Number.isFinite(v)))
  )
    throw new RangeError("Invalid RGB observations");
  const mean = [0, 1, 2].map(
      (j) => samples.reduce((s, x) => s + x[j], 0) / samples.length,
    ),
    covariance = [0, 1, 2].map((i) =>
      [0, 1, 2].map(
        (j) =>
          samples.reduce((s, x) => s + (x[i] - mean[i]) * (x[j] - mean[j]), 0) /
          (samples.length - 1),
      ),
    );
  return { mean, covariance };
}
export const correlation = (cov, i = 0, j = 2) =>
  cov[i][j] / Math.sqrt(cov[i][i] * cov[j][j]);
export function experimentData(input = {}, raw) {
  const m = propagation(input),
    source = raw ?? observations(m),
    samples = m.matrices.map((A) => source.map((x) => transform(A, x)));
  return {
    ...m,
    samples,
    measured: samples.map(moments),
    truth: propagationTruth(m),
  };
}
