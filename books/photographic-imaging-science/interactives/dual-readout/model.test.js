import test from "node:test";
import assert from "node:assert/strict";
import {
  dualMetrics,
  dualTruth,
  dualObservations,
  dualMoments,
  parameters,
} from "./model.js";
const near = (a, b, e = 1e-9) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}, tolerance ${e}`);
test("source propagation agrees with independent conditional covariance and optimal fusion", () => {
  for (const mode of ["shared", "independent"])
    for (const mean of [0, 1, 64, 4096])
      for (const commonNoise of [0, 1.5])
        for (const highNoise of [0, 1, 4])
          for (const lowNoise of [0, 1, 8]) {
            const p = { mode, mean, commonNoise, highNoise, lowNoise },
              m = dualMetrics(p),
              t = dualTruth(p);
            near(m.cov[0][1], t.covariance);
            near(m.variance, t.variance, 1e-8);
            near(m.weightH, t.weightH);
            const v = (w) =>
              w * w * m.cov[0][0] +
              (1 - w) ** 2 * m.cov[1][1] +
              2 * w * (1 - w) * m.cov[0][1];
            assert.ok(v(Math.max(0, m.weightH - 0.01)) >= m.variance - 1e-9);
            assert.ok(v(Math.min(1, m.weightH + 0.01)) >= m.variance - 1e-9);
          }
});
test("reading the same ideal charge twice preserves shot noise; two exposures spend twice the light", () => {
  const p = { mean: 1024, commonNoise: 0, highNoise: 0, lowNoise: 0 };
  const shared = dualMetrics(p),
    independent = dualMetrics({ ...p, mode: "independent" });
  near(shared.variance, 1024);
  near(shared.omitCovariance, 512);
  near(independent.variance, 512);
  const o = dualObservations(p, 1000);
  assert.ok(o.samples.every((x) => x.high === x.low && x.fused === x.high));
});
test("recorded covariance and fused variance reproduce the two acquisition models", () => {
  for (const mode of ["shared", "independent"]) {
    const p = { mean: 64, mode },
      o = dualObservations(p, 40000),
      m = dualMoments(o.samples),
      t = dualTruth(p);
    assert.equal(o.highClipped + o.lowClipped, 0);
    near(m.means.fused, 64, 0.2);
    near(m.covariance, t.covariance, 1.5);
    near(m.fusedVariance, t.variance, 1.5);
    // Truth-like extra fields cannot influence the estimator.
    assert.deepEqual(
      dualMoments(o.samples.map((s) => ({ ...s, mean: -999, charge: NaN }))),
      m,
    );
  }
});
test("signed black-subtracted noise survives; high clipping falls back to the unsaturated low path", () => {
  const dark = dualObservations({ mean: 0 });
  assert.ok(dark.samples.some((s) => s.high < 0));
  const bright = dualObservations({ mean: 16000 });
  assert.equal(bright.highClipped, 4096);
  assert.equal(bright.lowClipped, 0);
  assert.equal(bright.fallback, 4096);
  assert.ok(bright.samples.every((s) => s.high === 10000 && s.fused === s.low));
  near(dualMoments(bright.samples).means.fused, 16000, 10);
  const both = dualObservations({ mean: 65536 });
  assert.equal(both.lowClipped, 4096);
  assert.equal(both.bothClipped, 4096);
  assert.ok(both.samples.every((s) => s.fused === 40000));
});
test("seeded records are repeatable and malformed dual readout inputs are rejected", () => {
  assert.deepEqual(dualObservations({}, 10), dualObservations({}, 10));
  assert.notDeepEqual(
    dualObservations({}, 10),
    dualObservations({ seed: 20261019 }, 10),
  );
  for (const p of [
    { mean: -1 },
    { mean: Infinity },
    { highNoise: -1 },
    { commonNoise: 21 },
    { mode: "DCG" },
    { seed: 0.5 },
  ])
    assert.throws(() => parameters(p), RangeError);
});
