import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  propagation,
  propagationTruth,
  observations,
  moments,
  transform,
  experimentData,
  correlation,
} from "./model.js";
const near = (a, b, e = 1e-9) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("matrix covariance and independent latent-source expansion agree across gains, correlation and mixing", () => {
  for (const red of [1, 4])
    for (const blue of [1, 4])
      for (const shared of [0, 20])
        for (const mixing of [0, 0.5, 1]) {
          const p = { red, blue, shared, mixing, exposure: -2 },
            a = propagation(p),
            b = propagationTruth(p);
          a.stages.forEach((s, i) => {
            s.mean.forEach((v, j) => near(v, b[i].mean[j]));
            s.covariance
              .flat()
              .forEach((v, j) => near(v, b[i].covariance.flat()[j]));
          });
        }
});
test("white balance equalizes declared neutral means and scales sigma while preserving each channel SNR and correlation", () => {
  const m = propagation();
  m.stages[1].mean.forEach((v) => near(v, 1600));
  for (let j = 0; j < 3; j++) {
    const a = m.stages[0],
      b = m.stages[1];
    near(
      b.mean[j] / Math.sqrt(b.covariance[j][j]),
      a.mean[j] / Math.sqrt(a.covariance[j][j]),
    );
    near(Math.sqrt(b.covariance[j][j] / a.covariance[j][j]), m.g[j]);
  }
  near(
    correlation(m.stages[0].covariance),
    correlation(m.stages[1].covariance),
  );
});
test("mixing independent channels creates covariance; neutral-preserving matrix is not a claimed XYZ calibration", () => {
  const m = propagation({ shared: 0 });
  near(m.stages[0].covariance[0][2], 0);
  assert.ok(Math.abs(m.stages[2].covariance[0][2]) > 1);
  m.stages[2].mean.forEach((v) => near(v, 1600));
  for (const x of [
    [1, 0, 0],
    [1, -2, 1],
    [3, 1, -4],
  ]) {
    const v = transform(m.stages[2].covariance, x).reduce(
      (s, a, j) => s + a * x[j],
      0,
    );
    assert.ok(v >= 0);
  }
});
test("observation-only covariance uses N-1 and ignores generating metadata", () => {
  const s = [
      [1, 2, 4],
      [3, 6, 8],
    ],
    m = moments(s);
  near(m.mean[0], 2);
  near(m.covariance[0][0], 2);
  near(m.covariance[0][1], 4);
  s.truth = { mean: [99, 99, 99] };
  assert.deepEqual(moments(s), m);
  assert.throws(() => moments([[1, 2, 3]]));
});
test("seeded Gaussian electron-reference observations reproduce full covariance and reuse samples under gain changes", () => {
  const p = { shared: 12, seed: 1234 },
    raw = observations(p, 60000),
    m = experimentData(p, raw);
  for (let k = 0; k < 3; k++)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const truth = m.stages[k].covariance[i][j],
          err = Math.abs(m.measured[k].covariance[i][j] - truth),
          scale = Math.sqrt(
            m.stages[k].covariance[i][i] * m.stages[k].covariance[j][j],
          );
        assert.ok(err < 0.025 * scale, `${err} / ${scale}`);
      }
  assert.deepEqual(observations(p, 4), raw.slice(0, 4));
  const gain = experimentData({ ...p, red: 4 }, raw);
  assert.deepEqual(gain.samples[0], m.samples[0]);
  near(gain.samples[1][0][0], 2 * m.samples[1][0][0]);
});
test("progress highlights a stage without mutating physical samples, and corrupt controls fail", () => {
  assert.deepEqual(
    observations({ progress: 0 }, 10),
    observations({ progress: 100 }, 10),
  );
  for (const p of [
    { shared: -1 },
    { exposure: 3 },
    { red: 0 },
    { mixing: NaN },
    { seed: 1.5 },
  ])
    assert.throws(() => parameters(p));
});
