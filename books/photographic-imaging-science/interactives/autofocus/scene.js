import {
  Group,
  palette as C,
  box,
  rod,
  ring,
  annulus,
  line,
} from "../common/three-geometry.js";
export function createScene({ scene }) {
  const base = new Group();
  scene.add(base);
  box(base, [46, 0.7, 20], [5, -8, 0], "#d4d9df");
  for (const z of [-7, 7]) rod(base, [-17, -5, z], [24, -5, z], 0.35, C.metal);
  ring(base, 6.5, 0.12, [0, 0, 0], C.green);
  const moving = new Group();
  base.add(moving);
  ring(moving, 6, 0.45, [0, 0, 0], C.dark);
  box(moving, [0.3, 7.5, 3.7], [0, 0, -2], C.blue, {
    transparent: true,
    opacity: 0.6,
  });
  box(moving, [0.3, 7.5, 3.7], [0, 0, 2], C.amber, {
    transparent: true,
    opacity: 0.6,
  });
  for (const z of [-7, 7]) box(moving, [2, 2, 2], [0, -5, z], C.dark);
  box(base, [0.5, 12, 15], [29, 0, 0], C.dark);
  box(base, [0.6, 8, 5], [28.6, 0, -3], C.blue);
  box(base, [0.6, 8, 5], [28.6, 0, 3], C.amber);
  line(
    base,
    [
      [-17, -6, 9],
      [24, -6, 9],
    ],
    C.dark,
  );
  let x = 0;
  return {
    update(m) {
      x = 40 * m.group;
      moving.position.x = x;
    },
    labels() {
      return [
        ["已知焦点 g=0", [0, 7, 0], C.green],
        ["移动镜组", [x, 5, 5], C.dark],
        ["A半瞳", [x, 0, -3], C.blue],
        ["B半瞳", [x, 0, 3], C.amber],
        ["分瞳信号 → 相关器", [29, 7, 0], C.dark],
      ];
    },
  };
}
