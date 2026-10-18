import { doublet } from "../achromat/model.js";
export function thermalFocus({
  temperature = 20,
  index = 1.5,
  dn = 2,
  glassExpansion = 8,
  barrelExpansion = 12,
  focal = 100,
} = {}) {
  if (
    ![temperature, index, dn, glassExpansion, barrelExpansion, focal].every(
      Number.isFinite,
    ) ||
    index <= 1 ||
    focal <= 0 ||
    1 + glassExpansion * 1e-6 * temperature <= 0 ||
    index + dn * 1e-6 * temperature <= 1
  )
    throw RangeError("Invalid thermal lens");
  const material = (-dn * 1e-6) / (index - 1),
    shape = glassExpansion * 1e-6,
    mount = barrelExpansion * 1e-6;
  const exact =
      (focal * (1 + shape * temperature) * (index - 1)) /
      (index - 1 + dn * 1e-6 * temperature),
    sensor = focal * (1 + mount * temperature);
  const slope = focal * (shape + material - mount) * 1000;
  return {
    exact,
    sensor,
    residual: (exact - sensor) * 1000,
    linear: slope * temperature,
    slope,
    material: material * focal * temperature * 1000,
    shape: shape * focal * temperature * 1000,
    mount: mount * focal * temperature * 1000,
  };
}
export function secondarySpectrum() {
  const first = doublet(),
    m = doublet({ ratio: first.solutionRatio });
  return {
    ratio: m.solutionRatio,
    primary: m.primary,
    secondary: m.secondary,
    direct: m.total === 0 ? NaN : 1 / m.focuses.g - 1 / m.focuses.F,
    a: m.a.partial,
    b: m.b.partial,
  };
}
