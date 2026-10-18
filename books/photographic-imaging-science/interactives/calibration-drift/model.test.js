import test from "node:test";
import assert from "node:assert/strict";
import { calibration, snrThreshold } from "./model.js";
test("shared master noise remains after science frames are averaged", () => {
  const a = calibration({ frames: 1 }),
    b = calibration({ frames: 64 });
  assert.equal(a.calVariance, b.calVariance);
  assert.equal(a.variance(1) - a.variance(2), 6.5);
  assert(b.rmse > b.floor);
});
test("drift is bias, not independent temporal noise", () => {
  const a = calibration({ drift: 0 }),
    b = calibration({ drift: 5 });
  assert.equal(a.variance(8), b.variance(8));
  assert.equal(b.mse(8) - a.mse(8), 25);
  assert.equal(calibration({ drift: -2, dark: 6 }).bias, 0);
});
test("independently redrawn Gaussian ensembles reproduce bias and MSE", () => {
  const m = calibration();
  assert(Math.abs(m.sampleMean - m.bias) < 0.06);
  assert(Math.abs(m.sampleMse - m.mse(8)) < 0.25);
});
test("SNR lower bound agrees with search and rejects an unavailable interval", () => {
  for (const target of [1, 5, 10]) {
    const m = snrThreshold({ target });
    assert(Math.abs(m.minimum - m.numerical) < 1e-10);
    assert(Math.abs(m.minimum / Math.sqrt(m.minimum + 13) - target) < 1e-12);
  }
  assert.equal(snrThreshold({ capacity: 1 }).stops, null);
  assert.equal(snrThreshold({ read: 0, dark: 0, target: 5 }).minimum, 25);
});
