import { circularOtf } from "../wave/model.js";
const TAU = 2 * Math.PI;
export const wavelengths = [450, 550, 650];
export function spectralLines({ split = 40, band = 1 } = {}) {
  return wavelengths.map((nm, i) => ({
    nm,
    focus: (i - 1) * split,
    weight: band ? [0.25, 0.5, 0.25][i] : +(i === 1),
  }));
}
const beta = (delta, nm, N) => (Math.PI * delta) / (4 * N * N * nm * 0.001);
export function axialDensity(delta, nm, N) {
  const b = beta(delta, nm, N) / 2,
    s = Math.abs(b) < 1e-10 ? 1 : Math.sin(b) / b;
  return (Math.PI / (4 * (nm * 0.001 * N) ** 2)) * s * s;
}
export function defocusedOtf(nu, delta, nm, N, samples = 512) {
  if (
    ![nu, delta, nm, N].every(Number.isFinite) ||
    nu < 0 ||
    nm <= 0 ||
    N <= 0 ||
    !Number.isInteger(samples) ||
    samples < 16
  )
    throw RangeError("Invalid monochromatic OTF");
  const shift = (2 * nu * nm * 0.001 * N) / 1000;
  if (shift >= 2) return 0;
  if (shift === 0) return 1;
  const lo = -1,
    hi = 1 - shift,
    h = (hi - lo) / samples,
    b = beta(delta, nm, N);
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const x = lo + (i + 0.5) * h,
      height =
        2 *
        Math.min(
          Math.sqrt(Math.max(0, 1 - x * x)),
          Math.sqrt(Math.max(0, 1 - (x + shift) ** 2)),
        );
    sum += height * Math.cos(b * (2 * x * shift + shift * shift));
  }
  return (sum * h) / Math.PI;
}
export function radialDensity(r, delta, nm, N, radial = 96, angles = 48) {
  const q = (Math.PI * r) / (nm * 0.001 * N),
    b = beta(delta, nm, N);
  let re = 0,
    im = 0;
  for (let j = 0; j < radial; j++) {
    const s = (j + 0.5) / radial;
    let j0 = 0;
    for (let k = 0; k < angles; k++)
      j0 += Math.cos(q * Math.sqrt(s) * Math.cos((TAU * (k + 0.5)) / angles));
    j0 /= angles;
    re += j0 * Math.cos(b * s);
    im += j0 * Math.sin(b * s);
  }
  return (
    ((Math.PI / (4 * (nm * 0.001 * N) ** 2)) * (re * re + im * im)) /
    radial ** 2
  );
}
export function chromaticFocus(input = {}) {
  const p = {
    split: 40,
    band: 1,
    focus: 10,
    fNumber: 8,
    frequency: 60,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.split < 0 ||
    p.split > 60 ||
    ![0, 1].includes(p.band) ||
    p.fNumber < 6 ||
    p.frequency < 0
  )
    throw RangeError("Invalid spectral focus model");
  const lines = spectralLines(p),
    at = (focus) => {
      const monochrome = lines.map((l) => ({
        axis: axialDensity(focus - l.focus, l.nm, p.fNumber),
        otf: defocusedOtf(p.frequency, focus - l.focus, l.nm, p.fNumber),
      }));
      return {
        axis: lines.reduce((s, l, i) => s + l.weight * monochrome[i].axis, 0),
        otf: lines.reduce((s, l, i) => s + l.weight * monochrome[i].otf, 0),
        monochrome,
      };
    };
  const scan = Array.from({ length: 81 }, (_, i) => {
    const z = -80 + 2 * i,
      m = at(z);
    return { z, ...m, mtf: Math.abs(m.otf) };
  });
  const idealAxis = lines.reduce(
    (s, l) => s + l.weight * axialDensity(0, l.nm, p.fNumber),
    0,
  );
  return {
    p,
    lines,
    at,
    current: at(p.focus),
    scan,
    idealAxis,
    bestAxis: scan.reduce((a, b) => (b.axis > a.axis ? b : a)),
    bestMtf: scan.reduce((a, b) => (b.mtf > a.mtf ? b : a)),
    psf: (r) =>
      lines.reduce(
        (s, l) =>
          s + l.weight * radialDensity(r, p.focus - l.focus, l.nm, p.fNumber),
        0,
      ),
  };
}
export { circularOtf };
