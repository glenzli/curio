import test from "node:test";
import assert from "node:assert/strict";
import {
  CHANNELS,
  channelAt,
  samplingBoundary,
  aliasForChannel,
  bayerModel,
  captureMosaic,
  demosaicBilinear,
} from "./model.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);

test("RGGB cosets retain the two interleaved green sites and original pixel units", () => {
  const counts = { R: 0, G: 0, B: 0 };
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) counts[channelAt(x, y)]++;
  assert.deepEqual(counts, { R: 16, G: 32, B: 16 });
  near(samplingBoundary("R", 0), 0.25);
  near(samplingBoundary("G", 0), 0.5);
  near(samplingBoundary("G", 90), 0.5);
  for (const c of CHANNELS) near(samplingBoundary(c, 45), Math.SQRT1_2 / 2);
});

test("reciprocal shifts with coset phase preserve every same-channel sample", () => {
  for (const angle of [0, 17, 45, 73, 90])
    for (const frequency of [0.13, 0.3, 0.4, 0.67])
      for (const phase of [0, 0.17, 0.25, 0.81]) {
        const m = bayerModel({ angle, frequency, phase, width: 0.8 });
        for (let y = -4; y < 8; y++)
          for (let x = -4; x < 8; x++)
            near(
              m.integrated(x, y),
              m.aliases[channelAt(x, y)].value(x, y),
              1e-12,
            );
        for (const c of CHANNELS) {
          const a = m.aliases[c];
          if (c === "G") {
            assert.ok(Math.abs(a.fx + a.fy) <= 0.5 + 1e-12);
            assert.ok(Math.abs(a.fx - a.fy) <= 0.5 + 1e-12);
          } else {
            assert.ok(Math.abs(a.fx) <= 0.25 + 1e-12);
            assert.ok(Math.abs(a.fy) <= 0.25 + 1e-12);
          }
        }
      }
  const b = aliasForChannel({ fx: 0.3, fy: 0 }, "B");
  near(b.fx, -0.2);
  near(b.phase, 0.5);
  const g = aliasForChannel({ fx: 0.3, fy: 0.3 }, "G");
  near(g.fx, -0.2);
  near(g.fy, -0.2);
  near(g.phase, 0.5);
});

test("directional support is strict at boundaries and boundary phase can erase contrast", () => {
  const axial = bayerModel({ frequency: 0.3 }),
    diagonal = bayerModel({ frequency: 0.3, angle: 45 });
  assert.equal(axial.aliases.R.location, "outside");
  assert.equal(axial.aliases.G.location, "inside");
  assert.equal(diagonal.aliases.R.location, "inside");
  const edge = bayerModel({ frequency: 0.25, phase: 0.25 });
  assert.equal(edge.aliases.R.location, "boundary");
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      if (channelAt(x, y) === "R") near(edge.integrated(x, y), 0.5);
  const green = bayerModel({ frequency: 0.5, phase: 0.25 });
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      if (channelAt(x, y) === "G") near(green.integrated(x, y), 0.5);
});

test("square pixel integration agrees with two-dimensional quadrature and does not move the lattice boundary", () => {
  const p = { frequency: 0.63, angle: 31, phase: 0.17, width: 0.8 },
    m = bayerModel(p),
    n = 120;
  let sum = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      sum += m.raw(
        2 + p.width * ((x + 0.5) / n - 0.5),
        3 + p.width * ((y + 0.5) / n - 0.5),
      );
  near(sum / n ** 2, m.integrated(2, 3), 1e-5);
  assert.equal(
    m.aliases.R.location,
    bayerModel({ ...p, width: 0 }).aliases.R.location,
  );
});

test("bilinear reconstruction uses only mosaic data and exactly retains measured samples and affine planes", () => {
  const size = 14,
    base = { R: 0.2, G: 0.4, B: 0.7 };
  const mosaic = captureMosaic(
      size,
      (c, x, y) => base[c] + 0.002 * x - 0.003 * y,
    ),
    out = demosaicBilinear(mosaic, size);
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++)
      for (const c of CHANNELS) {
        near(out[c][y * size + x], base[c] + 0.002 * x - 0.003 * y);
        if (channelAt(x, y) === c)
          assert.equal(out[c][y * size + x], mosaic[y * size + x]);
      }
  const constant = demosaicBilinear(
    captureMosaic(size, () => 0.5),
    size,
  );
  for (const c of CHANNELS) for (const v of constant[c]) near(v, 0.5);
  assert.throws(() => bayerModel({ width: 2 }));
  assert.throws(() => demosaicBilinear([1], 4));
});
