export function absorption({
  depth = 6,
  length = 3,
  dead = 0.5,
  collection = 10,
  reflection = 0.1,
} = {}) {
  if (
    ![depth, length, dead, collection, reflection].every(Number.isFinite) ||
    depth <= 0 ||
    length <= 0 ||
    dead < 0 ||
    collection <= 0 ||
    reflection < 0 ||
    reflection > 1
  )
    throw RangeError("Invalid absorption or collection scale");
  const a = 1 / length,
    start = Math.min(dead, depth),
    k = a + 1 / collection;
  const absorbed = (1 - reflection) * -Math.expm1(-a * depth);
  const qe =
    (((1 - reflection) * Math.exp(-a * start) * a) / k) *
    -Math.expm1(-k * (depth - start));
  const density = (z) =>
    dead >= depth || z < dead || z > depth
      ? 0
      : (1 - reflection) * a * Math.exp(-a * z - (z - start) / collection);
  // Independent cell integration of survival loss times collection probability.
  let integral = 0;
  const n = 4096,
    h = (depth - start) / n;
  for (let i = 0; i < n; i++) {
    const l = start + i * h,
      r = l + h;
    integral +=
      (1 - reflection) *
      (Math.exp(-a * l) - Math.exp(-a * r)) *
      Math.exp(-((l + r) / 2 - start) / collection);
  }
  return {
    absorbed,
    qe,
    integral,
    density,
    survival: (z) => (1 - reflection) * Math.exp(-a * z),
  };
}
