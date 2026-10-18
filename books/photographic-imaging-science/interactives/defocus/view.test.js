import test from "node:test";
import assert from "node:assert/strict";
import { spec } from "./lesson.js";
import { SIDES } from "./model.js";
test("the displayed continuous aperture has the declared area for the circle and all polygons", () => {
  const base = Object.fromEntries(spec.controls.map((c) => [c.key, c.value]));
  for (let shape = 0; shape < 4; shape++) {
    const svg = spec.evaluate({ ...base, shape }).figure;
    if (shape === 0) {
      assert.match(svg, /<circle cx="120" cy="120" r="74" fill="white"/);
      continue;
    }
    const coords = svg
      .match(/<polygon points="([^"]+)"/)[1]
      .split(" ")
      .map((x) => x.split(",").map(Number));
    assert.equal(coords.length, SIDES[shape]);
    const area =
      Math.abs(
        coords.reduce((s, [x, y], i) => {
          const [a, b] = coords[(i + 1) % coords.length];
          return s + x * b - y * a;
        }, 0),
      ) /
      2 /
      74 ** 2;
    assert.ok(Math.abs(area - Math.PI) < 1e-12);
  }
});
