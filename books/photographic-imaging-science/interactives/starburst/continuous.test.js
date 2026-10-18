import test from "node:test";
import assert from "node:assert/strict";
import {
  contour,
  boundaryAmplitude,
  boundaryDensity,
  exactArea,
  continuousPsf,
  IMAGE_STEP,
  IMAGE_SIZE,
} from "./continuous.js";
import { polarDensity } from "./model.js";
import { diskAmplitude } from "../wave/circle-reference.js";
import { airyRelative } from "../wave/model.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("continuous boundaries preserve polygon area and a stable zero-frequency limit", () => {
  for (const blades of [3, 4, 7, 8, 12]) {
    const s = contour({ blades });
    near(s.area, (blades * Math.sin((2 * Math.PI) / blades)) / 2);
    near(exactArea({ blades }), s.area);
    for (const q of [0, 1e-14, 1e-8, 1e-5])
      near(boundaryAmplitude(s, q, 0)[0], s.area, 1e-8);
  }
});
test("edge integrals agree with a square sinc product and independent polar area integration", () => {
  const sinc = (x) => (Math.abs(x) < 1e-10 ? 1 : Math.sin(x) / x),
    a = Math.SQRT1_2,
    s = contour({ blades: 4 });
  for (const [x, y] of [
    [0, 0],
    [0.7, 0.3],
    [3, 2],
    [10, 0],
    [14.2, 19.7],
  ]) {
    const z = boundaryAmplitude(s, x, y);
    near(z[0], 2 * sinc(Math.PI * a * x) * sinc(Math.PI * a * y));
    near(z[1], 0);
  }
  for (const roundness of [0, 0.45, 1]) {
    const p = { blades: 7, roundness, rotation: 13 },
      s = contour(p, 64),
      r = polarDensity(p, 1.3, 0.7, 256, 4096);
    near(boundaryDensity(s, 1.3, 0.7), r.density, 2e-6);
    assert.ok(Math.abs(s.area - exactArea(p)) < 0.0002);
  }
});
test("curved contour refinement converges without Cartesian diffraction spikes", () => {
  const p = { blades: 7, roundness: 0.7, rotation: 13 },
    a = contour(p, 32),
    b = contour(p, 64),
    c = contour(p, 128);
  for (const q of [
    [0.5, 0.8],
    [4, 1],
    [14, 20],
  ]) {
    const av = boundaryDensity(a, ...q),
      bv = boundaryDensity(b, ...q),
      cv = boundaryDensity(c, ...q);
    assert.ok(Math.abs(bv - cv) <= Math.abs(av - cv) * 0.35 + 1e-12);
    near(av, cv, 2e-6);
  }
});
test("circle integral agrees with Airy series and independent disk quadrature, including weak rings", () => {
  for (const q of [0, 0.1, 1.219669891, 2.5, 4, 6])
    near(diskAmplitude(q) ** 2, airyRelative(q), 1e-10);
  for (const q of [7, 15, 35, 50]) {
    let chord = 0;
    for (let i = 0; i < 2048; i++) {
      const a = (Math.PI * (i + 0.5)) / 2048;
      chord +=
        (2 * Math.sin(a) ** 2 * Math.cos(Math.PI * q * Math.cos(a))) / 2048;
    }
    near(diskAmplitude(q), chord, 1e-13);
  }
  const a = contour({ roundness: 1, blades: 3, rotation: 0 }),
    b = contour({ roundness: 1, blades: 12, rotation: 31 });
  near(boundaryDensity(a, 9, 11), boundaryDensity(b, 9, 11));
});
test("fixed physical image window and unit-flux normalization preserve f-number scaling and inversion", () => {
  near(IMAGE_SIZE * IMAGE_STEP, 177.1);
  const a = contour({ fNumber: 4 }),
    b = contour({ fNumber: 8 });
  near(boundaryDensity(a, 0, 0) / boundaryDensity(b, 0, 0), 4);
  const m = continuousPsf();
  assert.ok(m.retained > 0.97 && m.retained < 1);
  for (let k = 0; k < m.crop.length; k++)
    near(m.crop[k], m.crop[m.crop.length - 1 - k]);
});

test("rotating a continuous aperture rotates the field with the same coordinate convention", () => {
  const angle = (23 * Math.PI) / 180,
    a = contour({ blades: 7, rotation: 0 }),
    b = contour({ blades: 7, rotation: 23 });
  for (const [x, y] of [
    [0.8, 0.4],
    [3.2, 1.7],
    [12.1, 7.3],
  ]) {
    const before = boundaryAmplitude(
        a,
        x * Math.cos(angle) + y * Math.sin(angle),
        -x * Math.sin(angle) + y * Math.cos(angle),
      ),
      after = boundaryAmplitude(b, x, y);
    near(before[0], after[0]);
    near(before[1], after[1]);
  }
  const m = continuousPsf({ rotation: 23 }),
    x = 147,
    y = 97,
    center = (IMAGE_SIZE - 1) / 2;
  near(
    m.crop[y * IMAGE_SIZE + x],
    boundaryDensity(
      m.shape,
      ((x - center) * IMAGE_STEP) / (0.55 * 8),
      (-(y - center) * IMAGE_STEP) / (0.55 * 8),
    ),
  );
});
