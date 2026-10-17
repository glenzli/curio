// A straight edge x = slope*(y-centerY) + intercept. All input is observed x/y/value.
const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const variance = (xs) => {
  const m = mean(xs);
  return xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - 1);
};

export function projectEdge(samples, geometry) {
  const { slope, intercept, centerY } = geometry,
    scale = Math.hypot(1, slope);
  return samples.map(({ x, y, value }) => ({
    x,
    y,
    value,
    distance: (x - slope * (y - centerY) - intercept) / scale,
  }));
}

export function fitEdge(samples, { width = 64, height = 64 } = {}) {
  const left = [],
    right = [],
    rows = new Map(),
    tail = Math.floor(width / 8);
  for (const { x, y, value } of samples) {
    if (![x, y, value].every(Number.isFinite))
      throw new RangeError("Invalid edge observation");
    if (x < tail) left.push(value);
    if (x >= width - tail) right.push(value);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x, value });
  }
  const result = {
    geometry: null,
    candidate: null,
    rows: [],
    levels: null,
    residualRms: null,
  };
  if (left.length < 8 || right.length < 8)
    return { ...result, reason: "两侧平台样本不足。" };
  const dark = mean(left),
    bright = mean(right),
    contrast = bright - dark;
  const noise = Math.sqrt((variance(left) + variance(right)) / 2);
  const levels = {
    dark,
    bright,
    contrast,
    noise,
    ok: contrast >= Math.max(0.01, 5 * noise),
  };
  result.levels = levels;
  if (!levels.ok)
    return {
      ...result,
      reason: "边缘对比不足：需左暗右亮，且对比至少达到平台噪声 RMS 的 5 倍。",
    };
  const middle = (dark + bright) / 2,
    centers = [];
  for (const [y, row] of rows) {
    row.sort((a, b) => a.x - b.x);
    if (row.length !== width) continue;
    const smooth = row.map(
      (p, i) =>
        (row[Math.max(0, i - 1)].value +
          2 * p.value +
          row[Math.min(width - 1, i + 1)].value) /
        4,
    );
    let crossing = null;
    for (let i = 1; i < width; i++)
      if (smooth[i - 1] <= middle && smooth[i] > middle) {
        crossing =
          i - 1 + (middle - smooth[i - 1]) / (smooth[i] - smooth[i - 1]);
        break;
      }
    if (crossing === null) continue;
    const start = Math.max(1, Math.floor(crossing) - 7),
      end = Math.min(width - 2, Math.floor(crossing) + 7);
    let mass = 0,
      moment = 0;
    for (let i = start; i <= end; i++) {
      const d = smooth[i + 1] - smooth[i];
      mass += d;
      moment += (row[i].x + 0.5) * d;
    }
    if (mass <= 0.5 * contrast) continue;
    const center = moment / mass;
    if (Math.abs(center - crossing) <= 3) centers.push({ y, center });
  }
  result.rows = centers;
  if (centers.length < Math.max(8, height / 2))
    return { ...result, reason: "可用行数不足，无法拟合直边。" };
  const centerY = (height - 1) / 2,
    ym = mean(centers.map((p) => p.y)),
    xm = mean(centers.map((p) => p.center));
  const yy = centers.reduce((s, p) => s + (p.y - ym) ** 2, 0);
  if (yy <= 0) return { ...result, reason: "行坐标没有足够跨度。" };
  const slope =
    centers.reduce((s, p) => s + (p.y - ym) * (p.center - xm), 0) / yy;
  const intercept = xm + slope * (centerY - ym),
    angle = (Math.atan(slope) * 180) / Math.PI;
  const geometry = {
    slope,
    intercept,
    centerY,
    angle,
    phase: (intercept - (width - 1) / 2) / Math.hypot(1, slope),
  };
  const residuals = centers.map((p) => ({
    ...p,
    residual: p.center - (intercept + slope * (p.y - centerY)),
  }));
  const residualRms = Math.sqrt(mean(residuals.map((p) => p.residual ** 2)));
  if (residualRms > 0.75)
    return {
      ...result,
      candidate: geometry,
      rows: residuals,
      residualRms,
      reason: "行质心偏离直线较大，当前直边拟合不稳定。",
    };
  return {
    ...result,
    geometry,
    candidate: geometry,
    rows: residuals,
    residualRms,
    reason: "",
  };
}
