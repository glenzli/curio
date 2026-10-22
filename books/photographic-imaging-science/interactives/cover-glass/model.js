// An ideal incident converging beam, not a physical perfect singlet. Air on both
// sides of a normal plane-parallel plate. Lengths in mm; no dispersion, losses,
// multiple reflections or diffraction. N specifies L/(2a), the incident cone.
export const FOCUS = 50;
export const PLATE_FRONT = 42;
export const RAY_COUNT = 81;
export const MODES = ["原像面", "近轴重新对焦", "最小子午RMS", "手动像面"];

export function parameters(input = {}) {
  const p = {
    thickness: 2,
    index: 1.52,
    fNumber: 1.4,
    focusMode: 0,
    sensorShift: 0,
    ...input,
  };
  for (const [v, lo, hi] of [
    [p.thickness, 0, 4],
    [p.index, 1, 1.9],
    [p.fNumber, 1.2, 8],
    [p.sensorShift, -0.1, 2.5],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw RangeError("Outside the declared plate/cone geometry");
  if (!Number.isInteger(p.focusMode) || !MODES[p.focusMode])
    throw RangeError("Unknown focus criterion");
  return p;
}

// Exact Snell geometry, stable also at i=0. tan(r)/tan(i) is rewritten without
// dividing two zero angles. The incident ray would meet the axis at z=L.
export function rayAt(height, input = {}) {
  const p = parameters(input);
  if (!Number.isFinite(height)) throw RangeError("Finite ray height required");
  const slope = -height / FOCUS,
    incidence = Math.atan(Math.abs(slope)),
    refraction = Math.asin(Math.sin(incidence) / p.index),
    ratio = 1 / Math.sqrt(p.index ** 2 + (p.index ** 2 - 1) * slope ** 2),
    glassSlope = slope * ratio,
    shift = p.thickness * (1 - ratio),
    atFront = height + PLATE_FRONT * slope,
    atBack = atFront + p.thickness * glassSlope;
  return {
    height,
    slope,
    incidence,
    refraction,
    glassSlope,
    shift,
    focus: FOCUS + shift,
    atFront,
    atBack,
    at: (z) => atBack + (z - PLATE_FRONT - p.thickness) * slope,
  };
}

// Independent direction-vector Snell construction, with an interface normal
// opposed to propagation. It never uses the focus-shift or tangent-ratio formula.
function refract(direction, normal, n1, n2) {
  const dot = direction.reduce((s, v, j) => s + v * normal[j], 0),
    cosine = -dot,
    eta = n1 / n2,
    transmittedCosine = Math.sqrt(1 - eta ** 2 * (1 - cosine ** 2));
  return direction.map(
    (v, j) => eta * v + (eta * cosine - transmittedCosine) * normal[j],
  );
}
export function vectorReference(height, input = {}) {
  const p = parameters(input),
    length = Math.hypot(FOCUS, height),
    incoming = [FOCUS / length, -height / length],
    inside = refract(incoming, [-1, 0], 1, p.index),
    outgoing = refract(inside, [-1, 0], p.index, 1),
    front = height + (PLATE_FRONT * incoming[1]) / incoming[0],
    back = front + (p.thickness * inside[1]) / inside[0];
  return {
    incoming,
    inside,
    outgoing,
    front,
    back,
    focus: height === 0 ? null : PLATE_FRONT + p.thickness - (back * outgoing[0]) / outgoing[1],
    at: (z) => back + ((z - PLATE_FRONT - p.thickness) * outgoing[1]) / outgoing[0],
  };
}

function spot(rays, shift) {
  const heights = rays.map((r) => r.at(FOCUS + shift)),
    mean = heights.reduce((s, y) => s + y, 0) / heights.length;
  return {
    heights,
    mean,
    rms: Math.sqrt(heights.reduce((s, y) => s + (y - mean) ** 2, 0) / heights.length),
    span: Math.max(...heights) - Math.min(...heights),
  };
}

export function plateExperiment(input = {}) {
  const p = parameters(input),
    radius = FOCUS / (2 * p.fNumber),
    rays = Array.from({ length: RAY_COUNT }, (_, j) =>
      rayAt(radius * (-1 + (2 * j) / (RAY_COUNT - 1)), p),
    ),
    paraxialShift = p.thickness * (1 - 1 / p.index),
    bestShift = rays.reduce((s, r) => s + r.slope ** 2 * r.shift, 0) /
      rays.reduce((s, r) => s + r.slope ** 2, 0),
    sensorShift = [0, paraxialShift, bestShift, p.sensorShift][p.focusMode],
    current = spot(rays, sensorShift),
    refocused = spot(rays, bestShift),
    references = rays.map((r) => vectorReference(r.height, p));
  return {
    p,
    radius,
    rays,
    paraxialShift,
    marginalShift: rays.at(-1).shift,
    bestShift,
    sensorShift,
    current,
    refocused,
    referenceError: Math.max(...references.map((r, j) =>
      Math.abs(r.at(FOCUS + sensorShift) - current.heights[j]),
    )),
  };
}
