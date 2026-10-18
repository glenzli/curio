import test from "node:test";
import assert from "node:assert/strict";
import {
  design,
  atlasState,
  traceRay,
  paraxialRay,
  systemMatrix,
  sag,
  intersect,
  refract,
  PRESCRIPTIONS,
} from "./model.js";
const close = (a, b, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
test("six published examples retain their element, air-group and cement-interface counts", () => {
  const counts = [
    [3, 3],
    [4, 3],
    [6, 4],
    [6, 3],
    [6, 5],
    [5, 3],
  ];
  for (let type = 0; type < 6; type++) {
    const d = design(type),
      [elements, groups] = counts[type];
    assert.equal(d.elements.length, elements);
    assert.equal(d.groups.length, groups);
    assert.equal(d.surfaces.length, elements + groups);
    assert.equal(
      d.surfaces.filter((s) => s.left !== 1 && s.right !== 1).length,
      elements - groups,
    );
    assert.equal(
      d.surfaces.filter((s) => s.left === 1 || s.right === 1).length,
      2 * groups,
    );
    assert.ok(
      Math.abs(d.nativeF / 100 - 1) < 0.02,
      "native rounded patent table should remain near its nominal 100 units",
    );
  }
});
test("native signs, plane faces and easily misread glass indices are explicit", () => {
  assert.deepEqual(
    PRESCRIPTIONS[0].rows.map((r) => Math.sign(r[0])),
    [1, -1, -1, 1, 1, -1],
  );
  assert.equal(PRESCRIPTIONS[1].rows[1][0], Infinity);
  assert.equal(PRESCRIPTIONS[3].rows[4][2], 1.689);
  assert.equal(PRESCRIPTIONS[5].rows[0][2], 1.55226);
});
test("isotropic scaling fixes every complete thick system at 50 mm without changing dimensionless geometry", () => {
  for (let type = 0; type < 6; type++) {
    const a = design(type),
      b = design(type, 100);
    close(a.focalLength, 50);
    close(b.focalLength, 100);
    close(b.bfd, 2 * a.bfd);
    close(b.last, 2 * a.last);
    close(b.stop, 2 * a.stop);
    const r = traceRay(a, 1, 0.01),
      s = traceRay(b, 2, 0.01);
    assert.equal(r.passed, s.passed);
    assert.ok(r.passed);
    close(s.image, 2 * r.image);
    close(s.slope, r.slope);
  }
});
test("scalar surface kicks and translations independently reproduce matrix columns and cardinal quantities", () => {
  for (let type = 0; type < 6; type++) {
    const d = design(type),
      a = paraxialRay(d, 1),
      b = paraxialRay(d, 0, 1),
      [A, B, C, D] = d.matrix;
    close(a.height, A);
    close(a.slope, C);
    close(b.height, B);
    close(b.slope, D);
    close(A * D - B * C, 1);
    close(a.image, 0);
    close(b.image, 50);
    close(-1 / a.slope, d.focalLength);
    close(-a.height / a.slope, d.bfd);
  }
});
test("Snell small-ray derivatives converge to both paraxial matrix columns", () => {
  for (let type = 0; type < 6; type++) {
    const d = design(type),
      h = 1e-4,
      r = traceRay(d, h, 0, 1, true),
      q = traceRay(d, 0, 1e-6, 1, true);
    assert.ok(r.passed && q.passed);
    const atVertex = (s) => s.height + (d.last - s.last[0]) * s.slope;
    close(atVertex(r) / h, d.matrix[0], 2e-7);
    close(r.slope / h, d.matrix[2], 2e-8);
    close(atVertex(q) / 1e-6, d.matrix[1], 2e-6);
    close(q.slope / 1e-6, d.matrix[3], 2e-7);
  }
});
test("every refracted segment satisfies the spherical cap, Snell invariant and unit direction", () => {
  for (let type = 0; type < 6; type++) {
    const d = design(type);
    for (const r of atlasState({ type, angle: 1.1, radius: 2 }).rays)
      for (const e of r.steps) {
        const s = d.surfaces[e.surface],
          p = e.point;
        close(p[0], sag(s, p[1]), 1e-7);
        let normal = [1, 0];
        if (Number.isFinite(s.R))
          normal = [
            (Math.sign(s.R) * (s.z + s.R - p[0])) / Math.abs(s.R),
            (-Math.sign(s.R) * p[1]) / Math.abs(s.R),
          ];
        const tangentComponent = (v) => normal[0] * v[1] - normal[1] * v[0];
        close(
          s.left * tangentComponent(e.incoming),
          s.right * tangentComponent(e.outgoing),
          1e-11,
        );
        close(Math.hypot(...e.outgoing), 1, 1e-12);
      }
  }
});
test("drawn glass has positive edge thickness and air gaps do not overlap", () => {
  for (let type = 0; type < 6; type++) {
    const d = design(type);
    for (const e of d.elements)
      for (let i = 0; i <= 40; i++) {
        const front = d.surfaces[e.front],
          back = d.surfaces[e.back],
          h = (Math.min(front.clear, back.clear) * i) / 40;
        assert.ok(sag(back, h) > sag(front, h), "glass thickness");
      }
    for (let i = 0; i < d.surfaces.length - 1; i++) {
      const a = d.surfaces[i],
        b = d.surfaces[i + 1];
      if (a.right !== 1) continue;
      const h = Math.min(a.clear, b.clear);
      assert.ok(
        sag(b, h) > sag(a, h),
        "air separation at the common clear radius",
      );
    }
  }
});
test("axial rays have opposite signed image deviations and finite aperture exposes spherical residuals", () => {
  for (let type = 0; type < 6; type++) {
    const d = design(type),
      a = traceRay(d, 1.5),
      b = traceRay(d, -1.5);
    assert.ok(a.passed && b.passed);
    close(a.image, -b.image, 1e-9);
    const small = traceRay(d, 0.2),
      large = traceRay(d, 1.5);
    assert.ok(Math.abs(large.image) > Math.abs(small.image));
  }
});
test("Tessar cemented surface remains an optical surface with a positive power", () => {
  const row = PRESCRIPTIONS[1].rows;
  close((1000 * (row[5][2] - row[4][2])) / row[5][0], 3.580158730158735);
  const d = design(1),
    s = d.surfaces[5];
  assert.ok(s.right > s.left && s.R > 0);
  assert.equal(d.groups[2].elements.length, 2);
});
test("Sonnar cemented middle triplet is negative and keeps three material intervals", () => {
  const d = design(3);
  assert.equal(d.groups[1].elements.length, 3);
  assert.ok(d.groups[1].power < 0);
  assert.ok(d.groups[0].power > 0 && d.groups[2].power > 0);
});
test("Gauss inner menisci are negative while outer singlets are positive", () => {
  assert.deepEqual(
    design(2).groups.map((g) => Math.sign(g.power)),
    [1, -1, -1, 1],
  );
});
test("retrofocus preserves longer BFD and a net positive rear part that contains a negative element", () => {
  const d = design(4);
  assert.ok(d.bfd / d.focalLength > 1.04 && d.bfd / d.focalLength < 1.06);
  assert.ok(d.groups[0].power < 0 && d.groups[3].power < 0);
  assert.ok(systemMatrix(d.surfaces.slice(2))[2] < 0);
});
test("telephoto has a positive last singlet inside a net negative rear system", () => {
  const d = design(5);
  assert.ok(d.image < d.focalLength);
  assert.ok(d.groups.at(-1).power > 0);
  assert.ok(systemMatrix(d.surfaces.slice(2))[2] > 0);
  close(d.stop / d.scale, 4.55 + 8.61);
});
test("blocked rays end at the actual aperture and do not reach the sensor", () => {
  let count = 0;
  for (let type = 0; type < 6; type++)
    for (const r of atlasState({
      type,
      radius: 4,
      stopFraction: 0.25,
      angle: 3,
    }).rays)
      if (!r.passed) {
        count++;
        assert.equal(r.points.at(-1), r.last);
        assert.ok(!Object.hasOwn(r, "image"));
        assert.ok(
          r.events.at(-1).blocked || r.reason === "光线未碰到近顶点球面帽",
        );
      }
  assert.ok(count > 20);
});
test("zero-throughput states report no span, rather than an artificial perfect image", () => {
  const m = atlasState({ type: 4, angle: 3, radius: 0.2, stopFraction: 0.25 });
  assert.equal(m.passed, 0);
  assert.equal(m.span, null);
  assert.ok(m.rays.every((r) => r.image === undefined));
});
test("plane intersections and total internal reflection terminate with their correct geometry", () => {
  assert.deepEqual(intersect([-3, 1], [1, 0], { z: 0, R: Infinity }), [0, 1]);
  assert.equal(
    refract([0.3, Math.sqrt(0.91)], [0, 0], {
      z: 0,
      R: Infinity,
      left: 1.6,
      right: 1,
    }),
    null,
  );
});
test("display selection and replay progress do not mutate the optical answer", () => {
  const a = atlasState({ type: 3 }),
    b = atlasState({ type: 3, selected: 2, progress: 0.2 });
  close(a.span, b.span);
  assert.deepEqual(a.rays, b.rays);
  assert.equal(b.selected, 2);
  assert.equal(atlasState({ type: 0, selected: 5 }).selected, 3);
});
test("invalid controls fail rather than inventing a lens", () => {
  for (const p of [
    { type: 6 },
    { type: 1.3 },
    { angle: 4 },
    { radius: 0 },
    { radius: NaN },
    { stopFraction: 0 },
    { progress: -0.1 },
    { selected: 0.5 },
  ])
    assert.throws(() => atlasState(p));
  assert.throws(() => design(0, 0));
});
