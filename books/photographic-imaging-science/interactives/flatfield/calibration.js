import { normal, randomGenerator } from "../noise/model.js";
import { average, sampleVariance } from "./model.js";

export const FRAME_COUNTS = [1, 2, 4, 8, 16, 32, 64];
export function covariance(a, b) {
  if (a.length !== b.length || a.length < 2)
    throw new RangeError("Covariance requires paired observations");
  const am = average(a),
    bm = average(b);
  return a.reduce((s, v, i) => s + (v - am) * (b[i] - bm), 0) / (a.length - 1);
}

// Balanced two-way random-effects estimate from q = (F1-F2)/sqrt(2).
// Signed variance components are retained: finite data can give a negative estimate.
export function decomposePair(first, second, side) {
  if (first.length !== side ** 2 || second.length !== side ** 2 || side < 2)
    throw new RangeError("Invalid square observed pair");
  const q = Float64Array.from(first, (v, i) => (v - second[i]) / Math.SQRT2),
    mean = average(q),
    rows = new Float64Array(side),
    columns = new Float64Array(side);
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      rows[y] += q[y * side + x] / side;
      columns[x] += q[y * side + x] / side;
    }
  let ss = 0;
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++)
      ss += (q[y * side + x] - rows[y] - columns[x] + mean) ** 2;
  const independent = ss / (side - 1) ** 2;
  return {
    independent,
    row: sampleVariance(rows) - independent / side,
    column: sampleVariance(columns) - independent / side,
    rows: rows.map((v) => v - mean),
    columns: columns.map((v) => v - mean),
  };
}

function frame(
  side,
  meanImage,
  signal,
  independentVariance,
  rowRms,
  columnRms,
  random,
) {
  const rows = Float64Array.from(
      { length: side },
      () => rowRms * normal(random),
    ),
    columns = Float64Array.from(
      { length: side },
      () => columnRms * normal(random),
    );
  const values = Float64Array.from(
    meanImage,
    (m, i) =>
      m +
      signal +
      Math.sqrt(independentVariance) * normal(random) +
      rows[Math.floor(i / side)] +
      columns[i % side],
  );
  return { values, rows, columns };
}

function series(parameters, meanImage, signal, seed, keepImages) {
  const { side, readNoise, rowNoise, columnNoise, darkMean, maxFrames } =
      parameters,
    random = randomGenerator(seed),
    prefixes = {},
    singles = [];
  const sum = keepImages ? new Float64Array(side ** 2) : null;
  let meanSum = 0,
    pixelSum = 0;
  const center = Math.floor(side / 2) * side + Math.floor(side / 2),
    first = [];
  for (let count = 1; count <= maxFrames; count++) {
    const f = frame(
      side,
      meanImage,
      signal,
      signal + darkMean + readNoise ** 2,
      rowNoise,
      columnNoise,
      random,
    );
    const m = average(f.values),
      p = f.values[center];
    meanSum += m;
    pixelSum += p;
    if (sum) for (let i = 0; i < sum.length; i++) sum[i] += f.values[i];
    if (count <= 2) {
      first.push(f);
      singles.push({ mean: m, pixel: p });
    }
    if (FRAME_COUNTS.includes(count))
      prefixes[count] = {
        mean: meanSum / count,
        pixel: pixelSum / count,
        ...(sum ? { values: sum.map((v) => v / count) } : {}),
      };
  }
  return { prefixes, singles, first };
}

