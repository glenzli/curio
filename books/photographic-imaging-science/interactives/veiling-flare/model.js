// Uniform additive stray-light electrons over a local field. Known means are not
// noisy measurements. The same known veil may be subtracted from the mean,
// while its independent Poisson variance remains in the corrected signal.
export function veilingFlare({
  bright = 1000,
  dark = 100,
  veil = 300,
  readNoise = 4,
} = {}) {
  if (
    ![bright, dark, veil, readNoise].every(Number.isFinite) ||
    bright <= 0 ||
    dark < 0 ||
    dark > bright ||
    veil < 0 ||
    readNoise < 0
  )
    throw new RangeError("Invalid veil model");
  const contrast = (bright - dark) / (bright + dark),
    observedContrast = (bright - dark) / (bright + dark + 2 * veil);
  const rawHigh = bright + veil,
    rawLow = dark + veil;
  const varianceHigh = rawHigh + readNoise ** 2,
    varianceLow = rawLow + readNoise ** 2;
  // Separate spatial-statistics reference: a complete period, not endpoint reuse.
  const samples = Array.from(
    { length: 64 },
    (_, i) => (i < 32 ? bright : dark) + veil,
  );
  const referenceContrast =
    (Math.max(...samples) - Math.min(...samples)) /
    (Math.max(...samples) + Math.min(...samples));
  return {
    bright,
    dark,
    veil,
    readNoise,
    contrast,
    observedContrast,
    referenceContrast,
    rawHigh,
    rawLow,
    varianceHigh,
    varianceLow,
    correctedHigh: rawHigh - veil,
    correctedLow: rawLow - veil,
    darkSnrBefore:
      dark + readNoise ** 2 === 0
        ? null
        : dark / Math.sqrt(dark + readNoise ** 2),
    darkSnrCorrected: varianceLow === 0 ? null : dark / Math.sqrt(varianceLow),
  };
}
