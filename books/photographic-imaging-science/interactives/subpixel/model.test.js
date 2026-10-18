import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  reconstruct,
  invert,
  design,
  basis,
  dot,
  valueAt,
  truthCoefficients,
  sinc,
} from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
test("subpixel Fourier pixel integration agrees with independent spatial quadrature", () => {
  const p = parameters({ blur: 0 }),
    c = truthCoefficients();
  for (const x of [0, 0.23, 7.5, 15.9]) {
    let sum = 0;
    const n = 12000;
    for (let i = 0; i < n; i++)
      sum += valueAt(c, x - p.aperture / 2 + ((i + 0.5) * p.aperture) / n, p);
    near(sum / n, dot(basis(x, p), c), 2e-9);
  }
});
test("subpixel four phases recover all known coefficients without truth entering the solver", () => {
  const m = reconstruct();
  assert.equal(m.fit.rank, 33);
  assert.ok(m.rmse < 1e-12);
  assert.ok(m.residualRms < 1e-12);
  const A = design(parameters()),
    c = Array.from({ length: 33 }, (_, i) => Math.sin(i + 4) / 30),
    y = A.map((row) => dot(row, c));
  const fit = invert(A, y);
  fit.coefficients.forEach((v, i) => near(v, c[i], 1e-11));
});
test("subpixel repeated phases have an observable null space despite zero residual", () => {
  const m = reconstruct({ diverse: 0 });
  assert.equal(m.fit.rank, 16);
  assert.ok(m.residualRms < 1e-12);
  assert.ok(m.rmse > 0.08);
  const alt = m.truth.map((v, i) => v + 0.2 * m.fit.nullVector[i]);
  m.A.forEach((row) => near(dot(row, alt), dot(row, m.truth), 1e-10));
});
test("subpixel unit-width integration removes both one-cycle modes for every shift", () => {
  const m = reconstruct({ aperture: 1 });
  assert.equal(m.fit.rank, 31);
  assert.ok(m.rmse > 0.05);
  assert.ok(m.residualRms < 1e-12);
  near(sinc(1), 0);
  for (const x of [0.123, 3.517, 8.9]) {
    const row = basis(x, m.p);
    near(row[31], 0);
    near(row[32], 0);
  }
});
test("subpixel registration and noise errors remain separate from known-position reference", () => {
  const m = reconstruct({ bias: 0.1 });
  assert.ok(m.rmse > 0.025);
  assert.ok(m.knownRmse < 1e-12);
  const noisy = reconstruct({ noise: 0.02 }),
    repeat = reconstruct({ noise: 0.02 });
  assert.deepEqual(noisy.observed, repeat.observed);
  assert.ok(noisy.rmse > 0.001);
  const changed = reconstruct({ noise: 0.02, seed: 1 });
  assert.notDeepEqual(noisy.observed, changed.observed);
});
test("subpixel observation prefixes are stable as frames enter and zero ridge is minimum norm", () => {
  const one = reconstruct({ frames: 1, noise: 0.01 }),
    four = reconstruct({ noise: 0.01 });
  assert.deepEqual(one.observed, four.observed.slice(0, 16));
  const x = invert([[1, 1]], [2]);
  near(x.coefficients[0], 1);
  near(x.coefficients[1], 1);
  const regular = invert([[1, 1]], [2], 1);
  near(regular.coefficients[0], 2 / 3);
  near(regular.coefficients[1], 2 / 3);
});
test("subpixel rejects unsupported or nonfinite parameters", () => {
  for (const p of [
    { frames: 0 },
    { frames: 2.2 },
    { aperture: 0 },
    { noise: -1 },
    { blur: NaN },
    { bias: 1 },
    { ridge: -1 },
    { seed: 1.5 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => invert([[NaN]], [0]));
});
