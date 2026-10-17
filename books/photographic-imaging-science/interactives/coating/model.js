// Normal incidence, real constant indices, one lossless layer on a semi-infinite substrate.
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const scale = (a, b) => [a[0] * b, a[1] * b];
const div = (a, b) => {
  const d = b[0] ** 2 + b[1] ** 2;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
export const magnitude2 = (a) => a[0] ** 2 + a[1] ** 2;
function positive(x) {
  if (!Number.isFinite(x) || x <= 0)
    throw new RangeError("Positive finite optical input required");
}
export function quarterWave(index, wavelength = 550) {
  positive(index);
  positive(wavelength);
  return wavelength / (4 * index);
}
export function film({
  n0 = 1,
  nc = 1.38,
  ns = 1.52,
  thickness = quarterWave(nc),
  wavelength = 550,
} = {}) {
  [n0, nc, ns, wavelength].forEach(positive);
  if (!Number.isFinite(thickness) || thickness < 0)
    throw new RangeError("Invalid thickness");
  const r01 = (n0 - nc) / (n0 + nc),
    r12 = (nc - ns) / (nc + ns);
  const delta = (2 * Math.PI * nc * thickness) / wavelength;
  const phase = [Math.cos(2 * delta), -Math.sin(2 * delta)];
  // exp(-i delta) matches the +i characteristic matrix convention in (15.7).
  const denominator = add([1, 0], scale(phase, r01 * r12));
  const r = div(add([r01, 0], scale(phase, r12)), denominator);
  const t = div(
    scale(
      [Math.cos(delta), -Math.sin(delta)],
      (4 * n0 * nc) / ((n0 + nc) * (nc + ns)),
    ),
    denominator,
  );
  const bare = ((n0 - ns) / (n0 + ns)) ** 2;
  // Exact decomposition: first interface plus the sum of ALL returning film paths.
  const front = [r01, 0],
    returning = add(r, scale(front, -1));
  return {
    r,
    t,
    front,
    returning,
    delta,
    roundTripPhase: 2 * delta,
    R: magnitude2(r),
    T: (ns / n0) * magnitude2(t),
    bare,
  };
}
