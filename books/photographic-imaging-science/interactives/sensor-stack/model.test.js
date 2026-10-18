import test from "node:test";
import assert from "node:assert/strict";
import {
  CONFIGURATIONS,
  crossSection,
  inspectStructure,
  STRUCTURE_TRUTH,
  parameters,
  routePoint,
} from "./model.js";
test("all three layouts agree with independent illumination and functional-wafer reference contracts", () => {
  for (const c of CONFIGURATIONS)
    for (const separation of [0, 35, 100])
      for (const progress of [0, 20, 40, 60, 85, 100]) {
        const m = crossSection({ ...c, separation, progress });
        assert.deepEqual(inspectStructure(m), STRUCTURE_TRUTH[c.id]);
        for (let i = 1; i < m.layers.length; i++)
          assert.ok(m.layers[i].y > m.layers[i - 1].bottom);
      }
});
test("back illumination and stacking are independent axes, including the fourth combination", () => {
  const m = crossSection({ illumination: "fsi", stacked: true }),
    r = inspectStructure(m);
  assert.equal(r.metalBeforeSilicon, true);
  assert.equal(r.independentLogic, true);
  assert.equal(r.reachesLogic, true);
  assert.equal(r.functionalWafers, 2);
});
test("structural reference detects an inverted layer or a disconnected logic route", () => {
  const m = crossSection({ illumination: "bsi", stacked: true });
  const broken = structuredClone(m),
    metal = broken.layers.find((l) => l.kind === "metal");
  metal.y = 15;
  metal.bottom = 45;
  assert.notDeepEqual(inspectStructure(broken), STRUCTURE_TRUTH.stacked);
  const disconnected = structuredClone(m);
  disconnected.signalRoute = disconnected.signalRoute.slice(0, 3);
  assert.equal(inspectStructure(disconnected).reachesLogic, false);
});
test("photon path ends in silicon; electronic path has independent phase and endpoint", () => {
  for (const c of CONFIGURATIONS) {
    const m = crossSection(c);
    assert.deepEqual(routePoint(m.photonRoute, 1), [m.diode.x, m.diode.y]);
    assert.deepEqual(routePoint(m.signalRoute, 0), [m.diode.x, m.diode.y]);
    assert.deepEqual(routePoint(m.signalRoute, 1), m.signalRoute.at(-1));
    for (let n = 0; n <= 100; n++)
      assert.ok(routePoint(m.signalRoute, n / 100).every(Number.isFinite));
  }
  assert.equal(crossSection({ progress: 20 }).phase, "light");
  assert.equal(crossSection({ progress: 50 }).phase, "charge");
  assert.equal(crossSection({ progress: 70 }).phase, "pixel");
  assert.equal(crossSection({ progress: 100 }).phase, "output");
});
test("structural display rejects nonfinite progress and unknown illumination labels", () => {
  for (const p of [{ separation: -1 }, { progress: 101 }, { progress: NaN }])
    assert.throws(() => parameters(p));
  assert.throws(() => crossSection({ illumination: "unknown" }));
  assert.throws(() => crossSection({ stacked: "yes" }));
});
