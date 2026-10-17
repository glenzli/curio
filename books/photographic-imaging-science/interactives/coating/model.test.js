import test from "node:test";
import assert from "node:assert/strict";
import { film, quarterWave, magnitude2 } from "./model.js";
const near = (a, b, tol = 1e-12) =>
  assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
test("zero thickness and index-matched interfaces recover the bare interface", () => {
  for (const nc of [1, 1.23, 1.38, 2.2]) {
    const m = film({ nc, thickness: 0 });
    near(m.R, m.bare);
  }
  for (const nc of [1, 1.52])
    for (const thickness of [0, 100, 300]) {
      const m = film({ nc, thickness });
      near(m.R, m.bare);
    }
});
test("quarter wave cancels at geometric-mean index and matches textbook residual at 1.38", () => {
  const ideal = Math.sqrt(1.52);
  near(film({ nc: ideal, thickness: quarterWave(ideal) }).R, 0);
  const m = film();
  near(m.R, ((1.52 - 1.38 ** 2) / (1.52 + 1.38 ** 2)) ** 2);
  near(quarterWave(1.38), 99.6376811594203);
  near(m.R, 0.0126008, 0.000001);
  assert.ok(
    film({ nc: ideal, thickness: quarterWave(ideal), wavelength: 440 }).R >
      0.005,
  );
});
test("independent characteristic-matrix result agrees in complex phase, not just intensity", () => {
  for (const thickness of [0, 23, 99.6, 201, 300])
    for (const wavelength of [400, 550, 700]) {
      const nc = 1.38,
        ns = 1.52,
        delta = (2 * Math.PI * nc * thickness) / wavelength;
      const br = Math.cos(delta),
        bi = (ns * Math.sin(delta)) / nc;
      const cr = ns * Math.cos(delta),
        ci = nc * Math.sin(delta);
      const nr = br - cr,
        ni = bi - ci,
        dr = br + cr,
        di = bi + ci,
        norm = dr * dr + di * di;
      const r = [(nr * dr + ni * di) / norm, (ni * dr - nr * di) / norm],
        m = film({ thickness, wavelength });
      near(m.r[0], r[0]);
      near(m.r[1], r[1]);
    }
});
test("lossless energy conservation and exact all-return phasor sum hold across the control domain", () => {
  for (const nc of [1, 1.23, 1.38, 1.8, 2.2])
    for (const ns of [1.2, 1.52, 2])
      for (let thickness = 0; thickness <= 300; thickness += 17)
        for (const wavelength of [400, 485, 550, 700]) {
          const m = film({ nc, ns, thickness, wavelength });
          near(m.R + m.T, 1);
          assert.ok(m.R >= 0 && m.R <= 1 && m.T >= 0 && m.T <= 1 + 1e-12);
          near(
            magnitude2([
              m.front[0] + m.returning[0],
              m.front[1] + m.returning[1],
            ]),
            m.R,
          );
        }
});
test("half-wave periodicity and optical scaling use nm consistently", () => {
  const a = film({ thickness: 73, wavelength: 520 });
  near(film({ thickness: 73 + 520 / (2 * 1.38), wavelength: 520 }).R, a.R);
  near(film({ thickness: 146, wavelength: 1040 }).R, a.R);
  for (const parameters of [{ nc: 0 }, { wavelength: NaN }, { thickness: -1 }])
    assert.throws(() => film(parameters));
});
