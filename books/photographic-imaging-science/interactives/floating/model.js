import { multiply, translation, lens } from "../paraxial/model.js";

// Air, mm, radians. First group/entrance stop z=0; detector z=200 mm.
// The two moving groups supply first-order focus and angular-scale constraints.
// This is NOT an aberration correction or a real floating lens prescription.
export const SENSOR = 200;
export const REFERENCE_SCALE = 100;
const POWERS = [0.01, -0.02, 0.02];
const V_MIN = 10,
  V_MAX = 70,
  C_MIN = 90,
  C_MAX = 190;

function valid(v, c, vergence = 0) {
  if (
    ![v, c, vergence].every(Number.isFinite) ||
    v < V_MIN ||
    v > V_MAX ||
    c < C_MIN ||
    c > C_MAX ||
    c <= v ||
    vergence < 0 ||
    vergence > 3
  )
    throw new RangeError(
      "Moving groups or object vergence outside the declared travel",
    );
}

export function trace(v, c, height, angle) {
  valid(v, c);
  if (![height, angle].every(Number.isFinite))
    throw new RangeError("Invalid ray");
  const u1 = angle - POWERS[0] * height;
  const y2 = height + v * u1;
  const u2 = u1 - POWERS[1] * y2;
  const y3 = y2 + (c - v) * u2;
  const u3 = u2 - POWERS[2] * y3;
  return {
    height,
    angle,
    y2,
    y3,
    u1,
    u2,
    u3,
    detector: y3 + (SENSOR - c) * u3,
  };
}

export function matrices(v, c) {
  valid(v, c);
  const system = multiply(
    lens(POWERS[2]),
    multiply(
      translation(c - v),
      multiply(lens(POWERS[1]), multiply(translation(v), lens(POWERS[0]))),
    ),
  );
  return { system, detector: multiply(translation(SENSOR - c), system) };
}

// Unit entrance height from an on-axis finite point; vergence is 1000/s in D.
const focusResidual = (v, c, vergence) =>
  trace(v, c, 1, vergence / 1000).detector;
const angularScale = (v, c) => trace(v, c, 0, 1).detector;

function bracketRoot(fn, lo, hi) {
  let left = lo,
    a = fn(left);
  if (Math.abs(a) < 1e-12) return left;
  for (let i = 1; i <= 200; i++) {
    const right = lo + ((hi - lo) * i) / 200,
      b = fn(right);
    if (Math.abs(b) < 1e-12) return right;
    if (a * b < 0) {
      let l = left,
        r = right,
        fl = a;
      for (let j = 0; j < 60; j++) {
        const m = (l + r) / 2,
          fm = fn(m);
        if (fl * fm <= 0) r = m;
        else {
          l = m;
          fl = fm;
        }
      }
      return (l + r) / 2;
    }
    left = right;
    a = b;
  }
  return null;
}

// Two-variable damped Newton solver. It reads only direct ray heights, never
// the matrix or analytic reference. A failed travel stops at an explicit null.
export function solveFloating(vergence) {
  valid(50, 150, vergence);
  let v = 50,
    c = 150;
  const residual = (x, y) => [
    focusResidual(x, y, vergence),
    (angularScale(x, y) - REFERENCE_SCALE) / REFERENCE_SCALE,
  ];
  for (let iteration = 0; iteration < 35; iteration++) {
    const f = residual(v, c),
      norm = Math.hypot(...f);
    if (norm < 1e-11) return { v, c, iterations: iteration };
    const h = 1e-3,
      vPlus = Math.min(V_MAX, v + h),
      vMinus = Math.max(V_MIN, v - h),
      cPlus = Math.min(C_MAX, c + h),
      cMinus = Math.max(C_MIN, c - h),
      vp = residual(vPlus, c),
      vm = residual(vMinus, c),
      cp = residual(v, cPlus),
      cm = residual(v, cMinus);
    const a = (vp[0] - vm[0]) / (vPlus - vMinus),
      b = (cp[0] - cm[0]) / (cPlus - cMinus),
      d = (vp[1] - vm[1]) / (vPlus - vMinus),
      e = (cp[1] - cm[1]) / (cPlus - cMinus),
      det = a * e - b * d;
    if (Math.abs(det) < 1e-14) return null;
    const dv = (-e * f[0] + b * f[1]) / det,
      dc = (d * f[0] - a * f[1]) / det;
    let accepted = false;
    for (let gain = 1; gain >= 1 / 1024; gain /= 2) {
      const nv = Math.max(V_MIN, Math.min(V_MAX, v + gain * dv)),
        nc = Math.max(C_MIN, Math.min(C_MAX, c + gain * dc));
      if (nc <= nv) continue;
      if (Math.hypot(...residual(nv, nc)) < norm) {
        v = nv;
        c = nc;
        accepted = true;
        break;
      }
    }
    if (!accepted) return null;
  }
  return null;
}

