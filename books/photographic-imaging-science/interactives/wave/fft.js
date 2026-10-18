// Unnormalized forward transform, negative exponent. The inverse divides by n.
export function fft(real, imaginary, inverse = false) {
  const n = real.length;
  if (n < 2 || n & (n - 1) || imaginary.length !== n)
    throw new RangeError("FFT needs equal power-of-two arrays");
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }
  for (let length = 2; length <= n; length *= 2) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / length;
    const wr = Math.cos(angle),
      wi = Math.sin(angle);
    for (let offset = 0; offset < n; offset += length) {
      let ar = 1,
        ai = 0;
      for (let j = 0; j < length / 2; j++) {
        const a = offset + j,
          b = a + length / 2;
        const br = ar * real[b] - ai * imaginary[b];
        const bi = ar * imaginary[b] + ai * real[b];
        real[b] = real[a] - br;
        imaginary[b] = imaginary[a] - bi;
        real[a] += br;
        imaginary[a] += bi;
        const next = ar * wr - ai * wi;
        ai = ar * wi + ai * wr;
        ar = next;
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imaginary[i] /= n;
    }
}

export function fft2(real, imaginary, size, inverse = false) {
  if (real.length !== size * size || imaginary.length !== real.length)
    throw new RangeError("Invalid square transform");
  const row = new Float64Array(size),
    col = new Float64Array(size);
  for (let y = 0; y < size; y++) {
    row.set(real.subarray(y * size, (y + 1) * size));
    col.set(imaginary.subarray(y * size, (y + 1) * size));
    fft(row, col, inverse);
    real.set(row, y * size);
    imaginary.set(col, y * size);
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      row[y] = real[y * size + x];
      col[y] = imaginary[y * size + x];
    }
    fft(row, col, inverse);
    for (let y = 0; y < size; y++) {
      real[y * size + x] = row[y];
      imaginary[y * size + x] = col[y];
    }
  }
}
