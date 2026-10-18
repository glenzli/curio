import test from "node:test";
import assert from "node:assert/strict";
import { sharpening, gain, sharpenValue } from "./model.js";
const near = (a, b, t = 1e-11) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("DC, zero strength, sinusoidal gain and radius-dependent zeros are preserved", () => {
  near(
    sharpenValue(() => 0.37, 12, 2, 3),
    0.37,
  );
  near(gain(0, 2, 4), 1);
  const m = sharpening({ amount: 0 });
  assert.deepEqual(m.output, m.capture);
  for (const radius of [1, 2, 4]) {
    near(gain(1 / radius, 1, radius), 1);
    near(gain(0.5 / radius, 1, radius), 3);
  }
  const f = 0.17,
    x = 8.3;
  near(
    sharpenValue((q) => Math.cos(2 * Math.PI * f * q), x, 0.8, 2),
    gain(f, 0.8, 2) * Math.cos(2 * Math.PI * f * x),
  );
});
test("edge differences independently recover discrete transfer, including above-unity output", () => {
  for (const sigma of [0, 0.7, 1.2, 2.7])
    for (const radius of [1, 3]) {
      const m = sharpening({ sigma, radius, noise: 0 });
      for (const f of m.frequencies) near(f.edge, f.combined);
    }
  const m = sharpening({ sigma: 0.7, amount: 1.5, noise: 0 });
  assert.ok(m.frequencies.some((f) => f.combined > 1.01));
  assert.ok(m.overshoot > 0.05);
  assert.ok(m.clipped >= 0);
});
test("the same captured observation is reused across sharpening changes and noise follows filter energy", () => {
  const a = sharpening({ amount: 0 }),
    b = sharpening({ amount: 1.2 });
  assert.deepEqual(a.capture, b.capture);
  assert.ok(Math.abs(b.noiseObserved / b.noiseTruth - 1) < 0.035);
  near(sharpening({ noise: 0 }).noiseObserved, 0);
  assert.throws(() => sharpening({ radius: 0 }), RangeError);
});
