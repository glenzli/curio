import test from "node:test";
import assert from "node:assert/strict";
import {
  capturePair,
  estimateTranslation2D,
  parameters,
  WIDTH,
  HEIGHT,
  bilinear,
  scoreAt,
  resample,
  scene,
} from "./model.js";
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("observed-only search recovers signed 2D integer shifts and independent known-coordinate truth", () => {
  for (const [dx, dy] of [
    [0, 0],
    [3, -2],
    [-4, 3],
    [-2, -4],
  ]) {
    const { reference, moving } = capturePair({ dx, dy }),
      r = estimateTranslation2D(reference, moving);
    assert.equal(r.status, "ok");
    assert.deepEqual(r.offset, { dx, dy });
    near(r.best.score, 1);
    near(r.best.rmse, 0);
    for (const p of r.points)
      near(bilinear(moving, p.x + dx, p.y + dy), scene(p.x, p.y));
  }
});
test("quarter-pixel search has bounded error on declared smooth scene; grid pitch is not an accuracy claim", () => {
  for (const [dx, dy] of [
    [2.5, -1.75],
    [-1.25, 2.5],
    [0.1, -0.2],
  ]) {
    const pair = capturePair({ dx, dy }),
      r = estimateTranslation2D(pair.reference, pair.moving);
    assert.equal(r.status, "ok");
    assert.ok(Math.hypot(r.offset.dx - dx, r.offset.dy - dy) <= 0.2);
    assert.ok(scoreAt(pair.moving, r.points, dx, dy).rmse < 0.004);
  }
});
test("flat, one-directional and periodic observations are rejected rather than supplied with truth", () => {
  for (const [mode, status] of [
    ["flat", "texture"],
    ["stripes", "ambiguous"],
    ["tiles", "ambiguous"],
  ]) {
    const f = capturePair({ mode, dx: 2, dy: -1 }),
      r = estimateTranslation2D(f.reference, f.moving);
    assert.equal(r.status, status);
    assert.equal(r.offset, null);
  }
  const f = capturePair({ dx: 8, dy: 0 }),
    r = estimateTranslation2D(f.reference, f.moving);
  assert.equal(r.status, "boundary");
  assert.equal(r.offset, null);
});
test("occlusion is an observed model violation; unaffected top region remains usable", () => {
  const f = capturePair({ mode: "occlusion", dx: 3, dy: -2 });
  const all = estimateTranslation2D(f.reference, f.moving),
    top = estimateTranslation2D(f.reference, f.moving, { roi: "top" });
  assert.equal(all.status, "weak");
  assert.equal(top.status, "ok");
  assert.deepEqual(top.offset, { dx: 3, dy: -2 });
});
test("fixed common support excludes missing samples for every candidate and is never shift dependent", () => {
  const f = capturePair({ dx: 1, dy: 2 });
  f.moving[20 * WIDTH + 24] = NaN;
  const r = estimateTranslation2D(f.reference, f.moving);
  assert.ok(r.points.length > 24 && r.points.length < 609);
  for (const q of r.surface)
    assert.ok(Number.isFinite(q.score) && Number.isFinite(q.rmse));
  assert.equal(r.status, "ok");
  assert.deepEqual(r.offset, { dx: 1, dy: 2 });
  const invalid = new Float64Array(WIDTH * HEIGHT).fill(NaN);
  assert.equal(estimateTranslation2D(invalid, invalid).status, "support");
});
test("bilinear interpolation independently reproduces affine fields and marks out-of-frame pixels", () => {
  const a = Float64Array.from(
    { length: WIDTH * HEIGHT },
    (_, i) => 0.3 * (i % WIDTH) - 0.2 * Math.floor(i / WIDTH),
  );
  near(bilinear(a, 23.25, 17.75), 0.3 * 23.25 - 0.2 * 17.75);
  const out = resample(a, 2, -3);
  assert.ok(Number.isNaN(out[0]));
  near(out[20 * WIDTH + 10], 0.3 * 12 - 0.2 * 17);
  assert.equal(scoreAt(a, [{ x: 0, y: 0, value: 0 }], -1, 0).rmse, null);
});
test("seeded noise and saved mode are deterministic; search input validation rejects bad grids", () => {
  const a = capturePair({ noise: 0.02 }),
    b = capturePair({ noise: 0.02 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, capturePair({ noise: 0.02, seed: 42 }));
  const r = estimateTranslation2D(a.reference, a.moving);
  assert.equal(r.status, "ok");
  for (const p of [{ dx: 9 }, { noise: -1 }, { progress: Infinity }])
    assert.throws(() => parameters(p));
  for (const p of [{ step: 0 }, { step: 0.7 }, { limit: 100 }, { width: 1 }])
    assert.throws(() => estimateTranslation2D(a.reference, a.moving, p));
});
