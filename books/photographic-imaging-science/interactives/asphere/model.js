export function sag(r, { radius = 50, conic = -1, a4 = -1e-6 } = {}) {
  if (![r, radius, conic, a4].every(Number.isFinite) || radius <= 0 || r < 0)
    throw RangeError("Invalid sag units");
  const c = 1 / radius,
    q = 1 - (1 + conic) * c * c * r * r;
  if (q <= 0)
    throw RangeError("Sag derivative is singular or outside real surface");
  return {
    z: (c * r * r) / (1 + Math.sqrt(q)) + a4 * r ** 4,
    slope: (c * r) / Math.sqrt(q) + 4 * a4 * r ** 3,
  };
}
export function asphere({
  radius = 50,
  conic = -1,
  a4 = -1,
  aperture = 12,
} = {}) {
  if (!Number.isFinite(aperture) || aperture <= 0)
    throw RangeError("Positive semidiameter required");
  const p = { radius, conic, a4: a4 * 1e-6 },
    at = (r) => {
      const a = sag(r, p),
        b = sag(r, { radius, conic: 0, a4: 0 });
      return {
        asphere: a,
        sphere: b,
        departure: (a.z - b.z) * 1000,
        slopeDifference: a.slope - b.slope,
      };
    };
  const edge = at(aperture),
    h = aperture * 1e-5,
    numericalSlope =
      (sag(aperture + h, p).z - sag(aperture - h, p).z) / (2 * h);
  return { at, edge, numericalSlope };
}
