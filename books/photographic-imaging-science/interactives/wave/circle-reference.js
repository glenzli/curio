import { besselJ1 } from "./model.js";
// NIST DLMF 10.9.2, n=1. The angular integral avoids cancellation of the
// power series at large arguments; 512 midpoint nodes cover |pi*q| <= 200.
const angles = Float64Array.from(
  { length: 512 },
  (_, i) => (Math.PI * (i + 0.5)) / 512,
);
const sines = angles.map(Math.sin);
export function diskAmplitude(q) {
  const x = Math.PI * Math.abs(q);
  if (!Number.isFinite(x) || x > 200)
    throw RangeError("Disk reference restricted to |pi q| <= 200");
  if (x < 1e-10) return 1;
  let j;
  if (x <= 12) j = besselJ1(x);
  else {
    j = 0;
    for (let i = 0; i < 512; i++) j += Math.cos(x * sines[i] - angles[i]) / 512;
  }
  return (2 * j) / x;
}
export const diskIntensity = (q) => diskAmplitude(q) ** 2;
