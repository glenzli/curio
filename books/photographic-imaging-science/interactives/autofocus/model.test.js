import test from "node:test";
import assert from "node:assert/strict";
import {
  geometry,
  raySensor,
  capturePair,
  estimateDisparity,
  autofocus,
  imageAt,
  HALF_PUPIL,
  PIXEL,
  CALIBRATION,
} from "./model.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("split-pupil displacement has the same sign as the group error and matches two independent paraxial rays", () => {
  for (const g of [-0.3, -0.1, 0, 0.2, 0.3])
    near(
      (raySensor(g, HALF_PUPIL / 2) - raySensor(g, -HALF_PUPIL / 2)) / PIXEL,
      geometry(g).disparity,
    );
  near(geometry(0).disparity, 0);
  near(
    (geometry(1e-5).disparity - geometry(-1e-5).disparity) / 2e-5,
    CALIBRATION,
    1e-7,
  );
  for (const d of [-5.7, 0, 3.2])
    near(imageAt(30, d, 1), imageAt(30 + d, d, -1));
});
test("observed-only matching recovers signed shifts; flat and repetitive observations stop actuation", () => {
  for (const g of [-0.2, -0.08, 0, 0.12, 0.2]) {
    const o = capturePair(g),
      e = estimateDisparity(o.left, o.right);
    assert.ok(e.valid);
    near(e.shift, geometry(g).disparity, 0.14);
  }
  for (const kind of [1, 2]) {
    const m = autofocus({ kind, noise: 0 });
    assert.equal(m.current.estimate.valid, false);
    assert.ok(m.history.every((h) => h.group === 0.2));
  }
});
test("closed loop uses measured offsets, reaches either side of focus, and contrast scan retains a separate known peak", () => {
  for (const start of [-0.25, 0.25]) {
    const m = autofocus({ start, noise: 0, step: 8 });
    assert.ok(Math.abs(m.current.group) < 0.007);
    near(m.contrastPeak, 0);
    assert.ok(m.history.some((h) => h.stopped));
  }
  const m = autofocus({ noise: 0.01, step: 8 });
  assert.ok(Math.abs(m.current.group) < 0.02);
  assert.equal(m.knownFocus, 0);
  assert.throws(() => autofocus({ gain: 0 }), RangeError);
});
