import { multiply, translation, lens } from "../paraxial/model.js";

// Three thin groups in air: +10, -20, +20 D; detector fixed at z = 200 mm.
export const SENSOR = 200;
export const TRAVEL = [90, 190];
function inputs(input = {}) {
  const p = { variator: 20, compensator: 150, auto: false, ...input };
  if (
    ![p.variator, p.compensator].every(Number.isFinite) ||
    p.variator < 10 ||
    p.variator > 70 ||
    p.compensator < TRAVEL[0] ||
    p.compensator > TRAVEL[1] ||
    typeof p.auto !== "boolean"
  )
    throw new RangeError("Invalid zoom position or mode");
  return p;
}
export function zoomMatrix(input = {}) {
  const p = inputs(input);
  return multiply(
    lens(0.02),
    multiply(
      translation(p.compensator - p.variator),
      multiply(lens(-0.02), multiply(translation(p.variator), lens(0.01))),
    ),
  );
}
// Direct paraxial kicks and translations, independent of matrix multiplication.
export function traceZoom(input = {}, height = 1, angle = 0) {
  const p = inputs(input);
  if (![height, angle].every(Number.isFinite))
    throw new RangeError("Invalid ray");
  const u1 = angle - 0.01 * height;
  const y2 = height + p.variator * u1;
  const u2 = u1 + 0.02 * y2;
  const y3 = y2 + (p.compensator - p.variator) * u2;
  const u3 = u2 - 0.02 * y3;
  return {
    height,
    angle,
    u1,
    y2,
    u2,
    y3,
    u3,
    detector: y3 + (SENSOR - p.compensator) * u3,
  };
}

// Independent analytic truth. For a unit-height parallel ray:
// a = 1-.01v, b = -.01+.02a, k = a-bv;
// h(S) = k+bS-.02(S-c)(k+bc), a quadratic in c (linear when b=0).
export function compensationTruth(variator) {
  inputs({ variator });
  const a = 1 - 0.01 * variator,
    b = -0.01 + 0.02 * a,
    k = a - b * variator;
  const A = 0.02 * b,
    B = 0.02 * (k - SENSOR * b),
    C = k + SENSOR * b - 0.02 * SENSOR * k;
  let roots;
  if (Math.abs(A) < 1e-14) roots = Math.abs(B) < 1e-14 ? [] : [-C / B];
  else {
    const discriminant = B * B - 4 * A * C;
    if (discriminant < 0) roots = [];
    else {
      const q = -0.5 * (B + (B < 0 ? -1 : 1) * Math.sqrt(discriminant));
      roots = q === 0 ? [-B / (2 * A)] : [q / A, C / q];
    }
  }
  return [
    ...new Set(roots.filter((c) => c >= TRAVEL[0] && c <= TRAVEL[1])),
  ].sort((a, b) => a - b);
}

// The operational solver reads ONLY direct ray heights, not analytic roots or ABCD.
export function solveCompensation(variator) {
  inputs({ variator });
  const f = (compensator) => traceZoom({ variator, compensator }).detector;
  let left = TRAVEL[0],
    fl = f(left);
  if (Math.abs(fl) < 1e-13) return left;
  for (let j = 1; j <= 200; j++) {
    let right = TRAVEL[0] + ((TRAVEL[1] - TRAVEL[0]) * j) / 200,
      fr = f(right);
    if (Math.abs(fr) < 1e-13) return right;
    if (fl * fr < 0) {
      for (let i = 0; i < 48; i++) {
        const mid = (left + right) / 2,
          fm = f(mid);
        if (fl * fm <= 0) right = mid;
        else {
          left = mid;
          fl = fm;
        }
      }
      return (left + right) / 2;
    }
    left = right;
    fl = fr;
  }
  return null;
}

export function zoomSystem(input = {}) {
  const p = inputs(input),
    solved = solveCompensation(p.variator);
  const active = {
    ...p,
    compensator: p.auto && solved !== null ? solved : p.compensator,
  };
  const matrix = zoomMatrix(active),
    [A, B, C, D] = matrix;
  const detectorMatrix = multiply(
    translation(SENSOR - active.compensator),
    matrix,
  );
  const rays = [-0.5, -0.25, 0, 0.25, 0.5].map((h) => traceZoom(active, h));
  const spread =
    Math.max(...rays.map((r) => r.detector)) -
    Math.min(...rays.map((r) => r.detector));
  const imageZ = Math.abs(C) < 1e-12 ? null : active.compensator - A / C;
  return {
    active,
    solved,
    analytic: compensationTruth(p.variator),
    matrix,
    detectorMatrix,
    rays,
    focalLength: Math.abs(C) < 1e-12 ? null : -1 / C,
    imageZ,
    spread,
    determinant: A * D - B * C,
    compensated: p.auto && solved !== null,
  };
}
