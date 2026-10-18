// A declared C1 shoulder, applied after capture; not a vendor OETF or LUT.
export function shoulder(x, knee = 0.6) {
  if (![x, knee].every(Number.isFinite) || x < 0 || knee <= 0 || knee >= 1)
    throw RangeError("Invalid tone input");
  return x <= knee
    ? x
    : knee + (1 - knee) * -Math.expm1(-(x - knee) / (1 - knee));
}
export function inverseShoulder(y, knee = 0.6) {
  if (!Number.isFinite(y) || y < 0 || y >= 1 || knee <= 0 || knee >= 1)
    throw RangeError("Finite inverse requires 0 <= y < 1");
  return y <= knee
    ? y
    : knee - (1 - knee) * Math.log1p(-(y - knee) / (1 - knee));
}
export function tone({
  exposure = 0,
  knee = 0.6,
  bits = 10,
  capacity = 4,
  probe = 2,
} = {}) {
  if (
    ![exposure, knee, bits, capacity, probe].every(Number.isFinite) ||
    !Number.isInteger(bits) ||
    bits < 4 ||
    bits > 16 ||
    capacity <= 0 ||
    probe < 0
  )
    throw RangeError("Invalid capture or code parameters");
  const gain = 2 ** exposure,
    levels = 2 ** bits - 1;
  const at = (x) => {
    const captured = Math.min(x, capacity),
      linear = captured * gain,
      mapped = shoulder(linear, knee),
      code = Math.round(levels * mapped);
    return {
      captured,
      linear,
      mapped,
      code,
      encoded: (code / levels) ** (1 / 2.2),
      decoded:
        code < levels ? inverseShoulder(code / levels, knee) / gain : null,
    };
  };
  const current = at(probe);
  return {
    at,
    current,
    gain,
    whiteInput: inverseShoulder(1 - 0.5 / levels, knee) / gain,
  };
}
