import { randomGenerator, normal, poisson } from "../noise/model.js";
export const scene = (x, region = 0) =>
  100 +
  60 * Math.exp(-(((x - 24) / 4) ** 2)) +
  45 * Math.exp(-(((x - 42) / 2.5) ** 2)) +
  20 * Math.sin(0.23 * x + region * 0.7);
export function observations({
  background = 2,
  foreground = -2,
  ratio = 4,
  read = 4,
  noise = 1,
  seed = 8104,
} = {}) {
  if (
    ![background, foreground, ratio, read, noise, seed].every(
      Number.isFinite,
    ) ||
    ![background, foreground].every(
      (x) => Number.isInteger(x) && Math.abs(x) <= 5,
    ) ||
    ratio < 1 ||
    ratio > 8 ||
    read < 0 ||
    noise < 0 ||
    noise > 1
  )
    throw RangeError("Invalid local-motion scene");
  const rng = randomGenerator(seed),
    shifts = [background, foreground],
    times = [1, ratio];
  const regions = shifts.map((shift, region) =>
    times.map((time, j) =>
      Array.from({ length: 64 }, (_, x) => {
        const rate = scene(x - (j ? shift : 0), region),
          mean = rate * time;
        return Math.min(
          1000,
          mean + noise * (poisson(mean, rng) - mean + read * normal(rng)),
        );
      }),
    ),
  );
  return { regions, times, read, white: 1000 };
}
// Only observed arrays, exposure times, read-noise calibration and saturation code enter.
export function estimateShift(regions, times, white = 1000) {
  if (
    !regions.length ||
    times.length !== 2 ||
    times.some((t) => !Number.isFinite(t) || t <= 0)
  )
    throw RangeError("Invalid observed frames");
  // Use the same valid reference locations for every candidate shift.
  const support = regions.map((pair) =>
    Array.from({ length: 44 }, (_, i) => i + 10).filter(
      (x) =>
        Number.isFinite(pair[0][x]) &&
        pair[0][x] < white &&
        Array.from({ length: 11 }, (_, j) => pair[1][x + j - 5]).every(
          (v) => Number.isFinite(v) && v < white,
        ),
    ),
  );
  const scores = [];
  for (let shift = -5; shift <= 5; shift++) {
    let sum = 0,
      n = 0,
      first = 0,
      second = 0;
    for (const [region, pair] of regions.entries())
      for (const x of support[region]) {
        const a = pair[0][x],
          b = pair[1][x + shift];
        if (
          !Number.isFinite(a) ||
          !Number.isFinite(b) ||
          a >= white ||
          b >= white
        )
          continue;
        const u = a / times[0],
          v = b / times[1];
        sum += (u - v) ** 2;
        first += u;
        second += u * u;
        n++;
      }
    scores.push({
      shift,
      cost: n ? sum / n : Infinity,
      count: n,
      texture: n ? second / n - (first / n) ** 2 : 0,
    });
  }
  const sorted = [...scores].sort((a, b) => a.cost - b.cost),
    best = sorted[0];
  if (!Number.isFinite(best.cost) || best.count < 20 || best.texture < 1e-8)
    return { shift: null, scores, reason: "有效纹理不足" };
  if (Math.abs(sorted[1].cost - best.cost) < 1e-10)
    return { shift: null, scores, reason: "多个位移给出同样残差" };
  return {
    shift: best.shift,
    scores,
    reason:
      Math.abs(best.shift) === 5
        ? "峰值位于搜索边缘，需扩大范围复核"
        : "整数格点内的最小残差",
  };
}
export function fusePair(a, b, times, read, rate = null) {
  const x = a / times[0],
    y = b / times[1],
    estimate = rate ?? Math.max(0, (x + y) / 2);
  const variances = times.map((t) => estimate / t + (read / t) ** 2);
  const w =
    variances[0] + variances[1] > 0
      ? variances[1] / (variances[0] + variances[1])
      : 0.5;
  return {
    value: w * x + (1 - w) * y,
    weight: w,
    variance: w * w * variances[0] + (1 - w) ** 2 * variances[1],
  };
}
export function localMotion(input = {}) {
  const p = {
      background: 2,
      foreground: -2,
      ratio: 4,
      read: 4,
      noise: 1,
      seed: 8104,
      ...input,
    },
    data = observations(p);
  const global = estimateShift(data.regions, data.times, data.white),
    local = data.regions.map((r) => estimateShift([r], data.times, data.white));
  const truth = [p.background, p.foreground],
    profiles = [],
    errors = { global: [], local: [], oracle: [] };
  for (let region = 0; region < 2; region++)
    for (let x = 10; x < 54; x++) {
      const pair = data.regions[region],
        rate = scene(x, region),
        point = { x: region * 64 + x, truth: rate };
      for (const [key, shift] of [
        ["global", global.shift],
        ["local", local[region].shift],
        ["oracle", truth[region]],
      ]) {
        const a = pair[0][x],
          b = shift === null ? NaN : pair[1][x + shift];
        point[key] =
          a < data.white && b < data.white
            ? fusePair(a, b, data.times, p.read, key === "oracle" ? rate : null)
                .value
            : null;
      }
      profiles.push(point);
    }
  const common = profiles.filter((p) =>
    ["global", "local", "oracle"].every((k) => p[k] !== null),
  );
  for (const point of common)
    for (const key of Object.keys(errors))
      errors[key].push((point[key] - point.truth) ** 2);
  return {
    data,
    global,
    local,
    truth,
    profiles,
    compared: common.length,
    rmse: Object.fromEntries(
      Object.entries(errors).map(([k, v]) => [
        k,
        v.length ? Math.sqrt(v.reduce((s, x) => s + x, 0) / v.length) : null,
      ]),
    ),
  };
}
