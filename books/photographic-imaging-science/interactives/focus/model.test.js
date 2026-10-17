import test from "node:test";
import assert from "node:assert/strict";
import { focusGeometry } from "./model.js";
import { depthOfField } from "../dof/model.js";
const close = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

test("chapter 16 focus and blur match the thin-lens worked scale", () => {
  const value = focusGeometry();
  close(value.sensorDistanceMm, 51.282051282051285);
  close(value.imageDistanceMm, 52.63157894736842);
  close(value.blurDiameterMm, 0.3205128205128205);
  close(focusGeometry({ subjectDistanceMm: 2000 }).blurDiameterMm, 0);
  close(focusGeometry({ fNumber: 8 }).blurDiameterMm, value.blurDiameterMm / 2);
});

test("near and far cones have opposite signs; the far limit and analytic form agree", () => {
  assert.ok(focusGeometry({ subjectDistanceMm: 1000 }).signedRadiusMm > 0);
  assert.ok(focusGeometry({ subjectDistanceMm: 4000 }).signedRadiusMm < 0);
  close(
    focusGeometry({ subjectDistanceMm: 1e12 }).blurDiameterMm,
    2500 / (4 * 1950),
    1e-8,
  );
  for (const s of [300, 500, 1000, 1999, 2000, 2001, 4000, 6000])
    close(
      focusGeometry({ subjectDistanceMm: s }).blurDiameterMm,
      (2500 * Math.abs(s - 2000)) / (4 * s * 1950),
    );
});

test("the real-image model rejects its singular and nonphysical inputs", () => {
  for (const value of [0, -1, NaN, Infinity])
    assert.throws(() => focusGeometry({ fNumber: value }), RangeError);
  for (const value of [49, 50]) {
    assert.throws(() => focusGeometry({ focusDistanceMm: value }), RangeError);
    assert.throws(
      () => focusGeometry({ subjectDistanceMm: value }),
      RangeError,
    );
  }
});

test("3D cone radii agree with independent edge traces across its entire control domain", () => {
  for (const focus of [0.3, 0.5, 2, 6])
    for (const subject of [0.3, 1, 2, 6])
      for (const fNumber of [Math.sqrt(2), 4, 16]) {
        const cone = focusGeometry({
          focusDistanceMm: focus * 1000,
          subjectDistanceMm: subject * 1000,
          fNumber,
        });
        for (const criterionUm of [5, 30, 50]) {
          const traced = depthOfField({
            focalLength: 50,
            fNumber,
            focusVergence: 1 / focus,
            subjectVergence: 1 / subject,
            criterionUm,
          });
          close(cone.blurDiameterMm, traced.diameter);
          close(cone.sensorDistanceMm, traced.sensor);
        }
      }
});
