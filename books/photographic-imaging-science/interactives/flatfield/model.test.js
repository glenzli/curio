import test from "node:test";
import assert from "node:assert/strict";
import {
  BLACK,
  LEVELS,
  average,
  sampleVariance,
  pairMoments,
  linearFit,
  fitTransfer,
  simulate,
  expectedVariance,
} from "./model.js";
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
test("paired sample variance removes stable spatial structure with the factor of two", () => {
  const a = [1, -1, 1, -1],
    b = [1, 1, -1, -1],
    pattern = [1, -1, -1, 1];
  const pair = (scale) =>
    pairMoments(
      a.map((v, i) => BLACK + scale * pattern[i] + v),
      b.map((v, i) => BLACK + scale * pattern[i] + v),
    );
  near(pair(0).temporal, 4 / 3);
  near(pair(100).temporal, 4 / 3);
  near(pair(100).spatial, (10000 * 4) / 3 + 4 / 3);
  near(pair(100).mean, 0);
});
test("sample moments and least squares retain DN and DN-squared units", () => {
  near(sampleVariance([1, 2, 3]), 1);
  near(average([1, 2, 3]), 2);
  const fit = linearFit([
    [100, 24],
    [200, 44],
    [400, 84],
  ]);
  near(fit.slope, 0.2);
  near(fit.intercept, 4);
  assert.equal(
    linearFit([
      [1, 2],
      [1, 3],
      [1, 4],
    ]),
    null,
  );
  assert.throws(() => pairMoments([1], [2]));
});
test("transfer fitting and clipping selection consume observed moments, never generating truth", () => {
  const points = Array.from({ length: 7 }, (_, i) => ({
    level: i,
    mean: i * 100,
    temporal: 0.2 * i * 100 + 4 + 1 / 12,
    spatial: 0.3 * i * 100 + 7,
    clipped: 0,
    latentMean: NaN,
  }));
  const fit = fitTransfer(points, { white: BLACK + 1000 });
  near(fit.temporal.slope, 0.2);
  near(fit.temporal.intercept, 4 + 1 / 12);
  near(fit.spatial.slope, 0.3);
  near(fit.readNoise, 10);
  const contaminated = [
    ...points,
    { level: 7, mean: 700, temporal: 2, spatial: 3, clipped: 0.5 },
  ];
  assert.deepEqual(
    fitTransfer(contaminated, { white: BLACK + 1000 }).selected,
    fit.selected,
  );
  assert.ok(
    fitTransfer(contaminated, {
      white: BLACK + 1000,
      excludeClipped: false,
    }).selected.includes(7),
  );
});
test("Poisson flat fields reproduce the linear temporal law and separate fixed PRNU", () => {
  const p = { side: 32, pairs: 8, prnu: 0.02, seed: 812 },
    data = simulate(p),
    fit = fitTransfer(data.measurements, { white: data.white });
  near(fit.temporal.slope, 0.2, 0.01);
  assert.ok(fit.spatial.slope > 2 * 0.2);
  near(fit.readNoise, 10, 1);
  const point = data.measurements[7],
    theory = { gain: 0.2, readNoise: 10, prnu: 0.02, drift: 0 };
  near(point.temporal / expectedVariance(point.mean, theory), 1, 0.05);
  near(
    point.spatial / expectedVariance(point.mean, theory, "spatial"),
    1,
    0.05,
  );
  assert.equal(data.measurements.length, LEVELS);
});
test("illumination drift leaves PRNU in paired differences after subtracting the global difference mean", () => {
  const options = { side: 32, pairs: 8, prnu: 0.04, seed: 411 };
  const stable = simulate(options),
    drift = simulate({ ...options, drift: 0.2 });
  const a = fitTransfer(stable.measurements, { white: stable.white }),
    b = fitTransfer(drift.measurements, { white: drift.white });
  assert.ok(b.temporal.slope > a.temporal.slope * 1.15);
  const point = drift.measurements[7];
  near(
    point.temporal /
      expectedVariance(point.mean, {
        gain: 0.2,
        readNoise: 10,
        prnu: 0.04,
        drift: 0.2,
      }),
    1,
    0.06,
  );
  assert.ok(Math.abs(point.display.differenceMean) > 100);
});
test("including clipped levels biases the fit and they remain visible but excluded by default", () => {
  const data = simulate({ side: 32, pairs: 8, prnu: 0, seed: 109 });
  const good = fitTransfer(data.measurements, { white: data.white });
  const bad = fitTransfer(data.measurements, {
    white: data.white,
    fitMax: 1.05,
    excludeClipped: false,
  });
  assert.ok(data.measurements.at(-1).clipped > 0.1);
  assert.ok(!good.selected.includes(15));
  assert.ok(bad.selected.includes(15));
  assert.ok(bad.temporal.slope < good.temporal.slope * 0.8);
});
test("flat-field sampling is repeatable; insufficient levels do not invent a gain", () => {
  const a = simulate({ side: 16, pairs: 1, seed: 4 }),
    b = simulate({ side: 16, pairs: 1, seed: 4 });
  assert.deepEqual(a.measurements, b.measurements);
  const resampled = simulate({ side: 16, pairs: 1, seed: 5 });
  assert.deepEqual(a.responses, resampled.responses);
  assert.notDeepEqual(a.measurements, resampled.measurements);
  assert.equal(
    fitTransfer(a.measurements, { white: a.white, fitMax: 0.05 }).temporal,
    null,
  );
  assert.throws(() => simulate({ gain: 0 }));
  assert.throws(() => simulate({ side: 3 }));
});
