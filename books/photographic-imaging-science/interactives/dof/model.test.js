import test from "node:test";
import assert from "node:assert/strict";
import {
  depthOfField,
  depthTruth,
  numericalLimits,
  tracedBlur,
} from "./model.js";
const close = (a, b, t = 1e-7) =>
  assert.ok(Math.abs(a - b) < t * Math.max(1, Math.abs(b)), `${a} != ${b}`);
test("depth numerical ray boundaries reproduce the 35mm textbook example", () => {
  const m = depthOfField();
  close(m.limits.hyperfocal, 15347.5);
  close(m.limits.near, 3775.736653926766);
  close(m.limits.far, 7399.130224691955);
  close(m.diameter, 0);
});
test("depth independent edge tracing and closed forms agree over focal lengths, apertures and criteria", () => {
  for (const focalLength of [24, 35, 50, 100])
    for (const fNumber of [2, 4, 8, 32])
      for (const criterionUm of [5, 20, 50])
        for (const focusVergence of [0, 0.05, 0.2, 1, 2, 4]) {
          const p = { focalLength, fNumber, criterionUm, focusVergence };
          const a = numericalLimits(p),
            b = depthTruth(p);
          close(a.near, b.near);
          close(a.hyperfocal, b.hyperfocal);
          if (b.far === null) assert.equal(a.far, null);
          else close(a.far, b.far, 1e-6);
          for (const subjectVergence of [0, 0.1, 0.5, 2, 8]) {
            const m = depthOfField({ ...p, subjectVergence });
            close(m.diameter, m.analyticBlur);
          }
        }
});
test("depth hyperfocal gives an infinite far boundary and exact H/2 near boundary", () => {
  const H = depthTruth().hyperfocal,
    p = { focusVergence: 1000 / H };
  const m = depthOfField(p);
  assert.equal(m.limits.far, null);
  close(m.limits.near, H / 2);
  close(tracedBlur(p, 0).diameter, 0.02);
  assert.notEqual(
    numericalLimits({ focusVergence: (1000 / H) * 1.00001 }).far,
    null,
  );
  assert.equal(
    numericalLimits({ focusVergence: (1000 / H) * 0.99999 }).far,
    null,
  );
});
test("depth infinity focus is a first-class boundary, not a large finite stand-in", () => {
  const m = depthOfField({ focusVergence: 0, subjectVergence: 0 });
  close(m.sensor, 35);
  close(m.diameter, 0);
  close(m.limits.near, 15312.5);
  assert.equal(m.limits.far, null);
});
test("depth numerical boundaries bracket acceptance and tightening a criterion does not change rays", () => {
  const m = depthOfField(),
    p = m.p;
  for (const w of [m.limits.nearVergence, m.limits.farVergence])
    close(tracedBlur(p, w).diameter, 0.02);
  assert.ok(tracedBlur(p, m.limits.nearVergence * 1.001).diameter > 0.02);
  assert.ok(tracedBlur(p, m.limits.farVergence * 0.999).diameter > 0.02);
  const a = depthOfField({ subjectVergence: 0.25, criterionUm: 20 }),
    b = depthOfField({ subjectVergence: 0.25, criterionUm: 10 });
  close(a.diameter, b.diameter);
  assert.equal(a.acceptable, true);
  assert.equal(b.acceptable, false);
  assert.ok(b.limits.near > a.limits.near);
  assert.ok(b.limits.far < a.limits.far);
});
test("depth rejects nonphysical objects, thresholds and nonfinite values", () => {
  for (const p of [
    { focalLength: 0 },
    { fNumber: -1 },
    { criterionUm: NaN },
    { focusVergence: Infinity },
    { subjectVergence: -1 },
    { focusVergence: 1000 / 35 },
    { criterionUm: 10000 },
  ])
    assert.throws(() => depthOfField(p), RangeError);
});
