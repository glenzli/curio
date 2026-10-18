import test from "node:test";
import assert from "node:assert/strict";
import { stepperSpec } from "./lesson.js";
test("the one-step enlargement reveals microstep changes even at an identical whole-motion position", () => {
  const base = Object.fromEntries(
    stepperSpec.controls.map((c) => [c.key, c.value]),
  );
  const a = stepperSpec.evaluate({ ...base, phase: 0.25, sublevel: 0 }),
    b = stepperSpec.evaluate({ ...base, phase: 0.25, sublevel: 4 });
  assert.equal(a.model.ideal, b.model.ideal);
  assert.equal(a.model.position, b.model.position);
  assert.equal(a.model.commandIntervalUm / b.model.commandIntervalUm, 16);
  assert.notEqual(a.figure, b.figure);
  assert.match(a.figure, /一个整步内/);
});
