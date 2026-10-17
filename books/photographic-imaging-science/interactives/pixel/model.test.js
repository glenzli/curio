import test from "node:test";
import assert from "node:assert/strict";
import {
  Q,
  KB,
  noiseBudget,
  pixelState,
  readPair,
  repeatedReads,
} from "./model.js";
const near = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);

test("FD conversion and kT/C use SI units; capacitance has opposite voltage/electron noise scalings", () => {
  const a = noiseBudget(10, 30),
    b = noiseBudget(40, 30);
  near(a.gain, Q / 1e-14, 1e-18);
  near(a.resetV ** 2, (KB * 300) / 1e-14, 1e-22);
  near(a.gain / b.gain, 4);
  near(a.resetV / b.resetV, 2);
  near(b.resetE / a.resetE, 2);
  near(b.cdsE / a.cdsE, 4);
});
test("FD reset leaves PPD signal intact; transfer conserves charge and precedes signal sampling", () => {
  for (let progress = 0; progress <= 100; progress += 0.25) {
    const s = pixelState({ progress, electrons: 2400 });
    near(s.ppdCharge + s.fdCharge, s.collected);
    assert.ok(s.ppdCharge >= 0 && s.fdCharge >= 0);
    if (s.rst) {
      near(s.ppdCharge, 2400);
      near(s.fdCharge, 0);
      assert.equal(s.tx, false);
    }
    if (s.referenceAvailable && !s.tx && progress < 50) near(s.ppdCharge, 2400);
    if (s.signalAvailable) {
      near(s.ppdCharge, 0);
      near(s.fdCharge, 2400);
    }
  }
  assert.equal(pixelState({ progress: 0 }).fdVoltage, null);
  assert.equal(pixelState({ progress: 43.9 }).referenceAvailable, false);
  assert.equal(pixelState({ progress: 44 }).referenceAvailable, true);
  assert.equal(pixelState({ progress: 72.9 }).signalAvailable, false);
  assert.equal(pixelState({ progress: 80 }).differenceAvailable, true);
});
test("common reset offsets cancel, independent sample errors retain their signed difference", () => {
  const a = readPair({ resetOffsetV: -0.003 }),
    b = readPair({ resetOffsetV: 0.004 });
  near(a.difference, b.difference, 1e-15);
  near(a.difference, a.gain * 1000 + a.nR - a.nS, 1e-15);
  near(
    readPair({ electrons: 2300, sampleNoiseUv: 0, resetOffsetV: 0.05 })
      .estimated,
    2300,
    1e-8,
  );
  near(
    readPair({ electrons: 0, sampleNoiseUv: 0, resetOffsetV: 0.05 }).difference,
    0,
  );
});
test("repeated reads match independent-noise variance and remain reproducible", () => {
  const p = { count: 100000, sampleNoiseUv: 90, capacitanceFf: 10, seed: 72 };
  const samples = repeatedReads(p),
    budget = noiseBudget(p.capacitanceFf, p.sampleNoiseUv);
  for (const [key, sigma] of [
    ["single", budget.singleE],
    ["cds", budget.cdsE],
  ]) {
    const mean = samples.reduce((s, x) => s + x[key], 0) / samples.length;
    const variance =
      samples.reduce((s, x) => s + (x[key] - mean) ** 2, 0) / samples.length;
    near(Math.sqrt(variance) / sigma, 1, 0.012);
    assert.ok(Math.abs(mean) < sigma * 0.015);
  }
  assert.deepEqual(
    repeatedReads({ count: 4, seed: 2 }),
    repeatedReads({ count: 4, seed: 2 }),
  );
  assert.ok(repeatedReads({ sampleNoiseUv: 0 }).every((x) => x.cds === 0));
  assert.ok(noiseBudget(10, 1000).cdsE > noiseBudget(10, 1000).singleE);
});
test("invalid pixel model inputs are rejected", () => {
  for (const c of [0, -1, NaN]) assert.throws(() => noiseBudget(c));
  assert.throws(() => pixelState({ progress: 101 }));
  assert.throws(() => readPair({ electrons: -1 }));
  assert.throws(() => repeatedReads({ count: 0.5 }));
});
