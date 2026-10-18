import test from "node:test";
import assert from "node:assert/strict";
import {
  clippedPsf,
  directDensity,
  polarReference,
  overlapArea,
  SCALE,
} from "./model.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("two-circle area handles containment, tangency and complete blocking", () => {
  near(overlapArea(0, 1.2), Math.PI);
  near(overlapArea(0, 0.7), Math.PI * 0.49);
  near(overlapArea(2.2, 1.2), 0);
  near(overlapArea(1, 1), (2 * Math.PI) / 3 - Math.sqrt(3) / 2);
  const m = clippedPsf({ shift: 3, front: 1 });
  near(m.energy, 0);
  near(m.throughput, 0);
  assert.ok([...m.crop].every((x) => x === 0));
});
test("fixed illumination PSF integrates to transmitted area, not an automatically brightened unit", () => {
  for (const shift of [0, 0.6, 1.2, 2]) {
    const m = clippedPsf({ shift });
    near(m.energy, m.throughput, 1e-12);
    assert.ok(Math.abs(m.area - m.analyticArea) < 0.025);
  }
  const full = clippedPsf({ shift: 0, defocus: 0, diameter: 128 });
  assert.ok(Math.abs(full.density[0] - Math.PI / (4 * SCALE * SCALE)) < 0.001);
});
test("independent phasors, continuous polar pupil and mirror/conjugacy relations check diffraction", () => {
  const m = clippedPsf({ shift: 0.8, defocus: 1.2, diameter: 128 }),
    a = directDensity(m, 0.5, 0.25),
    b = polarReference(m.p, 0.5, 0.25);
  near(m.density[1 * m.size + 2], a);
  assert.ok(Math.abs(a - b.density) < 0.0005);
  assert.ok(Math.abs(b.area - m.analyticArea) < 1e-4);
  const reflected = clippedPsf({ ...m.p, shift: -0.8 }),
    conjugate = clippedPsf({ ...m.p, defocus: -1.2 });
  near(
    reflected.density[2 * m.size + 4],
    m.density[(m.size - 2) * m.size + m.size - 4],
  );
  near(
    conjugate.density[2 * m.size + 4],
    m.density[(m.size - 2) * m.size + m.size - 4],
  );
  assert.throws(() => clippedPsf({ front: 0 }), RangeError);
});
