import test from "node:test";
import assert from "node:assert/strict";
import { weights, covariance, demosaic } from "./model.js";
test("observed sites, interpolated sites and shared inputs", () => {
  assert.deepEqual(weights(1), [
    [0, 0.5],
    [1, 0.5],
  ]);
  assert.equal(covariance(0, 0, 2), 4);
  assert.equal(covariance(1, 1, 2), 2);
  assert.equal(covariance(0, 1, 2), 2);
  assert.equal(covariance(0, 3, 2), 0);
  assert.equal(covariance(1, 3, 2), 1);
});
test("averaging uses full covariance and independent effective weights", () => {
  for (let window = 1; window <= 16; window++) {
    const m = demosaic({ window });
    assert(Math.abs(m.variance - m.expanded) < 1e-12);
    assert(m.variance >= m.naive);
    if (window > 1) assert(m.variance > m.naive);
    assert(Math.abs(m.sampleVariance / m.variance - 1) < 0.06);
  }
});
test("interpolation preserves constants and linear ramps", () => {
  for (let i = 0; i < 20; i++)
    assert.equal(
      weights(i).reduce((s, [j, w]) => s + w * (2 + 6 * j), 0),
      2 + 3 * i,
    );
  assert.equal(demosaic({ sigma: 0 }).variance, 0);
});
