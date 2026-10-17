import { randomGenerator, normal, poisson } from "../noise/model.js";
const K = { LCG: 20e-6, HCG: 80e-6 };
export const VOLTAGE_RANGE = 0.8,
  DOWNSTREAM_VOLTS = 80e-6,
  UPSTREAM_ELECTRONS = 1.5,
  FULL_WELL = 40000;
function parameters(input = {}) {
  const p = {
    signal: 16,
    gain: 1,
    mode: "LCG",
    reduceExposure: false,
    seed: 20261018,
    ...input,
  };
  if (
    ![p.signal, p.gain, p.seed].every(Number.isFinite) ||
    p.signal < 0 ||
    p.signal > 80000 ||
    p.gain < 1 ||
    p.gain > 16 ||
    !K[p.mode] ||
    typeof p.reduceExposure !== "boolean" ||
    !Number.isInteger(p.seed)
  )
    throw new RangeError("Invalid gain comparison");
  return p;
}
export function gainMetrics(input = {}) {
  const p = parameters(input),
    conversion = K[p.mode],
    ratio = p.reduceExposure ? 1 / p.gain : 1,
    mu = p.signal * ratio;
  const voltsPerElectron = conversion * p.gain;
  const shotVoltsVariance = mu * voltsPerElectron ** 2;
  const beforeVoltsVariance = (UPSTREAM_ELECTRONS * voltsPerElectron) ** 2;
  const varianceVolts =
    shotVoltsVariance + beforeVoltsVariance + DOWNSTREAM_VOLTS ** 2;
  const noiseElectrons = Math.sqrt(varianceVolts) / voltsPerElectron;
  const readNoise = Math.hypot(
    UPSTREAM_ELECTRONS,
    DOWNSTREAM_VOLTS / voltsPerElectron,
  );
  const limit = Math.min(FULL_WELL, VOLTAGE_RANGE / voltsPerElectron);
  return {
    p,
    conversion,
    ratio,
    mu,
    noiseElectrons,
    readNoise,
    snr: mu / noiseElectrons,
    limit,
    referenceLimit: limit / ratio,
    normalizedNoise: noiseElectrons / ratio,
    voltsPerElectron,
    clipped: mu >= limit,
  };
}
// Reference formula in the electron domain, independent of voltage propagation.
export function gainTruth(input = {}) {
  const p = parameters(input),
    mu = p.signal / (p.reduceExposure ? p.gain : 1),
    down = p.mode === "LCG" ? 4 : 1;
  const variance = mu + 2.25 + (down / p.gain) ** 2;
  return {
    variance,
    snr: mu / Math.sqrt(variance),
    limit: Math.min(40000, (p.mode === "LCG" ? 40000 : 10000) / p.gain),
  };
}
export function observations(input = {}, count = 1024) {
  const m = gainMetrics(input);
  if (!Number.isInteger(count) || count < 2 || count > 100000)
    throw new RangeError("Invalid observation count");
  const random = randomGenerator(m.p.seed),
    samples = new Float64Array(count);
  let clipped = 0;
  for (let i = 0; i < count; i++) {
    const q = poisson(m.mu, random),
      charge = Math.min(FULL_WELL, q);
    const voltage =
      (charge + UPSTREAM_ELECTRONS * normal(random)) * m.voltsPerElectron +
      DOWNSTREAM_VOLTS * normal(random);
    if (voltage >= VOLTAGE_RANGE || q >= FULL_WELL) clipped++;
    // Signed, black-subtracted analog readings. Negative noise is retained;
    // only the upper physical/voltage bounds clip. ADC quantization is absent.
    samples[i] =
      Math.min(VOLTAGE_RANGE, voltage) / m.voltsPerElectron / m.ratio;
  }
  return { samples, clipped };
}
// Accept only recorded, normalized samples. No signal or gain truth enters moments.
export function measuredMoments(samples) {
  if (samples.length < 2 || !Array.from(samples).every(Number.isFinite))
    throw new RangeError("Invalid observations");
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1);
  return {
    mean,
    variance,
    snr: variance > 0 ? mean / Math.sqrt(variance) : null,
  };
}
