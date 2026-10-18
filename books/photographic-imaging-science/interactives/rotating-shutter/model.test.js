import test from "node:test";
import assert from "node:assert/strict";
import {
  rotatingShutter,
  bladeFraction,
  midpointReference,
  parameters,
} from "./model.js";
const near = (a, b, t = 1e-11) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("global and rolling frames coincide at zero scan and stationary rotation removes deformation", () => {
  const a = rotatingShutter({ scan: 0 });
  assert.deepEqual(a.rolling, a.global);
  const b = rotatingShutter({ speed: 0 });
  assert.deepEqual(b.rolling, b.global);
  near(
    rotatingShutter({ progress: 0 }).rolling.reduce((a, b) => a + b, 0),
    0,
  );
});
test("periodic window integration matches independent instantaneous midpoint samples for both directions", () => {
  for (const speed of [-37, 0, 23])
    for (const angle of [-2.3, -0.1, 0.8]) {
      const p = parameters({ speed, blades: 3, phase: 23 });
      near(
        bladeFraction(angle, 3.7, 11.2, speed, p.phase, p.blades),
        midpointReference(angle, 3.7, 11.2, p),
        0.00015,
      );
    }
  near(bladeFraction(0.7, 0, 50, 20, 13, 2), 1 / 18);
  assert.throws(() => rotatingShutter({ exposure: 0 }), RangeError);
});
test("shorter exposure changes blur angle without changing the full scan angle", () => {
  const a = rotatingShutter({ exposure: 1 }),
    b = rotatingShutter({ exposure: 0.25 });
  near(a.scanAngle, b.scanAngle);
  near(a.blurAngle, 4 * b.blurAngle);
  const m = rotatingShutter();
  assert.ok(m.rolling.some((v, i) => Math.abs(v - m.global[i]) > 0.1));
});
