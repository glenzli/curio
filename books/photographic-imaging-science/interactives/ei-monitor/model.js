import { encode, decode } from "../encoding/model.js";
export const FULL_WELL = 32000,
  GRAY = 1000,
  READ_NOISE = 4,
  RAW_MAX = 16383;
const clamp = (x) => Math.max(0, Math.min(1, x));
export function parameters({
  eiStops = 0,
  exposure = 0,
  probe = 4,
  bits = 12,
  progress = 100,
  policy = "fixed",
  recording = "fixed",
} = {}) {
  for (const [v, lo, hi] of [
    [eiStops, -2, 3],
    [exposure, -2, 2],
    [probe, -6, 8],
    [bits, 8, 12],
    [progress, 0, 100],
  ])
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new RangeError("Invalid EI chain");
  if (!Number.isInteger(bits))
    throw new RangeError("Integer log bit depth required");
  return {
    eiStops,
    exposure,
    probe,
    bits,
    progress,
    policy: policy === "metered" ? "metered" : "fixed",
    recording: recording === "ei-gain" ? "ei-gain" : "fixed",
  };
}
export function pipeline(input = {}, sceneEV) {
  const p = parameters(input),
    g = 2 ** p.eiStops,
    e = 2 ** p.exposure / (p.policy === "metered" ? g : 1),
    mu = GRAY * e * 2 ** (sceneEV ?? p.probe),
    captured = Math.min(FULL_WELL, mu),
    rawCode = Math.round((captured / FULL_WELL) * RAW_MAX),
    rawElectrons = (rawCode / RAW_MAX) * FULL_WELL,
    recordGain = p.recording === "ei-gain" ? g : 1,
    monitorGain = g / recordGain,
    recordInput = (rawElectrons / FULL_WELL) * recordGain,
    logValue = encode(recordInput, "log"),
    maximum = 2 ** p.bits - 1,
    logCode = Math.round(logValue * maximum),
    decoded = decode(logCode / maximum, "log"),
    monitorLinear = ((0.18 * decoded * FULL_WELL) / GRAY) * monitorGain,
    display = clamp(monitorLinear) ** (1 / 2.2),
    targetSignal = Math.min((captured / FULL_WELL) * recordGain, 1),
    analogMonitor = ((0.18 * targetSignal * FULL_WELL) / GRAY) * monitorGain;
  return {
    mu,
    captured,
    rawCode,
    rawElectrons,
    recordGain,
    monitorGain,
    recordInput,
    logValue,
    logCode,
    decoded,
    monitorLinear,
    display,
    idealDisplay: clamp(analogMonitor) ** (1 / 2.2),
    sensorClipped: mu >= FULL_WELL,
    recordClipped: recordInput >= 1,
    fileWhite: logCode === maximum,
    rawWhite: rawCode === RAW_MAX,
    monitorClipped: monitorLinear >= 1,
    codeBin: [
      decode(Math.max(0, (logCode - 0.5) / maximum), "log"),
      decode(Math.min(1, (logCode + 0.5) / maximum), "log"),
    ],
    snr: mu < FULL_WELL ? mu / Math.sqrt(mu + READ_NOISE ** 2) : null,
  };
}
// Independent physical allocation from exposure stops. It does not inspect
// quantized samples or the encoder, and uses the pre-ADC mean, not a display code.
export function allocationTruth(input = {}) {
  const p = parameters(input),
    actualStops = p.exposure - (p.policy === "metered" ? p.eiStops : 0),
    gray = 1000 * 2 ** actualStops,
    physicalHeadroom = 5 - actualStops,
    shadow = Math.log2(250) + actualStops,
    fileHeadroom =
      physicalHeadroom -
      (p.recording === "ei-gain" ? Math.max(0, p.eiStops) : 0);
  return {
    gray,
    physicalHeadroom,
    shadow,
    total: Math.log2(8000),
    fileHeadroom,
    fileLimit:
      32000 / (p.recording === "ei-gain" ? Math.max(1, 2 ** p.eiStops) : 1),
    grayIdealMonitor: 0.18 * 2 ** (actualStops + p.eiStops),
    graySnr: gray / Math.sqrt(gray + 16),
  };
}
export function eiBudget(input = {}) {
  const p = parameters(input),
    gain = 2 ** p.eiStops,
    exposureRatio = 2 ** p.exposure / (p.policy === "metered" ? gain : 1),
    gray = pipeline(p, 0),
    truth = allocationTruth(p),
    probe = pipeline(p);
  const fileLimit = Math.min(
    FULL_WELL,
    FULL_WELL / (p.recording === "ei-gain" ? gain : 1),
  );
  return {
    ...p,
    gain,
    ei: 800 * gain,
    exposureRatio,
    gray,
    probeResult: probe,
    truth,
    fileLimit,
    headroom: Math.log2(FULL_WELL / gray.mu),
    shadow: Math.log2(gray.mu / READ_NOISE),
    fileHeadroom: Math.log2(fileLimit / gray.mu),
    patches: [-4, 0, 3, 5, 7].map((sceneEV) => ({
      sceneEV,
      ...pipeline(p, sceneEV),
    })),
    curve: Array.from({ length: 113 }, (_, j) => {
      const sceneEV = -6 + j / 8;
      return { sceneEV, ...pipeline(p, sceneEV) };
    }),
  };
}