export function simulateCalibration({
  signal = 200,
  darkMean = 20,
  readNoise = 4,
  rowNoise = 8,
  columnNoise = 6,
  side = 16,
  trials = 64,
  maxFrames = 64,
  targetSeed = 32011,
  darkSeed = 82013,
} = {}) {
  if (
    ![signal, darkMean, readNoise, rowNoise, columnNoise].every(
      (v) => Number.isFinite(v) && v >= 0,
    ) ||
    signal > 2000 ||
    darkMean > 100 ||
    readNoise > 30 ||
    rowNoise > 30 ||
    columnNoise > 30 ||
    ![8, 16, 32].includes(side) ||
    !Number.isInteger(trials) ||
    trials < 3 ||
    trials > 1024 ||
    !FRAME_COUNTS.includes(maxFrames) ||
    maxFrames < 2
  )
    throw new RangeError("Calibration inputs outside teaching domain");
  const parameters = {
    signal,
    darkMean,
    readNoise,
    rowNoise,
    columnNoise,
    side,
    trials,
    maxFrames,
  };
  const fixedRandom = randomGenerator(92317),
    offsets = Float64Array.from({ length: side ** 2 }, () =>
      normal(fixedRandom),
    ),
    offsetMean = average(offsets),
    offsetScale = 5 / Math.sqrt(sampleVariance(offsets)),
    darkTruth = offsets.map((v) => darkMean + (v - offsetMean) * offsetScale);
  const observations = [];
  let example;
  for (let t = 0; t < trials; t++) {
    const target = series(
        parameters,
        darkTruth,
        signal,
        targetSeed + 104729 * t,
        t === 0,
      ),
      dark = series(parameters, darkTruth, 0, darkSeed + 130363 * t, t === 0),
      decomposition = decomposePair(
        target.first[0].values,
        target.first[1].values,
        side,
      );
    observations.push({
      targets: target.prefixes,
      darks: dark.prefixes,
      singles: target.singles,
      decomposition,
    });
    if (t === 0) {
      const rowDifference = target.first[0].rows.map(
          (v, i) => (v - target.first[1].rows[i]) / Math.SQRT2,
        ),
        columnDifference = target.first[0].columns.map(
          (v, i) => (v - target.first[1].columns[i]) / Math.SQRT2,
        );
      const rm = average(rowDifference),
        cm = average(columnDifference);
      example = {
        first: target.first[0].values,
        second: target.first[1].values,
        rowTruth: rowDifference.map((v) => v - rm),
        columnTruth: columnDifference.map((v) => v - cm),
      };
    }
  }
  return { observations, parameters, darkTruth, example };
}

// This path accepts observed prefix means/pixels and pair statistics only.
// It has no access to signal truth, noise amplitudes or the generating dark image.
export function analyzeCalibration(
  observations,
  { darkFrames = 4, stackFrames = 4, domain = "mean" } = {},
) {
  if (
    !["mean", "pixel"].includes(domain) ||
    observations.length < 3 ||
    !observations.every((o) => o.darks[darkFrames] && o.targets[stackFrames])
  )
    throw new RangeError("Unavailable calibration observations");
  const counts = Object.keys(observations[0].targets)
    .map(Number)
    .sort((a, b) => a - b);
  const curve = counts.map((count) => {
    const values = observations.map(
      (o) => o.targets[count][domain] - o.darks[darkFrames][domain],
    );
    return { count, variance: sampleVariance(values), mean: average(values) };
  });
  const a = observations.map(
      (o) => o.singles[0][domain] - o.darks[darkFrames][domain],
    ),
    b = observations.map(
      (o) => o.singles[1][domain] - o.darks[darkFrames][domain],
    );
  const components = Object.fromEntries(
    ["independent", "row", "column"].map((key) => [
      key,
      average(observations.map((o) => o.decomposition[key])),
    ]),
  );
  return {
    curve,
    current: curve.find((p) => p.count === stackFrames),
    sharedCovariance: covariance(a, b),
    components,
  };
}

export function predictCalibration(
  { signal, darkMean, readNoise, rowNoise, columnNoise, side },
  {
    domain = "mean",
    darkFrames = 4,
    stackFrames = 4,
    independentPixels = false,
  } = {},
) {
  const signalIndependent = signal + darkMean + readNoise ** 2,
    darkIndependent = darkMean + readNoise ** 2;
  const variance = (independent) =>
    domain === "pixel"
      ? independent + rowNoise ** 2 + columnNoise ** 2
      : independentPixels
        ? (independent + rowNoise ** 2 + columnNoise ** 2) / side ** 2
        : independent / side ** 2 + (rowNoise ** 2 + columnNoise ** 2) / side;
  const target = variance(signalIndependent),
    dark = variance(darkIndependent),
    floor = dark / darkFrames;
  return { target, dark, floor, stack: target / stackFrames + floor };
}
