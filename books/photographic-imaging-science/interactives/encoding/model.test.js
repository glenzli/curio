import test from "node:test";
import assert from "node:assert/strict";
import { encode, decode, quantize, stopSpan, TOE } from "./model.js";
const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("all curves preserve endpoints and round trip their monotone input", () => {
  for (const curve of ["linear", "gamma", "log"]) {
    near(encode(0, curve), 0); near(encode(1, curve), 1);
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const x = i / 1000, encoded = encode(x, curve);
      assert.ok(encoded > previous);
      near(decode(encoded, curve), x);
      previous = encoded;
    }
    for (let ev = -24; ev <= 0; ev++) near(decode(encode(2 ** ev, curve), curve), 2 ** ev);
  }
});

test("the Log toe is continuous in value and first derivative", () => {
  const h = TOE * 1e-6;
  const left = (encode(TOE, "log") - encode(TOE - h, "log")) / h;
  const right = (encode(TOE + h, "log") - encode(TOE, "log")) / h;
  assert.ok(Math.abs(left - right) / left < 1e-6);
  near(decode(encode(TOE, "log"), "log"), TOE);
});

test("encoding cannot recover pre-encoding clipping at any bit depth", () => {
  for (const bits of [8, 10, 12]) for (const curve of ["linear", "gamma", "log"]) {
    assert.deepEqual(quantize(1.2, curve, bits), quantize(8, curve, bits));
    near(quantize(8, curve, bits).estimate, 1);
    assert.equal(quantize(-0.2, curve, bits).code, 0);
  }
});

test("code spans are fractional widths, and their sum telescopes across stops", () => {
  for (const curve of ["linear", "gamma", "log"]) {
    let total = 0;
    for (let ev = -12; ev < 0; ev++) total += stopSpan(ev, curve, 10);
    near(total, 1023 * (1 - encode(2 ** -12, curve)));
  }
  assert.ok(stopSpan(-10, "log", 10) > stopSpan(-10, "linear", 10) * 50);
});

test("higher bit depth bounds the error more tightly in the encoded domain", () => {
  for (const bits of [8, 10, 12]) for (const curve of ["linear", "gamma", "log"]) {
    for (let i = 0; i < 200; i++) {
      const x = (i + 0.37) / 200, { estimate } = quantize(x, curve, bits);
      assert.ok(Math.abs(encode(estimate, curve) - encode(x, curve)) <= 0.5 / (2 ** bits - 1) + 1e-12);
    }
  }
});
