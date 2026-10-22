import test from "node:test";
import assert from "node:assert/strict";
import {
  captureScene,
  pixel,
  parameters,
  sceneEV,
  WIDTH,
  HEIGHT,
  probePixel,
} from "./model.js";
import { sceneSample } from "./scene.js";
import { grayPng } from "./raster.js";
import { inflateSync } from "node:zlib";
import { pipeline } from "../ei-monitor/model.js";
import { spec } from "./lesson.js";
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("EI-neutral controls disable at unity gain and re-enable for either EI direction", () => {
  for (const key of ["metered", "record"]) {
    const control = spec.controls.find((c) => c.key === key);
    assert.equal(control.enabled({ eiStops: 0 }), false);
    assert.deepEqual(pixel({ [key]: 0 }, 1), pixel({ [key]: 1 }, 1));
    for (const eiStops of [-1, 1]) {
      assert.equal(control.enabled({ eiStops }), true);
      const a = pixel({ eiStops, [key]: 0 }, 1);
      const b = pixel({ eiStops, [key]: 1 }, 1);
      assert.notEqual(a[key === "metered" ? "mu" : "logCode"],
        b[key === "metered" ? "mu" : "logCode"]);
    }
  }
});
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
  const [x, y] = probePixel(34, 12);
  assert.equal(sceneEV(x, y), 4.7);
  near(a.records[y * WIDTH + x].mu, 1000 * 2 ** 4.7);
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

test("the still life has explicit highlight and shadow inputs with the intended clipping behavior", () => {
  const sky = sceneSample(0.65, 0.2),
    leaf = sceneSample(0.714, 0.254);
  assert.equal(sky, 4.7);
  assert.equal(leaf, 4.2);
  const a = pixel({}, sky),
    b = pixel({}, leaf);
  assert.equal(a.sensorClipped, false);
  assert.equal(b.sensorClipped, false);
  assert.equal(a.displayLinear, 1);
  assert.equal(b.displayLinear, 1);
  assert.notEqual(a.lowerLinear, b.lowerLinear);
  assert.equal(
    pixel({ eiStops: 3, record: 1 }, sky).logCode,
    pixel({ eiStops: 3, record: 1 }, leaf).logCode,
  );
  const highlight = sceneSample(0.824, 0.758),
    cloth = sceneSample(0.2, 0.9);
  assert.ok(highlight >= 6.3 && highlight <= 6.5);
  assert.equal(pixel({}, highlight).sensorClipped, true);
  assert.ok(cloth >= -3.5 && cloth <= -2.5);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const ev = sceneEV(x, y);
      assert.ok(Number.isFinite(ev) && ev >= -3.5 && ev <= 6.5);
    }
});

test("saved probe positions map to unique fine-grid samples at their original relative location", () => {
  const seen = new Set();
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 48; x++) {
      const [px, py] = probePixel(x, y);
      assert.ok(px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT);
      assert.ok(
        Math.abs((px + 0.5) / WIDTH - (x + 0.5) / 48) <= 0.5 / WIDTH + 1e-14,
      );
      assert.ok(
        Math.abs((py + 0.5) / HEIGHT - (y + 0.5) / 32) <= 0.5 / HEIGHT + 1e-14,
      );
      seen.add(py * WIDTH + px);
    }
  assert.equal(seen.size, 48 * 32);
  for (const point of [
    [48, 0],
    [0, 32],
    [0.5, 4],
    [-1, 0],
  ])
    assert.throws(() => probePixel(...point));
});

function decodedPng(bytes) {
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    compressed = [];
  let width, height;
  for (let i = 8; i < bytes.length;) {
    const n = data.getUint32(i),
      type = String.fromCharCode(...bytes.subarray(i + 4, i + 8)),
      block = bytes.subarray(i + 8, i + 8 + n);
    if (type === "IHDR") {
      width = data.getUint32(i + 8);
      height = data.getUint32(i + 12);
      assert.deepEqual([...block.subarray(8)], [8, 0, 0, 0, 0]);
    }
    if (type === "IDAT") compressed.push(block);
    i += n + 12;
  }
  const rows = inflateSync(Buffer.concat(compressed));
  assert.equal(rows.length, (width + 1) * height);
  const pixels = [];
  for (let y = 0; y < height; y++) {
    assert.equal(rows[y * (width + 1)], 0);
    pixels.push(...rows.subarray(y * (width + 1) + 1, (y + 1) * (width + 1)));
  }
  return { width, height, pixels };
}

test("lossless scene raster keeps dimensions, display gamma, clamping and every sample", () => {
  const values = [-1, 0, 0.18, 0.5, 1, 2];
  assert.deepEqual(
    decodedPng(grayPng(values, 3, 2)).pixels,
    [0, 0, 117, 186, 255, 255],
  );
  assert.deepEqual(
    decodedPng(grayPng(values, 3, 2, 1)).pixels,
    [0, 0, 46, 128, 255, 255],
  );
  // Larger than one DEFLATE block; decoding uses Node's independent zlib reader.
  const image = Float64Array.from(
    { length: 360 * 192 },
    (_, i) => (i % 256) / 255,
  );
  const decoded = decodedPng(grayPng(image, 360, 192, 1));
  assert.equal(decoded.width, 360);
  assert.equal(decoded.height, 192);
  assert.deepEqual(
    decoded.pixels,
    Array.from(image, (v) => Math.round(v * 255)),
  );
  for (const args of [
    [[], 1, 1],
    [[1], 0, 1],
    [[1], 1, 1, 0],
  ])
    assert.throws(() => grayPng(...args));
});
