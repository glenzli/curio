// Teaching transfer functions on captured linear signal [0,1], not a camera specification.
export const TOE = 2 ** -12;
export const OFFSET = TOE;
export const GAMMA = 2.2;
const join = TOE / (TOE + OFFSET);
const scale = Math.log((1 + OFFSET) / (TOE + OFFSET)) + join;
const clamp = (x) => Math.max(0, Math.min(1, x));

export function encode(x, curve) {
  x = clamp(x);
  if (curve === "linear") return x;
  if (curve === "gamma") return x ** (1 / GAMMA);
  if (curve === "log") return (x <= TOE ? x / (TOE + OFFSET) :
    Math.log((x + OFFSET) / (TOE + OFFSET)) + join) / scale;
  throw new Error(`Unknown curve: ${curve}`);
}

export function decode(v, curve) {
  v = clamp(v);
  if (curve === "linear") return v;
  if (curve === "gamma") return v ** GAMMA;
  if (curve === "log") return v * scale <= join ?
    v * scale * (TOE + OFFSET) : (TOE + OFFSET) * Math.exp(v * scale - join) - OFFSET;
  throw new Error(`Unknown curve: ${curve}`);
}

export function quantize(x, curve, bits) {
  const maximum = 2 ** bits - 1;
  const code = Math.round(encode(x, curve) * maximum);
  return { code, estimate: decode(code / maximum, curve) };
}

export function stopSpan(lowerEV, curve, bits) {
  return (2 ** bits - 1) * (encode(2 ** (lowerEV + 1), curve) - encode(2 ** lowerEV, curve));
}

export function displayByte(x, lift = 64) {
  return Math.round(255 * clamp(x * lift) ** (1 / GAMMA));
}
