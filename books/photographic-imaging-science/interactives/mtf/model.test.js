import test from "node:test";
import assert from "node:assert/strict";
import { transfer, diffractionMtf } from "./model.js";
test("circular pupil anchors and f8/6um Nyquist example retain physical units", () => {
  assert.equal(diffractionMtf(0), 1);
  assert.equal(diffractionMtf(1), 0);
  assert.equal(diffractionMtf(2), 0);
  const m = transfer({ frequency: 1000 / 12 });
  assert.ok(Math.abs(m.pixel - 2 / Math.PI) < 1e-12);
  assert.ok(Math.abs(m.airyDiameterUm - 10.736) < 1e-10);
  assert.ok(m.system > 0.34 && m.system < 0.36);
  assert.equal(transfer({ frequency: 0 }).system, 1);
});
test("closing an ideal aperture lowers cutoff; signed pixel transfer survives phase reversal", () => {
  assert.ok(transfer({ fNumber: 16 }).system < transfer({ fNumber: 4 }).system);
  const m = transfer({ fNumber: 4, pixelUm: 8, frequency: 200 });
  assert.ok(m.systemOtf < 0);
  assert.equal(m.system, Math.abs(m.systemOtf));
  assert.throws(() => transfer({ pixelUm: 0 }), RangeError);
});
