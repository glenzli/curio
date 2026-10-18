import { signalChain } from "../signal-chain/model.js";
import { snrThreshold } from "../calibration-drift/model.js";
export function scales({
  pixel = 4,
  wavelength = 550,
  fNumber = 8,
  exposure = -4,
  read = 3,
  target = 1,
  capacity = 32000,
} = {}) {
  if (!Number.isFinite(fNumber) || fNumber <= 0)
    throw RangeError("Positive f-number required");
  const signal = signalChain({ pixel, wavelength, exposure }),
    noise = snrThreshold({ read, target, capacity, dark: 0 }),
    nyquist = 500 / pixel,
    cutoff = 1e6 / (wavelength * fNumber),
    airy = 2.44 * wavelength * 0.001 * fNumber;
  return { signal, noise, nyquist, cutoff, airy, ratio: cutoff / nyquist };
}
