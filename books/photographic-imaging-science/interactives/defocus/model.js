import { fft2 } from "../wave/fft.js";
export const SIDES = [0, 6, 5, 4],
  NAMES = ["圆形", "正六边形", "正五边形", "正方形"];
export const WAVELENGTH_UM = 0.55,
  F_NUMBER = 8,
  SCALE_UM = WAVELENGTH_UM * F_NUMBER;
export const WHITE = Math.PI / (4 * SCALE_UM ** 2),
  CROP = 81;
export function parameters(input = {}) {
  const p = {
    shape: 0,
    amount: 0.45,
    spherical: 0.12,
    scan: 0,
    diameter: 128,
    padding: 4,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    ![0, 1, 2, 3].includes(p.shape) ||
    p.amount < 0 ||
    p.amount > 0.6 ||
    Math.abs(p.spherical) > 0.25 ||
    Math.abs(p.scan) > 1 ||
    ![64, 128, 256].includes(p.diameter) ||
    ![4, 8].includes(p.padding)
  )
    throw RangeError("Invalid equal-area defocus parameters");
  return p;
}
// Unit-circle area pi, also for every polygon. Edges have outward normal at angle 0.
export function radialLimit(shape, theta) {
  const n = SIDES[shape];
  if (!n) return 1;
  const R = Math.sqrt((2 * Math.PI) / (n * Math.sin((2 * Math.PI) / n))),
    a = R * Math.cos(Math.PI / n),
    sector = (2 * Math.PI) / n;
  const delta =
    ((((theta + Math.PI / n) % sector) + sector) % sector) - Math.PI / n;
  return a / Math.cos(delta);
}
export function inside(shape, x, y) {
  return Math.hypot(x, y) < radialLimit(shape, Math.atan2(y, x));
}
export function waves(x, y, c, spherical) {
  const r2 = x * x + y * y;
  return (
    c * Math.sqrt(3) * (2 * r2 - 1) +
    spherical * Math.sqrt(5) * (6 * r2 * r2 - 6 * r2 + 1)
  );
}
export function pupil(input = {}, c = 0) {
  const p = parameters(input),
    size = p.diameter * p.padding,
    step = 2 / p.diameter;
  const real = new Float64Array(size * size),
    imaginary = new Float64Array(real.length),
    sites = [];
  // Polygons fit in [-1.5,1.5]^2; padding leaves the same physical FFT field.
  const limit = Math.ceil(1.5 / step);
  for (let j = -limit; j <= limit; j++)
    for (let i = -limit; i <= limit; i++) {
      const x = i * step,
        y = j * step;
      if (!inside(p.shape, x, y)) continue;
      const phase = 2 * Math.PI * waves(x, y, c, p.spherical),
        k = (j + size / 2) * size + i + size / 2;
      real[k] = Math.cos(phase);
      imaginary[k] = Math.sin(phase);
      sites.push({ x, y, phase });
    }
  return {
    p,
    size,
    step,
    real,
    imaginary,
    sites,
    area: sites.length * step * step,
  };
}
// Fixed nominal lambda*N coordinates for small longitudinal defocus; no per-image stretch.
export function propagate(input = {}, c = 0) {
  if (!Number.isFinite(c) || Math.abs(c) > 0.6)
    throw RangeError("Unsupported defocus coefficient");
  const g = pupil(input, c),
    re = g.real.slice(),
    im = g.imaginary.slice();
  fft2(re, im, g.size);
  const raw = Float64Array.from(re, (v, i) => v * v + im[i] * im[i]),
    energy = raw.reduce((a, b) => a + b, 0),
    stepUm = SCALE_UM / g.p.padding;
  const density = raw.map((v) => v / (energy * stepUm ** 2));
  const crop = Float64Array.from({ length: CROP * CROP }, (_, i) => {
    const x = (i % CROP) - (CROP - 1) / 2,
      y = Math.floor(i / CROP) - (CROP - 1) / 2;
    return density[((y + g.size) % g.size) * g.size + ((x + g.size) % g.size)];
  });
  return {
    ...g,
    c,
    density,
    crop,
    stepUm,
    integral: density.reduce((a, b) => a + b, 0) * stepUm ** 2,
    parseval: energy / (g.size * g.size * g.sites.length),
    retained: crop.reduce((a, b) => a + b, 0) * stepUm ** 2,
    onAxis: density[0],
  };
}
// Independent finite-pupil phasor sum; never reads FFT arrays.
export function directDensity(g, qx, qy = 0) {
  let re = 0,
    im = 0;
  for (const s of g.sites) {
    const a = s.phase - Math.PI * (qx * s.x + qy * s.y);
    re += Math.cos(a);
    im += Math.sin(a);
  }
  return (
    ((re * re + im * im) * g.step ** 2) / (4 * SCALE_UM ** 2 * g.sites.length)
  );
}
// Continuous polar midpoint quadrature; radial weights include the polygon boundary.
export function continuousDensity(
  input = {},
  c = 0,
  qx = 0,
  qy = 0,
  radial = 128,
  angles = 512,
) {
  const p = parameters(input);
  let re = 0,
    im = 0,
    area = 0;
  for (let k = 0; k < angles; k++) {
    const theta = (2 * Math.PI * (k + 0.5)) / angles,
      R = radialLimit(p.shape, theta),
      weight = (Math.PI * R * R) / (radial * angles);
    for (let j = 0; j < radial; j++) {
      const r = R * Math.sqrt((j + 0.5) / radial),
        x = r * Math.cos(theta),
        y = r * Math.sin(theta),
        phase =
          2 * Math.PI * waves(x, y, c, p.spherical) -
          Math.PI * (qx * x + qy * y);
      re += weight * Math.cos(phase);
      im += weight * Math.sin(phase);
      area += weight;
    }
  }
  return { density: (re * re + im * im) / (4 * SCALE_UM ** 2 * area), area };
}
export const displacementUm = (c) =>
  -16 * Math.sqrt(3) * WAVELENGTH_UM * F_NUMBER ** 2 * c;
