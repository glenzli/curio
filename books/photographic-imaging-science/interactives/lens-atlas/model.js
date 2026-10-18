import { PRESCRIPTIONS } from "./prescriptions.js";
import { multiply, translation } from "../paraxial/model.js";
export { PRESCRIPTIONS };
const RAD = Math.PI / 180;
export function surfaceMatrix(s) {
  return [
    1,
    0,
    Number.isFinite(s.R) ? (s.left - s.right) / (s.R * s.right) : 0,
    s.left / s.right,
  ];
}
export function systemMatrix(surfaces) {
  let m = [1, 0, 0, 1],
    z = surfaces[0].z;
  for (const s of surfaces) {
    m = multiply(surfaceMatrix(s), multiply(translation(s.z - z), m));
    z = s.z;
  }
  return m;
}
export function sag(s, y) {
  if (!Number.isFinite(s.R)) return s.z;
  if (Math.abs(y) > Math.abs(s.R)) return null;
  return s.z + (y * y) / (s.R + Math.sign(s.R) * Math.sqrt(s.R * s.R - y * y));
}
function rawDesign(p) {
  let z = 0,
    n = 1,
    lens = 0,
    group = 0;
  const surfaces = [],
    elements = [];
  for (let i = 0; i < p.rows.length; i++) {
    const [R, d, right] = p.rows[i];
    if (right !== 1) {
      lens++;
      if (n === 1) group++;
    }
    surfaces.push({ z, R, left: n, right, group: group - 1 });
    if (right !== 1)
      elements.push({
        front: i,
        back: i + 1,
        lens,
        group: group - 1,
        n: right,
      });
    n = right;
    z += d;
  }
  const after = p.stopAfter,
    stop =
      surfaces[after].z +
      (p.stopOffset ?? (surfaces[after + 1].z - surfaces[after].z) / 2);
  return { surfaces, elements, stop, groups: group };
}
export function design(type = 2, focalLength = 50) {
  if (
    !Number.isInteger(type) ||
    !PRESCRIPTIONS[type] ||
    !Number.isFinite(focalLength) ||
    focalLength <= 0
  )
    throw RangeError("Invalid lens prescription");
  const p = PRESCRIPTIONS[type],
    raw = rawDesign(p),
    native = systemMatrix(raw.surfaces),
    nativeF = -1 / native[2],
    scale = focalLength / nativeF;
  const surfaces = raw.surfaces.map((s) => ({
    ...s,
    z: s.z * scale,
    R: s.R * scale,
    clear: p.clear[s.group] * scale,
  }));
  const matrix = systemMatrix(surfaces),
    [A, B, C, D] = matrix,
    bfd = -A / C,
    last = surfaces.at(-1).z;
  const groups = Array.from({ length: raw.groups }, (_, i) => {
    const es = raw.elements.filter((e) => e.group === i),
      ss = surfaces.slice(es[0].front, es.at(-1).back + 1),
      m = systemMatrix(ss);
    return {
      index: i,
      elements: es,
      start: ss[0].z,
      end: ss.at(-1).z,
      matrix: m,
      power: -1000 * m[2],
      description: p.groups[i],
    };
  });
  return {
    p,
    surfaces,
    elements: raw.elements,
    groups,
    matrix,
    nativeF,
    scale,
    focalLength: -1 / C,
    bfd,
    last,
    image: last + bfd,
    H1: (D - 1) / C,
    H2: last + (1 - A) / C,
    stop: raw.stop * scale,
    stopRadius: p.stopRadius * scale,
  };
}
export function paraxialRay(d, height, angle = 0) {
  let y = height,
    u = angle,
    z = 0;
  const points = [];
  for (const s of d.surfaces) {
    y += (s.z - z) * u;
    u =
      (s.left * u -
        (Number.isFinite(s.R) ? ((s.right - s.left) * y) / s.R : 0)) /
      s.right;
    z = s.z;
    points.push([z, y]);
  }
  return { height: y, slope: u, points, image: y + d.bfd * u };
}
export function intersect(origin, direction, s) {
  if (!Number.isFinite(s.R)) {
    const t = (s.z - origin[0]) / direction[0];
    return t > 1e-9 ? [s.z, origin[1] + t * direction[1]] : null;
  }
  const dz = origin[0] - s.z - s.R,
    b = dz * direction[0] + origin[1] * direction[1],
    c = dz * dz + origin[1] * origin[1] - s.R * s.R,
    disc = b * b - c;
  if (disc < 0) return null;
  // q/c avoids cancellation for a ray starting close to a weakly curved face.
  const q = -b - Math.sign(b || 1) * Math.sqrt(disc),
    roots = (q === 0 ? [-b] : [q, c / q])
      .filter((t) => t > 1e-9)
      .sort((a, b) => a - b);
  for (const t of roots) {
    const point = [origin[0] + t * direction[0], origin[1] + t * direction[1]],
      cap = sag(s, point[1]);
    if (cap !== null && Math.abs(point[0] - cap) < 1e-6) return point;
  }
  return null;
}
export function refract(direction, point, s) {
  const alpha = Number.isFinite(s.R)
    ? Math.atan2(
        -Math.sign(s.R) * point[1],
        Math.sign(s.R) * (s.z + s.R - point[0]),
      )
    : 0;
  const incoming = Math.atan2(direction[1], direction[0]),
    sin = (s.left / s.right) * Math.sin(incoming - alpha);
  if (Math.abs(sin) > 1) return null;
  const out = alpha + Math.asin(sin);
  return [Math.cos(out), Math.sin(out)];
}
export function traceRay(
  d,
  height,
  angle = 0,
  stopFraction = 1,
  ignoreLimits = false,
) {
  let origin = [-5, height - 5 * Math.tan(angle)],
    direction = [Math.cos(angle), Math.sin(angle)];
  const points = [origin],
    events = [],
    steps = [];
  const sequence = [
    ...d.surfaces.map((s, i) => ({ ...s, index: i })),
    { z: d.stop, R: Infinity, stop: true },
  ].sort((a, b) => a.z - b.z);
  for (const s of sequence) {
    const p = intersect(origin, direction, s);
    if (!p)
      return {
        points,
        events,
        steps,
        passed: false,
        reason: "光线未碰到近顶点球面帽",
        last: origin,
      };
    points.push(p);
    const blocked =
      !ignoreLimits &&
      Math.abs(p[1]) > (s.stop ? d.stopRadius * stopFraction : s.clear) + 1e-9;
    events.push({
      point: p,
      surface: s.index ?? null,
      stop: Boolean(s.stop),
      blocked,
      direction: [...direction],
    });
    if (blocked)
      return {
        points,
        events,
        steps,
        passed: false,
        reason: s.stop ? "光阑截光" : "镜片净口径截光",
        last: p,
      };
    if (!s.stop) {
      const outgoing = refract(direction, p, s);
      if (!outgoing)
        return {
          points,
          events,
          steps,
          passed: false,
          reason: "全反射",
          last: p,
        };
      steps.push({ surface: s.index, point: p, incoming: direction, outgoing });
      direction = outgoing;
    }
    origin = p;
  }
  const t = (d.image - origin[0]) / direction[0],
    image = origin[1] + t * direction[1];
  points.push([d.image, image]);
  return {
    points,
    events,
    steps,
    passed: true,
    image,
    slope: direction[1] / direction[0],
    height: origin[1],
    last: origin,
  };
}
export function atlasState({
  type = 2,
  angle = 0,
  radius = 1.5,
  stopFraction = 1,
  progress = 1,
  selected = 0,
} = {}) {
  if (
    ![angle, radius, stopFraction, progress, selected].every(Number.isFinite) ||
    Math.abs(angle) > 3 ||
    radius < 0.2 ||
    radius > 4 ||
    stopFraction < 0.25 ||
    stopFraction > 1 ||
    progress < 0 ||
    progress > 1 ||
    !Number.isInteger(selected) ||
    selected < 0 ||
    selected > 5
  )
    throw RangeError("Invalid lens atlas state");
  const d = design(type),
    rays = Array.from({ length: 21 }, (_, i) =>
      traceRay(d, radius * (i / 10 - 1), angle * RAD, stopFraction),
    );
  const passed = rays.filter((r) => r.passed),
    ys = passed.map((r) => r.image),
    a = paraxialRay(d, 1),
    b = paraxialRay(d, 0, 1),
    scalarF = -1 / a.slope,
    scalarBfd = -a.height / a.slope;
  const tiny = traceRay(d, 0.001, 0, 1, true),
    tinyBfd = tiny.passed
      ? -tiny.height / tiny.slope + (tiny.last[0] - d.last)
      : null;
  return {
    d,
    input: { type, angle, radius, stopFraction },
    rays,
    passed: passed.length,
    span: ys.length ? Math.max(...ys) - Math.min(...ys) : null,
    selected: Math.min(selected, d.groups.length),
    progress,
    scalarF,
    scalarBfd,
    scalarAngularHeight: b.image,
    referenceHeight: b.image * angle * RAD,
    tinyBfd,
    referenceError: Math.max(
      Math.abs(scalarF - d.focalLength),
      Math.abs(scalarBfd - d.bfd),
    ),
  };
}
