import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  traceRay,
  apertureDisks,
  intersectionArea,
  sampledArea,
  apertureBudget,
  IMAGE_Z,
} from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("direct ray heights agree with independent ABCD disks on both transverse coordinates", () => {
  for (const field of [-3, 0, 3])
    for (const hx of [-3, -1, 0, 1, 3])
      for (const hy of [-1, 0, 1]) {
        const p = { field, frontRadius: 4, middleRadius: 2, rearRadius: 3 },
          r = traceRay(p, hx, hy),
          disks = apertureDisks(p);
        r.heights.forEach(([x, y], j) => {
          near(x, disks[j].a * hx + (disks[j].b * field * Math.PI) / 180);
          near(y, disks[j].a * hy);
        });
        assert.equal(
          r.passed,
          disks.every(
            (c) =>
              (hx - c.center) ** 2 + hy * hy <= c.radius * c.radius + 1e-10,
          ),
        );
        if (r.passed) {
          near(r.route.at(-1)[0], IMAGE_Z);
          near(r.route.at(-1)[1], ((500 / 9) * field * Math.PI) / 180);
          near(r.route.at(-1)[2], 0);
        }
      }
});
test("first physical obstruction terminates the drawn route, with no propagation through blocked holes", () => {
  for (const [p, x, block, z] of [
    [{ frontRadius: 1 }, 2, "front", 0],
    [{}, 3, "middle", 25],
    [{ field: 3 }, 0, "rear", 60],
  ]) {
    const r = traceRay(p, x);
    assert.equal(r.blocked, block);
    near(r.route.at(-1)[0], z);
  }
  assert.ok(traceRay({ field: 0 }, 0).passed);
});
test("independent arc integration covers equal disks, containment, disjointness, tangency and a known lens area", () => {
  near(
    intersectionArea([
      { center: 0, radius: 2 },
      { center: 0, radius: 3 },
    ]),
    4 * Math.PI,
  );
  near(
    intersectionArea([
      { center: 0, radius: 1 },
      { center: 3, radius: 1 },
    ]),
    0,
  );
  near(
    intersectionArea([
      { center: 0, radius: 1 },
      { center: 2, radius: 1 },
    ]),
    0,
  );
  near(
    intersectionArea([
      { center: 0, radius: 1 },
      { center: 1, radius: 1 },
    ]),
    (2 * Math.PI) / 3 - Math.sqrt(3) / 2,
  );
  near(
    intersectionArea([
      { center: 0, radius: 0 },
      { center: 0, radius: 1 },
    ]),
    0,
  );
});
test("ray-counted area converges to the independent three-circle truth; opposite fields mirror", () => {
  const p = { field: 2 },
    t = intersectionArea(apertureDisks(p)),
    a = sampledArea(p, 60),
    b = sampledArea(p, 240);
  assert.ok(Math.abs(b.area - t) < 0.025);
  assert.ok(Math.abs(b.area - t) < Math.abs(a.area - t));
  for (const field of [0, 1, 2, 3])
    near(
      apertureBudget({ field }, 40).truth,
      apertureBudget({ field: -field }, 40).truth,
    );
  const m = apertureBudget();
  assert.ok(Math.abs(m.sampledRelative - m.relativeArea) < 0.01);
  assert.equal(
    m.sample.passed +
      Object.values(m.sample.blocked).reduce((a, b) => a + b, 0),
    m.sample.launched,
  );
});
test("axis aperture stop follows the smallest mapped radius, not a permanent middle-ring label", () => {
  assert.deepEqual(apertureBudget({}, 20).limiting, ["中间孔径"]);
  assert.deepEqual(apertureBudget({ frontRadius: 1 }, 20).limiting, [
    "前组孔径",
  ]);
  assert.deepEqual(apertureBudget({ rearRadius: 0.5 }, 20).limiting, [
    "后组孔径",
  ]);
  const m = apertureBudget({ field: 0 }, 240);
  near(m.relativeArea, 1);
  near(m.truth, 4 * Math.PI);
  assert.ok(Math.abs(m.sample.area - m.truth) < 0.03);
});
test("invalid finite apertures and quadrature grids fail explicitly", () => {
  for (const p of [
    { field: 4 },
    { frontRadius: 0 },
    { middleRadius: NaN },
    { progress: 101 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => sampledArea({}, 1));
  assert.throws(() => intersectionArea([]));
});
