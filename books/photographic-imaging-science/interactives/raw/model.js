function sample(x) {
  if (!Number.isInteger(x) || x < 0 || x > 4095)
    throw new RangeError("Expected a 12-bit integer");
}
function bytes(values) {
  if (
    values.length !== 3 ||
    !Array.from(values).every((x) => Number.isInteger(x) && x >= 0 && x <= 255)
  )
    throw new RangeError("Expected three bytes");
}
export function pack12(a, b) {
  sample(a);
  sample(b);
  return [a & 255, ((b & 15) << 4) | ((a >>> 8) & 15), (b >>> 4) & 255];
}
export function unpack12(values, { swappedNibbles = false } = {}) {
  bytes(values);
  const [b0, b1, b2] = values;
  return swappedNibbles
    ? [b0 + 256 * (b1 >>> 4), (b1 & 15) + 16 * b2]
    : [b0 + 256 * (b1 & 15), (b1 >>> 4) + 16 * b2];
}
// Independent representation using character positions, no shifts or masks.
export function bitStringTruth(a, b) {
  sample(a);
  sample(b);
  const A = a.toString(2).padStart(12, "0"),
    B = b.toString(2).padStart(12, "0");
  return [A.slice(4), B.slice(8) + A.slice(0, 4), B.slice(0, 8)].map((s) =>
    parseInt(s, 2),
  );
}
export function normalize(raw, black, white) {
  if (
    ![raw, black, white].every(Number.isFinite) ||
    black < 0 ||
    white <= black
  )
    throw new RangeError("Invalid linear calibration");
  return (raw - black) / (white - black);
}
export function payloadRate({
  width = 4096,
  height = 2160,
  bits = 12,
  fps = 24,
} = {}) {
  if (
    ![width, height, bits, fps].every(Number.isFinite) ||
    ![width, height, bits].every(Number.isInteger) ||
    width < 1 ||
    height < 1 ||
    width > 16384 ||
    height > 16384 ||
    bits < 1 ||
    bits > 32 ||
    fps <= 0 ||
    fps > 1000
  )
    throw new RangeError("Invalid sample payload dimensions");
  const bitsPerFrame = width * height * bits,
    bytesPerFrame = Math.ceil(bitsPerFrame / 8);
  return {
    bitsPerFrame,
    bytesPerFrame,
    bitsPerSecond: bytesPerFrame * 8 * fps,
    bytesPerSecond: bytesPerFrame * fps,
    tenMinuteGB: (bytesPerFrame * fps * 600) / 1e9,
  };
}
export function packingDemo({
  a = 0xabc,
  b = 0x123,
  dropBits = 0,
  swappedNibbles = false,
  black = 128,
  white = 3840,
} = {}) {
  sample(a);
  sample(b);
  if (
    !Number.isInteger(dropBits) ||
    dropBits < 0 ||
    dropBits > 8 ||
    typeof swappedNibbles !== "boolean"
  )
    throw new RangeError("Invalid lossy step or decoder convention");
  const step = 2 ** dropBits,
    stored = [a, b].map((x) => Math.floor(x / step) * step),
    packed = pack12(...stored),
    decoded = unpack12(packed, { swappedNibbles });
  return {
    original: [a, b],
    stored,
    packed,
    decoded,
    step,
    loss: decoded.map((x, i) => x - [a, b][i]),
    normalized: decoded.map((x) => normalize(x, black, white)),
    truth: bitStringTruth(...stored),
    roundTrip: decoded[0] === a && decoded[1] === b,
  };
}
