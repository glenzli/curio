import { randomGenerator, normal, poisson } from "../noise/model.js";
export const WIDTH = 64,
  HEIGHT = 40,
  MAX_FRAMES = 64;
export const HOT = 12 * WIDTH + 14;
export function parameters(input = {}) {
  const p = { exposure: 10, dark: 0.1, read: 3, seed: 31, ...input };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.exposure <= 0 ||
    p.exposure > 120 ||
    p.dark < 0 ||
    p.dark > 1 ||
    p.read < 0 ||
    p.read > 12 ||
    !Number.isInteger(p.seed)
  )
    throw RangeError("Invalid dark sequence parameters");
  return p;
}
export function signalRate(x, y) {
  return (
    4 +
    2 * Math.cos((2 * Math.PI * x) / 24) +
    1.5 * Math.sin((2 * Math.PI * y) / 18) +
    (x > 38 && x < 53 && y > 10 && y < 28 ? 12 : 0)
  );
}
export function darkMultiplier(x, y) {
  return x === 14 && y === 12 ? 80 : x % 17 === 0 && y % 13 === 0 ? 25 : 1;
}
export function capturePixel(signal, dark, read, seed) {
  const rt = randomGenerator(seed),
    rd = randomGenerator(seed + 0x51a9c3);
  const target = new Float64Array(MAX_FRAMES),
    master = target.slice();
  let a = 0,
    b = 0;
  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    a += poisson(signal + dark, rt) + read * normal(rt);
    b += poisson(dark, rd) + read * normal(rd);
    target[frame] = a;
    master[frame] = b;
  }
  return { target, master };
}
export function captureDarkFrames(input = {}) {
  const p = parameters(input),
    size = WIDTH * HEIGHT,
    signal = new Float64Array(size),
    dark = signal.slice(),
    target = new Float64Array(size * MAX_FRAMES),
    master = target.slice();
  for (let i = 0; i < size; i++) {
    const x = i % WIDTH,
      y = Math.floor(i / WIDTH);
    signal[i] = signalRate(x, y) * p.exposure;
    dark[i] = p.dark * darkMultiplier(x, y) * p.exposure;
    const capture = capturePixel(signal[i], dark[i], p.read, p.seed + 1009 * i);
    for (let frame = 0; frame < MAX_FRAMES; frame++) {
      target[frame * size + i] = capture.target[frame];
      master[frame * size + i] = capture.master[frame];
    }
  }
  return { p, signal, dark, target, master };
}
export function darkSequence(data, frames = 8, masters = 16) {
  if (
    ![frames, masters].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= MAX_FRAMES,
    )
  )
    throw RangeError("Whole frame counts in [1,64] required");
  const size = WIDTH * HEIGHT,
    raw = new Float64Array(size),
    master = raw.slice(),
    corrected = raw.slice(),
    oracle = raw.slice(),
    residual = raw.slice(),
    variance = raw.slice();
  for (let i = 0; i < size; i++) {
    raw[i] = data.target[(frames - 1) * size + i] / frames;
    master[i] = data.master[(masters - 1) * size + i] / masters;
    corrected[i] = raw[i] - master[i];
    oracle[i] = raw[i] - data.dark[i];
    residual[i] = corrected[i] - data.signal[i];
    variance[i] =
      (data.signal[i] + data.dark[i] + data.p.read ** 2) / frames +
      (data.dark[i] + data.p.read ** 2) / masters;
  }
  return {
    data,
    frames,
    masters,
    raw,
    master,
    corrected,
    oracle,
    residual,
    variance,
  };
}
export function probeBudget(data, index, frames, masters) {
  const target = data.signal[index] + data.dark[index] + data.p.read ** 2,
    calibration = data.dark[index] + data.p.read ** 2;
  return {
    target: target / frames,
    master: calibration / masters,
    total: target / frames + calibration / masters,
    sharedCovariance: calibration / masters,
  };
}
