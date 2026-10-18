import { randomGenerator } from "../noise/model.js";

export function parameters(input = {}) {
  const p = {
    incident: 24,
    eta: 0.5,
    mode: "poisson",
    seed: 20261018,
    ...input,
  };
  if (
    !Number.isInteger(p.incident) ||
    p.incident < 0 ||
    p.incident > 80 ||
    !Number.isFinite(p.eta) ||
    p.eta < 0 ||
    p.eta > 1 ||
    !["poisson", "fixed"].includes(p.mode) ||
    !Number.isSafeInteger(p.seed)
  )
    throw new RangeError("Invalid photon counting parameters");
  return p;
}

// Times are fractions of one exposure, not propagation through silicon.
export function arrivals(input = {}, frame = 0) {
  const p = parameters(input);
  if (!Number.isSafeInteger(frame) || frame < 0)
    throw new RangeError("Invalid exposure index");
  const random = randomGenerator((p.seed + Math.imul(frame, 0x9e3779b9)) >>> 0);
  const openRandom = () => random() + 0.5 / 4294967296;
  const events = [];
  if (p.mode === "fixed") {
    for (let i = 0; i < p.incident; i++)
      events.push({ time: openRandom(), mark: openRandom() });
    events.sort((a, b) => a.time - b.time);
  } else if (p.incident > 0) {
    let time = 0;
    for (;;) {
      time += -Math.log1p(-openRandom()) / p.incident;
      if (time > 1) break;
      events.push({ time, mark: openRandom() });
    }
  }
  return events.map((e) => ({ ...e, kept: e.mark < p.eta }));
}

export function partialCounts(events, fraction = 1) {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1)
    throw new RangeError("Invalid exposure fraction");
  const past = events.filter((e) => e.time <= fraction);
  return { photons: past.length, electrons: past.filter((e) => e.kept).length };
}

export function distribution(input = {}, maximum = 180) {
  const p = parameters(input);
  if (!Number.isInteger(maximum) || maximum < p.incident || maximum > 1000)
    throw new RangeError("Invalid histogram support");
  const probabilities = Array(maximum + 1).fill(0);
  if (p.mode === "poisson") {
    probabilities[0] = Math.exp(-p.incident * p.eta);
    for (let k = 1; k <= maximum; k++)
      probabilities[k] = (probabilities[k - 1] * p.incident * p.eta) / k;
  } else {
    // Convolve Bernoulli masses; handles eta=0 and eta=1 without 0/0.
    probabilities[0] = 1;
    for (let n = 0; n < p.incident; n++)
      for (let k = n + 1; k >= 0; k--)
        probabilities[k] =
          probabilities[k] * (1 - p.eta) +
          (k ? probabilities[k - 1] * p.eta : 0);
  }
  return probabilities;
}

// Independent law-of-total-variance calculation before substituting Poisson/fixed N.
export function countingTruth(input = {}) {
  const p = parameters(input),
    nVariance = p.mode === "poisson" ? p.incident : 0;
  return {
    mean: p.eta * p.incident,
    conditionalVariance: p.eta * (1 - p.eta) * p.incident,
    arrivingVariance: p.eta ** 2 * nVariance,
    variance: p.eta * (1 - p.eta) * p.incident + p.eta ** 2 * nVariance,
    photonVariance: nVariance,
  };
}

export function observations(input = {}, count = 4096) {
  const p = parameters(input);
  if (!Number.isInteger(count) || count < 2 || count > 100000)
    throw new RangeError("Invalid repetition count");
  return Array.from({ length: count }, (_, frame) =>
    partialCounts(arrivals(p, frame)),
  );
}

// This function sees measured counts only, not the generating rate or QE.
export function observedMoments(samples) {
  if (
    samples.length < 2 ||
    !samples.every(
      (s) =>
        Number.isInteger(s.photons) &&
        s.photons >= 0 &&
        Number.isInteger(s.electrons) &&
        s.electrons >= 0 &&
        s.electrons <= s.photons,
    )
  )
    throw new RangeError("Invalid count observations");
  const mean = (key) =>
    samples.reduce((s, x) => s + x[key], 0) / samples.length;
  const photonMean = mean("photons"),
    electronMean = mean("electrons");
  const variance = (key, m) =>
    samples.reduce((s, x) => s + (x[key] - m) ** 2, 0) / (samples.length - 1);
  const covariance =
    samples.reduce(
      (s, x) =>
        s +
        (x.electrons - electronMean) *
          (x.photons - x.electrons - (photonMean - electronMean)),
      0,
    ) /
    (samples.length - 1);
  return {
    photonMean,
    photonVariance: variance("photons", photonMean),
    electronMean,
    electronVariance: variance("electrons", electronMean),
    keptRejectedCovariance: covariance,
  };
}
