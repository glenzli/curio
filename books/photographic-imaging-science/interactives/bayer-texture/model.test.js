import test from "node:test";
import assert from "node:assert/strict";
import {
  modes,
  valueAt,
  aliasAt,
  bayerTexture,
  parameters,
  SIZE,
} from "./model.js";
import { CHANNELS, channelAt } from "../bayer/model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("multi-frequency truth equals independent two-dimensional pixel-area integration after optical filtering", () => {
  const width = 0.85,
    terms = modes({ scale: 2.5, angle: 37, shift: 1.13, width, blur: 0.3 }),
    n = 400;
  for (const [x, y] of [
    [0, 0],
    [3.7, -2.3],
  ]) {
    let sum = 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++)
        sum += valueAt(
          terms,
          x + width * ((i + 0.5) / n - 0.5),
          y + width * ((j + 0.5) / n - 0.5),
          "optical",
        );
    near(sum / n ** 2, valueAt(terms, x, y), 2e-7);
  }
  const point = modes({ width: 0 });
  for (const m of point) near(m.pixelGain, 1);
});
test("translation changes phases only, rotation preserves frequency lengths and low-pass leaves sampling geometry fixed", () => {
  const a = modes({ scale: 2, width: 0.7 }),
    b = modes({ scale: 2, width: 0.7, shift: 1.3 }),
    c = modes({ scale: 2, width: 0.7, angle: 90 }),
    d = modes({ scale: 2, width: 0.7, blur: 0.8 });
  near(valueAt(b, 4.2, 3.1), valueAt(a, 4.2 - 1.3, 3.1));
  a.forEach((m, i) => {
    near(c[i].fx, -m.fy);
    near(c[i].fy, m.fx);
    near(Math.hypot(c[i].fx, c[i].fy), Math.hypot(m.fx, m.fy));
    near(
      d[i].opticalGain,
      Math.exp(-2 * Math.PI ** 2 * 0.8 ** 2 * (m.fx ** 2 + m.fy ** 2)),
    );
    assert.ok(d[i].gain < m.gain);
    for (const ch of CHANNELS) {
      near(d[i].aliases[ch].fx, m.aliases[ch].fx);
      near(d[i].aliases[ch].fy, m.aliases[ch].fy);
    }
  });
});
test("componentwise aliases retain every actual R, G and B observation over rotation, translation and finite integration", () => {
  for (const scale of [0.5, 1.6, 3])
    for (const angle of [0, 17, 45, 90])
      for (const shift of [0, 0.75, 2]) {
        const terms = modes({ scale, angle, shift, width: 0.8, blur: 0.1 });
        for (let y = -4; y < 5; y++)
          for (let x = -4; x < 5; x++)
            near(
              valueAt(terms, x, y),
              aliasAt(terms, channelAt(x, y), x, y),
              2e-14,
            );
      }
  const m = bayerTexture();
  assert.ok(m.sampleDifference < 1e-13);
  assert.ok(m.aliasRmse > 0.1);
});
test("known low-frequency patterns have a unique chosen baseband witness but nonzero bilinear filtering error", () => {
  const m = bayerTexture({ scale: 0.5 });
  assert.ok(
    m.terms.every((t) =>
      CHANNELS.every((c) => t.aliases[c].location === "inside"),
    ),
  );
  near(m.aliasRmse, 0);
  assert.ok(m.rmse > 0.01);
  assert.ok(m.colorRms > 0.01);
  const a = bayerTexture({ scale: 2 }),
    b = bayerTexture({ scale: 2, blur: 0.8 });
  assert.ok(b.colorRms < a.colorRms);
});
test("bilinear results preserve measured samples and match explicit interior RGGB stencils without truth access", () => {
  const m = bayerTexture({ angle: 31, shift: 0.5 }),
    at = (x, y) => m.mosaic[y * SIZE + x];
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x,
        ch = channelAt(x, y);
      near(m.reconstructed[ch][i], at(x, y));
      if (ch === "R" || ch === "B") {
        near(
          m.reconstructed.G[i],
          (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) / 4,
        );
        near(
          m.reconstructed[ch === "R" ? "B" : "R"][i],
          (at(x - 1, y - 1) +
            at(x + 1, y - 1) +
            at(x - 1, y + 1) +
            at(x + 1, y + 1)) /
            4,
        );
      } else {
        const horizontal = y % 2 === 0 ? "R" : "B",
          vertical = horizontal === "R" ? "B" : "R";
        near(m.reconstructed[horizontal][i], (at(x - 1, y) + at(x + 1, y)) / 2);
        near(m.reconstructed[vertical][i], (at(x, y - 1) + at(x, y + 1)) / 2);
      }
    }
});
test("reported image errors use the same interior and linear values before any display encoding", () => {
  const m = bayerTexture({ scale: 2.4, angle: 27 }),
    errors = [],
    aliasErrors = [],
    color = [];
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x,
        truth = valueAt(m.terms, x, y);
      for (const c of CHANNELS) {
        errors.push((m.reconstructed[c][i] - truth) ** 2);
        aliasErrors.push((aliasAt(m.terms, c, x, y) - truth) ** 2);
      }
      color.push(
        ((m.reconstructed.R[i] - m.reconstructed.G[i]) ** 2 +
          (m.reconstructed.B[i] - m.reconstructed.G[i]) ** 2) /
          2,
      );
    }
  const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v, 0) / a.length);
  assert.equal(m.count, 46 ** 2);
  near(m.rmse, rms(errors));
  near(m.aliasRmse, rms(aliasErrors));
  near(m.colorRms, rms(color));
  assert.ok(m.rawFine.every((v) => v >= 0.12 && v <= 0.88));
});
test("multi-frequency sampling rejects unsupported geometry and unknown image stages", () => {
  for (const p of [
    { scale: 0.4 },
    { scale: 4 },
    { angle: -1 },
    { angle: 91 },
    { shift: 3 },
    { width: -1 },
    { width: 1.1 },
    { blur: 1.1 },
    { scale: NaN },
  ])
    assert.throws(() => parameters(p), RangeError);
  assert.throws(() => valueAt(modes(), 0, 0, "display"), RangeError);
  assert.throws(() => aliasAt(modes(), "X", 0, 0), RangeError);
});
