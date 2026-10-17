import test from "node:test";
import assert from "node:assert/strict";
import { coefficient, quadrature, efficiency, phaseProfile, orderSpectrum, sinc } from "./model.js";
const near = (a, b, tolerance = 1e-11) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("PF design-wave first order reproduces the closed form and known efficiencies", () => {
  for (const levels of [1, 2, 4, 8, 16, 32, 128]) {
    const c = coefficient({ levels });
    near(efficiency(c), sinc(1 / levels) ** 2);
    near(c[0], Math.cos(-Math.PI / levels) * sinc(1 / levels));
    near(c[1], Math.sin(-Math.PI / levels) * sinc(1 / levels));
  }
  near(efficiency(coefficient({ levels: 2 })), 4 / Math.PI ** 2);
  near(efficiency(coefficient({ levels: 4 })), 8 / Math.PI ** 2);
  near(efficiency(coefficient({ levels: 8 })), 0.9496412035517837);
});
test("PF exact interval integrals agree with independent midpoint quadrature in complex phase", () => {
  for (const levels of [1, 2, 3, 8, 32])
    for (const depth of [0, 0.7, 1, 2])
      for (const wavelength of [400, 550, 700])
        for (const order of [-7, -1, 0, 1, 5]) {
          const p = { levels, depth, wavelength, order };
          const exact = coefficient(p), numerical = quadrature(p, 1024);
          near(exact[0], numerical[0], 8e-6);
          near(exact[1], numerical[1], 8e-6);
        }
});
test("PF zero relief and one-level screens put all power in order zero", () => {
  for (const p of [{ depth: 0 }, { levels: 1, depth: 1.7, wavelength: 400 }])
    for (let order = -8; order <= 8; order++)
      near(efficiency(coefficient({ ...p, order })), order === 0 ? 1 : 0);
});
test("PF at design wavelength permits only orders 1 modulo N, with no renormalized tail", () => {
  for (const levels of [2, 4, 8, 32]) {
    for (let order = -15; order <= 15; order++) {
      const eta = efficiency(coefficient({ levels, order }));
      if ((order - 1) % levels !== 0) near(eta, 0);
    }
    const s = orderSpectrum({ levels });
    assert.ok(s.shownEnergy <= 1 + 1e-12);
    assert.ok(s.omittedEnergy > 0);
    near(s.shownEnergy + s.omittedEnergy, 1);
  }
  // Parseval convergence over many orders; no finite plot is forced to sum to 1.
  for (const depth of [0.4, 1, 1.8]) {
    const s = orderSpectrum({ levels: 4, depth }, 1000);
    assert.ok(s.shownEnergy > 0.999 && s.shownEnergy <= 1 + 1e-12);
  }
});
test("PF off-design phase scaling, continuous limit and quadrature convergence are independent checks", () => {
  const p = { levels: 8, depth: 1, wavelength: 400 };
  near(efficiency(coefficient(p)), efficiency(coefficient({ ...p, depth: 550 / 400, wavelength: 550 })));
  assert.ok(efficiency(coefficient(p)) < efficiency(coefficient({ levels: 8 })));
  const alpha = 550 / 700;
  near(efficiency(coefficient({ levels: 256, wavelength: 700 })), sinc(alpha - 1) ** 2, 0.0001);
  const truth = efficiency(coefficient({ levels: 2 }));
  const coarse = Math.abs(efficiency(quadrature({ levels: 2 }, 8)) - truth);
  const fine = Math.abs(efficiency(quadrature({ levels: 2 }, 64)) - truth);
  assert.ok(fine < coarse / 60);
  const profile = phaseProfile(p);
  near(profile.alpha, 550 / 400);
  assert.equal(profile.steps.length, 16);
  assert.equal(profile.steps.at(-1)[0], 1);
});
test("PF rejects malformed levels, wavelengths, depth, order and quadrature grids", () => {
  for (const p of [{ levels: 0 }, { levels: 2.5 }, { levels: 257 }, { wavelength: 0 }, { depth: NaN }, { depth: -1 }, { order: 0.5 }])
    assert.throws(() => coefficient(p), RangeError);
  assert.throws(() => quadrature({}, 0), RangeError);
  assert.throws(() => orderSpectrum({}, 0), RangeError);
});
