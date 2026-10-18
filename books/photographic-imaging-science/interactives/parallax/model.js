export const WIDTH = 96,
  HEIGHT = 64,
  FOCAL = 80,
  NEAR = 2,
  FAR = 6;
const CX = (WIDTH - 1) / 2,
  CY = (HEIGHT - 1) / 2;
export function parameters(input = {}) {
  const p = { translation: 0.15, yaw: 1, plane: 6, progress: 1, ...input };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.translation) > 0.3 ||
    Math.abs(p.yaw) > 3 ||
    p.plane < 2 ||
    p.plane > 6 ||
    p.progress < 0 ||
    p.progress > 1
  )
    throw RangeError("Invalid parallax parameters");
  return p;
}
const board = (x, y) => Math.abs(x) < 0.55 && Math.abs(y) < 0.42;
export function ray(x, y, pose = { translation: 0, yaw: 0 }) {
  const theta = (pose.yaw * Math.PI) / 180,
    c = Math.cos(theta),
    s = Math.sin(theta),
    u = (x - CX) / FOCAL,
    v = (y - CY) / FOCAL;
  return {
    origin: [pose.translation, 0, 0],
    direction: [c * u + s, v, -s * u + c],
  };
}
export function project(point, pose = { translation: 0, yaw: 0 }) {
  const theta = (pose.yaw * Math.PI) / 180,
    c = Math.cos(theta),
    s = Math.sin(theta),
    dx = point[0] - pose.translation,
    z = point[2],
    a = c * dx - s * z,
    b = s * dx + c * z;
  return [CX + (FOCAL * a) / b, CY + (FOCAL * point[1]) / b];
}
export function intersect(x, y, pose) {
  const r = ray(x, y, pose),
    d = r.direction,
    z = NEAR,
    t = z / d[2],
    nx = r.origin[0] + t * d[0],
    ny = t * d[1];
  if (board(nx, ny)) return { point: [nx, ny, NEAR], depth: NEAR };
  const b = FAR / d[2];
  return { point: [r.origin[0] + b * d[0], b * d[1], FAR], depth: FAR };
}
export function intensity([x, y, z]) {
  return z === NEAR
    ? 0.55 +
        0.23 * Math.cos(2 * Math.PI * 3 * x) +
        0.12 * Math.sin(2 * Math.PI * 4 * y)
    : 0.4 +
        0.18 * Math.cos(2 * Math.PI * (2 * x + y)) +
        0.12 * Math.sin(2 * Math.PI * (1.7 * y - 0.4 * x));
}
export function capture(pose) {
  const values = new Float64Array(WIDTH * HEIGHT),
    depth = values.slice();
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        h = intersect(x, y, pose);
      values[i] = intensity(h.point);
      depth[i] = h.depth;
    }
  return { values, depth, pose };
}
export function resample(values, x, y) {
  if (x < 0 || x >= WIDTH - 1 || y < 0 || y >= HEIGHT - 1) return null;
  const a = Math.floor(x),
    b = Math.floor(y),
    u = x - a,
    v = y - b,
    k = b * WIDTH + a;
  return (
    values[k] * (1 - u) * (1 - v) +
    values[k + 1] * u * (1 - v) +
    values[k + WIDTH] * (1 - u) * v +
    values[k + WIDTH + 1] * u * v
  );
}
export function compensate(observation, pose, plane) {
  const values = new Float64Array(WIDTH * HEIGHT),
    valid = new Uint8Array(values.length);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        point = [((x - CX) * plane) / FOCAL, ((y - CY) * plane) / FOCAL, plane],
        [u, v] = project(point, pose),
        sample = resample(observation, u, v);
      if (sample !== null) {
        values[i] = sample;
        valid[i] = 1;
      }
    }
  return { values, valid };
}
export function parallax(input = {}) {
  const p = parameters(input),
    pose = { translation: p.translation * p.progress, yaw: p.yaw * p.progress },
    reference = capture({ translation: 0, yaw: 0 }),
    moving = capture(pose),
    global = compensate(moving.values, pose, p.plane);
  const oracle = new Float64Array(WIDTH * HEIGHT),
    common = new Uint8Array(oracle.length),
    visible = new Uint8Array(oracle.length),
    reason = new Uint8Array(oracle.length),
    error = oracle.slice();
  let count = 0,
    lost = 0,
    outside = 0,
    occluded = 0,
    boundary = 0,
    globalSquare = 0,
    oracleSquare = 0,
    nearSquare = 0,
    farSquare = 0,
    nearCount = 0,
    farCount = 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        depth = reference.depth[i],
        point = [((x - CX) * depth) / FOCAL, ((y - CY) * depth) / FOCAL, depth],
        [u, v] = project(point, pose),
        sample = resample(moving.values, u, v);
      if (sample === null) {
        lost++;
        outside++;
        reason[i] = 1;
        continue;
      }
      const hit = intersect(u, v, pose);
      if (hit.depth !== depth) {
        lost++;
        occluded++;
        reason[i] = 2;
        continue;
      }
      // Exclude interpolation neighborhoods straddling a depth boundary for both routes.
      const a = Math.floor(u),
        b = Math.floor(v),
        indices = [
          b * WIDTH + a,
          b * WIDTH + a + 1,
          (b + 1) * WIDTH + a,
          (b + 1) * WIDTH + a + 1,
        ];
      if (!indices.every((j) => moving.depth[j] === depth)) {
        lost++;
        boundary++;
        reason[i] = 3;
        continue;
      }
      visible[i] = 1;
      oracle[i] = sample;
      if (!global.valid[i]) continue;
      common[i] = 1;
      count++;
      error[i] = global.values[i] - reference.values[i];
      globalSquare += error[i] ** 2;
      oracleSquare += (sample - reference.values[i]) ** 2;
      if (depth === NEAR) {
        nearSquare += error[i] ** 2;
        nearCount++;
      } else {
        farSquare += error[i] ** 2;
        farCount++;
      }
    }
  return {
    p,
    pose,
    reference,
    moving,
    global,
    oracle,
    common,
    visible,
    reason,
    error,
    count,
    lost,
    outside,
    occluded,
    boundary,
    rmse: count ? Math.sqrt(globalSquare / count) : null,
    oracleRmse: count ? Math.sqrt(oracleSquare / count) : null,
    nearRmse: nearCount ? Math.sqrt(nearSquare / nearCount) : null,
    farRmse: farCount ? Math.sqrt(farSquare / farCount) : null,
  };
}
