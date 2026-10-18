import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDng, inspectDng, samples, black, white } from "./model.js";
test("actual TIFF byte stream decodes every generated sample and calibration tag", () => {
  const bytes = createDng(),
    m = inspectDng(bytes);
  assert.deepEqual(m.decoded, samples);
  assert.equal(m.mismatches, 0);
  assert.equal(m.black, black);
  assert.equal(m.white, white);
  assert.deepEqual(m.cfa, [0, 1, 1, 2]);
  assert(m.normalized[0] < 0);
  assert.equal(m.normalized[1], 0);
  assert.equal(m.normalized[2], 1);
});
test("wrong byte interpretation changes codes while wrong black affects only normalization", () => {
  const bytes = createDng(),
    wrong = inspectDng(bytes, { wrongEndian: true }),
    offset = inspectDng(bytes, { blackOverride: 0 });
  assert(wrong.mismatches > 900);
  assert.equal(offset.mismatches, 0);
  assert(offset.normalized[1] > 0);
});
test("restricted parser rejects truncated samples and unsupported compressed layout", () => {
  const b = createDng();
  assert.throws(() => inspectDng(b.slice(0, -1)));
  const m = inspectDng(b),
    tag = m.tags.find((t) => t.tag === 259);
  new DataView(b.buffer).setUint16(tag.start, 7, true);
  assert.throws(() => inspectDng(b));
});
test("downloadable fixture is deterministic and byte identical to the inspected fixture", async () => {
  assert.deepEqual(
    new Uint8Array(await readFile(new URL("./sample.dng", import.meta.url))),
    createDng(),
  );
});
