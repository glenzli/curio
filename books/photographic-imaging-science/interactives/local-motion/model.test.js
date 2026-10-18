import test from "node:test";
import assert from "node:assert/strict";
import { observations, estimateShift, localMotion, fusePair } from "./model.js";
test("two regions recover their own integer displacement without noise", () => {
  const m = localMotion({ noise: 0 });
  assert.deepEqual(
    m.local.map((x) => x.shift),
    [2, -2],
  );
  assert(m.rmse.local < 1e-12);
  assert(m.rmse.global > 2);
});
test("one global shift suffices only for common motion", () => {
  const m = localMotion({ noise: 0, background: -3, foreground: -3 });
  assert.equal(m.global.shift, -3);
  assert(m.rmse.global < 1e-12);
});
test("estimator is observation-only and refuses flat or clipped data", () => {
  const d = observations({ noise: 0, background: 1 });
  d.truth = -100;
  assert.equal(estimateShift([d.regions[0]], d.times).shift, 1);
  for (const value of [0, 1000])
    assert.equal(
      estimateShift([[Array(64).fill(value), Array(64).fill(value)]], [1, 1])
        .shift,
      null,
    );
});
test("calibrated fixed weights minimize independent known-variance fusion", () => {
  for (const rate of [0, 10, 100]) {
    const m = fusePair(rate, rate * 4, [1, 4], 3, rate),
      v0 = rate + 9,
      v1 = rate / 4 + 9 / 16;
    assert(m.variance <= (v0 + v1) / 4 + 1e-12);
    assert(Math.abs(m.value - rate) < 1e-12);
  }
});
test("estimated weights remain distinct from oracle weights and deterministic", () => {
  const a = fusePair(50, 300, [1, 4], 4),
    b = fusePair(50, 300, [1, 4], 4, 100);
  assert.notEqual(a.weight, b.weight);
  assert.deepEqual(localMotion(), localMotion());
});

test("RMSE shares a support set; failed estimates do not invalidate oracle data", () => {
  for (const ratio of [4, 7, 8]) {
    const m = localMotion({ ratio });
    const common = m.profiles.filter((p) =>
      ["global", "local", "oracle"].every((key) => p[key] !== null),
    );
    assert.equal(m.compared, common.length);
    for (const key of ["global", "local", "oracle"]) {
      if (!common.length) assert.equal(m.rmse[key], null);
      else {
        const mse =
          common.reduce((sum, p) => sum + (p[key] - p.truth) ** 2, 0) /
          common.length;
        assert(Math.abs(m.rmse[key] ** 2 - mse) < 1e-10);
      }
    }
    if (ratio === 8) {
      assert.equal(m.compared, 0);
      assert(m.profiles.some((p) => p.oracle !== null));
    }
  }
});
