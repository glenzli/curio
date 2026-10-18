const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
];
export function thickLens({
  index = 1.5,
  thickness = 5,
  radius = 50,
  bend = 1,
} = {}) {
  if (
    ![index, thickness, radius, bend].every(Number.isFinite) ||
    index <= 1 ||
    thickness < 0 ||
    radius <= 0 ||
    bend < 0.3 ||
    bend > 2
  )
    throw RangeError("Invalid thick lens");
  const r1 = radius,
    r2 = -radius * bend,
    p1 = (index - 1) / r1,
    p2 = (1 - index) / r2;
  const matrix = mul(
    [1, 0, -p2, 1],
    mul([1, thickness / index, 0, 1], [1, 0, -p1, 1]),
  );
  const [A, B, C, D] = matrix;
  if (Math.abs(C) < 1e-12)
    throw RangeError("Afocal limit has no finite focal lengths");
  const f = -1 / C,
    bfd = -A / C,
    h1 = f * (1 - D),
    h2 = thickness - f * (1 - A);
  const trace = (height, slope = 0) => {
    const inside = (slope - p1 * height) / index,
      y2 = height + thickness * inside,
      out = index * inside - p2 * y2;
    return {
      points: [
        [0, height],
        [thickness, y2],
        [thickness + bfd, y2 + bfd * out],
      ],
      inside,
      out,
      y2,
      focus: out === 0 ? null : thickness - y2 / out,
    };
  };
  // Lensmaker's formula is evaluated separately from matrix multiplication.
  const power =
    (index - 1) *
    (1 / r1 - 1 / r2 + ((index - 1) * thickness) / (index * r1 * r2));
  return {
    matrix,
    f,
    bfd,
    h1,
    h2,
    power,
    referenceF: 1 / power,
    thinF: 1 / (p1 + p2),
    trace,
    det: A * D - B * C,
  };
}
