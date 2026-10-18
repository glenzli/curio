import { multiply, translation, lens } from "../paraxial/model.js";

// Powers are in dioptres, axial distances in mm. These are teaching groups,
// not glass prescriptions; a cemented group is represented by one equivalent kick.
export const LAYOUTS = [
  { name: "三片式", z: [0, 15, 30], powers: [20, -25, 20], stop: 22.5 },
  { name: "Tessar式", z: [0, 15, 32], powers: [20, -17, 20], stop: 23 },
  {
    name: "双高斯式",
    z: [0, 12, 28, 40],
    powers: [25, -12, -12, 25],
    stop: 20,
  },
  { name: "反望远式", z: [0, 50], powers: [-10, 15], stop: 42 },
  { name: "望远式", z: [0, 50], powers: [10, -10], stop: 20 },
];
export function layoutSystem({
  type = 2,
  separation = 1,
  angle = 0.5,
  radius = 0.8,
} = {}) {
  if (
    !Number.isInteger(type) ||
    !LAYOUTS[type] ||
    ![separation, angle, radius].every(Number.isFinite) ||
    separation <= 0 ||
    radius <= 0 ||
    Math.abs(angle) > 5
  )
    throw new RangeError("Invalid teaching lens layout");
  const layout = LAYOUTS[type],
    z = layout.z.map((x) => x * separation),
    theta = (angle * Math.PI) / 180;
  let matrix = [1, 0, 0, 1];
  for (let j = 0; j < z.length; j++) {
    if (j) matrix = multiply(translation(z[j] - z[j - 1]), matrix);
    matrix = multiply(lens(layout.powers[j] / 1000), matrix);
  }
  const [A, B, C, D] = matrix,
    afocal = Math.abs(C) < 1e-12;
  const focalLength = afocal ? null : -1 / C,
    bfd = afocal ? null : -A / C;
  const last = z.at(-1),
    imageZ = bfd === null ? null : last + bfd;
  // Independent scalar ray propagation, without matrix operations.
  const rays = [-1, -0.5, 0, 0.5, 1].map((k) => {
    let y = radius * k,
      slope = theta;
    const points = [
        [-10, y - 10 * slope],
        [0, y],
      ],
      angles = [slope];
    for (let j = 0; j < z.length; j++) {
      if (j) {
        y += (z[j] - z[j - 1]) * slope;
        points.push([z[j], y]);
      }
      slope -= (layout.powers[j] * y) / 1000;
      angles.push(slope);
    }
    const outputHeight = y;
    const imageHeight = bfd === null ? null : y + bfd * slope;
    return { points, outputHeight, slope, imageHeight, angles };
  });
  const r0 = rays[0],
    r1 = rays.at(-1),
    ds = r1.slope - r0.slope;
  const tracedBfd =
    Math.abs(ds) < 1e-12 ? null : -(r1.outputHeight - r0.outputHeight) / ds;
  const expectedHeight = focalLength === null ? null : focalLength * theta;
  const maxImageError =
    expectedHeight === null
      ? null
      : Math.max(...rays.map((r) => Math.abs(r.imageHeight - expectedHeight)));
  return {
    layout,
    z,
    matrix,
    focalLength,
    bfd,
    imageZ,
    tracedBfd,
    expectedHeight,
    maxImageError,
    determinant: A * D - B * C,
    maxAngle: Math.max(...rays.flatMap((r) => r.angles.map(Math.abs))),
    H1: afocal ? null : focalLength * (1 - D),
    H2: afocal ? null : last - focalLength * (1 - A),
    stopZ: layout.stop * separation,
    rays,
  };
}
