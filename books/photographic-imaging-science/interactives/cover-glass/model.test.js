import test from "node:test";
import assert from "node:assert/strict";
import { plateExperiment, rayAt, vectorReference, FOCUS, RAY_COUNT } from "./model.js";
import { spec } from "./lesson.js";
import { fallback } from "../common/lesson-view.js";

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} versus ${b}`);

test("two-interface vector Snell agrees with geometry over the exposed input range", () => {
  for (const thickness of [0, 0.1, 1, 2, 4])
    for (const index of [1, 1.1, 1.52, 1.9])
      for (const fNumber of [1.2, 1.4, 2.8, 8]) {
        const p = { thickness, index, fNumber };
        for (const q of [-1, -0.7, -0.1, 0, 0.1, 0.7, 1]) {
          const height = (q * FOCUS) / (2 * fNumber),
            a = rayAt(height, p), b = vectorReference(height, p);
          close(Math.atan2(b.inside[1], b.inside[0]), -Math.sign(height) * a.refraction);
          close(b.incoming[0], b.outgoing[0]);
          close(b.incoming[1], b.outgoing[1]);
          for (const z of [50, 50.4, 51.2, 52.5]) close(a.at(z), b.at(z));
          if (height) close(a.focus, b.focus);
        }
      }
});

test("zero thickness and n=1 preserve original convergence and zero residual", () => {
  for (const p of [{ thickness: 0 }, { index: 1 }]) {
    const m = plateExperiment(p);
    close(m.paraxialShift, 0); close(m.marginalShift, 0); close(m.bestShift, 0);
    close(m.current.span, 0); close(m.refocused.rms, 0);
  }
});

test("exact angular focus shift tends to the paraxial result with a quadratic error", () => {
  const t = 2, n = 1.52, expected = t * (1 - 1 / n),
    error = (u) => rayAt(FOCUS * u, { thickness: t, index: n }).shift - expected;
  close(rayAt(0, { thickness: t, index: n }).shift, expected);
  assert.ok(Math.abs(error(1e-4)) < 5e-9);
  close(error(0.001) / error(0.0005), 4, 0.00001);
});

test("moving the sensor minimizes the declared equal-weight meridional RMS, with residual aberration", () => {
  const m = plateExperiment({ focusMode: 2 });
  assert.equal(m.rays.length, RAY_COUNT);
  assert.ok(m.paraxialShift < m.bestShift && m.bestShift < m.marginalShift);
  assert.ok(m.refocused.rms > 0.001 && m.refocused.rms < 0.01);
  close(m.current.rms, m.refocused.rms);
  for (const delta of [-0.01, 0.01])
    assert.ok(plateExperiment({ focusMode: 3, sensorShift: m.bestShift + delta }).current.rms > m.current.rms);
  close(m.current.mean, 0);
  // The least-squares first derivative is zero, independently of the optimizer.
  close(m.rays.reduce((sum, r, j) => sum + r.slope * m.current.heights[j], 0), 0);
});

test("thickness and aperture comparisons preserve ray weights and isolate the stated factor", () => {
  const a = plateExperiment({ focusMode: 2 }),
    half = plateExperiment({ thickness: 1, focusMode: 2 }),
    stopped = plateExperiment({ fNumber: 5.6, focusMode: 2 });
  close(a.refocused.rms, 2 * half.refocused.rms);
  close(a.marginalShift, 2 * half.marginalShift);
  assert.ok(stopped.refocused.rms < a.refocused.rms / 50);
  assert.equal(stopped.rays.length, a.rays.length);
  close(stopped.paraxialShift, a.paraxialShift);
  for (let j = 0; j < a.rays.length; j++) close(stopped.rays[j].height, a.rays[j].height / 4);
});

test("every preset is valid and comparison pairs change only their stated input", () => {
  const base = spec.presets[0].values;
  for (const preset of spec.presets) {
    const m = plateExperiment(preset.values);
    assert.ok(m.referenceError < 1e-11);
    assert.ok(Number.isFinite(m.current.rms));
  }
  for (const [index, key] of [[1, "thickness"], [2, "thickness"], [3, "fNumber"], [4, "focusMode"], [5, "focusMode"], [6, "index"]])
    assert.deepEqual(Object.keys(base).filter((k) => base[k] !== spec.presets[index].values[k]), [key]);
  const manual = spec.controls.find((c) => c.key === "sensorShift");
  assert.equal(manual.enabled(base), false);
  assert.equal(manual.enabled({ ...base, focusMode: 3 }), true);
});

test("out-of-range and nonfinite inputs stop before a misleading ray trace", () => {
  for (const p of [{ thickness: -1 }, { thickness: 5 }, { index: 0.9 }, { fNumber: 0 }, { focusMode: 4 }, { sensorShift: Infinity }])
    assert.throws(() => plateExperiment(p), RangeError);
});

test("static fallback and fixed plot axes remain finite at all presets", () => {
  assert.doesNotMatch(fallback(spec), /NaN|Infinity|undefined/);
  for (const preset of spec.presets) {
    const result = spec.evaluate(preset.values);
    assert.deepEqual(result.panels.map((p) => [p.yMin, p.yMax]), [[-1000, 1000], [-40, 40], [0, 160]]);
    assert.doesNotMatch(result.figure, /NaN|Infinity|undefined/);
    for (const panel of result.panels)
      for (const c of panel.curves)
        assert.ok(c.points.every((p) => p.every(Number.isFinite)));
  }
});
