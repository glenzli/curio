import { randomGenerator, normal } from "../noise/model.js";
export const WIDTH = 128,
  CALIBRATION = 22.5;
export const FOCAL = 50,
  OBJECT = 550,
  SENSOR = 55,
  HALF_PUPIL = 5,
  PIXEL = 0.004;
export const sinc = (x) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x);
export function parameters(input = {}) {
  const p = {
    start: 0.2,
    noise: 0.005,
    gain: 0.8,
    kind: 0,
    seed: 41,
    step: 0,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.start) > 0.3 ||
    p.noise < 0 ||
    p.noise > 0.05 ||
    p.gain <= 0 ||
    p.gain > 1.8 ||
    ![0, 1, 2].includes(p.kind) ||
    !Number.isInteger(p.seed) ||
    p.step < 0 ||
    p.step > 8
  )
    throw RangeError("Invalid autofocus parameters");
  return p;
}
export function geometry(group) {
  const u = OBJECT + group,
    v = SENSOR - group,
    focus = (FOCAL * u) / (u - FOCAL),
    disparity = (HALF_PUPIL / PIXEL) * (1 - v / focus);
  return { group, u, v, focus, disparity };
}
export function raySensor(group, height) {
  const u = OBJECT + group,
    v = SENSOR - group,
    after = height / u - height / FOCAL;
  return height + v * after;
}
const terms = (kind) =>
  kind === 1
    ? []
    : kind === 2
      ? [[0.3, 32 / 128, 0]]
      : [
          [0.22, 7 / 128, 0],
          [0.16, 17 / 128, 0.7],
          [0.1, 27 / 128, 1.4],
        ];
export function imageAt(x, disparity, half, kind = 0) {
  return (
    0.5 +
    terms(kind).reduce(
      (s, [a, f, phase]) =>
        s +
        a *
          sinc(Math.PI * f * disparity) *
          Math.cos(2 * Math.PI * f * (x + (half * disparity) / 2) + phase),
      0,
    )
  );
}
export function capturePair(group, { noise = 0, kind = 0, seed = 41 } = {}) {
  const random = randomGenerator(seed),
    d = geometry(group).disparity;
  const left = new Float64Array(WIDTH),
    right = left.slice();
  for (let x = 0; x < WIDTH; x++) {
    left[x] = imageAt(x, d, 1, kind) + noise * normal(random);
    right[x] = imageAt(x, d, -1, kind) + noise * normal(random);
  }
  return { left, right };
}
function bilinearLine(values, x) {
  const i = Math.floor(x),
    t = x - i;
  return values[i] * (1 - t) + values[i + 1] * t;
}
export function estimateDisparity(left, right) {
  if (left.length !== WIDTH || right.length !== WIDTH)
    throw RangeError("128 observed samples required");
  const scores = [];
  let ma = 0,
    va = 0;
  for (let x = 16; x < 112; x++) ma += left[x] / 96;
  for (let x = 16; x < 112; x++) va += (left[x] - ma) ** 2;
  if (va / 96 < 0.0001)
    return { valid: false, reason: "纹理不足", shift: null, scores };
  for (let k = -64; k <= 64; k++) {
    const shift = k / 8;
    let mb = 0;
    for (let x = 16; x < 112; x++) mb += bilinearLine(right, x + shift) / 96;
    let dot = 0,
      vb = 0;
    for (let x = 16; x < 112; x++) {
      const b = bilinearLine(right, x + shift) - mb;
      dot += (left[x] - ma) * b;
      vb += b * b;
    }
    scores.push({ shift, score: vb > 1e-16 ? dot / Math.sqrt(va * vb) : -1 });
  }
  const sorted = [...scores].sort((a, b) => b.score - a.score),
    best = sorted[0],
    second = sorted.find((p) => Math.abs(p.shift - best.shift) >= 2);
  const valid =
    best.score > 0.65 &&
    Math.abs(best.shift) < 8 &&
    best.score - (second?.score ?? -1) > 0.01;
  return {
    valid,
    reason: valid
      ? "采用观测偏移"
      : Math.abs(best.shift) >= 8
        ? "搜索达到边界"
        : "相关峰不唯一或过弱",
    shift: valid ? best.shift : null,
    best: best.shift,
    score: best.score,
    competition: second?.score,
    scores,
  };
}
export function autofocus(input = {}) {
  const p = parameters(input),
    history = [];
  let group = p.start,
    stopped = false,
    reason = "";
  for (let k = 0; k <= 8; k++) {
    if (stopped) {
      history.push({ ...history.at(-1), iteration: k });
      continue;
    }
    const observations = capturePair(group, { ...p, seed: p.seed + 137 * k }),
      estimate = estimateDisparity(observations.left, observations.right);
    if (!stopped) {
      if (!estimate.valid) {
        stopped = true;
        reason = estimate.reason;
      } else if (Math.abs(estimate.shift) <= 0.125) {
        stopped = true;
        reason = "观测偏移达到停止阈值";
      }
    }
    history.push({
      iteration: k,
      group,
      observations,
      estimate,
      truth: geometry(group),
      stopped,
      reason,
    });
    if (!stopped)
      group = Math.max(
        -0.3,
        Math.min(0.3, group - (p.gain * estimate.shift) / CALIBRATION),
      );
  }
  const selected = Math.min(8, Math.floor(p.step)),
    current = history[selected],
    next = history[Math.min(8, selected + 1)],
    fraction = p.step - selected;
  const contrast = Array.from({ length: 33 }, (_, i) => {
    const position = -0.3 + (i * 0.6) / 32,
      { left, right } = capturePair(position, {
        ...p,
        seed: p.seed + 7919 * i,
      });
    const combined = Array.from(left, (v, k) => (v + right[k]) / 2),
      mean = combined.reduce((s, v) => s + v / WIDTH, 0),
      observed = combined.reduce((s, v) => s + (v - mean) ** 2 / WIDTH, 0);
    const d = geometry(position).disparity,
      expected = terms(p.kind).reduce(
        (s, [a, f]) => s + 0.5 * a * a * sinc(2 * Math.PI * f * d) ** 2,
        0,
      );
    return { group: position, observed, expected };
  });
  const peak = contrast.reduce((a, b) => (a.observed > b.observed ? a : b));
  const contrastRange = peak.observed - Math.min(...contrast.map((p) => p.observed));
  return {
    p,
    history,
    current,
    group: current.group + (next.group - current.group) * fraction,
    contrast,
    // A constant observed scan has no identifiable best position. Do not turn
    // the reduction's arbitrary tie-breaking endpoint into a reported focus.
    contrastPeak: contrastRange > 1e-12 ? peak.group : null,
    contrastRange,
    knownFocus: 0,
  };
}
