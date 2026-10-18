import test from "node:test";
import assert from "node:assert/strict";
import { veilingFlare } from "./model.js";
const near = (a, b, e = 1e-12) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("known uniform veil reduces Michelson contrast with a fixed scene", () => {
  const m = veilingFlare();
  near(m.contrast, 9 / 11);
  near(m.observedContrast, 9 / 17);
  near(m.referenceContrast, m.observedContrast);
  assert.ok(m.observedContrast < m.contrast);
});
test("subtracting known mean restores contrast but not shot noise", () => {
  const m = veilingFlare();
  near(m.correctedHigh, 1000);
  near(m.correctedLow, 100);
  near(m.varianceLow, 416);
  assert.ok(m.darkSnrCorrected < m.darkSnrBefore);
  near(veilingFlare({ veil: 0 }).darkSnrCorrected, m.darkSnrBefore);
});
test("uniform scenes stay uniform and black is not zero-variance after subtraction", () => {
  near(veilingFlare({ bright: 100, dark: 100 }).observedContrast, 0);
  const m = veilingFlare({ dark: 0, veil: 200, readNoise: 0 });
  near(m.correctedLow, 0);
  near(m.varianceLow, 200);
});
test("zero signal and zero variance have no SNR ratio", () => {
  const m = veilingFlare({ dark: 0, veil: 0, readNoise: 0 });
  assert.equal(m.darkSnrBefore, null);
  assert.equal(m.darkSnrCorrected, null);
});
test("gain-unit scaling preserves contrast and shot-noise-free signal ratios", () => {
  const a = veilingFlare(),
    b = veilingFlare({ bright: 2000, dark: 200, veil: 600, readNoise: 0 });
  near(a.observedContrast, b.observedContrast);
  near(a.contrast, b.contrast);
});
test("invalid veil parameters do not produce a plausible image", () => {
  for (const p of [
    { bright: 0 },
    { dark: -1 },
    { dark: 1001 },
    { veil: -1 },
    { readNoise: NaN },
  ])
    assert.throws(() => veilingFlare(p), RangeError);
});
