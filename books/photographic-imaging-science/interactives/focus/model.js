/** Chapter 16, equations (16.2) and (16.2a), distances in millimetres. */
export function focusGeometry({
  focalLengthMm = 50,
  fNumber = 4,
  focusDistanceMm = 2000,
  subjectDistanceMm = 1000,
} = {}) {
  for (const [name, value] of Object.entries({
    focalLengthMm,
    fNumber,
    focusDistanceMm,
    subjectDistanceMm,
  }))
    if (!Number.isFinite(value) || value <= 0)
      throw new RangeError(`${name} must be finite and positive`);
  if (focusDistanceMm <= focalLengthMm || subjectDistanceMm <= focalLengthMm)
    throw new RangeError("Both object distances must exceed the focal length");
  const sensorDistanceMm =
    (focalLengthMm * focusDistanceMm) / (focusDistanceMm - focalLengthMm);
  const imageDistanceMm =
    (focalLengthMm * subjectDistanceMm) / (subjectDistanceMm - focalLengthMm);
  const apertureDiameterMm = focalLengthMm / fNumber;
  const signedRadiusMm =
    (apertureDiameterMm / 2) * (1 - sensorDistanceMm / imageDistanceMm);
  return {
    sensorDistanceMm,
    imageDistanceMm,
    apertureDiameterMm,
    signedRadiusMm,
    blurDiameterMm: 2 * Math.abs(signedRadiusMm),
  };
}
