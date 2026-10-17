// Thin lens/stop at z=0; geometrical blur only. Vergence in D=1/m.
export function parameters(input = {}) {
  const p = {
    focalLength: 35,
    fNumber: 4,
    criterionUm: 20,
    focusVergence: 0.2,
    subjectVergence: 0.2,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.focalLength <= 0 ||
    p.fNumber <= 0 ||
    p.criterionUm <= 0 ||
    p.focusVergence < 0 ||
    p.subjectVergence < 0 ||
    Math.max(p.focusVergence, p.subjectVergence) >= 1000 / p.focalLength ||
    p.criterionUm / 1000 >= p.focalLength / p.fNumber
  )
    throw new RangeError(
      "Requires real thin-lens objects, positive aperture and a circle smaller than the aperture",
    );
  return p;
}

// The primary route traces the two physical aperture edges; no analytic blur
// equation or hyperfocal distance is used here or by the numerical limits.
export function tracedBlur(input = {}, subjectVergence) {
  const p = parameters(input),
    w = subjectVergence ?? p.subjectVergence;
  if (!Number.isFinite(w) || w < 0 || w >= 1000 / p.focalLength)
    throw new RangeError("Invalid object vergence");
  const sensor = 1 / (1 / p.focalLength - p.focusVergence / 1000),
    radius = p.focalLength / (2 * p.fNumber);
  const ray = (h) => h + sensor * ((h * w) / 1000 - h / p.focalLength);
  const lower = ray(-radius),
    upper = ray(radius);
  return { sensor, lower, upper, diameter: Math.abs(upper - lower) };
}

function zero(fn, l, r) {
  let a = fn(l);
  for (let i = 0; i < 70; i++) {
    const m = (l + r) / 2,
      b = fn(m);
    if (a * b <= 0) r = m;
    else {
      l = m;
      a = b;
    }
  }
  return (l + r) / 2;
}

export function numericalLimits(input = {}) {
  const p = parameters(input),
    fn = (w) => tracedBlur(p, w).diameter - p.criterionUm / 1000;
  const nearVergence = zero(
    fn,
    p.focusVergence,
    (1000 / p.focalLength) * (1 - 1e-10),
  );
  const farVergence = fn(0) <= 1e-12 ? 0 : zero(fn, 0, p.focusVergence);
  // Independently find the focus setting at which infinity is just acceptable.
  const hyperVergence = zero(
    (w) =>
      tracedBlur({ ...p, focusVergence: w }, 0).diameter - p.criterionUm / 1000,
    0,
    (1000 / p.focalLength) * (1 - 1e-10),
  );
  return {
    near: 1000 / nearVergence,
    far: farVergence === 0 ? null : 1000 / farVergence,
    nearVergence,
    farVergence,
    hyperfocal: 1000 / hyperVergence,
  };
}

export function depthTruth(input = {}) {
  const p = parameters(input),
    f = p.focalLength,
    N = p.fNumber,
    c = p.criterionUm / 1000,
    H = (f * f) / (N * c) + f;
  if (p.focusVergence === 0)
    return { hyperfocal: H, near: (f * f) / (N * c), far: null };
  const s = 1000 / p.focusVergence;
  return {
    hyperfocal: H,
    near: ((H - f) * s) / (H + s - 2 * f),
    far: s >= H ? null : ((H - f) * s) / (H - s),
  };
}

export function depthOfField(input = {}) {
  const p = parameters(input),
    geometry = tracedBlur(p),
    limits = numericalLimits(p),
    truth = depthTruth(p);
  const f = p.focalLength,
    N = p.fNumber,
    w = p.subjectVergence / 1000,
    w0 = p.focusVergence / 1000;
  const analyticBlur = (f * f * Math.abs(w - w0)) / (N * (1 - f * w0));
  return {
    p,
    ...geometry,
    limits,
    truth,
    analyticBlur,
    acceptable: geometry.diameter <= p.criterionUm / 1000 + 1e-12,
  };
}
