import { randomGenerator, normal } from "../noise/model.js";
export function calibration({
  masters = 16,
  frames = 8,
  drift = 3,
  read = 3,
  dark = 4,
  calDark = 4,
  seed = 6401,
} = {}) {
  if (
    ![masters, frames, drift, read, dark, calDark, seed].every(
      Number.isFinite,
    ) ||
    !Number.isInteger(masters) ||
    !Number.isInteger(frames) ||
    masters < 1 ||
    frames < 1 ||
    Math.min(read, dark, calDark) < 0
  )
    throw RangeError("Invalid calibration ensemble");
  const v = read ** 2 + dark,
    calVariance = (read ** 2 + calDark) / masters,
    bias = drift + dark - calDark;
  const variance = (n) => v / n + calVariance,
    mse = (n) => bias ** 2 + variance(n);
  const rng = randomGenerator(seed);
  let total = 0,
    mean = 0,
    second = 0;
  const repeats = 8192;
  for (let j = 0; j < repeats; j++) {
    const e =
      bias +
      Math.sqrt(v / frames) * normal(rng) -
      Math.sqrt(calVariance) * normal(rng);
    mean += e;
    second += e * e;
    total++;
  }
  return {
    bias,
    calVariance,
    variance,
    mse,
    rmse: Math.sqrt(mse(frames)),
    sampleMean: mean / total,
    sampleMse: second / total,
    floor: Math.sqrt(bias * bias + calVariance),
  };
}
export function snrThreshold({
  read = 3,
  dark = 4,
  target = 1,
  capacity = 32000,
} = {}) {
  if (
    ![read, dark, target, capacity].every(Number.isFinite) ||
    read < 0 ||
    dark < 0 ||
    target <= 0 ||
    capacity <= 0
  )
    throw RangeError("Invalid SNR criterion");
  const b = read * read + dark,
    t = target * target;
  const minimum = (t + Math.sqrt(t * t + 4 * t * b)) / 2;
  let lo = 0,
    hi = Math.max(minimum * 2, 1);
  for (let i = 0; i < 80; i++) {
    const x = (lo + hi) / 2;
    if (x / Math.sqrt(x + b) < target) lo = x;
    else hi = x;
  }
  return {
    minimum,
    numerical: (lo + hi) / 2,
    stops: minimum <= capacity ? Math.log2(capacity / minimum) : null,
  };
}
