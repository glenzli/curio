import { randomGenerator, normal } from "../noise/model.js";
export const sites = [
  [0, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
export function focalSurface(
  x,
  y,
  { curvature = 60, astigmatism = 15, tilt = 10, trial = 1 } = {},
) {
  const u = (x * x + y * y) / 2,
    remount = (trial - 1) * 4;
  return [
    (curvature + astigmatism) * u + tilt * x + remount * y,
    (curvature - astigmatism) * u + tilt * x + remount * y,
  ];
}
export const response = (defocus, frequency = 40) =>
  Math.exp(
    -2 *
      Math.PI ** 2 *
      (1.8 ** 2 + (0.08 * defocus) ** 2) *
      (frequency * 0.001) ** 2,
  );
export function selectObservedPeak(samples) {
  if (
    !samples.length ||
    samples.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))
  )
    throw RangeError("Invalid observed focus bracket");
  return samples.reduce((a, b) => (b[1] > a[1] ? b : a));
}
export function focusSurvey(input = {}) {
  const p = {
    curvature: 60,
    astigmatism: 15,
    tilt: 10,
    trial: 1,
    sensor: 0,
    focus: 0,
    noise: 0.005,
    frequency: 40,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.noise < 0 ||
    p.frequency <= 0 ||
    !Number.isInteger(p.trial) ||
    p.trial < 1 ||
    p.trial > 3
  )
    throw RangeError("Invalid synthetic field");
  const rng = randomGenerator(17000 + p.trial);
  const locations = sites.map(([x, y]) => {
    const u = (x * x + y * y) / 2,
      trueFoci = focalSurface(x, y, p).map((z) => z - p.sensor * u);
    const scans = trueFoci.map((z) =>
      Array.from({ length: 121 }, (_, i) => {
        const f = -300 + i * 5;
        return [f, response(f - z, p.frequency) + p.noise * normal(rng)];
      }),
    );
    const estimated = scans.map(selectObservedPeak);
    return {
      x,
      y,
      trueFoci,
      scans,
      estimated,
      current: trueFoci.map((z) => response(p.focus - z, p.frequency)),
    };
  });
  return {
    p,
    locations,
    base: response(0, p.frequency),
    spread:
      Math.max(
        ...locations.slice(1).map((l) => (l.trueFoci[0] + l.trueFoci[1]) / 2),
      ) -
      Math.min(
        ...locations.slice(1).map((l) => (l.trueFoci[0] + l.trueFoci[1]) / 2),
      ),
  };
}
