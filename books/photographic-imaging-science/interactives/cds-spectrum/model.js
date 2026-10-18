// A finite stationary random-phase line spectrum. Times: µs; frequencies: kHz.
import { randomGenerator } from "../noise/model.js";
export const sinc = (x) => (Math.abs(x) < 1e-10 ? 1 : Math.sin(x) / x);
export function parameters(input = {}) {
  const p = {
    kind: 2,
    rms: 30,
    tau: 10,
    aperture: 2,
    time: 20,
    seed: 17,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    ![0, 1, 2].includes(p.kind) ||
    p.rms < 0 ||
    p.rms > 100 ||
    p.tau < 0 ||
    p.tau > 100 ||
    p.aperture < 0 ||
    p.aperture > 40 ||
    p.time < 0 ||
    p.time > 100 ||
    !Number.isInteger(p.seed)
  )
    throw RangeError("Invalid CDS spectrum parameters");
  return p;
}
export function spectrum(input = {}) {
  const p = parameters(input),
    random = randomGenerator(p.seed);
  const raw = Array.from({ length: 32 }, (_, k) =>
    p.kind === 0
      ? k === 4
        ? 1
        : 0
      : p.kind === 1
        ? 1
        : 0.3 + (0.7 * 32) / (k + 1),
  );
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w, k) => ({
    frequency: 10 * (k + 1),
    variance: (p.rms ** 2 * w) / sum,
    phase: 2 * Math.PI * random(),
  }));
}
export function sample(lines, time, aperture = 0) {
  return lines.reduce(
    (v, l) =>
      v +
      Math.sqrt(2 * l.variance) *
        sinc(Math.PI * l.frequency * aperture * 0.001) *
        Math.cos(2 * Math.PI * l.frequency * time * 0.001 + l.phase),
    0,
  );
}
export function apertureReference(lines, time, width, steps = 512) {
  if (width === 0) return sample(lines, time, 0);
  let sum = 0;
  for (let j = 0; j < steps; j++)
    sum += sample(lines, time + width * ((j + 0.5) / steps - 0.5), 0) / steps;
  return sum;
}
export function response(frequency, p) {
  return (
    4 *
    sinc(Math.PI * frequency * p.aperture * 0.001) ** 2 *
    Math.sin(Math.PI * frequency * p.tau * 0.001) ** 2
  );
}
export function cdsSpectrum(input = {}) {
  const p = parameters(input),
    lines = spectrum(p);
  const bands = lines.map((l) => {
    const aperture = sinc(Math.PI * l.frequency * p.aperture * 0.001);
    return {
      ...l,
      aperture,
      response: response(l.frequency, p),
    };
  });
  const variance = bands.reduce((a, b) => a + b.variance * b.response, 0);
  const single = bands.reduce((a, b) => a + b.variance * b.aperture ** 2, 0);
  const covariance = bands.reduce(
    (a, b) =>
      a +
      b.variance *
        b.aperture ** 2 *
        Math.cos(2 * Math.PI * b.frequency * p.tau * 0.001),
    0,
  );
  let observed = 0,
    mean = 0;
  for (let i = 0; i < 1024; i++) {
    const t = (100 * (i + 0.5)) / 1024;
    const d =
      sample(lines, t, p.aperture) - sample(lines, t + p.tau, p.aperture);
    observed += (d * d) / 1024;
    mean += d / 1024;
  }
  return {
    p,
    lines,
    bands,
    variance,
    single,
    covariance,
    covarianceReference: 2 * (single - covariance),
    timeVariance: observed - mean * mean,
    first: sample(lines, p.time, p.aperture),
    second: sample(lines, p.time + p.tau, p.aperture),
  };
}
