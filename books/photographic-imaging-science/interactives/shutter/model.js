// Times in seconds, image-plane motion in pixels/second; normalized row 0..1.
export const sinc = (x) => Math.abs(x) < 1e-8 ? 1 - x * x / 6 : Math.sin(x) / x;

export function rowExposure(row, scan, exposure) {
  const start = row * scan;
  return { start, end: start + exposure, center: start + exposure / 2 };
}

export function motion(row, scan, exposure, speed) {
  const window = rowExposure(row, scan, exposure);
  return { ...window, position: speed * window.center, blur: Math.abs(speed) * exposure };
}

export function illumination(row, scan, exposure, frequency, depth = 0.8, phase = 0) {
  const { center } = rowExposure(row, scan, exposure);
  return 1 + depth * sinc(Math.PI * frequency * exposure) *
    Math.cos(2 * Math.PI * frequency * center + phase);
}

// Exposure average of a unit-height top-hat rod under constant illumination.
export function rodProfile(offset, blur, width = 6) {
  if (blur === 0) return Math.abs(offset) < width / 2 ? 1 : 0;
  const overlap = Math.max(0,
    Math.min(width / 2, offset + blur / 2) - Math.max(-width / 2, offset - blur / 2));
  return overlap / blur;
}
