// Air, thin groups at z=0 (+10D), z=50 (-10D), image plane z=150 mm.
// All shifts in mm. Positive theta denotes the incident direction in camera coordinates.
export const PERIOD_MS = 100;
export const PIXEL_MM = 0.004;
function inputs(input = {}) {
  const p = { amplitude: 0.5, ois: 0, ibis: 0, delay: 0, time: 25, ...input };
  if (
    !Object.values(p)
      .filter((v) => typeof v === "number")
      .every(Number.isFinite) ||
    ![p.amplitude, p.ois, p.ibis, p.delay, p.time].every(Number.isFinite) ||
    p.amplitude < 0 ||
    p.amplitude > 10 ||
    p.ois < 0 ||
    p.ois > 2 ||
    p.ibis < 0 ||
    p.ibis > 2 ||
    p.delay < 0 ||
    p.delay > 100
  )
    throw new RangeError("Invalid motion or compensation parameters");
  return p;
}
// Decenter modifies the angle kick: theta_out=theta_in-Phi*(y-delta).
export function traceShift(theta, delta, height = 0) {
  if (![theta, delta, height].every(Number.isFinite))
    throw new RangeError("Invalid affine ray");
  const u1 = theta - 0.01 * height,
    y2 = height + 50 * u1;
  const u2 = u1 + 0.01 * (y2 - delta);
  return { height, theta, u1, y2, u2, image: y2 + 100 * u2 };
}
export function motionSample(input = {}, time) {
  const p = inputs(input),
    t = time ?? p.time;
  if (!Number.isFinite(t)) throw new RangeError("Invalid sample time");
  const theta = p.amplitude * 1e-3 * Math.sin((2 * Math.PI * t) / PERIOD_MS);
  const delayed =
    p.amplitude * 1e-3 * Math.sin((2 * Math.PI * (t - p.delay)) / PERIOD_MS);
  const delta = p.ois * 200 * delayed,
    sensor = p.ibis * 200 * delayed;
  const ray = traceShift(theta, delta),
    base = traceShift(theta, 0);
  return {
    time: t,
    theta,
    delta,
    sensor,
    ray,
    uncorrected: base.image,
    image: ray.image,
    residual: ray.image - sensor,
  };
}
// Independent closed-form displacement reference, without any ray propagation.
export function motionTruth(input = {}, time) {
  const p = inputs(input),
    t = time ?? p.time;
  if (!Number.isFinite(t)) throw new RangeError("Invalid sample time");
  const a = 200 * p.amplitude * 1e-3,
    phase = (2 * Math.PI * t) / PERIOD_MS,
    lag = (2 * Math.PI * p.delay) / PERIOD_MS;
  return a * (Math.sin(phase) - (p.ois + p.ibis) * Math.sin(phase - lag));
}
export function motionExperiment(input = {}, samples = 512) {
  const p = inputs(input);
  if (!Number.isInteger(samples) || samples < 8 || samples > 65536)
    throw new RangeError("Invalid integration grid");
  let sum = 0,
    square = 0;
  for (let i = 0; i < samples; i++) {
    const r = motionSample(p, ((i + 0.5) * PERIOD_MS) / samples).residual;
    sum += r / samples;
    square += (r * r) / samples;
  }
  const g = p.ois + p.ibis,
    lag = (2 * Math.PI * p.delay) / PERIOD_MS;
  const amplitude =
    200 *
    p.amplitude *
    1e-3 *
    Math.hypot(1 - g * Math.cos(lag), g * Math.sin(lag));
  return {
    current: motionSample(p),
    mean: sum,
    rms: Math.sqrt(square),
    truthRms: amplitude / Math.sqrt(2),
    truthAmplitude: amplitude,
    series: Array.from({ length: 201 }, (_, i) =>
      motionSample(p, (i * PERIOD_MS) / 200),
    ),
  };
}
