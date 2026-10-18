export function parameters(input = {}) {
  const p = {
    bits: 8,
    fullScale: 1,
    clockMHz: 10,
    inputFraction: 0.375,
    progress: 100,
    ...input,
  };
  if (
    !Number.isInteger(p.bits) ||
    p.bits < 3 ||
    p.bits > 14 ||
    ![p.fullScale, p.clockMHz, p.inputFraction, p.progress].every(
      Number.isFinite,
    ) ||
    p.fullScale <= 0 ||
    p.fullScale > 10 ||
    p.clockMHz <= 0 ||
    p.clockMHz > 1000 ||
    p.inputFraction < -0.1 ||
    p.inputFraction > 1.1 ||
    p.progress < 0 ||
    p.progress > 100
  )
    throw new RangeError("Invalid single-slope ADC parameters");
  return p;
}
export function rampState(input = {}) {
  const p = parameters(input),
    levels = 2 ** p.bits,
    delta = p.fullScale / levels;
  const fractionElapsed = p.progress / 100;
  const totalUs = levels / p.clockMHz,
    elapsedUs = totalUs * fractionElapsed;
  const rampVolts = p.fullScale * fractionElapsed;
  const clockCount = Math.min(levels, Math.floor(levels * fractionElapsed));
  const channels = [p.inputFraction, 0.75, 1.05].map((fraction, index) => {
    const voltage = fraction * p.fullScale,
      crossingUs = fraction < 0 ? 0 : fraction <= 1 ? fraction * totalUs : null;
    // Compare normalized times so the exact tie does not depend on multiply/divide order.
    const crossed =
      crossingUs !== null && fractionElapsed >= Math.max(0, fraction);
    const code = Math.max(
      0,
      Math.min(levels - 1, Math.floor(fraction * levels)),
    );
    const finished = crossed || p.progress === 100;
    return {
      index,
      fraction,
      voltage,
      crossingUs,
      crossed,
      finished,
      code,
      latchedCode: finished ? code : null,
      underRange: fraction < 0,
      overRange: fraction >= 1,
      reconstruction: (code + 0.5) * delta,
      error: (code + 0.5) * delta - voltage,
      binary: code.toString(2).padStart(p.bits, "0"),
    };
  });
  return {
    p,
    levels,
    delta,
    totalUs,
    elapsedUs,
    rampVolts,
    clockCount,
    counter: Math.min(levels - 1, clockCount),
    channels,
  };
}
// Independent sweep of voltage intervals; no division/floor code calculation.
export function thresholdTruth(voltage, bits = 8, fullScale = 1) {
  if (!Number.isFinite(voltage)) throw new RangeError("Invalid ADC voltage");
  parameters({ bits, fullScale });
  const levels = 2 ** bits;
  let code = 0;
  for (let k = 1; k < levels; k++)
    if (voltage >= (fullScale * k) / levels) code = k;
    else break;
  return { code, reconstruction: (fullScale * (code + 0.5)) / levels };
}
