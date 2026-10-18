import test from "node:test";
import assert from "node:assert/strict";
import {
  spectralPair,
  parameters,
  quadratureTruth,
  cofactorNull,
  RESPONSE,
  NULL_DIRECTION,
} from "./model.js";
const near = (a, b, e = 1e-12) =>
  assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
test("independent 3x3 minors recover the declared null vector of three responses", () => {
  assert.deepEqual(cofactorNull(), NULL_DIRECTION);
  for (const r of RESPONSE)
    near(
      r.reduce((s, v, j) => s + v * NULL_DIRECTION[j], 0),
      0,
    );
  assert.throws(() =>
    cofactorNull([
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ]),
  );
});
test("distinct nonnegative reflectances have equal camera responses under the reference conditions", () => {
  for (const separation of [0, 0.1, 0.35, 0.5]) {
    const m = spectralPair({ separation });
    for (const r of [...m.a, ...m.b]) assert.ok(r >= 0 && r <= 1);
    for (let k = 0; k < 3; k++) {
      near(m.cameraA[k], 1);
      near(m.cameraB[k], 1);
    }
    near(Math.max(...m.a.map((v, j) => Math.abs(v - m.b[j]))), 2 * separation);
  }
});
test("wavelength quadrature independently checks both spectra for changed illumination and response", () => {
  for (const separation of [0, 0.2, 0.5])
    for (const tilt of [-0.8, 0, 0.8])
      for (const probe of [0, 0.5]) {
        const m = spectralPair({ separation, tilt, probe });
        for (const [r, c] of [
          [m.a, m.cameraA],
          [m.b, m.cameraB],
        ])
          quadratureTruth(r, m.illuminant, m.response).forEach((v, k) =>
            near(v, c[k]),
          );
        const d = m.cameraA.map((v, k) => v - m.cameraB[k]);
        near(
          d[0],
          (-4 * separation * tilt) / 3 + 2 * separation * probe * (1 - tilt),
        );
        near(d[1], (4 * separation * tilt) / 3);
        near(d[2], (-4 * separation * tilt) / 3);
      }
});
test("partial integration includes fractional band width and reaches exactly the complete result", () => {
  const zero = spectralPair({ progress: 0 }),
    half = spectralPair({ progress: 37.5 }),
    full = spectralPair();
  assert.deepEqual(zero.partialA, [0, 0, 0]);
  assert.deepEqual(half.weights, [1, 0.5, 0, 0]);
  assert.deepEqual(full.partialA, full.cameraA);
  assert.deepEqual(full.partialB, full.cameraB);
});
test("same reflectance stays identical under every allowed illuminant and response", () => {
  const m = spectralPair({ separation: 0, tilt: 0.8, probe: 0.5 });
  assert.deepEqual(m.cameraA, m.cameraB);
  for (const p of [
    { separation: -1 },
    { tilt: 1 },
    { probe: NaN },
    { progress: 101 },
  ])
    assert.throws(() => parameters(p));
});
