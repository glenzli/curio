import { multiply, translation, lens } from "../paraxial/model.js";
export const PLANES = [
  { id: "front", name: "前组孔径", z: 0 },
  { id: "middle", name: "中间孔径", z: 25 },
  { id: "rear", name: "后组孔径", z: 60 },
];
export const IMAGE_Z = 60 + 200 / 9; // Two thin powers 0.01/mm and 0.02/mm, infinity focus.
export function parameters({
  field = 2,
  frontRadius = 4,
  middleRadius = 1.5,
  rearRadius = 1.2,
  progress = 100,
} = {}) {
  for (const [v, lo, hi] of [
    [field, -3, 3],
    [frontRadius, 1, 4],
    [middleRadius, 0.5, 2],
    [rearRadius, 0.5, 3],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid physical aperture");
  return { field, frontRadius, middleRadius, rearRadius, progress };
}
// Production ray path: apply scalar kicks to both transverse coordinates, then
// test each real circular hole. Never consult the entrance-plane disk mapping.
export function traceRay(input, hx, hy = 0) {
  const p = parameters(input),
    u = (p.field * Math.PI) / 180;
  if (![hx, hy].every(Number.isFinite))
    throw new RangeError("Invalid entrance ray");
  let x = hx,
    y = hy,
    ux = u,
    uy = 0,
    z = 0,
    blocked = null;
  const route = [
      [-10, hx - 10 * u, hy],
      [0, hx, hy],
    ],
    heights = [];
  const radii = [p.frontRadius, p.middleRadius, p.rearRadius];
  for (let i = 0; i < PLANES.length; i++) {
    const plane = PLANES[i];
    x += (plane.z - z) * ux;
    y += (plane.z - z) * uy;
    z = plane.z;
    if (i) route.push([z, x, y]);
    heights.push([x, y]);
    if (x * x + y * y > radii[i] ** 2 + 1e-12) {
      blocked = plane.id;
      break;
    }
    if (i === 0) {
      ux -= 0.01 * x;
      uy -= 0.01 * y;
    }
    if (i === 2) {
      ux -= 0.02 * x;
      uy -= 0.02 * y;
    }
  }
  if (!blocked)
    route.push([IMAGE_Z, x + (IMAGE_Z - z) * ux, y + (IMAGE_Z - z) * uy]);
  return { route, heights, blocked, passed: !blocked };
}
// Independent ABCD mapping. A h + B u inside radius R becomes a disk in the
// entrance plane. All three centres lie on the field axis in this example.
export function apertureDisks(input = {}) {
  const p = parameters(input),
    u = (p.field * Math.PI) / 180,
    radii = [p.frontRadius, p.middleRadius, p.rearRadius];
  return PLANES.map((plane, i) => {
    const m = i ? multiply(translation(plane.z), lens(0.01)) : [1, 0, 0, 1];
    return {
      ...plane,
      a: m[0],
      b: m[1],
      center: (-m[1] * u) / m[0],
      radius: radii[i] / Math.abs(m[0]),
    };
  });
}
// Exact intersection area for collinear disk centres: split the x interval at
// circle-height crossings and integrate the lowest circular arc analytically.
export function intersectionArea(disks) {
  if (
    !disks.length ||
    disks.some(
      (c) =>
        !Number.isFinite(c.center) ||
        !Number.isFinite(c.radius) ||
        c.radius < 0,
    )
  )
    throw new RangeError("Invalid mapped disks");
  const lo = Math.max(...disks.map((c) => c.center - c.radius)),
    hi = Math.min(...disks.map((c) => c.center + c.radius));
  if (hi <= lo) return 0;
  const cuts = [lo, hi];
  for (let i = 0; i < disks.length; i++)
    for (let j = 0; j < i; j++) {
      const a = disks[i],
        b = disks[j];
      if (a.center === b.center) continue;
      const x =
        (b.radius ** 2 - a.radius ** 2 + a.center ** 2 - b.center ** 2) /
        (2 * (a.center - b.center));
      if (x > lo && x < hi) cuts.push(x);
    }
  cuts.sort((a, b) => a - b);
  let area = 0;
  const primitive = (c, x) => {
    if (c.radius === 0) return 0;
    const t = Math.max(-c.radius, Math.min(c.radius, x - c.center));
    return (
      t * Math.sqrt(Math.max(0, c.radius * c.radius - t * t)) +
      c.radius * c.radius * Math.asin(t / c.radius)
    );
  };
  for (let i = 1; i < cuts.length; i++) {
    const mid = (cuts[i - 1] + cuts[i]) / 2,
      c = disks.reduce((best, c) =>
        c.radius ** 2 - (mid - c.center) ** 2 <
        best.radius ** 2 - (mid - best.center) ** 2
          ? c
          : best,
      );
    area += primitive(c, cuts[i]) - primitive(c, cuts[i - 1]);
  }
  return Math.max(0, area);
}
export function sampledArea(input = {}, grid = 120) {
  const p = parameters(input);
  if (!Number.isInteger(grid) || grid < 4)
    throw new RangeError("Invalid ray grid");
  const step = (2 * p.frontRadius) / grid;
  let passed = 0,
    launched = 0;
  const blocked = { front: 0, middle: 0, rear: 0 };
  for (let j = 0; j < grid; j++)
    for (let i = 0; i < grid; i++) {
      const x = -p.frontRadius + (i + 0.5) * step,
        y = -p.frontRadius + (j + 0.5) * step;
      if (x * x + y * y > p.frontRadius * p.frontRadius) continue;
      launched++;
      const r = traceRay(p, x, y);
      if (r.passed) passed++;
      else blocked[r.blocked]++;
    }
  return { area: passed * step * step, passed, launched, blocked, step };
}
export function apertureBudget(input = {}, grid = 120) {
  const p = parameters(input),
    disks = apertureDisks(p),
    truth = intersectionArea(disks),
    axisDisks = apertureDisks({ ...p, field: 0 }),
    axis = intersectionArea(axisDisks),
    sample = sampledArea(p, grid),
    limitingRadius = Math.min(...axisDisks.map((c) => c.radius)),
    limiting = axisDisks
      .filter((c) => Math.abs(c.radius - limitingRadius) < 1e-10)
      .map((c) => c.name),
    rays = Array.from({ length: 17 }, (_, j) => traceRay(p, -4 + j / 2));
  return {
    ...p,
    disks,
    truth,
    axis,
    sample,
    limiting,
    rays,
    relativeArea: truth / axis,
    sampledRelative: sample.area / axis,
  };
}
