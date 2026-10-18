import { randomGenerator, normal } from "../noise/model.js";
import { response, selectObservedPeak } from "../focus-survey/model.js";
export function parameters(input = {}) {
  const p = {
    lenses: 4,
    mounts: 3,
    repeats: 5,
    lensSD: 0.04,
    mountSD: 0.025,
    readSD: 0.015,
    seed: 17017,
    grid: 2,
    progress: 100,
    ...input,
  };
  for (const [k, lo, hi] of [
    ["lenses", 2, 8],
    ["mounts", 2, 6],
    ["repeats", 2, 12],
    ["seed", 1, 999999],
    ["grid", 0, 2],
  ])
    if (!Number.isInteger(p[k]) || p[k] < lo || p[k] > hi)
      throw RangeError("Invalid balanced study size");
  for (const [k, hi] of [
    ["lensSD", 0.1],
    ["mountSD", 0.08],
    ["readSD", 0.05],
    ["progress", 100],
  ])
    if (!Number.isFinite(p[k]) || p[k] < 0 || p[k] > hi)
      throw RangeError("Invalid study variance or progress");
  return p;
}
function seedFor(seed, ...keys) {
  let hash = seed >>> 0;
  for (const ch of keys.join(":"))
    hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
  return hash || 1;
}
const draw = (seed, ...keys) => normal(randomGenerator(seedFor(seed, ...keys)));
export const MEAN = 0.6;
export function observations(input = {}) {
  const p = parameters(input),
    data = [];
  for (let l = 0; l < p.lenses; l++)
    for (let a = 0; a < p.mounts; a++)
      for (let r = 0; r < p.repeats; r++) {
        const value =
          MEAN +
          p.lensSD * draw(p.seed, "lens", l) +
          p.mountSD * draw(p.seed, "mount", l, a) +
          p.readSD * draw(p.seed, "read", l, a, r);
        data.push({ lens: l, mount: a, repeat: r, value });
      }
  return data;
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
export function variance(a) {
  if (a.length < 2) throw RangeError("At least two observations required");
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
}

// This estimator receives observations and group identities only, never generator variances/effects.
export function analyze(data) {
  if (
    !data.length ||
    data.some(
      (d) =>
        !Number.isFinite(d.value) ||
        ![d.lens, d.mount, d.repeat].every(
          (v) => Number.isInteger(v) && v >= 0,
        ),
    )
  )
    throw RangeError("Invalid study observations");
  const lenses = Math.max(...data.map((d) => d.lens)) + 1,
    mounts = Math.max(...data.map((d) => d.mount)) + 1,
    repeats = Math.max(...data.map((d) => d.repeat)) + 1;
  if (
    Math.min(lenses, mounts, repeats) < 2 ||
    data.length !== lenses * mounts * repeats ||
    new Set(data.map((d) => `${d.lens}/${d.mount}/${d.repeat}`)).size !==
      data.length
  )
    throw RangeError(
      "Complete balanced groups with at least two units at each level required",
    );
  const grand = mean(data.map((d) => d.value));
  const cell = Array.from({ length: lenses }, (_, l) =>
    Array.from({ length: mounts }, (_, a) =>
      mean(
        data.filter((d) => d.lens === l && d.mount === a).map((d) => d.value),
      ),
    ),
  );
  const lensMeans = cell.map(mean);
  const errorSS = data.reduce(
    (s, d) => s + (d.value - cell[d.lens][d.mount]) ** 2,
    0,
  );
  const mountSS =
    repeats *
    cell.reduce(
      (s, row, l) => s + row.reduce((v, x) => v + (x - lensMeans[l]) ** 2, 0),
      0,
    );
  const lensSS =
    mounts * repeats * lensMeans.reduce((s, v) => s + (v - grand) ** 2, 0);
  const ms = {
    read: errorSS / (lenses * mounts * (repeats - 1)),
    mount: mountSS / (lenses * (mounts - 1)),
    lens: lensSS / (lenses - 1),
  };
  const estimates = {
    read: ms.read,
    mount: (ms.mount - ms.read) / repeats,
    lens: (ms.lens - ms.mount) / (mounts * repeats),
  };
  return {
    lenses,
    mounts,
    repeats,
    grand,
    cell,
    lensMeans,
    ms,
    estimates,
    errorSS,
    mountSS,
    lensSS,
    totalSS: data.reduce((s, d) => s + (d.value - grand) ** 2, 0),
    meanSE: Math.sqrt(ms.lens / data.length),
    naiveSE: Math.sqrt(variance(data.map((d) => d.value)) / data.length),
  };
}

export function budget(input = {}) {
  const p = parameters(input),
    l = p.lenses,
    a = p.mounts,
    r = p.repeats;
  const v = { lens: p.lensSD ** 2, mount: p.mountSD ** 2, read: p.readSD ** 2 };
  return {
    components: v,
    meanVariance: v.lens / l + v.mount / (l * a) + v.read / (l * a * r),
    iidMeanVariance: (v.lens + v.mount + v.read) / (l * a * r),
    expectedMS: {
      read: v.read,
      mount: v.read + r * v.mount,
      lens: v.read + r * v.mount + a * r * v.lens,
    },
    sameMountCovariance: v.lens + v.mount,
    sameLensCovariance: v.lens,
  };
}

// Independent fresh complete studies: sequential draws, no table estimator or mean-variance formula.
export function repeatedMeans(input = {}, trials = 256) {
  const p = parameters(input);
  if (!Number.isInteger(trials) || trials < 2 || trials > 16384)
    throw RangeError("Invalid number of complete studies");
  const rng = randomGenerator(seedFor(p.seed, "whole-studies")),
    values = [];
  for (let t = 0; t < trials; t++) {
    let sum = 0;
    for (let l = 0; l < p.lenses; l++) {
      const alpha = p.lensSD * normal(rng);
      for (let a = 0; a < p.mounts; a++) {
        const beta = p.mountSD * normal(rng);
        for (let r = 0; r < p.repeats; r++)
          sum += MEAN + alpha + beta + p.readSD * normal(rng);
      }
    }
    values.push(sum / (p.lenses * p.mounts * p.repeats));
  }
  return { values, mean: mean(values), variance: variance(values) };
}

export function selectionStudy(input = {}, trials = 256) {
  const p = parameters(input),
    count = [9, 17, 33][p.grid];
  if (!Number.isInteger(trials) || trials < 2 || trials > 16384)
    throw RangeError("Invalid focus study count");
  const rows = [];
  for (let t = 0; t < trials; t++) {
    const scan = Array.from({ length: count }, (_, i) => {
      const z = -80 + (160 * i) / (count - 1);
      return [z, response(z) + p.readSD * draw(p.seed, "selection", t, z)];
    });
    const selected = selectObservedPeak(scan);
    const trueSelected = response(selected[0]);
    rows.push({
      z: selected[0],
      selected: selected[1],
      trueSelected,
      validation:
        trueSelected + p.readSD * draw(p.seed, "validation", t, selected[0]),
    });
  }
  return {
    count,
    rows,
    truePeak: response(0),
    observedMean: mean(rows.map((r) => r.selected)),
    selectedTruthMean: mean(rows.map((r) => r.trueSelected)),
    validationMean: mean(rows.map((r) => r.validation)),
  };
}
export function repeatability(input = {}) {
  const p = parameters(input),
    data = observations(p);
  return {
    p,
    data,
    analysis: analyze(data),
    truth: budget(p),
    ensemble: repeatedMeans(p),
    selection: selectionStudy(p),
  };
}
