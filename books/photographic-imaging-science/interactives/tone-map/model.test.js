import test from "node:test";
import assert from "node:assert/strict";
import { shoulder, inverseShoulder, tone } from "./model.js";
test("shoulder is C1, monotonic and invertible below its asymptote", () => {
  for (const knee of [0.2, 0.6, 0.8]) {
    assert.equal(shoulder(knee, knee), knee);
    assert(Math.abs((shoulder(knee + 1e-6, knee) - knee) / 1e-6 - 1) < 3e-6);
    for (const x of [0, 0.1, 0.7, 1, 2, 4]) {
      assert(Math.abs(inverseShoulder(shoulder(x, knee), knee) - x) < 1e-8);
      assert(shoulder(x + 0.001, knee) > shoulder(x, knee));
    }
  }
});
test("capture clipping is irreversible; display shoulder is a separate mapping", () => {
  const m = tone();
  assert.equal(m.at(5).mapped, m.at(8).mapped);
  assert(m.at(1).mapped < m.at(2).mapped);
  assert.equal(m.at(8).captured, 4);
});
test("finite codes can merge even inputs below sensor saturation", () => {
  const m = tone({ bits: 4, capacity: 20, exposure: 2, probe: 2 });
  assert.equal(m.current.code, 15);
  assert.equal(m.current.decoded, null);
  assert(m.whiteInput < 20);
  assert.throws(() => inverseShoulder(1));
});
