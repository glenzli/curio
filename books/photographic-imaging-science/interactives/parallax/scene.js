import {
  Group,
  Vector3,
  palette as C,
  box,
  rod,
  line,
  updateLine,
  arrow,
} from "../common/three-geometry.js";
const world = ([x, y, z]) => [8 * z, -8 * y, 8 * x];
export function createScene({ scene }) {
  const group = new Group();
  scene.add(group);
  box(group, [0.15, 6.72, 8.8], [16, 0, 0], C.blue, {
    transparent: true,
    opacity: 0.6,
  });
  box(group, [0.15, 36, 56], [48, 0, 0], "#cbd2d9", {
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  for (let z = -24; z <= 24; z += 8)
    line(
      group,
      [
        [48, -18, z],
        [48, 18, z],
      ],
      "#9aa5b0",
      0.5,
    );
  for (let y = -16; y <= 16; y += 8)
    line(
      group,
      [
        [48, y, -28],
        [48, y, 28],
      ],
      "#9aa5b0",
      0.5,
    );
  rod(group, [16, -3.36, -4.4], [16, -3.36, 4.4], 0.08, C.blue);
  box(group, [2, 2, 2.8], [0, 0, 0], C.blue, {
    transparent: true,
    opacity: 0.28,
  });
  arrow(group, [1, 0, 0], [0, 0, 0], 6, C.blue, 0.4);
  const camera = new Group();
  group.add(camera);
  box(camera, [1.8, 2, 2.8], [0, 0, 0], C.dark);
  box(camera, [0.7, 1, 1], [1.2, 0, 0], C.amber);
  const heading = arrow(group, [1, 0, 0], [0, 0, 0], 7, C.amber, 0.5);
  const landmarks = [
      [0.3, 0.1, 2],
      [-2, 0.25, 6],
    ].map(world),
    rays = [];
  for (const p of landmarks) {
    line(group, [[0, 0, 0], p], C.blue, 0.35);
    rays.push(line(group, [[0, 0, 0], p], C.amber, 0.85));
  }
  let origin = [0, 0, 0];
  return {
    update(m) {
      origin = world([m.pose.translation, 0, 0]);
      camera.position.set(...origin);
      camera.rotation.y = (-m.pose.yaw * Math.PI) / 180;
      heading.position.set(...origin);
      heading.setDirection(
        new Vector3(
          Math.cos((m.pose.yaw * Math.PI) / 180),
          0,
          Math.sin((m.pose.yaw * Math.PI) / 180),
        ),
      );
      rays.forEach((r, i) => updateLine(r, [origin, landmarks[i]]));
    },
    labels() {
      return [
        ["前景2 m", [16, 5, 0], C.blue],
        ["背景6 m", [48, 20, 0], "#777"],
        ["参考投影中心", [0, -3, -3], C.blue],
        ["移动投影中心", [origin[0], 3, origin[2]], C.amber],
      ];
    },
  };
}
