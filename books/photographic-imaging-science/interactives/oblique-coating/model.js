// Real, constant indices and propagating waves only. Characteristic matrices
// retain the book's +i convention; forward phase is exp(-i δ).
const add = (a, b) => [a[0] + b[0], a[1] + b[1]],
  mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  scale = (a, b) => [a[0] * b, a[1] * b];
const abs2 = (a) => a[0] * a[0] + a[1] * a[1],
  div = (a, b) => scale(mul(a, [b[0], -b[1]]), 1 / abs2(b));
export const MODES = ["bare", "single", "pair", "reverse", "six"];
export function parameters({
  angle = 45,
  wavelength = 550,
  index = 1.38,
  thicknessScale = 1,
  pFraction = 0.5,
  progress = 100,
  mode = "single",
} = {}) {
  for (const [v, lo, hi] of [
    [angle, 0, 75],
    [wavelength, 400, 700],
    [index, 1.1, 1.6],
    [thicknessScale, 0, 2],
    [pFraction, 0, 1],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid coating demonstration");
  return {
    angle,
    wavelength,
    index,
    thicknessScale,
    pFraction,
    progress,
    mode: MODES.includes(mode) ? mode : "single",
  };
}
export function layerDesign(input = {}) {
  const p = parameters(input);
  const ns =
    p.mode === "bare"
      ? []
      : p.mode === "single"
        ? [p.index]
        : Array.from({ length: p.mode === "six" ? 6 : 2 }, (_, i) =>
            i % 2 ? 1.7 : p.index,
          );
  if (p.mode === "reverse") ns.reverse();
  return ns.map((n) => ({ n, d: (550 / (4 * n)) * p.thicknessScale }));
}
function inputs({
  layers = [],
  angle = 0,
  wavelength = 550,
  n0 = 1,
  ns = 1.52,
} = {}) {
  if (
    ![wavelength, n0, ns].every((v) => Number.isFinite(v) && v > 0) ||
    !Number.isFinite(angle) ||
    angle < 0 ||
    angle >= 85 ||
    !Array.isArray(layers) ||
    layers.length > 16 ||
    layers.some(
      (l) =>
        !l ||
        !Number.isFinite(l.n) ||
        l.n <= 0 ||
        !Number.isFinite(l.d) ||
        l.d < 0,
    )
  )
    throw new RangeError("Invalid oblique layer system");
  const indices = [n0, ...layers.map((l) => l.n), ns],
    tangent = n0 * Math.sin((angle * Math.PI) / 180);
  const cosines = indices.map((n) => {
    const c2 = 1 - (tangent / n) ** 2;
    if (c2 <= 1e-14)
      throw new RangeError(
        "Critical, evanescent or grazing modes require a different model",
      );
    return Math.sqrt(c2);
  });
  return { layers, angle, wavelength, n0, ns, indices, cosines, tangent };
}
function multiply(a, b) {
  return [
    add(mul(a[0], b[0]), mul(a[1], b[2])),
    add(mul(a[0], b[1]), mul(a[1], b[3])),
    add(mul(a[2], b[0]), mul(a[3], b[2])),
    add(mul(a[2], b[1]), mul(a[3], b[3])),
  ];
}
// Tangential electric-field convention for both polarizations.
export function obliqueMatrix(input = {}, polarization = "s") {
  if (!["s", "p"].includes(polarization))
    throw new RangeError("Expected s or p");
  const p = inputs(input),
    Y = p.indices.map((n, j) =>
      polarization === "s" ? n * p.cosines[j] : n / p.cosines[j],
    );
  let matrix = [
    [1, 0],
    [0, 0],
    [0, 0],
    [1, 0],
  ];
  for (let j = 0; j < p.layers.length; j++) {
    const l = p.layers[j],
      delta = (2 * Math.PI * l.n * l.d * p.cosines[j + 1]) / p.wavelength,
      c = [Math.cos(delta), 0],
      s = Math.sin(delta),
      y = Y[j + 1];
    matrix = multiply(matrix, [c, [0, s / y], [0, y * s], c]);
  }
  const B = add(matrix[0], scale(matrix[1], Y.at(-1))),
    C = add(matrix[2], scale(matrix[3], Y.at(-1))),
    den = add(scale(B, Y[0]), C),
    r = div(add(scale(B, Y[0]), scale(C, -1)), den),
    t = div([2 * Y[0], 0], den);
  return {
    r,
    t,
    R: abs2(r),
    T: (Y.at(-1) / Y[0]) * abs2(t),
    matrix,
    admittances: Y,
    cosines: p.cosines,
    tangent: p.tangent,
  };
}
// Independent Fresnel recursion uses whole-vector E amplitudes (standard p
// basis follows propagation). Convert only the final amplitudes to tangential
// E before comparing to the characteristic matrix. No layer matrix is used.
export function fresnelRecursion(input = {}, polarization = "s") {
  if (!["s", "p"].includes(polarization))
    throw new RangeError("Expected s or p");
  const p = inputs(input),
    N = p.indices,
    c = p.cosines;
  const interfaceAt = (j) => {
    const ni = N[j],
      nf = N[j + 1],
      ci = c[j],
      cf = c[j + 1],
      den = polarization === "s" ? ni * ci + nf * cf : nf * ci + ni * cf;
    return {
      r: (polarization === "s" ? ni * ci - nf * cf : nf * ci - ni * cf) / den,
      t: (2 * ni * ci) / den,
    };
  };
  const last = interfaceAt(p.layers.length);
  let r = [last.r, 0],
    t = [last.t, 0];
  for (let j = p.layers.length - 1; j >= 0; j--) {
    const l = p.layers[j],
      delta = (2 * Math.PI * l.n * l.d * c[j + 1]) / p.wavelength,
      phase = [Math.cos(delta), -Math.sin(delta)],
      front = interfaceAt(j),
      round = mul(r, mul(phase, phase)),
      den = add([1, 0], scale(round, front.r));
    t = div(scale(mul(phase, t), front.t), den);
    r = div(add([front.r, 0], round), den);
  }
  return {
    r: polarization === "p" ? scale(r, -1) : r,
    t: polarization === "p" ? scale(t, c.at(-1) / c[0]) : t,
    R: abs2(r),
    T: ((p.ns * c.at(-1)) / (p.n0 * c[0])) * abs2(t),
  };
}
export function bareTruth(angle = 0, n0 = 1, ns = 1.52) {
  if (
    !Number.isFinite(angle) ||
    angle < 0 ||
    angle >= 85 ||
    ![n0, ns].every((v) => Number.isFinite(v) && v > 0)
  )
    throw new RangeError("Invalid Fresnel input");
  const i = (angle * Math.PI) / 180,
    sine = (n0 / ns) * Math.sin(i);
  if (sine >= 1) throw new RangeError("Total internal reflection not included");
  const t = Math.asin(sine),
    ci = Math.cos(i),
    ct = Math.cos(t),
    rs = (n0 * ci - ns * ct) / (n0 * ci + ns * ct),
    rp = (ns * ci - n0 * ct) / (ns * ci + n0 * ct),
    ts = (2 * n0 * ci) / (n0 * ci + ns * ct),
    tp = (2 * n0 * ci) / (ns * ci + n0 * ct),
    flux = (ns * ct) / (n0 * ci);
  return {
    s: { R: rs * rs, T: flux * ts * ts },
    p: { R: rp * rp, T: flux * tp * tp },
    brewster: (Math.atan(ns / n0) * 180) / Math.PI,
  };
}
export function coatingBudget(input = {}) {
  const p = parameters(input),
    layers = layerDesign(p),
    currentAngle = (p.angle * p.progress) / 100,
    optics = { layers, wavelength: p.wavelength, angle: currentAngle },
    s = obliqueMatrix(optics, "s"),
    q = obliqueMatrix(optics, "p"),
    sTruth = fresnelRecursion(optics, "s"),
    pTruth = fresnelRecursion(optics, "p"),
    error = Math.max(
      ...[s.r, s.t, q.r, q.t].flatMap((a, j) =>
        a.map((v, k) =>
          Math.abs(v - [sTruth.r, sTruth.t, pTruth.r, pTruth.t][j][k]),
        ),
      ),
    );
  return {
    ...p,
    currentAngle,
    layers,
    s,
    p: q,
    sTruth,
    pTruth,
    error,
    R: (1 - p.pFraction) * s.R + p.pFraction * q.R,
    T: (1 - p.pFraction) * s.T + p.pFraction * q.T,
    quarterPhase:
      550 *
      p.thicknessScale *
      Math.sqrt(1 - (Math.sin((currentAngle * Math.PI) / 180) / p.index) ** 2),
    bare: bareTruth(currentAngle),
  };
}
