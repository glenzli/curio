export const PLANCK = 6.62607015e-34,
  LIGHT_SPEED = 299792458;
export function exposureParameters(input = {}) {
  const p = {
    fNumber: 4,
    exposureMs: 4,
    transmission: 0.8,
    magnification: 0,
    velocity: 0.6,
    progress: 100,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.fNumber < 2 ||
    p.fNumber > 32 ||
    p.exposureMs <= 0 ||
    p.exposureMs > 100 ||
    p.transmission < 0 ||
    p.transmission > 1 ||
    p.magnification < 0 ||
    p.magnification > 1 ||
    p.velocity < 0 ||
    p.velocity > 10 ||
    p.progress < 0 ||
    p.progress > 100
  )
    throw new RangeError("Exposure inputs outside teaching domain");
  return p;
}
export function exposureBudget(input = {}) {
  const p = exposureParameters(input),
    workingNumber = p.fNumber * (1 + p.magnification),
    alpha = Math.atan(1 / (2 * workingNumber));
  // Direct quadrature of uniform radiance through the exit cone, not the
  // analytic sin²(alpha) expression. Monochromatic radiance is 1 W/(m² sr).
  const n = 128,
    h = alpha / n;
  let integral = 0;
  for (let i = 0; i <= n; i++) {
    const a = i * h;
    integral +=
      (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * Math.sin(a) * Math.cos(a);
  }
  const irradiance = (2 * Math.PI * p.transmission * integral * h) / 3;
  const exposure = (irradiance * p.exposureMs) / 1000,
    pixelEnergy = exposure * 16e-12;
  const photonEnergy = (PLANCK * LIGHT_SPEED) / 550e-9,
    photons = pixelEnergy / photonEnergy;
  const fraction = p.progress / 100;
  return {
    p,
    workingNumber,
    alpha,
    irradiance,
    exposure,
    photons,
    electrons: 0.7 * photons,
    motionPixels: p.velocity * p.exposureMs,
    elapsedMs: p.exposureMs * fraction,
    accumulatedPhotons: photons * fraction,
    accumulatedMotion: p.velocity * p.exposureMs * fraction,
  };
}
export function exposureTruth(input = {}) {
  const p = exposureParameters(input),
    N = p.fNumber * (1 + p.magnification);
  const irradiance = (Math.PI * p.transmission) / (4 * N * N + 1),
    paraxial = (Math.PI * p.transmission) / (4 * N * N);
  return {
    irradiance,
    paraxial,
    exposure: (irradiance * p.exposureMs) / 1000,
    motionPixels: p.velocity * p.exposureMs,
  };
}
export function equalExposureTime(reference, newNumber) {
  const p = exposureParameters(reference),
    a = p.fNumber * (1 + p.magnification),
    b = newNumber * (1 + p.magnification);
  if (!Number.isFinite(newNumber) || newNumber < 2 || newNumber > 32)
    throw new RangeError("Invalid aperture");
  return (p.exposureMs * (4 * b * b + 1)) / (4 * a * a + 1);
}
