import { fft2 } from "./fft.js";

const TAU = 2 * Math.PI;
export const modes = ["defocus", "astigmatism", "coma", "spherical", "tilt"];
export function parameters(input = {}) {
  const p = {
    fNumber: 8,
    wavelengthNm: 550,
    diameter: 64,
    padding: 4,
    defocus: 0,
    astigmatism: 0,
    coma: 0,
    spherical: 0,
    tilt: 0,
    piston: 0,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.fNumber <= 0 ||
    p.wavelengthNm <= 0 ||
    ![32, 64, 128].includes(p.diameter) ||
    ![2, 4, 8].includes(p.padding) ||
    [...modes, "piston"].some((key) => Math.abs(p[key]) > 1)
  )
    throw new RangeError(
      "Invalid wave-optics scale, grid or wavefront coefficient",
    );
  return p;
}

// Real orthonormal Zernike modes on the full uniform unit disk; coefficients in waves.
export function wavefront(x, y, p) {
  const r2 = x * x + y * y;
  return (
    p.piston +
    p.tilt * 2 * x +
    p.defocus * Math.sqrt(3) * (2 * r2 - 1) +
    p.astigmatism * Math.sqrt(6) * (x * x - y * y) +
    p.coma * Math.sqrt(8) * (3 * r2 - 2) * x +
    p.spherical * Math.sqrt(5) * (6 * r2 * r2 - 6 * r2 + 1)
  );
}

export function pupil(input = {}) {
  const p = parameters(input),
    size = p.diameter * p.padding;
  const real = new Float64Array(size * size),
    imaginary = new Float64Array(size * size);
  const sites = [];
  let sum = 0,
    sum2 = 0;
  for (let j = -p.diameter / 2; j <= p.diameter / 2; j++)
    for (let i = -p.diameter / 2; i <= p.diameter / 2; i++) {
      const x = (2 * i) / p.diameter,
        y = (2 * j) / p.diameter;
      if (x * x + y * y >= 1) continue;
      const waves = wavefront(x, y, p),
        phase = TAU * waves;
      const index = (j + size / 2) * size + i + size / 2;
      real[index] = Math.cos(phase);
      imaginary[index] = Math.sin(phase);
      sites.push({ i, j, x, y, waves, index });
      sum += waves;
      sum2 += waves * waves;
    }
  const count = sites.length,
    mean = sum / count;
  return {
    p,
    size,
    real,
    imaginary,
    sites,
    count,
    area: count * (2 / p.diameter) ** 2,
    sampledRms: Math.sqrt(Math.max(0, sum2 / count - mean * mean)),
    // Piston/tilt excluded, defocus retained, under the continuous disk inner product.
    rms: Math.hypot(p.defocus, p.astigmatism, p.coma, p.spherical),
  };
}

/** P -> complex amplitude -> intensity -> forward PSF transform.
 * No pixel aperture, CFA, broadband averaging, geometric ray trace or sharpening.
 * Arrays use FFT ordering (zero at [0,0]); signed coordinates are exposed below.
 */
export function propagate(input = {}) {
  const g = pupil(input),
    { p, size, count } = g;
  const real = g.real.slice(),
    imaginary = g.imaginary.slice();
  fft2(real, imaginary, size);
  const intensity = new Float64Array(real.length);
  let rawEnergy = 0,
    peak = 0;
  for (let i = 0; i < intensity.length; i++) {
    intensity[i] = real[i] ** 2 + imaginary[i] ** 2;
    rawEnergy += intensity[i];
    peak = Math.max(peak, intensity[i]);
  }
  const scaleUm = p.wavelengthNm * 0.001 * p.fNumber;
  const imageStepUm = scaleUm / p.padding;
  const psf = intensity.map((value) => value / (rawEnergy * imageStepUm ** 2));
  const otfReal = intensity.slice(),
    otfImaginary = new Float64Array(intensity.length);
  fft2(otfReal, otfImaginary, size);
  for (let i = 0; i < otfReal.length; i++) {
    otfReal[i] /= rawEnergy;
    otfImaginary[i] /= rawEnergy;
  }
  return {
    ...g,
    amplitudeReal: real,
    amplitudeImaginary: imaginary,
    psf,
    otfReal,
    otfImaginary,
    imageStepUm,
    scaleUm,
    cutoff: 1000 / scaleUm,
    frequencyStep: 1000 / (scaleUm * p.diameter),
    parseval: rawEnergy / (size * size * count),
    integral: psf.reduce((s, h) => s + h, 0) * imageStepUm ** 2,
    onAxisRatio: intensity[0] / count ** 2,
    sampledPeakRatio: peak / count ** 2,
  };
}

