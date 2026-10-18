import test from "node:test";
import assert from "node:assert/strict";
import { spec } from "./lesson.js";
test("focus-grid selection changes the dedicated marker while the separate grouped experiment stays identical", () => {
  const base = Object.fromEntries(spec.controls.map((c) => [c.key, c.value]));
  const a = spec.evaluate({ ...base, grid: 0 }),
    b = spec.evaluate({ ...base, grid: 2 });
  assert.equal(a.figure, b.figure);
  const p = a.panels.find((p) => p.title.startsWith("对焦包围")),
    q = b.panels.find((p) => p.title.startsWith("对焦包围"));
  assert.ok(p && q);
  assert.equal(p.markers[0].value, 9);
  assert.equal(q.markers[0].value, 33);
  assert.deepEqual(p.curves, q.curves);
  assert.deepEqual(
    p.curves[0].points.map((x) => x[0]),
    [9, 17, 33],
  );
  assert.ok(
    p.curves[0].points.some((x, i) => x[1] !== p.curves[1].points[i][1]),
  );
});
