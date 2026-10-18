export const WIDTH = 112,
  HEIGHT = 64;
export const MODES = ["固定偏移", "匀速扫过", "两处等时停留", "正弦往返"];
export const TERMS = [
  [0.2, 0.055, 0.015, 0],
  [0.15, 0.17, -0.045, 0.7],
  [0.1, 0.28, 0.08, 1.1],
];
export const sinc = (x) => (Math.abs(x) < 1e-10 ? 1 : Math.sin(x) / x);
export function parameters(input = {}) {
  const p = { mode: 1, rms: 2, offset: 0, progress: 1, ...input };
  if (
    !Object.values(p).every(Number.isFinite) ||
    ![0, 1, 2, 3].includes(p.mode) ||
    p.rms < 0 ||
    p.rms > 6 ||
    Math.abs(p.offset) > 8 ||
    p.progress < 0 ||
    p.progress > 1
  )
    throw RangeError("Invalid motion transfer parameters");
  return p;
}
export function position(p, t) {
  const s =
    p.mode === 0
      ? 0
      : p.mode === 1
        ? Math.sqrt(3) * (2 * t - 1)
        : p.mode === 2
          ? t < 0.5
            ? -1
            : 1
          : Math.SQRT2 * Math.sin(2 * Math.PI * t);
  return p.offset + p.rms * s;
}
export function integrateOtf(input, frequency, steps = 512, fraction = 1) {
  const p = parameters(input);
  let re = 0,
    im = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    if (t > fraction) continue;
    const phase = -2 * Math.PI * frequency * position(p, t);
    re += Math.cos(phase) / steps;
    im += Math.sin(phase) / steps;
  }
  return { re, im, mtf: Math.hypot(re, im) };
}
export function analyticOtf(input, frequency) {
  const p = parameters(input),
    a = 2 * Math.PI * frequency * p.rms;
  let h =
    p.mode === 0
      ? 1
      : p.mode === 1
        ? sinc(Math.sqrt(3) * a)
        : p.mode === 2
          ? Math.cos(a)
          : null;
  if (h === null) {
    h = 0;
    for (let i = 0; i < 8192; i++)
      h +=
        Math.cos(a * Math.SQRT2 * Math.sin((2 * Math.PI * (i + 0.5)) / 8192)) /
        8192;
  }
  const angle = -2 * Math.PI * frequency * p.offset;
  return { re: h * Math.cos(angle), im: h * Math.sin(angle), mtf: Math.abs(h) };
}
export function scene(x, y) {
  return (
    0.5 +
    TERMS.reduce(
      (s, [a, fx, fy, phase]) =>
        s + a * Math.cos(2 * Math.PI * (fx * x + fy * y) + phase),
      0,
    )
  );
}
export function motionExposure(input = {}) {
  const p = parameters(input),
    count = Math.round(256 * p.progress),
    fraction = count / 256;
  const transfer = TERMS.map(([, f]) => integrateOtf(p, f, 256, fraction));
  const truth = Float64Array.from({ length: WIDTH * HEIGHT }, (_, i) =>
    scene(i % WIDTH, Math.floor(i / WIDTH)),
  );
  const image = Float64Array.from({ length: truth.length }, (_, i) => {
    const x = i % WIDTH,
      y = Math.floor(i / WIDTH);
    return (
      0.5 * fraction +
      TERMS.reduce((s, [a, fx, fy, phase], k) => {
        const v = 2 * Math.PI * (fx * x + fy * y) + phase;
        return (
          s + a * (transfer[k].re * Math.cos(v) - transfer[k].im * Math.sin(v))
        );
      }, 0)
    );
  });
  const series = Array.from({ length: 257 }, (_, i) => [
    i / 256,
    position(p, i / 256),
  ]);
  let mean = 0,
    square = 0;
  for (let i = 0; i < 512; i++) {
    const x = position(p, (i + 0.5) / 512);
    mean += x / 512;
    square += (x * x) / 512;
  }
  return {
    p,
    truth,
    image,
    series,
    fraction,
    mean,
    centeredRms: Math.sqrt(Math.max(0, square - mean * mean)),
    targetRms: p.mode === 0 ? 0 : p.rms,
  };
}
export function motionTransfer(input = {}) {
  const m = motionExposure(input);
  return {
    ...m,
    frequencies: Array.from({ length: 101 }, (_, i) => {
      const f = i / 200;
      return [f, integrateOtf(m.p, f), analyticOtf(m.p, f)];
    }),
  };
}
