import { randomGenerator, normal } from "../noise/model.js";
export const WIDTH = 72,
  HEIGHT = 56,
  LIMIT = 6,
  STEP = 0.25;
export const MODES = ["texture", "flat", "stripes", "tiles", "occlusion"];
export function parameters({
  dx = 2.5,
  dy = -1.75,
  noise = 0,
  seed = 20261018,
  mode = "texture",
  roi = "all",
  progress = 100,
} = {}) {
  for (const [v, lo, hi] of [
    [dx, -8, 8],
    [dy, -8, 8],
    [noise, 0, 0.05],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid registration parameters");
  return {
    dx,
    dy,
    noise,
    progress,
    seed: Number.isInteger(seed) ? seed >>> 0 : 20261018,
    mode: MODES.includes(mode) ? mode : "texture",
    roi: roi === "top" ? "top" : "all",
  };
}
// Continuous input for the generator only. The estimator below sees sampled
// arrays, never this function, displacement, seed, mode or occluder geometry.
export function scene(x, y, mode = "texture") {
  if (mode === "flat") return 0.5;
  if (mode === "stripes") return 0.5 + 0.28 * Math.cos((2 * Math.PI * x) / 8);
  if (mode === "tiles")
    return (
      0.5 +
      0.14 * (Math.cos((2 * Math.PI * x) / 6) + Math.cos((2 * Math.PI * y) / 6))
    );
  return (
    0.45 +
    0.1 * Math.sin(0.31 * x + 0.16 * y) +
    0.08 * Math.cos(0.17 * x - 0.33 * y) +
    0.07 * Math.sin(0.55 * x + 0.21 * y) +
    0.16 * Math.exp(-((x - 22) ** 2 + (y - 19) ** 2) / 35) -
    0.13 * Math.exp(-((x - 48) ** 2 + (y - 37) ** 2) / 50)
  );
}
export function capturePair(input = {}) {
  const p = parameters(input),
    random = randomGenerator(p.seed),
    reference = new Float64Array(WIDTH * HEIGHT),
    moving = new Float64Array(reference.length);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      reference[i] = scene(x, y, p.mode) + p.noise * normal(random);
      const occluded =
        p.mode === "occlusion" && x >= 18 && x < 60 && y >= 27 && y < 49;
      moving[i] =
        (occluded ? 0.12 : scene(x - p.dx, y - p.dy, p.mode)) +
        p.noise * normal(random);
    }
  return { reference, moving };
}
export function bilinear(values, x, y, width = WIDTH, height = HEIGHT) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return NaN;
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    x1 = Math.min(x0 + 1, width - 1),
    y1 = Math.min(y0 + 1, height - 1),
    a = x - x0,
    b = y - y0;
  return (
    (1 - b) *
      ((1 - a) * values[y0 * width + x0] + a * values[y0 * width + x1]) +
    b * ((1 - a) * values[y1 * width + x0] + a * values[y1 * width + x1])
  );
}
export function commonSupport(
  reference,
  moving,
  { width = WIDTH, height = HEIGHT, limit = LIMIT, roi = "all" } = {},
) {
  const points = [],
    margin = Math.ceil(limit) + 1,
    yEnd = roi === "top" ? Math.floor(height * 0.43) : height - margin;
  for (let y = margin; y < yEnd; y += 2)
    for (let x = margin; x < width - margin; x += 2) {
      if (!Number.isFinite(reference[y * width + x])) continue;
      let valid = true;
      // One shared support for every candidate, even with missing observations.
      for (
        let yy = y - Math.ceil(limit);
        yy <= y + Math.ceil(limit) + 1 && valid;
        yy++
      )
        for (
          let xx = x - Math.ceil(limit);
          xx <= x + Math.ceil(limit) + 1;
          xx++
        )
          if (!Number.isFinite(moving[yy * width + xx])) {
            valid = false;
            break;
          }
      if (valid) points.push({ x, y, value: reference[y * width + x] });
    }
  return points;
}
export function scoreAt(
  moving,
  points,
  sx,
  sy,
  width = WIDTH,
  height = HEIGHT,
) {
  let sa = 0,
    sb = 0,
    saa = 0,
    sbb = 0,
    sab = 0,
    ss = 0;
  for (const p of points) {
    const a = p.value,
      b = bilinear(moving, p.x + sx, p.y + sy, width, height);
    if (!Number.isFinite(a) || !Number.isFinite(b))
      return { score: null, rmse: null };
    sa += a;
    sb += b;
    saa += a * a;
    sbb += b * b;
    sab += a * b;
    ss += (a - b) ** 2;
  }
  const n = points.length,
    va = saa - (sa * sa) / n,
    vb = sbb - (sb * sb) / n;
  return {
    score:
      n && va / n > 1e-9 && vb / n > 1e-9
        ? Math.max(-1, Math.min(1, (sab - (sa * sb) / n) / Math.sqrt(va * vb)))
        : null,
    rmse: n ? Math.sqrt(ss / n) : null,
  };
}
export function estimateTranslation2D(
  reference,
  moving,
  {
    width = WIDTH,
    height = HEIGHT,
    limit = LIMIT,
    step = STEP,
    roi = "all",
  } = {},
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 20 ||
    height < 20 ||
    reference.length !== width * height ||
    moving.length !== width * height ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    2 * limit + 4 >= Math.min(width, height) ||
    !Number.isFinite(step) ||
    step <= 0 ||
    step > 1 ||
    !Number.isInteger((2 * limit) / step) ||
    !["all", "top"].includes(roi)
  )
    throw new RangeError("Invalid observed arrays or search");
  const points = commonSupport(reference, moving, {
      width,
      height,
      limit,
      roi,
    }),
    surface = [];
  if (points.length < 24)
    return {
      status: "support",
      offset: null,
      points,
      surface,
      reason: "共同有效像素不足",
    };
  for (let iy = 0; iy <= (2 * limit) / step; iy++)
    for (let ix = 0; ix <= (2 * limit) / step; ix++) {
      const dx = -limit + ix * step,
        dy = -limit + iy * step;
      surface.push({
        dx,
        dy,
        ...scoreAt(moving, points, dx, dy, width, height),
      });
    }
  const sorted = surface
    .filter((p) => p.score !== null)
    .sort((a, b) => b.score - a.score);
  if (!sorted.length)
    return {
      status: "texture",
      offset: null,
      points,
      surface,
      reason: "观测缺少可配准的灰度变化",
    };
  const best = sorted[0],
    second = sorted.find(
      (p) => Math.hypot(p.dx - best.dx, p.dy - best.dy) >= 1.5,
    ),
    gap = second ? best.score - second.score : 0;
  const status =
      best.score >= 0.85 && gap < 0.012
        ? "ambiguous"
        : Math.abs(best.dx) === limit || Math.abs(best.dy) === limit
          ? "boundary"
          : best.score < 0.85
            ? "weak"
            : "ok",
    reason = {
      boundary: "最佳候选落在搜索边界",
      weak: "最佳相关仍不足以采用",
      ambiguous: "存在相近的相关峰，位移不唯一",
      ok: "采用观测给出的二维位移",
    }[status];
  return {
    status,
    reason,
    offset: status === "ok" ? { dx: best.dx, dy: best.dy } : null,
    best,
    gap,
    points,
    surface,
  };
}
// Known-truth output is kept separate from the estimator. Used only by the UI
// for comparison; resampling still uses observations, so interpolation remains.
export function resample(moving, dx, dy, width = WIDTH, height = HEIGHT) {
  return Float64Array.from({ length: width * height }, (_, i) =>
    bilinear(
      moving,
      (i % width) + dx,
      Math.floor(i / width) + dy,
      width,
      height,
    ),
  );
}
