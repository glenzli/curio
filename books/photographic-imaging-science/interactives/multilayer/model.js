// Normal incidence, nonmagnetic, coherent, lossless layers; lengths in nm.
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const scale = (a, s) => [s * a[0], s * a[1]];
const abs2 = (a) => a[0] ** 2 + a[1] ** 2;
const div = (a, b) => scale(mul(a, [b[0], -b[1]]), 1 / abs2(b));
const positive = (x) => Number.isFinite(x) && x > 0;
function inputs({ layers = [], wavelength = 550, n0 = 1, ns = 1.52 } = {}) {
  if (![wavelength, n0, ns].every(positive) || !Array.isArray(layers) || layers.length > 64)
    throw new RangeError("Invalid layer stack or optical constants");
  for (const layer of layers)
    if (!layer || !positive(layer.n) || !Number.isFinite(layer.d) || layer.d < 0)
      throw new RangeError("Each layer needs a positive real index and nonnegative thickness (nm)");
  return { layers, wavelength, n0, ns };
}
function multiply(a, b) {
  return [
    add(mul(a[0], b[0]), mul(a[1], b[2])),
    add(mul(a[0], b[1]), mul(a[1], b[3])),
    add(mul(a[2], b[0]), mul(a[3], b[2])),
    add(mul(a[2], b[1]), mul(a[3], b[3])),
  ];
}
export function stackMatrix(input = {}) {
  const { layers, wavelength, n0, ns } = inputs(input);
  let matrix = [[1, 0], [0, 0], [0, 0], [1, 0]];
  for (const { n, d } of layers) {
    const delta = 2 * Math.PI * n * d / wavelength;
    const c = [Math.cos(delta), 0], s = Math.sin(delta);
    matrix = multiply(matrix, [c, [0, s / n], [0, n * s], c]);
  }
  const B = add(matrix[0], scale(matrix[1], ns));
  const C = add(matrix[2], scale(matrix[3], ns));
  const denominator = add(scale(B, n0), C);
  const r = div(add(scale(B, n0), scale(C, -1)), denominator);
  const t = div([2 * n0, 0], denominator);
  return { matrix, r, t, R: abs2(r), T: ns / n0 * abs2(t) };
}

// Independent algorithm, without a characteristic matrix: start at the substrate
// and recursively sum the Fresnel multiple-return series of one layer at a time.
export function stackRecursion(input = {}) {
  const { layers, wavelength, n0, ns } = inputs(input);
  const last = layers.at(-1)?.n ?? n0;
  let r = [(last - ns) / (last + ns), 0], t = [2 * last / (last + ns), 0];
  for (let j = layers.length - 1; j >= 0; j--) {
    const { n, d } = layers[j], before = j === 0 ? n0 : layers[j - 1].n;
    const rij = (before - n) / (before + n), tij = 2 * before / (before + n);
    const delta = 2 * Math.PI * n * d / wavelength;
    const phase = [Math.cos(delta), -Math.sin(delta)];
    const roundTrip = mul(r, mul(phase, phase));
    const denominator = add([1, 0], scale(roundTrip, rij));
    t = div(scale(mul(phase, t), tij), denominator);
    r = div(add([rij, 0], roundTrip), denominator);
  }
  return { r, t, R: abs2(r), T: ns / n0 * abs2(t) };
}

// Closed-form admittance of nominal quarter-wave layers at the design wavelength.
// Y -> n_j^2/Y, working backwards from the substrate. Independent of both above.
export function quarterWaveTruth({ indices = [], n0 = 1, ns = 1.52 } = {}) {
  inputs({ layers: indices.map((n) => ({ n, d: 0 })), n0, ns });
  let admittance = ns;
  for (let j = indices.length - 1; j >= 0; j--) admittance = indices[j] ** 2 / admittance;
  const r = (n0 - admittance) / (n0 + admittance);
  return { admittance, r, R: r ** 2 };
}

export function alternatingStack({ pairs = 1, high = 1.7, low = 1.38, scale: thicknessScale = 1, lastError = 0, reverse = false, designWavelength = 550 } = {}) {
  if (!Number.isInteger(pairs) || pairs < 1 || pairs > 16 || ![high, low, designWavelength].every(positive)
      || !Number.isFinite(thicknessScale) || thicknessScale < 0 || thicknessScale > 10
      || !Number.isFinite(lastError) || lastError < -100 || lastError > 100)
    throw new RangeError("Invalid alternating-stack design");
  const indices = Array.from({ length: 2 * pairs }, (_, i) => i % 2 ? high : low);
  if (reverse) indices.reverse();
  return indices.map((n, i) => ({ n, d: designWavelength / (4 * n) * thicknessScale * (i === indices.length - 1 ? 1 + lastError / 100 : 1) }));
}
