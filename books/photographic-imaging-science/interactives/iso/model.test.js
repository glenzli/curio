import test from "node:test";
import assert from "node:assert/strict";
import {
  gainMetrics,
  gainTruth,
  observations,
  measuredMoments,
} from "./model.js";
const close = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) < t * Math.max(1, Math.abs(b)), `${a} != ${b}`);
test("gain voltage-domain propagation agrees with independent input-domain formula", () => {
  for (const mode of ["LCG", "HCG"])
    for (const gain of [1, 2, 4, 16])
      for (const signal of [0, 16, 1000, 80000])
        for (const reduceExposure of [false, true]) {
          const m = gainMetrics({ mode, gain, signal, reduceExposure }),
            t = gainTruth(m.p);
          close(m.noiseElectrons ** 2, t.variance);
          close(m.snr, t.snr);
          close(m.limit, t.limit);
        }
});
test("gain same exposure does not add photoelectrons and a shortened exposure loses them", () => {
  const a = gainMetrics({ gain: 1 }),
    b = gainMetrics({ gain: 4 }),
    c = gainMetrics({ gain: 4, reduceExposure: true });
  close(a.mu, b.mu);
  close(c.mu, 4);
  assert.ok(b.snr > a.snr);
  assert.ok(c.snr < a.snr);
  close(c.referenceLimit, a.limit);
  assert.ok(b.limit < a.limit);
});
test("gain conversion change trades capacity and downstream input noise", () => {
  const l = gainMetrics(),
    h = gainMetrics({ mode: "HCG" });
  close(l.limit, 40000);
  close(h.limit, 10000);
  close(l.conversion * 4, h.conversion);
  assert.ok(h.readNoise < l.readNoise);
});
test("gain observed sample moments agree statistically without reading generation metadata", () => {
  for (const p of [
    {},
    { gain: 4 },
    { gain: 4, reduceExposure: true },
    { mode: "HCG", gain: 2 },
  ]) {
    const m = gainMetrics(p),
      o = observations(p, 60000),
      a = measuredMoments(o.samples);
    assert.equal(o.clipped, 0);
    close(a.mean, m.p.signal, 0.015);
    close(a.variance, m.normalizedNoise ** 2, 0.035);
    const frozen = Float64Array.from(o.samples);
    frozen.signal = 1e9;
    frozen.gain = NaN;
    assert.deepEqual(measuredMoments(frozen), a);
  }
});
test("gain deterministic samples retain signed noise, change seed and report clipped observations", () => {
  const a = observations({ signal: 0 });
  assert.ok(a.samples.some((x) => x < 0));
  assert.deepEqual(a, observations({ signal: 0 }));
  assert.notDeepEqual(a.samples, observations({ signal: 0, seed: 7 }).samples);
  const o = observations({ signal: 80000, gain: 4 });
  assert.equal(o.clipped, 1024);
  assert.ok(gainMetrics({ signal: 80000, gain: 4 }).clipped);
});
test("gain invalid operating modes and sample sets fail explicitly", () => {
  assert.equal(measuredMoments([1, 1, 1]).snr, null);
  assert.equal(measuredMoments([0, 0]).snr, null);
  for (const p of [
    { mode: "ISO800" },
    { gain: 0 },
    { signal: Infinity },
    { reduceExposure: "yes" },
  ])
    assert.throws(() => gainMetrics(p), RangeError);
  assert.throws(() => measuredMoments([1, NaN]), RangeError);
  assert.throws(() => observations({}, 1), RangeError);
});
