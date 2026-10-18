import {
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
} from "@glenzli/markdown-book/three";
import {
  Group,
  palette as C,
  ring,
  annulus,
  box,
  rod,
  line,
  updateLine,
} from "../common/three-geometry.js";

export function lensMotionScene({ scene }) {
  const apparatus = new Group();
  scene.add(apparatus);
  for (const z of [-14, 14])
    rod(apparatus, [-5, -15, z], [205, -15, z], 0.5, C.metal);
  box(apparatus, [220, 1, 36], [100, -18, 0], "#d3d9df");
  const groups = [0, 1, 2].map((i) => {
    const group = new Group();
    apparatus.add(group);
    const color = i === 1 ? C.amber : C.blue;
    box(group, [3, 2.5, 31], [0, -15, 0], C.dark);
    for (const z of [-12, 12]) rod(group, [0, -14, z], [0, 0, z], 0.4, C.dark);
    ring(group, 12, 0.8, [0, 0, 0], color);
    annulus(group, 0, 11.3, [0, 0, 0], color, 0.16);
    // A bar or plus identifies the sign of the equivalent power.
    rod(group, [0, 13, -1.8], [0, 13, 1.8], 0.24, color);
    if (i !== 1) rod(group, [0, 11.2, 0], [0, 14.8, 0], 0.24, color);
    return group;
  });
  const detector = new Group();
  apparatus.add(detector);
  detector.position.x = 200;
  box(detector, [0.5, 26, 35], [0, 0, 0], "#c9b89d", {
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  for (const y of [-13, 13])
    rod(detector, [0, y, -17.5], [0, y, 17.5], 0.5, C.amber);
  for (const z of [-17.5, 17.5])
    rod(detector, [0, -13, z], [0, 13, z], 0.5, C.amber);
  const rays = Array.from({ length: 12 }, () =>
    line(
      apparatus,
      Array.from({ length: 4 }, () => [0, 0, 0]),
      C.blue,
      0.77,
    ),
  );
  const footprint = new Mesh(
    new CircleGeometry(1, 64),
    new MeshBasicMaterial({
      color: C.red,
      side: DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  footprint.rotateY(Math.PI / 2);
  footprint.position.x = 200.4;
  apparatus.add(footprint);
  const axis = line(
    apparatus,
    [
      [-5, 0, 0],
      [205, 0, 0],
    ],
    C.dark,
    0.2,
  );
  let m;
  return {
    update(model) {
      m = model;
      groups.forEach((g, i) => (g.position.x = m.groups[i]));
      m.paths.forEach((points, i) => updateLine(rays[i], points));
      footprint.scale.setScalar(Math.max(0.05, m.detectorDiameter / 2));
      footprint.visible = m.detectorDiameter > 0.002;
    },
    labels() {
      return [
        ["G1 · 固定 +10 D", [0, 17, 0], C.blue],
        ["G2 · 移动 −20 D", [m?.groups[1] ?? 50, 22, 0], C.amber],
        ["G3 · 移动 +20 D", [m?.groups[2] ?? 150, 17, 0], C.blue],
        ["固定传感器", [200, 23, 0], C.amber],
      ];
    },
  };
}
