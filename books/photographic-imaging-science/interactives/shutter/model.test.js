import test from "node:test";
import assert from "node:assert/strict";
import { motion, illumination, sinc, rodProfile } from "./model.js";
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("2160 rows at 8 microseconds give 207.264 pixels of skew", () => {
  const scan = 2159 * 8e-6;
  const top = motion(0, scan, 0.002, 12000), bottom = motion(1, scan, 0.002, 12000);
  near(bottom.position - top.position, 207.264);
  near(top.blur, 24);
  near(motion(0, scan, 0.00025, 12000).blur, 3);
  const short = motion(1, scan, 0.00025, 12000).position - motion(0, scan, 0.00025, 12000).position;
  near(short, 207.264);
});

test("global exposure removes row skew while keeping motion blur", () => {
  assert.deepEqual(motion(0, 0, 0.01, 500), motion(1, 0, 0.01, 500));
  assert.equal(motion(1, 0, 0.01, 500).blur, 5);
});

test("whole illumination periods cancel the sinusoidal term", () => {
  near(sinc(0), 1);
  near(sinc(Math.PI * 100 * 0.001), 0.983631643083466);
  for (const row of [0, 0.17, 0.5, 1]) near(illumination(row, 0.017272, 0.01, 100), 1);
});

test("analytic illumination average matches numerical integration, including negative sinc", () => {
  for (const exposure of [0.001, 0.01, 0.015]) for (const row of [0, 0.43, 1]) {
    const n = 20000, start = row * 0.017272;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += (1 + 0.8 * Math.cos(2 * Math.PI * 100 * (start + (i + 0.5) * exposure / n))) / n;
    near(illumination(row, 0.017272, exposure, 100), mean, 1e-8);
  }
});

test("blur spreads the rod but preserves integrated signal", () => {
  for (const blur of [0, 3, 24, 120]) {
    const span = blur + 6, n = 20000;
    let area = 0;
    for (let i = 0; i < n; i++) area += rodProfile(-span / 2 + (i + 0.5) * span / n, blur) * span / n;
    near(area, 6, 1e-6);
  }
  assert.equal(rodProfile(0, 24), 0.25);
});
