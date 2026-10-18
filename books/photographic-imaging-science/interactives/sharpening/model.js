import { randomGenerator, normal } from "../noise/model.js";
export const WIDTH = 128,
  HEIGHT = 64;
export function parameters(input = {}) {
  const p = {
    sigma: 1.2,
    amount: 0.8,
    radius: 1,
    noise: 0.015,
    seed: 23,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.sigma < 0 ||
    p.sigma > 3 ||
    p.amount < 0 ||
    p.amount > 2 ||
    !Number.isInteger(p.radius) ||
    p.radius < 1 ||
    p.radius > 4 ||
    p.noise < 0 ||
    p.noise > 0.1 ||
    !Number.isInteger(p.seed)
  )
    throw RangeError("Invalid sharpening parameters");
  return p;
}
export function blurKernel(sigma) {
  if (sigma === 0) return [{ x: 0, w: 1 }];
  const r = Math.ceil(5 * sigma),
    v = Array.from({ length: 2 * r + 1 }, (_, i) => ({
      x: i - r,
      w: Math.exp(-0.5 * ((i - r) / sigma) ** 2),
    })),
    sum = v.reduce((a, b) => a + b.w, 0);
  return v.map((p) => ({ ...p, w: p.w / sum }));
}
export function gain(f, amount, radius) {
  return 1 + amount * (1 - Math.cos(2 * Math.PI * f * radius));
}
export function scene(x, y) {
  return y < 30
    ? x < 64
      ? 0.15
      : 0.85
    : 0.5 +
        0.22 * Math.cos(2 * Math.PI * (0.19 * x + 0.03 * y)) +
        0.12 * Math.cos(2 * Math.PI * (0.35 * x - 0.11 * y));
}
export function sharpenValue(sample, x, amount, radius) {
  return (
    (1 + amount) * sample(x) -
    (amount * (sample(x - radius) + sample(x + radius))) / 2
  );
}
export function sharpening(input = {}) {
  const p = parameters(input),
    kernel = blurKernel(p.sigma),
    pad = 24,
    width = WIDTH + 2 * pad,
    random = randomGenerator(p.seed);
  const expected = (x, y) =>
    kernel.reduce((s, k) => s + k.w * scene(x - k.x, y), 0);
  const extended = Float64Array.from(
    { length: width * HEIGHT },
    (_, i) =>
      expected((i % width) - pad, Math.floor(i / width)) +
      p.noise * normal(random),
  );
  const truth = new Float64Array(WIDTH * HEIGHT),
    capture = truth.slice(),
    output = truth.slice(),
    noiseOutput = truth.slice(),
    error = truth.slice();
  let noiseSquare = 0,
    clipped = 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        sample = (q) => extended[y * width + q + pad];
      truth[i] = scene(x, y);
      capture[i] = sample(x);
      output[i] = sharpenValue(sample, x, p.amount, p.radius);
      const e = sharpenValue((q) => expected(q, y), x, p.amount, p.radius);
      noiseOutput[i] = output[i] - e;
      noiseSquare += noiseOutput[i] ** 2 / noiseOutput.length;
      error[i] = output[i] - truth[i];
      if (output[i] < 0 || output[i] > 1) clipped++;
    }
  const step = (x) =>
    kernel.reduce((s, k) => s + k.w * (x - k.x >= 0 ? 1 : 0), 0);
  const edge = Array.from({ length: 97 }, (_, i) => {
    const x = i - 48;
    return [x, step(x), sharpenValue(step, x, p.amount, p.radius)];
  });
  const lsf = edge.slice(1).map((v, i) => ({ x: v[0], v: v[2] - edge[i][2] }));
  const frequencies = Array.from({ length: 101 }, (_, i) => {
    const f = i / 200,
      optical = kernel.reduce(
        (s, k) => s + k.w * Math.cos(2 * Math.PI * f * k.x),
        0,
      );
    let re = 0,
      im = 0;
    for (const v of lsf) {
      re += v.v * Math.cos(2 * Math.PI * f * v.x);
      im -= v.v * Math.sin(2 * Math.PI * f * v.x);
    }
    return {
      f,
      optical: Math.abs(optical),
      gain: gain(f, p.amount, p.radius),
      combined: Math.abs(optical * gain(f, p.amount, p.radius)),
      edge: Math.hypot(re, im),
    };
  });
  return {
    p,
    truth,
    capture,
    output,
    error,
    noiseOutput,
    edge,
    frequencies,
    clipped,
    noiseObserved: Math.sqrt(noiseSquare),
    noiseTruth: p.noise * Math.sqrt((1 + p.amount) ** 2 + p.amount ** 2 / 2),
    overshoot: Math.max(...edge.map((v) => v[2])) - 1,
    undershoot: -Math.min(...edge.map((v) => v[2])),
  };
}
