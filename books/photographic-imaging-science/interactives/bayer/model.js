export const CHANNELS = ["R", "G", "B"];
export const channelAt = (x, y) =>
  y & 1 ? (x & 1 ? "B" : "G") : x & 1 ? "G" : "R";
export const sinc = (x) =>
  Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
const offsets = { R: [0, 0], G: [1, 0], B: [1, 1] };

export function samplingBoundary(channel, angle) {
  if (!CHANNELS.includes(channel) || !Number.isFinite(angle))
    throw new RangeError("Invalid sampling direction");
  const a = (angle * Math.PI) / 180,
    x = Math.abs(Math.cos(a)),
    y = Math.abs(Math.sin(a));
  return channel === "G" ? 0.5 / (x + y) : 0.25 / Math.max(x, y);
}

// Choose one reciprocal-lattice representative, not an estimate of the scene.
// The offset-dependent phase is essential for the G and B sampling cosets.
export function aliasForChannel({ fx, fy, phase = 0, gain = 1 }, channel) {
  if (
    !CHANNELS.includes(channel) ||
    ![fx, fy, phase, gain].every(Number.isFinite)
  )
    throw new RangeError("Invalid Bayer alias parameters");
  let kx, ky;
  if (channel === "G") {
    const a = Math.round(fx + fy),
      b = Math.round(fx - fy);
    kx = (a + b) / 2;
    ky = (a - b) / 2;
  } else {
    kx = Math.round(2 * fx) / 2;
    ky = Math.round(2 * fy) / 2;
  }
  const [ox, oy] = offsets[channel],
    shiftedPhase = phase + kx * ox + ky * oy,
    aliasPhase = shiftedPhase - Math.floor(shiftedPhase),
    ax = fx - kx,
    ay = fy - ky;
  const radius =
    channel === "G"
      ? Math.max(Math.abs(fx + fy), Math.abs(fx - fy)) / 0.5
      : Math.max(Math.abs(fx), Math.abs(fy)) / 0.25;
  return {
    fx: ax,
    fy: ay,
    phase: aliasPhase,
    kx,
    ky,
    frequency: Math.hypot(ax, ay),
    location:
      Math.abs(radius - 1) < 1e-10
        ? "boundary"
        : radius < 1
          ? "inside"
          : "outside",
    value: (x, y) =>
      0.5 + 0.4 * gain * Math.cos(2 * Math.PI * (ax * x + ay * y + aliasPhase)),
  };
}

export function bayerModel({
  frequency = 0.3,
  angle = 0,
  phase = 0,
  width = 0,
} = {}) {
  if (
    ![frequency, angle, phase, width].every(Number.isFinite) ||
    frequency < 0 ||
    frequency > 1 ||
    width < 0 ||
    width > 1
  )
    throw new RangeError("Invalid Bayer teaching parameters");
  const radians = (angle * Math.PI) / 180,
    fx = frequency * Math.cos(radians),
    fy = frequency * Math.sin(radians),
    gain = sinc(width * fx) * sinc(width * fy);
  const raw = (x, y) =>
    0.5 + 0.4 * Math.cos(2 * Math.PI * (fx * x + fy * y + phase));
  const integrated = (x, y) =>
    0.5 + 0.4 * gain * Math.cos(2 * Math.PI * (fx * x + fy * y + phase));
  return {
    fx,
    fy,
    gain,
    raw,
    integrated,
    aliases: Object.fromEntries(
      CHANNELS.map((c) => [c, aliasForChannel({ fx, fy, phase, gain }, c)]),
    ),
  };
}

export function captureMosaic(size, sample) {
  if (!Number.isInteger(size) || size < 4 || size > 128)
    throw new RangeError("Invalid mosaic size");
  return Float64Array.from({ length: size * size }, (_, i) => {
    const x = i % size,
      y = Math.floor(i / size);
    return sample(channelAt(x, y), x, y);
  });
}

// Only observed mosaic values and the RGGB layout enter reconstruction.
// Boundary neighborhoods are shortened; all comparisons exclude the outer pixel.
export function demosaicBilinear(mosaic, size) {
  if (mosaic.length !== size * size || size < 4 || !Number.isInteger(size))
    throw new RangeError("Invalid observed mosaic");
  return Object.fromEntries(
    CHANNELS.map((channel) => [
      channel,
      Float64Array.from(mosaic, (value, i) => {
        const x = i % size,
          y = Math.floor(i / size);
        if (channelAt(x, y) === channel) return value;
        let distance = Infinity,
          sum = 0,
          count = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy,
              d = dx * dx + dy * dy;
            if (
              nx < 0 ||
              nx >= size ||
              ny < 0 ||
              ny >= size ||
              channelAt(nx, ny) !== channel
            )
              continue;
            if (d < distance) {
              distance = d;
              sum = 0;
              count = 0;
            }
            if (d === distance) {
              sum += mosaic[ny * size + nx];
              count++;
            }
          }
        return sum / count;
      }),
    ]),
  );
}
