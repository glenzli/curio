import test from "node:test";
import assert from "node:assert/strict";
import {
  indexAt,
  dispersion,
  lines,
  achromaticPowers,
  doublet,
  defocusDiameter,
} from "./model.js";
const near = (a, b, tol = 1e-10) =>
  assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
test("Sellmeier agrees with independent SCHOTT catalog line indices and Abbe numbers", () => {
  for (const [glass, n, v, partial] of [
    ["bk7", 1.5168, 64.17, 0.5349],
    ["nf2", 1.62005, 36.43, 0.5881],
  ]) {
    near(indexAt(glass, lines.d), n, 0.000006);
    near(dispersion(glass).abbe, v, 0.015);
    near(dispersion(glass).partial, partial, 0.00015);
    for (let w = 440; w < 700; w++)
      assert.ok(indexAt(glass, w) > indexAt(glass, w + 1));
  }
  near(indexAt("bk7", lines.F), 1.52238, 0.000006);
  near(indexAt("nf2", lines.C), 1.61506, 0.000006);
});
test("textbook power allocation and equal-Abbe degeneracy", () => {
  const [a, b] = achromaticPowers(0.01, 60, 30);
  near(a, 0.02);
  near(b, -0.01);
  near(a / 60 + b / 30, 0);
  assert.equal(achromaticPowers(0.01, 60, 60), null);
});
test("actual catalog pair brings F and C together but retains secondary spectrum", () => {
  const base = doublet(),
    m = doublet({ ratio: base.solutionRatio });
  near(m.phi1 + m.phi2, 0.01);
  near(m.focusAt(lines.d), 100);
  near(m.focuses.F, m.focuses.C, 1e-10);
  near(m.primary, 0, 1e-18);
  near(m.powerAt(lines.g) - m.powerAt(lines.F), m.secondary, 1e-17);
  assert.ok(Math.abs(m.focuses.g - m.focuses.F) > 0.02);
  assert.ok(Math.abs(m.focuses.d - m.focuses.F) > 0.01);
});
test("same material cannot correct dispersion by changing positive/negative power allocation", () => {
  const singlet = doublet({ ratio: 1 }),
    same = doublet({ ratio: 3, sameGlass: true });
  assert.equal(same.solutionRatio, null);
  for (let w = 440; w <= 700; w += 5) near(same.focusAt(w), singlet.focusAt(w));
  assert.ok(Math.abs(same.focuses.F - same.focuses.C) > 1);
});
test("focus scaling and paraxial defocus diameter preserve length units", () => {
  const a = doublet({ focalLength: 100 }),
    b = doublet({ focalLength: 200 });
  for (const w of Object.values(lines)) near(b.focusAt(w), 2 * a.focusAt(w));
  near(defocusDiameter(100, 100, 20), 0);
  near(defocusDiameter(100, 101, 20), 0.2);
  assert.throws(() => indexAt("bk7", 800));
  assert.throws(() => doublet({ ratio: Infinity }));
});
