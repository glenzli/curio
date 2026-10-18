import test from "node:test";
import assert from "node:assert/strict";
import {
  arrivals,
  partialCounts,
  distribution,
  countingTruth,
  observations,
  observedMoments,
  parameters,
} from "./model.js";
const near = (a, b, e = 1e-9) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}, tolerance ${e}`);
test("thinned probability masses match conditional variance and retain the fixed/Poisson distinction", () => {
  for (const mode of ["poisson", "fixed"])
    for (const incident of [0, 1, 24, 80])
      for (const eta of [0, 0.2, 0.5, 1]) {
        const p = { mode, incident, eta },
          pmf = distribution(p),
          truth = countingTruth(p);
        const total = pmf.reduce((a, b) => a + b, 0),
          mean = pmf.reduce((a, b, k) => a + k * b, 0);
        const variance = pmf.reduce((a, b, k) => a + (k - mean) ** 2 * b, 0);
        near(total, 1);
        near(mean, truth.mean);
        near(variance, truth.variance, 1e-8);
      }
  near(countingTruth({ incident: 24, eta: 0.5 }).variance, 12);
  near(countingTruth({ incident: 24, eta: 0.5, mode: "fixed" }).variance, 6);
});
test("Poisson thinning also agrees with direct summation over incident counts", () => {
  const p = { incident: 12, eta: 0.3 },
    expected = distribution(p);
  let poisson = Math.exp(-p.incident);
  const mixture = Array(181).fill(0);
  for (let n = 0; n <= 120; n++) {
    if (n) poisson *= p.incident / n;
    // Independent binomial expression using combinations, not Bernoulli convolution.
    let choose = 1;
    for (let k = 0; k <= n; k++) {
      if (k) choose *= (n - k + 1) / k;
      mixture[k] += poisson * choose * p.eta ** k * (1 - p.eta) ** (n - k);
    }
  }
  for (let k = 0; k < 100; k++) near(mixture[k], expected[k], 1e-13);
});
test("exponential-arrival observations reproduce count moments without a Gaussian approximation", () => {
  for (const mode of ["poisson", "fixed"]) {
    const p = { incident: 24, eta: 0.5, mode },
      o = observations(p, 30000),
      m = observedMoments(o),
      truth = countingTruth(p);
    near(m.photonMean, 24, 0.12);
    near(m.photonVariance, truth.photonVariance, 0.6);
    near(m.electronMean, 12, 0.1);
    near(m.electronVariance, truth.variance, 0.35);
    // Split Poisson processes are independent; fixed-total partitions anticorrelate.
    near(m.keptRejectedCovariance, mode === "poisson" ? 0 : -6, 0.25);
  }
});
test("QE changes reuse exactly the same incident event times and marks; replay is monotone", () => {
  const low = arrivals({ eta: 0.2 }),
    high = arrivals({ eta: 0.8 });
  assert.deepEqual(
    low.map((e) => [e.time, e.mark]),
    high.map((e) => [e.time, e.mark]),
  );
  low.forEach((e, i) => {
    if (e.kept) assert.ok(high[i].kept);
  });
  assert.deepEqual(arrivals(), arrivals());
  assert.notDeepEqual(arrivals(), arrivals({ seed: 20261019 }));
  assert.deepEqual(partialCounts(arrivals(), 0), { photons: 0, electrons: 0 });
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const n = partialCounts(high, i / 100);
    assert.ok(n.electrons >= previous && n.electrons <= n.photons);
    previous = n.electrons;
  }
  assert.equal(partialCounts(arrivals({ eta: 0 })).electrons, 0);
  const all = partialCounts(arrivals({ eta: 1 }));
  assert.equal(all.photons, all.electrons);
});
test("counting model rejects unsupported counts, QE, modes and corrupted observations", () => {
  for (const p of [
    { incident: -1 },
    { incident: 1.5 },
    { incident: 81 },
    { eta: NaN },
    { eta: 1.1 },
    { mode: "thermal" },
    { seed: Infinity },
  ])
    assert.throws(() => parameters(p), RangeError);
  assert.throws(
    () =>
      observedMoments([
        { photons: 1, electrons: 2 },
        { photons: 1, electrons: 0 },
      ]),
    RangeError,
  );
  assert.throws(() => partialCounts([], 1.1), RangeError);
});
