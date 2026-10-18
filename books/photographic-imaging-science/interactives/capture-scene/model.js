import { pipeline, FULL_WELL, GRAY } from "../ei-monitor/model.js";
import { shoulder } from "../tone-map/model.js";
export const WIDTH = 48,
  HEIGHT = 32;
export function parameters(input = {}) {
  const p = {
    exposure: 0,
    eiStops: 0,
    bits: 10,
    metered: 0,
    record: 0,
    mapping: 0,
    monitor: 0,
    probeX: 34,
    probeY: 12,
    progress: 4,
    ...input,
  };
  for (const [key, lo, hi] of [
    ["exposure", -2, 2],
    ["eiStops", -2, 3],
    ["bits", 8, 12],
    ["monitor", -4, 2],
    ["probeX", 0, 47],
    ["probeY", 0, 31],
    ["progress", 0, 4],
  ])
    if (!Number.isFinite(p[key]) || p[key] < lo || p[key] > hi)
      throw RangeError("Invalid capture scene parameter");
  if (
    ![p.bits, p.probeX, p.probeY].every(Number.isInteger) ||
    ![p.metered, p.record, p.mapping].every((v) => [0, 1].includes(v))
  )
    throw RangeError("Invalid discrete capture scene mode");
  return p;
}
export function sceneEV(x, y) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= WIDTH ||
    y < 0 ||
    y >= HEIGHT
  )
    throw RangeError("Invalid scene coordinate");
  if ((x - 40) ** 2 + (y - 25) ** 2 < 18) return 6.3 + 0.1 * (x % 3);
  if (x >= 26 && x < 45 && y >= 4 && y < 21) return (x + y) % 4 < 2 ? 4.2 : 4.7;
  if (x >= 5 && x < 22 && y >= 16 && y < 29) return -3.5 + 0.5 * (x % 3);
  return -4 + (10 * x) / (WIDTH - 1) + 0.3 * Math.cos((2 * Math.PI * y) / 8);
}
function display(linear, mapping) {
  return mapping ? shoulder(linear, 0.6) : Math.min(1, Math.max(0, linear));
}
export function pixel(input, ev) {
  if (!Number.isFinite(ev) || Math.abs(ev) > 32)
    throw RangeError("Finite bounded scene EV required");
  const p = parameters(input);
  const record = pipeline(
    {
      exposure: p.exposure,
      eiStops: p.eiStops,
      bits: p.bits,
      policy: p.metered ? "metered" : "fixed",
      recording: p.record ? "ei-gain" : "fixed",
    },
    ev,
  );
  const gain = 2 ** p.monitor,
    lower = (record.monitorLinear * gain) / 8;
  // This branch knows the generated input, and intentionally bypasses both clipping and quantization.
  const truthLower = (0.18 * (record.mu / GRAY) * 2 ** p.eiStops * gain) / 8;
  return {
    ...record,
    ev,
    displayLinear: display(record.monitorLinear * gain, p.mapping),
    lowerLinear: display(lower, p.mapping),
    truthLowerLinear: display(truthLower, p.mapping),
    monitorClipped: record.monitorLinear * gain >= 1,
  };
}
export function captureScene(input = {}) {
  const p = parameters(input),
    records = Array.from({ length: WIDTH * HEIGHT }, (_, i) =>
      pixel(p, sceneEV(i % WIDTH, Math.floor(i / WIDTH))),
    );
  const values = (key) => Float64Array.from(records, (r) => r[key]);
  return {
    p,
    records,
    evMap: Float64Array.from(records, (r) => (r.ev + 5) / 13),
    raw: Float64Array.from(records, (r) => r.rawCode / 16383),
    file: Float64Array.from(records, (r) => r.logCode / (2 ** p.bits - 1)),
    monitor: values("displayLinear"),
    lower: values("lowerLinear"),
    truth: values("truthLowerLinear"),
    counts: Object.fromEntries(
      ["sensorClipped", "recordClipped", "fileWhite", "monitorClipped"].map(
        (k) => [k, records.filter((r) => r[k]).length],
      ),
    ),
    exposureRatio: 2 ** (p.exposure - (p.metered ? p.eiStops : 0)),
    // Physical pre-quantization boundaries, independent of stored DN/Log codes.
    sensorThresholdEV:
      Math.log2(FULL_WELL / GRAY) - p.exposure + (p.metered ? p.eiStops : 0),
    fileThresholdEV:
      Math.log2(FULL_WELL / GRAY) -
      p.exposure +
      (p.metered ? p.eiStops : 0) -
      (p.record ? Math.max(0, p.eiStops) : 0),
  };
}
