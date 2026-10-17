export function samplingModel({ frequency = 0.8, phase = 0, width = 0 } = {}) {
  if (
    ![frequency, phase, width].every(Number.isFinite) ||
    frequency < 0 ||
    width < 0 ||
    width > 1
  )
    throw new RangeError("Invalid sampling parameters");
  const argument = Math.PI * width * frequency,
    gain = Math.abs(argument) < 1e-10 ? 1 : Math.sin(argument) / argument;
  const folded = frequency - Math.round(frequency);
  const raw = (x) =>
    0.5 + 0.4 * Math.cos(2 * Math.PI * (frequency * x + phase));
  const integrated = (x) =>
    0.5 + 0.4 * gain * Math.cos(2 * Math.PI * (frequency * x + phase));
  const alias = (x) =>
    0.5 + 0.4 * gain * Math.cos(2 * Math.PI * (folded * x + phase));
  return {
    gain,
    folded,
    aliasFrequency: Math.abs(folded),
    raw,
    integrated,
    alias,
  };
}
