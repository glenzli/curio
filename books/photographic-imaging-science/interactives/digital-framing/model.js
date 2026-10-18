export const WIDTH = 160,
  HEIGHT = 100;
export const TERMS = [
  [0.12, 0.8, 0, 0.2],
  [0.1, 0, 1.6, 0.7],
  [0.08, 3, 1.4, 0.4],
  [0.06, 5.5, -1.2, 1],
];
export const sinc = (x) => (Math.abs(x) < 1e-10 ? 1 : Math.sin(x) / x);
function shapeIntervals(y) {
  const spans = [];
  if (y >= -0.4 && y < -0.13) spans.push([-0.72, -0.45, 0.08]);
  const dy = y - 0.28;
  if (Math.abs(dy) < 0.13) {
    const h = Math.sqrt(0.13 ** 2 - dy ** 2);
    spans.push([0.55 - h, 0.55 + h, 0.92]);
  }
  return spans;
}
function background(x, y) {
  return (
    0.5 +
    TERMS.reduce(
      (v, [a, kx, ky, p]) =>
        v + a * Math.cos(2 * Math.PI * (kx * x + ky * y) + p),
      0,
    )
  );
}
export function scene(x, y) {
  for (const [lo, hi, value] of shapeIntervals(y))
    if (x >= lo && x < hi) return value;
  return background(x, y);
}
function integral(lo, hi, y) {
  return (
    0.5 * (hi - lo) +
    TERMS.reduce((sum, [a, kx, ky, p]) => {
      const phase = 2 * Math.PI * ky * y + p,
        w = 2 * Math.PI * kx;
      return (
        sum +
        (kx === 0
          ? a * Math.cos(phase) * (hi - lo)
          : (a * (Math.sin(w * hi + phase) - Math.sin(w * lo + phase))) / w)
      );
    }, 0)
  );
}
export function parameters(input = {}) {
  const p = {
    shift: 6,
    breathing: 10,
    crop: 1.2,
    blur: 0,
    shiftError: 0,
    scaleError: 0,
    phase: 0.25,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.breathing) >= 40 ||
    p.crop < 0.8 ||
    p.crop > 3 ||
    p.blur < 0 ||
    p.blur > 30 ||
    Math.abs(p.scaleError) >= 30
  )
    throw new RangeError("Invalid digital framing parameters");
  const f = Math.sin(2 * Math.PI * p.phase),
    scale = 1 + (p.breathing / 100) * f,
    displacement = p.shift * f;
  return {
    ...p,
    scale,
    displacement,
    estimatedScale: scale * (1 + p.scaleError / 100),
    estimatedShift: displacement + p.shiftError,
  };
}
// A point moves uniformly by blur raw pixels during one exposure. Integrating
// each known cosine exactly gives its signed sinc attenuation; the two constant
// fiducials replace the background integral over their intersecting chords.
export function exposed(x, y, p) {
  const u = (x - p.displacement) / ((p.scale * WIDTH) / 2),
    v = y / ((p.scale * WIDTH) / 2);
  const width = p.blur / ((p.scale * WIDTH) / 2);
  if (width < 1e-10) return scene(u, v);
  const lo = u - width / 2,
    hi = u + width / 2;
  let result =
    0.5 +
    TERMS.reduce(
      (s, [a, kx, ky, phase]) =>
        s +
        a *
          sinc(Math.PI * kx * width) *
          Math.cos(2 * Math.PI * (kx * u + ky * v) + phase),
      0,
    );
  for (const [left, right, value] of shapeIntervals(v)) {
    const a = Math.max(left, lo),
      b = Math.min(right, hi);
    if (b > a) result += (value * (b - a) - integral(a, b, v)) / width;
  }
  return result;
}
function bilinear(data, x, y) {
  if (
    x < -1e-10 ||
    y < -1e-10 ||
    x > WIDTH - 1 + 1e-10 ||
    y > HEIGHT - 1 + 1e-10
  )
    return null;
  x = Math.max(0, Math.min(WIDTH - 1, x));
  y = Math.max(0, Math.min(HEIGHT - 1, y));
  const i = Math.floor(x),
    j = Math.floor(y),
    i1 = Math.min(i + 1, WIDTH - 1),
    j1 = Math.min(j + 1, HEIGHT - 1),
    a = x - i,
    b = y - j;
  return (
    (1 - b) * ((1 - a) * data[j * WIDTH + i] + a * data[j * WIDTH + i1]) +
    b * ((1 - a) * data[j1 * WIDTH + i] + a * data[j1 * WIDTH + i1])
  );
}
export function digitalFrame(input = {}) {
  const p = parameters(input),
    raw = new Float64Array(WIDTH * HEIGHT),
    truth = new Float64Array(raw.length),
    corrected = new Float64Array(raw.length),
    valid = new Uint8Array(raw.length);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        u = x + 0.5 - WIDTH / 2,
        v = y + 0.5 - HEIGHT / 2;
      raw[i] = exposed(u, v, p);
      truth[i] = scene(u / ((p.crop * WIDTH) / 2), v / ((p.crop * WIDTH) / 2));
    }
  let count = 0,
    squareError = 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x,
        u = x + 0.5 - WIDTH / 2,
        v = y + 0.5 - HEIGHT / 2;
      const sourceX =
        (p.estimatedScale / p.crop) * u + p.estimatedShift + WIDTH / 2 - 0.5;
      const sourceY = (p.estimatedScale / p.crop) * v + HEIGHT / 2 - 0.5;
      const value = bilinear(raw, sourceX, sourceY);
      if (value !== null) {
        valid[i] = 1;
        corrected[i] = value;
        count++;
        squareError += (value - truth[i]) ** 2;
      }
    }
  return {
    p,
    raw,
    truth,
    corrected,
    valid,
    count,
    coverage: count / raw.length,
    rmse: count ? Math.sqrt(squareError / count) : null,
    sourceWidth: (WIDTH * p.estimatedScale) / p.crop,
    sourceHeight: (HEIGHT * p.estimatedScale) / p.crop,
    motionMtf: Math.abs(sinc(Math.PI * 0.1 * p.blur)),
    motionOtf: sinc(Math.PI * 0.1 * p.blur),
  };
}
