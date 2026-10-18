import { propagate, indexAt } from "../wave/model.js";
import { fft2 } from "../wave/fft.js";

export const SIDE = 48,
  STEP_UM = 1.1,
  RADIUS = 16;
export function parameters(input = {}) {
  const p = {
    defocus: 0,
    coma: 0,
    bin: 2,
    pattern: 0,
    probeX: 24,
    probeY: 24,
    ...input,
  };
  if (
    !Object.values(p).every(Number.isFinite) ||
    Math.abs(p.defocus) > 0.3 ||
    Math.abs(p.coma) > 0.3 ||
    ![1, 2, 3, 4].includes(p.bin) ||
    ![0, 1].includes(p.pattern) ||
    ![p.probeX, p.probeY].every(
      (v) => Number.isInteger(v) && v >= 0 && v < SIDE,
    )
  )
    throw RangeError("Invalid finite PSF image parameters");
  return p;
}

export function scene(pattern = 0) {
  return Float64Array.from({ length: SIDE * SIDE }, (_, i) => {
    const x = i % SIDE,
      y = Math.floor(i / SIDE);
    if (pattern === 1) {
      const bars = x >= 5 && x <= 20 && y >= 6 && y <= 20 && x % 4 < 2;
      const diagonal =
        x >= 24 && y >= 6 && y < 25 && Math.abs(y - (x - 20)) < 1;
      const letter =
        y >= 28 &&
        y < 42 &&
        (x === 9 ||
          x === 10 ||
          ((y <= 29 || (y >= 34 && y <= 35)) && x >= 9 && x <= 20));
      return bars || diagonal || letter ? 0.95 : 0.03;
    }
    const points = [
      [12, 12],
      [24, 12],
      [36, 12],
      [20, 30],
      [24, 30],
      [28, 30],
    ];
    return points.some(([a, b]) => a === x && b === y) ? 1 : 0;
  });
}

export function finiteKernel(input = {}) {
  const p = parameters(input);
  const wave = propagate({
    diameter: 32,
    padding: 4,
    fNumber: 8,
    wavelengthNm: 550,
    defocus: p.defocus,
    coma: p.coma,
  });
  const side = 2 * RADIUS + 1;
  const weights = Float64Array.from(
    { length: side * side },
    (_, i) =>
      wave.psf[
        indexAt(wave, (i % side) - RADIUS, Math.floor(i / side) - RADIUS)
      ] *
      wave.imageStepUm ** 2,
  );
  const retained = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) weights[i] /= retained;
  return {
    weights,
    side,
    retained,
    stepUm: wave.imageStepUm,
    fullIntegral: wave.integral,
  };
}

function shape(values, width, height) {
  if (
    ![width, height].every((v) => Number.isInteger(v) && v > 0 && v <= 128) ||
    values.length !== width * height ||
    !values.every(Number.isFinite)
  )
    throw RangeError("Invalid finite image");
}

// Linear convolution: padding includes the complete support before the centered crop.
export function linearConvolution(values, width, height, weights, kernelSide) {
  shape(values, width, height);
  shape(weights, kernelSide, kernelSide);
  if (kernelSide % 2 !== 1)
    throw RangeError("An odd centered kernel is required");
  const size =
    2 ** Math.ceil(Math.log2(Math.max(width, height) + kernelSide - 1));
  const real = new Float64Array(size * size),
    imaginary = new Float64Array(real.length);
  const kr = new Float64Array(real.length),
    ki = new Float64Array(real.length);
  for (let y = 0; y < height; y++)
    real.set(values.slice(y * width, (y + 1) * width), y * size);
  for (let y = 0; y < kernelSide; y++)
    kr.set(weights.slice(y * kernelSide, (y + 1) * kernelSide), y * size);
  fft2(real, imaginary, size);
  fft2(kr, ki, size);
  for (let i = 0; i < real.length; i++) {
    const a = real[i],
      b = imaginary[i];
    real[i] = a * kr[i] - b * ki[i];
    imaginary[i] = a * ki[i] + b * kr[i];
  }
  fft2(real, imaginary, size, true);
  const radius = (kernelSide - 1) / 2;
  const image = Float64Array.from(
    { length: width * height },
    (_, i) =>
      real[(Math.floor(i / width) + radius) * size + (i % width) + radius],
  );
  return {
    image,
    fullSum: real.reduce((a, b) => a + b, 0),
    imaginaryResidual: imaginary.reduce((a, b) => Math.max(a, Math.abs(b)), 0),
  };
}

// Independent spatial sum, with explicit zero extension, not an FFT correlation.
export function directAt(values, width, height, weights, kernelSide, x, y) {
  let sum = 0;
  const radius = (kernelSide - 1) / 2;
  for (let j = 0; j < kernelSide; j++)
    for (let i = 0; i < kernelSide; i++) {
      const sx = x - (i - radius),
        sy = y - (j - radius);
      if (sx >= 0 && sx < width && sy >= 0 && sy < height)
        sum += weights[j * kernelSide + i] * values[sy * width + sx];
    }
  return sum;
}

// Exact integration of the declared piecewise-constant fine cells, then one sample/pixel.
export function areaSamples(values, width, height, bin) {
  shape(values, width, height);
  if (!Number.isInteger(bin) || bin < 1 || width % bin || height % bin)
    throw RangeError("Pixels must partition the fine grid");
  const sideX = width / bin,
    sideY = height / bin;
  const image = Float64Array.from({ length: sideX * sideY }, (_, k) => {
    const x = k % sideX,
      y = Math.floor(k / sideX);
    let sum = 0;
    for (let j = 0; j < bin; j++)
      for (let i = 0; i < bin; i++)
        sum += values[(y * bin + j) * width + x * bin + i];
    return sum / bin ** 2;
  });
  return { image, width: sideX, height: sideY };
}

export function psfImage(input = {}) {
  const p = parameters(input),
    source = scene(p.pattern),
    kernel = finiteKernel(p);
  const result = linearConvolution(
    source,
    SIDE,
    SIDE,
    kernel.weights,
    kernel.side,
  );
  return {
    p,
    source,
    kernel,
    ...result,
    sampled: areaSamples(result.image, SIDE, SIDE, p.bin),
  };
}
