import test from "node:test";
import assert from "node:assert/strict";
import {
  captureDarkFrames,
  darkSequence,
  probeBudget,
  HOT,
  WIDTH,
  HEIGHT,
} from "./model.js";
const near = (a, b, t = 1e-11) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("finite master subtraction leaves the exact same calibration error in every target average", () => {
  const data = captureDarkFrames(),
    a = darkSequence(data, 2, 8),
    b = darkSequence(data, 32, 8);
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    near(a.corrected[i] - a.oracle[i], b.corrected[i] - b.oracle[i]);
    near(a.corrected[i] - a.oracle[i], data.dark[i] - a.master[i]);
  }
  const c = darkSequence(data, 2, 16);
  assert.deepEqual(c.raw, a.raw);
});
test("nested capture prefixes are independent of selection; hot pixels have a declared rate", () => {
  const a = captureDarkFrames({ seed: 9 }),
    b = captureDarkFrames({ seed: 9 });
  assert.deepEqual(a.target, b.target);
  assert.deepEqual(a.master, b.master);
  near(a.dark[HOT], 80 * 0.1 * 10);
  assert.notEqual(a.target[HOT], a.master[HOT]);
});
test("known Poisson/read budgets retain the shared-dark floor and zero-noise limits", () => {
  const data = captureDarkFrames({ dark: 0, read: 0 }),
    m = darkSequence(data, 8, 16);
  for (const v of m.master) near(v, 0);
  assert.deepEqual(m.corrected, m.oracle);
  const d = captureDarkFrames();
  const a = probeBudget(d, HOT, 4, 8),
    b = probeBudget(d, HOT, 64, 8);
  near(a.master, b.master);
  near(b.sharedCovariance, b.master);
  assert.ok(b.total > b.master);
  near(m.variance[10], data.signal[10] / 8);
  assert.throws(() => darkSequence(d, 0, 8), RangeError);
});

test("independent repeated acquisitions reproduce variance and covariance from a shared master", async () => {
  const { capturePixel } = await import("./model.js");
  const a = [],
    b = [];
  for (let k = 0; k < 8192; k++) {
    const c = capturePixel(40, 80, 3, 1 + k * 104729),
      master = c.master[7] / 8;
    a.push(c.target[3] / 4 - master);
    b.push((c.target[7] - c.target[3]) / 4 - master);
  }
  const mean = (v) => v.reduce((s, x) => s + x / v.length, 0),
    ma = mean(a),
    mb = mean(b);
  const variance = mean(a.map((x) => (x - ma) ** 2)),
    covariance = mean(a.map((x, i) => (x - ma) * (b[i] - mb)));
  near(ma, 40, 0.25);
  near(mb, 40, 0.25);
  near(variance, 129 / 4 + 89 / 8, 2.0);
  near(covariance, 89 / 8, 1.4);
});
