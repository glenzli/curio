import test from "node:test";
import assert from "node:assert/strict";
import {
  gaussianCDF,
  gaussianMTF,
  gaussianMTF50,
  makeEdge,
  binEdge,
  derivative,
  spectrum,
  differenceResponse,
  crossing50,
  analyze,
  SIZE,
} from "./model.js";
import { fitEdge, projectEdge } from "./geometry.js";
const near = (a, b, tolerance = 1e-6) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("Gaussian ESF limits and the worked MTF50 keep pixel units", () => {
  near(gaussianCDF(0), 0.5);
  near(gaussianCDF(1), 0.841344746, 1e-7);
  near(gaussianCDF(-8), 0);
  near(gaussianCDF(8), 1);
  near(gaussianMTF50(0.85), 0.220459558976, 1e-12);
  near(gaussianMTF(gaussianMTF50(0.85), 0.85), 0.5);
});

test("the normal projection uses tilt from vertical and preserves row phase", () => {
  const edge = makeEdge({ angle: 5, phase: 0.2, noise: 0 });
  const top = edge[20],
    next = edge[SIZE + 20];
  near(next.distance - top.distance, -Math.sin((5 * Math.PI) / 180));
  assert.equal(edge.length, SIZE * SIZE);
});

test("slant supplies bins that an upright sampled edge leaves empty", () => {
  const tilted = binEdge(makeEdge({ angle: 5 }), 0.25),
    upright = binEdge(makeEdge({ angle: 0 }), 0.25);
  assert.equal(tilted.missing, 0);
  assert.ok(upright.missing > 60);
  assert.equal(analyze({ angle: 0 }).estimated50, null);
  const sourceCount = tilted.bins.reduce((sum, b) => sum + b.count, 0);
  assert.ok(sourceCount > 1200 && sourceCount < 1800);
});

test("central differences reproduce a linear ESF and keep the derivative scale", () => {
  const h = 0.25,
    esf = Array.from({ length: 41 }, (_, i) => ({
      x: -5 + i * h,
      value: 3 * (-5 + i * h) + 2,
    }));
  for (const p of derivative(esf, h)) near(p.value, 3);
  near(differenceResponse(0, h), 1);
  near(differenceResponse(0.5, h), Math.sin(Math.PI / 4) / (Math.PI / 4));
});

test("the numerical ESF to LSF to DFT path recovers the analytic Gaussian", () => {
  const h = 0.125,
    sigma = 0.85;
  const esf = Array.from({ length: 193 }, (_, i) => ({
    x: -12 + i * h,
    value: gaussianCDF((-12 + i * h) / sigma),
  }));
  const result = spectrum(derivative(esf, h), h);
  near(result.raw[0][1], 1);
  near(result.corrected[0][1], 1);
  near(crossing50(result.corrected), gaussianMTF50(sigma), 0.0002);
  assert.ok(crossing50(result.raw) < crossing50(result.corrected));
});

test("full binning pipeline matches the worked scale within binning error", () => {
  for (const phase of [0, 0.2, 0.47]) {
    const result = analyze({ sigma: 0.85, angle: 5, phase, factor: 4 });
    assert.equal(result.esf.missing, 0);
    near(result.estimated50, result.analytic50, 0.004);
  }
});

test("difference correction stops before a derivative-response zero", () => {
  const result = analyze({ sigma: 0.85, factor: 1 });
  assert.ok(result.corrected.at(-1)[0] < result.raw.at(-1)[0]);
  assert.ok(
    result.corrected.every(([f]) => Math.abs(differenceResponse(f, 1)) >= 0.2),
  );
});

test("noise is seeded and the Hamming window tapers the same LSF", () => {
  const a = analyze({ noise: 0.02, seed: 20 }),
    b = analyze({ noise: 0.02, seed: 20 }),
    c = analyze({ noise: 0.02, seed: 21 });
  assert.deepEqual(a.raw, b.raw);
  assert.notDeepEqual(a.raw, c.raw);
  const tapered = analyze({ noise: 0.02, seed: 20, window: true });
  assert.ok(
    Math.abs(tapered.lsf[0].value) < Math.abs(tapered.lsf[0].raw) * 0.1,
  );
  near(tapered.lsf[10].raw, a.lsf[10].raw);
});

test("row-gradient centroids recover straight-edge angle and phase from observations", () => {
  for (const angle of [0, 2, 5, 11])
    for (const phase of [-0.35, 0, 0.3]) {
      const fit = fitEdge(
        makeEdge({ angle, phase }).map(({ x, y, value }) => ({ x, y, value })),
      );
      assert.ok(fit.geometry, fit.reason);
      near(fit.geometry.angle, angle, 0.03);
      near(fit.geometry.phase, phase, 0.03);
      assert.ok(fit.residualRms < 0.03);
    }
});
test("geometry fitting ignores simulator distances; normal projection retains physical scale", () => {
  const raw = makeEdge({ angle: 7, phase: 0.3 });
  const clean = raw.map(({ x, y, value }) => ({ x, y, value }));
  assert.deepEqual(
    fitEdge(clean),
    fitEdge(raw.map((p) => ({ ...p, distance: NaN, truthAngle: 99 }))),
  );
  const theta = (7 * Math.PI) / 180;
  const projected = projectEdge(clean, {
    slope: Math.tan(theta),
    intercept: 31.5 + 0.3 / Math.cos(theta),
    centerY: 31.5,
  });
  for (let i = 0; i < raw.length; i++)
    near(projected[i].distance, raw[i].distance, 1e-12);
});
test("known geometry and fitted geometry have separate measured MTF references", () => {
  const result = analyze({ sigma: 0.85, angle: 5, noise: 0.02, seed: 20 });
  assert.ok(result.fitted && result.known);
  assert.equal(result.active, result.fitted);
  near(result.known.estimated50, result.analytic50, 0.02);
  near(result.fitted.estimated50, result.known.estimated50, 0.02);
  assert.ok(result.fit.residualRms > 0);
  const known = analyze({
    sigma: 0.85,
    angle: 5,
    noise: 0.02,
    seed: 20,
    geometry: "known",
  });
  assert.equal(known.active, known.known);
  assert.deepEqual(known.fitted, result.fitted);
});
test("absent or weak edges stop estimation even when the generating blur is known", () => {
  for (const parameters of [{ contrast: 0 }, { contrast: 0.05, noise: 0.03 }]) {
    const result = analyze(parameters);
    assert.equal(result.fit.geometry, null);
    assert.equal(result.fitted, null);
    assert.equal(result.estimated50, null);
    assert.ok(Number.isFinite(result.analytic50));
    assert.ok(result.fit.reason);
  }
});
test("a curved edge fails the declared straight-line residual criterion", () => {
  const samples = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const x = i % SIZE,
      y = Math.floor(i / SIZE);
    return {
      x,
      y,
      value: gaussianCDF(
        (x - 31.5 - 3 * Math.sin((2 * Math.PI * y) / SIZE)) / 0.85,
      ),
    };
  });
  const result = fitEdge(samples);
  assert.equal(result.geometry, null);
  assert.ok(result.residualRms > 0.75);
});
