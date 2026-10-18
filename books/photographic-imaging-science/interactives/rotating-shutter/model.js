export const WIDTH = 80,
  HEIGHT = 80;
export function parameters(input = {}) {
  const p = {
    speed: 20,
    scan: 18,
    exposure: 1,
    blades: 2,
    phase: 10,
    progress: 1,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.speed) > 60 ||
    p.scan < 0 ||
    p.scan > 40 ||
    p.exposure <= 0 ||
    p.exposure > 20 ||
    !Number.isInteger(p.blades) ||
    p.blades < 1 ||
    p.blades > 4 ||
    Math.abs(p.phase) > 360 ||
    p.progress < 0 ||
    p.progress > 1
  )
    throw RangeError("Invalid rotating shutter parameters");
  return p;
}
const HALF = (5 * Math.PI) / 180;
function primitive(x, period) {
  const q = Math.floor((x + HALF) / period),
    r = x + HALF - q * period;
  return q * 2 * HALF + Math.min(2 * HALF, Math.max(0, r));
}
export function bladeFraction(angle, start, end, speed, phase, blades) {
  const period = (2 * Math.PI) / blades,
    omega = (2 * Math.PI * speed) / 1000,
    a = (phase * Math.PI) / 180 - angle;
  if (end <= start) return 0;
  if (omega === 0) {
    const x = (((a + HALF) % period) + period) % period;
    return x < 2 * HALF ? 1 : 0;
  }
  return Math.max(
    0,
    Math.min(
      1,
      (primitive(a + omega * end, period) -
        primitive(a + omega * start, period)) /
        (omega * (end - start)),
    ),
  );
}
export function pixel(x, y, start, end, p) {
  const dx = x - (WIDTH - 1) / 2,
    dy = y - (HEIGHT - 1) / 2,
    r = Math.hypot(dx, dy);
  if (r > 31) return 0.07;
  if (r < 3) return 0.9;
  return (
    0.07 +
    0.83 *
      bladeFraction(Math.atan2(dy, dx), start, end, p.speed, p.phase, p.blades)
  );
}
export function rotatingShutter(input = {}) {
  const p = parameters(input),
    now = (p.scan + p.exposure) * p.progress;
  const rolling = new Float64Array(WIDTH * HEIGHT),
    global = rolling.slice(),
    instant = rolling.slice();
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        start = (p.scan * y) / (HEIGHT - 1),
        end = Math.max(start, Math.min(start + p.exposure, now));
      const stop = Math.min(p.exposure, now),
        fraction = now >= start + p.exposure ? 1 : (end - start) / p.exposure;
      rolling[i] = pixel(x, y, start, end, p) * fraction;
      global[i] = (pixel(x, y, 0, stop, p) * stop) / p.exposure;
      const angle = p.phase + (360 * p.speed * now) / 1000;
      instant[i] = pixel(x, y, 0, 1, { ...p, speed: 0, phase: angle });
    }
  return {
    p,
    now,
    rolling,
    global,
    instant,
    scanAngle: (360 * p.speed * p.scan) / 1000,
    blurAngle: (360 * Math.abs(p.speed) * p.exposure) / 1000,
  };
}
export function midpointReference(angle, start, end, p, steps = 16384) {
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const t = start + ((end - start) * (i + 0.5)) / steps,
      phase =
        (p.phase * Math.PI) / 180 + (2 * Math.PI * p.speed * t) / 1000 - angle;
    sum +=
      (Math.cos(p.blades * phase) > Math.cos(p.blades * HALF) ? 1 : 0) / steps;
  }
  return sum;
}
