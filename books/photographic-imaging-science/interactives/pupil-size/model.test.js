import test from "node:test";
import assert from "node:assert/strict";
import { pupilBudget } from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("400mm f/4 needs a 100mm entrance pupil; pupil image is distinct from stop", () => {
  const m = pupilBudget({ halfAngle: 0 });
  near(m.entrance, 100);
  near(m.stop, 100 / 1.5);
  near(m.frontClearance, 100);
  near(m.mass, 196.34954084936209);
});
test("front envelope agrees with independent boundary rays at both field signs", () => {
  for (const halfAngle of [-30, -8, 0, 8, 30])
    for (const frontDistance of [0, 20, 80]) {
      const m = pupilBudget({ halfAngle, frontDistance });
      near(m.frontClearance, m.tracedClearance);
    }
});
test("aperture area scales quadratically, fully similar blank mass cubically", () => {
  const a = pupilBudget({ frontDistance: 0, halfAngle: 0 }),
    b = pupilBudget({ focal: 800, frontDistance: 0, halfAngle: 0 }),
    c = pupilBudget({
      focal: 800,
      frontDistance: 0,
      halfAngle: 0,
      thickness: 20,
    });
  near(b.apertureArea / a.apertureArea, 4);
  near(b.mass / a.mass, 4);
  near(c.mass / a.mass, 8);
  near(
    pupilBudget({ pupilMagnification: 2 }).entrance,
    pupilBudget({ pupilMagnification: 0.5 }).entrance,
  );
});
test("geometry rejects nonphysical focal length, aperture and material inputs", () => {
  for (const p of [
    { focal: 0 },
    { fNumber: 0 },
    { pupilMagnification: 0 },
    { halfAngle: 90 },
    { density: NaN },
    { frontDistance: -1 },
  ])
    assert.throws(() => pupilBudget(p), RangeError);
});
