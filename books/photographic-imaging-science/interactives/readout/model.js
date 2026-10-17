// Electron-referred teaching model. Changing bits keeps the ADC voltage span fixed.
export const FULL_WELL = 45000;
export const ADC_SPAN = 64000;
export const UPSTREAM_NOISE = 2;
export const DOWNSTREAM_NOISE = 8;

export function adc(electrons, bits, gain = 1) {
  const levels = 2 ** bits;
  const step = ADC_SPAN / (levels * gain);
  const captured = Math.max(0, Math.min(FULL_WELL, electrons));
  const code = Math.min(levels - 1, Math.floor(captured / step));
  return {
    code,
    step,
    estimate: (code + 0.5) * step,
    limit: Math.min(FULL_WELL, ADC_SPAN / gain),
    fullWellClipped: electrons >= FULL_WELL,
    adcClipped: captured >= ADC_SPAN / gain,
  };
}

export function inputNoise(bits, gain = 1) {
  const step = ADC_SPAN / (2 ** bits * gain);
  return Math.hypot(UPSTREAM_NOISE, DOWNSTREAM_NOISE / gain, step / Math.sqrt(12));
}

export function compare(electrons, bits, gain) {
  const analog = adc(electrons, bits, gain);
  const digital = adc(electrons, bits, 1);
  return {
    analog,
    // Unbounded floating output, with the display gain divided out for comparison.
    digital: { ...digital, output: digital.code * gain },
    analogNoise: inputNoise(bits, gain),
    digitalNoise: inputNoise(bits, 1),
  };
}
