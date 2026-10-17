import test from "node:test";
import assert from "node:assert/strict";
import {
  pack12,
  unpack12,
  bitStringTruth,
  packingDemo,
  normalize,
  payloadRate,
} from "./model.js";
test("raw packing reproduces the worked example and exercise", () => {
  assert.deepEqual(pack12(0xabc, 0x123), [0xbc, 0x3a, 0x12]);
  assert.deepEqual(unpack12([0x45, 0xa7, 0x3c]), [0x745, 0x3ca]);
});
test("raw every possible individual sample survives all nibble boundary partners", () => {
  for (let a = 0; a < 4096; a++)
    for (const b of [0, 1, 15, 16, 255, 256, 4095]) {
      assert.deepEqual(unpack12(pack12(a, b)), [a, b]);
      assert.deepEqual(unpack12(pack12(b, a)), [b, a]);
      assert.deepEqual(pack12(a, b), bitStringTruth(a, b));
    }
});
test("raw low-bit loss happens before a perfectly reversible byte packing", () => {
  for (const dropBits of [1, 2, 4, 8])
    for (const a of [0, 1, 15, 16, 255, 2748, 4095]) {
      const m = packingDemo({ a, dropBits });
      assert.deepEqual(unpack12(m.packed), m.stored);
      assert.ok(m.loss[0] <= 0 && m.loss[0] > -(2 ** dropBits));
      assert.equal(m.packed.length, 3);
    }
  assert.equal(packingDemo().roundTrip, true);
  assert.equal(packingDemo({ dropBits: 4 }).roundTrip, false);
});
test("raw the wrong nibble convention corrupts a valid byte stream", () => {
  const m = packingDemo({ swappedNibbles: true });
  assert.deepEqual(m.decoded, [0x3bc, 0x12a]);
  assert.deepEqual(m.packed, [0xbc, 0x3a, 0x12]);
  assert.equal(m.roundTrip, false);
});
test("raw linear normalization retains negatives and uses the declared black and white", () => {
  assert.ok(Math.abs(normalize(5000, 512, 15360) - 4488 / 14848) < 1e-15);
  assert.equal(normalize(100, 128, 3840), -28 / 3712);
  assert.equal(normalize(3840, 128, 3840), 1);
  assert.ok(normalize(4095, 128, 3840) > 1);
});
test("raw sample payload independently matches pixel and byte counts", () => {
  const r = payloadRate();
  assert.equal(r.bytesPerFrame, (4096 * 2160 * 3) / 2);
  assert.equal(r.bitsPerSecond, 2548039680);
  assert.equal(r.bytesPerSecond, 318504960);
  assert.equal(r.tenMinuteGB, 191.102976);
  assert.equal(
    payloadRate({ width: 1, height: 1, bits: 12, fps: 1 }).bytesPerFrame,
    2,
  );
  assert.equal(
    payloadRate({ width: 3840, height: 2160, bits: 12, fps: 60 }).bitsPerSecond,
    5971968000,
  );
});
test("raw invalid samples, bytes and calibration are rejected before decoding", () => {
  for (const v of [-1, 0.5, 4096, NaN])
    assert.throws(() => pack12(v, 0), RangeError);
  for (const v of [
    [1, 2],
    [1, 2, 300],
    [1, 2, NaN],
  ])
    assert.throws(() => unpack12(v), RangeError);
  assert.throws(() => normalize(1, 2, 2), RangeError);
  assert.throws(() => payloadRate({ fps: 0 }), RangeError);
  assert.throws(() => packingDemo({ dropBits: 1.5 }), RangeError);
});
