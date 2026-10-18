import test from "node:test";
import assert from "node:assert/strict";
import { layoutSystem, LAYOUTS } from "./model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
test("five layouts: scalar rays agree with matrix focus and angular scale", () => {
  for (let type = 0; type < LAYOUTS.length; type++)
    for (const separation of [0.5, 1, 1.5])
      for (const angle of [-1, 0, 1]) {
        const m = layoutSystem({ type, separation, angle });
        near(m.determinant, 1);
        near(m.bfd, m.tracedBfd);
        near(m.maxImageError, 0);
        for (const r of m.rays)
          near(r.imageHeight, (m.focalLength * angle * Math.PI) / 180);
      }
});
test("separated positive/negative groups have known telephoto and retrofocus values", () => {
  const tele = layoutSystem({ type: 4 }),
    retro = layoutSystem({ type: 3 });
  near(tele.focalLength, 200);
  near(tele.bfd, 100);
  near(tele.imageZ, 150);
  near(retro.focalLength, 80);
  near(retro.bfd, 120);
  near(retro.imageZ, 170);
});
test("collapsing separation tends to summed powers; input radius does not change first-order focus", () => {
  for (let type = 0; type < LAYOUTS.length; type++) {
    const m = layoutSystem({ type, separation: 1e-8 });
    near(
      1 / m.focalLength,
      LAYOUTS[type].powers.reduce((a, b) => a + b, 0) / 1000,
      1e-9,
    );
    near(
      layoutSystem({ type, radius: 0.1 }).bfd,
      layoutSystem({ type, radius: 2 }).bfd,
    );
  }
});
test("invalid layout inputs stop instead of silently choosing a different family", () => {
  for (const p of [
    { type: 5 },
    { type: 0.5 },
    { separation: 0 },
    { angle: NaN },
    { radius: -1 },
  ])
    assert.throws(() => layoutSystem(p), RangeError);
});
