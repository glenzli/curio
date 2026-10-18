import { focusSystem, trace as focusTrace } from "../floating/model.js";
import { zoomSystem, traceZoom } from "../zoom/model.js";

export const RADIAL_ENLARGEMENT = 16;
// Keep the original ray solvers and their separate analytic references canonical.
// Only this projection supplies the coordinates used in the 3D and static views.
function bundle(v, c, trace) {
  return Array.from({ length: 12 }, (_, i) => {
    const phi = (2 * Math.PI * i) / 12,
      r = trace(0.5);
    return [
      [0, r.height],
      [v, r.y2],
      [c, r.y3],
      [200, r.detector],
    ].map(([x, y]) => [
      x,
      RADIAL_ENLARGEMENT * y * Math.cos(phi),
      RADIAL_ENLARGEMENT * y * Math.sin(phi),
    ]);
  });
}
function common(m, active, trace) {
  const paths = bundle(active.v, active.c, trace);
  return {
    source: m,
    groups: [0, active.v, active.c],
    sensor: 200,
    powers: [10, -20, 20],
    paths,
    spread: m.spread,
    focalLength: m.focalLength,
    radialEnlargement: RADIAL_ENLARGEMENT,
    detectorDiameter:
      Math.max(...paths.map((p) => Math.hypot(p[3][1], p[3][2]))) * 2,
  };
}
export function focusingFrame({ vergence = 1, coordinated = 1 } = {}) {
  if (
    !Number.isFinite(vergence) ||
    vergence < 0 ||
    vergence > 2.5 ||
    ![0, 1].includes(coordinated)
  )
    throw new RangeError("Invalid focusing frame");
  const m = focusSystem({ vergence, mode: coordinated ? "floating" : "rear" });
  const result = common(m, m.active, (h) =>
    focusTrace(m.active.v, m.active.c, h, (h * vergence) / 1000),
  );
  const roots = coordinated ? m.truth : [];
  const [A, B] = m.detector;
  const reference = roots.length
    ? Math.min(
        ...roots.map((p) => Math.hypot(p.v - m.active.v, p.c - m.active.c)),
      )
    : Math.abs(m.focusResidual - (A + (B * vergence) / 1000));
  return {
    ...result,
    vergence,
    coordinated,
    solved: m.solved !== null,
    scale: m.scale,
    breathingPercent: m.breathingPercent,
    referenceError: reference,
    referenceKind: roots.length ? "positions" : "residual",
    halt: m.solved === null,
  };
}
export function zoomingFrame({
  variator = 35,
  compensate = 1,
  compensator = 150,
} = {}) {
  if (![0, 1].includes(compensate))
    throw new RangeError("Invalid compensation mode");
  const m = zoomSystem({ variator, compensator, auto: Boolean(compensate) });
  const result = common(
    m,
    { v: m.active.variator, c: m.active.compensator },
    (h) => traceZoom(m.active, h),
  );
  return {
    ...result,
    variator,
    compensate,
    solved: m.solved !== null,
    compensated: m.compensated,
    imageZ: m.imageZ,
    referenceError:
      m.solved !== null && m.analytic.length
        ? Math.min(...m.analytic.map((x) => Math.abs(x - m.solved)))
        : null,
    halt: Boolean(compensate) && m.solved === null,
  };
}
