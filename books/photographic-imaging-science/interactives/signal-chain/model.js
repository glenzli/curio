export function signalChain({
  exposure = -4,
  pixel = 4,
  wavelength = 550,
  qe = 0.7,
  gain = 1,
} = {}) {
  if (
    ![exposure, pixel, wavelength, qe, gain].every(Number.isFinite) ||
    pixel <= 0 ||
    wavelength <= 0 ||
    qe < 0 ||
    qe > 1 ||
    gain <= 0
  )
    throw RangeError("Invalid signal units");
  const energy = (pixel * 1e-6) ** 2 * 10 ** exposure,
    photonEnergy = (6.62607015e-34 * 299792458) / (wavelength * 1e-9),
    photons = energy / photonEnergy,
    electrons = photons * qe;
  const captured = Math.min(32000, electrons),
    volts = captured / 32000,
    code = Math.round(Math.min(1, volts * gain) * 16383),
    display = (code / 16383) ** (1 / 2.2);
  return {
    energy,
    photonEnergy,
    photons,
    electrons,
    captured,
    volts,
    code,
    display,
  };
}
