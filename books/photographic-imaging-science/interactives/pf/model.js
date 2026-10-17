// Scalar, unit-amplitude periodic phase screen; x is measured in grating periods.
export function sinc(x) {
  return Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
}
export const efficiency = ([re, im]) => re * re + im * im;
function validate({ levels, depth, wavelength, designWavelength, order }) {
  if (!Number.isInteger(levels) || levels < 1 || levels > 256)
    throw new RangeError("levels must be an integer from 1 to 256");
  if (!Number.isFinite(depth) || depth < 0 || depth > 10)
    throw new RangeError("Invalid relief depth scale");
  if (![wavelength, designWavelength].every((x) => Number.isFinite(x) && x > 0))
    throw new RangeError("Wavelengths must be finite and positive (nm)");
  if (!Number.isInteger(order) || Math.abs(order) > 100000)
    throw new RangeError("Invalid integer diffraction order");
}
function parameters(input) {
  const p = { levels: 4, depth: 1, wavelength: 550, designWavelength: 550, order: 1, ...input };
  validate(p);
  return p;
}

// Each constant-phase interval is integrated exactly, including its Fourier kernel.
export function coefficient(input = {}) {
  const { levels: N, depth, wavelength, designWavelength, order: m } = parameters(input);
  const alpha = depth * designWavelength / wavelength;
  let re = 0, im = 0;
  for (let k = 0; k < N; k++) {
    const phase = 2 * Math.PI * (alpha * k - m * (k + 0.5)) / N;
    re += Math.cos(phase);
    im += Math.sin(phase);
  }
  const scale = sinc(m / N) / N;
  return [re * scale, im * scale];
}

// Independent numerical integral: sample exp(i phi(x)) exp(-2 pi i m x)
// at midpoint nodes inside EVERY step, so discontinuities never share a cell.
export function quadrature(input = {}, samplesPerStep = 128) {
  const p = parameters(input);
  if (!Number.isInteger(samplesPerStep) || samplesPerStep < 1 || samplesPerStep > 65536)
    throw new RangeError("Invalid quadrature resolution");
  const alpha = p.depth * p.designWavelength / p.wavelength;
  const count = p.levels * samplesPerStep;
  let re = 0, im = 0;
  for (let j = 0; j < count; j++) {
    const x = (j + 0.5) / count;
    const phase = 2 * Math.PI * (alpha * Math.floor(j / samplesPerStep) / p.levels - p.order * x);
    re += Math.cos(phase) / count;
    im += Math.sin(phase) / count;
  }
  return [re, im];
}

export function phaseProfile(input = {}) {
  const p = parameters(input);
  const alpha = p.depth * p.designWavelength / p.wavelength;
  const steps = [];
  for (let k = 0; k < p.levels; k++)
    steps.push([k / p.levels, alpha * k / p.levels], [(k + 1) / p.levels, alpha * k / p.levels]);
  return { alpha, steps, continuous: [[0, 0], [1, alpha]] };
}

export function orderSpectrum(input = {}, limit = 8) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new RangeError("Invalid displayed order range");
  const p = parameters(input);
  const alpha = p.depth * p.designWavelength / p.wavelength;
  const orders = Array.from({ length: 2 * limit + 1 }, (_, i) => {
    const order = i - limit;
    return { order, eta: efficiency(coefficient({ ...p, order })), continuous: sinc(alpha - order) ** 2 };
  });
  const shownEnergy = orders.reduce((sum, x) => sum + x.eta, 0);
  return { orders, shownEnergy, omittedEnergy: Math.max(0, 1 - shownEnergy) };
}
