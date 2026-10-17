import test from "node:test";
import assert from "node:assert/strict";
import { samplingModel } from "./model.js";
test("folded sinusoid passes every integrated sample at all phases", () => {
  for (const frequency of [0.2, 0.5, 0.8, 1, 1.3])
    for (const phase of [0, 0.13, 0.25, 0.7])
      for (const width of [0, 0.4, 1]) {
        const m = samplingModel({ frequency, phase, width });
        for (let n = 0; n < 20; n++)
          assert.ok(Math.abs(m.integrated(n) - m.alias(n)) < 1e-12);
      }
});
test("box integral agrees with quadrature and Nyquist sine can disappear", () => {
  const m = samplingModel({ frequency: 0.8, phase: 0.13, width: 1 });
  let sum = 0;
  const count = 10000;
  for (let i = 0; i < count; i++)
    sum += m.raw(-0.5 + (i + 0.5) / count) / count;
  assert.ok(Math.abs(sum - m.integrated(0)) < 1e-8);
  const boundary = samplingModel({ frequency: 0.5, phase: 0.25 });
  for (let i = 0; i < 16; i++)
    assert.ok(Math.abs(boundary.integrated(i) - 0.5) < 1e-12);
  assert.ok(Math.abs(samplingModel({ frequency: 1, width: 1 }).gain) < 1e-12);
  assert.throws(() => samplingModel({ width: -1 }), RangeError);
});
