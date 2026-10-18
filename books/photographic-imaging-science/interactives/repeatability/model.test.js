import test from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  budget,
  observations,
  parameters,
  repeatedMeans,
  selectionStudy,
  variance,
  MEAN,
} from "./model.js";
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("repeatability balanced ANOVA matches a hand-constructed orthogonal table", () => {
  const data = [];
  for (let l = 0; l < 2; l++)
    for (let a = 0; a < 2; a++)
      for (let r = 0; r < 2; r++)
        data.push({
          lens: l,
          mount: a,
          repeat: r,
          value: [-2, 2][l] + [-1, 1][a] + [-0.5, 0.5][r],
        });
  const m = analyze(data);
  near(m.ms.read, 0.5);
  near(m.ms.mount, 4);
  near(m.ms.lens, 32);
  near(m.estimates.read, 0.5);
  near(m.estimates.mount, 1.75);
  near(m.estimates.lens, 7);
  near(m.meanSE, 2);
  near(m.totalSS, 42);
  near(m.totalSS, m.errorSS + m.mountSS + m.lensSS);
});
test("repeatability estimator never reads generator fields and is invariant to order and offset", () => {
  const data = observations(),
    base = analyze(data);
  const altered = data
    .toReversed()
    .map((d) => ({ ...d, truth: 999, lensSD: 100, value: d.value + 10 }));
  const other = analyze(altered);
  near(other.grand, base.grand + 10);
  for (const k of ["lens", "mount", "read"])
    near(other.estimates[k], base.estimates[k]);
  near(variance(base.lensMeans) / base.lenses, base.meanSE ** 2);
});
test("repeatability raw negative variance estimates are not silently clipped", () => {
  const data = [];
  for (let l = 0; l < 2; l++)
    for (let a = 0; a < 2; a++)
      for (let r = 0; r < 2; r++)
        data.push({ lens: l, mount: a, repeat: r, value: r ? 1 : -1 });
  const m = analyze(data);
  assert.ok(m.estimates.mount < 0);
  near(m.estimates.lens, 0);
});
test("repeatability stable identities retain existing observations when more frames are added", () => {
  const a = observations({ repeats: 3 }),
    b = observations({ repeats: 8 });
  for (const d of a)
    near(
      d.value,
      b.find(
        (e) =>
          e.lens === d.lens && e.mount === d.mount && e.repeat === d.repeat,
      ).value,
    );
  assert.notDeepEqual(a, observations({ repeats: 3, seed: 17018 }));
});
test("repeatability covariance budget has the shared-effect floor and correct independent limit", () => {
  const a = budget({ repeats: 2 }),
    b = budget({ repeats: 12 });
  assert.ok(a.meanVariance > b.meanVariance);
  assert.ok(b.meanVariance > 0.04 ** 2 / 4 + 0.025 ** 2 / 12);
  const zero = budget({ lensSD: 0, mountSD: 0 });
  near(zero.meanVariance, zero.iidMeanVariance);
  near(a.sameMountCovariance, 0.04 ** 2 + 0.025 ** 2);
  near(a.sameLensCovariance, 0.04 ** 2);
});
test("repeatability independent whole-study sampling agrees with the known mean variance", () => {
  const m = repeatedMeans({}, 4096),
    t = budget();
  assert.ok(Math.abs(m.mean - MEAN) < 4 * Math.sqrt(t.meanVariance / 4096));
  assert.ok(Math.abs(m.variance / t.meanVariance - 1) < 0.1);
  const zero = repeatedMeans({ lensSD: 0, mountSD: 0, readSD: 0 }, 32);
  near(zero.mean, MEAN);
  near(zero.variance, 0);
});
test("repeatability moment estimates recover the generating variance components across new datasets", () => {
  const sums = { read: 0, mount: 0, lens: 0 },
    n = 1024,
    t = budget();
  for (let seed = 1; seed <= n; seed++) {
    const a = analyze(observations({ seed }));
    for (const k of Object.keys(sums)) sums[k] += a.estimates[k] / n;
  }
  for (const k of Object.keys(sums))
    assert.ok(
      Math.abs(sums[k] / t.components[k] - 1) < 0.15,
      `${k}: ${sums[k]}`,
    );
});
test("repeatability denser nested focus grids retain noise and only the observed selection increases", () => {
  const a = selectionStudy({ grid: 0, readSD: 0.04 }),
    b = selectionStudy({ grid: 2, readSD: 0.04 });
  for (let i = 0; i < a.rows.length; i++)
    assert.ok(b.rows[i].selected >= a.rows[i].selected);
  assert.ok(b.observedMean > b.truePeak);
  assert.ok(b.selectedTruthMean <= b.truePeak);
  const m = selectionStudy({ grid: 2, readSD: 0.04 }, 4096);
  assert.ok(Math.abs(m.validationMean - m.selectedTruthMean) < 0.003);
  const zero = selectionStudy({ readSD: 0 }, 16);
  near(zero.observedMean, zero.truePeak);
  near(zero.validationMean, zero.truePeak);
});
test("repeatability rejects missing groups, duplicate identities and invalid study scales", () => {
  const d = observations();
  assert.throws(() => analyze(d.slice(1)));
  assert.throws(() => analyze([...d.slice(1), d[1]]));
  for (const p of [
    { lenses: 1 },
    { mounts: 1 },
    { repeats: 1 },
    { seed: 0 },
    { readSD: -1 },
    { grid: 3 },
  ])
    assert.throws(() => parameters(p));
});
