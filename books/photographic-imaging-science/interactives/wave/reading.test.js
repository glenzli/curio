import test from "node:test";
import assert from "node:assert/strict";
import { propagate, amplitudeAt, circularOtf } from "./model.js";
import { readingPoint, migrateWaveSession } from "./reading.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("physical probe stays fixed when aperture or wavelength changes and drives a different phasor", () => {
  const s = { probeUm: 4.4, frequencyLpMm: 60, sumProgress: 1 },
    a = readingPoint(propagate({ fNumber: 4, diameter: 128 }), s),
    b = readingPoint(propagate({ fNumber: 16, diameter: 128 }), s);
  near(a.probeUm, b.probeUm);
  near(b.airyRadiusUm / a.airyRadiusUm, 4);
  near(a.diameterMm / b.diameterMm, 4);
  assert.ok(Math.abs(a.full[0] - b.full[0]) > 0.1);
  assert.ok(a.h[0] > b.h[0]);
  const c = readingPoint(propagate({ wavelengthNm: 700 }), s),
    d = readingPoint(propagate({ wavelengthNm: 400 }), s);
  assert.ok(c.airyRadiusUm > d.airyRadiusUm);
  assert.ok(c.h[0] < d.h[0]);
});
test("strip readout begins at zero, reaches the complete integral and uses the selected physical coordinate", () => {
  const g = propagate({ diameter: 128 }),
    s = { probeUm: 4.4, frequencyLpMm: 60 };
  const a = readingPoint(g, { ...s, sumProgress: 0 }),
    b = readingPoint(g, { ...s, sumProgress: 0.5 }),
    c = readingPoint(g, { ...s, sumProgress: 1 });
  assert.deepEqual(a.partial, [0, 0]);
  assert.equal(b.strips, 16);
  assert.equal(c.strips, 32);
  const fft = amplitudeAt(g, 4);
  near(c.full[0], fft[0]);
  near(c.full[1], fft[1]);
  near(c.h[0], circularOtf(60 / g.cutoff));
  const zero = readingPoint(g, { ...s, probeUm: 0, sumProgress: 0.5 });
  assert.ok(
    zero.trace.every((z, i) => i === 0 || z[0] >= zero.trace[i - 1][0]),
  );
  near(zero.full[0], 1);
});
test("version-one relative coordinates migrate to physical units without reinterpreting the old selection", () => {
  const old = {
    version: 1,
    parameters: {
      fNumber: 22,
      wavelengthNm: 590,
      probe: 1.25,
      rho: 0.609375,
      progress: 100,
      enhanced: false,
    },
  };
  const next = migrateWaveSession(old);
  near(next.parameters.probeUm, 16.225);
  near(next.parameters.frequencyLpMm, (0.609375 * 1000) / 12.98);
  assert.equal(next.parameters.sumProgress, 1);
  assert.equal(next.parameters.enhanced, false);
  assert.equal(next.version, 2);
  assert.equal(old.parameters.probe, 1.25);
  const current = { version: 2, parameters: { probeUm: 7 } };
  assert.equal(migrateWaveSession(current), current);
  assert.equal(migrateWaveSession(null), null);
});
