import test from "node:test";
import assert from "node:assert/strict";
import {
  starburst,
  directDensity,
  polarDensity,
  directions,
  radialLimit,
  parameters,
  DISPLAY_STEP,
  CROP,
} from "./model.js";
const near = (a, b, t = 1e-11) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("edge-normal directions pair for even polygons and remain distinct for odd polygons", () => {
  assert.equal(directions(6).length, 6);
  assert.equal(directions(7).length, 14);
  assert.equal(directions(8).length, 8);
  const p = parameters({ roundness: 1 });
  for (const a of [0, 0.23, 1.7]) near(radialLimit(p, a), 1);
});
test("the optical PSF has unit energy while geometric transmission and fixed physical view remain explicit", () => {
  for (const blades of [4, 7, 8]) {
    const m = starburst({ blades });
    near(m.energy, 1, 1e-12);
    assert.ok(Math.abs(m.area - m.continuousArea) < 0.04);
    assert.ok(m.retained > 0.95 && m.retained <= 1.000001);
  }
  near(DISPLAY_STEP * CROP, 177.1);
  const a = starburst({ roundness: 1, fNumber: 4 }),
    b = starburst({ roundness: 1, fNumber: 8 });
  near(a.density[0] / b.density[0], 4);
});
test("FFT is checked by direct phasors and a square aperture by an independent sinc product", () => {
  const m = starburst({ blades: 7, rotation: 13 });
  near(m.density[2 * m.size + 3], directDensity(m, 0.75, 0.5));
  const p = { blades: 4, roundness: 0, rotation: 0 },
    a = Math.SQRT1_2,
    scale = 0.55 * 8,
    sinc = (x) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x);
  for (const [x, y] of [
    [0, 0],
    [0.5, 0.3],
    [1, 0],
  ]) {
    const q = polarDensity(p, x, y, 256, 2048);
    assert.ok(
      Math.abs(
        q.density -
          ((a * a) / scale ** 2) *
            sinc(Math.PI * a * x) ** 2 *
            sinc(Math.PI * a * y) ** 2,
      ) < 3e-6,
    );
  }
  assert.throws(() => starburst({ blades: 2 }), RangeError);
});

import "./continuous.test.js";
