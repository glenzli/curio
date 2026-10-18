import test from "node:test";
import assert from "node:assert/strict";
import { cdsSpectrum, spectrum, sample, apertureReference } from "./model.js";
const near = (a, b, t = 1e-8) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("CDS zero interval and one-tone complete/half periods give exact limits", () => {
  near(cdsSpectrum({ tau: 0 }).variance, 0);
  near(cdsSpectrum({ kind: 0, tau: 20, aperture: 0 }).variance, 0);
  near(cdsSpectrum({ kind: 0, tau: 10, aperture: 0 }).variance, 4 * 30 ** 2);
  near(cdsSpectrum({ kind: 0, tau: 10, aperture: 20 }).variance, 0);
});
test("frequency response, independent time samples and covariance agree for all spectral modes", () => {
  for (const kind of [0, 1, 2])
    for (const tau of [0, 0.7, 7.3, 21])
      for (const aperture of [0, 2.5, 11]) {
        const m = cdsSpectrum({ kind, tau, aperture });
        near(m.variance, m.timeVariance);
        near(m.variance, m.covarianceReference);
      }
});
test("rectangular aperture quadrature converges to sinusoidal integration; seed changes no budget", () => {
  const lines = spectrum();
  near(sample(lines, 17.3, 6), apertureReference(lines, 17.3, 6, 8192), 1e-6);
  near(cdsSpectrum({ seed: 3 }).variance, cdsSpectrum({ seed: 9 }).variance);
  assert.notEqual(
    cdsSpectrum({ seed: 3 }).first,
    cdsSpectrum({ seed: 9 }).first,
  );
  assert.throws(() => cdsSpectrum({ tau: -1 }), RangeError);
});
