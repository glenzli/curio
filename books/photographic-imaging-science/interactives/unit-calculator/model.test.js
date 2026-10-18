import test from "node:test";
import assert from "node:assert/strict";
import { scales } from "./model.js";
test("nm, micrometres and lp/mm use explicit conversions", () => {
  const m = scales({ pixel: 6 });
  assert(Math.abs(m.nyquist - 83.3333333333) < 1e-8);
  assert(Math.abs(m.cutoff - 227.27272727) < 1e-7);
  assert.equal(m.airy, 10.736);
});
test("unit changes preserve independent dimensionless ratio", () => {
  const m = scales();
  assert(Math.abs(m.ratio - (2 * 4) / (0.55 * 8)) < 1e-12);
  assert(scales({ pixel: 8 }).signal.photons === 4 * m.signal.photons);
  assert.equal(scales({ capacity: 1 }).noise.stops, null);
});
