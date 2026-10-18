import { simulate, fitTransfer } from "../flatfield/model.js";
export const STUDIES = 24,
  GAIN = 0.2,
  READ_NOISE = 10;
export function parameters(input = {}) {
  const p = {
    roi: 0,
    pairs: 2,
    prnuPercent: 0,
    driftPercent: 0,
    fitPercent: 75,
    exclude: 1,
    study: 24,
    batch: 0,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    ![0, 1].includes(p.roi) ||
    !Number.isInteger(p.pairs) ||
    p.pairs < 1 ||
    p.pairs > 4 ||
    p.prnuPercent < 0 ||
    p.prnuPercent > 5 ||
    p.driftPercent < 0 ||
    p.driftPercent > 20 ||
    p.fitPercent < 30 ||
    p.fitPercent > 105 ||
    ![0, 1].includes(p.exclude) ||
    p.study < 1 ||
    p.study > STUDIES ||
    !Number.isInteger(p.batch) ||
    p.batch < 0 ||
    p.batch > 9
  )
    throw RangeError("Invalid repeated PTC parameters");
  return p;
}
export function collect(input = {}) {
  const p = parameters(input),
    side = p.roi ? 32 : 16,
    patternSeed = 100003;
  const trials = Array.from({ length: STUDIES }, (_, i) => {
    const data = simulate({
      gain: GAIN,
      readNoise: READ_NOISE,
      prnu: p.prnuPercent / 100,
      drift: p.driftPercent / 100,
      side,
      pairs: p.pairs,
      seed: 48104 + 100003 * i + 10000019 * p.batch,
      patternSeed,
    });
    // Only observed moments and independently supplied white metadata leave collection.
    return { measurements: data.measurements, white: data.white };
  });
  return { p, side, trials };
}
export function analyze(trials, { fitPercent = 75, exclude = 1 } = {}) {
  return trials.map((data) =>
    fitTransfer(data.measurements, {
      white: data.white,
      fitMax: fitPercent / 100,
      excludeClipped: !!exclude,
    }),
  );
}
export function summarize(values) {
  const valid = values.filter((v) => v !== null && Number.isFinite(v)),
    n = valid.length;
  if (!n) return { n: 0, mean: null, sd: null };
  const mean = valid.reduce((a, b) => a + b, 0) / n;
  return {
    n,
    mean,
    sd:
      n < 2
        ? null
        : Math.sqrt(valid.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)),
  };
}
export function repeatedPtc(input = {}, observations = null) {
  const p = parameters(input),
    data = observations ?? collect(p),
    fits = analyze(data.trials, p);
  return {
    ...data,
    p,
    fits,
    temporal: summarize(fits.map((f) => f.temporal?.slope ?? null)),
    spatial: summarize(fits.map((f) => f.spatial?.slope ?? null)),
    read: summarize(fits.map((f) => f.readNoise)),
  };
}
