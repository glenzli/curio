import { randomGenerator, normal } from "../noise/model.js";
// A one-dimensional row of same-colour samples at even sites; fixed linear interpolation.
export function weights(site) {
  if (!Number.isInteger(site) || site < 0)
    throw RangeError("Nonnegative integer site required");
  return site % 2
    ? [
        [Math.floor(site / 2), 0.5],
        [Math.ceil(site / 2), 0.5],
      ]
    : [[site / 2, 1]];
}
export function covariance(i, j, sigma = 3) {
  if (!Number.isFinite(sigma) || sigma < 0)
    throw RangeError("Nonnegative sigma required");
  return (
    sigma *
    sigma *
    weights(i).reduce(
      (s, [a, w]) =>
        s + w * weights(j).reduce((q, [b, v]) => q + (a === b ? v : 0), 0),
      0,
    )
  );
}
export function demosaic({ sigma = 3, window = 4, seed = 7103 } = {}) {
  if (!Number.isInteger(window) || window < 1 || window > 16)
    throw RangeError("Invalid output window");
  const sites = Array.from({ length: window }, (_, i) => i),
    terms = new Map();
  for (const i of sites)
    for (const [j, w] of weights(i))
      terms.set(j, (terms.get(j) ?? 0) + w / window);
  const variance = [...terms.values()].reduce(
    (s, w) => s + w * w * sigma * sigma,
    0,
  );
  const expanded =
    sites.reduce(
      (s, i) => s + sites.reduce((q, j) => q + covariance(i, j, sigma), 0),
      0,
    ) /
    window ** 2;
  const naive =
    sites.reduce((s, i) => s + covariance(i, i, sigma), 0) / window ** 2;
  const rng = randomGenerator(seed),
    n = 8192;
  let sum = 0,
    second = 0;
  for (let k = 0; k < n; k++) {
    const input = Array.from({ length: 10 }, () => sigma * normal(rng));
    const y = [...terms].reduce((s, [i, w]) => s + w * input[i], 0);
    sum += y;
    second += y * y;
  }
  return {
    variance,
    expanded,
    naive,
    sampleVariance: (second - (sum * sum) / n) / (n - 1),
    covariance: (i, j) => covariance(i, j, sigma),
  };
}
