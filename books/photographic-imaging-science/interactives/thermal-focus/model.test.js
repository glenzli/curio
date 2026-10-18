import test from "node:test";
import assert from "node:assert/strict";
import { thermalFocus, secondarySpectrum } from "./model.js";
test("chapter thermal example separates free lens from the moving sensor plane", () => {
  const m = thermalFocus({ barrelExpansion: 0 });
  assert(Math.abs((m.exact - 100) * 1000 - 8) < 0.001);
  assert(Math.abs(m.linear - 8) < 1e-12);
  assert(thermalFocus().residual < 0);
});
test("first-order thermal slope matches a central difference of the exact finite model", () => {
  for (const dn of [-4, 0, 4]) {
    const p = { dn },
      a = thermalFocus({ ...p, temperature: 0.001 }),
      b = thermalFocus({ ...p, temperature: -0.001 });
    assert(Math.abs((a.residual - b.residual) / 0.002 - a.slope) < 1e-7);
  }
  assert.equal(thermalFocus({ temperature: 0 }).residual, 0);
});
test("expansion-only matching cancels exactly; index term is separate", () => {
  assert(
    Math.abs(thermalFocus({ dn: 0, barrelExpansion: 8 }).residual) < 1e-10,
  );
  assert.throws(() => thermalFocus({ index: 1 }));
});
test("existing catalogue partial dispersion independently predicts residual power", () => {
  const m = secondarySpectrum();
  assert(Math.abs(m.primary) < 1e-14);
  assert(Math.abs(m.secondary - m.direct) < 1e-17);
  assert.notEqual(m.a, m.b);
});
