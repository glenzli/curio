import test from "node:test";
import assert from "node:assert/strict";
import { relaySystem, relayTruth, traceRelay, STOP_RADIUS } from "./model.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("telecentric 4f relay has -1.5 magnification, infinite pupils and zero chief angles", () => {
  const m = relaySystem();
  near(m.ratio, -1.5);
  near(m.chief.image, -3);
  near(m.span, 0);
  near(m.chief.angle, 0);
  near(m.chief.u2, 0);
  near(m.determinant, 1);
  assert.equal(m.truth.entrance, null);
  assert.equal(m.truth.exit, null);
  m.matrix.forEach((v, i) => near(v, [-1.5, 0, 0, -2 / 3][i]));
});
test("telecentric double-sided scale persists under plane shifts while the ray bundle defocuses", () => {
  for (const objectOffset of [-10, 0, 10])
    for (const imageOffset of [-10, 0, 10]) {
      const m = relaySystem({ objectOffset, imageOffset });
      near(m.ratio, -1.5);
      near(m.chief.angle, 0);
      near(m.chief.u2, 0);
    }
  near(relaySystem({ objectOffset: 10 }).span, 0.3);
  assert.ok(relaySystem({ imageOffset: 10 }).span > 0.1);
});
test("telecentric object-side and image-side conditions are distinct", () => {
  const object = { gap: 145, stop: 50 },
    image = { gap: 145, stop: 70 };
  const a = relaySystem(object),
    b = relaySystem(image);
  assert.equal(a.truth.objectTelecentric, true);
  assert.equal(a.truth.imageTelecentric, false);
  assert.equal(b.truth.objectTelecentric, false);
  assert.equal(b.truth.imageTelecentric, true);
  near(a.chief.angle, 0);
  assert.ok(Math.abs(a.chief.u2) > 0.001);
  near(b.chief.u2, 0);
  assert.ok(Math.abs(b.chief.angle) > 0.001);
  for (const offset of [-10, 10]) {
    near(
      relaySystem({ ...object, objectOffset: offset }).chief.image,
      a.chief.image,
    );
    near(
      relaySystem({ ...image, imageOffset: offset }).chief.image,
      b.chief.image,
    );
  }
});
test("telecentric pupil conjugates agree with independently extended chief rays", () => {
  for (const gap of [105, 125, 145])
    for (const stop of [20, 50, 70, 85, 100]) {
      const p = { gap, stop, objectOffset: 7, imageOffset: -3, height: 1.4 },
        m = relaySystem(p),
        t = m.truth;
      if (t.entrance !== null)
        near(-57 - 1.4 / m.chief.angle, t.entrance, 1e-7);
      if (t.exit !== null) near(gap - m.chief.y2 / m.chief.u2, t.exit, 1e-7);
    }
});
test("telecentric matrix launch angles hit the physical aperture and direct scalar truth agrees across domain", () => {
  for (const gap of [105, 125, 145])
    for (const stop of [20, 50, 70, 100])
      for (const objectOffset of [-10, 0, 10])
        for (const imageOffset of [-10, 0, 10])
          for (const height of [0, 2]) {
            const p = { gap, stop, objectOffset, imageOffset, height },
              m = relaySystem(p),
              truth = relayTruth(p);
            m.rays.forEach((r, i) => {
              near(r.atStop, (i - 1) * STOP_RADIUS);
              near(r.image, m.matrix[0] * height + m.matrix[1] * r.angle);
            });
            near(m.chief.angle, truth.launch);
            near(m.chief.u2, truth.after2);
            near(m.chief.image, truth.image);
            near(m.determinant, 1);
          }
});
test("telecentric an on-axis chief ray does not classify an ordinary relay as telecentric", () => {
  const m = relaySystem({ stop: 85, height: 0 });
  near(m.chief.angle, 0);
  near(m.chief.u2, 0);
  assert.equal(m.ratio, null);
  assert.equal(m.truth.objectTelecentric, false);
  assert.equal(m.truth.imageTelecentric, false);
});
test("telecentric ordinary relay changes beam centre with object or detector displacement", () => {
  near(relaySystem({ stop: 85 }).ratio, -1.5);
  near(relaySystem({ stop: 85, objectOffset: 10 }).ratio, -75 / 43);
  near(relaySystem({ stop: 85, imageOffset: 10 }).ratio, -239 / 150);
});
test("telecentric degenerate stop conjugacy and invalid plane order fail explicitly", () => {
  for (const f of [relaySystem, relayTruth]) {
    assert.throws(() => f({ stop: 100, objectOffset: 50 }), RangeError);
    for (const p of [
      { stop: 0 },
      { stop: 125 },
      { gap: NaN },
      { objectOffset: -50 },
      { imageOffset: -75 },
    ])
      assert.throws(() => f(p), RangeError);
  }
  assert.throws(() => traceRelay({}, Infinity), RangeError);
});
