import test from "node:test";
import assert from "node:assert/strict";
import { thickLens } from "./model.js";
test("chapter 11 thick glass example and physical ray focus", () => {
  const m = thickLens();
  assert(Math.abs(m.f - 3000 / 59) < 1e-12);
  assert(Math.abs(m.bfd - 2900 / 59) < 1e-12);
  assert(Math.abs(m.h1 - 100 / 59) < 1e-12);
  assert(Math.abs(m.trace(1).focus - (5 + m.bfd)) < 1e-12);
});
test("matrix, separate lensmaker calculation and stepwise reduced-angle refraction agree", () => {
  for (const thickness of [0, 5, 15])
    for (const bend of [0.5, 1, 1.5]) {
      const m = thickLens({ thickness, bend });
      assert(Math.abs(m.det - 1) < 1e-12);
      assert(Math.abs(m.f - m.referenceF) < 1e-12);
      for (const y of [-1, 0.2, 1]) {
        const ray = m.trace(y, 0.01),
          [A, B, C, D] = m.matrix;
        assert(Math.abs(ray.y2 - (A * y + B * 0.01)) < 1e-12);
        assert(Math.abs(ray.out - (C * y + D * 0.01)) < 1e-12);
      }
    }
});
test("zero thickness recovers thin lens and coincident principal planes", () => {
  const m = thickLens({ thickness: 0 });
  assert.equal(m.f, 50);
  assert.equal(m.bfd, 50);
  assert.equal(m.h1, 0);
  assert.equal(m.h2, 0);
  assert.throws(() => thickLens({ index: 1 }));
});
