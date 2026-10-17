import test from "node:test";
import assert from "node:assert/strict";
import {
  exposureBudget,
  exposureTruth,
  equalExposureTime,
  PLANCK,
  LIGHT_SPEED,
} from "./model.js";
const close = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) < t * Math.max(1, Math.abs(b)), `${a} != ${b}`);
test("exposure cone quadrature agrees with the independent solid-angle integral", () => {
  for (const fNumber of [2, Math.sqrt(8), 4, 8, 16, 32])
    for (const magnification of [0, 0.5, 1])
      for (const transmission of [0, 0.3, 0.8, 1]) {
        const a = exposureBudget({ fNumber, magnification, transmission }),
          b = exposureTruth(a.p);
        close(a.irradiance, b.irradiance, 1e-11);
        assert.ok(b.paraxial >= b.irradiance);
        close(
          (b.paraxial - b.irradiance) / Math.max(b.irradiance, 1e-30),
          transmission === 0 ? 0 : 1 / (4 * a.workingNumber * a.workingNumber),
          1e-9,
        );
      }
});
test("exposure reciprocity preserves photon budget but changes the motion interval", () => {
  const a = exposureBudget(),
    fNumber = Math.sqrt(32),
    b = exposureBudget({
      fNumber,
      exposureMs: equalExposureTime(a.p, fNumber),
    });
  close(a.photons, b.photons);
  close(b.p.exposureMs, (4 * 129) / 65);
  assert.ok(b.motionPixels > a.motionPixels * 1.9);
  close(a.motionPixels, 2.4);
});
test("exposure uses SI photon energy, fixed pixel area and quantum efficiency", () => {
  const a = exposureBudget();
  close(a.photons, (a.exposure * 16e-12) / ((PLANCK * LIGHT_SPEED) / 550e-9));
  close(a.electrons, 0.7 * a.photons);
  const macro = exposureBudget({ magnification: 1 });
  close(macro.irradiance / a.irradiance, 65 / 257);
});
test("exposure replay is an integral of constant light and uniform motion", () => {
  const a = exposureBudget({ progress: 25 });
  close(a.accumulatedPhotons, a.photons / 4);
  close(a.accumulatedMotion, 0.6);
  close(a.elapsedMs, 1);
  const zero = exposureBudget({ transmission: 0, velocity: 0, progress: 0 });
  close(zero.photons, 0);
  close(zero.accumulatedMotion, 0);
});
test("exposure rejects invalid physical quantities and replay endpoints", () => {
  for (const p of [
    { fNumber: 0 },
    { exposureMs: -1 },
    { transmission: 1.1 },
    { magnification: 2 },
    { velocity: NaN },
    { progress: 101 },
  ])
    assert.throws(() => exposureBudget(p), RangeError);
});
