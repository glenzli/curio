// Ideal incoherent translated-image branches. Coordinates use pixel pitch p;
// separation is the distance between the two branches, not their half-offset.
export const PITCH_UM = 4;
export const WIDTH = 32, HEIGHT = 16, UPSCALE = 8;
export const DEFAULTS = Object.freeze({
  mode: 2, separation: 1, frequency: 0.65, angle: 0, phase: 0.08, width: 1,
});
export function parameters(input = {}) {
  const p = { ...DEFAULTS, ...input };
  for (const [key, low, high] of [
    ["mode", 0, 2], ["separation", 0, 2], ["frequency", 0.05, 1.5],
    ["angle", 0, 90], ["phase", 0, 1], ["width", 0, 1],
  ]) if (!Number.isFinite(p[key]) || p[key] < low || p[key] > high)
    throw new RangeError(`Invalid ${key}`);
  if (!Number.isInteger(p.mode)) throw new RangeError("Invalid split mode");
  return p;
}
export function sinc(u) {
  return Math.abs(u) < 1e-12 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
}
export function branches(input = {}) {
  const p = parameters(input), half = p.separation / 2;
  if (p.mode === 0 || half === 0) return [{ x: 0, y: 0, weight: 1 }];
  if (p.mode === 1) return [-1, 1].map(x => ({ x: x * half, y: 0, weight: 0.5 }));
  return [-1, 1].flatMap(y => [-1, 1].map(x => ({
    x: x * half, y: y * half, weight: 0.25,
  })));
}
export function gains(input = {}, frequency) {
  const p = parameters(input), f = frequency ?? p.frequency;
  if (!Number.isFinite(f) || f < 0) throw new RangeError("Invalid frequency");
  const theta = p.angle * Math.PI / 180,
    fx = f * Math.cos(theta), fy = f * Math.sin(theta),
    optical = p.mode === 0 ? 1 : Math.cos(Math.PI * p.separation * fx) *
      (p.mode === 2 ? Math.cos(Math.PI * p.separation * fy) : 1),
    pixel = sinc(p.width * fx) * sinc(p.width * fy);
  return { fx, fy, optical, pixel, total: optical * pixel };
}
export function sourceAt(x, y, input = {}) {
  const p = parameters(input), theta = p.angle * Math.PI / 180;
  return 0.5 + 0.4 * Math.cos(2 * Math.PI * (
    p.frequency * (Math.cos(theta) * x + Math.sin(theta) * y) + p.phase
  ));
}
// Direct shifted-image summation is independent of the closed cosine OTF.
export function shiftedAt(x, y, input = {}) {
  return branches(input).reduce((sum, b) =>
    sum + b.weight * sourceAt(x - b.x, y - b.y, input), 0);
}
// Composite eight-node Gauss-Legendre integration in each pixel direction. This reference
// calls only the shifted continuous image, never gains() or a sinc formula.
const NODES = [-0.9602898564975363, -0.7966664774136267,
  -0.5255324099163290, -0.1834346424956498, 0.1834346424956498,
  0.5255324099163290, 0.7966664774136267, 0.9602898564975363];
const WEIGHTS = [0.1012285362903763, 0.2223810344533745,
  0.3137066458778873, 0.3626837833783620, 0.3626837833783620,
  0.3137066458778873, 0.2223810344533745, 0.1012285362903763];
const COMPOSITE_NODES = [-0.5, 0.5].flatMap(c => NODES.map(x => c + x / 2));
const COMPOSITE_WEIGHTS = [...WEIGHTS, ...WEIGHTS].map(w => w / 2);
export function directPixelReference(x, y, input = {}) {
  const p = parameters(input);
  if (p.width === 0) return shiftedAt(x, y, p);
  let sum = 0;
  for (let i = 0; i < COMPOSITE_NODES.length; i++)
    for (let j = 0; j < COMPOSITE_NODES.length; j++)
      sum += COMPOSITE_WEIGHTS[i] * COMPOSITE_WEIGHTS[j] * shiftedAt(
        x + p.width * COMPOSITE_NODES[i] / 2, y + p.width * COMPOSITE_NODES[j] / 2, p,
      ) / 4;
  return sum;
}
export function lowpass(input = {}) {
  const p = parameters(input), g = gains(p), kernel = branches(p),
    aliasX = g.fx - Math.floor(g.fx + 0.5),
    aliasY = g.fy - Math.floor(g.fy + 0.5),
    theta = p.angle * Math.PI / 180,
    nyquist = 0.5 / Math.max(Math.abs(Math.cos(theta)), Math.abs(Math.sin(theta))),
    original = new Float64Array(WIDTH * HEIGHT * UPSCALE ** 2),
    filtered = new Float64Array(original.length),
    unfilteredSamples = new Float64Array(WIDTH * HEIGHT),
    filteredSamples = new Float64Array(WIDTH * HEIGHT),
    aliasSamples = new Float64Array(WIDTH * HEIGHT);
  // Validate once per frame; keep the continuous display as direct image shifts.
  const inputAt = (x, y) => 0.5 + 0.4 * Math.cos(
    2 * Math.PI * (g.fx * x + g.fy * y + p.phase),
  );
  for (let y = 0; y < HEIGHT * UPSCALE; y++)
    for (let x = 0; x < WIDTH * UPSCALE; x++) {
      const u = (x + 0.5) / UPSCALE - 0.5,
        v = (y + 0.5) / UPSCALE - 0.5, i = y * WIDTH * UPSCALE + x;
      original[i] = inputAt(u, v);
      filtered[i] = kernel.reduce((sum, b) =>
        sum + b.weight * inputAt(u - b.x, v - b.y), 0);
    }
  let aliasDifference = 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        wave = Math.cos(2 * Math.PI * (g.fx * x + g.fy * y + p.phase));
      unfilteredSamples[i] = 0.5 + 0.4 * g.pixel * wave;
      filteredSamples[i] = 0.5 + 0.4 * g.total * wave;
      aliasSamples[i] = 0.5 + 0.4 * g.total * Math.cos(
        2 * Math.PI * (aliasX * x + aliasY * y + p.phase),
      );
      aliasDifference = Math.max(aliasDifference,
        Math.abs(aliasSamples[i] - filteredSamples[i]));
    }
  const probe = { x: 8, y: 4 }, index = probe.y * WIDTH + probe.x,
    direct = directPixelReference(probe.x, probe.y, p);
  return { ...p, ...g, kernel, original, filtered,
    unfilteredSamples, filteredSamples, aliasX, aliasY, nyquist,
    aliasDifference, probe, analytic: filteredSamples[index], direct,
    referenceError: Math.abs(filteredSamples[index] - direct) };
}
