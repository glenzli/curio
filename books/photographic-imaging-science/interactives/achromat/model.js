// SCHOTT Optical Glass Collection, March 2018: N-BK7 and N-F2 data sheets.
// B dimensionless; C in µm². Only 435.83–700 nm is exposed by this model.
// https://www.schott.com/en-gb/products/optical-glass-p1000267/downloads
export const glasses = {
  bk7: {
    name: "N-BK7",
    B: [1.03961212, 0.231792344, 1.01046945],
    C: [0.00600069867, 0.0200179144, 103.560653],
  },
  nf2: {
    name: "N-F2",
    B: [1.39757037, 0.159201403, 1.2686543],
    C: [0.00995906143, 0.0546931752, 119.248346],
  },
};
export const lines = { g: 435.83, F: 486.13, d: 587.56, C: 656.27 };
function positive(x, name) {
  if (!Number.isFinite(x) || x <= 0) throw new RangeError(`Invalid ${name}`);
}
export function indexAt(glass, wavelength) {
  if (!glasses[glass]) throw new RangeError("Unknown glass");
  if (!Number.isFinite(wavelength) || wavelength < lines.g || wavelength > 700)
    throw new RangeError("Wavelength outside demonstration range");
  const w2 = (wavelength / 1000) ** 2,
    { B, C } = glasses[glass];
  return Math.sqrt(
    1 + B.reduce((sum, b, j) => sum + (b * w2) / (w2 - C[j]), 0),
  );
}
export function dispersion(glass) {
  const n = Object.fromEntries(
    Object.entries(lines).map(([name, wavelength]) => [
      name,
      indexAt(glass, wavelength),
    ]),
  );
  return {
    n,
    abbe: (n.d - 1) / (n.F - n.C),
    partial: (n.g - n.F) / (n.F - n.C),
  };
}
export function achromaticPowers(totalPower, v1, v2) {
  positive(totalPower, "total power");
  positive(v1, "Abbe number");
  positive(v2, "Abbe number");
  if (Math.abs(v1 - v2) < 1e-10 * Math.max(v1, v2)) return null;
  return [(totalPower * v1) / (v1 - v2), (-totalPower * v2) / (v1 - v2)];
}
export function doublet({
  focalLength = 100,
  ratio = 2,
  sameGlass = false,
} = {}) {
  positive(focalLength, "target focal length");
  if (!Number.isFinite(ratio) || ratio < 1 || ratio > 4)
    throw new RangeError("Power ratio outside [1,4]");
  const first = "bk7",
    second = sameGlass ? "bk7" : "nf2";
  const a = dispersion(first),
    b = dispersion(second),
    total = 1 / focalLength;
  const phi1 = ratio * total,
    phi2 = (1 - ratio) * total;
  const powerAt = (wavelength) =>
    (phi1 * (indexAt(first, wavelength) - 1)) / (a.n.d - 1) +
    (phi2 * (indexAt(second, wavelength) - 1)) / (b.n.d - 1);
  const focusAt = (wavelength) => 1 / powerAt(wavelength);
  const focuses = Object.fromEntries(
    Object.entries(lines).map(([name, wavelength]) => [
      name,
      focusAt(wavelength),
    ]),
  );
  const solution = achromaticPowers(total, a.abbe, b.abbe);
  return {
    first,
    second,
    a,
    b,
    phi1,
    phi2,
    total,
    focalLength,
    powerAt,
    focusAt,
    focuses,
    solutionRatio: solution ? solution[0] / total : null,
    primary: phi1 / a.abbe + phi2 / b.abbe,
    secondary: (phi1 / a.abbe) * a.partial + (phi2 / b.abbe) * b.partial,
  };
}
// Paraxial geometric diameter for a parallel bundle of given entrance diameter.
// It excludes diffraction, aberrations, lens thickness and principal-plane shifts.
export function defocusDiameter(focus, plane, entranceDiameter) {
  positive(focus, "spectral focal length");
  positive(plane, "image plane");
  positive(entranceDiameter, "entrance diameter");
  return entranceDiameter * Math.abs(1 - plane / focus);
}
