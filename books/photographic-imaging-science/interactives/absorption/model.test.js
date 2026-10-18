import test from "node:test";
import assert from "node:assert/strict";
import { absorption } from "./model.js";
test("absorption, collection and reflected light have distinct budgets", () => {
  const m = absorption();
  assert(m.qe < m.absorbed && m.absorbed < 0.9);
  assert(Math.abs(m.qe - m.integral) < 1e-8);
});
test("ideal collection, dead layer and reflection endpoints", () => {
  const m = absorption({ dead: 0, collection: 1e14 });
  assert(Math.abs(m.qe - m.absorbed) < 1e-12);
  assert.equal(absorption({ dead: 7 }).qe, 0);
  assert.equal(absorption({ dead: 7 }).density(6), 0);
  assert.equal(absorption({ reflection: 1 }).qe, 0);
});
test("shorter penetration is not always better with a dead entrance layer", () => {
  assert(absorption({ length: 0.01 }).qe < absorption({ length: 1 }).qe);
  for (const length of [0.1, 1, 10, 100])
    for (const dead of [0, 0.5, 5.99]) {
      const m = absorption({ length, dead });
      assert(Math.abs(m.qe - m.integral) < 2e-7);
      assert(m.qe >= 0 && m.qe <= m.absorbed);
    }
});
test("invalid scales fail instead of silently producing efficiencies", () => {
  assert.throws(() => absorption({ length: 0 }));
  assert.throws(() => absorption({ reflection: 2 }));
});
