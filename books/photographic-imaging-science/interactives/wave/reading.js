import { circularOtf, phasorTrace, otfAt, directCorrelation } from "./model.js";
export const HALF_FIELD_UM = 24,
  REFERENCE_SCALE_UM = 4.4,
  FOCAL_MM = 50;
export const REFERENCE_PEAK = Math.PI / (4 * REFERENCE_SCALE_UM ** 2);
export function readingPoint(g, state, aberrations = false) {
  const probeUm = aberrations ? g.scaleUm : state.probeUm,
    q = probeUm / g.scaleUm;
  const trace = phasorTrace(g, q),
    full = trace.at(-1);
  const fraction = aberrations
      ? 1
      : Math.max(0, Math.min(1, state.sumProgress ?? 1)),
    strips = Math.min(32, Math.floor(fraction * 32 + 1e-10)),
    partial = trace[strips];
  const frequency = aberrations ? state.rho * g.cutoff : state.frequencyLpMm,
    rho = frequency / g.cutoff;
  const shift = Math.max(
      0,
      Math.min(g.p.diameter, Math.round(rho * g.p.diameter)),
    ),
    sampleRho = shift / g.p.diameter;
  const sampled = otfAt(g, shift),
    direct = directCorrelation(g, shift),
    h = aberrations ? sampled : [circularOtf(rho), 0];
  return {
    probeUm,
    q,
    trace,
    full,
    partial,
    strips,
    fraction,
    frequency,
    rho,
    shift,
    sampleRho,
    sampled,
    direct,
    h,
    diameterMm: FOCAL_MM / g.p.fNumber,
    airyRadiusUm: 1.2196698912665 * g.scaleUm,
  };
}
// Version 1 stored relative probe coordinates and a four-stage percentage.
// Preserve their physical meaning when moving to the dedicated strip animation.
export function migrateWaveSession(saved, aberrations = false) {
  if (!saved || saved.version !== 1 || !saved.parameters) return saved;
  const p = { ...saved.parameters },
    scale =
      (Number.isFinite(p.fNumber) ? p.fNumber : 8) *
      (Number.isFinite(p.wavelengthNm) ? p.wavelengthNm : 550) *
      0.001;
  if (!aberrations) {
    p.probeUm = (Number.isFinite(p.probe) ? p.probe : 1) * scale;
    p.frequencyLpMm = ((Number.isFinite(p.rho) ? p.rho : 0.5) * 1000) / scale;
    p.sumProgress =
      Number.isFinite(p.progress) && p.progress < 50
        ? Math.max(0, (p.progress - 25) / 25)
        : 1;
    delete p.probe;
    delete p.rho;
    delete p.progress;
  }
  return { ...saved, version: 2, parameters: p };
}
export function migratingSession(session, aberrations) {
  return session
    ? {
        load: () => migrateWaveSession(session.load(), aberrations),
        save: (value) => session.save(value),
        describe: (fn) => session.describe(fn),
      }
    : undefined;
}
