import test from "node:test";
import assert from "node:assert/strict";
import {
  traceShift,
  motionSample,
  motionTruth,
  motionExperiment,
  PIXEL_MM,
} from "./model.js";
const near = (a, b, t = 1e-11) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("stabilization affine trace gives x=200 theta-delta independent of ray height", () => {
  for (const theta of [-0.001, 0, 0.001])
    for (const delta of [-0.2, 0, 0.2])
      for (const height of [-0.5, 0, 0.5])
        near(traceShift(theta, delta, height).image, 200 * theta - delta);
});
test("stabilization quarter-period known displacement is 100um or 25 pixels", () => {
  const m = motionSample();
  near(m.uncorrected, 0.1);
  near(m.residual / PIXEL_MM, 25);
  const o = motionSample({ ois: 1 }),
    i = motionSample({ ibis: 1 });
  near(o.delta, 0.1);
  near(o.image, 0);
  near(o.sensor, 0);
  near(o.residual, 0);
  near(i.delta, 0);
  near(i.image, 0.1);
  near(i.sensor, 0.1);
  near(i.residual, 0);
});
test("stabilization coordinated half corrections cancel, duplicate full corrections reverse the residual", () => {
  for (let time = 0; time <= 100; time += 1) {
    near(motionSample({ ois: 0.5, ibis: 0.5 }, time).residual, 0);
    near(
      motionSample({ ois: 1, ibis: 1 }, time).residual,
      -motionSample({}, time).residual,
    );
  }
});
test("stabilization traced trajectories agree with independent harmonic truth over gain and delay domain", () => {
  for (const amplitude of [0, 0.5, 1])
    for (const ois of [0, 0.5, 1, 1.5])
      for (const ibis of [0, 0.5, 1, 1.5])
        for (const delay of [0, 10, 25])
          for (const time of [0, 7, 25, 50, 83, 100])
            near(
              motionSample({ amplitude, ois, ibis, delay }, time).residual,
              motionTruth({ amplitude, ois, ibis, delay }, time),
            );
});
test("stabilization full-period numerical RMS matches analytic truth; latency leaves a nonzero trajectory", () => {
  for (const ois of [0, 0.5, 1, 1.5])
    for (const ibis of [0, 0.5, 1])
      for (const delay of [0, 3, 10, 25]) {
        const m = motionExperiment({ ois, ibis, delay });
        near(m.mean, 0);
        near(m.rms, m.truthRms);
      }
  const m = motionExperiment({ ois: 1, delay: 10 });
  near(m.truthAmplitude, 0.2 * Math.sin(Math.PI / 10));
  assert.ok(m.rms > 0.04);
});
test("stabilization zero input, periodicity and invalid-domain behavior stay explicit", () => {
  near(motionExperiment({ amplitude: 0, ois: 1, ibis: 1, delay: 25 }).rms, 0);
  near(
    motionSample({ ois: 0.7, delay: 10 }, 13).residual,
    motionSample({ ois: 0.7, delay: 10 }, 113).residual,
  );
  for (const p of [
    { amplitude: -1 },
    { ois: 3 },
    { ibis: NaN },
    { delay: -1 },
    { time: Infinity },
  ])
    assert.throws(() => motionSample(p), RangeError);
  assert.throws(() => motionExperiment({}, 0), RangeError);
});
