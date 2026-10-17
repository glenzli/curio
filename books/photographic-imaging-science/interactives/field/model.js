export const maxHeight = 21.6;
/** Explicit Gaussian surrogate, not a physical lens prescription or Seidel fit. */
export function fieldResponse({
  height = 21.6,
  focus = 0,
  curvature = 75,
  astigmatism = 0,
  frequency = 30,
} = {}) {
  if (
    ![height, focus, curvature, astigmatism, frequency].every(
      Number.isFinite,
    ) ||
    height < 0 ||
    height > maxHeight ||
    frequency < 0
  )
    throw new RangeError("Invalid field model parameters");
  const u = (height / maxHeight) ** 2,
    radialFocus = (curvature + astigmatism) * u,
    tangentialFocus = (curvature - astigmatism) * u;
  const sigma0 = 1.8,
    defocusScale = 0.08;
  const radialSigma = Math.hypot(sigma0, defocusScale * (focus - radialFocus));
  const tangentialSigma = Math.hypot(
    sigma0,
    defocusScale * (focus - tangentialFocus),
  );
  const gaussianMtf = (sigma) =>
    Math.exp(-2 * Math.PI ** 2 * (sigma * 0.001 * frequency) ** 2);
  return {
    radialFocus,
    tangentialFocus,
    meanFocus: curvature * u,
    radialSigma,
    tangentialSigma,
    radial: gaussianMtf(radialSigma),
    tangential: gaussianMtf(tangentialSigma),
  };
}