export function indexAt(g, x, y = 0) {
  return (
    (((y % g.size) + g.size) % g.size) * g.size +
    (((x % g.size) + g.size) % g.size)
  );
}
export function amplitudeAt(g, x, y = 0) {
  // Remove the phase from placing the physical pupil at array center.
  const index = indexAt(g, x, y),
    sign = (x + y) % 2 ? -1 : 1;
  return [
    (sign * g.amplitudeReal[index]) / g.count,
    (sign * g.amplitudeImaginary[index]) / g.count,
  ];
}
export function otfAt(g, shiftX, shiftY = 0) {
  const index = indexAt(g, shiftX, shiftY);
  return [g.otfReal[index], g.otfImaginary[index]];
}

/** Independent, nonperiodic pupil correlation; never reads PSF/FFT outputs. */
export function directCorrelation(g, shiftX, shiftY = 0) {
  if (![shiftX, shiftY].every(Number.isInteger))
    throw new RangeError("Integer pupil shifts required");
  let real = 0,
    imaginary = 0;
  for (const site of g.sites) {
    const x = site.i + shiftX + g.size / 2,
      y = site.j + shiftY + g.size / 2;
    if (x < 0 || x >= g.size || y < 0 || y >= g.size) continue;
    const a = site.index,
      b = y * g.size + x;
    real += g.real[a] * g.real[b] + g.imaginary[a] * g.imaginary[b];
    imaginary += g.imaginary[a] * g.real[b] - g.real[a] * g.imaginary[b];
  }
  return [real / g.count, imaginary / g.count];
}

/** Continuous unit-disk midpoint quadrature, independent of the Cartesian pupil and FFT.
 * q = image displacement / (lambda N); returned amplitude divided by disk area.
 */
export function polarAmplitude(
  input = {},
  qx = 0,
  qy = 0,
  radial = 192,
  angles = 192,
) {
  const p = parameters(input);
  if (
    ![qx, qy].every(Number.isFinite) ||
    ![radial, angles].every((v) => Number.isInteger(v) && v >= 8)
  )
    throw new RangeError("Invalid continuous quadrature");
  let real = 0,
    imaginary = 0;
  for (let j = 0; j < radial; j++) {
    const r = Math.sqrt((j + 0.5) / radial);
    for (let k = 0; k < angles; k++) {
      const theta = (TAU * (k + 0.5)) / angles,
        x = r * Math.cos(theta),
        y = r * Math.sin(theta);
      const phase = TAU * wavefront(x, y, p) - Math.PI * (qx * x + qy * y);
      real += Math.cos(phase);
      imaginary += Math.sin(phase);
    }
  }
  return [real / (radial * angles), imaginary / (radial * angles)];
}

export function circularOtf(rho) {
  const r = Math.abs(rho);
  return r >= 1 ? 0 : (2 / Math.PI) * (Math.acos(r) - r * Math.sqrt(1 - r * r));
}
export function besselJ1(x) {
  if (!Number.isFinite(x) || Math.abs(x) > 20)
    throw new RangeError("Reference series restricted to |x| <= 20");
  let term = x / 2,
    sum = term;
  for (let k = 1; k <= 100; k++) {
    term *= (-x * x) / (4 * k * (k + 1));
    sum += term;
    if (Math.abs(term) < 1e-16) break;
  }
  return sum;
}
export function airyRelative(q) {
  const x = Math.PI * Math.abs(q);
  return x < 1e-10 ? 1 : ((2 * besselJ1(x)) / x) ** 2;
}
export function defocusOnAxis(waves) {
  const x = TAU * Math.sqrt(3) * waves;
  return Math.abs(x) < 1e-12 ? 1 : (Math.sin(x) / x) ** 2;
}

/** Partial pupil sums in x strips. An algebraic construction sequence, not flight time. */
export function phasorTrace(g, qx, steps = 32) {
  const bins = Array.from({ length: steps }, () => [0, 0]);
  for (const site of g.sites) {
    const phase = TAU * site.waves - Math.PI * qx * site.x;
    const bin = Math.min(steps - 1, Math.floor(((site.x + 1) * steps) / 2));
    bins[bin][0] += Math.cos(phase) / g.count;
    bins[bin][1] += Math.sin(phase) / g.count;
  }
  const trace = [[0, 0]];
  for (const bin of bins)
    trace.push([trace.at(-1)[0] + bin[0], trace.at(-1)[1] + bin[1]]);
  return trace;
}
