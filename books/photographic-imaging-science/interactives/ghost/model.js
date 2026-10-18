// All lengths in mm, global coordinates [z,y]. The spherical caps have signed R.
export const surfaces = [
  { z: 0, R: 40, left: 1, right: 1.52, clear: 7 },
  { z: 4, R: -40, left: 1.52, right: 1, clear: 7 },
  { z: 12, R: -60, left: 1, right: 1.6, clear: 7 },
  { z: 15, R: 60, left: 1.6, right: 1, clear: 7 },
];
export const pairs = [
  [2, 1],
  [3, 0],
  [3, 1],
];
export function parameters(input = {}) {
  const p = {
    angle: 2,
    radius: 3.8,
    stop: 3,
    sensor: 83,
    pair: 0,
    progress: 1,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.angle) > 4 ||
    p.radius < 0.5 ||
    p.radius > 5 ||
    p.stop < 0.5 ||
    p.stop > 6 ||
    p.sensor < 16 ||
    p.sensor > 180 ||
    ![0, 1, 2].includes(p.pair) ||
    p.progress < 0 ||
    p.progress > 1
  )
    throw RangeError("Invalid two-reflection ghost parameters");
  return p;
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export function sag(s, y) {
  return s.z + s.R - Math.sign(s.R) * Math.sqrt(s.R * s.R - y * y);
}
export function intersection(origin, direction, s) {
  const v = [origin[0] - s.z - s.R, origin[1]],
    b = dot(v, direction),
    c = dot(v, v) - s.R * s.R,
    disc = b * b - c;
  if (disc < 0) return null;
  const roots = [-b - Math.sqrt(disc), -b + Math.sqrt(disc)]
    .filter((t) => t > 1e-7)
    .sort((a, b) => a - b);
  for (const t of roots) {
    const point = [origin[0] + t * direction[0], origin[1] + t * direction[1]];
    if (
      Math.abs(point[1]) < Math.abs(s.R) &&
      Math.abs(point[0] - sag(s, point[1])) < 1e-6
    )
      return point;
  }
  return null;
}
export function dielectric(direction, normal, n1, n2) {
  let N = normal;
  if (dot(direction, N) > 0) N = N.map((v) => -v);
  const ci = -dot(direction, N),
    eta = n1 / n2,
    st2 = eta * eta * Math.max(0, 1 - ci * ci);
  const reflected = direction.map((v, i) => v + 2 * ci * N[i]);
  if (st2 > 1)
    return { reflected, transmitted: null, Rs: 1, Rp: 1, ci, ct: null };
  const ct = Math.sqrt(Math.max(0, 1 - st2));
  const Rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2,
    Rp = ((n2 * ci - n1 * ct) / (n2 * ci + n1 * ct)) ** 2;
  const transmitted = direction.map((v, i) => eta * v + (eta * ci - ct) * N[i]);
  return { reflected, transmitted, Rs, Rp, ci, ct };
}
export function events(pair = null) {
  if (pair === null) return surfaces.map((_, i) => [i, "T"]);
  const [rear, front] = pairs[pair],
    path = [];
  for (let i = 0; i <= rear; i++) path.push([i, i === rear ? "R" : "T"]);
  for (let i = rear - 1; i >= front; i--)
    path.push([i, i === front ? "R" : "T"]);
  for (let i = front + 1; i < surfaces.length; i++) path.push([i, "T"]);
  return path;
}
// Unpolarized launch: keep s and p powers separate throughout the meridional path.
export function trace(height, angle, path, p) {
  let origin = [-8, height],
    direction = [Math.cos(angle), Math.sin(angle)],
    n = 1,
    ws = 0.5,
    wp = 0.5;
  const points = [origin],
    interactions = [],
    crossings = [];
  const blocked = (reason, point = origin) => ({
    points: [...points, point],
    interactions,
    crossings,
    reason,
    weight: 0,
    ws: 0,
    wp: 0,
    sensorY: null,
    direction,
  });
  function travel(point) {
    if ((origin[0] - 8) * (point[0] - 8) < 0) {
      const t = (8 - origin[0]) / (point[0] - origin[0]),
        y = origin[1] + t * (point[1] - origin[1]);
      crossings.push(y);
      if (Math.abs(y) > p.stop) return [8, y];
    }
    return null;
  }
  for (const [index, kind] of path) {
    const s = surfaces[index],
      point = intersection(origin, direction, s);
    if (!point) return blocked("未与指定球面相交");
    const obstruction = travel(point);
    if (obstruction) return blocked("光阑截断", obstruction);
    points.push(point);
    if (Math.abs(point[1]) > s.clear) return blocked("镜片净口径截断", point);
    const incoming = direction[0] > 0 ? s.left : s.right,
      outgoing = direction[0] > 0 ? s.right : s.left;
    if (Math.abs(n - incoming) > 1e-9)
      throw Error("Path medium and propagation direction disagree");
    const normal = [
      (point[0] - s.z - s.R) / Math.abs(s.R),
      point[1] / Math.abs(s.R),
    ];
    const f = dielectric(direction, normal, incoming, outgoing),
      before = direction;
    if (kind === "R") {
      direction = f.reflected;
      ws *= f.Rs;
      wp *= f.Rp;
    } else {
      if (!f.transmitted) return blocked("全反射；指定透射支路终止", point);
      direction = f.transmitted;
      ws *= 1 - f.Rs;
      wp *= 1 - f.Rp;
      n = outgoing;
    }
    interactions.push({
      index,
      kind,
      point,
      before,
      after: direction,
      n1: incoming,
      n2: outgoing,
      Rs: f.Rs,
      Rp: f.Rp,
      ws,
      wp,
      ci: f.ci,
      ct: f.ct,
    });
    origin = point;
  }
  if (direction[0] <= 0) return blocked("出射方向背离像面");
  const t = (p.sensor - origin[0]) / direction[0],
    end = [p.sensor, origin[1] + t * direction[1]];
  const obstruction = travel(end);
  if (obstruction) return blocked("光阑截断", obstruction);
  points.push(end);
  return {
    points,
    interactions,
    crossings,
    reason: null,
    weight: ws + wp,
    ws,
    wp,
    sensorY: end[1],
    direction,
  };
}
function multiply(a, b) {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
}
// Independent paraxial matrices use global slope dy/dz even on reverse legs.
export function paraxial(path) {
  let M = [1, 0, 0, 1],
    z = -8,
    n = 1,
    sign = 1;
  for (const [i, kind] of path) {
    const s = surfaces[i],
      target = sign > 0 ? s.right : s.left;
    M = multiply([1, s.z - z, 0, 1], M);
    if (kind === "R") {
      M = multiply([1, 0, -2 / s.R, -1], M);
      sign *= -1;
    } else {
      M = multiply([1, 0, -(target - n) / (target * s.R), n / target], M);
      n = target;
    }
    z = s.z;
  }
  return {
    matrix: M,
    focus: Math.abs(M[2]) < 1e-14 ? null : z - M[0] / M[2],
    lastZ: z,
  };
}
export function normalWeight(path) {
  let n = 1,
    sign = 1,
    weight = 1;
  for (const [i, kind] of path) {
    const s = surfaces[i],
      target = sign > 0 ? s.right : s.left,
      R = ((n - target) / (n + target)) ** 2;
    weight *= kind === "R" ? R : 1 - R;
    if (kind === "R") sign *= -1;
    else n = target;
  }
  return weight;
}
export function ghost(input = {}) {
  const p = parameters(input),
    primaryPath = events(),
    ghostPath = events(p.pair);
  const launch = Array.from(
      { length: 41 },
      (_, i) => -p.radius + (2 * p.radius * i) / 40,
    ),
    angle = (p.angle * Math.PI) / 180;
  const primary = launch.map((y) => trace(y, angle, primaryPath, p)),
    secondary = launch.map((y) => trace(y, angle, ghostPath, p));
  const energy = (rays) => rays.reduce((s, r) => s + r.weight, 0) / rays.length;
  const reference = (path) => {
    const matrix = paraxial(path),
      axial = trace(1e-4, 0, path, p),
      last = axial.points.at(-2);
    const rayFocus = axial.reason
      ? null
      : last[0] - (last[1] * axial.direction[0]) / axial.direction[1];
    return {
      ...matrix,
      rayFocus,
      normal: normalWeight(path),
      axialWeight: trace(0, 0, path, p).weight,
    };
  };
  return {
    p,
    launch,
    primary,
    secondary,
    primaryPower: energy(primary),
    ghostPower: energy(secondary),
    primaryPath,
    ghostPath,
    primaryReference: reference(primaryPath),
    ghostReference: reference(ghostPath),
  };
}
