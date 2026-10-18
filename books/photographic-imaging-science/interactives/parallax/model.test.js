import test from "node:test";
import assert from "node:assert/strict";
import {
  ray,
  project,
  intersect,
  parallax,
  NEAR,
  FAR,
  FOCAL,
} from "./model.js";
const near = (a, b, t = 1e-11) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("projection and independent ray-plane intersection are inverses for translated and rotated cameras", () => {
  for (const pose of [
    { translation: 0, yaw: 0 },
    { translation: 0.15, yaw: 2 },
    { translation: -0.2, yaw: -1 },
  ])
    for (const point of [
      [0.3, 0.1, 2],
      [-1, 0.3, 6],
    ]) {
      const [u, v] = project(point, pose),
        r = ray(u, v, pose),
        t = point[2] / r.direction[2];
      near(r.origin[0] + t * r.direction[0], point[0]);
      near(t * r.direction[1], point[1]);
    }
  const pose = { translation: 0.15, yaw: 0 };
  near(
    project([0, 0, NEAR], pose)[0] - project([0, 0, FAR], pose)[0],
    -FOCAL * 0.15 * (1 / NEAR - 1 / FAR),
  );
});
test("pure rotation is independent of plane depth, while translation aligns only the chosen plane", () => {
  const a = parallax({ translation: 0, yaw: 1.2, plane: 2 }),
    b = parallax({ translation: 0, yaw: 1.2, plane: 6 });
  for (let i = 0; i < a.global.values.length; i++)
    if (a.global.valid[i] && b.global.valid[i])
      near(a.global.values[i], b.global.values[i], 1e-12);
  const far = parallax({ translation: 0.2, yaw: 0, plane: 6 }),
    close = parallax({ translation: 0.2, yaw: 0, plane: 2 });
  assert.ok(far.nearRmse > far.farRmse * 3);
  assert.ok(close.farRmse > close.nearRmse * 2);
});
test("occluded points stay missing and zero movement reproduces all common observed samples", () => {
  const zero = parallax({ translation: 0, yaw: 0 });
  near(zero.rmse, 0);
  near(zero.oracleRmse, 0);
  const m = parallax({ translation: 0.25, yaw: 1 });
  assert.ok(m.lost > 0);
  assert.ok(m.count < 96 * 64);
  assert.ok(m.rmse > m.oracleRmse);
  assert.ok(m.common.every((v, i) => !v || m.visible[i]));
  assert.equal(intersect(47.5, 31.5, { translation: 0, yaw: 0 }).depth, NEAR);
  assert.throws(() => parallax({ plane: 0 }), RangeError);
});
