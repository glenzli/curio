import { multiply, translation, lens } from "../paraxial/model.js";
export const F1 = 50,
  F2 = 75,
  STOP_RADIUS = 0.5;
function inputs(input = {}) {
  const p = {
    gap: 125,
    stop: 50,
    objectOffset: 0,
    imageOffset: 0,
    height: 2,
    ...input,
  };
  if (
    ![p.gap, p.stop, p.objectOffset, p.imageOffset, p.height].every(
      Number.isFinite,
    ) ||
    p.stop <= 0 ||
    p.stop >= p.gap ||
    F1 + p.objectOffset <= 0 ||
    F2 + p.imageOffset <= 0
  )
    throw new RangeError("Invalid relay, stop, or object/image plane");
  return p;
}
// Direct ray propagation through two thin positive groups. It does not read ABCD.
export function traceRelay(input = {}, angle = 0) {
  const p = inputs(input);
  if (!Number.isFinite(angle)) throw new RangeError("Invalid launch angle");
  const s = F1 + p.objectOffset,
    v = F2 + p.imageOffset;
  const y1 = p.height + s * angle,
    u1 = angle - y1 / F1;
  const atStop = y1 + p.stop * u1,
    y2 = y1 + p.gap * u1,
    u2 = u1 - y2 / F2;
  return { angle, y1, u1, atStop, y2, u2, image: y2 + v * u2 };
}
// Independent scalar construction using a chief ray through the stop centre.
// Pupil locations are signed z coordinates, referenced to lens 1 at z=0.
export function relayTruth(input = {}) {
  const p = inputs(input),
    s = F1 + p.objectOffset,
    v = F2 + p.imageOffset;
  const denominator = s + p.stop * (1 - s / F1);
  if (Math.abs(denominator) < 1e-10)
    throw new RangeError("Object and stop are conjugate; no unique chief ray");
  const launch = (-p.height * (1 - p.stop / F1)) / denominator;
  const after1 = launch - (p.height + s * launch) / F1;
  const y2 = (p.gap - p.stop) * after1;
  const after2 = after1 - y2 / F2,
    image = y2 + v * after2;
  const objectTelecentric = Math.abs(p.stop - F1) < 1e-9;
  const imageTelecentric = Math.abs(p.gap - p.stop - F2) < 1e-9;
  const entrance = objectTelecentric ? null : (F1 * p.stop) / (F1 - p.stop);
  const distance = p.gap - p.stop;
  const exit = imageTelecentric
    ? null
    : p.gap + (F2 * distance) / (distance - F2);
  return {
    launch,
    after2,
    image,
    objectTelecentric,
    imageTelecentric,
    entrance,
    exit,
    ratio: p.height === 0 ? null : image / p.height,
  };
}
export function relaySystem(input = {}) {
  const p = inputs(input),
    s = F1 + p.objectOffset,
    v = F2 + p.imageOffset;
  const first = multiply(lens(1 / F1), translation(s));
  const stopMatrix = multiply(translation(p.stop), first);
  if (Math.abs(stopMatrix[1]) < 1e-10)
    throw new RangeError("Object and stop are conjugate; no unique chief ray");
  const matrix = multiply(
    translation(v),
    multiply(lens(1 / F2), multiply(translation(p.gap), first)),
  );
  const rays = [-STOP_RADIUS, 0, STOP_RADIUS].map((target) =>
    traceRelay(p, (target - stopMatrix[0] * p.height) / stopMatrix[1]),
  );
  const chief = rays[1],
    span = Math.abs(rays[2].image - rays[0].image);
  const [A, B, C, D] = matrix;
  return {
    rays,
    chief,
    span,
    matrix,
    stopMatrix,
    determinant: A * D - B * C,
    ratio: p.height === 0 ? null : chief.image / p.height,
    truth: relayTruth(p),
  };
}
