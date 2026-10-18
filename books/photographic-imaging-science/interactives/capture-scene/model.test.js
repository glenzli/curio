import test from "node:test";
import assert from "node:assert/strict";
import {
  captureScene,
  pixel,
  parameters,
  sceneEV,
  WIDTH,
  HEIGHT,
} from "./model.js";
import { pipeline } from "../ei-monitor/model.js";
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("capture scene pixel follows the existing RAW and teaching Log chain", () => {
  for (const metered of [0, 1])
    for (const record of [0, 1])
      for (const ev of [-4, 0, 4.2, 6.5]) {
        const r = pixel({ eiStops: 2, metered, record }, ev),
          t = pipeline(
            {
              eiStops: 2,
              policy: metered ? "metered" : "fixed",
              recording: record ? "ei-gain" : "fixed",
              bits: 10,
            },
            ev,
          );
        for (const k of [
          "mu",
          "rawCode",
          "logCode",
          "decoded",
          "monitorLinear",
        ])
          near(r[k], t[k]);
      }
});
test("capture scene monitor changes cannot alter captured or recorded values", () => {
  const a = captureScene({ monitor: 2 }),
    b = captureScene({ monitor: -4, mapping: 1 });
  assert.deepEqual([...a.raw], [...b.raw]);
  assert.deepEqual([...a.file], [...b.file]);
  assert.notDeepEqual([...a.monitor], [...b.monitor]);
});
test("capture scene only-display clipping differs from irreversible recording clipping", () => {
  const a = pixel({ eiStops: 3, record: 0 }, 1),
    b = pixel({ eiStops: 3, record: 0 }, 2);
  assert.equal(a.displayLinear, 1);
  assert.equal(b.displayLinear, 1);
  assert.notEqual(a.rawCode, b.rawCode);
  assert.notEqual(a.logCode, b.logCode);
  assert.notEqual(a.lowerLinear, b.lowerLinear);
  const c = pixel({ eiStops: 3, record: 1, monitor: -2 }, 3),
    d = pixel({ eiStops: 3, record: 1, monitor: -2 }, 4);
  assert.equal(c.logCode, d.logCode);
  assert.equal(c.lowerLinear, d.lowerLinear);
  assert.notEqual(c.rawCode, d.rawCode);
  assert.notEqual(c.truthLowerLinear, d.truthLowerLinear);
});
test("capture scene physical saturation remains merged under every monitoring exposure", () => {
  for (const monitor of [-4, -2, 0, 2])
    for (const mapping of [0, 1]) {
      const a = pixel({ monitor, mapping }, 6),
        b = pixel({ monitor, mapping }, 7);
      assert.equal(a.rawCode, 16383);
      assert.equal(a.logCode, b.logCode);
      near(a.lowerLinear, b.lowerLinear);
    }
});
test("capture scene metered EI changes the physical exposure rather than just its label", () => {
  near(pixel({ eiStops: 2, metered: 1 }, 0).mu, 250);
  near(pixel({ eiStops: 2, metered: 0 }, 0).mu, 1000);
  const m = captureScene({ eiStops: 2, metered: 1, record: 1 });
  near(m.sensorThresholdEV, 7);
  near(m.fileThresholdEV, 5);
});
test("capture scene spatial truth, counts and step replay are deterministic", () => {
  const a = captureScene({ progress: 0 }),
    b = captureScene({ progress: 4 });
  assert.deepEqual(a.counts, b.counts);
  assert.deepEqual([...a.monitor], [...b.monitor]);
  assert.equal(a.records.length, WIDTH * HEIGHT);
  assert.ok(a.counts.sensorClipped > 0);
  assert.ok(a.monitor.every((v) => v >= 0 && v <= 1));
  assert.equal(sceneEV(34, 12), 4.7);
  near(a.records[12 * WIDTH + 34].mu, 1000 * 2 ** 4.7);
});
test("capture scene preserves uncut truth separately and rejects invalid parameters", () => {
  const r = pixel({ eiStops: 3, record: 1, monitor: -3, mapping: 1 }, 7);
  assert.ok(r.truthLowerLinear > r.lowerLinear);
  for (const p of [
    { bits: 7 },
    { bits: 9.5 },
    { metered: 2 },
    { record: NaN },
    { monitor: 8 },
    { probeY: 32 },
  ])
    assert.throws(() => parameters(p));
  assert.throws(() => sceneEV(-1, 0));
});
