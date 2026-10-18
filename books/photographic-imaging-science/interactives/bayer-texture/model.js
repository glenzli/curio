import {
  CHANNELS,
  channelAt,
  sinc,
  aliasForChannel,
  captureMosaic,
  demosaicBilinear,
} from "../bayer/model.js";
export const SIZE = 48,
  FINE = 96;
const BASE = [
  { fx: 0.12, fy: 0, a: 0.14, phase: 0 },
  { fx: 0, fy: 0.18, a: 0.12, phase: 0.17 },
  { fx: 0.22, fy: 0.14, a: 0.12, phase: -0.13 },
];
export function parameters(input = {}) {
  const p = { scale: 1.6, angle: 0, shift: 0, width: 1, blur: 0, ...input };
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.scale < 0.5 ||
    p.scale > 3 ||
    p.angle < 0 ||
    p.angle > 90 ||
    p.shift < 0 ||
    p.shift > 2 ||
    p.width < 0 ||
    p.width > 1 ||
    p.blur < 0 ||
    p.blur > 1
  )
    throw RangeError("Invalid multi-frequency Bayer parameters");
  return p;
}
export function modes(input = {}) {
  const p = parameters(input),
    t = (p.angle * Math.PI) / 180,
    c = Math.cos(t),
    s = Math.sin(t);
  return BASE.map((m) => {
    const fx = p.scale * (c * m.fx - s * m.fy),
      fy = p.scale * (s * m.fx + c * m.fy),
      phase = m.phase - fx * p.shift;
    const opticalGain = Math.exp(
        -2 * Math.PI ** 2 * p.blur ** 2 * (fx * fx + fy * fy),
      ),
      pixelGain = sinc(p.width * fx) * sinc(p.width * fy),
      gain = opticalGain * pixelGain;
    return {
      ...m,
      fx,
      fy,
      phase,
      opticalGain,
      pixelGain,
      gain,
      aliases: Object.fromEntries(
        CHANNELS.map((ch) => [
          ch,
          aliasForChannel({ fx, fy, phase, gain }, ch),
        ]),
      ),
    };
  });
}
export function valueAt(terms, x, y, stage = "integrated") {
  if (!["raw", "optical", "integrated"].includes(stage))
    throw RangeError("Unknown image stage");
  return (
    0.5 +
    terms.reduce(
      (sum, m) =>
        sum +
        m.a *
          (stage === "raw" ? 1 : stage === "optical" ? m.opticalGain : m.gain) *
          Math.cos(2 * Math.PI * (m.fx * x + m.fy * y + m.phase)),
      0,
    )
  );
}
export function aliasAt(terms, channel, x, y) {
  if (!CHANNELS.includes(channel)) throw RangeError("Unknown color channel");
  return (
    0.5 +
    terms.reduce(
      (sum, m) => sum + (m.a * (m.aliases[channel].value(x, y) - 0.5)) / 0.4,
      0,
    )
  );
}
export function bayerTexture(input = {}) {
  const p = parameters(input),
    terms = modes(p),
    mosaic = captureMosaic(SIZE, (_, x, y) => valueAt(terms, x, y)),
    reconstructed = demosaicBilinear(mosaic, SIZE);
  const fine = (stage) =>
    Float64Array.from({ length: FINE * FINE }, (_, i) =>
      valueAt(
        terms,
        (i % FINE) / 2 - 0.25,
        Math.floor(i / FINE) / 2 - 0.25,
        stage,
      ),
    );
  const cfaRgb = new Float64Array(3 * SIZE * SIZE),
    rgb = new Float64Array(cfaRgb.length),
    aliases = new Float64Array(cfaRgb.length),
    chroma = new Float64Array(SIZE * SIZE);
  let squared = 0,
    aliasSquared = 0,
    colorSquared = 0,
    count = 0,
    sampleDifference = 0;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x,
        truth = valueAt(terms, x, y),
        observed = channelAt(x, y),
        R = reconstructed.R[i],
        G = reconstructed.G[i],
        B = reconstructed.B[i];
      chroma[i] = Math.sqrt(((R - G) ** 2 + (B - G) ** 2) / 2);
      for (let c = 0; c < 3; c++) {
        const channel = CHANNELS[c],
          j = 3 * i + c,
          v = reconstructed[channel][i],
          a = aliasAt(terms, channel, x, y);
        rgb[j] = v;
        aliases[j] = a;
        if (channel === observed) cfaRgb[j] = mosaic[i];
        if (channel === observed)
          sampleDifference = Math.max(
            sampleDifference,
            Math.abs(a - mosaic[i]),
          );
        if (x > 0 && y > 0 && x < SIZE - 1 && y < SIZE - 1) {
          squared += (v - truth) ** 2;
          aliasSquared += (a - truth) ** 2;
        }
      }
      if (x > 0 && y > 0 && x < SIZE - 1 && y < SIZE - 1) {
        colorSquared += chroma[i] ** 2;
        count++;
      }
    }
  return {
    p,
    terms,
    mosaic,
    reconstructed,
    rawFine: fine("raw"),
    filteredFine: fine("integrated"),
    cfaRgb,
    rgb,
    aliases,
    chroma,
    count,
    rmse: Math.sqrt(squared / (3 * count)),
    aliasRmse: Math.sqrt(aliasSquared / (3 * count)),
    colorRms: Math.sqrt(colorSquared / count),
    sampleDifference,
  };
}
