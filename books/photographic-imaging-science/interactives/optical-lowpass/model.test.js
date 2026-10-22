import test from "node:test";
import assert from "node:assert/strict";
import { branches, gains, sourceAt, shiftedAt, directPixelReference,
  lowpass, DEFAULTS, WIDTH, HEIGHT } from "./model.js";
import { spec } from "./lesson.js";
const near = (a, b, tolerance = 2e-10) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} versus ${b}`);

test("equal translated images conserve flux and have the stated full separation", () => {
  for (const mode of [0, 1, 2]) for (const separation of [0, 0.5, 1, 2]) {
    const b = branches({ mode, separation });
    near(b.reduce((sum, p) => sum + p.weight, 0), 1);
    near(b.reduce((sum, p) => sum + p.weight * p.x, 0), 0);
    near(b.reduce((sum, p) => sum + p.weight * p.y, 0), 0);
    if (mode && separation) near(Math.max(...b.map(p => p.x)) - Math.min(...b.map(p => p.x)), separation);
  }
});
test("direct translated-image sum agrees with the signed OTF at arbitrary non-grid positions", () => {
  for (const mode of [0, 1, 2]) for (const angle of [0, 31, 45, 90])
    for (const separation of [0, 0.7, 1, 2]) for (const frequency of [0.25, 0.5, 0.65, 1.25]) {
      const p = { mode, angle, separation, frequency, phase: 0.17 }, g = gains(p);
      for (const [x, y] of [[0, 0], [0.37, -0.48], [2.6, 3.4]])
        near(shiftedAt(x, y, p), 0.5 + g.optical * (sourceAt(x, y, p) - 0.5));
    }
});
test("pixel-area quadrature independently checks both optical shifts and sinc factors", () => {
  for (const mode of [0, 1, 2]) for (const angle of [0, 33, 90])
    for (const width of [0, 0.45, 1]) for (const frequency of [0.5, 0.65, 1.5]) {
      const p = { mode, angle, width, frequency, separation: 1.3, phase: 0.28 }, g = gains(p);
      near(directPixelReference(1.23, -0.7, p),
        0.5 + g.total * (sourceAt(1.23, -0.7, p) - 0.5), 2e-12);
    }
});
test("a Nyquist zero is directional and the finite split kernel is not band-limited", () => {
  near(gains({ mode: 2, separation: 1, angle: 0, frequency: 0.5 }).optical, 0);
  assert.ok(gains({ mode: 2, angle: 45, frequency: 0.5 }).optical > 0.19);
  near(gains({ mode: 1, angle: 90, frequency: 1.25 }).optical, 1);
  near(gains({ mode: 2, angle: 0, frequency: 1 }).optical, -1);
  assert.ok(gains({ frequency: 1.25 }).total > 0.12);
  const g = gains({ frequency: 0.65 });
  assert.ok(g.optical < 0 && g.pixel > 0 && g.total < 0);
});
test("sampling retains the known input and constructs an equivalent folded-frequency truth", () => {
  for (const angle of [0, 45, 90]) {
    const m = lowpass({ ...DEFAULTS, angle });
    assert.equal(m.original.length, WIDTH * HEIGHT * 64);
    assert.equal(m.filteredSamples.length, WIDTH * HEIGHT);
    assert.ok(m.aliasDifference < 2e-14);
    assert.ok(m.referenceError < 1e-12);
    assert.ok(m.original.every(v => v >= 0.1 - 1e-12 && v <= 0.9 + 1e-12));
    for (const [x, y] of [[0, 0], [37, 67], [255, 127]]) {
      const u = (x + 0.5) / 8 - 0.5, v = (y + 0.5) / 8 - 0.5,
        index = y * WIDTH * 8 + x;
      near(m.original[index], sourceAt(u, v, { ...DEFAULTS, angle }), 2e-14);
      near(m.filtered[index], shiftedAt(u, v, { ...DEFAULTS, angle }), 2e-14);
    }
  }
});
test("all presets are valid, distinguish their teaching condition, and render finite results", () => {
  for (const preset of spec.presets) {
    for (const c of spec.controls) assert.ok(preset.values[c.key] >= c.min && preset.values[c.key] <= c.max);
    const result = spec.evaluate(preset.values);
    assert.ok(result.figure.includes("<svg"));
    assert.ok(!/NaN|Infinity/.test(result.figure));
  }
  const a = spec.presets[0].values, b = spec.presets[1].values;
  assert.deepEqual(Object.keys(a).filter(k => a[k] !== b[k]), ["mode"]);
  near(gains({ ...DEFAULTS, phase: 0.6 }).total, gains(DEFAULTS).total);
});
