import test from "node:test";
import assert from "node:assert/strict";
import {
  ghost,
  trace,
  events,
  parameters,
  dielectric,
  intersection,
  surfaces,
  sag,
  paraxial,
  normalWeight,
} from "./model.js";
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
test("ghost spherical intersections lie on the intended cap, not the opposite sphere wall", () => {
  for (const s of surfaces)
    for (const h of [-5, 0, 5]) {
      const hit = intersection([-8, h], [1, 0], s);
      near(hit[0], sag(s, h));
      near((hit[0] - s.z - s.R) ** 2 + hit[1] ** 2, s.R ** 2, 1e-8);
    }
});
test("ghost dielectric directions conserve Snell and normal-incidence power", () => {
  for (const angle of [0.1, 0.3, 0.5]) {
    const f = dielectric([Math.cos(angle), Math.sin(angle)], [-1, 0], 1, 1.52);
    near(Math.sin(angle), 1.52 * f.transmitted[1]);
    near(Math.hypot(...f.transmitted), 1);
    near(Math.hypot(...f.reflected), 1);
    near(f.reflected[0], -Math.cos(angle));
  }
  const f = dielectric([1, 0], [-1, 0], 1, 1.52),
    R = (0.52 / 2.52) ** 2;
  near(f.Rs, R);
  near(f.Rp, R);
  const tir = dielectric([0.5, Math.sqrt(0.75)], [-1, 0], 1.6, 1);
  assert.equal(tir.transmitted, null);
  assert.equal(tir.Rs, 1);
});
test("ghost all three pairs include both real reversals and every intervening transmission", () => {
  for (const pair of [0, 1, 2]) {
    const p = parameters({ pair, angle: 0 }),
      path = events(pair),
      r = trace(0, 0, path, p);
    assert.equal(path.filter((v) => v[1] === "R").length, 2);
    assert.equal(r.reason, null);
    assert.equal(r.interactions.length, path.length);
    assert.equal(r.crossings.length, 3);
    for (const e of r.interactions) {
      if (e.kind === "R") assert.ok(e.before[0] * e.after[0] < 0);
      else assert.ok(e.before[0] * e.after[0] > 0);
    }
    near(r.weight, normalWeight(path), 1e-14);
  }
  assert.deepEqual(events(0), [
    [0, "T"],
    [1, "T"],
    [2, "R"],
    [1, "R"],
    [2, "T"],
    [3, "T"],
  ]);
});
test("ghost near-axis sphere tracing converges to independent global-slope matrices", () => {
  for (const pair of [null, 0, 1, 2]) {
    const path = events(pair),
      ref = paraxial(path),
      p = parameters();
    for (const h of [1e-3, 1e-4]) {
      const r = trace(h, 0, path, p),
        last = r.points.at(-2),
        focus = last[0] - (last[1] * r.direction[0]) / r.direction[1];
      near(focus, ref.focus, 2e-6);
      const expected =
        ref.matrix[0] * h + (p.sensor - ref.lastZ) * ref.matrix[2] * h;
      near(r.sensorY, expected, 1e-9);
    }
  }
  assert.ok(paraxial(events(2)).focus < 15);
});
test("ghost s/p powers multiply separately, rather than reset to unpolarized at each bounce", () => {
  const m = ghost({ angle: 4, pair: 1, stop: 6 }),
    r = m.secondary[20];
  let s = 0.5,
    p = 0.5;
  for (const e of r.interactions) {
    s *= e.kind === "R" ? e.Rs : 1 - e.Rs;
    p *= e.kind === "R" ? e.Rp : 1 - e.Rp;
  }
  near(r.ws, s, 1e-16);
  near(r.wp, p, 1e-16);
  near(r.weight, s + p, 1e-16);
  assert.ok(Math.abs(s - p) > 1e-8);
});
test("ghost stop clipping terminates paths and cannot increase same-fan powers", () => {
  for (const pair of [0, 1, 2]) {
    const wide = ghost({ pair, angle: 3, stop: 6 }),
      small = ghost({ pair, angle: 3, stop: 0.5 });
    assert.ok(small.primaryPower <= wide.primaryPower);
    assert.ok(small.ghostPower <= wide.ghostPower);
    assert.ok(small.secondary.some((r) => r.reason === "光阑截断"));
    for (const r of small.secondary.filter((r) => r.reason))
      assert.equal(r.weight, 0);
  }
});
test("ghost meridional paths reflect vertically for opposite source angles", () => {
  const a = ghost({ angle: 2 }),
    b = ghost({ angle: -2 });
  a.secondary.forEach((r, i) => {
    const q = b.secondary[40 - i];
    assert.equal(Boolean(r.reason), Boolean(q.reason));
    if (!r.reason) {
      near(r.sensorY, -q.sensorY);
      near(r.weight, q.weight, 1e-12);
    }
  });
});
test("ghost rejects invalid geometry controls", () => {
  for (const p of [
    { sensor: 0 },
    { stop: 0 },
    { angle: NaN },
    { pair: 1.2 },
    { radius: 10 },
    { progress: 2 },
  ])
    assert.throws(() => parameters(p));
});
