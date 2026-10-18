import { fft2 } from "../wave/fft.js";
export const WAVELENGTH = 0.55,
  F_NUMBER = 4,
  SCALE = WAVELENGTH * F_NUMBER,
  CROP = 81;
export function parameters(input = {}) {
  const p = {
    shift: 0.95,
    front: 1.2,
    defocus: 2,
    diameter: 64,
    padding: 4,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.shift) > 3 ||
    p.front <= 0 ||
    p.front > 2 ||
    Math.abs(p.defocus) > 3 ||
    ![64, 128, 256].includes(p.diameter) ||
    ![4, 8].includes(p.padding)
  )
    throw RangeError("Invalid clipped pupil parameters");
  return p;
}
export function inside(p, x, y) {
  return x * x + y * y < 1 && (x - p.shift) ** 2 + y * y < p.front ** 2;
}
export function overlapArea(shift, radius) {
  const d = Math.abs(shift),
    r = 1,
    R = radius;
  if (d >= r + R) return 0;
  if (d <= Math.abs(r - R)) return Math.PI * Math.min(r, R) ** 2;
  const a = Math.acos((d * d + r * r - R * R) / (2 * d * r)),
    b = Math.acos((d * d + R * R - r * r) / (2 * d * R));
  return (
    r * r * a +
    R * R * b -
    0.5 * Math.sqrt((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R))
  );
}
export function clippedPsf(input = {}) {
  const p = parameters(input),
    size = p.diameter * p.padding,
    step = 2 / p.diameter;
  const real = new Float64Array(size * size),
    imag = real.slice(),
    sites = [];
  for (let j = -p.diameter / 2; j <= p.diameter / 2; j++)
    for (let i = -p.diameter / 2; i <= p.diameter / 2; i++) {
      const x = i * step,
        y = j * step;
      if (!inside(p, x, y)) continue;
      const phase = 2 * Math.PI * p.defocus * (x * x + y * y),
        k = (j + size / 2) * size + i + size / 2;
      real[k] = Math.cos(phase);
      imag[k] = Math.sin(phase);
      sites.push({ x, y, phase });
    }
  fft2(real, imag, size);
  const dx = SCALE / p.padding,
    denominator = size * size * (Math.PI / (step * step)) * dx * dx;
  const density = Float64Array.from(
    real,
    (v, i) => (v * v + imag[i] ** 2) / denominator,
  );
  const crop = Float64Array.from({ length: CROP * CROP }, (_, i) => {
    const x = (i % CROP) - (CROP - 1) / 2,
      y = Math.floor(i / CROP) - (CROP - 1) / 2;
    return density[((y + size) % size) * size + ((x + size) % size)];
  });
  const area = sites.length * step * step;
  return {
    p,
    size,
    step,
    dx,
    sites,
    density,
    crop,
    area,
    analyticArea: overlapArea(p.shift, p.front),
    throughput: area / Math.PI,
    energy: density.reduce((a, b) => a + b, 0) * dx * dx,
    cropEnergy: crop.reduce((a, b) => a + b, 0) * dx * dx,
  };
}
export function directDensity(model, qx, qy = 0) {
  let re = 0,
    im = 0;
  for (const s of model.sites) {
    const phase = s.phase - Math.PI * (qx * s.x + qy * s.y);
    re += Math.cos(phase);
    im += Math.sin(phase);
  }
  return (
    ((re * re + im * im) * model.step ** 4) / (4 * SCALE * SCALE * Math.PI)
  );
}
export function polarReference(
  input,
  qx = 0,
  qy = 0,
  radial = 128,
  angles = 1024,
) {
  const p = parameters(input);
  let re = 0,
    im = 0,
    area = 0;
  for (let k = 0; k < angles; k++) {
    const angle = (2 * Math.PI * (k + 0.5)) / angles,
      c = Math.cos(angle),
      s = Math.sin(angle),
      disc = p.front ** 2 - p.shift ** 2 * s * s;
    if (disc <= 0) continue;
    const lo = Math.max(0, p.shift * c - Math.sqrt(disc)),
      hi = Math.min(1, p.shift * c + Math.sqrt(disc));
    if (hi <= lo) continue;
    const weight = (Math.PI * (hi * hi - lo * lo)) / (radial * angles);
    for (let j = 0; j < radial; j++) {
      const r = Math.sqrt(lo * lo + ((hi * hi - lo * lo) * (j + 0.5)) / radial),
        x = r * c,
        y = r * s,
        phase = 2 * Math.PI * p.defocus * r * r - Math.PI * (qx * x + qy * y);
      re += weight * Math.cos(phase);
      im += weight * Math.sin(phase);
      area += weight;
    }
  }
  return { area, density: (re * re + im * im) / (4 * SCALE * SCALE * Math.PI) };
}
