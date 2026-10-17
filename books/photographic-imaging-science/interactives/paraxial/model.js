// Air on both sides; ray [y, theta], y and all axial distances in mm, theta in radians.
export function multiply(a, b) {
  return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
}
export const translation = (distance) => [1, distance, 0, 1];
export const lens = (powerPerMm) => [1, 0, -powerPerMm, 1];
const EPS = 1e-12;
function inputs(input = {}) {
  const p = { power1: 10, power2: -10, gap: 50, objectDistance: 1000, sensor: 150, finite: false, ...input };
  if (![p.power1, p.power2, p.gap, p.objectDistance, p.sensor].every(Number.isFinite)
      || p.gap < 0 || p.objectDistance <= 0 || p.sensor < p.gap)
    throw new RangeError("Invalid lens system; the sensor must be at or beyond group 2");
  return p;
}
export function systemMatrix(input = {}) {
  const p = inputs(input), p1 = p.power1 / 1000, p2 = p.power2 / 1000;
  return multiply(lens(p2), multiply(translation(p.gap), lens(p1)));
}

// This path applies angle kicks and straight translations directly. It does NOT
// call systemMatrix/multiply; the diagram and reference intersection share this trace.
export function traceRay(input, height, angle) {
  const p = inputs(input);
  if (![height, angle].every(Number.isFinite)) throw new RangeError("Invalid incident ray");
  const after1 = angle - p.power1 * height / 1000;
  const height2 = height + p.gap * after1;
  const after2 = after1 - p.power2 * height2 / 1000;
  const sensorHeight = height2 + (p.sensor - p.gap) * after2;
  return { height, angle, after1, height2, after2, sensorHeight };
}

export function lensSystem(input = {}) {
  const p = inputs(input), matrix = systemMatrix(p), [A, B, C, D] = matrix;
  const afocal = Math.abs(C) < EPS;
  const focalLength = afocal ? null : -1 / C;
  const bfd = afocal ? null : -A / C;
  const H1 = afocal ? null : focalLength * (1 - D);
  const H2 = afocal ? null : p.gap - focalLength * (1 - A);
  const numerator = p.finite ? A * p.objectDistance + B : A;
  const denominator = p.finite ? C * p.objectDistance + D : C;
  const imageDistance = Math.abs(denominator) < EPS ? null : -numerator / denominator;
  const magnification = !p.finite || imageDistance === null ? null : A + imageDistance * C;
  const heights = [-0.5, -0.25, 0, 0.25, 0.5], objectHeight = 0.25;
  const rays = heights.map((height) => traceRay(p, height, p.finite ? (height - objectHeight) / p.objectDistance : 0));
  const a = rays[0], b = rays.at(-1), difference = b.after2 - a.after2;
  const tracedDistance = Math.abs(difference) < EPS ? null : -(b.height2 - a.height2) / difference;
  const imageHeight = tracedDistance === null ? null : a.height2 + tracedDistance * a.after2;
  const sensorHeights = rays.map((r) => r.sensorHeight);
  const sensorSpread = Math.max(...sensorHeights) - Math.min(...sensorHeights);
  const analyticPower = p.power1 + p.power2 - p.gap * p.power1 * p.power2 / 1000;
  const maxAngle = Math.max(...rays.flatMap((r) => [Math.abs(r.angle), Math.abs(r.after1), Math.abs(r.after2)]));
  return { matrix, determinant: A * D - B * C, afocal, focalLength, bfd, H1, H2,
    imageDistance, magnification, tracedDistance, imageHeight, sensorSpread, rays,
    analyticPower, matrixPower: -1000 * C, maxAngle, objectHeight };
}
