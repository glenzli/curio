import test from 'node:test';
import assert from 'node:assert/strict';
import { FLASH_DOSE, parameters, overlap, pwmOnTime, pwmReference,
  commonWindow, rowDose, lightTiming } from './model.js';
import { spec } from './lesson.js';
import { fallback } from '../common/lesson-view.js';

const close = (a, b, tolerance = 1e-10) =>
  assert(Math.abs(a - b) <= tolerance, String(a) + ' != ' + String(b));

test('rectangular PWM integrates interval overlap, not center brightness', () => {
  close(rowDose(0).light, 8);
  close(rowDose(0.25).light, 2);
  close(rowDose(0.5).light, 0);
  close(rowDose(1).light, 0);
  // Both interval endpoints land exactly at pulse transitions.
  close(pwmOnTime(2.5, 10, 10, 0.25), 0);
  close(pwmOnTime(10, 12.5, 10, 0.25), 2.5);
  close(pwmOnTime(1.5, 3.5, 10, 0.25), 1);
});

test('full PWM periods preserve fixed mean for every duty and phase', () => {
  for (const duty of [0.1, 0.25, 0.7, 1])
    for (const phase of [-17.5, 0, 2.5, 10, 23])
      for (const start of [-13, 0, 2.5, 11.3])
        for (const n of [1, 2, 5])
          close(pwmOnTime(start, start + 10 * n, 10, duty, phase) / duty, 10 * n);
  const m = lightTiming({ exposureMs: 10, duty: 10, phase: 37 });
  m.rows.forEach((r) => close(r.ratio, 1));
});

test('prefix integral agrees with independent edge-partition and midpoint integrals', () => {
  for (const frequency of [50, 150, 650, 2000])
    for (const duty of [0.1, 0.25, 0.65, 1])
      for (const phase of [0, 0.3, 1])
        for (const start of [-4.75, 0, 2.5, 19.75]) {
          const period = 1000 / frequency, end = start + 7.375, phi = period * phase;
          close(pwmOnTime(start, end, period, duty, phi) / duty,
            pwmReference(start, end, period, duty, phi), 3e-10);
        }
  const start = 0.23, end = 7.87, period = 3.7, duty = 0.35, phi = 1.11;
  let midpoint = 0;
  const steps = 200000, h = (end - start) / steps;
  for (let i = 0; i < steps; i++) {
    const cycles = (start + (i + 0.5) * h - phi) / period;
    if (cycles - Math.floor(cycles) < duty) midpoint += h / duty;
  }
  close(pwmOnTime(start, end, period, duty, phi) / duty, midpoint, 3e-4);
});

test('zero scan makes rows identical but does not force the time mean', () => {
  const m = lightTiming({ scanMs: 0 });
  m.rows.forEach((r) => close(r.ratio, 4));
  const shifted = lightTiming({ scanMs: 0, phase: 50 });
  shifted.rows.forEach((r) => close(r.ratio, 0));
  const a = lightTiming({ phase: 0 }), b = lightTiming({ phase: 100 });
  a.rows.forEach((r, i) => close(r.light, b.rows[i].light));
});

test('full-frame common window and finite flash placement include the equality boundary', () => {
  assert.deepEqual(commonWindow(8, 12), { start: 8, end: 12, duration: 4 });
  assert.equal(commonWindow(8, 2).duration, 0);
  assert.equal(commonWindow(8, 8).duration, 0);
  const inside = lightTiming({ source: 1, exposureMs: 12 });
  assert.equal(inside.allFlashCaptured, true);
  inside.rows.forEach((r) => { close(r.light, FLASH_DOSE); close(r.total, 10.4); });
  for (const flashStartMs of [8, 11])
    assert.equal(lightTiming({ source: 1, exposureMs: 12, flashStartMs }).allFlashCaptured, true);
  for (const flashStartMs of [7.75, 11.5])
    assert.equal(lightTiming({ source: 1, exposureMs: 12, flashStartMs }).allFlashCaptured, false);
  assert.equal(lightTiming({ source: 1, exposureMs: 8 }).allFlashCaptured, false);
});

test('a partially clipped flash, no-overlap flash and scan=0 have exact independent doses', () => {
  const p = { source: 1, exposureMs: 12, flashStartMs: 11.5 };
  close(rowDose(0, p).light, 4);
  close(rowDose(0, p).total, 6.4);
  close(rowDose(1, p).total, 10.4);
  for (const flashStartMs of [-5, 25])
    lightTiming({ ...p, flashStartMs }).rows.forEach((r) => close(r.light, 0));
  const noScan = lightTiming({ ...p, scanMs: 0 });
  noScan.rows.forEach((r) => close(r.total, 6.4));
  close(overlap(0, 2, 2, 3), 0);
  close(overlap(0, 2, -1, 0), 0);
  close(overlap(0, 2, 1, 3), 1);
  assert(lightTiming(p).referenceError < 1e-12);
});

test('single-flash energy stays fixed while ambient follows exposure duration', () => {
  for (const flashDurationMs of [0.1, 0.5, 1, 3.5])
    close(rowDose(0, { source: 1, exposureMs: 20, flashDurationMs }).light, 8);
  close(rowDose(0, { source: 1, exposureMs: 20 }).ambient, 4);
  close(rowDose(0, { source: 1, exposureMs: 12 }).ambient, 2.4);
  close(rowDose(0, { source: 1, exposureMs: 2 }).ambient, 0.4);
});

test('presets retain the stated one-factor comparisons and all model outputs are finite', () => {
  const base = spec.presets[0].values;
  for (const [index, changed] of [[1, 'duty'], [2, 'exposureMs'], [3, 'scanMs']]) {
    const p = spec.presets[index].values;
    assert.deepEqual(Object.keys(p).filter((key) => p[key] !== base[key]), [changed]);
  }
  const f = spec.presets[4].values;
  for (const [index, changed] of [[5, 'flashStartMs'], [6, 'exposureMs']]) {
    const p = spec.presets[index].values;
    assert.deepEqual(Object.keys(p).filter((key) => p[key] !== f[key]), [changed]);
  }
  for (const preset of spec.presets) {
    const m = lightTiming(preset.values), result = spec.evaluate(preset.values);
    assert(m.rows.every((r) => Object.values(r).every(Number.isFinite)));
    assert(m.referenceError < 1e-10);
    assert(!result.figure.includes('NaN'));
  }
});

test('irrelevant controls disable by source; generated fallback contains actual default values', () => {
  const defaults = Object.fromEntries(spec.controls.map((c) => [c.key, c.value]));
  assert.deepEqual(defaults, parameters());
  for (const c of spec.controls.filter((c) => c.enabled)) {
    const isPwm = ['frequency', 'duty', 'phase'].includes(c.key);
    assert.equal(c.enabled(defaults), isPwm);
    assert.equal(c.enabled({ ...defaults, source: 1 }), !isPwm);
  }
  const svg = fallback(spec);
  assert(svg.includes('4.000'));
  assert(svg.includes('共同窗口长度为零'));
  assert(svg.includes('行位置 / %'));
  assert(!/NaN|Infinity|undefined/.test(svg));
});

test('invalid periods, exposure lengths and source modes fail explicitly', () => {
  assert.throws(() => parameters({ source: 2 }));
  assert.throws(() => parameters({ exposureMs: 0 }));
  assert.throws(() => rowDose(-0.1));
  assert.throws(() => pwmOnTime(0, 1, 0, 0.5));
  assert.throws(() => pwmOnTime(0, 1, 2, 0));
  assert.throws(() => overlap(1, 0, 0, 1));
});
