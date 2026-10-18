// Four equal 75 nm bands. Values are declared teaching responses, not a camera
// measurement or human colour matching functions. c = (1/75 nm) integral H s dλ.
export const EDGES = [400, 475, 550, 625, 700];
export const RESPONSE = [
  [0, 0, 1, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 0],
];
export const NULL_DIRECTION = [1, -1, 1, -1];
export function parameters({
  separation = 0.35,
  tilt = 0,
  probe = 0,
  progress = 100,
} = {}) {
  for (const [v, lo, hi] of [
    [separation, 0, 0.5],
    [tilt, -0.8, 0.8],
    [probe, 0, 0.5],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid spectral parameters");
  return { separation, tilt, probe, progress };
}
export function spectralPair(input = {}) {
  const p = parameters(input),
    a = NULL_DIRECTION.map((q) => 0.5 + p.separation * q),
    b = NULL_DIRECTION.map((q) => 0.5 - p.separation * q),
    illuminant = [-1, -1 / 3, 1 / 3, 1].map((x) => 1 + p.tilt * x),
    response = RESPONSE.map((r) => [...r]);
  response[0][0] = p.probe;
  const exposureA = a.map((r, j) => r * illuminant[j]),
    exposureB = b.map((r, j) => r * illuminant[j]),
    weights = EDGES.slice(0, 4).map((_, j) =>
      Math.max(0, Math.min(1, p.progress / 25 - j)),
    ),
    integrate = (h, partial = false) =>
      response.map((s) =>
        s.reduce((sum, v, j) => sum + v * h[j] * (partial ? weights[j] : 1), 0),
      );
  return {
    ...p,
    a,
    b,
    illuminant,
    response,
    exposureA,
    exposureB,
    weights,
    cameraA: integrate(exposureA),
    cameraB: integrate(exposureB),
    partialA: integrate(exposureA, true),
    partialB: integrate(exposureB, true),
  };
}
// Independent wavelength-domain midpoint quadrature. No call to spectralPair's
// dot-product integrator, and no use of the analytic null vector for evaluation.
export function quadratureTruth(
  reflectance,
  illuminant,
  response,
  samples = 400,
) {
  if (
    reflectance.length !== 4 ||
    illuminant.length !== 4 ||
    response.length !== 3 ||
    !Number.isInteger(samples) ||
    samples < 4 ||
    samples % 4
  )
    throw new RangeError("Invalid quadrature");
  const sums = [0, 0, 0],
    dlambda = 300 / samples;
  for (let n = 0; n < samples; n++) {
    const lambda = 400 + (n + 0.5) * dlambda,
      j = Math.min(3, Math.floor((lambda - 400) / 75)),
      h = reflectance[j] * illuminant[j];
    for (let k = 0; k < 3; k++) sums[k] += (h * response[k][j] * dlambda) / 75;
  }
  return sums;
}
export function cofactorNull(matrix = RESPONSE) {
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const q = Array.from(
      { length: 4 },
      (_, j) => (-1) ** j * det(matrix.map((r) => r.filter((_, k) => k !== j))),
    ),
    norm = Math.max(...q.map(Math.abs));
  if (!(norm > 0)) throw new RangeError("Response rank is below three");
  const sign = q.find((v) => v !== 0) < 0 ? -1 : 1;
  return q.map((v) => (sign * v) / norm);
}
