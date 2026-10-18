import test from "node:test";
import assert from "node:assert/strict";
import { spec } from "./lesson.js";
test("changing feedback gain at step zero preserves the first observation but changes the trajectory preview", () => {
  const base = Object.fromEntries(spec.controls.map((c) => [c.key, c.value]));
  const a = spec.evaluate({ ...base, noise: 0, gain: 0.3, step: 0 }),
    b = spec.evaluate({ ...base, noise: 0, gain: 1.7, step: 0 });
  assert.deepEqual(a.model.current.observations, b.model.current.observations);
  assert.equal(a.model.group, b.model.group);
  assert.notDeepEqual(
    a.model.history.map((h) => h.group),
    b.model.history.map((h) => h.group),
  );
  assert.notEqual(a.figure, b.figure);
  assert.match(a.figure, /完整回放预览/);
});
