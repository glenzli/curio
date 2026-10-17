import test from "node:test";
import assert from "node:assert/strict";
import { fieldResponse } from "./model.js";
test("axis has no field or orientation separation", () => {
  const m = fieldResponse({ height: 0, curvature: 75, astigmatism: 35 });
  assert.equal(m.radialFocus, 0);
  assert.equal(m.tangentialFocus, 0);
  assert.equal(m.radial, m.tangential);
});
test("pure curvature is recovered by refocus at the selected height", () => {
  const s = { height: 21.6, curvature: 75, astigmatism: 0, frequency: 30 };
  const fixed = fieldResponse(s),
    refocused = fieldResponse({ ...s, focus: 75 }),
    center = fieldResponse({ ...s, height: 0 });
  assert.ok(refocused.radial > fixed.radial);
  assert.equal(refocused.radial, center.radial);
  assert.equal(refocused.radialSigma, 1.8);
});
test("split focal surfaces cannot both attain the base width at one plane", () => {
  const s = { height: 21.6, curvature: 75, astigmatism: 35 };
  const mid = fieldResponse({ ...s, focus: 75 }),
    one = fieldResponse({ ...s, focus: 110 });
  assert.equal(mid.radial, mid.tangential);
  assert.ok(mid.radialSigma > 1.8);
  assert.equal(one.radialSigma, 1.8);
  assert.ok(one.tangentialSigma > 1.8);
  assert.ok(one.radial > one.tangential);
  assert.throws(() => fieldResponse({ height: 30 }), RangeError);
});
