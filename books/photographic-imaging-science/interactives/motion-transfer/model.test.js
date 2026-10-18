import test from "node:test";
import assert from "node:assert/strict";
import {
  integrateOtf,
  analyticOtf,
  motionTransfer,
  position,
  scene,
} from "./model.js";
const near = (a, b, t = 2e-5) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("constant displacement changes phase and preserves every MTF; DC and zero-width limits", () => {
  for (const f of [0, 0.1, 0.45])
    near(integrateOtf({ mode: 0, offset: 3 }, f).mtf, 1);
  for (const mode of [0, 1, 2, 3]) {
    near(integrateOtf({ mode, rms: 0 }, 0.2).re, 1);
    near(integrateOtf({ mode }, 0).re, 1);
  }
});
test("time integration agrees with uniform, two-point and angular integral references", () => {
  for (const mode of [1, 2, 3])
    for (const offset of [-2, 0, 1.3])
      for (const f of [0.03, 0.125, 0.37]) {
        const p = { mode, rms: 2, offset },
          a = integrateOtf(p, f, 8192),
          b = analyticOtf(p, f);
        near(a.re, b.re, 2e-7);
        near(a.im, b.im, 2e-7);
      }
  near(analyticOtf({ mode: 2, rms: 2 }, 0.125).mtf, 0);
  assert.ok(analyticOtf({ mode: 1, rms: 2 }, 0.125).mtf > 0.1);
});
test("Fourier image matches a separate spatial exposure integral; partial exposure preserves its weight", () => {
  const m = motionTransfer({ mode: 3, rms: 2.5, offset: 1.2, progress: 0.5 });
  const x = 37,
    y = 12;
  let sum = 0;
  for (let i = 0; i < 128; i++)
    sum += scene(x - position(m.p, (i + 0.5) / 256), y) / 256;
  near(m.image[y * 112 + x], sum, 1e-12);
  near(m.fraction, 0.5);
  near(motionTransfer({ progress: 0 }).image[0], 0);
  for (const mode of [1, 2, 3])
    near(motionTransfer({ mode, rms: 2 }).centeredRms, 2, 4e-6);
  assert.throws(() => motionTransfer({ progress: NaN }), RangeError);
});
