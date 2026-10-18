import {
  Group,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  BoxGeometry,
  TorusGeometry,
  RingGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  DoubleSide,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  ArrowHelper,
} from "@glenzli/markdown-book/three";

export const palette = {
  metal: "#aab4bf",
  dark: "#4c5c6c",
  blue: "#2b82ac",
  amber: "#c1894d",
  green: "#329383",
  purple: "#9268ad",
  red: "#bc6066",
};
export function solid(parent, geometry, position, color, options = {}) {
  const material = new MeshStandardMaterial({
    color,
    roughness: 0.47,
    metalness: 0.22,
    ...options,
  });
  const object = new Mesh(geometry, material);
  object.position.set(...position);
  parent.add(object);
  return object;
}
export function box(parent, size, position, color, options) {
  return solid(parent, new BoxGeometry(...size), position, color, options);
}
export function cylinder(parent, radius, length, position, color, options) {
  const object = solid(
    parent,
    new CylinderGeometry(radius, radius, length, 40),
    position,
    color,
    options,
  );
  object.rotateZ(Math.PI / 2);
  return object;
}
export function ring(parent, radius, tube, position, color) {
  const object = solid(
    parent,
    new TorusGeometry(radius, tube, 10, 64),
    position,
    color,
  );
  object.rotateY(Math.PI / 2);
  return object;
}
export function annulus(parent, inner, outer, position, color, opacity = 1) {
  const object = solid(
    parent,
    new RingGeometry(inner, outer, 80),
    position,
    color,
    {
      side: DoubleSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
    },
  );
  object.rotateY(Math.PI / 2);
  return object;
}
export function rod(parent, a, b, radius, color) {
  const delta = new Vector3(...b).sub(new Vector3(...a));
  const object = solid(
    parent,
    new CylinderGeometry(radius, radius, delta.length(), 12),
    a.map((x, i) => (x + b[i]) / 2),
    color,
  );
  object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
  return object;
}
export function helix(
  parent,
  {
    start,
    end,
    radius,
    lead,
    y = 0,
    z = 0,
    tube = 0.04,
    color = palette.amber,
    handedness = 1,
  },
) {
  const turns = (end - start) / lead;
  const n = Math.max(64, Math.ceil(turns * 24));
  const points = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      phi = handedness * 2 * Math.PI * turns * t;
    return new Vector3(
      start + (end - start) * t,
      y + radius * Math.cos(phi),
      z + radius * Math.sin(phi),
    );
  });
  return solid(
    parent,
    new TubeGeometry(new CatmullRomCurve3(points), n, tube, 6, false),
    [0, 0, 0],
    color,
  );
}
export function line(parent, points, color, opacity = 1) {
  const object = new Line(
    new BufferGeometry().setFromPoints(points.map((p) => new Vector3(...p))),
    new LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
  parent.add(object);
  return object;
}
export function updateLine(object, points) {
  const attribute = object.geometry.attributes.position;
  points.forEach((p, i) => attribute.setXYZ(i, ...p));
  attribute.needsUpdate = true;
  object.geometry.computeBoundingSphere();
}
export function arrow(parent, direction, position, length, color, head = 0.35) {
  const object = new ArrowHelper(
    new Vector3(...direction).normalize(),
    new Vector3(...position),
    length,
    color,
    head,
    head * 0.55,
  );
  parent.add(object);
  return object;
}
export { Group, Vector3 };
