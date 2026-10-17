// Chapter 4, equations (4.1) and (4.2): independent signal, dark and read noise.
export function noiseBudget({
  signalRate = 20,
  darkRate = 0.1,
  exposure = 1,
  readNoise = 2,
  frames = 1,
} = {}) {
  for (const [name, value] of Object.entries({
    signalRate,
    darkRate,
    exposure,
    readNoise,
    frames,
  }))
    if (!Number.isFinite(value) || value < 0)
      throw new Error(`${name} must be finite and non-negative`);
  if (
    exposure <= 0 ||
    signalRate <= 0 ||
    !Number.isInteger(frames) ||
    frames < 1
  )
    throw new Error(
      "Positive signal/exposure and at least one whole frame are required",
    );
  const signal = signalRate * exposure;
  const dark = darkRate * exposure;
  const variance = (signal + dark + readNoise ** 2) / frames;
  const sigma = Math.sqrt(variance);
  const snr = signal / sigma;
  return {
    signal,
    dark,
    variance,
    sigma,
    snr,
    db: 20 * Math.log10(snr),
    shotSigma: Math.sqrt(signal / frames),
    readSigma: readNoise / Math.sqrt(frames),
  };
}

export function randomGenerator(seed = 20261017) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(random) {
  return (
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  );
}
const factorials = [0];
function logFactorial(n) {
  for (let i = factorials.length; i <= n; i++)
    factorials.push(factorials[i - 1] + Math.log(i));
  return factorials[n];
}

export function poisson(mean, random) {
  if (!Number.isFinite(mean) || mean < 0 || mean > 1e6)
    throw new Error("Poisson mean must be in [0, 1e6]");
  if (mean === 0) return 0;
  if (mean < 30) {
    const limit = Math.exp(-mean);
    let product = 1;
    let count = 0;
    do {
      count++;
      product *= random();
    } while (product > limit);
    return count - 1;
  }
  // PTRS transformed rejection; no Gaussian approximation to photon counts.
  const b = 0.931 + 2.53 * Math.sqrt(mean);
  const a = -0.059 + 0.02483 * b;
  const inverseAlpha = 1.1239 + 1.1328 / (b - 3.4);
  const vr = 0.9277 - 3.6224 / (b - 2);
  for (;;) {
    const u = random() - 0.5;
    const v = random();
    const us = 0.5 - Math.abs(u);
    if (us === 0 || v === 0) continue;
    const k = Math.floor(((2 * a) / us + b) * u + mean + 0.43);
    if (k < 0) continue;
    if (us >= 0.07 && v <= vr) return k;
    if (us < 0.013 && v > us) continue;
    if (
      Math.log((v * inverseAlpha) / (a / (us * us) + b)) <=
      -mean + k * Math.log(mean) - logFactorial(k)
    )
      return k;
  }
}

export function samplePixel(parameters, random) {
  const budget = noiseBudget(parameters);
  let sum = 0;
  const frames = parameters.frames ?? 1;
  for (let frame = 0; frame < frames; frame++)
    sum +=
      poisson(budget.signal, random) +
      poisson(budget.dark, random) -
      budget.dark +
      (parameters.readNoise ?? 2) * normal(random);
  return sum / frames;
}
