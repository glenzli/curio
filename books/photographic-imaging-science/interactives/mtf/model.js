export function sinc(x) {
  return Math.abs(x) < 1e-10 ? 1 : Math.sin(x) / x;
}
export function diffractionMtf(rho) {
  const r = Math.abs(rho);
  return r >= 1 ? 0 : (2 / Math.PI) * (Math.acos(r) - r * Math.sqrt(1 - r * r));
}
export function transfer({
  fNumber = 8,
  pixelUm = 6,
  wavelengthNm = 550,
  frequency = 40,
} = {}) {
  if (
    ![fNumber, pixelUm, wavelengthNm, frequency].every(Number.isFinite) ||
    fNumber <= 0 ||
    pixelUm <= 0 ||
    wavelengthNm <= 0 ||
    frequency < 0
  )
    throw new RangeError(
      "Expected positive optical scales and a nonnegative frequency",
    );
  const cutoff = 1 / (wavelengthNm * 1e-6 * fNumber),
    nyquist = 1000 / (2 * pixelUm);
  const optical = diffractionMtf(frequency / cutoff),
    pixelOtf = sinc(Math.PI * pixelUm * 0.001 * frequency);
  return {
    cutoff,
    nyquist,
    airyDiameterUm: 2.44 * wavelengthNm * 0.001 * fNumber,
    optical,
    pixel: Math.abs(pixelOtf),
    system: optical * Math.abs(pixelOtf),
    systemOtf: optical * pixelOtf,
  };
}
