import test from "node:test";
import assert from "node:assert/strict";
import {
  focusSystem,
  solveFloating,
  floatingTruth,
  trace,
  matrices,
} from "./model.js";
const close = (a, b, t = 1e-7) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);

test("floating infinity is the independently known v50 c150 f100 reference", () => {
  const m = focusSystem({ vergence: 0, mode: "floating" });
  close(m.active.v, 50);
  close(m.active.c, 150);
  close(m.scale, 100);
  close(m.focalLength, 100);
  close(m.spread, 0);
});
test("floating two ray constraints agree with separate quadratic elimination across travel", () => {
  for (let i = 0; i <= 300; i++) {
    const w = i / 100,
      truth = floatingTruth(w),
      s = solveFloating(w);
    assert.equal(s !== null, truth.length > 0, `vergence ${w}`);
    if (!s) continue;
    close(s.v, truth[0].v);
    close(s.c, truth[0].c);
    close(trace(s.v, s.c, 1, w / 1000).detector, 0, 2e-10);
    close(trace(s.v, s.c, 0, 1).detector, 100);
  }
});
test("rear-only focusing changes the fixed background scale while dual motion holds it", () => {
  const rear = focusSystem({ vergence: 1 }),
    floating = focusSystem({ vergence: 1, mode: "floating" });
  close(rear.active.c, 142.11646096066227);
  close(rear.scale, 78.83539039337731);
  close(rear.spread, 0);
  close(floating.active.v, 57.997020863937095);
  close(floating.active.c, 147.19731877754342);
  close(floating.scale, 100);
  close(floating.spread, 0);
  // Holding angular scale does not hold effective focal length.
  close(floating.focalLength, 139.92563237406563);
  close(floating.chief.detector, 0.5);
  close(rear.chief.detector, 0.39417695196688655);
});
test("floating matrix propagation agrees with direct kicks including signed background directions", () => {
  for (const v of [10, 32, 50, 70])
    for (const c of [90, 135, 190]) {
      const m = matrices(v, c),
        [A, B, C, D] = m.detector;
      close(A * D - B * C, 1);
      for (const [h, a] of [
        [-0.5, -0.005],
        [0, 0.005],
        [1, 0.002],
      ]) {
        const r = trace(v, c, h, a);
        close(r.detector, A * h + B * a);
        close(r.u3, C * h + D * a);
      }
    }
});
test("floating manual defocus and unavailable automatic travel are not reported as a solution", () => {
  const manual = focusSystem({ vergence: 1, mode: "manual" });
  close(manual.spread, 0.1);
  assert.equal(manual.solved, null);
  const a = focusSystem({
    vergence: 2.5,
    mode: "floating",
    manualV: 40,
    manualC: 160,
  });
  assert.equal(a.solved, null);
  assert.deepEqual(a.active, { v: 40, c: 160 });
  assert.ok(a.spread > 0.01);
  assert.deepEqual(a.truth, []);
  assert.ok(solveFloating(1));
  assert.equal(solveFloating(3), null);
});
test("floating malformed inputs and singular travel fail explicitly", () => {
  for (const vergence of [-1, NaN, Infinity, 4])
    assert.throws(() => focusSystem({ vergence }), RangeError);
  for (const input of [
    { mode: "wrong" },
    { manualV: 0 },
    { manualC: 200 },
    { directionMrad: NaN },
  ])
    assert.throws(() => focusSystem(input), RangeError);
});

test("floating inclusive travel preserves the exact 70mm boundary without a hidden derivative margin", () => {
  // B(70,c)=.048c²−11.56c+774. The physical B=100 root is known independently.
  const c = (11.56 + Math.sqrt(11.56 ** 2 - 4 * 0.048 * 674)) / (2 * 0.048);
  const vergence = 10 - (10 * (0.02 * c - 1)) / 2.4;
  for (const delta of [-1e-5, -1e-8, 0]) {
    const s = solveFloating(vergence + delta);
    assert.ok(s);
    const t = floatingTruth(vergence + delta)[0];
    close(s.v, t.v);
    close(s.c, t.c);
  }
  close(solveFloating(vergence).v, 70);
  close(solveFloating(vergence).c, c);
  assert.equal(solveFloating(vergence + 1e-8), null);
  assert.deepEqual(floatingTruth(vergence + 1e-8), []);
});
