import test from "node:test";
import assert from "node:assert/strict";
import { exposurePlan, rateVariance, shadowSNR, capture, sampleRate, fuseRates, fuseImage, sceneRate, WIDTH, HEIGHT, CAMERA_SHIFT } from "./model.js";
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("exposure modes distinguish fixed long time from fixed total time", () => {
  const long = exposurePlan(16, 4), total = exposurePlan(16, 4, true);
  near(long.short, .001); near(long.long, .016); near(long.total, .017);
  near(total.total, .016); near(total.long / total.short, 16);
});

test("rate-domain weights reproduce the chapter's Poisson and read-noise scale", () => {
  near(rateVariance(4000, .001), 13e6);
  const result = shadowSNR(exposurePlan(16, 4), 4000);
  near(result.short, 4 / Math.sqrt(13)); near(result.long, 64 / Math.sqrt(73));
  const fused = fuseRates({ value: 100, variance: 4 }, { value: 120, variance: 1 });
  near(fused.longWeight, .8); near(fused.value, 116);
});

test("with fixed total time extra reads cannot improve the ideal static shadow SNR", () => {
  for (const stops of [0, 2, 4, 5]) {
    const p = exposurePlan(16, stops, true), result = shadowSNR(p);
    assert.ok(result.fused < result.single);
    const shotOnly = shadowSNR(p, 2000, 0);
    near(shotOnly.fused, shotOnly.single);
  }
});

test("saturated and missing observations never become invented radiance", () => {
  assert.equal(fuseRates(null, null).value, null);
  assert.equal(fuseRates({ value: 300, variance: 10 }, null).value, 300);
  const plan = exposurePlan(16, 4);
  const short = capture({ exposure: plan.short }), long = capture({ exposure: plan.long });
  const y = 12, window = Math.round(.77 * WIDTH), hotspot = Math.round(.85 * WIDTH);
  assert.ok(sampleRate(short, window, y)); assert.equal(sampleRate(long, window, y), null);
  assert.equal(sampleRate(short, hotspot, y), null); assert.equal(sampleRate(long, hotspot, y), null);
  assert.equal(sampleRate(short, -0.1, y), null);
});

test("known background translation restores common scene points before fusion", () => {
  const plan = exposurePlan(16, 4);
  const short = capture({ exposure: plan.short }), long = capture({ exposure: plan.long, shift: CAMERA_SHIFT });
  const aligned = fuseImage(short, long, CAMERA_SHIFT), unaligned = fuseImage(short, long, 0);
  const x = 35, y = 5, i = y * WIDTH + x, truth = sceneRate(x, y);
  near(aligned.values[i], truth);
  assert.ok(Math.abs(unaligned.values[i] - truth) > 10);
});

test("a consistency rejection returns the short-frame instant at a moving boundary", () => {
  const plan = exposurePlan(16, 4);
  const short = capture({ exposure: plan.short });
  const long = capture({ exposure: plan.long, shift: CAMERA_SHIFT, movement: 15 });
  const x = 54, y = Math.floor(HEIGHT / 2), a = sampleRate(short, x, y), b = sampleRate(long, x + CAMERA_SHIFT, y);
  const plain = fuseRates(a, b), rejected = fuseRates(a, b, true);
  assert.ok(Math.abs(plain.value - a.value) > 1000);
  assert.equal(rejected.rejected, true); near(rejected.value, a.value);
});

test("fractional resampling carries squared interpolation weights into the variance", () => {
  const frame = capture({ exposure: .001 });
  const a = sampleRate(frame, 20, 4), b = sampleRate(frame, 21, 4), mid = sampleRate(frame, 20.25, 4);
  near(mid.value, .75 * a.value + .25 * b.value);
  near(mid.variance, .75 ** 2 * a.variance + .25 ** 2 * b.variance);
});

test("noise sampling is repeatable, independently seeded between exposures", () => {
  const a = capture({ exposure: .001, noise: true, seed: 42 });
  const b = capture({ exposure: .001, noise: true, seed: 42 });
  const c = capture({ exposure: .001, noise: true, seed: 43 });
  assert.deepEqual(a.values, b.values); assert.notDeepEqual(a.values, c.values);
});
