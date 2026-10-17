// Imported by model.test.js so the book's model-test gate retains one entry per owner.
import test from "node:test";
import assert from "node:assert/strict";
import { sampleVariance, average } from "./model.js";
import {
  covariance,
  decomposePair,
  simulateCalibration,
  analyzeCalibration,
  predictCalibration,
} from "./calibration.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const relative = (a, b, t = 0.2) => near(a / b, 1, t);

test("row/column decomposition uses observed centered differences and removes fixed offsets", () => {
  const n = 4,
    r = [-1, -1, 1, 1],
    c = [-1, 1, -1, 1];
  const q = Array.from(
    { length: n * n },
    (_, i) =>
      2 * r[Math.floor(i / n)] + 3 * c[i % n] + c[Math.floor(i / n)] * r[i % n],
  );
  const offset = q.map((_, i) => 10 + 3 * i),
    a = q.map((v, i) => offset[i] + Math.SQRT2 * v);
  const fit = decomposePair(a, offset, n);
  near(fit.independent, 16 / 9);
  near(fit.row, 44 / 9);
  near(fit.column, 104 / 9);
  const shared = q.map((_, i) => 8 * Math.sin(i)),
    calibrated = decomposePair(
      a.map((v, i) => v - shared[i]),
      offset.map((v, i) => v - shared[i]),
      n,
    );
  for (const key of ["independent", "row", "column"])
    near(calibrated[key], fit[key]);
});

test("the ROI mean retains row and column terms with 1/n rather than 1/n-squared", () => {
  const p = {
    signal: 200,
    darkMean: 20,
    readNoise: 4,
    rowNoise: 8,
    columnNoise: 6,
    side: 16,
  };
  const actual = predictCalibration(p, { stackFrames: 4, darkFrames: 4 }),
    naive = predictCalibration(p, {
      stackFrames: 4,
      darkFrames: 4,
      independentPixels: true,
    });
  near(actual.target, 236 / 256 + 100 / 16);
  near(actual.dark, 36 / 256 + 100 / 16);
  assert.ok(actual.stack > 7 * naive.stack);
  const independent = { ...p, rowNoise: 0, columnNoise: 0 };
  near(
    predictCalibration(independent).stack,
    predictCalibration(independent, { independentPixels: true }).stack,
  );
});

test("independent repeated experiments reproduce variance, shared-dark covariance and the calibration floor", () => {
  const data = simulateCalibration({
    signal: 0,
    side: 8,
    trials: 384,
    maxFrames: 8,
    targetSeed: 901,
    darkSeed: 1901,
  });
  for (const domain of ["mean", "pixel"]) {
    const observed = analyzeCalibration(data.observations, {
        darkFrames: 1,
        stackFrames: 8,
        domain,
      }),
      truth = predictCalibration(data.parameters, {
        darkFrames: 1,
        stackFrames: 8,
        domain,
      });
    relative(observed.current.variance, truth.stack, 0.18);
    relative(observed.sharedCovariance, truth.floor, 0.25);
    // More light frames do not remove a master-dark error reused by every frame.
    assert.ok(observed.current.variance > truth.floor * 0.75);
    const better = analyzeCalibration(data.observations, {
      darkFrames: 8,
      stackFrames: 8,
      domain,
    });
    assert.ok(better.current.variance < observed.current.variance * 0.4);
  }
});

test("pair estimates recover independent, row and column variances without generating parameters", () => {
  const data = simulateCalibration({ side: 16, trials: 128, maxFrames: 2 });
  const observedOnly = data.observations.map((o) => ({
    ...o,
    truth: null,
    signal: NaN,
    darkTruth: null,
  }));
  const observed = analyzeCalibration(observedOnly, {
    darkFrames: 2,
    stackFrames: 2,
  });
  relative(observed.components.independent, 236, 0.03);
  relative(observed.components.row, 64, 0.12);
  relative(observed.components.column, 36, 0.15);
  assert.deepEqual(
    analyzeCalibration(data.observations, { darkFrames: 2, stackFrames: 2 }),
    observed,
  );
});

test("changing only target or dark seeds preserves the other observations and keeps nested averages", () => {
  const p = { trials: 4, maxFrames: 8, side: 8 };
  const a = simulateCalibration(p),
    b = simulateCalibration({ ...p, targetSeed: 32012 }),
    c = simulateCalibration({ ...p, darkSeed: 82014 });
  assert.deepEqual(
    a.observations.map((o) => o.darks),
    b.observations.map((o) => o.darks),
  );
  assert.deepEqual(
    a.observations.map((o) => o.targets),
    c.observations.map((o) => o.targets),
  );
  assert.notDeepEqual(
    a.observations.map((o) => o.targets),
    b.observations.map((o) => o.targets),
  );
  assert.notDeepEqual(
    a.observations.map((o) => o.darks),
    c.observations.map((o) => o.darks),
  );
  near(
    average(a.observations[0].targets[8].values),
    a.observations[0].targets[8].mean,
    1e-10,
  );
  assert.throws(() => analyzeCalibration(a.observations, { darkFrames: 16 }));
  assert.throws(() => simulateCalibration({ rowNoise: -1 }));
  assert.throws(() => simulateCalibration({ side: 7 }));
  near(covariance([1, 2, 3], [2, 4, 6]), 2);
  near(sampleVariance([1, 2, 3]), 1);
});
