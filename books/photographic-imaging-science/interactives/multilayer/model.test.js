import test from "node:test";
import assert from "node:assert/strict";
import { stackMatrix, stackRecursion, quarterWaveTruth, alternatingStack } from "./model.js";
import { film } from "../coating/model.js";
const near = (a, b, tolerance = 2e-12) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("multilayer empty and zero-thickness stacks give the bare interface", () => {
  const truth = ((1 - 1.52) / (1 + 1.52)) ** 2;
  for (const layers of [[], alternatingStack({ pairs: 3, scale: 0 })]) {
    near(stackMatrix({ layers }).R, truth);
    near(stackRecursion({ layers }).R, truth);
  }
});
test("multilayer one-layer matrix and recursion recover the existing exact film including phase", () => {
  for (const nc of [1, 1.38, 2.1])
    for (const thickness of [0, 97.5, 230])
      for (const wavelength of [400, 550, 700]) {
        const p = { layers: [{ n: nc, d: thickness }], wavelength }, reference = film({ nc, thickness, wavelength });
        for (const result of [stackMatrix(p), stackRecursion(p)])
          for (const field of ["r", "t"]) {
            near(result[field][0], reference[field][0]);
            near(result[field][1], reference[field][1]);
          }
      }
});
test("multilayer nominal quarter-wave stacks match independent admittance and pair product", () => {
  for (const pairs of [1, 2, 3])
    for (const reverse of [false, true]) {
      const layers = alternatingStack({ pairs, reverse });
      const truth = quarterWaveTruth({ indices: layers.map((l) => l.n) });
      const y = 1.52 * (reverse ? 1.7 / 1.38 : 1.38 / 1.7) ** (2 * pairs);
      near(truth.admittance, y);
      near(stackMatrix({ layers }).R, ((1 - y) / (1 + y)) ** 2);
      near(stackMatrix({ layers }).r[0], truth.r);
    }
  const high = 1.38 * Math.sqrt(1.52);
  near(stackMatrix({ layers: alternatingStack({ high }) }).R, 0);
});
test("multilayer matrix and independent interface recursion agree for arbitrary uneven layers", () => {
  for (let count = 0; count <= 12; count++)
    for (const wavelength of [400, 451, 550, 699]) {
      const layers = Array.from({ length: count }, (_, i) => ({ n: 1.1 + ((i * 7 + count) % 13) / 10, d: 13 + ((i * 41 + count * 19) % 191) }));
      const p = { layers, wavelength, n0: 1.2, ns: 1.8 };
      const a = stackMatrix(p), b = stackRecursion(p);
      for (const key of ["r", "t"]) for (let i = 0; i < 2; i++) near(a[key][i], b[key][i]);
      near(a.R + a.T, 1);
      near(b.R + b.T, 1);
    }
});
test("multilayer reversal and extra pairs may increase reflection rather than improve AR", () => {
  const two = stackMatrix({ layers: alternatingStack() }).R;
  assert.ok(two < 1e-5);
  assert.ok(stackMatrix({ layers: alternatingStack({ reverse: true }) }).R > 0.15);
  assert.ok(stackMatrix({ layers: alternatingStack({ pairs: 3 }) }).R > 0.15);
  assert.ok(stackMatrix({ layers: alternatingStack({ lastError: 25 }) }).R > two + 0.001);
});
test("multilayer reciprocity, length scaling and half-wave optical periods hold", () => {
  const layers = [{ n: 1.38, d: 83 }, { n: 2.1, d: 67 }, { n: 1.7, d: 111 }];
  const a = stackMatrix({ layers });
  const reversed = stackMatrix({ layers: [...layers].reverse(), n0: 1.52, ns: 1 });
  near(a.R, reversed.R); near(a.T, reversed.T);
  const scaled = stackMatrix({ layers: layers.map((l) => ({ ...l, d: l.d * 2 })), wavelength: 1100 });
  near(a.R, scaled.R); near(a.t[0], scaled.t[0]); near(a.t[1], scaled.t[1]);
  const periodic = layers.map((l, i) => ({ ...l, d: l.d + (i === 1 ? 550 / (2 * l.n) : 0) }));
  const b = stackMatrix({ layers: periodic });
  near(a.R, b.R); near(a.t[0], -b.t[0]); near(a.t[1], -b.t[1]);
});
test("multilayer entire UI domain conserves energy and distinguishes complex amplitude from power", () => {
  for (const pairs of [1, 2, 3]) for (const high of [1.5, 1.7, 2.4])
    for (const scale of [0, 0.3, 1, 2]) for (const lastError of [-30, 0, 30])
      for (const wavelength of [400, 550, 700]) {
        const a = stackMatrix({ layers: alternatingStack({ pairs, high, scale, lastError }), wavelength });
        near(a.R + a.T, 1);
        assert.ok(a.R >= 0 && a.R <= 1 + 1e-12 && a.T >= 0 && a.T <= 1 + 1e-12);
      }
});
test("multilayer rejects malformed materials, thicknesses and design parameters", () => {
  for (const p of [{ wavelength: 0 }, { layers: null }, { layers: [{ n: 0, d: 1 }] }, { layers: [{ n: 1.5, d: -1 }] }, { ns: NaN }])
    for (const f of [stackMatrix, stackRecursion]) assert.throws(() => f(p), RangeError);
  for (const p of [{ pairs: 0 }, { high: 0 }, { lastError: -101 }, { scale: Infinity }])
    assert.throws(() => alternatingStack(p), RangeError);
});
