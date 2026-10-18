// Display-only colors. Callers declare the signed scale and the validity mask.
export function signedColors(values, scale, valid) {
  return Float64Array.from({ length: values.length * 3 }, (_, j) => {
    const i = Math.floor(j / 3),
      c = j % 3;
    if (valid && !valid[i]) return [0.65, 0.2, 0.7][c];
    const t = Math.min(1, Math.abs(values[i]) / scale),
      base = [0.88, 0.89, 0.9],
      end = values[i] < 0 ? [0.03, 0.32, 0.65] : [0.8, 0.28, 0.06];
    return base[c] * (1 - t) + end[c] * t;
  });
}
export function withMissing(values, valid) {
  return Float64Array.from({ length: values.length * 3 }, (_, j) =>
    valid[Math.floor(j / 3)]
      ? values[Math.floor(j / 3)]
      : [0.65, 0.2, 0.7][j % 3],
  );
}
export function memoOne(fn, keys) {
  let lastKey, result;
  return (state) => {
    const key = JSON.stringify(keys.map((k) => state[k]));
    if (key !== lastKey) {
      result = fn(state);
      lastKey = key;
    }
    return result;
  };
}
