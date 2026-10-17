import test from "node:test";
import assert from "node:assert/strict";
import { multiply, translation, lens, systemMatrix, traceRay, lensSystem } from "./model.js";
const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("paraxial textbook telephoto has f=200, BFD=100, total length=150 and distinct principal planes", () => {
  const m = lensSystem();
  m.matrix.forEach((x, i) => near(x, [0.5, 50, -0.005, 1.5][i]));
  near(m.focalLength, 200); near(m.bfd, 100); near(m.tracedDistance, 100);
  near(m.H1, -100); near(m.H2, -50); near(m.H2 + m.focalLength, 150);
  near(m.sensorSpread, 0); near(m.matrixPower, 5); near(m.analyticPower, 5);
  const changed = lensSystem({ gap: 40 });
  near(changed.focalLength, 250); near(changed.bfd, 150);
  near(changed.sensorSpread, 0.16);
});
test("paraxial reverse-telephoto length and last-surface focus are not effective focal length", () => {
  const m = lensSystem({ power1: -10, power2: 15, gap: 50, sensor: 170 });
  near(m.focalLength, 80); near(m.bfd, 120); near(m.sensorSpread, 0);
  near(m.H2, 90); near(m.H2 + m.focalLength, 170);
});
test("paraxial afocal and zero-power cases report no finite focal length or principal planes", () => {
  for (const p of [{ power1: 10, power2: 10, gap: 200, sensor: 300 }, { power1: 0, power2: 0 }]) {
    const m = lensSystem(p);
    assert.equal(m.afocal, true);
    for (const key of ["focalLength", "bfd", "H1", "H2", "imageDistance", "tracedDistance"])
      assert.equal(m[key], null);
    near(m.determinant, 1);
  }
  // An afocal SYSTEM can still form a finite conjugate of a finite object.
  const finite = lensSystem({ power1: 10, power2: 10, gap: 200, sensor: 300, finite: true });
  near(finite.imageDistance, -800); near(finite.magnification, -1);
});
test("paraxial object at the front focal plane collimates; virtual images keep their signs", () => {
  const frontFocus = lensSystem({ power1: 10, power2: 0, gap: 0, finite: true, objectDistance: 100 });
  assert.equal(frontFocus.imageDistance, null); assert.equal(frontFocus.tracedDistance, null);
  const virtual = lensSystem({ power1: -10, power2: 0, gap: 0, finite: true, objectDistance: 500 });
  near(virtual.imageDistance, -1000 / 12); near(virtual.tracedDistance, -1000 / 12);
  near(virtual.magnification, 1 / 6);
});
test("paraxial thin-lens finite conjugate recovers 50 mm at 2 m independently", () => {
  const m = lensSystem({ power1: 20, power2: 0, gap: 0, finite: true, objectDistance: 2000, sensor: 50 * 2000 / 1950 });
  near(m.imageDistance, 51.28205128205128); near(m.sensorSpread, 0);
  near(m.magnification, -50 / 1950); near(m.imageHeight, 0.25 * m.magnification);
});
test("paraxial matrix products, explicit power formula and direct angle kicks agree across UI domain", () => {
  for (const power1 of [-20, 0, 10, 20]) for (const power2 of [-20, 0, 10, 20])
    for (const gap of [0, 40, 50, 200, 250]) for (const finite of [false, true]) {
      const p = { power1, power2, gap, sensor: 400, finite, objectDistance: 500 };
      const m = lensSystem(p), [A, B, C, D] = m.matrix;
      near(m.determinant, 1); near(m.matrixPower, m.analyticPower);
      near(A, 1 - gap * power1 / 1000); near(B, gap); near(D, 1 - gap * power2 / 1000);
      for (const r of m.rays) {
        near(r.height2, A * r.height + B * r.angle);
        near(r.after2, C * r.height + D * r.angle);
      }
      if (m.imageDistance !== null) {
        near(m.imageDistance, m.tracedDistance, 1e-7);
        for (const r of m.rays) near(r.height2 + m.imageDistance * r.after2, m.imageHeight, 1e-9);
      } else assert.equal(m.tracedDistance, null);
      if (!m.afocal) {
        const equivalent = multiply(translation(p.gap - m.H2), multiply(lens(1 / m.focalLength), translation(m.H1)));
        equivalent.forEach((x, i) => near(x, m.matrix[i], 1e-8));
      }
    }
});
test("paraxial coincident groups add power; direct trace is independent of any injected matrix", () => {
  const m = systemMatrix({ power1: 7, power2: -3, gap: 0 });
  m.forEach((x, i) => near(x, lens(0.004)[i]));
  const p = { power1: 10, power2: -10, matrix: [999, 999, 999, 999] };
  const r = traceRay(p, 3, 0);
  near(r.height2, 1.5); near(r.after2, -0.015); near(r.sensorHeight, 0);
});
test("paraxial invalid distances and nonfinite inputs fail explicitly", () => {
  for (const p of [{ gap: -1 }, { sensor: 10 }, { power1: NaN }, { objectDistance: 0 }])
    assert.throws(() => lensSystem(p), RangeError);
  assert.throws(() => traceRay({}, Infinity, 0), RangeError);
});