// Independent elimination: require B=K, A=-K/s. U is the matrix excluding L1.
// q=1-p3(S-c)=AU(1-p2*v)+p2*K. Substitution gives this quadratic in v.
export function floatingTruth(vergence) {
  valid(50, 150, vergence);
  const [p1, p2, p3] = POWERS,
    K = REFERENCE_SCALE,
    AU = K * (p1 - vergence / 1000);
  const q0 = AU + p2 * K,
    qv = -p2 * AU,
    c0 = SENSOR + (q0 - 1) / p3,
    c1 = qv / p3,
    t0 = (1 - q0) / p3,
    t1 = -qv / p3;
  const a = -p2 * qv * (c1 - 1),
    b = qv - p2 * (q0 * (c1 - 1) + qv * c0 + t1),
    z = q0 - p2 * (q0 * c0 + t0) - AU;
  let roots = [];
  if (Math.abs(a) < 1e-14) {
    if (Math.abs(b) > 1e-14) roots = [-z / b];
  } else {
    const disc = b * b - 4 * a * z;
    if (disc >= 0) {
      const q = -0.5 * (b + Math.sign(b || 1) * Math.sqrt(disc));
      roots = q === 0 ? [-b / (2 * a)] : [q / a, z / q];
    }
  }
  return roots
    .map((v) => ({ v, c: c0 + c1 * v }))
    .filter(
      (p) =>
        p.v >= V_MIN &&
        p.v <= V_MAX &&
        p.c >= C_MIN &&
        p.c <= C_MAX &&
        p.c > p.v,
    )
    .sort((a, b) => a.v - b.v);
}

export function focusSystem(input = {}) {
  const {
    vergence = 1,
    mode = "rear",
    manualV = 50,
    manualC = 150,
    directionMrad = 5,
  } = input;
  valid(manualV, manualC, vergence);
  if (
    !["rear", "floating", "manual"].includes(mode) ||
    !Number.isFinite(directionMrad) ||
    Math.abs(directionMrad) > 20
  )
    throw new RangeError("Invalid focus mode or ray direction");
  const solved =
    mode === "floating"
      ? solveFloating(vergence)
      : mode === "rear"
        ? (() => {
            const c = bracketRoot(
              (x) => focusResidual(50, x, vergence),
              C_MIN,
              C_MAX,
            );
            return c === null ? null : { v: 50, c };
          })()
        : null;
  const active = solved ?? { v: manualV, c: manualC };
  const { v, c } = active,
    { system, detector } = matrices(v, c);
  const rays = [-0.5, -0.25, 0, 0.25, 0.5].map((h) =>
    trace(v, c, h, (h * vergence) / 1000),
  );
  const spread =
    Math.max(...rays.map((r) => r.detector)) -
    Math.min(...rays.map((r) => r.detector));
  const scale = angularScale(v, c),
    f = -1 / system[2];
  const chief = trace(v, c, 0, directionMrad / 1000);
  return {
    active,
    mode,
    solved,
    vergence,
    rays,
    spread,
    scale,
    focalLength: f,
    chief,
    breathingPercent: 100 * (scale / REFERENCE_SCALE - 1),
    system,
    detector,
    focusResidual: focusResidual(v, c, vergence),
    truth: floatingTruth(vergence),
    determinant: system[0] * system[3] - system[1] * system[2],
  };
}
