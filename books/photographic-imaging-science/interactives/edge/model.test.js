import test from "node:test";
import assert from "node:assert/strict";
import { gaussianCDF, gaussianMTF, gaussianMTF50, makeEdge, binEdge, derivative, spectrum, differenceResponse, crossing50, analyze, SIZE } from "./model.js";
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("Gaussian ESF limits and the worked MTF50 keep pixel units", () => {
  near(gaussianCDF(0), .5); near(gaussianCDF(1), .841344746, 1e-7);
  near(gaussianCDF(-8), 0); near(gaussianCDF(8), 1);
  near(gaussianMTF50(.85), .220459558976, 1e-12);
  near(gaussianMTF(gaussianMTF50(.85), .85), .5);
});

test("the normal projection uses tilt from vertical and preserves row phase", () => {
  const edge = makeEdge({ angle: 5, phase: .2, noise: 0 });
  const top = edge[20], next = edge[SIZE + 20];
  near(next.distance - top.distance, -Math.sin(5 * Math.PI / 180));
  assert.equal(edge.length, SIZE * SIZE);
});

test("slant supplies bins that an upright sampled edge leaves empty", () => {
  const tilted = binEdge(makeEdge({ angle: 5 }), .25), upright = binEdge(makeEdge({ angle: 0 }), .25);
  assert.equal(tilted.missing, 0); assert.ok(upright.missing > 60);
  assert.equal(analyze({ angle: 0 }).estimated50, null);
  const sourceCount = tilted.bins.reduce((sum, b) => sum + b.count, 0);
  assert.ok(sourceCount > 1200 && sourceCount < 1800);
});

test("central differences reproduce a linear ESF and keep the derivative scale", () => {
  const h = .25, esf = Array.from({ length: 41 }, (_, i) => ({ x: -5 + i * h, value: 3 * (-5 + i * h) + 2 }));
  for (const p of derivative(esf, h)) near(p.value, 3);
  near(differenceResponse(0, h), 1);
  near(differenceResponse(.5, h), Math.sin(Math.PI / 4) / (Math.PI / 4));
});

test("the numerical ESF to LSF to DFT path recovers the analytic Gaussian", () => {
  const h = .125, sigma = .85;
  const esf = Array.from({ length: 193 }, (_, i) => ({ x: -12 + i * h, value: gaussianCDF((-12 + i * h) / sigma) }));
  const result = spectrum(derivative(esf, h), h);
  near(result.raw[0][1], 1); near(result.corrected[0][1], 1);
  near(crossing50(result.corrected), gaussianMTF50(sigma), .0002);
  assert.ok(crossing50(result.raw) < crossing50(result.corrected));
});

test("full binning pipeline matches the worked scale within binning error", () => {
  for (const phase of [0, .2, .47]) {
    const result = analyze({ sigma: .85, angle: 5, phase, factor: 4 });
    assert.equal(result.esf.missing, 0);
    near(result.estimated50, result.analytic50, .004);
  }
});

test("difference correction stops before a derivative-response zero", () => {
  const result = analyze({ sigma: .85, factor: 1 });
  assert.ok(result.corrected.at(-1)[0] < result.raw.at(-1)[0]);
  assert.ok(result.corrected.every(([f]) => Math.abs(differenceResponse(f, 1)) >= .2));
});

test("noise is seeded and the Hamming window tapers the same LSF", () => {
  const a = analyze({ noise: .02, seed: 20 }), b = analyze({ noise: .02, seed: 20 }), c = analyze({ noise: .02, seed: 21 });
  assert.deepEqual(a.raw, b.raw); assert.notDeepEqual(a.raw, c.raw);
  const tapered = analyze({ noise: .02, seed: 20, window: true });
  assert.ok(Math.abs(tapered.lsf[0].value) < Math.abs(tapered.lsf[0].raw) * .1);
  near(tapered.lsf[10].raw, a.lsf[10].raw);
});
