import { parameters, radialLimit, WAVELENGTH } from "./model.js";
import { diskAmplitude } from "../wave/circle-reference.js";
export const IMAGE_SIZE = 257,
  IMAGE_STEP = 177.1 / IMAGE_SIZE;
const sinc = (x) =>
  Math.abs(x) < 1e-6 ? 1 - (x * x) / 6 + x ** 4 / 120 : Math.sin(x) / x;
function sincMinusOne(x) {
  return Math.abs(x) < 0.1
    ? (-x * x) / 6 + x ** 4 / 120 - x ** 6 / 5040 + x ** 8 / 362880
    : sinc(x) - 1;
}
export function exactArea(input = {}) {
  const p = parameters(input),
    a = Math.PI / p.blades,
    c = Math.cos(a),
    t = p.roundness;
  return (
    p.blades *
    ((1 - t) ** 2 * c * c * Math.tan(a) +
      2 * t * (1 - t) * c * Math.log(1 / c + Math.tan(a)) +
      t * t * a)
  );
}
export function contour(input = {}, segments = 32) {
  const p = parameters(input),
    n = p.blades * (p.roundness === 0 ? 1 : segments),
    offset = (p.rotation * Math.PI) / 180 + Math.PI / p.blades;
  const vertices = Array.from({ length: n }, (_, i) => {
    const a = offset + (2 * Math.PI * i) / n,
      r = radialLimit(p, a);
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  let area = 0;
  const edges = vertices.map((a, i) => {
    const b = vertices[(i + 1) % n];
    area += (a[0] * b[1] - a[1] * b[0]) / 2;
    return {
      x: (a[0] + b[0]) / 2,
      y: (a[1] + b[1]) / 2,
      dx: b[0] - a[0],
      dy: b[1] - a[1],
    };
  });
  return { p, vertices, edges, area: p.roundness === 1 ? Math.PI : area };
}
// Integral exp(-i*pi*q.r) over a CCW polygon. Divergence theorem reduces the
// area integral to exact line integrals, including a stable removable q=0 limit.
export function boundaryAmplitude(shape, qx, qy) {
  const kx = Math.PI * qx,
    ky = Math.PI * qy,
    k2 = kx * kx + ky * ky;
  if (shape.p.roundness === 1)
    return [Math.PI * diskAmplitude(Math.hypot(qx, qy)), 0];
  if (k2 === 0) return [shape.area, 0];
  let re = 0,
    im = 0;
  for (const e of shape.edges) {
    const mid = kx * e.x + ky * e.y,
      half = (kx * e.dx + ky * e.dy) / 2,
      cross = kx * e.dy - ky * e.dx,
      s = sinc(half);
    re += cross * s * Math.sin(mid);
    im += cross * (-2 * Math.sin(mid / 2) ** 2 * s + sincMinusOne(half));
  }
  return [re / k2, im / k2];
}
export function boundaryDensity(shape, qx, qy) {
  const z = boundaryAmplitude(shape, qx, qy),
    scale = WAVELENGTH * shape.p.fNumber;
  return (z[0] ** 2 + z[1] ** 2) / (4 * scale * scale * shape.area);
}
export function continuousPsf(input = {}) {
  const shape = contour(input),
    scale = WAVELENGTH * shape.p.fNumber,
    half = (IMAGE_SIZE - 1) / 2,
    crop = new Float64Array(IMAGE_SIZE ** 2),
    radial = new Map();
  let energy = 0;
  for (let y = 0; y <= half; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      if (y === half && x > half) continue;
      const dx = x - half,
        dy = y - half,
        k = y * IMAGE_SIZE + x;
      let value;
      if (shape.p.roundness === 1) {
        const r2 = dx * dx + dy * dy;
        if (!radial.has(r2))
          radial.set(
            r2,
            boundaryDensity(shape, (Math.sqrt(r2) * IMAGE_STEP) / scale, 0),
          );
        value = radial.get(r2);
      } else
        value = boundaryDensity(
          shape,
          (dx * IMAGE_STEP) / scale,
          (-dy * IMAGE_STEP) / scale,
        );
      crop[k] = crop[crop.length - 1 - k] = value;
    }
  for (const value of crop) energy += value * IMAGE_STEP ** 2;
  return {
    p: shape.p,
    shape,
    area: shape.area,
    exactArea: exactArea(input),
    crop,
    retained: energy,
    step: IMAGE_STEP,
  };
}
