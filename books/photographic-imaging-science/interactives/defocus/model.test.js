import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  propagate,
  pupil,
  directDensity,
  continuousDensity,
  radialLimit,
  inside,
  displacementUm,
  WHITE,
  SCALE_UM,
} from "./model.js";
import { airyRelative } from "../wave/model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
const at = (g, x, y = 0) =>
  g.density[((y + g.size) % g.size) * g.size + ((x + g.size) % g.size)];
test("defocus all aperture shapes have known continuous area pi", () => {
  for (const shape of [0, 1, 2, 3]) {
    const n = 32768;
    let area = 0;
    for (let i = 0; i < n; i++)
      area +=
        (Math.PI * radialLimit(shape, (2 * Math.PI * (i + 0.5)) / n) ** 2) / n;
    near(area, Math.PI, 1e-7);
    assert.ok(Math.abs(pupil({ shape }).area / Math.PI - 1) < 0.012);
  }
  assert.equal(inside(0, 1.01, 0), false);
  assert.equal(inside(3, 0.8, 0.8), true);
});
test("defocus FFT uses the same physical scale and agrees with independent pupil sums", () => {
  for (const shape of [0, 1, 2, 3]) {
    const g = propagate({ shape }, 0.45);
    near(g.stepUm, 1.1);
    near(g.parseval, 1, 2e-12);
    near(g.integral, 1, 2e-12);
    assert.ok(g.retained > 0 && g.retained < 1);
    for (const [x, y] of [
      [0, 0],
      [4, 0],
      [-3, 5],
      [8, -6],
    ])
      near(at(g, x, y), directDensity(g, x / 4, y / 4), 2e-14);
  }
});
test("defocus opposite phase yields a centrally reversed PSF, including the odd-sided aperture", () => {
  for (const shape of [0, 1, 2, 3]) {
    const a = propagate({ shape, spherical: 0.12 }, 0.45),
      b = propagate({ shape, spherical: -0.12 }, -0.45);
    for (let y = -12; y <= 12; y += 3)
      for (let x = -12; x <= 12; x += 3)
        near(at(a, x, y), at(b, -x, -y), 1e-13);
  }
});
test("defocus pure phase sign is symmetric for even apertures but pentagons require coordinate reversal", () => {
  for (const shape of [0, 1, 3]) {
    const a = propagate({ shape, spherical: 0 }, 0.45),
      b = propagate({ shape, spherical: 0 }, -0.45);
    for (let y = -10; y <= 10; y += 2)
      for (let x = -10; x <= 10; x += 2) near(at(a, x, y), at(b, x, y), 1e-13);
  }
  const a = propagate({ shape: 2, spherical: 0 }, 0.45),
    b = propagate({ shape: 2, spherical: 0 }, -0.45);
  assert.ok(Math.abs(at(a, 8, 0) - at(b, 8, 0)) > 1e-5);
  near(at(a, 8, 0), at(b, -8, 0), 1e-13);
});
test("defocus nonzero spherical aberration changes opposite-side profiles at the same scale", () => {
  const a = propagate({ spherical: 0.12 }, 0.45),
    b = propagate({ spherical: 0.12 }, -0.45);
  assert.ok(Math.abs(at(a, 4) - at(b, 4)) > 0.001);
});
test("defocus circular Airy and square sinc are independent zero-aberration limits", () => {
  const circle = propagate({ spherical: 0 }, 0),
    square = propagate({ shape: 3, spherical: 0 }, 0);
  const sinc = (x) =>
      Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x),
    a = Math.sqrt(Math.PI) / 2;
  for (const q of [0, 0.5, 1, 1.5, 2]) {
    near(at(circle, q * 4), WHITE * airyRelative(q), WHITE * 0.006);
    near(at(square, q * 4), WHITE * sinc(a * q) ** 2, WHITE * 0.012);
  }
});
test("defocus refined Cartesian pupils and continuous polar quadrature converge on fixed physical probes", () => {
  for (const shape of [0, 1, 2, 3]) {
    const params = { shape, spherical: 0.12 },
      g = propagate({ ...params, diameter: 128 }, 0.45),
      fine = propagate({ ...params, diameter: 256 }, 0.45);
    let coarseError = 0,
      fineError = 0;
    for (const [qx, qy] of [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 0],
    ]) {
      const ref = continuousDensity(params, 0.45, qx, qy, 192, 768).density,
        more = continuousDensity(params, 0.45, qx, qy, 384, 1536).density;
      near(ref, more, WHITE * 0.0002);
      const coarse = at(g, 4 * qx, 4 * qy),
        finer = at(fine, 4 * qx, 4 * qy);
      near(coarse, more, WHITE * 0.006);
      near(finer, more, WHITE * 0.003);
      coarseError += Math.abs(coarse - more);
      fineError += Math.abs(finer - more);
    }
    assert.ok(
      fineError < coarseError,
      `shape ${shape}: ${fineError} < ${coarseError}`,
    );
  }
});
test("defocus extreme allowed coefficients remain within a checked continuous probe tolerance", () => {
  for (const shape of [0, 1, 2, 3]) {
    const p = { shape, spherical: 0.25 },
      g = propagate(p, 0.6);
    for (const q of [0, 1, 3])
      near(
        at(g, 4 * q),
        continuousDensity(p, 0.6, q, 0, 384, 1536).density,
        WHITE * 0.008,
      );
  }
});
test("defocus longitudinal sign follows the declared propagation convention", () => {
  assert.ok(displacementUm(0.45) < 0);
  near(displacementUm(-0.45), -displacementUm(0.45));
  near(SCALE_UM, 4.4);
  near(displacementUm(0.45), -438.97095667025627, 1e-6);
});
test("defocus rejects nonfinite, unsupported grids and coefficients", () => {
  for (const p of [
    { shape: 4 },
    { shape: 0.5 },
    { amount: NaN },
    { spherical: 1 },
    { diameter: 32 },
    { padding: 1 },
    { scan: 2 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => propagate({}, NaN));
  assert.throws(() => propagate({}, 0.9));
});

await import("./view.test.js");
