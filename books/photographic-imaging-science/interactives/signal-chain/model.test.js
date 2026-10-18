import test from "node:test";
import assert from "node:assert/strict";
import { signalChain } from "./model.js";
test("SI area, photon energy and chapter-one numerical example", () => {
  const m = signalChain();
  assert.equal(m.energy, 1.6e-15);
  assert(Math.abs(m.photons - 4430.02218) < 0.001);
  assert(Math.abs(m.electrons - 0.7 * m.photons) < 1e-12);
});
test("gain changes downstream representation while exposure changes collected signal", () => {
  const a = signalChain(),
    b = signalChain({ gain: 2 }),
    c = signalChain({ exposure: -3 });
  assert.equal(a.electrons, b.electrons);
  assert(Math.abs(c.electrons / (10 * a.electrons) - 1) < 1e-14);
  assert(b.code > a.code);
  assert.equal(signalChain({ qe: 0 }).code, 0);
});
test("capture and ADC clipping are separate stages", () => {
  const a = signalChain({ gain: 100 });
  assert(a.captured < 32000);
  assert.equal(a.code, 16383);
  const b = signalChain({ exposure: -1 });
  assert.equal(b.captured, 32000);
});
