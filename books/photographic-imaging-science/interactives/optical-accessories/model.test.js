import test from "node:test";
import assert from "node:assert/strict";
import { extensionTube, teleconverter, reverseConjugates } from "./model.js";
const near = (a, b, e = 1e-9) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("25mm tube on a 50mm lens: conjugates, light cone and sensor reference", () => {
  const m = extensionTube();
  near(m.magnification, 0.5);
  near(m.objectDistance, 150);
  near(m.imageDistance, 75);
  near(m.sensorObjectDistance, 225);
  near(m.effectiveFNumber, 6);
  near(m.exposureFactor, 2.25);
  near(m.imageError, 0);
});
test("zero extension retains infinity; finite-focus magnifications add e/f", () => {
  const m = extensionTube({ extension: 0 });
  assert.equal(m.objectDistance, Infinity);
  near(m.imageDistance, 50);
  near(m.imageError, 0);
  near(
    extensionTube({ initialMagnification: 0.25, extension: 25 }).magnification,
    0.75,
  );
  for (const focal of [25, 50, 100])
    for (const extension of [0, 1, 25, 100]) {
      const a = extensionTube({ focal, extension });
      near(a.imageError, 0);
      if (extension)
        near(1 / a.objectDistance + 1 / a.imageDistance, 1 / focal);
    }
});
test("fixed thin lens sensor-to-object distance has its minimum at unit magnification", () => {
  near(extensionTube({ extension: 50 }).sensorObjectDistance, 200);
  assert.ok(extensionTube({ extension: 25 }).sensorObjectDistance > 200);
  assert.ok(extensionTube({ extension: 100 }).sensorObjectDistance > 200);
});
test("negative converter yields exact power, focus extension, aperture and exposure ratios", () => {
  for (const factor of [1, 1.4, 2, 2.5])
    for (const focal of [50, 100, 200])
      for (const remainingFraction of [0.1, 0.2, 0.4]) {
        const m = teleconverter({ factor, focal, remainingFraction });
        near(m.focalLength, m.matrixFocal);
        near(m.bfd, m.q);
        near(m.determinant, 1);
        near(m.imageError, 0);
        near(m.exposureFactor, (m.newFNumber / m.fNumber) ** 2);
      }
  const m = teleconverter();
  near(m.converterFocal, -40);
  near(m.imageZ, 120);
  near(m.focalLength, 200);
  near(m.newFNumber, 8);
  near(m.exposureStops, 2);
});
test("conjugate reversal preserves focal length and reciprocates signed magnification", () => {
  for (const reduction of [0.1, 0.2, 0.5, 1, 2]) {
    const m = reverseConjugates({ reduction });
    near(m.magnification * m.reversedMagnification, 1);
    near(1 / m.reversedObject + 1 / m.reversedImage, 1 / m.focal);
    near(-m.reversedImage / m.reversedObject, m.reversedMagnification);
  }
});
test("accessory models reject nonphysical powers and negative extension", () => {
  assert.throws(() => extensionTube({ extension: -1 }), RangeError);
  assert.throws(() => teleconverter({ factor: 0.5 }), RangeError);
  assert.throws(() => teleconverter({ remainingFraction: 1 }), RangeError);
  assert.throws(() => reverseConjugates({ reduction: 0 }), RangeError);
});
