// Parallel circular pupil and receiver, uniform radiance, no occlusion.
// Integrals below are E/(T L), in sr. Relative illumination is dimensionless.
export function parameters({
  angle = 45,
  radiusRatio = 0.05,
  progress = 100,
} = {}) {
  for (const [v, lo, hi] of [
    [angle, 0, 65],
    [radiusRatio, 0.005, 0.35],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid off-axis geometry");
  return { angle, radiusRatio, progress };
}
function geometry(a, h, z) {
  if (![a, h, z].every(Number.isFinite) || a < 0 || z <= 0)
    throw new RangeError("Invalid pupil or receiver");
}
// Direct equal-area polar midpoint quadrature of z² / |P-Q|⁴ dA.
export function diskIntegral(a, h, z = 1, radial = 64, azimuth = 128) {
  geometry(a, h, z);
  if (
    !Number.isInteger(radial) ||
    !Number.isInteger(azimuth) ||
    radial < 2 ||
    azimuth < 8
  )
    throw new RangeError("Invalid quadrature");
  let sum = 0;
  for (let j = 0; j < radial; j++) {
    const r = a * Math.sqrt((j + 0.5) / radial);
    for (let k = 0; k < azimuth; k++) {
      const phi = (2 * Math.PI * (k + 0.5)) / azimuth,
        squared =
          z * z + (r * Math.cos(phi) - h) ** 2 + (r * Math.sin(phi)) ** 2;
      sum += (z * z) / (squared * squared);
    }
  }
  return (Math.PI * a * a * sum) / (radial * azimuth);
}
// Independent closed boundary integral of the disk, rationalized to avoid
// subtracting nearly equal values for a small pupil. No numerical quadrature.
export function diskTruth(a, h, z = 1) {
  geometry(a, h, z);
  if (a === 0) return 0;
  const A = z * z + h * h + a * a,
    N = z * z + h * h - a * a,
    D = Math.sqrt(A * A - 4 * a * a * h * h);
  return N >= 0
    ? (2 * Math.PI * z * z * a * a) / (D * (D + N))
    : (Math.PI * (1 - N / D)) / 2;
}
// A third route: integrate azimuth analytically, then Simpson-integrate radius.
export function radialTruth(a, h, z = 1, steps = 512) {
  geometry(a, h, z);
  if (!Number.isInteger(steps) || steps < 2 || steps % 2)
    throw new RangeError("Even radial grid required");
  const f = (r) => {
    const A = z * z + h * h + r * r,
      B = 2 * r * h;
    return (2 * Math.PI * z * z * r * A) / (A * A - B * B) ** 1.5;
  };
  let sum = f(0) + f(a);
  for (let j = 1; j < steps; j++) sum += (j % 2 ? 4 : 2) * f((a * j) / steps);
  return (a / steps / 3) * sum;
}
export function illumination(input = {}) {
  const p = parameters(input),
    theta = (p.angle * Math.PI) / 180,
    c = Math.cos(theta),
    h = Math.tan(theta),
    a = p.radiusRatio,
    integral = diskIntegral(a, h),
    axis = diskIntegral(a, 0),
    truth = diskTruth(a, h) / diskTruth(a, 0);
  return {
    ...p,
    cosine: c,
    projection: c,
    distance: c * c,
    receiver: c,
    smallPupil: c ** 4,
    integral,
    axis,
    relative: integral / axis,
    truth,
    heightMm: 60 * h,
    radiusMm: 60 * a,
    distanceMm: 60 / c,
  };
}
