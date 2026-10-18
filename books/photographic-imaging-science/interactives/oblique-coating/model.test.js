import test from "node:test";
import assert from "node:assert/strict";
import {
  obliqueMatrix,
  fresnelRecursion,
  bareTruth,
  layerDesign,
  parameters,
  coatingBudget,
} from "./model.js";
import { stackMatrix } from "../multilayer/model.js";
const near = (a, b, e = 2e-12) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("normal incidence recovers existing complex matrix amplitudes and equal s/p powers", () => {
  for (const mode of ["bare", "single", "pair", "reverse", "six"]) {
    const layers = layerDesign({ mode }),
      n = stackMatrix({ layers }),
      s = obliqueMatrix({ layers }, "s"),
      p = obliqueMatrix({ layers }, "p");
    for (const key of ["R", "T"]) {
      near(n[key], s[key]);
      near(s[key], p[key]);
    }
    for (let k = 0; k < 2; k++) {
      near(n.r[k], s.r[k]);
      near(n.t[k], p.t[k]);
    }
  }
});
test("oblique matrices agree with independent whole-field Fresnel recursion including converted complex phase", () => {
  for (const mode of ["bare", "single", "pair", "reverse", "six"])
    for (const angle of [0, 35, 60, 75])
      for (const wavelength of [400, 550, 700])
        for (const pol of ["s", "p"]) {
          const layers = layerDesign({ mode, thicknessScale: 0.83 }),
            input = { layers, angle, wavelength },
            a = obliqueMatrix(input, pol),
            b = fresnelRecursion(input, pol);
          for (const key of ["R", "T"]) near(a[key], b[key]);
          for (let k = 0; k < 2; k++) {
            near(a.r[k], b.r[k]);
            near(a.t[k], b.t[k]);
          }
          near(a.R + a.T, 1);
        }
});
test("bare interface independently recovers Brewster zero and Snell energy flux, not transmission amplitude squared", () => {
  const brewster = bareTruth().brewster,
    truth = bareTruth(brewster);
  near(truth.p.R, 0);
  assert.ok(truth.s.R > 0.1);
  for (const angle of [0, 45, brewster, 75])
    for (const pol of ["s", "p"]) {
      const m = obliqueMatrix({ angle }, pol),
        t = bareTruth(angle)[pol];
      near(m.R, t.R);
      near(m.T, t.T);
      near(m.R + m.T, 1);
    }
  const p = obliqueMatrix({ angle: 60 }, "p");
  assert.ok(Math.abs(p.T - (p.t[0] ** 2 + p.t[1] ** 2)) > 0.05);
});
test("zero film thickness gives the bare interface at every angle, independent of the unused film index", () => {
  for (const angle of [0, 45, 75])
    for (const pol of ["s", "p"]) {
      const a = obliqueMatrix(
          {
            angle,
            layers: [
              { n: 1.3, d: 0 },
              { n: 1.7, d: 0 },
            ],
          },
          pol,
        ),
        b = bareTruth(angle)[pol];
      near(a.R, b.R);
      near(a.T, b.T);
    }
});
test("Snell tangential index is constant and oblique quarter-wave phase shifts without promising a spectral minimum", () => {
  const m = coatingBudget({ angle: 60 });
  [1, ...m.layers.map((l) => l.n), 1.52].forEach((n, j) =>
    near(
      n * Math.sqrt(Math.max(0, 1 - m.s.cosines[j] ** 2)),
      Math.sin(Math.PI / 3),
    ),
  );
  const wavelength = m.quarterPhase,
    l = m.layers[0],
    cos = m.s.cosines[1];
  near((2 * Math.PI * l.n * l.d * cos) / wavelength, Math.PI / 2);
  assert.ok(wavelength < 550);
  assert.ok(Math.abs(m.s.R - m.p.R) > 0.01);
});
test("polarization power weighting preserves endpoints, equal-power mean and energy; replay changes only incidence angle", () => {
  const m = coatingBudget({ angle: 60 }),
    s = coatingBudget({ angle: 60, pFraction: 0 }),
    p = coatingBudget({ angle: 60, pFraction: 1 });
  near(m.R, (m.s.R + m.p.R) / 2);
  near(s.R, s.s.R);
  near(p.R, p.p.R);
  near(m.R + m.T, 1);
  near(coatingBudget({ angle: 60, progress: 50 }).currentAngle, 30);
  assert.deepEqual(m.layers, coatingBudget({ angle: 60, progress: 0 }).layers);
  const matched = coatingBudget({ index: Math.sqrt(1.52), angle: 0 });
  near(matched.R, 0);
});
test("declared propagating model rejects critical or evanescent angles, absorbing inputs and invalid controls", () => {
  for (const p of [
    { angle: 76 },
    { index: 0 },
    { wavelength: NaN },
    { pFraction: 2 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => obliqueMatrix({ angle: 60, n0: 1.52, ns: 1 }));
  assert.throws(() =>
    obliqueMatrix({
      angle: (Math.asin(1 / 1.52) * 180) / Math.PI,
      n0: 1.52,
      ns: 1,
    }),
  );
  assert.throws(() => obliqueMatrix({ layers: [{ n: [1.38, 0.1], d: 100 }] }));
  assert.throws(() => obliqueMatrix({}, "q"));
});

test("lossless stack reciprocity preserves power on reversing layers and Snell-conjugate incidence", () => {
  for (const angle of [0, 35, 75])
    for (const pol of ["s", "p"]) {
      const layers = layerDesign({ mode: "pair" }),
        a = obliqueMatrix({ layers, angle }, pol),
        reverseAngle =
          (Math.asin(Math.sin((angle * Math.PI) / 180) / 1.52) * 180) / Math.PI,
        b = obliqueMatrix(
          {
            layers: [...layers].reverse(),
            angle: reverseAngle,
            n0: 1.52,
            ns: 1,
          },
          pol,
        );
      near(a.T, b.T);
      near(a.R, b.R);
    }
});
