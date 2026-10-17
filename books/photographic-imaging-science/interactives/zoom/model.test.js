import test from "node:test";
import assert from "node:assert/strict";
import {
  zoomSystem,
  zoomMatrix,
  traceZoom,
  compensationTruth,
  solveCompensation,
  SENSOR,
} from "./model.js";
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("zoom middle position is a linear compensation case: c150, f100, fixed image200", () => {
  assert.deepEqual(compensationTruth(50), [150]);
  near(solveCompensation(50), 150);
  const m = zoomSystem({ variator: 50, auto: true });
  near(m.focalLength, 100);
  near(m.imageZ, 200);
  near(m.spread, 0);
});
test("zoom direct-ray root solving agrees with separate quadratic truth across travel", () => {
  for (let variator = 10; variator <= 70; variator += 0.25) {
    const a = solveCompensation(variator),
      b = compensationTruth(variator);
    if (!b.length) assert.equal(a, null);
    else {
      assert.notEqual(a, null);
      near(a, b[0], 1e-7);
      near(traceZoom({ variator, compensator: a }).detector, 0);
    }
  }
  near(solveCompensation(20), 137.555293501814, 1e-8);
  near(solveCompensation(60), 167.550020016016, 1e-8);
});
test("zoom locked compensator defocuses; automatic compensation changes focal length while detector stays fixed", () => {
  const locked = zoomSystem(),
    wide = zoomSystem({ auto: true }),
    long = zoomSystem({ variator: 60, auto: true });
  near(locked.spread, 0.3);
  assert.ok(Math.abs(locked.imageZ - SENSOR) > 10);
  for (const m of [wide, long]) {
    near(m.imageZ, SENSOR);
    near(m.spread, 0);
    near(m.detectorMatrix[0], 0);
  }
  assert.ok(long.focalLength > 4 * wide.focalLength);
});
test("zoom out-of-range solution fails explicitly and never reuses a previous compensation answer", () => {
  for (const variator of [64, 70]) {
    const m = zoomSystem({ variator, auto: true, compensator: 150 });
    assert.equal(m.solved, null);
    assert.equal(m.compensated, false);
    assert.deepEqual(m.analytic, []);
    assert.equal(m.active.compensator, 150);
    assert.ok(m.spread > 0.01);
  }
});
test("zoom matrix directions and units match direct kicks at every group and detector", () => {
  for (const variator of [10, 20, 50, 63, 70])
    for (const compensator of [90, 150, 190]) {
      const p = { variator, compensator },
        [A, B, C, D] = zoomMatrix(p);
      near(A * D - B * C, 1);
      for (const height of [-0.5, 0, 0.5])
        for (const angle of [-0.003, 0, 0.003]) {
          const r = traceZoom(p, height, angle);
          near(r.y3, A * height + B * angle);
          near(r.u3, C * height + D * angle);
          near(
            r.detector,
            (A + (200 - compensator) * C) * height +
              (B + (200 - compensator) * D) * angle,
          );
        }
    }
});
test("zoom travel edges remain finite and malformed input is rejected", () => {
  for (const variator of [10, 70])
    for (const compensator of [90, 190])
      assert.ok(
        zoomSystem({ variator, compensator }).matrix.every(Number.isFinite),
      );
  for (const p of [
    { variator: 9 },
    { variator: 71 },
    { compensator: 80 },
    { compensator: NaN },
    { auto: 1 },
  ])
    assert.throws(() => zoomSystem(p), RangeError);
  assert.throws(() => traceZoom({}, Infinity), RangeError);
});
