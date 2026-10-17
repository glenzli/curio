import { WIDTH, HEIGHT, FULL_WELL } from "./model.js";

// Horizontal translation only. Reads observed values/exposure, never simulator
// validity, latent variance, scene functions or the displacement used to capture.
function gradients(frame, width, height, white) {
  if (
    !Number.isFinite(frame.exposure) ||
    !(frame.exposure > 0) ||
    frame.values.length !== width * height
  )
    throw new RangeError("Invalid observed frame");
  const log = new Float64Array(frame.values.length),
    valid = new Uint8Array(log.length);
  for (let i = 0; i < log.length; i++) {
    const value = frame.values[i];
    valid[i] = Number.isFinite(value) && value < 0.98 * white ? 1 : 0;
    log[i] = Math.log1p(Math.max(0, value) / frame.exposure / 1000);
  }
  const values = new Float64Array(log.length),
    usable = new Uint8Array(log.length);
  for (let y = 0; y < height; y++)
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;
      if ([-2, -1, 0, 1, 2].every((d) => valid[i + d])) {
        values[i] =
          (log[i + 2] + 2 * log[i + 1] - 2 * log[i - 1] - log[i - 2]) / 8;
        usable[i] = 1;
      }
    }
  return { values, usable };
}

export function estimateTranslation(
  reference,
  moving,
  {
    maxShift = 8,
    step = 0.25,
    roi = "band",
    width = WIDTH,
    height = HEIGHT,
    white = FULL_WELL,
  } = {},
) {
  if (
    !Number.isInteger(maxShift) ||
    maxShift < 1 ||
    maxShift > 16 ||
    !Number.isFinite(step) ||
    step <= 0 ||
    step > 1 ||
    !Number.isInteger((2 * maxShift) / step) ||
    !["band", "all"].includes(roi)
  )
    throw new RangeError("Invalid translation search");
  const a = gradients(reference, width, height, white),
    b = gradients(moving, width, height, white);
  const box = {
    x0: maxShift + 3,
    x1: width - maxShift - 3,
    y0: 2,
    y1: roi === "band" ? Math.floor(height * 0.16) : height - 2,
  };
  const support = [],
    columns = [];
  const shifts = Array.from(
    { length: 2 * maxShift + 1 },
    (_, k) => k - maxShift,
  );
  for (let y = box.y0; y < box.y1; y++)
    for (let x = box.x0; x < box.x1; x++) {
      const i = y * width + x;
      // Same observed support for EVERY candidate: a smaller overlap cannot win.
      if (a.usable[i] && shifts.every((d) => b.usable[i + d])) support.push(i);
    }
  for (let x = box.x0; x < box.x1; x++) {
    const indices = support.filter((i) => i % width === x);
    if (indices.length >= 4) columns.push(indices);
  }
  const curve = Array.from({ length: (2 * maxShift) / step + 1 }, (_, i) => ({
    offset: -maxShift + i * step,
    score: null,
  }));
  const fail = (status, reason, extra = {}) => ({
    offset: null,
    status,
    reason,
    support: support.length,
    columns: columns.length,
    box,
    curve,
    ...extra,
  });
  if (support.length < 32 || columns.length < 16)
    return fail("support", "未饱和且覆盖全部候选位移的样本不足。");
  // Average each column over its fixed set of observed rows before correlation.
  const av = columns.map(
    (indices) =>
      indices.reduce((sum, i) => sum + a.values[i], 0) / indices.length,
  );
  const mean = av.reduce((s, v) => s + v, 0) / av.length;
  const aa = av.reduce((s, v) => s + (v - mean) ** 2, 0);
  if (aa < 1e-10) return fail("texture", "参考区域缺少可用于定位的灰度变化。");
  for (const p of curve) {
    const low = Math.floor(p.offset),
      alpha = p.offset - low;
    const bv = columns.map(
      (indices) =>
        indices.reduce(
          (sum, i) =>
            sum +
            (1 - alpha) * b.values[i + low] +
            alpha * b.values[i + low + 1],
          0,
        ) / indices.length,
    );
    const bm = bv.reduce((s, v) => s + v, 0) / bv.length;
    const bb = bv.reduce((s, v) => s + (v - bm) ** 2, 0);
    if (bb > 1e-10)
      p.score =
        av.reduce((s, v, i) => s + (v - mean) * (bv[i] - bm), 0) /
        Math.sqrt(aa * bb);
  }
  const ranked = curve
    .filter((p) => p.score !== null)
    .toSorted((a, b) => b.score - a.score);
  if (!ranked.length)
    return fail("texture", "待配准区域缺少可用于定位的灰度变化。");
  const best = ranked[0],
    rival = ranked.find((p) => Math.abs(p.offset - best.offset) >= 1);
  const peak = {
    bestOffset: best.offset,
    score: best.score,
    gap: rival ? best.score - rival.score : null,
  };
  if (Math.abs(best.offset) === maxShift)
    return fail("boundary", "最佳候选落在搜索边界；扩大范围后再判断。", peak);
  if (best.score < 0.25)
    return fail("weak", "相关峰较弱，当前观测不足以可靠配准。", peak);
  if (peak.gap !== null && peak.gap < 0.005)
    return fail("ambiguous", "存在相近的远处候选峰，位移有歧义。", peak);
  return {
    offset: best.offset,
    status: "ok",
    reason: "",
    support: support.length,
    columns: columns.length,
    box,
    curve,
    ...peak,
  };
}
