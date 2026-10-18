import test from "node:test";
import assert from "node:assert/strict";
import {
  areaSamples,
  directAt,
  finiteKernel,
  linearConvolution,
  parameters,
  psfImage,
  SIDE,
} from "./model.js";
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);

test("PSF image FFT equals independent zero-extended sums on a nonsymmetric kernel", () => {
  const a = Float64Array.from({ length: 30 }, (_, i) => Math.sin(i + 1)),
    k = [0, 0.2, 0, 0.1, 0.3, 0.25, 0.05, 0.1, 0];
  const m = linearConvolution(a, 6, 5, k, 3);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 6; x++)
      near(m.image[y * 6 + x], directAt(a, 6, 5, k, 3, x, y));
  near(
    m.fullSum,
    a.reduce((s, v) => s + v, 0),
  );
  near(m.imaginaryResidual, 0);
});
test("PSF image uses convolution orientation and cannot wrap an edge impulse", () => {
  const a = new Float64Array(36);
  a[0] = 1;
  const k = [0, 0, 0, 0, 0.25, 0.75, 0, 0, 0];
  const m = linearConvolution(a, 6, 6, k, 3);
  near(m.image[0], 0.25);
  near(m.image[1], 0.75);
  near(m.image[5], 0);
  near(m.image[30], 0);
  near(m.fullSum, 1);
});
test("PSF image constant interior, complete flux and crop loss remain distinct", () => {
  const a = new Float64Array(36).fill(1),
    k = new Float64Array(9).fill(1 / 9);
  const m = linearConvolution(a, 6, 6, k, 3);
  near(m.image[14], 1);
  near(m.image[0], 4 / 9);
  near(m.fullSum, 36);
  assert.ok(m.image.reduce((s, v) => s + v, 0) < 36);
});
test("PSF image pixel integration is an area average and partitions the same field", () => {
  const a = Float64Array.from({ length: 16 }, (_, i) => i);
  const m = areaSamples(a, 4, 4, 2);
  assert.deepEqual([...m.image], [2.5, 4.5, 10.5, 12.5]);
  near(
    m.image.reduce((s, v) => s + v, 0) * 4,
    a.reduce((s, v) => s + v, 0),
  );
  assert.deepEqual([...areaSamples(a, 4, 4, 1).image], [...a]);
  assert.throws(() => areaSamples(a, 4, 4, 3));
});
test("PSF image declares truncation, normalization and a fixed physical grid", () => {
  for (const p of [{}, { defocus: 0.2 }, { coma: 0.2 }, { coma: -0.2 }]) {
    const k = finiteKernel(p);
    near(k.stepUm, 1.1);
    near(k.fullIntegral, 1);
    near(
      k.weights.reduce((a, b) => a + b, 0),
      1,
    );
    assert.ok(k.retained > 0.8 && k.retained < 1);
    assert.ok(k.weights.every((v) => v >= 0));
  }
});
test("PSF image coma mirrors and its finite reference does not read FFT image pixels", () => {
  const a = finiteKernel({ coma: 0.2 }),
    b = finiteKernel({ coma: -0.2 });
  for (let y = 0; y < a.side; y++)
    for (let x = 0; x < a.side; x++)
      near(
        a.weights[y * a.side + x],
        b.weights[y * a.side + a.side - 1 - x],
        1e-12,
      );
  const m = psfImage({ pattern: 1, coma: 0.2 });
  for (const [x, y] of [
    [0, 0],
    [15, 16],
    [24, 24],
    [47, 47],
  ])
    near(
      m.image[y * SIDE + x],
      directAt(m.source, SIDE, SIDE, m.kernel.weights, m.kernel.side, x, y),
    );
});
test("PSF image rejects invalid scales, nonfinite arrays and unsupported pixel partitions", () => {
  for (const p of [
    { coma: NaN },
    { defocus: 1 },
    { bin: 0 },
    { bin: 2.5 },
    { pattern: 8 },
    { probeX: 48 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => linearConvolution([NaN], 1, 1, [1], 1));
  assert.throws(() => linearConvolution([1], 1, 1, [1, 1, 1, 1], 2));
});
