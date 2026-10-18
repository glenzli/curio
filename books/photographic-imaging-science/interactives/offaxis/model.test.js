import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  diskIntegral,
  diskTruth,
  radialTruth,
  illumination,
} from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("axis disk truth recovers the exact cone integral; scale and field reflection preserve it", () => {
  for (const a of [0, 0.005, 0.05, 0.35, 2]) {
    near(diskTruth(a, 0), (Math.PI * a * a) / (1 + a * a));
    for (const h of [0, 0.7, 2]) {
      near(diskTruth(a, h), diskTruth(a, -h));
      near(diskTruth(a * 60, h * 60, 60), diskTruth(a, h));
    }
  }
});
test("direct pupil quadrature and independent radial integration check closed form across the display domain", () => {
  for (const a of [0.005, 0.05, 0.2, 0.35])
    for (const angle of [0, 20, 45, 65]) {
      const h = Math.tan((angle * Math.PI) / 180),
        truth = diskTruth(a, h);
      near(radialTruth(a, h), truth, 1e-11);
      assert.ok(Math.abs(diskIntegral(a, h) / truth - 1) < 3e-6);
    }
});
test("four cosine powers separate projected pupil, inverse distance squared and receiver cosine", () => {
  const m = illumination();
  near(m.projection * m.distance * m.receiver, 0.25);
  near(m.smallPupil, 0.25);
  near(m.heightMm, 60);
  near(m.distanceMm, 60 * Math.sqrt(2));
  assert.ok(m.truth > m.smallPupil);
  near(m.relative, m.truth, 1e-7);
});
test("small-pupil limit converges to cosine-fourth while a finite disk retains a measurable correction", () => {
  for (const angle of [20, 45, 65]) {
    const a = illumination({ angle, radiusRatio: 0.005 }),
      b = illumination({ angle, radiusRatio: 0.35 });
    assert.ok(Math.abs(a.truth - a.smallPupil) < 3e-5);
    assert.ok(b.truth > b.smallPupil);
    assert.ok(b.truth - b.smallPupil > a.truth - a.smallPupil);
  }
  const a = 0.35,
    h = 0.6,
    t = diskTruth(a, h);
  assert.ok(
    Math.abs(diskIntegral(a, h, 1, 64, 128) - t) <
      Math.abs(diskIntegral(a, h, 1, 8, 32) - t),
  );
});
test("zero aperture has zero irradiance; invalid or unsupported geometry is rejected", () => {
  near(diskIntegral(0, 1), 0);
  near(diskTruth(0, 1), 0);
  for (const p of [{ angle: 90 }, { radiusRatio: 0 }, { progress: NaN }])
    assert.throws(() => parameters(p));
  assert.throws(() => diskTruth(-1, 0));
  assert.throws(() => diskIntegral(1, 0, 0));
  assert.throws(() => radialTruth(1, 0, 1, 3));
});

test("finite-pupil correction matches Gardner 1947 Table 1 rounded reference at sin(alpha)=1/4 and 40 degrees", () => {
  const a = 1 / Math.sqrt(15),
    h = Math.tan((40 * Math.PI) / 180),
    ratio =
      diskTruth(a, h) / diskTruth(a, 0) / Math.cos((40 * Math.PI) / 180) ** 4;
  near(ratio, 1.076, 0.0005);
});
