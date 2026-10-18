import { fft2 } from "../wave/fft.js";
export const WAVELENGTH = 0.55,
  CROP = 161,
  DISPLAY_STEP = 1.1,
  WHITE = Math.PI / (4 * (WAVELENGTH * 8) ** 2);
export function parameters(input = {}) {
  const p = {
    blades: 7,
    roundness: 0,
    rotation: 0,
    fNumber: 8,
    diameter: 128,
    padding: 4,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    !Number.isInteger(p.blades) ||
    p.blades < 3 ||
    p.blades > 12 ||
    p.roundness < 0 ||
    p.roundness > 1 ||
    Math.abs(p.rotation) > 360 ||
    p.fNumber < 4 ||
    p.fNumber > 16 ||
    ![128, 256].includes(p.diameter) ||
    ![4, 8].includes(p.padding)
  )
    throw RangeError("Invalid starburst aperture parameters");
  return p;
}
export function radialLimit(p, theta) {
  const a = Math.PI / p.blades,
    sector = 2 * a,
    angle = theta - (p.rotation * Math.PI) / 180;
  const wrapped = ((((angle + a) % sector) + sector) % sector) - a;
  return ((1 - p.roundness) * Math.cos(a)) / Math.cos(wrapped) + p.roundness;
}
export function directions(blades) {
  const values = new Set();
  for (let k = 0; k < blades; k++)
    for (const opposite of [0, 180])
      values.add(
        Math.round((((360 * k) / blades + opposite) % 360) * 1e8) / 1e8,
      );
  return [...values].sort((a, b) => a - b);
}
export function starburst(input = {}) {
  const p = parameters(input),
    size = p.diameter * p.padding,
    step = 2 / p.diameter,
    scale = WAVELENGTH * p.fNumber,
    dx = scale / p.padding;
  const real = new Float64Array(size * size),
    imag = real.slice(),
    sites = [];
  for (let j = -p.diameter / 2; j <= p.diameter / 2; j++)
    for (let i = -p.diameter / 2; i <= p.diameter / 2; i++) {
      const x = i * step,
        y = j * step;
      if (Math.hypot(x, y) >= radialLimit(p, Math.atan2(y, x))) continue;
      real[(j + size / 2) * size + i + size / 2] = 1;
      sites.push({ x, y });
    }
  fft2(real, imag, size);
  const denominator = size * size * sites.length * dx * dx;
  const density = Float64Array.from(
    real,
    (v, i) => (v * v + imag[i] ** 2) / denominator,
  );
  const at = (x, y) =>
    density[((y + size) % size) * size + ((x + size) % size)];
  const crop = Float64Array.from({ length: CROP * CROP }, (_, i) => {
    const px = (((i % CROP) - (CROP - 1) / 2) * DISPLAY_STEP) / dx,
      py = ((Math.floor(i / CROP) - (CROP - 1) / 2) * DISPLAY_STEP) / dx;
    if (Math.abs(px) >= size / 2 - 1 || Math.abs(py) >= size / 2 - 1) return 0;
    const x = Math.floor(px),
      y = Math.floor(py),
      u = px - x,
      v = py - y;
    return (
      at(x, y) * (1 - u) * (1 - v) +
      at(x + 1, y) * u * (1 - v) +
      at(x, y + 1) * (1 - u) * v +
      at(x + 1, y + 1) * u * v
    );
  });
  let continuousArea = 0;
  for (let k = 0; k < 8192; k++)
    continuousArea +=
      (Math.PI * radialLimit(p, (2 * Math.PI * (k + 0.5)) / 8192) ** 2) / 8192;
  let retained = 0;
  const half = (CROP * DISPLAY_STEP) / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (
        Math.abs((x < size / 2 ? x : x - size) * dx) < half &&
        Math.abs((y < size / 2 ? y : y - size) * dx) < half
      )
        retained += density[y * size + x] * dx * dx;
  return {
    p,
    size,
    step,
    scale,
    dx,
    sites,
    density,
    crop,
    area: sites.length * step * step,
    continuousArea,
    energy: density.reduce((a, b) => a + b, 0) * dx * dx,
    retained,
  };
}
export function directDensity(m, qx, qy) {
  let re = 0,
    im = 0;
  for (const s of m.sites) {
    const t = -Math.PI * (qx * s.x + qy * s.y);
    re += Math.cos(t);
    im += Math.sin(t);
  }
  return (
    ((re * re + im * im) * m.step ** 2) / (4 * m.scale ** 2 * m.sites.length)
  );
}
export function polarDensity(input, qx, qy, radial = 128, angles = 1024) {
  const p = parameters(input),
    scale = WAVELENGTH * p.fNumber;
  let re = 0,
    im = 0,
    area = 0;
  for (let k = 0; k < angles; k++) {
    const theta = (2 * Math.PI * (k + 0.5)) / angles,
      R = radialLimit(p, theta),
      weight = (Math.PI * R * R) / (radial * angles);
    for (let j = 0; j < radial; j++) {
      const r = R * Math.sqrt((j + 0.5) / radial),
        t = -Math.PI * r * (qx * Math.cos(theta) + qy * Math.sin(theta));
      re += weight * Math.cos(t);
      im += weight * Math.sin(t);
      area += weight;
    }
  }
  return { density: (re * re + im * im) / (4 * scale * scale * area), area };
}
export function display(values, decades = 5) {
  return Float64Array.from(
    values,
    (v) => Math.log1p((10 ** decades * v) / WHITE) / Math.log1p(10 ** decades),
  );
}
