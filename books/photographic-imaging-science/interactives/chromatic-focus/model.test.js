import test from "node:test";
import assert from "node:assert/strict";
import {
  axialDensity,
  radialDensity,
  defocusedOtf,
  chromaticFocus,
  circularOtf,
} from "./model.js";
test("zero defocus OTF matches the independent disk-overlap formula", () => {
  for (const nu of [0, 30, 100, 180, 300]) {
    const rho = (nu * 0.55 * 8) / 1000;
    assert(
      Math.abs(defocusedOtf(nu, 0, 550, 8, 4096) - circularOtf(rho)) < 2e-6,
    );
  }
});
test("on-axis radial integration converges to analytic sinc-squared with midpoint order", () => {
  for (const delta of [0, 20, 60, 100]) {
    const exact = axialDensity(delta, 550, 8),
      coarse = Math.abs(radialDensity(0, delta, 550, 8, 1024) - exact),
      fine = Math.abs(radialDensity(0, delta, 550, 8, 4096) - exact);
    assert(fine < 1e-9);
    if (delta) assert(fine < coarse / 15);
    assert.equal(axialDensity(-delta, 550, 8), exact);
    assert(
      Math.abs(
        defocusedOtf(70, -delta, 550, 8) - defocusedOtf(70, delta, 550, 8),
      ) < 1e-14,
    );
  }
});
test("OTF defocus integral agrees with separate Cartesian pupil quadrature", () => {
  const n = 600,
    nu = 80,
    nm = 550,
    N = 8,
    delta = 50,
    shift = (2 * nu * nm * 0.001 * N) / 1000,
    b = (Math.PI * delta) / (4 * N * N * nm * 0.001);
  let sum = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = -1 + ((i + 0.5) * 2) / n,
        y = -1 + ((j + 0.5) * 2) / n;
      if (x * x + y * y <= 1 && (x + shift) ** 2 + y * y <= 1)
        sum += Math.cos(b * (x * x + y * y) - b * ((x + shift) ** 2 + y * y));
    }
  assert(
    Math.abs(
      (sum * (2 / n) ** 2) / Math.PI - defocusedOtf(nu, delta, nm, N, 4096),
    ) < 1e-4,
  );
});
test("conjugating pure defocus leaves the complete radial intensity and signed OTF unchanged", () => {
  for (const nm of [450, 550, 650]) for (const delta of [20, 60, 100]) {
    for (const r of [0, 2, 7, 12])
      assert.ok(Math.abs(radialDensity(r, delta, nm, 8) -
        radialDensity(r, -delta, nm, 8)) < 1e-14);
    for (const nu of [20, 80, 160])
      assert.ok(Math.abs(defocusedOtf(nu, delta, nm, 8) -
        defocusedOtf(nu, -delta, nm, 8)) < 1e-14);
  }
});
test("single-line endpoint, common coordinates and finite scan objectives", () => {
  const m = chromaticFocus({ band: 0, focus: 0 });
  assert(Math.abs(m.current.axis - m.idealAxis) < 1e-14);
  assert.equal(m.bestAxis.z, 0);
  const c = chromaticFocus();
  assert(c.scan.some((s) => s.z === c.bestMtf.z));
  assert(c.current.axis <= c.idealAxis);
  assert.throws(() => chromaticFocus({ fNumber: 0 }));
});
