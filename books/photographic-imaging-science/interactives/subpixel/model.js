// A finite real Fourier inverse problem, not a learned super-resolution pipeline.
export const PERIOD = 16,
  ORDER = 16,
  DIMENSION = 2 * ORDER + 1;
export const sinc = (x) =>
  Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
export function parameters(input = {}) {
  const p = {
    frames: 4,
    diverse: 1,
    aperture: 0.8,
    blur: 0.1,
    noise: 0,
    bias: 0,
    ridge: 0,
    seed: 8105,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    !Number.isInteger(p.frames) ||
    p.frames < 1 ||
    p.frames > 4 ||
    ![0, 1].includes(p.diverse) ||
    p.aperture < 0.5 ||
    p.aperture > 1 ||
    p.blur < 0 ||
    p.blur > 0.35 ||
    p.noise < 0 ||
    p.noise > 0.03 ||
    Math.abs(p.bias) > 0.15 ||
    p.ridge < 0 ||
    p.ridge > 0.05 ||
    !Number.isInteger(p.seed)
  )
    throw RangeError("Invalid subpixel reconstruction parameters");
  return p;
}
export function truthCoefficients() {
  const c = new Float64Array(DIMENSION);
  c[0] = 0.5;
  c[5] = 0.12;
  c[21] = 0.14;
  c[22] = 0.04;
  c[29] = -0.06;
  c[31] = 0.08;
  c[32] = 0.03;
  return c;
}
export function basis(x, p, filtered = true) {
  const row = [1];
  for (let k = 1; k <= ORDER; k++) {
    const f = k / PERIOD,
      a = 2 * Math.PI * f * x;
    const h = filtered
      ? sinc(p.aperture * f) *
        Math.exp(-2 * Math.PI ** 2 * p.blur ** 2 * f ** 2)
      : 1;
    row.push(h * Math.cos(a), h * Math.sin(a));
  }
  return row;
}
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export function valueAt(c, x, p, filtered = false) {
  return dot(basis(x, p, filtered), c);
}
export function design(p, estimated = false) {
  return Array.from({ length: p.frames * PERIOD }, (_, i) => {
    const frame = Math.floor(i / PERIOD),
      shift = p.diverse ? frame / 4 : 0;
    const x = (i % PERIOD) + shift + (estimated ? (p.bias * frame) / 3 : 0);
    return basis(x, p);
  });
}
// One-sided Jacobi SVD: orthogonalize A's columns directly, without A^T A.
// Returns a minimum-norm solution; y and A are its only observation inputs.
export function invert(A, y, ridge = 0) {
  const rows = A.length,
    cols = A[0]?.length;
  if (
    !cols ||
    y.length !== rows ||
    !A.every((r) => r.length === cols && r.every(Number.isFinite)) ||
    !y.every(Number.isFinite) ||
    !Number.isFinite(ridge) ||
    ridge < 0
  )
    throw RangeError("Invalid finite inverse problem");
  const B = Array.from({ length: cols }, (_, j) => A.map((r) => r[j]));
  const V = Array.from({ length: cols }, (_, j) =>
    Array.from({ length: cols }, (_, i) => (i === j ? 1 : 0)),
  );
  for (let sweep = 0; sweep < 90; sweep++) {
    let changed = false;
    for (let j = 0; j < cols; j++)
      for (let k = j + 1; k < cols; k++) {
        const a = dot(B[j], B[j]),
          b = dot(B[k], B[k]),
          c = dot(B[j], B[k]);
        if (a < 1e-28 || b < 1e-28 || Math.abs(c) <= 1e-13 * Math.sqrt(a * b))
          continue;
        const z = (b - a) / (2 * c),
          t = (z >= 0 ? 1 : -1) / (Math.abs(z) + Math.hypot(1, z)),
          co = 1 / Math.hypot(1, t),
          si = co * t;
        for (const pair of [B, V])
          for (let i = 0; i < pair[j].length; i++) {
            const u = pair[j][i],
              v = pair[k][i];
            pair[j][i] = co * u - si * v;
            pair[k][i] = si * u + co * v;
          }
        changed = true;
      }
    if (!changed) break;
  }
  const singular = B.map((col) => Math.sqrt(dot(col, col))),
    max = Math.max(...singular),
    threshold = max * 1e-9;
  const coefficients = new Float64Array(cols);
  for (let j = 0; j < cols; j++) {
    if (singular[j] <= threshold) continue;
    const factor = dot(B[j], y) / (singular[j] ** 2 + ridge);
    for (let i = 0; i < cols; i++) coefficients[i] += factor * V[j][i];
  }
  const nonzero = singular.filter((v) => v > threshold),
    min = Math.min(...nonzero);
  const nullIndex = singular.indexOf(Math.min(...singular));
  return {
    coefficients,
    rank: nonzero.length,
    singular: singular.sort((a, b) => b - a),
    threshold,
    condition: max / min,
    nullVector: V[nullIndex],
  };
}
function gaussian(seed) {
  let s = seed >>> 0;
  const uniform = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s + 0.5) / 4294967296;
  };
  return () =>
    Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
}
export function reconstruct(input = {}) {
  const p = parameters(input),
    truth = truthCoefficients(),
    A = design(p),
    assumed = design(p, true),
    random = gaussian(p.seed);
  const clean = A.map((row) => dot(row, truth)),
    observed = clean.map((v) => v + p.noise * random());
  const fit = invert(assumed, observed, p.ridge),
    known = invert(A, observed, p.ridge);
  const residual = assumed.map(
    (row, i) => dot(row, fit.coefficients) - observed[i],
  );
  const rms = (c) =>
    Math.sqrt(
      Array.from(
        { length: 1024 },
        (_, i) =>
          (valueAt(c, (i * PERIOD) / 1024, p) -
            valueAt(truth, (i * PERIOD) / 1024, p)) **
          2,
      ).reduce((a, b) => a + b, 0) / 1024,
    );
  // A separate witness at exactly one cycle/pixel. Unit-width integration kills it at every shift.
  const zeroWitness = Array.from(
    { length: 64 },
    (_, i) => sinc(p.aperture) * Math.cos((2 * Math.PI * i) / 64),
  );
  return {
    p,
    truth,
    A,
    observed,
    clean,
    fit,
    known,
    residual,
    rmse: rms(fit.coefficients),
    knownRmse: rms(known.coefficients),
    residualRms: Math.sqrt(dot(residual, residual) / residual.length),
    witnessAmplitude: Math.max(...zeroWitness.map(Math.abs)),
  };
}
