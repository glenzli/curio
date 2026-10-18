import test from "node:test";
import assert from "node:assert/strict";
import { radialMap, inverseRadius, distortion } from "./model.js";
test("radial inverse and analytic Jacobian agree with independent differences", () => {
  for (const coefficient of [-0.15, 0, 0.15])
    for (const radius of [0, 0.5, 1, Math.SQRT2]) {
      const m = distortion({ coefficient, radius });
      assert(Math.abs(m.inverted - radius) < 1e-12);
      assert(m.jacobian > 0);
      const e = 1e-6,
        derivative =
          (radialMap(radius + e, 0, coefficient)[0] -
            radialMap(radius - e, 0, coefficient)[0]) /
          (2 * e);
      assert(Math.abs(derivative - m.radial) < 1e-8);
    }
});
test("identity and barrel/pincushion signs retain coordinates", () => {
  assert.deepEqual(radialMap(0.4, -0.8, 0), [0.4, -0.8]);
  assert(distortion().mapped < 1);
  assert(distortion({ coefficient: 0.1 }).mapped > 1);
  assert.equal(inverseRadius(3), null);
  assert.throws(() => distortion({ coefficient: -1 }));
});
