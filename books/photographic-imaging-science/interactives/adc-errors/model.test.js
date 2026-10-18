import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  thresholds,
  codeFromThresholds,
  crossingTruth,
  adcErrors,
  ramp,
} from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("nonlinear clock thresholds preserve endpoints, strictly positive code widths and analytic DNL/INL", () => {
  for (const bits of [6, 8, 10])
    for (const curvature of [-0.8, 0, 0.8]) {
      const m = adcErrors({ bits, curvature });
      near(m.edges[0], 0);
      near(m.edges.at(-1), 1);
      m.dnl.forEach((v, k) => {
        near(v, m.dnlTruth[k], 1e-9);
        assert.ok(v > -0.81);
      });
      m.inl.forEach((v, k) => near(v, m.inlTruth[k], 1e-9));
      near(Math.max(...m.inl.map(Math.abs)), (Math.abs(curvature) * m.L) / 4);
      near(
        m.dnl.reduce((s, v) => s + v, 0),
        0,
        1e-8,
      );
    }
});
test("threshold search matches independent continuous crossing roots on every interval and exact clock edge", () => {
  for (const bits of [6, 8, 10])
    for (const curvature of [-0.8, 0, 0.45, 0.8]) {
      const p = { bits, curvature },
        t = thresholds(p);
      for (let k = 0; k < t.length - 1; k++)
        for (const x of [t[k], (t[k] + t[k + 1]) / 2]) {
          assert.equal(codeFromThresholds(x, t), k);
          assert.equal(crossingTruth(x, p).code, k);
        }
      assert.equal(codeFromThresholds(-1, t), 0);
      assert.equal(codeFromThresholds(2, t), t.length - 2);
      assert.equal(crossingTruth(2, p).fraction, null);
    }
});
test("linear ramp and integral-LSB offsets cancel with exact dark-code subtraction away from clipping", () => {
  const m = adcErrors({ curvature: 0, offset: 4, signal: 0.375 });
  m.columns.forEach((c) => {
    near(c.rawError, c.bias / m.delta);
    near(c.darkError, 0);
    near(c.code - c.dark, 96);
  });
});
test("a curved ramp leaves signal-dependent dark-subtraction residuals with fixed voltage offsets", () => {
  const a = adcErrors({ curvature: 0.6, signal: 0.2, offset: 4 }),
    b = adcErrors({ curvature: 0.6, signal: 0.75, offset: 4 });
  assert.ok(a.columns.some((c, j) => c.darkError !== b.columns[j].darkError));
  assert.ok(b.columns.some((c) => c.darkError !== 0));
  for (const c of adcErrors({ offset: 0 }).columns) {
    near(c.rawError, 0);
    near(c.darkError, 0);
  }
});
test("replay updates the physical ramp and latch state without changing final codes or DNL", () => {
  const a = adcErrors(),
    b = adcErrors({ progress: 0 }),
    c = adcErrors({ progress: 50 });
  near(b.rampVoltage, 0);
  near(c.rampVoltage, ramp(0.5, 0.45));
  assert.deepEqual(
    a.columns.map((c) => c.code),
    b.columns.map((c) => c.code),
  );
  assert.ok(b.columns.every((c) => !c.finished));
  assert.ok(a.columns.every((c) => c.finished));
  assert.ok(adcErrors({ signal: 1 }).columns.every((c) => c.clipped));
});
test("ADC error model rejects nonmonotone or unsupported inputs", () => {
  for (const p of [
    { curvature: 1 },
    { bits: 7.5 },
    { column: 12 },
    { signal: NaN },
    { offset: -1 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => crossingTruth(NaN));
});
