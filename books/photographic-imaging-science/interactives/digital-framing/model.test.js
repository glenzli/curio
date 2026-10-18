import test from "node:test";
import assert from "node:assert/strict";
import {
  digitalFrame,
  parameters,
  exposed,
  scene,
  WIDTH,
  HEIGHT,
  sinc,
} from "./model.js";
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
const identity = {
  shift: 0,
  breathing: 0,
  crop: 1,
  blur: 0,
  shiftError: 0,
  scaleError: 0,
};
test("identity mapping uses the exact pixel grid and known unblurred scene", () => {
  const m = digitalFrame(identity);
  near(m.coverage, 1);
  near(m.rmse, 0);
  near(m.sourceWidth, WIDTH);
  for (let i = 0; i < m.raw.length; i++) near(m.raw[i], m.truth[i]);
});
test("supplied true translation and scale align frames within bilinear sampling error", () => {
  for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
    const m = digitalFrame({ crop: 1.4, phase });
    near(m.coverage, 1);
    assert.ok(m.rmse < 0.035, m.rmse);
  }
});
test("wrong estimates produce residual motion or scale error against the same truth", () => {
  const a = digitalFrame({ crop: 1.4 }),
    b = digitalFrame({ crop: 1.4, shiftError: 4 }),
    c = digitalFrame({ crop: 1.4, scaleError: 3 });
  assert.ok(b.rmse > a.rmse * 3);
  assert.ok(c.rmse > a.rmse * 2);
});
test("insufficient crop margin leaves missing pixels, excluded from the valid comparison", () => {
  const m = digitalFrame({ crop: 1, shift: 15, breathing: 10 });
  assert.ok(m.coverage < 0.9);
  assert.ok(m.coverage > 0);
  near(
    m.count,
    [...m.valid].reduce((a, b) => a + b, 0),
  );
  for (let i = 0; i < m.valid.length; i++)
    if (!m.valid[i]) near(m.corrected[i], 0);
});
test("full pixel-center support agrees with the independently derived crop inequality", () => {
  for (const crop of [0.9, 1, 1.1, 1.25, 1.5]) {
    for (const breathing of [-10, 0, 10]) {
      for (const shiftError of [-12, 0, 12]) {
        const m = digitalFrame({
          crop,
          breathing,
          shift: 0,
          shiftError,
          phase: 0.25,
        });
        const ratio = (1 + breathing / 100) / crop;
        const complete =
          ratio <= 1 &&
          Math.abs(shiftError) <= ((WIDTH - 1) / 2) * (1 - ratio) + 1e-10;
        assert.equal(m.coverage === 1, complete);
      }
    }
  }
});
test("analytic exposed image agrees with independent numerical shutter integration", () => {
  const p = parameters({ blur: 12, phase: 0.25 });
  for (const [x, y] of [
    [0, 0],
    [-35, 19],
    [51, -23],
  ]) {
    const n = 4096,
      dt = 1 / n;
    let sum = 0;
    for (let j = 0; j <= n; j++) {
      const t = j / n - 0.5,
        w = j === 0 || j === n ? 1 : j % 2 ? 4 : 2;
      sum +=
        w *
        scene(
          (x - p.displacement - p.blur * t) / ((p.scale * WIDTH) / 2),
          y / ((p.scale * WIDTH) / 2),
        );
    }
    near(exposed(x, y, p), (sum * dt) / 3, 2e-12);
  }
});
test("digital geometry cannot remove integration blur or its zeros", () => {
  const sharp = digitalFrame({ ...identity, crop: 1.4 }),
    blur = digitalFrame({ ...identity, crop: 1.4, blur: 10 });
  assert.ok(blur.rmse > sharp.rmse * 1.1);
  near(blur.motionMtf, 0);
  near(sinc(0), 1);
});
test("declared range remains finite, includes negative motion and subpixel sampling", () => {
  for (const p of [
    { shift: -12, phase: 0.75 },
    { breathing: -10, phase: 0.25 },
    { blur: 12, scaleError: -3 },
    { crop: 1, shiftError: 6 },
  ]) {
    const m = digitalFrame(p);
    assert.ok(m.raw.every(Number.isFinite));
    assert.ok(m.truth.every(Number.isFinite));
    assert.equal(m.valid.length, WIDTH * HEIGHT);
  }
  for (const p of [
    { crop: 0 },
    { blur: -1 },
    { breathing: 100 },
    { phase: NaN },
  ])
    assert.throws(() => digitalFrame(p), RangeError);
});

test("fiducial boundaries agree with independent dense shutter integration", () => {
  const p = parameters({ blur: 12, phase: 0.25 }),
    n = 65536;
  for (const [u, v] of [
    [0.68, 0.28],
    [-0.72, -0.2],
    [-0.45, -0.2],
    [0.55, 0.4099],
  ]) {
    const x = (u * p.scale * WIDTH) / 2 + p.displacement,
      y = (v * p.scale * WIDTH) / 2;
    let sum = 0;
    for (let i = 0; i < n; i++)
      sum += scene(
        (x - p.displacement - p.blur * ((i + 0.5) / n - 0.5)) /
          ((p.scale * WIDTH) / 2),
        v,
      );
    near(exposed(x, y, p), sum / n, 1e-5);
  }
});
