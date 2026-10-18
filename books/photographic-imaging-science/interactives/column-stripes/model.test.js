import test from "node:test";
import assert from "node:assert/strict";
import {
  columnCorrection,
  columnStripes,
  parameters,
  WIDTH,
  HEIGHT,
  REFERENCES,
} from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);

test("column calibration uses observed column means and declared references, and ignores a common pedestal", () => {
  const frame = Float64Array.from([
    11, 15, 8, 9, 13, 19, 12, 11, 12, 17, 10, 10,
  ]);
  const correction = columnCorrection(frame, 4, 3, [0, 3]);
  assert.deepEqual(correction, [1, 6, -1, -1]);
  assert.deepEqual(
    columnCorrection(
      frame.map((v) => v + 1000),
      4,
      3,
      [0, 3],
    ),
    correction,
  );
  assert.deepEqual(
    columnCorrection(
      frame.map((v) => 2 * v),
      4,
      3,
      [0, 3],
    ),
    correction.map((v) => 2 * v),
  );
});
test("a linear ADC cancels integral-LSB fixed offsets throughout an unsaturated two-dimensional scene", () => {
  for (const bits of [6, 8, 10]) {
    const m = columnStripes({ bits, curvature: 0, offset: 4, signal: 0.5 });
    assert.equal(m.clipped, 0);
    near(m.residualRms, 0);
    assert.ok(m.residual.every((v) => v === 0));
    assert.ok(m.rawRms > 0);
    for (const j of REFERENCES) near(m.correction[j], 0);
  }
  const zero = columnStripes({ offset: 0 });
  near(zero.rawRms, 0);
  near(zero.residualRms, 0);
});
test("nonlinear code-domain calibration leaves brightness-dependent stripes but cancels at its calibration level", () => {
  const m = columnStripes();
  assert.ok(m.residualRms > 0);
  assert.notDeepEqual(m.residual.slice(0, WIDTH), m.residual.slice(-WIDTH));
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 12; x < WIDTH; x++) {
      assert.equal(m.rawError[y * WIDTH + x], m.rawError[y * WIDTH + (x % 12)]);
      assert.equal(m.residual[y * WIDTH + x], m.residual[y * WIDTH + (x % 12)]);
    }
  const atLevel = columnStripes({ signal: 0.3, calSignal: 0.3, gradient: 0 });
  near(atLevel.residualRms, 0);
  const dark = columnStripes({ signal: 0.3, calSignal: 0, gradient: 0 });
  assert.ok(dark.residualRms > 0);
});
test("independent bisection of the continuous ramp checks all observed ADC codes and saturation", () => {
  for (const p of [
    { bits: 6, curvature: -0.8, offset: 6, signal: 0.7 },
    { bits: 10, curvature: 0.8 },
    { bits: 8, curvature: 0 },
  ]) {
    const m = columnStripes(p),
      L = 2 ** m.p.bits;
    let clipped = 0;
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const v = m.rows[y].columns[x % 12].voltage;
        let lo = 0,
          hi = 1;
        for (let k = 0; k < 60; k++) {
          const t = (lo + hi) / 2;
          if (t + m.p.curvature * t * (1 - t) <= v) lo = t;
          else hi = t;
        }
        const code = Math.max(
          0,
          Math.min(L - 1, Math.floor(((lo + hi) * L) / 2 + 1e-9)),
        );
        assert.equal(m.observed[y * WIDTH + x], code);
        clipped += Number(v < 0 || v >= 1);
      }
    assert.equal(m.mismatches, 0);
    assert.equal(m.clipped, clipped);
    near(
      m.residualRms,
      Math.sqrt(
        [...m.residual].reduce((s, v) => s + v * v, 0) / (WIDTH * HEIGHT),
      ),
    );
  }
  assert.ok(columnStripes({ bits: 6, offset: 6, signal: 0.7 }).clipped > 0);
});
test("moving the row probe never changes observations, calibration or whole-frame statistics", () => {
  const a = columnStripes({ row: 0 }),
    b = columnStripes({ row: 31 });
  for (const k of [
    "observed",
    "reference",
    "correction",
    "rawError",
    "residual",
  ])
    assert.deepEqual(a[k], b[k]);
  near(a.residualRms, b.residualRms);
});
test("stripe parameters and calibration arrays reject invalid shape, nonfinite values and unsupported references", () => {
  for (const p of [
    { bits: 7 },
    { curvature: 1 },
    { offset: -1 },
    { signal: 0.8 },
    { calSignal: 0.5 },
    { gradient: 2 },
    { row: 32 },
    { row: 1.2 },
    { signal: NaN },
  ])
    assert.throws(() => parameters(p), RangeError);
  for (const args of [
    [[1, 2], 2, 2, [0]],
    [[1, NaN], 2, 1, [0]],
    [[1, 2], 2, 1, [2]],
    [[1, 2], 2, 1, []],
  ])
    assert.throws(() => columnCorrection(...args), RangeError);
});
