import test from "node:test";
import assert from "node:assert/strict";
import { parameters, rampState, thresholdTruth } from "./model.js";
const near = (a, b, e = 1e-12) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("single-slope latch agrees with independent voltage-interval sweep at every code and threshold", () => {
  for (const bits of [3, 8, 12])
    for (const fullScale of [0.8, 1, 1.2]) {
      const levels = 2 ** bits;
      for (let k = 0; k < levels; k++)
        for (const offset of [0, 0.5, 0.999]) {
          const fraction = (k + offset) / levels,
            m = rampState({ bits, fullScale, inputFraction: fraction });
          const t = thresholdTruth(fraction * fullScale, bits, fullScale);
          assert.equal(m.channels[0].code, t.code);
          near(m.channels[0].reconstruction, t.reconstruction);
          assert.ok(Math.abs(m.channels[0].error) <= m.delta / 2 + 1e-12);
        }
    }
});
test("ramp crossing latches once while other columns keep waiting for the common scan", () => {
  const before = rampState({ progress: 30 }),
    at = rampState({ progress: 37.5 }),
    after = rampState({ progress: 60 }),
    end = rampState();
  assert.equal(before.channels[0].latchedCode, null);
  assert.equal(at.channels[0].latchedCode, 96);
  assert.equal(after.channels[0].latchedCode, 96);
  assert.equal(after.channels[1].latchedCode, null);
  assert.equal(end.channels[1].latchedCode, 192);
  assert.equal(end.channels[2].crossed, false);
  assert.equal(end.channels[2].latchedCode, 255);
  assert.equal(end.channels[2].overRange, true);
  near(at.elapsedUs, 9.6);
  assert.equal(at.clockCount, 96);
  assert.equal(end.clockCount, 256);
});
test("two additional bits quadruple scan time and quarter voltage step at a fixed clock", () => {
  for (const bits of [3, 8, 12]) {
    const a = rampState({ bits }),
      b = rampState({ bits: bits + 2 });
    near(b.totalUs, 4 * a.totalUs);
    near(b.delta, a.delta / 4);
  }
  near(rampState({ clockMHz: 20 }).totalUs, 12.8);
});
test("unipolar bounds distinguish zero, full-scale, under-range and no-crossing saturation", () => {
  for (const [fraction, code, under, over] of [
    [-0.1, 0, true, false],
    [0, 0, false, false],
    [1, 255, false, true],
    [1.1, 255, false, true],
  ]) {
    const c = rampState({ inputFraction: fraction }).channels[0];
    assert.equal(c.code, code);
    assert.equal(c.underRange, under);
    assert.equal(c.overRange, over);
  }
  assert.equal(
    rampState({ inputFraction: 0, progress: 0 }).channels[0].latchedCode,
    0,
  );
});
test("ADC rejects malformed clocks, ranges, bit counts and playback positions", () => {
  for (const p of [
    { bits: 2 },
    { bits: 8.2 },
    { bits: 15 },
    { clockMHz: 0 },
    { fullScale: 0 },
    { progress: NaN },
    { progress: 101 },
    { inputFraction: 2 },
  ])
    assert.throws(() => parameters(p), RangeError);
});
