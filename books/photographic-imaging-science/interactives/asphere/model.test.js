import test from "node:test";
import assert from "node:assert/strict";
import { sag, asphere } from "./model.js";
test("sphere sag is an independent circle intersection", () => {
  for (const r of [0, 1, 12])
    assert(
      Math.abs(
        sag(r, { radius: 50, conic: 0, a4: 0 }).z -
          (50 - Math.sqrt(2500 - r * r)),
      ) < 1e-13,
    );
});
test("paraboloid has quadratic sag and exact slope; departure vanishes for a sphere", () => {
  assert.equal(sag(10, { conic: -1, a4: 0 }).z, 1);
  assert.equal(sag(10, { conic: -1, a4: 0 }).slope, 0.2);
  assert.equal(asphere({ conic: 0, a4: 0 }).edge.departure, 0);
});
test("analytic slope agrees with finite differences, including high-order departure", () => {
  for (const conic of [-2, -1, 0]) {
    const m = asphere({ conic });
    assert(Math.abs(m.edge.asphere.slope - m.numericalSlope) < 1e-9);
  }
  assert.throws(() => sag(50, { conic: 0 }));
});
