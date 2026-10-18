// Lossless 8-bit grayscale PNGs keep the fine scene out of the SVG path tree.
// Works in the browser and in the static generator, with identical display codes.
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const u32 = (a, i, v) =>
  new DataView(a.buffer, a.byteOffset, a.byteLength).setUint32(i, v);
const join = (...parts) => {
  const a = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    a.set(p, offset);
    offset += p.length;
  }
  return a;
};
function chunk(type, data) {
  const a = new Uint8Array(data.length + 12);
  u32(a, 0, data.length);
  a.set(
    Array.from(type, (c) => c.charCodeAt(0)),
    4,
  );
  a.set(data, 8);
  let crc = 0xffffffff;
  for (const v of a.subarray(4, -4))
    crc = crcTable[(crc ^ v) & 255] ^ (crc >>> 8);
  u32(a, a.length - 4, (crc ^ 0xffffffff) >>> 0);
  return a;
}
export function grayPng(values, width, height, gamma = 2.2) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height !== values.length ||
    !Number.isFinite(gamma) ||
    gamma <= 0
  )
    throw RangeError("Invalid grayscale raster");
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      raw[y * (width + 1) + x + 1] = Math.round(
        255 * Math.max(0, Math.min(1, values[y * width + x])) ** (1 / gamma),
      );
  // Stored DEFLATE blocks: no dependency, no resampling, and bounded scene size.
  const blocks = [new Uint8Array([0x78, 0x01])];
  for (let i = 0; i < raw.length; i += 65535) {
    const data = raw.subarray(i, i + 65535),
      n = data.length;
    blocks.push(
      new Uint8Array([
        i + n === raw.length ? 1 : 0,
        n & 255,
        n >>> 8,
        ~n & 255,
        (~n >>> 8) & 255,
      ]),
      data,
    );
  }
  let s1 = 1,
    s2 = 0;
  for (const v of raw) {
    s1 = (s1 + v) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler = new Uint8Array(4);
  u32(adler, 0, (s2 * 65536 + s1) >>> 0);
  const header = new Uint8Array(13);
  u32(header, 0, width);
  u32(header, 4, height);
  header[8] = 8; // 8 bit, grayscale, no palette or interlacing.
  return join(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", join(...blocks, adler)),
    chunk("IEND", new Uint8Array()),
  );
}
export function rasterUrl(values, width, height, gamma) {
  const bytes = grayPng(values, width, height, gamma);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return `data:image/png;base64,${btoa(binary)}`;
}
