import test from "node:test";
import assert from "node:assert/strict";
import { adc, compare, inputNoise, FULL_WELL, ADC_SPAN, UPSTREAM_NOISE } from "./model.js";

test("one more bit halves the electron step without moving voltage saturation", () => {
  for (const gain of [1, 2, 8, 16]) {
    assert.equal(adc(100, 12, gain).step / adc(100, 13, gain).step, 2);
    assert.equal(adc(100, 12, gain).limit, adc(100, 13, gain).limit);
  }
});

test("full well and ADC clipping are independent boundaries", () => {
  assert.equal(adc(50000, 14, 1).fullWellClipped, true);
  assert.equal(adc(50000, 14, 1).adcClipped, false);
  assert.equal(adc(20000, 14, 4).fullWellClipped, false);
  assert.equal(adc(20000, 14, 4).adcClipped, true);
  assert.equal(adc(100, 14, 1).limit, FULL_WELL);
  assert.equal(adc(100, 14, 4).limit, ADC_SPAN / 4);
});

test("mid-rise reconstruction stays within half a step before saturation", () => {
  for (const bits of [8, 10, 14]) for (const gain of [1, 4, 16]) {
    const { limit, step } = adc(0, bits, gain);
    for (let i = 0; i < 300; i++) {
      const x = (i / 300) * limit;
      assert.ok(Math.abs(adc(x, bits, gain).estimate - x) <= step / 2 + 1e-9);
    }
  }
});

test("analog gain suppresses only downstream input-referred terms", () => {
  assert.ok(inputNoise(14, 4) < inputNoise(14, 1));
  assert.ok(Math.abs(inputNoise(14, 1e8) - UPSTREAM_NOISE) < 1e-10);
  const a = compare(123.4, 10, 1), b = compare(123.4, 10, 8);
  assert.equal(a.digital.estimate, b.digital.estimate);
  assert.equal(a.digitalNoise, b.digitalNoise);
  assert.equal(b.digital.output, 8 * a.digital.output);
  assert.ok(b.analog.limit < a.analog.limit);
});

test("digital multiplication retains an already merged code interval", () => {
  const a = compare(80, 8, 16), b = compare(120, 8, 16);
  assert.equal(a.digital.output, b.digital.output);
  assert.notEqual(a.analog.code, b.analog.code);
});
