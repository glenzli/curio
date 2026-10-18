import test from "node:test";
import assert from "node:assert/strict";
import { focusingFrame, zoomingFrame, RADIAL_ENLARGEMENT } from "./model.js";
const near = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) <= t, a + " versus " + b);
function checkGeometry(m) {
  for (const path of m.paths) {
    assert.deepEqual(
      path.map((p) => p[0]),
      [...m.groups, m.sensor],
    );
    path.forEach((p) => assert.ok(p.every(Number.isFinite)));
  }
  near(m.detectorDiameter, RADIAL_ENLARGEMENT * m.spread);
  const [A, B] = m.source.detector ?? m.source.detectorMatrix;
  const angularInput = "vergence" in m ? (0.5 * m.vergence) / 1000 : 0;
  const expected = (A * 0.5 + B * angularInput) * RADIAL_ENLARGEMENT;
  near(m.paths[0][3][1], expected);
  for (const p of m.paths) near(p[3][0], 200);
}
test("3D floating groups are the original solver positions and independent roots", () => {
  for (const coordinated of [0, 1])
    for (const vergence of [0, 1, 2]) {
      const m = focusingFrame({ coordinated, vergence });
      assert.ok(m.solved);
      checkGeometry(m);
      assert.ok(m.referenceError < 1e-7);
      near(m.spread, 0, 1e-9);
    }
});
test("same focused object has different far-scene scale for one versus two moving groups", () => {
  const rear = focusingFrame({ coordinated: 0 }),
    floating = focusingFrame({ coordinated: 1 });
  near(rear.groups[1], 50);
  near(floating.groups[1], 57.99702086393709);
  near(floating.scale, 100);
  assert.ok(Math.abs(rear.breathingPercent) > 20);
});
test("out-of-travel floating focus reports actual reference rays and stops", () => {
  const m = focusingFrame({ vergence: 2.5 });
  assert.equal(m.solved, false);
  assert.equal(m.halt, true);
  assert.deepEqual(m.groups, [0, 50, 150]);
  checkGeometry(m);
  assert.ok(m.spread > 0.2);
});
test("3D zoom moves the actual compensator and keeps detector at200", () => {
  for (const variator of [10, 20, 35, 50, 60]) {
    const m = zoomingFrame({ variator });
    assert.ok(m.compensated);
    checkGeometry(m);
    near(m.imageZ, 200, 1e-8);
    assert.ok(m.referenceError < 1e-8);
  }
  near(zoomingFrame({ variator: 50 }).focalLength, 100);
});
test("locking compensation visibly leaves a spread without changing the sensor", () => {
  const fixed = zoomingFrame({ variator: 35, compensate: 0 }),
    auto = zoomingFrame({ variator: 35 });
  near(fixed.groups[2], 150);
  assert.ok(fixed.spread > 0.01);
  assert.ok(auto.spread < 1e-10);
  checkGeometry(fixed);
});
test("no zoom solution never borrows the previous solved position", () => {
  const m = zoomingFrame({ variator: 70, compensator: 150 });
  assert.equal(m.solved, false);
  assert.equal(m.halt, true);
  near(m.groups[2], 150);
  checkGeometry(m);
  assert.ok(m.spread > 0.1);
});
test("rotational bundle reproduces one meridian and changes sign across its axis", () => {
  const m = zoomingFrame({ variator: 35, compensate: 0 });
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 4; j++) {
      near(m.paths[i][j][1], -m.paths[i + 6][j][1]);
      near(m.paths[i][j][2], -m.paths[i + 6][j][2]);
    }
});
test("invalid geometric mode and object domains stop", () => {
  for (const p of [{ vergence: -1 }, { vergence: NaN }, { coordinated: 2 }])
    assert.throws(() => focusingFrame(p), RangeError);
  for (const p of [{ variator: 0 }, { compensator: 200 }, { compensate: 2 }])
    assert.throws(() => zoomingFrame(p), RangeError);
});
