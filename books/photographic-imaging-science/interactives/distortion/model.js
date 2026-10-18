export function radialMap(x, y, k = -0.12) {
  const r2 = x * x + y * y,
    f = 1 + k * r2;
  return [x * f, y * f];
}
export function inverseRadius(r, k = -0.12) {
  if (
    !Number.isFinite(r) ||
    r < 0 ||
    !Number.isFinite(k) ||
    k < -0.15 ||
    k > 0.15
  )
    throw RangeError("Outside monotonic teaching domain");
  const max = Math.SQRT2,
    mapped = max * (1 + k * max * max);
  if (r > mapped + 1e-12) return null;
  let lo = 0,
    hi = max;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (m * (1 + k * m * m) < r) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
export function distortion({ coefficient = -0.12, radius = 1 } = {}) {
  if (
    ![coefficient, radius].every(Number.isFinite) ||
    coefficient < -0.15 ||
    coefficient > 0.15 ||
    radius < 0 ||
    radius > Math.SQRT2
  )
    throw RangeError("Invalid distortion map");
  const mapped = radius * (1 + coefficient * radius * radius),
    tangent = 1 + coefficient * radius * radius,
    radial = 1 + 3 * coefficient * radius * radius;
  return {
    mapped,
    tangent,
    radial,
    jacobian: tangent * radial,
    inverted: inverseRadius(mapped, coefficient),
    relative: coefficient * radius * radius,
  };
}
