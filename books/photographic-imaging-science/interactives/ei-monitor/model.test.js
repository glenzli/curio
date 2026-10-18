import test from "node:test";
import assert from "node:assert/strict";
import {
  parameters,
  pipeline,
  allocationTruth,
  eiBudget,
  FULL_WELL,
} from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
test("EI metadata alone leaves collected electrons, RAW and fixed-recording codes unchanged", () => {
  const a = eiBudget({ eiStops: 0 }),
    b = eiBudget({ eiStops: 1 });
  near(a.gray.mu, b.gray.mu);
  assert.equal(a.gray.rawCode, b.gray.rawCode);
  assert.equal(a.gray.logCode, b.gray.logCode);
  near(b.gray.monitorLinear, 2 * a.gray.monitorLinear);
  near(a.gray.snr, b.gray.snr);
  near(a.headroom, b.headroom);
});
test("metered exposure decreases with higher EI while analog middle-gray monitor stays fixed", () => {
  const a = eiBudget(),
    b = eiBudget({ eiStops: 1, policy: "metered" });
  near(b.gray.mu, 500);
  near(b.truth.grayIdealMonitor, 0.18);
  near(b.headroom, a.headroom + 1);
  near(b.shadow, a.shadow - 1);
  assert.ok(b.gray.snr < a.gray.snr);
  near(b.truth.graySnr, 500 / Math.sqrt(516));
});
test("physical headroom plus shadow allocation is invariant and agrees with independent stop arithmetic", () => {
  for (const policy of ["fixed", "metered"])
    for (const recording of ["fixed", "ei-gain"])
      for (const eiStops of [-2, 0, 3])
        for (const exposure of [-2, 2]) {
          const m = eiBudget({ policy, recording, eiStops, exposure }),
            t = allocationTruth(m);
          near(m.gray.mu, t.gray);
          near(m.headroom, t.physicalHeadroom);
          near(m.shadow, t.shadow);
          near(m.headroom + m.shadow, t.total);
          near(m.fileHeadroom, t.fileHeadroom);
          near(m.fileLimit, t.fileLimit);
        }
});
test("encoding-side EI gain lowers nominal file limit without changing sensor saturation or capacity", () => {
  const a = eiBudget({ eiStops: 3, recording: "fixed" }),
    b = eiBudget({ eiStops: 3, recording: "ei-gain", probe: 3 });
  near(b.fileLimit, 4000);
  near(b.gray.mu, a.gray.mu);
  near(b.headroom, a.headroom);
  near(b.fileHeadroom, a.headroom - 3);
  assert.equal(b.probeResult.sensorClipped, false);
  assert.equal(b.probeResult.recordClipped, true);
  assert.equal(
    pipeline({ eiStops: 3, recording: "fixed", probe: 3 }).recordClipped,
    false,
  );
});
test("monitor white, file white and sensor white are distinct; clipped sensor signals remain indistinguishable", () => {
  const m = pipeline({ probe: 4 });
  assert.equal(m.sensorClipped, false);
  assert.equal(m.recordClipped, false);
  assert.equal(m.monitorClipped, true);
  const a = pipeline({ probe: 6 }),
    b = pipeline({ probe: 7 });
  assert.equal(a.logCode, b.logCode);
  assert.equal(a.snr, null);
  near(a.captured, FULL_WELL);
});
test("quantized log reconstruction stays inside its independently inverted half-code bounds", () => {
  for (const bits of [8, 10, 12])
    for (const eiStops of [-2, 0, 3])
      for (const recording of ["fixed", "ei-gain"])
        for (const probe of [-6, 0, 4, 8]) {
          const r = pipeline({ bits, eiStops, recording, probe }),
            x = Math.min(r.recordInput, 1);
          assert.ok(x >= r.codeBin[0] - 1e-12 && x <= r.codeBin[1] + 1e-12);
          assert.ok(r.display >= 0 && r.display <= 1);
          assert.ok(
            Math.abs(r.logCode / (2 ** bits - 1) - r.logValue) <=
              0.5 / (2 ** bits - 1) + 1e-12,
          );
        }
});
test("replay changes only stage highlighting, zero-gain-EV is baseline and unsupported controls fail", () => {
  assert.deepEqual(pipeline({ progress: 0 }), pipeline({ progress: 100 }));
  near(allocationTruth().physicalHeadroom, 5);
  for (const p of [
    { bits: 12.5 },
    { eiStops: 4 },
    { exposure: NaN },
    { progress: -1 },
  ])
    assert.throws(() => parameters(p));
});

test("a finite Log interval can round to file white before its continuous input is clipped", () => {
  const r = pipeline({ bits: 8, probe: Math.log2(31.9) });
  assert.equal(r.sensorClipped, false);
  assert.equal(r.recordClipped, false);
  assert.equal(r.fileWhite, true);
  assert.equal(r.logCode, 255);
  assert.ok(r.recordInput < 1);
});
